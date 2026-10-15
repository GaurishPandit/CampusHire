'use strict';

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token (hex string).
 */
function generateToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Hash a token with SHA-256 for safe storage.
 * Store the hash in the DB; send the raw token to the user.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Build pagination meta from query params.
 */
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build pagination meta for response.
 */
function buildPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Sanitize a string for use in a MongoDB text query.
 */
function sanitizeSearch(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().substring(0, 100);
}

/**
 * Get client IP from request (handles proxies).
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Sleep for N ms (useful in tests).
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  generateToken,
  hashToken,
  parsePagination,
  buildPaginationMeta,
  sanitizeSearch,
  getClientIp,
  sleep,
};
