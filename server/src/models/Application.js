'use strict';

const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'rejected',
  'withdrawn',
  'selected',
];

const ROUND_OUTCOMES = ['pending', 'advanced', 'rejected', 'skipped', 'selected'];

// Valid application status transitions
const VALID_APP_TRANSITIONS = {
  submitted: ['under_review', 'shortlisted', 'selected', 'rejected', 'withdrawn'],
  under_review: ['shortlisted', 'selected', 'rejected', 'withdrawn'],
  shortlisted: ['rejected', 'selected', 'withdrawn'],
  rejected: [], // terminal
  withdrawn: [], // terminal
  selected: [], // terminal
};

const RoundResultSchema = new mongoose.Schema(
  {
    round: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentRound', required: true },
    outcome: { type: String, enum: ROUND_OUTCOMES, default: 'pending' },
    notes: { type: String, trim: true, maxlength: 1000 }, // admin internal notes
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date },
  },
  { _id: true }
);

const ApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },

    // Application mode
    applicationType: {
      type: String,
      enum: ['internal', 'external'],
      required: true,
    },

    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'submitted',
    },

    // For external applications
    externalLinkClickedAt: { type: Date },
    externalApplicationConfirmedAt: { type: Date }, // student self-reported
    externalApplicationConfirmed: { type: Boolean, default: false },

    // Eligibility snapshot at time of application
    eligibilitySnapshot: {
      status: { type: String, enum: ['eligible', 'not_eligible', 'needs_verification'] },
      reasons: [{ type: String }],
      criteriaVersion: { type: Date }, // timestamp when opportunity criteria last changed
      checkedAt: { type: Date },
    },

    // Round outcomes
    roundResults: [RoundResultSchema],

    // Withdrawal
    withdrawnAt: { type: Date },
    withdrawalReason: { type: String, trim: true, maxlength: 500 },

    // Admin notes
    adminNotes: { type: String, trim: true, maxlength: 2000, select: false },

    // Last admin who touched this application
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Unique application per student+opportunity
ApplicationSchema.index({ student: 1, opportunity: 1 }, { unique: true });
ApplicationSchema.index({ opportunity: 1, status: 1 });
ApplicationSchema.index({ college: 1, status: 1 });
ApplicationSchema.index({ student: 1, status: 1 });

/**
 * Check valid status transition.
 */
ApplicationSchema.methods.canTransitionTo = function (newStatus) {
  if (this.status === newStatus) return true;
  return VALID_APP_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
};

ApplicationSchema.virtual('appliedAt').get(function () {
  return this.createdAt;
});

ApplicationSchema.virtual('personalStatus').get(function () {
  return this.status;
});

const Application = mongoose.model('Application', ApplicationSchema);
module.exports = Application;
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
module.exports.ROUND_OUTCOMES = ROUND_OUTCOMES;
module.exports.VALID_APP_TRANSITIONS = VALID_APP_TRANSITIONS;
