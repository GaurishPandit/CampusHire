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
const { pushNotification, pushToCollegeAdmins } = require('./notification.controller');
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

    const isComp = opp.opportunityType === 'hackathon' || opp.opportunityType === 'coding_competition';
    const isHack = opp.opportunityType === 'hackathon';
    const compLabel = isHack ? 'Hackathon' : 'Coding Competition';

    // Notify student
    pushNotification({
      recipientId: req.user._id,
      collegeId: req.user.college,
      type: 'application_status',
      title: isComp ? `Registered: ${opp.title}` : `Applied: ${opp.companyName}`,
      message: isComp
        ? `Your registration for ${opp.title} (${opp.companyName}) was confirmed successfully.`
        : `Your application for ${opp.companyName} (${opp.title}) was submitted successfully.`,
      link: '/applications',
      resourceType: 'Application',
      resourceId: application._id,
    });

    // Notify admins
    const studentName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    pushToCollegeAdmins({
      collegeId: req.user.college,
      type: 'new_application',
      title: isComp ? `New Participant: ${opp.title}` : `New Candidate: ${opp.companyName}`,
      message: isComp
        ? `${studentName} registered for ${opp.title}.`
        : `${studentName} applied for ${opp.companyName} (${opp.title}).`,
      link: `/admin/opportunities`,
      resourceType: 'Application',
      resourceId: application._id,
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
        .populate('opportunity', 'companyName title opportunityType type workMode applicationMode status applicationDeadline deadline externalUrl externalApplicationUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments({ student: req.user._id }),
    ]);

    const formatted = applications.map((app) => ({
      ...app,
      personalStatus: app.status,
      appliedAt: app.createdAt,
      applicationMode: app.applicationType || app.applicationMode,
    }));

    return paginated(res, formatted, buildPaginationMeta(page, limit, total));
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

    const formatted = applications.map((app) => ({
      ...app,
      personalStatus: app.status,
      appliedAt: app.createdAt,
      applicationMode: app.applicationType || app.applicationMode,
      isExternalSelfReported: app.externalApplicationConfirmed,
      student: app.student
        ? {
            ...app.student,
            name: `${app.student.firstName || ''} ${app.student.lastName || ''}`.trim() || app.student.email,
            rollNumber: app.studentProfile?.rollNumber || '',
            branch: app.studentProfile?.branch || '',
            cgpa: app.studentProfile?.cgpa ?? '',
            graduationYear: app.studentProfile?.graduationYear ?? '',
          }
        : app.student,
    }));

    return paginated(res, formatted, buildPaginationMeta(page, limit, total));
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
      .populate('opportunity', 'college companyName title opportunityType type');

    if (!app) return next(createError('Application not found', 404));
    if (app.opportunity.college.toString() !== req.user.college?.toString()) {
      return next(createError('Forbidden', 403));
    }

    if (app.status === parse.data.status) {
      if (parse.data.adminNotes && parse.data.adminNotes !== app.adminNotes) {
        app.adminNotes = parse.data.adminNotes;
        app.lastUpdatedBy = req.user._id;
        await app.save();
      }
      return success(res, { application: app }, 'Application status updated');
    }

    const isAdmin = ['placement_admin', 'sys_admin'].includes(req.user.role);
    if (!isAdmin && !app.canTransitionTo(parse.data.status)) {
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

    const isComp = app.opportunity && (app.opportunity.opportunityType === 'hackathon' || app.opportunity.opportunityType === 'coding_competition');

    let statusLabel = app.status.replace('_', ' ');
    if (isComp) {
      if (app.status === 'shortlisted') statusLabel = 'Advanced to next stage';
      else if (app.status === 'selected') statusLabel = 'Winner / Finalist';
      else if (app.status === 'rejected') statusLabel = 'Eliminated';
      else if (app.status === 'submitted') statusLabel = 'Registered';
    } else {
      if (app.status === 'shortlisted') statusLabel = 'shortlisted for next round';
    }

    pushNotification({
      recipientId: app.student,
      collegeId: req.user.college,
      type: 'application_status',
      title: isComp ? `Stage Update: ${app.opportunity.title}` : `Status: ${app.opportunity.companyName}`,
      message: isComp
        ? `Your status in ${app.opportunity.title} is now: ${statusLabel}.`
        : `Your application status for ${app.opportunity.companyName} has been updated to: ${statusLabel}.`,
      link: '/applications',
      resourceType: 'Application',
      resourceId: app._id,
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
      .populate('opportunity', 'college companyName title opportunityType type');

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

    const isComp = app.opportunity && (app.opportunity.opportunityType === 'hackathon' || app.opportunity.opportunityType === 'coding_competition');
    const compLabel = isComp ? 'Phase' : 'Round';

    let outcomeText = parse.data.outcome;
    if (isComp) {
      if (parse.data.outcome === 'advanced') outcomeText = 'qualified for the next phase';
      else if (parse.data.outcome === 'selected') outcomeText = 'declared a winner/top performer';
      else if (parse.data.outcome === 'rejected') outcomeText = 'eliminated';
    } else {
      if (parse.data.outcome === 'advanced') outcomeText = 'shortlisted for next round';
      else if (parse.data.outcome === 'selected') outcomeText = 'selected';
      else if (parse.data.outcome === 'rejected') outcomeText = 'not moving forward';
    }

    pushNotification({
      recipientId: app.student,
      collegeId: req.user.college,
      type: 'application_status',
      title: isComp ? `${compLabel} Update: ${app.opportunity.title}` : `Round Update: ${app.opportunity?.companyName || 'Recruitment'}`,
      message: `Result for ${round.name}: you have been ${outcomeText}.`,
      link: '/applications',
      resourceType: 'Application',
      resourceId: app._id,
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
