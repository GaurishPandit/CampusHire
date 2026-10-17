'use strict';

const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'opportunity_published',    // new opportunity visible to student
  'application_status',       // student's application status changed
  'result_published',         // official results out for a drive
  'new_application',          // admin: student applied to a drive
  'drive_completed',          // admin: a drive is now complete
  'profile_verified',         // student profile verified by admin
  'general',
];

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'general',
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, trim: true },          // frontend route to navigate to
    isRead: { type: Boolean, default: false },
    // Optional resource references
    resourceType: { type: String },              // 'Opportunity' | 'Application' | 'SelectionResult'
    resourceId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
