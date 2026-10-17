'use strict';

const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { createError } = require('../middleware/errorHandler');
const { success, created, paginated } = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta, generateToken, hashToken } = require('../utils/helpers');
const { audit } = require('../services/audit.service');
const { sendInvitationEmail } = require('../services/email.service');
const { updateStudentProfileSchema, studentQuerySchema } = require('../validators/student.validators');
const env = require('../config/env');
const logger = require('../utils/logger');

// In-memory preview cache (keyed by batchId).
// In production you'd use Redis; for MVP this works for single-instance servers.
const previewCache = new Map();

const EXPECTED_HEADERS = ['name', 'email', 'rollNumber', 'branch', 'graduationYear', 'cgpa', 'activeBacklogs'];
const OPTIONAL_HEADERS = ['phone', 'tenthPercentage', 'twelfthPercentage'];

/**
 * POST /api/v1/students/import/preview
 * Upload CSV and return parsed preview (no DB writes).
 */
async function previewImport(req, res, next) {
  try {
    if (!req.file) return next(createError('CSV file is required', 400));

    let rows;
    try {
      rows = parse(req.file.buffer, {
        bom: true,
        columns: (headerList) => headerList.map((h) => h.trim().replace(/^[\uFEFF\u200B]+/, '')),
        skip_empty_lines: true,
        trim: true,
        cast: false,
      });
    } catch (parseErr) {
      return next(createError(`CSV parse error: ${parseErr.message}`, 400));
    }

    if (!rows || rows.length === 0) return next(createError('CSV file is empty', 400));

    // Flexible column resolver with aliases
    const resolveRowValue = (row, ...aliases) => {
      for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
          return String(row[alias]).trim();
        }
      }
      const rowKeys = Object.keys(row);
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[\s_-]+/g, '');
        const matchedKey = rowKeys.find(
          (k) => k.toLowerCase().replace(/[\s_-]+/g, '') === cleanAlias
        );
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
          const val = String(row[matchedKey]).trim();
          if (val !== '') return val;
        }
      }
      return '';
    };

    // Validate headers presence using aliases
    const rawHeaders = Object.keys(rows[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
    const requiredDefs = [
      { key: 'name', aliases: ['name', 'fullname', 'studentname', 'candidatename'] },
      { key: 'email', aliases: ['email', 'emailaddress', 'mail'] },
      { key: 'rollNumber', aliases: ['rollnumber', 'rollno', 'roll', 'studentrollnumber'] },
      { key: 'branch', aliases: ['branch', 'department', 'dept', 'stream'] },
      { key: 'graduationYear', aliases: ['graduationyear', 'gradyear', 'batch', 'year', 'passingyear'] },
    ];

    const missingColumns = requiredDefs
      .filter((def) => !def.aliases.some((alias) => rawHeaders.includes(alias)))
      .map((def) => def.key);

    if (missingColumns.length > 0) {
      return next(createError(`Missing required CSV columns: ${missingColumns.join(', ')}`, 400));
    }

    // Existing emails and roll numbers in college for duplicate detection
    const collegeId = req.user.college;
    const existingProfiles = await StudentProfile.find({ college: collegeId })
      .select('rollNumber user')
      .populate('user', 'email')
      .lean();
    const existingRollNumbers = new Set(
      existingProfiles.map((p) => p.rollNumber?.toUpperCase()).filter(Boolean)
    );
    const existingEmails = new Set(
      existingProfiles.map((p) => p.user?.email?.toLowerCase()).filter(Boolean)
    );

    const valid = [];
    const invalid = [];
    const duplicates = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, +1 for header row
      const errors = [];

      const rawName = resolveRowValue(row, 'name', 'fullName', 'studentName');
      const rawEmail = resolveRowValue(row, 'email', 'emailAddress');
      const rawRoll = resolveRowValue(row, 'rollNumber', 'rollNo', 'roll_number', 'roll');
      const rawBranch = resolveRowValue(row, 'branch', 'department', 'dept');
      const rawGradYear = resolveRowValue(row, 'graduationYear', 'graduation_year', 'gradYear', 'batch', 'year');
      const rawCgpa = resolveRowValue(row, 'cgpa', 'gpa');
      const rawBacklogs = resolveRowValue(row, 'activeBacklogs', 'active_backlogs', 'backlogs');
      const rawPhone = resolveRowValue(row, 'phone', 'phoneNumber', 'mobile');

      const parsedGradYear = parseInt(rawGradYear, 10);
      const parsedCgpa = rawCgpa !== '' ? parseFloat(rawCgpa) : null;
      const parsedBacklogs = rawBacklogs !== '' ? parseInt(rawBacklogs, 10) : 0;

      // Normalize
      const normalized = {
        name: rawName,
        email: rawEmail.toLowerCase(),
        rollNumber: rawRoll.toUpperCase(),
        branch: rawBranch,
        graduationYear: isNaN(parsedGradYear) ? 0 : parsedGradYear,
        cgpa: parsedCgpa !== null && !isNaN(parsedCgpa) ? parsedCgpa : 0,
        activeBacklogs: isNaN(parsedBacklogs) ? 0 : parsedBacklogs,
        phone: rawPhone || undefined,
      };

      // Field validation
      if (!normalized.name) errors.push('Name is required');
      if (!normalized.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email))
        errors.push('Invalid email');
      if (!normalized.rollNumber) errors.push('Roll number is required');
      if (!normalized.branch) errors.push('Branch is required');
      if (isNaN(normalized.graduationYear) || normalized.graduationYear < 2000)
        errors.push('Invalid graduation year (must be >= 2000)');
      if (normalized.cgpa !== null && (isNaN(normalized.cgpa) || normalized.cgpa < 0 || normalized.cgpa > 10))
        errors.push('CGPA must be between 0 and 10');
      if (isNaN(normalized.activeBacklogs) || normalized.activeBacklogs < 0)
        errors.push('Invalid active backlogs count');

      if (errors.length > 0) {
        invalid.push({ row: rowNum, data: normalized, errors });
        continue;
      }

      // Duplicate detection
      const isDupRoll = existingRollNumbers.has(normalized.rollNumber);
      const isDupEmail = existingEmails.has(normalized.email);

      if (isDupRoll || isDupEmail) {
        duplicates.push({
          row: rowNum,
          data: normalized,
          reasons: [
            ...(isDupRoll ? [`Roll number ${normalized.rollNumber} already exists in database`] : []),
            ...(isDupEmail ? [`Email ${normalized.email} already registered`] : []),
          ],
          action: 'update',
        });
        continue;
      }

      valid.push({ row: rowNum, data: normalized });
    }

    const batchId = uuidv4();
    previewCache.set(batchId, {
      collegeId: collegeId.toString(),
      valid,
      duplicates,
      createdAt: Date.now(),
    });

    // Auto-expire cache entries after 1 hour
    setTimeout(() => previewCache.delete(batchId), 60 * 60 * 1000);

    const previewRows = [
      ...valid.map((v) => ({
        rowNumber: v.row,
        data: v.data,
        isValid: true,
        errors: [],
        isDuplicate: false,
      })),
      ...duplicates.map((d) => ({
        rowNumber: d.row,
        data: d.data,
        isValid: true,
        errors: d.reasons,
        isDuplicate: true,
      })),
      ...invalid.map((inv) => ({
        rowNumber: inv.row,
        data: inv.data,
        isValid: false,
        errors: inv.errors,
        isDuplicate: false,
      })),
    ].sort((a, b) => a.rowNumber - b.rowNumber);

    return success(
      res,
      {
        batchId,
        cacheKey: batchId,
        totalRows: rows.length,
        validRows: valid.length,
        invalidRows: invalid.length,
        duplicateCount: duplicates.length,
        previewRows,
        summary: {
          total: rows.length,
          totalRows: rows.length,
          valid: valid.length,
          validRows: valid.length,
          invalid: invalid.length,
          invalidRows: invalid.length,
          duplicates: duplicates.length,
          duplicateCount: duplicates.length,
        },
        valid,
        invalid,
        duplicates,
      },
      'Preview generated. Review and confirm to import.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/students/import/confirm
 * Commit a previously previewed import batch.
 */
async function confirmImport(req, res, next) {
  try {
    const batchId = req.body.batchId || req.body.cacheKey;
    const includeUpdates = req.body.includeUpdates !== false;

    let rowsToProcess = [];
    const collegeId = req.user.college?.toString();

    const cached = batchId ? previewCache.get(batchId) : null;
    if (cached) {
      if (cached.collegeId !== collegeId) {
        return next(createError('Forbidden', 403));
      }
      rowsToProcess = [...cached.valid, ...(includeUpdates ? cached.duplicates : [])];
    } else if (Array.isArray(req.body.records) && req.body.records.length > 0) {
      // Fallback: direct import if session cache is unavailable
      rowsToProcess = req.body.records.map((r, idx) => ({ row: idx + 2, data: r }));
    } else {
      return next(createError('Preview session expired or invalid. Please re-upload the CSV.', 400));
    }

    let created_count = 0,
      updated_count = 0,
      failed_count = 0;
    const errors = [];

    for (const entry of rowsToProcess) {
      const data = entry.data;
      try {
        // Find or create user
        let user = await User.findOne({ email: data.email });
        if (!user) {
          user = new User({
            email: data.email,
            role: 'student',
            college: collegeId,
            firstName: data.name ? data.name.split(' ')[0] : 'Student',
            lastName: data.name ? data.name.split(' ').slice(1).join(' ') || undefined : undefined,
            isActive: true, // active for all
            activatedAt: new Date(),
            invitedBy: req.user._id,
            invitedAt: new Date(),
          });

          const rawToken = generateToken(32);
          user.invitationToken = hashToken(rawToken);
          user.invitationTokenExpires = new Date(
            Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
          );
          await user.save();

          const activationUrl = `${env.CLIENT_URL}/activate?token=${rawToken}`;
          sendInvitationEmail({
            to: user.email,
            name: data.name,
            activationUrl,
            expiresInHours: env.INVITE_TOKEN_EXPIRES_HOURS,
          }).catch((e) => logger.warn(`Invitation email failed for ${user.email}:`, e));
        } else if (!user.isActive) {
          user.isActive = true;
          user.activatedAt = user.activatedAt || new Date();
          await user.save();
        }

        const profileData = {
          user: user._id,
          college: collegeId,
          rollNumber: data.rollNumber,
          branch: data.branch,
          graduationYear: data.graduationYear,
          cgpa: data.cgpa,
          activeBacklogs: data.activeBacklogs ?? 0,
          phone: data.phone,
          tenthPercentage: data.tenthPercentage,
          twelfthPercentage: data.twelfthPercentage,
          academicDataVerified: true,
          verifiedBy: req.user._id,
          verifiedAt: new Date(),
          importBatchId: batchId || 'direct-import',
        };

        const existing = await StudentProfile.findOne({
          college: collegeId,
          $or: [{ user: user._id }, { rollNumber: data.rollNumber }],
        });

        if (existing) {
          Object.assign(existing, profileData);
          await existing.save();
          updated_count++;
        } else {
          await StudentProfile.create(profileData);
          created_count++;
        }
      } catch (rowErr) {
        logger.error(`Import failed for row ${entry.row}:`, rowErr);
        failed_count++;
        errors.push({ row: entry.row, email: data.email, error: rowErr.message });
      }
    }

    if (batchId) previewCache.delete(batchId);

    await audit({
      action: 'student.imported',
      actor: req.user,
      collegeId: req.user.college,
      description: `CSV import confirmed. Created: ${created_count}, Updated: ${updated_count}, Failed: ${failed_count}`,
      after: { batchId, created_count, updated_count, failed_count },
      req,
    });

    return success(
      res,
      {
        createdCount: created_count,
        updatedCount: updated_count,
        skippedCount: 0,
        failedCount: failed_count,
        summary: {
          created: created_count,
          updated: updated_count,
          failed: failed_count,
          createdCount: created_count,
          updatedCount: updated_count,
          skippedCount: 0,
          failedCount: failed_count,
          errors,
        },
      },
      'Import completed'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/students
 * Admin: list all students in their college.
 */
async function listStudents(req, res, next) {
  try {
    const query = studentQuerySchema.safeParse(req.query);
    if (!query.success) {
      return next(createError('Invalid query parameters', 400));
    }
    const { page, limit, search, branch, graduationYear, isPlaced, sortBy, sortOrder } = query.data;
    const { skip } = parsePagination({ page, limit });

    const filter = req.user.college ? { college: req.user.college } : {};
    if (branch) filter.branch = new RegExp(branch, 'i');
    if (graduationYear) filter.graduationYear = graduationYear;
    if (typeof isPlaced === 'boolean') filter.isPlaced = isPlaced;

    // Ensure all student accounts in college are active
    const userCollegeFilter = req.user.college ? { college: req.user.college } : {};
    await User.updateMany(
      { ...userCollegeFilter, role: 'student', isActive: { $ne: true } },
      { $set: { isActive: true } }
    );

    let profileQuery = StudentProfile.find(filter)
      .populate('user', 'email firstName lastName isActive lastLoginAt')
      .sort({ [sortBy === 'createdAt' ? 'createdAt' : sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const [profiles, total] = await Promise.all([
      profileQuery,
      StudentProfile.countDocuments(filter),
    ]);

    // Apply search filter in memory (could be moved to DB text index)
    let results = profiles;
    if (search) {
      const s = search.toLowerCase();
      results = profiles.filter(
        (p) =>
          p.rollNumber?.toLowerCase().includes(s) ||
          p.user?.email?.toLowerCase().includes(s) ||
          `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase().includes(s)
      );
    }

    return paginated(res, results, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/students/me/profile
 * Student: get own profile.
 */
async function getMyProfile(req, res, next) {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id })
      .populate('user', 'email firstName lastName lastLoginAt activatedAt')
      .lean();

    if (!profile) {
      return next(createError('Profile not found. Your academic data may not be imported yet.', 404));
    }

    return success(res, { profile });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/students/me/profile
 * Student: update permitted profile fields.
 */
async function updateMyProfile(req, res, next) {
  try {
    const parse = updateStudentProfileSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile) return next(createError('Profile not found', 404));

    // Only allow permitted fields
    const allowed = ['phone', 'phoneNumber', 'resumeUrl', 'skills', 'interests', 'linkedinUrl', 'githubUrl', 'portfolioUrl', 'bio'];
    for (const key of allowed) {
      if (parse.data[key] !== undefined) {
        if (key === 'phoneNumber') {
          profile.phone = parse.data[key];
        } else {
          profile[key] = parse.data[key];
        }
      }
    }

    profile.completenessScore = profile.computeCompleteness();
    await profile.save();

    await audit({
      action: 'student.profile_updated',
      actor: req.user,
      resourceType: 'StudentProfile',
      resourceId: profile._id,
      description: `Student updated profile: ${req.user.email}`,
      req,
    });

    return success(res, { profile }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/students/:id
 * Admin: get a single student profile.
 */
async function getStudentById(req, res, next) {
  try {
    const profile = await StudentProfile.findById(req.params.id)
      .where({ college: req.user.college })
      .populate('user', 'email firstName lastName isActive lastLoginAt activatedAt')
      .lean();

    if (!profile) return next(createError('Student not found', 404));
    return success(res, { profile });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/students/:id/resend-invite
 * Admin: resend invitation to a student who hasn't activated.
 */
async function resendInvite(req, res, next) {
  try {
    const profile = await StudentProfile.findById(req.params.id)
      .where({ college: req.user.college })
      .populate('user');

    if (!profile) return next(createError('Student not found', 404));
    if (profile.user.isActive) {
      return next(createError('Student account is already active', 400));
    }

    const rawToken = generateToken(32);
    profile.user.invitationToken = hashToken(rawToken);
    profile.user.invitationTokenExpires = new Date(
      Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
    );
    profile.user.invitedAt = new Date();
    profile.user.invitedBy = req.user._id;
    await profile.user.save();

    const activationUrl = `${env.CLIENT_URL}/activate?token=${rawToken}`;
    await sendInvitationEmail({
      to: profile.user.email,
      name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      activationUrl,
      expiresInHours: env.INVITE_TOKEN_EXPIRES_HOURS,
    });

    await audit({
      action: 'user.invitation_sent',
      actor: req.user,
      resourceType: 'User',
      resourceId: profile.user._id,
      description: `Invitation resent to: ${profile.user.email}`,
      req,
    });

    return success(res, null, 'Invitation resent successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/students/:id
 * Admin / Placement Coordinator: update student details (academic, personal, account).
 */
async function updateStudentByAdmin(req, res, next) {
  try {
    const filter = { _id: req.params.id };
    if (req.user.college) filter.college = req.user.college;

    const profile = await StudentProfile.findOne(filter).populate('user');
    if (!profile) return next(createError('Student not found', 404));

    const {
      name,
      firstName,
      lastName,
      email,
      rollNumber,
      branch,
      graduationYear,
      cgpa,
      activeBacklogs,
      tenthPercentage,
      twelfthPercentage,
      phone,
      phoneNumber,
      isActive,
      isPlaced,
      placedCompany,
      academicDataVerified,
    } = req.body;

    // Update User model fields
    if (profile.user) {
      if (email && email.toLowerCase().trim() !== profile.user.email) {
        const existingEmail = await User.findOne({
          email: email.toLowerCase().trim(),
          _id: { $ne: profile.user._id },
        });
        if (existingEmail) {
          return next(createError('Email already in use by another account', 400));
        }
        profile.user.email = email.toLowerCase().trim();
      }

      if (firstName !== undefined) profile.user.firstName = firstName.trim();
      if (lastName !== undefined) profile.user.lastName = lastName.trim();
      if (name !== undefined) {
        const parts = name.trim().split(' ');
        profile.user.firstName = parts[0] || 'Student';
        profile.user.lastName = parts.slice(1).join(' ') || undefined;
      }
      if (typeof isActive === 'boolean') {
        profile.user.isActive = isActive;
      } else {
        profile.user.isActive = true;
      }
      await profile.user.save();
    }

    // Update StudentProfile fields
    if (rollNumber !== undefined) {
      const cleanRoll = String(rollNumber).trim().toUpperCase();
      if (cleanRoll !== profile.rollNumber) {
        const existingRoll = await StudentProfile.findOne({
          college: profile.college,
          rollNumber: cleanRoll,
          _id: { $ne: profile._id },
        });
        if (existingRoll) {
          return next(
            createError('Roll number already assigned to another student in this college', 400)
          );
        }
        profile.rollNumber = cleanRoll;
      }
    }

    if (branch !== undefined) profile.branch = String(branch).trim();
    if (graduationYear !== undefined) profile.graduationYear = Number(graduationYear);
    if (cgpa !== undefined) profile.cgpa = Number(cgpa);
    if (activeBacklogs !== undefined) profile.activeBacklogs = Number(activeBacklogs);
    if (tenthPercentage !== undefined)
      profile.tenthPercentage = tenthPercentage !== '' ? Number(tenthPercentage) : undefined;
    if (twelfthPercentage !== undefined)
      profile.twelfthPercentage = twelfthPercentage !== '' ? Number(twelfthPercentage) : undefined;
    if (phone !== undefined || phoneNumber !== undefined)
      profile.phone = String(phone || phoneNumber || '').trim();
    if (typeof isPlaced === 'boolean') profile.isPlaced = isPlaced;
    if (placedCompany !== undefined) profile.placedCompany = placedCompany;
    if (typeof academicDataVerified === 'boolean')
      profile.academicDataVerified = academicDataVerified;

    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    await profile.save();

    await audit({
      action: 'student.updated_by_admin',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'StudentProfile',
      resourceId: profile._id,
      description: `Placement coordinator updated student: ${profile.user?.email || profile.rollNumber}`,
      req,
    });

    const updatedProfile = await StudentProfile.findById(profile._id)
      .populate('user', 'email firstName lastName isActive lastLoginAt')
      .lean();

    return success(res, { profile: updatedProfile }, 'Student details updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  previewImport,
  confirmImport,
  listStudents,
  getMyProfile,
  updateMyProfile,
  getStudentById,
  updateStudentByAdmin,
  resendInvite,
};
