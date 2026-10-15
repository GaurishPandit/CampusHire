'use strict';

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const StudentProfile = require('../models/StudentProfile');
const SelectionResult = require('../models/SelectionResult');
const { success, paginated } = require('../utils/apiResponse');
const { parsePagination, buildPaginationMeta } = require('../utils/helpers');
const { createError } = require('../middleware/errorHandler');

/**
 * GET /api/v1/audit-logs
 * Admin: paginated audit logs for their college.
 */
async function listAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const { skip } = parsePagination({ page, limit });

    const collegeFilter = req.user.college ? { college: req.user.college } : {};
    const filter = { ...collegeFilter };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actorId) filter.actor = req.query.actorId;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'email role firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return paginated(res, logs, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/stats
 * Admin: dashboard statistics.
 */
async function getDashboardStats(req, res, next) {
  try {
    const collegeFilter = req.user.college ? { college: req.user.college } : {};

    const [
      totalStudents,
      activatedStudents,
      publishedOpportunities,
      totalOpportunities,
      totalApplications,
      selectedApplications,
      ongoingOpportunities,
      publishedResults,
    ] = await Promise.all([
      StudentProfile.countDocuments(collegeFilter),
      User.countDocuments({ ...collegeFilter, role: 'student', isActive: true }),
      Opportunity.countDocuments({ ...collegeFilter, status: 'published' }),
      Opportunity.countDocuments(collegeFilter),
      Application.countDocuments(collegeFilter),
      Application.countDocuments({ ...collegeFilter, status: 'selected' }),
      Opportunity.countDocuments({ ...collegeFilter, status: { $in: ['published', 'closed'] } }),
      SelectionResult.countDocuments({ ...collegeFilter, isPublished: true }),
    ]);

    // Upcoming deadlines in next 7 days
    const upcomingDeadlines = await Opportunity.find({
      ...collegeFilter,
      status: 'published',
      applicationDeadline: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
      .select('companyName title applicationDeadline')
      .sort({ applicationDeadline: 1 })
      .limit(5)
      .lean();

    // Recent activity
    const recentActivity = await AuditLog.find(collegeFilter)
      .populate('actor', 'email role firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return success(res, {
      totalStudents,
      activatedStudents,
      publishedOpportunities,
      totalOpportunities,
      totalApplications,
      selectedApplications,
      ongoingOpportunities,
      publishedResults,
      activeRounds: ongoingOpportunities,
      totalSelections: selectedApplications,
      stats: {
        totalStudents,
        activatedStudents,
        publishedOpportunities,
        totalOpportunities,
        totalApplications,
        selectedApplications,
        ongoingOpportunities,
        publishedResults,
      },
      upcomingDeadlines,
      recentActivity,
      auditLogs: recentActivity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/student/dashboard
 * Student: personalized dashboard data.
 */
async function getStudentDashboard(req, res, next) {
  try {
    const { evaluateBulk } = require('../services/eligibility.service');
    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();

    const collegeId = req.user.college;
    const now = new Date();

    const [
      myApplications,
      publishedOpportunities,
      recentResults,
    ] = await Promise.all([
      Application.find({ student: req.user._id })
        .populate('opportunity', 'companyName title status applicationDeadline')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Opportunity.find({
        college: collegeId,
        status: 'published',
      }).limit(50).lean(), // will be filtered by eligibility
      SelectionResult.find({ college: collegeId, isPublished: true })
        .select('publicSnapshot publishedAt')
        .sort({ publishedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Compute eligibility for all published opportunities
    let eligibleOpportunities = [];
    let eligibleCount = 0;
    if (profile) {
      const eligibilityMap = evaluateBulk(profile, publishedOpportunities);
      eligibleOpportunities = publishedOpportunities
        .filter((o) => {
          const e = eligibilityMap.get(o._id.toString());
          return e?.status === 'eligible';
        })
        .slice(0, 5)
        .map((o) => ({
          ...o,
          eligibility: eligibilityMap.get(o._id.toString()),
        }));
      eligibleCount = [...eligibilityMap.values()].filter((e) => e.status === 'eligible').length;
    }

    // Upcoming deadlines
    const upcomingDeadlines = publishedOpportunities
      .filter((o) => o.applicationDeadline && o.applicationDeadline > now)
      .sort((a, b) => a.applicationDeadline - b.applicationDeadline)
      .slice(0, 5);

    const myApplicationsCount = await Application.countDocuments({ student: req.user._id });

    return success(res, {
      profile: profile ? {
        completenessScore: profile.completenessScore,
        cgpa: profile.cgpa,
        branch: profile.branch,
        graduationYear: profile.graduationYear,
      } : null,
      eligibleCount,
      eligibleOpportunitiesCount: eligibleCount,
      totalApplications: myApplicationsCount,
      myApplicationsCount,
      activeRounds: 0,
      profileCompletionPercentage: profile?.completenessScore || 70,
      stats: {
        myApplicationsCount,
        eligibleOpportunitiesCount: eligibleCount,
        publishedOpportunitiesCount: publishedOpportunities.length,
      },
      recentApplications: myApplications,
      eligibleOpportunities,
      upcomingDeadlines,
      recentResults,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs, getDashboardStats, getStudentDashboard };
