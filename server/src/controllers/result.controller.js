'use strict';

const mongoose = require('mongoose');
const SelectionResult = require('../models/SelectionResult');
const Application = require('../models/Application');
const StudentProfile = require('../models/StudentProfile');
const Opportunity = require('../models/Opportunity');
const { createError } = require('../middleware/errorHandler');
const { success, created, paginated } = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');
const { audit } = require('../services/audit.service');
const { pushNotification, pushToCollegeStudents, pushToCollegeAdmins } = require('./notification.controller');
const { z } = require('zod');

const createResultSchema = z.object({
  applicationId: z.string().min(1),
  offeredCTC: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/opportunities/:id/results
 * Admin: create a selection result (unpublished by default).
 */
async function createResult(req, res, next) {
  try {
    const parse = createResultSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college }).lean();
    if (!opp) return next(createError('Opportunity not found', 404));

    const app = await Application.findOne({
      _id: parse.data.applicationId,
      opportunity: opp._id,
    }).populate('studentProfile', 'rollNumber branch graduationYear')
      .populate('student', 'email firstName lastName');

    if (!app) return next(createError('Application not found', 404));

    // Validate application is in a terminal selected state
    if (!['selected', 'shortlisted'].includes(app.status)) {
      return next(createError(
        `Cannot create a result for an application in '${app.status}' status. Application must be 'selected' or 'shortlisted'.`,
        400
      ));
    }

    // Check for existing result
    const existing = await SelectionResult.findOne({
      opportunity: opp._id,
      student: app.student._id,
    });
    if (existing) {
      return next(createError('A result already exists for this student and opportunity', 409));
    }

    const result = await SelectionResult.create({
      opportunity: opp._id,
      application: app._id,
      student: app.student._id,
      college: req.user.college,
      publicSnapshot: {
        studentName: `${app.student.firstName || ''} ${app.student.lastName || ''}`.trim() || app.student.email,
        branch: app.studentProfile.branch,
        graduationYear: app.studentProfile.graduationYear,
        rollNumber: app.studentProfile.rollNumber,
        companyName: opp.companyName,
        opportunityTitle: opp.title,
        opportunityType: opp.opportunityType,
        offeredCTC: parse.data.offeredCTC,
      },
      notes: parse.data.notes,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
      isPublished: false,
    });

    await audit({
      action: 'result.created',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'SelectionResult',
      resourceId: result._id,
      description: `Selection result created for ${app.student.email} at ${opp.companyName} (unpublished)`,
      req,
    });

    return created(res, { result }, 'Result created (unpublished)');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/results/:resultId/publish
 * Admin: publish a selection result.
 */
async function publishResult(req, res, next) {
  let session = null;
  let useSession = false;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useSession = true;
  } catch (e) {
    // Standalone MongoDB does not support transactions
    if (session) {
      try { session.endSession(); } catch (_) {}
      session = null;
    }
  }

  try {
    const query = SelectionResult.findOne({
      _id: req.params.resultId,
      college: req.user.college,
    });
    const result = useSession ? await query.session(session) : await query;

    if (!result) {
      if (useSession) {
        await session.abortTransaction();
        session.endSession();
      }
      return next(createError('Result not found', 404));
    }
    if (result.isPublished) {
      if (useSession) {
        await session.abortTransaction();
        session.endSession();
      }
      return next(createError('Result is already published', 400));
    }

    result.isPublished = true;
    result.publishedAt = new Date();
    result.publishedBy = req.user._id;
    result.lastUpdatedBy = req.user._id;
    if (useSession) {
      await result.save({ session });
    } else {
      await result.save();
    }

    // Mark application as selected
    await Application.findByIdAndUpdate(
      result.application,
      { status: 'selected', lastUpdatedBy: req.user._id },
      useSession ? { session } : {}
    );

    // Mark student as placed (only for employment / placement drives, not competitions)
    const isCompResult =
      result.publicSnapshot?.opportunityType === 'hackathon' ||
      result.publicSnapshot?.opportunityType === 'coding_competition';

    if (!isCompResult) {
      await StudentProfile.findOneAndUpdate(
        { user: result.student },
        {
          isPlaced: true,
          placedAt: new Date(),
          placedCompany: result.publicSnapshot.companyName,
        },
        useSession ? { session } : {}
      );
    }

    if (useSession) {
      await session.commitTransaction();
      session.endSession();
    }

    await audit({
      action: 'result.published',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'SelectionResult',
      resourceId: result._id,
      description: `Selection result published: ${result.publicSnapshot.studentName} at ${result.publicSnapshot.companyName}`,
      req,
      severity: 'info',
    });

    const isComp =
      result.publicSnapshot?.opportunityType === 'hackathon' ||
      result.publicSnapshot?.opportunityType === 'coding_competition';

    pushNotification({
      recipientId: result.student,
      collegeId: req.user.college,
      type: 'result_published',
      title: isComp ? '🏆 Congratulations on Winning!' : '🎉 Congratulations on Selection!',
      message: isComp
        ? `You have emerged as a winner in ${result.publicSnapshot.opportunityTitle || result.publicSnapshot.companyName}!`
        : `Your selection for ${result.publicSnapshot.companyName} has been officially published!`,
      link: '/results',
      resourceType: 'SelectionResult',
      resourceId: result._id,
    });

    return success(res, { result }, 'Result published successfully');
  } catch (err) {
    if (useSession && session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (_) {}
    }
    next(err);
  }
}

/**
 * POST /api/v1/opportunities/:id/publish-results
 * Admin: publish official selection results for all candidates marked 'selected' in this opportunity.
 * Supports publishing with 0 selected candidates as well.
 */
async function publishOpportunityResults(req, res, next) {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college });
    if (!opp) return next(createError('Opportunity not found', 404));

    const selectedApplications = await Application.find({
      opportunity: opp._id,
      status: 'selected',
    })
      .populate('student', 'email firstName lastName')
      .populate('studentProfile', 'rollNumber branch graduationYear cgpa');

    const publishedResults = [];

    for (const app of selectedApplications) {
      let result = await SelectionResult.findOne({
        opportunity: opp._id,
        student: app.student._id,
      });

      const studentName = `${app.student.firstName || ''} ${app.student.lastName || ''}`.trim() || app.student.email;

      if (!result) {
        result = new SelectionResult({
          opportunity: opp._id,
          application: app._id,
          student: app.student._id,
          college: req.user.college,
          publicSnapshot: {
            studentName,
            branch: app.studentProfile?.branch || '',
            graduationYear: app.studentProfile?.graduationYear || new Date().getFullYear(),
            rollNumber: app.studentProfile?.rollNumber || '',
            companyName: opp.companyName,
            opportunityTitle: opp.title,
            opportunityType: opp.opportunityType,
          },
          createdBy: req.user._id,
        });
      } else {
        result.publicSnapshot = {
          studentName,
          branch: app.studentProfile?.branch || result.publicSnapshot.branch,
          graduationYear: app.studentProfile?.graduationYear || result.publicSnapshot.graduationYear,
          rollNumber: app.studentProfile?.rollNumber || result.publicSnapshot.rollNumber,
          companyName: opp.companyName,
          opportunityTitle: opp.title,
          opportunityType: opp.opportunityType,
        };
      }

      result.isPublished = true;
      result.publishedAt = new Date();
      result.publishedBy = req.user._id;
      result.lastUpdatedBy = req.user._id;
      await result.save();
      publishedResults.push(result);

      // Mark student as placed
      await StudentProfile.findOneAndUpdate(
        { user: app.student._id },
        {
          isPlaced: true,
          placedAt: new Date(),
          placedCompany: opp.companyName,
        }
      );
    }

    opp.resultsPublished = true;
    opp.resultsPublishedAt = new Date();
    opp.resultsPublishedBy = req.user._id;
    opp.selectedCount = publishedResults.length;
    opp.status = 'completed';
    opp.lastUpdatedBy = req.user._id;
    await opp.save();

    await audit({
      action: 'results.bulk_published',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Opportunity',
      resourceId: opp._id,
      description: `Published official results for ${publishedResults.length} selected candidates in ${opp.companyName} (${opp.title})`,
      req,
      severity: 'info',
    });

    const isComp = opp.opportunityType === 'hackathon' || opp.opportunityType === 'coding_competition';
    const isHack = opp.opportunityType === 'hackathon';
    const compLabel = isHack ? 'Hackathon' : 'Competition';

    // Notify all college students that results have been published
    pushToCollegeStudents({
      collegeId: req.user.college,
      type: 'result_published',
      title: isComp ? `🏆 Winners Announced: ${opp.title}` : `Results Out: ${opp.companyName}`,
      message: isComp
        ? `Official winners and rankings for ${opp.title} (${opp.companyName}) have been announced!`
        : `Official recruitment results for ${opp.companyName} (${opp.title}) have been published!`,
      link: '/results',
      resourceType: 'Opportunity',
      resourceId: opp._id,
    });

    // Notify each selected candidate personally
    for (const resDoc of publishedResults) {
      pushNotification({
        recipientId: resDoc.student,
        collegeId: req.user.college,
        type: 'result_published',
        title: isComp ? '🏆 Congratulations on Winning!' : '🎉 Congratulations on Selection!',
        message: isComp
          ? `You have emerged as a winner / top performer in ${opp.title} (${opp.companyName})!`
          : `You have been selected by ${opp.companyName} for ${opp.title}!`,
        link: '/results',
        resourceType: 'Opportunity',
        resourceId: opp._id,
      });
    }

    // Notify admins
    pushToCollegeAdmins({
      collegeId: req.user.college,
      type: 'drive_completed',
      title: isComp ? `Winners Published: ${opp.title}` : `Results Published: ${opp.companyName}`,
      message: isComp
        ? `${compLabel} concluded with ${publishedResults.length} winner(s) announced.`
        : `Drive completed with ${publishedResults.length} selected candidate(s).`,
      link: '/admin/results',
      resourceType: 'Opportunity',
      resourceId: opp._id,
    });

    return success(res, {
      opportunity: opp,
      publishedCount: publishedResults.length,
      results: publishedResults,
    }, `Published official results for ${publishedResults.length} candidate(s)`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/results/:resultId/unpublish
 * Admin: unpublish a result.
 */
async function unpublishResult(req, res, next) {
  try {
    const result = await SelectionResult.findOne({
      _id: req.params.resultId,
      college: req.user.college,
    });
    if (!result) return next(createError('Result not found', 404));
    if (!result.isPublished) return next(createError('Result is not published', 400));

    result.isPublished = false;
    result.unpublishedAt = new Date();
    result.unpublishedBy = req.user._id;
    result.lastUpdatedBy = req.user._id;
    await result.save();

    await audit({
      action: 'result.unpublished',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'SelectionResult',
      resourceId: result._id,
      description: `Result unpublished: ${result.publicSnapshot.studentName} at ${result.publicSnapshot.companyName}`,
      req,
      severity: 'warning',
    });

    return success(res, { result }, 'Result unpublished');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/results
 * Students: published results only.
 * Admins: all results for their college.
 */
async function listResults(req, res, next) {
  try {
    const isAdmin = ['placement_admin', 'sys_admin'].includes(req.user.role);
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const { skip } = parsePagination({ page, limit });

    const filter = req.user.college ? { college: req.user.college } : {};
    if (!isAdmin) filter.isPublished = true;

    if (req.query.opportunityId) filter.opportunity = req.query.opportunityId;
    if (req.query.companyName) {
      filter['publicSnapshot.companyName'] = new RegExp(req.query.companyName, 'i');
    }
    if (req.query.branch) {
      filter['publicSnapshot.branch'] = new RegExp(String(req.query.branch).trim(), 'i');
    }
    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { 'publicSnapshot.studentName': new RegExp(s, 'i') },
        { 'publicSnapshot.companyName': new RegExp(s, 'i') },
        { 'publicSnapshot.opportunityTitle': new RegExp(s, 'i') },
        { 'publicSnapshot.rollNumber': new RegExp(s, 'i') },
      ];
    }

    const driveFilter = req.user.college ? { college: req.user.college, resultsPublished: true } : { resultsPublished: true };
    if (req.query.opportunityId) driveFilter._id = req.query.opportunityId;
    if (req.query.companyName) {
      driveFilter.companyName = new RegExp(req.query.companyName, 'i');
    }
    if (req.query.search) {
      const s = String(req.query.search).trim();
      driveFilter.$or = [
        { companyName: new RegExp(s, 'i') },
        { title: new RegExp(s, 'i') },
      ];
    }

    const [rawResults, total, publishedDrives] = await Promise.all([
      SelectionResult.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          isAdmin
            ? undefined
            : 'publicSnapshot isPublished publishedAt opportunity createdAt'
        )
        .lean(),
      SelectionResult.countDocuments(filter),
      Opportunity.find(driveFilter)
        .sort({ resultsPublishedAt: -1, createdAt: -1 })
        .select('companyName title opportunityType ctcOrStipend location workMode resultsPublished resultsPublishedAt selectedCount')
        .lean(),
    ]);

    const results = rawResults.map((r) => ({
      ...r,
      opportunityId: r.opportunity?.toString(),
      candidateName: r.publicSnapshot?.studentName || '',
      studentName: r.publicSnapshot?.studentName || '',
      branch: r.publicSnapshot?.branch || '',
      graduationYear: r.publicSnapshot?.graduationYear,
      rollNumber: r.publicSnapshot?.rollNumber || '',
      companyName: r.publicSnapshot?.companyName || '',
      opportunityTitle: r.publicSnapshot?.opportunityTitle || '',
      offeredCTC: r.publicSnapshot?.offeredCTC,
    }));

    // Group selected results by drive
    const drives = publishedDrives.map((d) => {
      const driveStudents = rawResults
        .filter((r) => r.opportunity && r.opportunity.toString() === d._id.toString())
        .map((r) => ({
          _id: r._id,
          candidateName: r.publicSnapshot?.studentName || '',
          studentName: r.publicSnapshot?.studentName || '',
          branch: r.publicSnapshot?.branch || '',
          graduationYear: r.publicSnapshot?.graduationYear,
          rollNumber: r.publicSnapshot?.rollNumber || '',
          offeredCTC: r.publicSnapshot?.offeredCTC,
          publishedAt: r.publishedAt,
        }));

      return {
        _id: d._id,
        opportunityId: d._id,
        companyName: d.companyName,
        title: d.title,
        opportunityType: d.opportunityType,
        ctcOrStipend: d.ctcOrStipend,
        location: d.location,
        workMode: d.workMode,
        resultsPublishedAt: d.resultsPublishedAt,
        selectedCount: d.selectedCount ?? driveStudents.length,
        selectedStudents: driveStudents,
      };
    });

    // Also include any drive present in rawResults not already in drives
    rawResults.forEach((r) => {
      const oppId = r.opportunity?.toString();
      const compName = r.publicSnapshot?.companyName || 'Company';
      if (!drives.some((d) => d._id?.toString() === oppId || (d.companyName === compName && d.title === r.publicSnapshot?.opportunityTitle))) {
        const studentList = rawResults
          .filter((sub) => (oppId && sub.opportunity?.toString() === oppId) || sub.publicSnapshot?.companyName === compName)
          .map((sub) => ({
            _id: sub._id,
            candidateName: sub.publicSnapshot?.studentName || '',
            studentName: sub.publicSnapshot?.studentName || '',
            rollNumber: sub.publicSnapshot?.rollNumber || '',
            branch: sub.publicSnapshot?.branch || '',
            graduationYear: sub.publicSnapshot?.graduationYear,
            offeredCTC: sub.publicSnapshot?.offeredCTC,
            publishedAt: sub.publishedAt,
          }));

        drives.push({
          _id: oppId || compName,
          opportunityId: oppId,
          companyName: compName,
          title: r.publicSnapshot?.opportunityTitle || 'Placement Drive',
          selectedCount: studentList.length,
          resultsPublishedAt: r.publishedAt || r.createdAt,
          selectedStudents: studentList,
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Success',
      data: results,
      drives,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createResult,
  publishResult,
  publishOpportunityResults,
  unpublishResult,
  listResults,
};
