'use strict';

const mongoose = require('mongoose');

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

const ROUND_STATUSES = ['upcoming', 'scheduled', 'active', 'completed', 'cancelled'];

const RecruitmentRoundSchema = new mongoose.Schema(
  {
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
    name: {
      type: String,
      required: [true, 'Round name is required'],
      trim: true,
      maxlength: 200,
    },
    roundType: {
      type: String,
      enum: ROUND_TYPES,
      required: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    scheduledDate: { type: Date },
    scheduledVenue: { type: String, trim: true, maxlength: 300 },
    durationMinutes: { type: Number, min: 1 },

    status: {
      type: String,
      enum: ROUND_STATUSES,
      default: 'upcoming',
    },
    completedAt: { type: Date },

    // Visibility to students
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },

    // Admin tracking
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 2000 }, // internal admin notes
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

RecruitmentRoundSchema.virtual('sequence').get(function () {
  return this.sequenceNumber;
});

RecruitmentRoundSchema.virtual('type').get(function () {
  return this.roundType;
});

RecruitmentRoundSchema.index(
  { opportunity: 1, sequenceNumber: 1 },
  { unique: true }
);
RecruitmentRoundSchema.index({ opportunity: 1, status: 1 });

module.exports = mongoose.model('RecruitmentRound', RecruitmentRoundSchema);
module.exports.ROUND_TYPES = ROUND_TYPES;
module.exports.ROUND_STATUSES = ROUND_STATUSES;
