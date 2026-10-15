'use strict';

const Opportunity = require('../models/Opportunity');
const StudentProfile = require('../models/StudentProfile');
const { createError } = require('../middleware/errorHandler');
const { success, created, paginated } = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta, sanitizeSearch } = require('../utils/helpers');
const { audit } = require('../services/audit.service');
const { evaluateEligibility, evaluateBulk } = require('../services/eligibility.service');
const {
  createOpportunitySchema,
  updateOpportunitySchema,
  changeStatusSchema,
  opportunityQuerySchema,
} = require('../validators/opportunity.validators');

function normalizeOpportunityInput(raw = {}) {
  const data = { ...raw };

  // Map type / opportunityType
  if (data.type && !data.opportunityType) {
    data.opportunityType = data.type === 'placement' ? 'full_time' : data.type;
  }
  if (data.opportunityType === 'placement') {
    data.opportunityType = 'full_time';
  }

  // Map workMode
  if (data.workMode === 'on-site') {
    data.workMode = 'on_site';
  }

  // Map deadline / applicationDeadline
  if (data.deadline && !data.applicationDeadline) {
    data.applicationDeadline = new Date(data.deadline);
  }

  // Map externalUrl / externalApplicationUrl
  if (data.externalUrl && !data.externalApplicationUrl) {
    data.externalApplicationUrl = data.externalUrl;
  }

  // Description fallback if missing
  if (!data.description || !data.description.trim()) {
    data.description = `${data.title || 'Role'} at ${data.companyName || 'Company'}`;
  }

  // Map flat eligibility fields to eligibilityCriteria
  const criteria = { ...(data.eligibilityCriteria || {}) };
  if (data.minCgpa !== undefined && criteria.minCgpa === undefined) {
    criteria.minCgpa = parseFloat(data.minCgpa) || 0;
  }
  if (data.maxBacklogs !== undefined && criteria.maxActiveBacklogs === undefined) {
    criteria.maxActiveBacklogs = parseInt(data.maxBacklogs, 10) || 0;
  }
  if (data.eligibleBranches !== undefined && !criteria.eligibleBranches) {
    criteria.eligibleBranches = Array.isArray(data.eligibleBranches)
      ? data.eligibleBranches
      : String(data.eligibleBranches).split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);
  }
  if (data.eligibleGraduationYears !== undefined && !criteria.eligibleGraduationYears) {
    criteria.eligibleGraduationYears = Array.isArray(data.eligibleGraduationYears)
      ? data.eligibleGraduationYears
      : String(data.eligibleGraduationYears).split(',').map((y) => parseInt(y.trim(), 10)).filter((y) => !isNaN(y));
  }
  data.eligibilityCriteria = criteria;

  return data;
}

/**
 * POST /api/v1/opportunities
 * Admin: create a new opportunity.
 */
async function createOpportunity(req, res, next) {
  try {
    const normalized = normalizeOpportunityInput(req.body);
    const parse = createOpportunitySchema.safeParse(normalized);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError(`Validation failed: ${errors.map((e) => e.message).join(', ')}`, 422, errors));
    }

    const oppData = {
      ...parse.data,
      opportunityType: normalized.opportunityType || 'full_time',
      workMode: normalized.workMode || 'on_site',
      applicationDeadline: normalized.applicationDeadline || parse.data.applicationDeadline,
      ctcOrStipend: normalized.ctcOrStipend || '',
      eligibilityCriteria: normalized.eligibilityCriteria,
      college: req.user.college,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
      status: normalized.status || 'draft',
    };

    const opp = await Opportunity.create(oppData);

    await audit({
      action: 'opportunity.created',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Opportunity',
      resourceId: opp._id,
      description: `Opportunity created: ${opp.companyName} — ${opp.title}`,
      after: { companyName: opp.companyName, title: opp.title, status: opp.status },
      req,
    });

    return created(res, { opportunity: opp }, 'Opportunity created');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/opportunities
 * Student: list published opportunities with eligibility status.
 * Admin: list all opportunities for their college.
 */
async function listOpportunities(req, res, next) {
  try {
    const qParse = opportunityQuerySchema.safeParse(req.query);
    if (!qParse.success) return next(createError('Invalid query parameters', 400));

    const { page, limit, search, type, status, branch, graduationYear, sortBy, sortOrder } = qParse.data;
    const { skip } = parsePagination({ page, limit });

    const isAdmin = ['placement_admin', 'sys_admin'].includes(req.user.role);

    const filter = { college: req.user.college };

    // Students only see published opportunities
    if (!isAdmin) {
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (type) filter.opportunityType = type;

    if (search) {
      const s = sanitizeSearch(search);
      filter.$or = [
        { companyName: new RegExp(s, 'i') },
        { title: new RegExp(s, 'i') },
      ];
    }

    if (branch && !isAdmin) {
      filter.$or = filter.$or || [];
      filter['eligibilityCriteria.eligibleBranches'] = { $in: ['', branch] };
    }

    if (graduationYear && !isAdmin) {
      filter['eligibilityCriteria.eligibleGraduationYears'] = { $in: [graduationYear] };
    }

    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [opportunities, total] = await Promise.all([
      Opportunity.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      Opportunity.countDocuments(filter),
    ]);

    // Attach eligibility for students
    let result = opportunities;
    if (!isAdmin) {
      const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
      if (profile) {
        const eligibilityMap = evaluateBulk(profile, opportunities);
        result = opportunities.map((opp) => ({
          ...opp,
          eligibility: eligibilityMap.get(opp._id.toString()) || null,
        }));
      }
    }

    return paginated(res, result, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/opportunities/:id
 * Get a single opportunity. Students only see published.
 */
async function getOpportunityById(req, res, next) {
  try {
    const isAdmin = ['placement_admin', 'sys_admin'].includes(req.user.role);
    const filter = { _id: req.params.id, college: req.user.college };
    if (!isAdmin) filter.status = 'published';

    const opp = await Opportunity.findOne(filter)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!opp) return next(createError('Opportunity not found', 404));

    let eligibility = null;
    if (!isAdmin) {
      const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
      if (profile) {
        eligibility = evaluateEligibility(profile, opp);
      }
    }

    const RecruitmentRound = require('../models/RecruitmentRound');
    const rounds = await RecruitmentRound.find({
      opportunity: opp._id,
      college: req.user.college,
      ...(isAdmin ? {} : { isPublished: true }),
    })
      .sort({ sequenceNumber: 1 })
      .lean();

    opp.rounds = rounds;
    opp.type = opp.opportunityType;
    opp.deadline = opp.applicationDeadline;

    return success(res, {
      ...opp,
      opportunity: opp,
      eligibility,
      rounds,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/opportunities/:id
 * Admin: update an opportunity (only in draft or published state).
 */
async function updateOpportunity(req, res, next) {
  try {
    const normalized = normalizeOpportunityInput(req.body);
    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college });
    if (!opp) return next(createError('Opportunity not found', 404));

    if (!['draft', 'published'].includes(opp.status)) {
      return next(createError(`Cannot edit an opportunity in ${opp.status} state`, 400));
    }

    const before = opp.toObject();
    if (normalized.companyName) opp.companyName = normalized.companyName;
    if (normalized.title) opp.title = normalized.title;
    if (normalized.description) opp.description = normalized.description;
    if (normalized.opportunityType) opp.opportunityType = normalized.opportunityType;
    if (normalized.workMode) opp.workMode = normalized.workMode;
    if (normalized.location !== undefined) opp.location = normalized.location;
    if (normalized.ctcOrStipend !== undefined) opp.ctcOrStipend = normalized.ctcOrStipend;
    if (normalized.applicationMode) opp.applicationMode = normalized.applicationMode;
    if (normalized.applicationDeadline) opp.applicationDeadline = normalized.applicationDeadline;
    if (normalized.externalApplicationUrl !== undefined) opp.externalApplicationUrl = normalized.externalApplicationUrl;
    if (normalized.eligibilityCriteria) {
      const current = opp.eligibilityCriteria?.toObject ? opp.eligibilityCriteria.toObject() : (opp.eligibilityCriteria || {});
      opp.eligibilityCriteria = { ...current, ...normalized.eligibilityCriteria };
    }
    if (normalized.status && opp.canTransitionTo && opp.canTransitionTo(normalized.status)) {
      opp.status = normalized.status;
    }
    opp.lastUpdatedBy = req.user._id;
    await opp.save();

    await audit({
      action: 'opportunity.updated',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Opportunity',
      resourceId: opp._id,
      description: `Opportunity updated: ${opp.companyName} — ${opp.title}`,
      before: { status: before.status, eligibilityCriteria: before.eligibilityCriteria },
      after: { status: opp.status, eligibilityCriteria: opp.eligibilityCriteria },
      req,
    });

    return success(res, { opportunity: opp }, 'Opportunity updated');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/opportunities/:id/status
 * Admin: change opportunity status with transition validation.
 */
async function changeOpportunityStatus(req, res, next) {
  try {
    const parse = changeStatusSchema.safeParse(req.body);
    if (!parse.success) return next(createError('Invalid status', 422));

    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college });
    if (!opp) return next(createError('Opportunity not found', 404));

    const { status: newStatus } = parse.data;
    if (!opp.canTransitionTo(newStatus)) {
      return next(createError(`Cannot transition from '${opp.status}' to '${newStatus}'`, 400));
    }

    const before = { status: opp.status };
    opp.status = newStatus;
    opp.lastUpdatedBy = req.user._id;
    if (newStatus === 'published' && !opp.publishedAt) opp.publishedAt = new Date();
    if (newStatus === 'closed') opp.closedAt = new Date();
    if (newStatus === 'completed') opp.completedAt = new Date();
    await opp.save();

    await audit({
      action: 'opportunity.status_changed',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Opportunity',
      resourceId: opp._id,
      description: `Opportunity status changed: ${opp.companyName} ${before.status} → ${newStatus}`,
      before,
      after: { status: newStatus },
      req,
      severity: newStatus === 'published' ? 'info' : 'info',
    });

    return success(res, { opportunity: opp }, `Opportunity ${newStatus} successfully`);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/opportunities/:id
 * Admin: soft-delete (only draft opportunities).
 */
async function deleteOpportunity(req, res, next) {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id, college: req.user.college });
    if (!opp) return next(createError('Opportunity not found', 404));
    if (opp.status !== 'draft') {
      return next(createError('Only draft opportunities can be deleted', 400));
    }

    await opp.deleteOne();

    await audit({
      action: 'opportunity.deleted',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'Opportunity',
      resourceId: opp._id,
      description: `Opportunity deleted: ${opp.companyName} — ${opp.title}`,
      req,
      severity: 'warning',
    });

    return success(res, null, 'Opportunity deleted');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/opportunities/:id/eligibility
 * Student: check eligibility for a specific opportunity.
 */
async function checkEligibility(req, res, next) {
  try {
    const opp = await Opportunity.findOne({
      _id: req.params.id,
      college: req.user.college,
      status: 'published',
    }).lean();
    if (!opp) return next(createError('Opportunity not found', 404));

    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) {
      return next(createError('Your student profile is not set up yet. Contact the placement cell.', 404));
    }

    const eligibility = evaluateEligibility(profile, opp);
    return success(res, { eligibility });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOpportunity,
  listOpportunities,
  getOpportunityById,
  updateOpportunity,
  changeOpportunityStatus,
  deleteOpportunity,
  checkEligibility,
};
