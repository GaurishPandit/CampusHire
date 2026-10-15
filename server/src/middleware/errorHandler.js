'use strict';

/**
 * Central error handler middleware.
 * Must be the last middleware registered in app.js.
 */

const logger = require('../utils/logger');

// Known safe error messages for specific error types
const MONGOOSE_DUPLICATE_CODE = 11000;

function errorHandler(err, req, res, _next) {
  // Log the full error internally
  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Mongoose duplicate key
  if (err.code === MONGOOSE_DUPLICATE_CODE) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field: ${err.path}`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large' });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Generic 500 — never leak internals to client
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
  });
}

/**
 * 404 handler for unmatched routes.
 */
function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Application error factory.
 */
function createError(message, statusCode = 500, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

module.exports = { errorHandler, notFound, createError };
