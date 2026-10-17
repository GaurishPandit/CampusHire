'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../../middleware/auth');
const { csvLimiter } = require('../../middleware/rateLimiter');
const studentController = require('../../controllers/student.controller');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const isCsvName = file.originalname && file.originalname.toLowerCase().endsWith('.csv');
    const isCsvMime =
      !file.mimetype ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/x-csv' ||
      file.mimetype === 'text/x-csv' ||
      file.mimetype === 'text/comma-separated-values' ||
      file.mimetype === 'application/octet-stream';
    if (isCsvName || isCsvMime) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Student profile (self)
router.get('/me/profile', authenticate, requireRole('student'), studentController.getMyProfile);
router.patch('/me/profile', authenticate, requireRole('student'), studentController.updateMyProfile);

// Admin / Placement Coordinator: list / manage / edit students
router.get('/', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.listStudents);
router.get('/:id', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.getStudentById);
router.patch('/:id', authenticate, requireRole('placement_admin', 'sys_admin'), studentController.updateStudentByAdmin);
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
