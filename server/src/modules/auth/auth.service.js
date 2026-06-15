const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const tokenService = require('./token.service');
const { recordAudit } = require('../audit/audit.service');

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/** Whether bendahara self-registration is still allowed (only before first bendahara exists). */
async function isRegistrationOpen() {
  const count = await prisma.user.count({ where: { role: 'BENDAHARA' } });
  return count === 0;
}

async function register(input, req) {
  const open = await isRegistrationOpen();
  if (!open) {
    throw ApiError.forbidden(
      'Registrasi bendahara sudah dinonaktifkan. Akun bendahara hanya dapat dibuat sekali saat instalasi.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) throw ApiError.conflict('Username sudah digunakan');

  const hashed = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      password: hashed,
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      role: 'BENDAHARA',
      isActive: true,
    },
  });

  await recordAudit({ userId: user.id, action: 'CREATE', entity: 'User', entityId: user.id, metadata: { role: 'BENDAHARA', via: 'register' }, req });

  return issueSession(user, req);
}

async function login(username, password, req) {
  // Allow logging in with either username or email (treasurer may use email).
  const identifier = (username || '').trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  if (!user) throw ApiError.unauthorized('Email/username atau password salah');
  if (!user.isActive) throw ApiError.forbidden('Akun Anda tidak aktif. Hubungi bendahara.');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw ApiError.unauthorized('Email/username atau password salah');

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await recordAudit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, req });

  return issueSession(user, req);
}

async function issueSession(user, req) {
  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.issueRefreshToken(user.id, req);
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken, req) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token tidak ditemukan');
  const rotated = await tokenService.rotateRefreshToken(refreshToken, req);
  if (!rotated) throw ApiError.unauthorized('Refresh token tidak valid atau kedaluwarsa');

  const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Akun tidak aktif');

  const accessToken = tokenService.signAccessToken(user);
  return { user: sanitizeUser(user), accessToken, refreshToken: rotated.token };
}

async function logout(refreshToken, userId, req) {
  await tokenService.revokeRefreshToken(refreshToken);
  if (userId) await recordAudit({ userId, action: 'LOGOUT', entity: 'User', entityId: userId, req });
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        include: { schoolClass: true },
      },
    },
  });
  if (!user) throw ApiError.notFound('Pengguna tidak ditemukan');
  return sanitizeUser(user);
}

async function updateProfile(userId, input) {
  const data = {};
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.email !== undefined) data.email = input.email || null;
  if (input.phone !== undefined) data.phone = input.phone || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl || null;
  const user = await prisma.user.update({ where: { id: userId }, data });
  return sanitizeUser(user);
}

async function changePassword(userId, currentPassword, newPassword, req) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Pengguna tidak ditemukan');
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw ApiError.badRequest('Password lama salah');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  await tokenService.revokeAllForUser(userId);
  await recordAudit({ userId, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { field: 'password' }, req });
}

module.exports = {
  isRegistrationOpen,
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  sanitizeUser,
};
