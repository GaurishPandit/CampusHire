'use strict';

const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const StudentProfile = require('../models/StudentProfile');
const RecruitmentRound = require('../models/RecruitmentRound');
const { createError } = require('../middleware/errorHandler');
const { success, created, paginated } = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');
const { audit } = require('../services/audit.service');
const { evaluateEligibility } = require('../services/eligibility.service');
const { z } = require('zod');

const submitApplicationSchema = z
  .object({
    applicationType: z.enum(['internal', 'external']).optional(),
    applicationMode: z.enum(['internal', 'external']).optional(),
    externalApplicationConfirmed: z.boolean().optional(),
    confirmed: z.boolean().optional(),
  })
  .transform((data) => ({
    applicationType: data.applicationType || data.applicationMode || 'internal',
    externalApplicationConfirmed: data.externalApplicationConfirmed ?? data.confirmed ?? false,
  }));

const updateStatusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'shortlisted', 'rejected', 'withdrawn', 'selected']),
  adminNotes: z.string().max(2000).optional(),
});

const roundResultSchema = z.object({
  roundId: z.string().min(1),
  outcome: z.enum(['pending', 'advanced', 'rejected', 'skipped', 'selected']),
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/opportunities/:id/applications
 * Student: submit an application.
 */
async function submitApplication(req, res, next) {
  try {
    const parse = submitApplicationSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    const opp = await Opportunity.findOne({
      _id: req.params.id,
      college: req.user.college,
      status: 'published',
    }).lean();

    if (!opp) return next(createError('Opportunity not found or not currently open', 404));

    // Check deadline
    if (opp.applicationDeadline && new Date() > opp.applicationDeadline) {
      return next(createError('The application deadline for this opportunity has passed', 400));
    }

    // Check existing application
    const existing = await Application.findOne({
      student: req.user._id,
      opportunity: opp._id,
    });
    if (existing) {
      return next(createError('You have already applied to this opportunity', 409));
    }

    // Get student profile
    const profile = await StudentProfile.findOne({
      user: req.user._id,
      college: req.user.college,
    }).lean();
    if (!profile) return next(createError('Student profile not found', 404));

    // Server-side eligibility recheck
    const eligibility = evaluateEligibility(profile, opp);
    if (eligibility.status === 'not_eligible') {
      return next(createError(
        `You are not eligible for this opportunity: ${eligibility.reasons[0]}`,
        403
      ));
    }

    const { applicationType, externalApplicationConfirmed } = parse.data;

    const application = await Application.create({
      student: req.user._id,
      studentProfile: profile._id,
      opportunity: opp._id,
      college: req.user.college,
      applicationType,
      status: 'submitted',
      externalApplicationConfirmed: applicationType === 'external' ? externalApplicationConfirmed : false,
      externalApplicationConfirmedAt:
        applicationType === 'external' && externalApplicationConfirmed ? new Date() : undefined,
      eligibilitySnapshot: {
        status: eligibility.status,
        reasons: eligibility.reasons,
        criteriaVersion: eligibility.criteriaVersion,
        checkedAt: new Date(),
      },
    });

    await audit({
      action: 'application.submitted',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Application',
      resourceId: application._id,
      description: `Application submitted: ${req.user.email} → ${opp.companyName} (${opp.title})`,
      req,
    });

    return created(res, { application }, 'Application submitted successfully');
  } catch (err) {
    if (err.code === 11000) {
      return next(createError('You have already applied to this opportunity', 409));
    }
    next(err);
  }
}

/**
 * GET /api/v1/applications/me
 * Student: get own applications.
 */
async function getMyApplications(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const { skip } = parsePagination({ page, limit });

    const [applications, total] = await Promise.all([
      Application.find({ student: req.user._id })
        .populate('opportunity', 'companyName title opportunityType status applicationDeadline')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments({ student: req.user._id }),
    ]);

    return paginated(res, applications, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/opportunities/:id/applications
 * Admin: list all applications for an opportunity.
 */
async function listApplicationsForOpportunity(req, res, next) {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college });
    if (!opp) return next(createError('Opportunity not found', 404));

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const { skip } = parsePagination({ page, limit });

    const filter = { opportunity: opp._id };
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('student', 'email firstName lastName')
        .populate('studentProfile', 'rollNumber branch graduationYear cgpa')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return paginated(res, applications, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/applications/:id/status
 * Admin: update application status.
 */
async function updateApplicationStatus(req, res, next) {
  try {
    const parse = updateStatusSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    const app = await Application.findById(req.params.id)
      .populate('opportunity', 'college companyName title');

    if (!app) return next(createError('Application not found', 404));
    if (app.opportunity.college.toString() !== req.user.college?.toString()) {
      return next(createError('Forbidden', 403));
    }

    if (!app.canTransitionTo(parse.data.status)) {
      return next(createError(
        `Cannot transition application from '${app.status}' to '${parse.data.status}'`,
        400
      ));
    }

    const before = { status: app.status };
    app.status = parse.data.status;
    app.lastUpdatedBy = req.user._id;
    if (parse.data.adminNotes) app.adminNotes = parse.data.adminNotes;
    await app.save();

    await audit({
      action: 'application.status_changed',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Application',
      resourceId: app._id,
      description: `Application status changed: ${before.status} → ${app.status} for ${app.opportunity.companyName}`,
      before,
      after: { status: app.status },
      req,
    });

    return success(res, { application: app }, 'Application status updated');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/applications/:id/round-result
 * Admin: record round-level outcome for an application.
 */
async function updateRoundResult(req, res, next) {
  try {
    const parse = roundResultSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    const app = await Application.findById(req.params.id)
      .populate('opportunity', 'college');

    if (!app) return next(createError('Application not found', 404));
    if (app.opportunity.college.toString() !== req.user.college?.toString()) {
      return next(createError('Forbidden', 403));
    }

    // Verify round belongs to the opportunity
    const round = await RecruitmentRound.findOne({
      _id: parse.data.roundId,
      opportunity: app.opportunity._id,
    });
    if (!round) return next(createError('Round not found for this opportunity', 404));

    // Upsert round result
    const existingIdx = app.roundResults.findIndex(
      (r) => r.round.toString() === parse.data.roundId
    );
    const resultEntry = {
      round: parse.data.roundId,
      outcome: parse.data.outcome,
      notes: parse.data.notes,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    };

    if (existingIdx >= 0) {
      app.roundResults[existingIdx] = resultEntry;
    } else {
      app.roundResults.push(resultEntry);
    }
    app.lastUpdatedBy = req.user._id;
    await app.save();

    await audit({
      action: 'application.round_result_updated',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Application',
      resourceId: app._id,
      description: `Round result updated: ${round.name} → ${parse.data.outcome}`,
      req,
    });

    return success(res, { application: app }, 'Round result updated');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/applications/:id/withdraw
 * Student: withdraw own application.
 */
async function withdrawApplication(req, res, next) {
  try {
    const app = await Application.findOne({
      _id: req.params.id,
      student: req.user._id,
    }).populate('opportunity', 'companyName title');

    if (!app) return next(createError('Application not found', 404));
    if (!app.canTransitionTo('withdrawn')) {
      return next(createError(`Cannot withdraw an application in '${app.status}' status`, 400));
    }

    app.status = 'withdrawn';
    app.withdrawnAt = new Date();
    app.withdrawalReason = req.body.reason?.substring(0, 500) || undefined;
    await app.save();

    await audit({
      action: 'application.withdrawn',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Application',
      resourceId: app._id,
      description: `Application withdrawn by student: ${app.opportunity.companyName}`,
      req,
    });

    return success(res, null, 'Application withdrawn');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitApplication,
  getMyApplications,
  listApplicationsForOpportunity,
  updateApplicationStatus,
  updateRoundResult,
  withdrawApplication,
};
