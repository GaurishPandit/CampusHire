'use strict';

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { getClientIp } = require('../utils/helpers');

/**
 * Record an audit log entry. Never throws — failure to audit must not break the operation.
 *
 * @param {Object} params
 * @param {string} params.action - AUDIT_ACTIONS member
 * @param {Object} [params.actor] - User document or { _id, role, email }
 * @param {string} [params.collegeId]
 * @param {string} [params.resourceType]
 * @param {string|ObjectId} [params.resourceId]
 * @param {string} params.description
 * @param {Object} [params.before]
 * @param {Object} [params.after]
 * @param {Object} [params.req] - Express request object for IP/UA
 * @param {'info'|'warning'|'critical'} [params.severity]
 */
async function audit(params) {
  try {
    const {
      action,
      actor,
      collegeId,
      resourceType,
      resourceId,
      description,
      before,
      after,
      req,
      severity = 'info',
    } = params;

    await AuditLog.create({
      action,
      actor: actor?._id || actor?.id || null,
      actorRole: actor?.role || null,
      actorEmail: actor?.email || null,
      college: collegeId || actor?.college || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      description,
      before: before || undefined,
      after: after || undefined,
      ip: req ? getClientIp(req) : undefined,
      userAgent: req?.headers?.['user-agent'] || undefined,
      severity,
    });
  } catch (err) {
    // Audit failure must not propagate
    logger.error('Failed to write audit log:', err);
  }
}

module.exports = { audit };
