'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const appController = require('../../controllers/application.controller');
const roundController = require('../../controllers/round.controller');
const resultController = require('../../controllers/result.controller');
const dashController = require('../../controllers/dashboard.controller');

// Applications
router.get('/applications/me', authenticate, requireRole('student'), appController.getMyApplications);
router.patch('/applications/:id/status', authenticate, requireRole('placement_admin', 'sys_admin'), appController.updateApplicationStatus);
router.patch('/applications/:id/round-result', authenticate, requireRole('placement_admin', 'sys_admin'), appController.updateRoundResult);
router.post('/applications/:id/withdraw', authenticate, requireRole('student'), appController.withdrawApplication);

// Rounds (standalone — for update/delete by roundId)
router.patch('/rounds/:roundId', authenticate, requireRole('placement_admin', 'sys_admin'), roundController.updateRound);
router.patch('/rounds/:roundId/status', authenticate, requireRole('placement_admin', 'sys_admin'), roundController.changeRoundStatus);
router.delete('/rounds/:roundId', authenticate, requireRole('placement_admin', 'sys_admin'), roundController.deleteRound);

// Results (listing + publish/unpublish)
router.get('/results', authenticate, resultController.listResults);
router.post('/results/:resultId/publish', authenticate, requireRole('placement_admin', 'sys_admin'), resultController.publishResult);
router.post('/results/:resultId/unpublish', authenticate, requireRole('placement_admin', 'sys_admin'), resultController.unpublishResult);

// Dashboard endpoints (support both /admin/stats and /dashboard/admin, and /student/dashboard and /dashboard/student)
router.get('/admin/stats', authenticate, requireRole('placement_admin', 'sys_admin'), dashController.getDashboardStats);
router.get('/dashboard/admin', authenticate, requireRole('placement_admin', 'sys_admin'), dashController.getDashboardStats);

router.get('/student/dashboard', authenticate, requireRole('student'), dashController.getStudentDashboard);
router.get('/dashboard/student', authenticate, requireRole('student'), dashController.getStudentDashboard);

// Audit logs
router.get('/audit-logs', authenticate, requireRole('placement_admin', 'sys_admin'), dashController.listAuditLogs);
router.get('/admin/audit-logs', authenticate, requireRole('placement_admin', 'sys_admin'), dashController.listAuditLogs);

module.exports = router;
