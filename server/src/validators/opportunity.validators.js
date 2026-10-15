'use strict';

const { z } = require('zod');

const OPPORTUNITY_TYPES = ['internship', 'full_time', 'placement'];
const WORK_MODES = ['remote', 'hybrid', 'on_site', 'on-site'];
const APPLICATION_MODES = ['internal', 'external', 'both'];
const OPPORTUNITY_STATUSES = ['draft', 'published', 'closed', 'completed'];

const eligibilityCriteriaSchema = z.object({
  minCgpa: z.coerce.number().min(0).max(10).optional().default(0),
  maxActiveBacklogs: z.coerce.number().int().min(0).optional().default(0),
  eligibleBranches: z.array(z.string().trim()).optional().default([]),
  eligibleGraduationYears: z.array(z.coerce.number().int()).optional().default([]),
  requiredProfileFields: z.array(z.string().trim()).optional().default([]),
  additionalNotes: z.string().max(1000).optional(),
});

const createOpportunitySchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  companyLogoUrl: z.string().optional().or(z.literal('')),
  companyWebsite: z.string().optional().or(z.literal('')),
  title: z.string().trim().min(1, 'Job title is required').max(200),
  description: z.string().optional().default(''),
  opportunityType: z
    .enum(OPPORTUNITY_TYPES)
    .optional()
    .transform((val) => (val === 'placement' ? 'full_time' : val || 'full_time')),
  type: z.string().optional(),
  workMode: z
    .enum(WORK_MODES)
    .optional()
    .transform((val) => (val === 'on-site' ? 'on_site' : val || 'on_site')),
  location: z.string().trim().max(300).optional().default(''),
  ctcOrStipend: z.string().optional().default(''),
  stipendMin: z.coerce.number().min(0).optional(),
  stipendMax: z.coerce.number().min(0).optional(),
  ctcMin: z.coerce.number().min(0).optional(),
  ctcMax: z.coerce.number().min(0).optional(),
  applicationDeadline: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  applicationMode: z.enum(APPLICATION_MODES).optional().default('internal'),
  externalApplicationUrl: z.string().optional().or(z.literal('')),
  externalUrl: z.string().optional().or(z.literal('')),
  eligibilityCriteria: eligibilityCriteriaSchema.optional().default({}),
  minCgpa: z.coerce.number().optional(),
  maxBacklogs: z.coerce.number().optional(),
  eligibleBranches: z.any().optional(),
  eligibleGraduationYears: z.any().optional(),
  status: z.enum(OPPORTUNITY_STATUSES).optional().default('draft'),
  isPinned: z.boolean().optional().default(false),
});

const updateOpportunitySchema = z.record(z.any());

const changeStatusSchema = z.object({
  status: z.enum(OPPORTUNITY_STATUSES),
});

const opportunityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  workMode: z.string().optional(),
  applicationMode: z.string().optional(),
  branch: z.string().optional(),
  graduationYear: z.coerce.number().int().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = {
  createOpportunitySchema,
  updateOpportunitySchema,
  changeStatusSchema,
  opportunityQuerySchema,
  OPPORTUNITY_TYPES,
  WORK_MODES,
  APPLICATION_MODES,
  OPPORTUNITY_STATUSES,
};
