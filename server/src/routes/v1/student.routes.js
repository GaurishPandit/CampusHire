'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../../middleware/auth');
const { csvLimiter } = require('../../middleware/rateLimiter');
const studentController = require('../../controllers/student.controller');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Student profile (self)
router.get('/me/profile', authenticate, requireRole('student'), studentController.getMyProfile);
router.patch('/me/profile', authenticate, requireRole('student'), studentController.updateMyProfile);

// Admin: list / manage students
router.get('/', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.listStudents);
router.get('/:id', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.getStudentById);
router.post('/:id/resend-invite', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.resendInvite);

// CSV import (admin only)
router.post(
  '/import/preview',
  authenticate,
  requireRole('placement_admin', 'sys_admin'),
  csvLimiter,
  csvUpload.single('file'),
  studentController.previewImport
);
router.post(
  '/import/confirm',
  authenticate,
  requireRole('placement_admin', 'sys_admin'),
  studentController.confirmImport
);

module.exports = router;
