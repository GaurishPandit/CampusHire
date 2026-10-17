'use strict';

const mongoose = require('mongoose');

const OPPORTUNITY_TYPES = ['internship', 'full_time', 'placement', 'hackathon', 'coding_competition'];
const WORK_MODES = ['remote', 'hybrid', 'on_site', 'on-site'];
const OPPORTUNITY_STATUSES = ['draft', 'published', 'closed', 'completed'];
const APPLICATION_MODES = ['internal', 'external', 'both'];

// Valid status transitions
const VALID_TRANSITIONS = {
  draft: ['published'],
  published: ['closed', 'completed'],
  closed: ['completed'],
  completed: [],
};

const EligibilityCriteriaSchema = new mongoose.Schema(
  {
    minCgpa: { type: Number, min: 0, max: 10, default: 0 },
    maxActiveBacklogs: { type: Number, min: 0, default: 0 },
    eligibleBranches: [{ type: String, trim: true }], // empty = all branches
    eligibleGraduationYears: [{ type: Number }], // empty = all years
    requiredProfileFields: [{ type: String }], // e.g. ['phone','resumeUrl']
    additionalNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const OpportunitySchema = new mongoose.Schema(
  {
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Company info
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 200,
    },
    companyLogoUrl: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },

    // Role info
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 10000,
    },
    opportunityType: {
      type: String,
      enum: OPPORTUNITY_TYPES,
      default: 'full_time',
      required: true,
    },
    workMode: {
      type: String,
      enum: WORK_MODES,
      default: 'on_site',
      required: true,
    },
    location: { type: String, trim: true, maxlength: 300 },

    // Compensation
    ctcOrStipend: { type: String, trim: true },
    stipendMin: { type: Number, min: 0 },
    stipendMax: { type: Number, min: 0 },
    stipendCurrency: { type: String, default: 'INR', maxlength: 10 },
    ctcMin: { type: Number, min: 0 },
    ctcMax: { type: Number, min: 0 },
    ctcCurrency: { type: String, default: 'INR', maxlength: 10 },

    // Application
    applicationDeadline: { type: Date },
    applicationMode: {
      type: String,
      enum: APPLICATION_MODES,
      default: 'internal',
      required: true,
    },
    externalApplicationUrl: { type: String, trim: true },

    // Eligibility criteria
    eligibilityCriteria: {
      type: EligibilityCriteriaSchema,
      default: () => ({}),
    },

    // Status
    status: {
      type: String,
      enum: OPPORTUNITY_STATUSES,
      default: 'draft',
    },

    // When published/closed/completed
    publishedAt: { type: Date },
    closedAt: { type: Date },
    completedAt: { type: Date },

    // Metadata for extensibility (hackathons, competitions, etc.)
    opportunityCategory: {
      type: String,
      default: 'placement', // 'placement' | 'competition' | 'hackathon'
    },

    // Slug for SEO-friendly URLs
    slug: { type: String, trim: true },

    // Pinned / featured
    isPinned: { type: Boolean, default: false },

    // Results publication tracking
    resultsPublished: { type: Boolean, default: false },
    resultsPublishedAt: { type: Date },
    resultsPublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    selectedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual getters for frontend compatibility
OpportunitySchema.virtual('type').get(function () {
  return this.opportunityType;
});
OpportunitySchema.virtual('deadline').get(function () {
  return this.applicationDeadline;
});
OpportunitySchema.virtual('externalUrl').get(function () {
  return this.externalApplicationUrl;
});
OpportunitySchema.virtual('minCgpa').get(function () {
  return this.eligibilityCriteria?.minCgpa ?? 0;
});
OpportunitySchema.virtual('maxBacklogs').get(function () {
  return this.eligibilityCriteria?.maxActiveBacklogs ?? 0;
});
OpportunitySchema.virtual('eligibleBranches').get(function () {
  return this.eligibilityCriteria?.eligibleBranches ?? [];
});
OpportunitySchema.virtual('eligibleGraduationYears').get(function () {
  return this.eligibilityCriteria?.eligibleGraduationYears ?? [];
});

OpportunitySchema.index({ college: 1, status: 1 });
OpportunitySchema.index({ college: 1, applicationDeadline: 1 });
OpportunitySchema.index({ college: 1, 'eligibilityCriteria.eligibleBranches': 1 });
OpportunitySchema.index({ college: 1, 'eligibilityCriteria.eligibleGraduationYears': 1 });
OpportunitySchema.index({ college: 1, companyName: 'text', title: 'text' });

/**
 * Check if a status transition is valid.
 */
OpportunitySchema.methods.canTransitionTo = function (newStatus) {
  return VALID_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
};

const Opportunity = mongoose.model('Opportunity', OpportunitySchema);
module.exports = Opportunity;
module.exports.OPPORTUNITY_TYPES = OPPORTUNITY_TYPES;
module.exports.WORK_MODES = WORK_MODES;
module.exports.OPPORTUNITY_STATUSES = OPPORTUNITY_STATUSES;
module.exports.APPLICATION_MODES = APPLICATION_MODES;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
