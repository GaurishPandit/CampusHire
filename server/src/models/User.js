'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config/env');

const ROLES = ['student', 'placement_admin', 'sys_admin'];

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      select: false, // never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      // sys_admin may not belong to a college
      required: function () {
        return this.role !== 'sys_admin';
      },
    },
    firstName: { type: String, trim: true, maxlength: 100 },
    lastName: { type: String, trim: true, maxlength: 100 },

    // Account status
    isActive: { type: Boolean, default: true }, // active for all accounts
    isEmailVerified: { type: Boolean, default: false },

    // Invitation / account activation
    invitationToken: { type: String, select: false },
    invitationTokenExpires: { type: Date, select: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date },
    activatedAt: { type: Date },

    // Password reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Last login tracking
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, select: false },

    // Token versioning for forced logout
    tokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.invitationToken;
        delete ret.invitationTokenExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.lastLoginIp;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ college: 1, role: 1 });
UserSchema.index({ invitationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });

/**
 * Compare candidate password against stored hash.
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Hash a password. Call this before saving a new password.
 */
UserSchema.statics.hashPassword = async function (plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
};

UserSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
module.exports.ROLES = ROLES;
