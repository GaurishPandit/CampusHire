'use strict';

const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  // Auth
  'user.login',
  'user.logout',
  'user.login_failed',
  'user.password_changed',
  'user.invitation_sent',
  'user.account_activated',
  'user.forced_logout',

  // User management
  'user.created',
  'user.updated',
  'user.deactivated',
  'user.reactivated',
  'user.role_changed',

  // Student profile
  'student.imported',
  'student.profile_updated',
  'student.academic_data_verified',

  // Opportunities
  'opportunity.created',
  'opportunity.updated',
  'opportunity.status_changed',
  'opportunity.deleted',

  // Recruitment rounds
  'round.created',
  'round.updated',
  'round.status_changed',
  'round.published',

  // Applications
  'application.submitted',
  'application.withdrawn',
  'application.status_changed',
  'application.round_result_updated',

  // Results
  'result.created',
  'result.published',
  'result.unpublished',
  'result.updated',

  // College / system
  'college.created',
  'college.updated',
  'system.seed',
];

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // may be null for system actions
    },
    actorRole: { type: String },
    actorEmail: { type: String }, // denormalized for read performance

    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
    },

    // Target resource
    resourceType: { type: String, trim: true }, // e.g. 'Application', 'Opportunity'
    resourceId: { type: mongoose.Schema.Types.ObjectId },

    // Human-readable summary
    description: { type: String, required: true, trim: true, maxlength: 1000 },

    // Diff of changed fields (before/after)
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },

    // Request metadata
    ip: { type: String },
    userAgent: { type: String, select: false },

    // Severity
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AuditLogSchema.virtual('entityType').get(function () {
  return this.resourceType;
});
AuditLogSchema.virtual('performedBy').get(function () {
  return { email: this.actorEmail, role: this.actorRole };
});
AuditLogSchema.virtual('details').get(function () {
  return this.after || this.before || this.description;
});

// Immutable — prevent any updates
AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('AuditLog documents are immutable'));
  }
  next();
});

AuditLogSchema.index({ college: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
