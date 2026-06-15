const { prisma } = require('../../config/prisma');
const { logger } = require('../../utils/logger');

/**
 * Record an audit log entry. Never throws (logging failures must not break flows).
 * @param {object} params
 * @param {string|null} params.userId
 * @param {string} params.action - AuditAction enum value
 * @param {string} params.entity
 * @param {string} [params.entityId]
 * @param {object} [params.metadata]
 * @param {object} [params.req] - express request (for ip/userAgent)
 */
async function recordAudit({ userId = null, action, entity, entityId = null, metadata = null, req = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        metadata: metadata || undefined,
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    logger.warn('Gagal mencatat audit log', err.message);
  }
}

module.exports = { recordAudit };
