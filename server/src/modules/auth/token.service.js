const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../../config/env');
const { prisma } = require('../../config/prisma');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn },
  );
}

function parseDurationToMs(str) {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const factor = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return value * factor;
}

async function issueRefreshToken(userId, req) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwt.refreshExpiresIn));
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
      userAgent: req?.headers?.['user-agent'] || null,
      ipAddress: req?.ip || null,
    },
  });
  return token;
}

async function rotateRefreshToken(oldToken, req) {
  const existing = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    return null;
  }
  await prisma.refreshToken.update({ where: { token: oldToken }, data: { revoked: true } });
  const newToken = await issueRefreshToken(existing.userId, req);
  return { userId: existing.userId, token: newToken };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
}

async function revokeAllForUser(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
}

module.exports = {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
