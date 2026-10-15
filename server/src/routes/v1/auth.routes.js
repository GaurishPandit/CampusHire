'use strict';

const express = require('express');
const router = express.Router();
const { authLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const authController = require('../../controllers/auth.controller');
const {
  loginSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../validators/auth.validators');

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/activate', validate(activateAccountSchema), authController.activateAccount);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
