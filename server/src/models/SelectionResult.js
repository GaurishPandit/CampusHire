'use strict';

const mongoose = require('mongoose');

/**
 * SelectionResult — published final placement results.
 *
 * This is a SEPARATE document from Application.
 * An admin explicitly creates and publishes a result.
 * Publishing exposes only approved fields to all college students.
 */
const SelectionResultSchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },

    // Snapshot of approved public fields at publication time
    // (prevents later profile edits from affecting published data)
    publicSnapshot: {
      studentName: { type: String, required: true },
      branch: { type: String, required: true },
      graduationYear: { type: Number, required: true },
      rollNumber: { type: String },
      companyName: { type: String, required: true },
      opportunityTitle: { type: String, required: true },
      opportunityType: { type: String },
      offeredCTC: { type: Number }, // optional
      offeredCTCCurrency: { type: String, default: 'INR' },
    },

    // Publication state
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Unpublish support
    unpublishedAt: { type: Date },
    unpublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Internal notes
    notes: { type: String, trim: true, maxlength: 1000, select: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SelectionResultSchema.virtual('candidateName').get(function () {
  return this.publicSnapshot?.studentName;
});
SelectionResultSchema.virtual('studentName').get(function () {
  return this.publicSnapshot?.studentName;
});
SelectionResultSchema.virtual('branch').get(function () {
  return this.publicSnapshot?.branch;
});
SelectionResultSchema.virtual('graduationYear').get(function () {
  return this.publicSnapshot?.graduationYear;
});
SelectionResultSchema.virtual('companyName').get(function () {
  return this.publicSnapshot?.companyName;
});
SelectionResultSchema.virtual('opportunityTitle').get(function () {
  return this.publicSnapshot?.opportunityTitle;
});

// Unique result per opportunity + student (one published result per student per drive)
SelectionResultSchema.index({ opportunity: 1, student: 1 }, { unique: true });
SelectionResultSchema.index({ college: 1, isPublished: 1 });
SelectionResultSchema.index({ college: 1, publishedAt: -1 });

module.exports = mongoose.model('SelectionResult', SelectionResultSchema);
