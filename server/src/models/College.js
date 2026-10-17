'use strict';

const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    },
    // Allowed email domains for this college, e.g. ['college.edu.in']
    emailDomains: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one email domain is required',
      },
    },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    // Contact email for placement cell
    placementCellEmail: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
  }
);

CollegeSchema.index({ emailDomains: 1 });

module.exports = mongoose.model('College', CollegeSchema);
