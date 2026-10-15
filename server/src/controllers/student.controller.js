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
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
      });
    } catch (parseErr) {
      return next(createError(`CSV parse error: ${parseErr.message}`, 400));
    }

    if (rows.length === 0) return next(createError('CSV file is empty', 400));

    // Validate headers
    const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
    const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
      return next(createError(`Missing required CSV columns: ${missingHeaders.join(', ')}`, 400));
    }

    // Existing emails and roll numbers in college for duplicate detection
    const collegeId = req.user.college;
    const existingProfiles = await StudentProfile.find({ college: collegeId })
      .select('rollNumber user')
      .populate('user', 'email')
      .lean();
    const existingRollNumbers = new Set(existingProfiles.map((p) => p.rollNumber?.toUpperCase()));
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

      // Normalize
      const normalized = {
        name: String(row.name || '').trim(),
        email: String(row.email || '').trim().toLowerCase(),
        rollNumber: String(row.rollNumber || '').trim().toUpperCase(),
        branch: String(row.branch || '').trim(),
        graduationYear: parseInt(row.graduationYear, 10),
        cgpa: row.cgpa !== '' && row.cgpa !== null && row.cgpa !== undefined ? parseFloat(row.cgpa) : null,
        activeBacklogs: row.activeBacklogs !== '' ? parseInt(row.activeBacklogs, 10) : 0,
        phone: row.phone ? String(row.phone).trim() : undefined,
        tenthPercentage: row.tenthPercentage ? parseFloat(row.tenthPercentage) : undefined,
        twelfthPercentage: row.twelfthPercentage ? parseFloat(row.twelfthPercentage) : undefined,
      };

      // Field validation
      if (!normalized.name) errors.push('Name is required');
      if (!normalized.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email))
        errors.push('Invalid email');
      if (!normalized.rollNumber) errors.push('Roll number is required');
      if (!normalized.branch) errors.push('Branch is required');
      if (isNaN(normalized.graduationYear) || normalized.graduationYear < 2000)
        errors.push('Invalid graduation year');
      if (normalized.cgpa !== null && (isNaN(normalized.cgpa) || normalized.cgpa < 0 || normalized.cgpa > 10))
        errors.push('CGPA must be between 0 and 10');
      if (isNaN(normalized.activeBacklogs) || normalized.activeBacklogs < 0)
        errors.push('Invalid active backlogs count');

      if (errors.length > 0) {
        invalid.push({ row: rowNum, data: row, errors });
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
            ...(isDupRoll ? [`Roll number ${normalized.rollNumber} already exists`] : []),
            ...(isDupEmail ? [`Email ${normalized.email} already exists`] : []),
          ],
          action: 'update', // will be offered as update option in confirm step
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

    return success(res, {
      batchId,
      summary: {
        total: rows.length,
        valid: valid.length,
        invalid: invalid.length,
        duplicates: duplicates.length,
      },
      valid,
      invalid,
      duplicates,
    }, 'Preview generated. Review and confirm to import.');
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
    const { batchId, includeUpdates = false } = req.body;

    const cached = previewCache.get(batchId);
    if (!cached) {
      return next(createError('Preview session expired or invalid. Please re-upload the CSV.', 400));
    }
    if (cached.collegeId !== req.user.college?.toString()) {
      return next(createError('Forbidden', 403));
    }

    const { valid, duplicates } = cached;
    const rowsToProcess = [...valid, ...(includeUpdates ? duplicates : [])];

    let created_count = 0, updated_count = 0, failed_count = 0;
    const errors = [];

    for (const entry of rowsToProcess) {
      const data = entry.data;
      try {
        // Find or create user
        let user = await User.findOne({ email: data.email });
        if (!user) {
          // Create user in deactivated state — activated via invitation
          user = new User({
            email: data.email,
            role: 'student',
            college: cached.collegeId,
            firstName: data.name.split(' ')[0],
            lastName: data.name.split(' ').slice(1).join(' ') || undefined,
            isActive: false,
            invitedBy: req.user._id,
            invitedAt: new Date(),
          });

          // Generate invitation token
          const rawToken = generateToken(32);
          user.invitationToken = hashToken(rawToken);
          user.invitationTokenExpires = new Date(
            Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
          );
          await user.save();

          // Send invitation email
          const activationUrl = `${env.CLIENT_URL}/activate?token=${rawToken}`;
          sendInvitationEmail({
            to: user.email,
            name: data.name,
            activationUrl,
            expiresInHours: env.INVITE_TOKEN_EXPIRES_HOURS,
          }).catch((e) => logger.warn(`Invitation email failed for ${user.email}:`, e));
        }

        // Upsert student profile
        const profileData = {
          user: user._id,
          college: cached.collegeId,
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
          importBatchId: batchId,
        };

        const existing = await StudentProfile.findOne({ user: user._id });
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

    previewCache.delete(batchId);

    await audit({
      action: 'student.imported',
      actor: req.user,
      collegeId: req.user.college,
      description: `CSV import confirmed. Created: ${created_count}, Updated: ${updated_count}, Failed: ${failed_count}`,
      after: { batchId, created_count, updated_count, failed_count },
      req,
    });

    return success(res, {
      summary: { created: created_count, updated: updated_count, failed: failed_count, errors },
    }, 'Import completed');
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

module.exports = {
  previewImport,
  confirmImport,
  listStudents,
  getMyProfile,
  updateMyProfile,
  getStudentById,
  resendInvite,
};
