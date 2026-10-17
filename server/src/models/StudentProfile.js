'use strict';

const mongoose = require('mongoose');

const StudentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 1:1 with User
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },

    // ── Verified Academic Fields (set by admin / CSV import) ──────────────────
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      uppercase: true,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
      min: 2000,
      max: 2100,
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    activeBacklogs: {
      type: Number,
      default: 0,
      min: 0,
    },
    tenthPercentage: { type: Number, min: 0, max: 100 },
    twelfthPercentage: { type: Number, min: 0, max: 100 },

    // Academic verification metadata
    academicDataVerified: { type: Boolean, default: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    importBatchId: { type: String }, // tracks which CSV import this came from

    // ── Student-editable Fields ───────────────────────────────────────────────
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number'],
    },
    skills: [{ type: String, trim: true, maxlength: 100 }],
    interests: [{ type: String, trim: true, maxlength: 100 }],
    linkedinUrl: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },

    // Resume — stored as a URL (private cloud storage)
    resumeUrl: { type: String },
    resumeUploadedAt: { type: Date },

    // Profile completeness (computed and cached)
    completenessScore: { type: Number, default: 0, min: 0, max: 100 },

    // Placement status (admin-managed)
    isPlaced: { type: Boolean, default: false },
    placedAt: { type: Date },
    placedCompany: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Unique roll number within a college
StudentProfileSchema.index({ college: 1, rollNumber: 1 }, { unique: true });
StudentProfileSchema.index({ college: 1, branch: 1 });
StudentProfileSchema.index({ college: 1, graduationYear: 1 });
StudentProfileSchema.index({ college: 1, cgpa: 1 });

StudentProfileSchema.methods.computeCompleteness = function () {
  const fields = [
    this.phone,
    this.skills && this.skills.length > 0,
    this.resumeUrl,
    this.linkedinUrl,
    this.bio,
    this.interests && this.interests.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

StudentProfileSchema.virtual('phoneNumber').get(function () {
  return this.phone;
});

StudentProfileSchema.virtual('isAcademicVerified').get(function () {
  return this.academicDataVerified;
});

StudentProfileSchema.virtual('name').get(function () {
  if (this.user && typeof this.user === 'object') {
    return [this.user.firstName, this.user.lastName].filter(Boolean).join(' ');
  }
  return '';
});

module.exports = mongoose.model('StudentProfile', StudentProfileSchema);
