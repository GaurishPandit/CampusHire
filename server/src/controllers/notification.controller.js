'use strict';

const Notification = require('../models/Notification');
const User = require('../models/User');
const { success } = require('../utils/apiResponse');
const { createError } = require('../middleware/errorHandler');

/**
 * GET /api/v1/notifications
 * Returns the latest 30 notifications for the logged-in user.
 */
async function listNotifications(req, res, next) {
  try {
    let count = await Notification.countDocuments({ recipient: req.user._id });
    if (count === 0) {
      await seedInitialNotifications(req.user);
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return success(res, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function seedInitialNotifications(user) {
  try {
    const Opportunity = require('../models/Opportunity');
    const Application = require('../models/Application');
    const SelectionResult = require('../models/SelectionResult');

    const docs = [];
    if (user.role === 'student') {
      const recentOpps = await Opportunity.find({
        college: user.college,
        status: { $in: ['published', 'completed'] },
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();

      for (const opp of recentOpps) {
        const isComp = opp.opportunityType === 'hackathon' || opp.opportunityType === 'coding_competition' || opp.type === 'hackathon' || opp.type === 'coding_competition';
        const isHack = opp.opportunityType === 'hackathon' || opp.type === 'hackathon';
        const compLabel = isHack ? 'Hackathon' : 'Coding Competition';

        docs.push({
          recipient: user._id,
          college: user.college,
          type: 'opportunity_published',
          title: isComp ? `${compLabel} Open: ${opp.title}` : `Drive Open: ${opp.companyName}`,
          message: isComp
            ? `${opp.companyName || 'Host'} announced ${opp.title}. Register now to showcase your skills and win rewards!`
            : `${opp.companyName} is hiring for ${opp.title}. Check eligibility and application deadline.`,
          link: `/opportunities/${opp._id}`,
          resourceType: 'Opportunity',
          resourceId: opp._id,
          isRead: false,
          createdAt: opp.createdAt || new Date(),
        });
      }

      const apps = await Application.find({ student: user._id })
        .populate('opportunity', 'companyName title opportunityType type')
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();

      for (const app of apps) {
        const opp = app.opportunity;
        const isComp = opp && (opp.opportunityType === 'hackathon' || opp.opportunityType === 'coding_competition' || opp.type === 'hackathon' || opp.type === 'coding_competition');
        const isHack = opp && (opp.opportunityType === 'hackathon' || opp.type === 'hackathon');
        const compLabel = isHack ? 'Hackathon' : 'Competition';
        const statusText = app.status.replace('_', ' ');

        docs.push({
          recipient: user._id,
          college: user.college,
          type: 'application_status',
          title: isComp ? `${compLabel}: ${opp?.title || 'Contest'}` : `Application: ${opp?.companyName || 'Campus Drive'}`,
          message: isComp
            ? `Your participation in ${opp?.title || 'the competition'} is currently: ${statusText === 'submitted' ? 'Registered' : statusText}.`
            : `Your application status is currently: ${statusText}.`,
          link: '/applications',
          resourceType: 'Application',
          resourceId: app._id,
          isRead: false,
          createdAt: app.updatedAt || new Date(),
        });
      }

      const resultExists = await SelectionResult.exists({ college: user.college, isPublished: true });
      if (resultExists) {
        docs.push({
          recipient: user._id,
          college: user.college,
          type: 'result_published',
          title: 'Campus Results & Winners',
          message: 'Official results and rankings have been published by the campus coordinators.',
          link: '/results',
          isRead: false,
        });
      }

      docs.push({
        recipient: user._id,
        college: user.college,
        type: 'profile_verified',
        title: 'Academic Profile Active',
        message: 'Your official student profile and enrollment details are registered for campus placements.',
        link: '/profile',
        isRead: false,
      });
    } else {
      const [oppCount, appCount] = await Promise.all([
        Opportunity.countDocuments({ college: user.college }),
        Application.countDocuments({ college: user.college }),
      ]);

      docs.push({
        recipient: user._id,
        college: user.college,
        type: 'general',
        title: 'Recruitment & Competition Engine',
        message: `CampusHire engine is active with ${oppCount} drives / competitions and ${appCount} submissions tracked.`,
        link: '/admin',
        isRead: false,
      });

      if (oppCount > 0) {
        docs.push({
          recipient: user._id,
          college: user.college,
          type: 'general',
          title: 'Drives, Contests & Shortlists',
          message: 'Review submissions, manage rounds & hackathon phases, and announce results.',
          link: '/admin/opportunities',
          isRead: false,
        });
      }

      docs.push({
        recipient: user._id,
        college: user.college,
        type: 'general',
        title: 'Candidate Roster Management',
        message: 'Manage student records, CSV imports, and verify academic criteria.',
        link: '/admin/students',
        isRead: false,
      });
    }

    if (docs.length > 0) {
      await Notification.insertMany(docs, { ordered: false });
    }
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('seedInitialNotifications failed:', err.message);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
async function markRead(req, res, next) {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notif) return next(createError('Notification not found', 404));
    return success(res, { notification: notif }, 'Marked as read');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all unread notifications as read.
 */
async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}

/**
 * Utility – called internally by other controllers to push a notification.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.recipientId
 * @param {string} [opts.collegeId]
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.link]
 * @param {string} [opts.resourceType]
 * @param {string|ObjectId} [opts.resourceId]
 */
async function pushNotification(opts) {
  try {
    await Notification.create({
      recipient: opts.recipientId,
      college: opts.collegeId,
      type: opts.type || 'general',
      title: opts.title,
      message: opts.message,
      link: opts.link,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
    });
  } catch (err) {
    // Non-fatal – log and continue
    const logger = require('../utils/logger');
    logger.warn('pushNotification failed:', err.message);
  }
}

/**
 * Push a notification to all student users in a college.
 */
async function pushToCollegeStudents(opts) {
  try {
    const students = await User.find({
      college: opts.collegeId,
      role: 'student',
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!students.length) return;

    const docs = students.map((s) => ({
      recipient: s._id,
      college: opts.collegeId,
      type: opts.type || 'general',
      title: opts.title,
      message: opts.message,
      link: opts.link,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
    }));

    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('pushToCollegeStudents failed:', err.message);
  }
}

/**
 * Push a notification to all placement_admin / sys_admin users in a college.
 */
async function pushToCollegeAdmins(opts) {
  try {
    const admins = await User.find({
      college: opts.collegeId,
      role: { $in: ['placement_admin', 'sys_admin'] },
      isActive: true,
    })
      .select('_id')
      .lean();

    if (!admins.length) return;

    const docs = admins.map((a) => ({
      recipient: a._id,
      college: opts.collegeId,
      type: opts.type || 'general',
      title: opts.title,
      message: opts.message,
      link: opts.link,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
    }));

    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('pushToCollegeAdmins failed:', err.message);
  }
}

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
  pushNotification,
  pushToCollegeStudents,
  pushToCollegeAdmins,
};
