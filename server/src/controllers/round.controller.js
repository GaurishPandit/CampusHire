'use strict';

const RecruitmentRound = require('../models/RecruitmentRound');
const Opportunity = require('../models/Opportunity');
const { createError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/apiResponse');
const { audit } = require('../services/audit.service');
const { z } = require('zod');

const ROUND_TYPES = [
  'registration',
  'online_assessment',
  'coding_assessment',
  'group_discussion',
  'technical_interview',
  'hr_interview',
  'final_selection',
  'other',
];

function normalizeRoundType(val) {
  if (!val) return 'online_assessment';
  const lower = String(val).toLowerCase().trim();
  if (lower.includes('assess') || lower === 'assessment') return 'online_assessment';
  if (lower.includes('cod')) return 'coding_assessment';
  if (lower.includes('tech')) return 'technical_interview';
  if (lower.includes('hr')) return 'hr_interview';
  if (lower.includes('final') || lower.includes('select')) return 'final_selection';
  if (lower.includes('group') || lower.includes('gd')) return 'group_discussion';
  if (lower.includes('regist')) return 'registration';
  if (ROUND_TYPES.includes(lower)) return lower;
  return 'other';
}

function normalizeRoundInput(body = {}) {
  const data = { ...body };
  data.roundType = normalizeRoundType(data.roundType || data.type);
  data.sequenceNumber = parseInt(data.sequenceNumber || data.sequence, 10) || 1;
  data.isPublished = data.isPublished !== undefined ? Boolean(data.isPublished) : true;
  if (!data.scheduledDate || String(data.scheduledDate).trim() === '') {
    delete data.scheduledDate;
  }
  if (!data.status) {
    data.status = 'upcoming';
  }
  return data;
}

const createRoundSchema = z.object({
  name: z.string().trim().min(1, 'Round name is required').max(200),
  roundType: z.string().optional().transform(normalizeRoundType),
  type: z.string().optional(),
  sequenceNumber: z.coerce.number().int().min(1).optional().default(1),
  sequence: z.coerce.number().int().optional(),
  description: z.string().max(2000).optional().default(''),
  scheduledDate: z.coerce.date().optional(),
  scheduledVenue: z.string().max(300).optional().default(''),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  isPublished: z.boolean().optional().default(true),
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled', 'scheduled']).optional().default('upcoming'),
  notes: z.string().max(2000).optional(),
});

const updateRoundSchema = createRoundSchema.partial();

const changeRoundStatusSchema = z.object({
  status: z.enum(['upcoming', 'scheduled', 'active', 'completed', 'cancelled']),
});

async function assertOpportunityOwnership(opportunityId, collegeId) {
  const opp = await Opportunity.findOne({ _id: opportunityId, college: collegeId });
  if (!opp) throw createError('Opportunity not found', 404);
  return opp;
}

/**
 * POST /api/v1/opportunities/:id/rounds
 */
async function createRound(req, res, next) {
  try {
    const opp = await assertOpportunityOwnership(req.params.id, req.user.college);
    const normalized = normalizeRoundInput(req.body);

    const parse = createRoundSchema.safeParse(normalized);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      const msg = `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`;
      return next(createError(msg, 422, errors));
    }

    const round = await RecruitmentRound.create({
      ...parse.data,
      roundType: normalized.roundType || parse.data.roundType,
      sequenceNumber: normalized.sequenceNumber || parse.data.sequenceNumber,
      status: parse.data.status || normalized.status || 'upcoming',
      isPublished: true,
      opportunity: opp._id,
      college: req.user.college,
      lastUpdatedBy: req.user._id,
      publishedAt: new Date(),
    });

    await audit({
      action: 'round.created',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'RecruitmentRound',
      resourceId: round._id,
      description: `Round created: ${round.name} (seq ${round.sequenceNumber}) for ${opp.companyName}`,
      req,
    });

    return created(res, { round });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/opportunities/:id/rounds
 */
async function listRounds(req, res, next) {
  try {
    const isAdmin = ['placement_admin', 'sys_admin'].includes(req.user.role);
    const filter = { opportunity: req.params.id, college: req.user.college };
    if (!isAdmin) filter.isPublished = true;

    const rounds = await RecruitmentRound.find(filter)
      .sort({ sequenceNumber: 1 })
      .lean();

    return success(res, { rounds });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/rounds/:roundId
 */
/**
 * PATCH /api/v1/rounds/:roundId
 */
async function updateRound(req, res, next) {
  try {
    const round = await RecruitmentRound.findOne({
      _id: req.params.roundId,
      college: req.user.college,
    });
    if (!round) return next(createError('Round not found', 404));

    const normalized = normalizeRoundInput(req.body);
    const parse = updateRoundSchema.safeParse(normalized);
    if (!parse.success) {
      const errors = parse.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return next(createError('Validation failed', 422, errors));
    }

    Object.assign(round, parse.data, { lastUpdatedBy: req.user._id });
    if (parse.data.status === 'completed' && !round.completedAt) round.completedAt = new Date();
    if (parse.data.isPublished && !round.publishedAt) round.publishedAt = new Date();
    await round.save();

    await audit({
      action: 'round.updated',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'RecruitmentRound',
      resourceId: round._id,
      description: `Round updated: ${round.name}`,
      req,
    });

    return success(res, { round }, 'Round updated');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/rounds/:roundId/status
 */
async function changeRoundStatus(req, res, next) {
  try {
    const round = await RecruitmentRound.findOne({
      _id: req.params.roundId,
      college: req.user.college,
    });
    if (!round) return next(createError('Round not found', 404));

    const parse = changeRoundStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return next(createError('Invalid status. Supported: scheduled, upcoming, active, completed, cancelled', 422));
    }

    const before = { status: round.status };
    round.status = parse.data.status;
    round.lastUpdatedBy = req.user._id;
    if (parse.data.status === 'completed') {
      round.completedAt = new Date();
    }
    await round.save();

    await audit({
      action: 'round.status_changed',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'RecruitmentRound',
      resourceId: round._id,
      description: `Round status: ${before.status} → ${round.status}`,
      before,
      after: { status: round.status },
      req,
    });

    return success(res, { round }, `Round marked as ${round.status}`);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/rounds/:roundId
 */
async function deleteRound(req, res, next) {
  try {
    const round = await RecruitmentRound.findOneAndDelete({
      _id: req.params.roundId,
      college: req.user.college,
    });
    if (!round) return next(createError('Round not found', 404));

    await audit({
      action: 'round.deleted',
      actor: req.user,
      collegeId: req.user.college,
      resourceType: 'RecruitmentRound',
      resourceId: round._id,
      description: `Round deleted: ${round.name}`,
      req,
    });

    return success(res, { round }, 'Round deleted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = { createRound, listRounds, updateRound, changeRoundStatus, deleteRound };
