'use strict';

const { verifyAccessToken, ACCESS_COOKIE } = require('../utils/jwt');
const User = require('../models/User');
const { createError } = require('./errorHandler');

/**
 * authenticate — verifies JWT from HTTP-only cookie.
 * Attaches req.user and req.college to the request.
 */
async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.[ACCESS_COOKIE];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (!token) {
      return next(createError('Authentication required', 401));
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(createError('Invalid or expired session. Please log in again.', 401));
    }

    // Fetch user from DB to check: active, tokenVersion, etc.
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return next(createError('User account not found', 401));
    }
    if (!user.isActive) {
      return next(createError('Account is deactivated. Contact your placement cell.', 403));
    }
    // Token version check — invalidated on forced logout or password change
    if (user.tokenVersion !== payload.ver) {
      return next(createError('Session invalidated. Please log in again.', 401));
    }

    req.user = user;
    req.collegeId = user.college?.toString() || null;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole — must be used after authenticate.
 * Accepts one or more roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

/**
 * requireCollegeMatch — ensures the resource belongs to the authenticated user's college.
 * Call after authenticate. Compares req.collegeId against a collegeId parameter.
 */
function requireCollegeMatch(getCollegeId) {
  return (req, res, next) => {
    if (!req.user) return next(createError('Authentication required', 401));
    if (req.user.role === 'sys_admin') return next(); // sys_admin bypasses

    const resourceCollegeId = typeof getCollegeId === 'function'
      ? getCollegeId(req)
      : req.params[getCollegeId];

    if (!resourceCollegeId || resourceCollegeId.toString() !== req.collegeId) {
      return next(createError('Forbidden', 403));
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireCollegeMatch };
