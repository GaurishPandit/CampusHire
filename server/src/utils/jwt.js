'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ACCESS_COOKIE = 'ch_access';
const REFRESH_COOKIE = 'ch_refresh';

/**
 * Sign an access token (short-lived).
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Sign a refresh token (long-lived).
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify an access token.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Verify a refresh token.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/**
 * Build a token payload from a user document.
 */
function buildTokenPayload(user) {
  return {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    college: user.college?.toString() || null,
    ver: user.tokenVersion,
  };
}

/**
 * Set both tokens in HTTP-only cookies.
 */
function setTokenCookies(res, accessToken, refreshToken) {
  const baseOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
  if (env.COOKIE_DOMAIN) {
    baseOptions.domain = env.COOKIE_DOMAIN;
  }

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions,
    path: '/api/v1/auth/refresh', // only sent to refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clear auth cookies.
 */
function clearTokenCookies(res) {
  const baseOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
  if (env.COOKIE_DOMAIN) baseOptions.domain = env.COOKIE_DOMAIN;

  res.clearCookie(ACCESS_COOKIE, baseOptions);
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions, path: '/api/v1/auth/refresh' });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  buildTokenPayload,
  setTokenCookies,
  clearTokenCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
