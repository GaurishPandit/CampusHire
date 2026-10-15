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
 * Admin: publish a selection result using a MongoDB transaction.
 */
async function publishResult(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await SelectionResult.findOne({
      _id: req.params.resultId,
      college: req.user.college,
    }).session(session);

    if (!result) {
      await session.abortTransaction();
      return next(createError('Result not found', 404));
    }
    if (result.isPublished) {
      await session.abortTransaction();
      return next(createError('Result is already published', 400));
    }

    result.isPublished = true;
    result.publishedAt = new Date();
    result.publishedBy = req.user._id;
    result.lastUpdatedBy = req.user._id;
    await result.save({ session });

    // Mark application as selected
    await Application.findByIdAndUpdate(
      result.application,
      { status: 'selected', lastUpdatedBy: req.user._id },
      { session }
    );

    // Mark student as placed
    await StudentProfile.findOneAndUpdate(
      { user: result.student },
      {
        isPlaced: true,
        placedAt: new Date(),
        placedCompany: result.publicSnapshot.companyName,
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

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

    return success(res, { result }, 'Result published successfully');
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
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

    const [results, total] = await Promise.all([
      SelectionResult.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        // Only expose publicSnapshot fields for students
        .select(
          isAdmin
            ? undefined
            : 'publicSnapshot isPublished publishedAt opportunity'
        )
        .lean(),
      SelectionResult.countDocuments(filter),
    ]);

    return paginated(res, results, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

module.exports = { createResult, publishResult, unpublishResult, listResults };
