const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { recordAudit } = require('../audit/audit.service');

const DEFAULT_SECURITY = {
  passwordMinLength: 6,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  requireStrongPassword: false,
  twoFactorEnabled: false,
};

async function getSchoolProfile() {
  let profile = await prisma.schoolProfile.findFirst();
  if (!profile) {
    profile = await prisma.schoolProfile.create({ data: { name: 'SMP Pusponegoro Brebes' } });
  }
  return profile;
}

async function updateSchoolProfile(data, actorId, req) {
  const current = await getSchoolProfile();
  const profile = await prisma.schoolProfile.update({ where: { id: current.id }, data });
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'SchoolProfile', entityId: String(profile.id), req });
  return profile;
}

async function getSetting(key, fallback = null) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value : fallback;
}

async function setSetting(key, value, group = null, actorId = null, req = null) {
  const row = await prisma.setting.upsert({
    where: { key },
    update: { value, group },
    create: { key, value, group },
  });
  if (actorId) await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'Setting', entityId: key, req });
  return row;
}

async function getSecuritySettings() {
  const value = await getSetting('security', null);
  return { ...DEFAULT_SECURITY, ...(value || {}) };
}

async function updateSecuritySettings(data, actorId, req) {
  const merged = { ...(await getSecuritySettings()), ...data };
  await setSetting('security', merged, 'security', actorId, req);
  return merged;
}

// ---------------- Users (treasurer accounts) ----------------
function sanitize(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

async function listUsers(query = {}) {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { username: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  return users.map(sanitize);
}

async function createUser(input, actorId, req) {
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
      role: input.role || 'BENDAHARA',
      isActive: true,
    },
  });
  await recordAudit({ userId: actorId, action: 'CREATE', entity: 'User', entityId: user.id, req });
  return sanitize(user);
}

async function updateUser(id, input, actorId, req) {
  const data = {};
  ['fullName', 'email', 'phone', 'isActive'].forEach((k) => {
    if (input[k] !== undefined) data[k] = input[k] === '' ? null : input[k];
  });
  if (input.password) data.password = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.update({ where: { id }, data });
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: id, req });
  return sanitize(user);
}

async function deleteUser(id, actorId, req) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('Pengguna tidak ditemukan');
  if (target.role === 'BENDAHARA') {
    const count = await prisma.user.count({ where: { role: 'BENDAHARA', isActive: true } });
    if (count <= 1) throw ApiError.badRequest('Tidak dapat menghapus satu-satunya akun bendahara aktif');
  }
  await prisma.user.delete({ where: { id } });
  await recordAudit({ userId: actorId, action: 'DELETE', entity: 'User', entityId: id, req });
}

module.exports = {
  getSchoolProfile,
  updateSchoolProfile,
  getSetting,
  setSetting,
  getSecuritySettings,
  updateSecuritySettings,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
