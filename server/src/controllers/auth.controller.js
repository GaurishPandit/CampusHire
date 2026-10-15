'use strict';

const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
  setTokenCookies,
  clearTokenCookies,
  REFRESH_COOKIE,
} = require('../utils/jwt');
const { hashToken, generateToken, getClientIp } = require('../utils/helpers');
const { success, unauthorized } = require('../utils/apiResponse');
const { audit } = require('../services/audit.service');
const { sendPasswordResetEmail } = require('../services/email.service');
const env = require('../config/env');

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash').lean({ virtuals: false });
    if (!user || !user.passwordHash) {
      await audit({
        action: 'user.login_failed',
        description: `Failed login attempt for email: ${email}`,
        req,
        severity: 'warning',
      });
      return next(createError('Invalid email or password', 401));
    }

    // Compare password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await audit({
        action: 'user.login_failed',
        description: `Failed login attempt for email: ${email}`,
        req,
        severity: 'warning',
      });
      return next(createError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      return next(createError('Your account is not active. Please activate it via the invitation link or contact the placement cell.', 403));
    }

    const payload = buildTokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Update last login
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      lastLoginIp: getClientIp(req),
    });

    setTokenCookies(res, accessToken, refreshToken);

    await audit({
      action: 'user.login',
      actor: user,
      description: `User logged in: ${user.email}`,
      req,
    });

    let profile = null;
    if (user.role === 'student') {
      const StudentProfile = require('../models/StudentProfile');
      profile = await StudentProfile.findOne({ user: user._id }).lean();
    }

    return success(res, {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        college: user.college,
        firstName: user.firstName,
        lastName: user.lastName,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        isActive: user.isActive,
        activatedAt: user.activatedAt,
      },
      profile,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res, next) {
  try {
    clearTokenCookies(res);
    if (req.user) {
      await audit({
        action: 'user.logout',
        actor: req.user,
        description: `User logged out: ${req.user.email}`,
        req,
      });
    }
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Reads refresh token from HTTP-only cookie and issues new access token.
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return next(createError('No refresh token', 401));
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      clearTokenCookies(res);
      return next(createError('Invalid or expired session. Please log in again.', 401));
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive || user.tokenVersion !== payload.ver) {
      clearTokenCookies(res);
      return next(createError('Session expired. Please log in again.', 401));
    }

    const newPayload = buildTokenPayload(user);
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    setTokenCookies(res, newAccessToken, newRefreshToken);
    return success(res, { user: { id: user._id, email: user.email, role: user.role, college: user.college } }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/activate
 * Student activates account using invitation token.
 */
async function activateAccount(req, res, next) {
  try {
    const { token, password } = req.body;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationTokenExpires: { $gt: new Date() },
    }).select('+invitationToken +invitationTokenExpires');

    if (!user) {
      return next(createError('Invitation link is invalid or has expired. Please contact the placement cell.', 400));
    }

    user.passwordHash = await User.hashPassword(password);
    user.invitationToken = undefined;
    user.invitationTokenExpires = undefined;
    user.isActive = true;
    user.isEmailVerified = true;
    user.activatedAt = new Date();
    await user.save();

    await audit({
      action: 'user.account_activated',
      actor: user,
      description: `Account activated for: ${user.email}`,
      req,
    });

    return success(res, null, 'Account activated successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    // Always return 200 to prevent user enumeration
    const user = await User.findOne({ email });
    if (user && user.isActive) {
      const rawToken = generateToken(32);
      user.passwordResetToken = hashToken(rawToken);
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail({
        to: user.email,
        name: user.firstName,
        resetUrl,
      }).catch((err) => {
        require('../utils/logger').warn('Failed to send password reset email', err);
      });
    }
    return success(res, null, 'If an account with that email exists, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return next(createError('Password reset link is invalid or has expired.', 400));
    }

    user.passwordHash = await User.hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion += 1; // Invalidate all existing sessions
    await user.save();

    clearTokenCookies(res);

    await audit({
      action: 'user.password_changed',
      actor: user,
      description: `Password reset for: ${user.email}`,
      req,
    });

    return success(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user.
 */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return next(createError('User not found', 404));
    let profile = null;
    if (user.role === 'student') {
      const StudentProfile = require('../models/StudentProfile');
      profile = await StudentProfile.findOne({ user: user._id }).lean();
    }
    return success(res, {
      user: {
        ...user,
        id: user._id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      },
      profile,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, refresh, activateAccount, forgotPassword, resetPassword, me };
