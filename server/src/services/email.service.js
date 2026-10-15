'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    // Fall back to Ethereal (dev only — messages appear in ethereal.email)
    logger.warn('SMTP not configured. Using Ethereal test account for dev.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Send an email. In development (no SMTP), logs the email content.
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    logger.debug(`[DEV EMAIL BODY]: ${text || html}`);
    return { messageId: 'dev-mode', to };
  }

  try {
    const info = await t.sendMail({
      from: `"CampusHire" <${env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
}

/**
 * Send invitation email to a newly imported student.
 */
async function sendInvitationEmail({ to, name, activationUrl, expiresInHours }) {
  return sendEmail({
    to,
    subject: 'Activate your CampusHire account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Welcome to CampusHire, ${name || 'Student'}!</h2>
        <p>Your placement cell has registered you on CampusHire — the campus placement and opportunities platform.</p>
        <p>Click the button below to activate your account and set your password.</p>
        <p>
          <a href="${activationUrl}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          ">Activate Account</a>
        </p>
        <p style="color: #666; font-size: 13px;">
          This link expires in ${expiresInHours} hours. If you did not expect this email, please ignore it.
        </p>
        <p style="color: #666; font-size: 13px;">
          Or copy this link into your browser:<br/>${activationUrl}
        </p>
      </div>
    `,
    text: `Welcome to CampusHire!\n\nActivate your account: ${activationUrl}\n\nThis link expires in ${expiresInHours} hours.`,
  });
}

/**
 * Send password reset email.
 */
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset your CampusHire password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name || ''},</p>
        <p>We received a request to reset your CampusHire password.</p>
        <p>
          <a href="${resetUrl}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #dc2626;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          ">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 13px;">
          This link expires in 1 hour. If you did not request this, please ignore it.
        </p>
      </div>
    `,
    text: `Reset your CampusHire password: ${resetUrl}\n\nExpires in 1 hour.`,
  });
}

module.exports = { sendEmail, sendInvitationEmail, sendPasswordResetEmail };
