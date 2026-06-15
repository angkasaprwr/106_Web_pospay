const { prisma } = require('../../config/prisma');
const fcm = require('../../services/fcm.service');
const { logger } = require('../../utils/logger');

/**
 * Persist an in-app notification and attempt to deliver it via FCM.
 */
async function notifyUser(userId, { title, body, type = null, data = {} }) {
  if (!userId) return null;
  const notification = await prisma.notification.create({
    data: { userId, title, body, type, data, status: 'PENDING' },
  });

  try {
    const tokens = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
    const tokenList = tokens.map((t) => t.token);
    if (tokenList.length > 0 && fcm.isEnabled()) {
      const result = await fcm.sendToTokens(tokenList, { title, body, data: { ...data, type: type || '' } });
      if (result.invalidTokens.length > 0) {
        await prisma.deviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
      }
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: result.successCount > 0 ? 'SENT' : 'FAILED', sentAt: new Date() },
      });
    } else {
      await prisma.notification.update({ where: { id: notification.id }, data: { status: 'SENT', sentAt: new Date() } });
    }
  } catch (e) {
    logger.warn('notifyUser gagal', e.message);
    await prisma.notification.update({ where: { id: notification.id }, data: { status: 'FAILED', error: e.message } }).catch(() => {});
  }

  return notification;
}

async function listForUser(userId, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, limit);
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, total, unread, page: safePage, limit: safeLimit };
}

async function markRead(userId, id) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

async function registerDeviceToken(userId, token, platform) {
  return prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform: platform || null },
    create: { userId, token, platform: platform || null },
  });
}

async function removeDeviceToken(token) {
  await prisma.deviceToken.deleteMany({ where: { token } });
}

module.exports = {
  notifyUser,
  listForUser,
  markRead,
  markAllRead,
  registerDeviceToken,
  removeDeviceToken,
};
