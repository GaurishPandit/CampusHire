'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General rate limiter applied to all /api routes.
 */
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for auth endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

/**
 * CSV upload rate limiter — prevent abuse of the import endpoint.
 */
const csvLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many import requests. Please try again in an hour.' },
});

module.exports = { generalLimiter, authLimiter, csvLimiter };
