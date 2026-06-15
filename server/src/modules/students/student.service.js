const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { env } = require('../../config/env');
const { studentRepository } = require('./student.repository');
const { recordAudit } = require('../audit/audit.service');

function cleanData(input) {
  const data = { ...input };
  delete data.createAccount;
  delete data.password;
  ['nisn', 'classId'].forEach((k) => {
    if (data[k] === '') data[k] = null;
  });
  return data;
}

async function list(query) {
  return studentRepository.list(query);
}

async function getById(id) {
  const student = await studentRepository.detail(id);
  if (!student) throw ApiError.notFound('Siswa tidak ditemukan');
  return student;
}

async function create(input, actorId, req) {
  const existing = await studentRepository.findByNis(input.nis);
  if (existing) throw ApiError.conflict('NIS sudah terdaftar');

  const result = await prisma.$transaction(async (tx) => {
    let userId = null;
    if (input.createAccount !== false) {
      const usernameExists = await tx.user.findUnique({ where: { username: input.nis } });
      if (usernameExists) throw ApiError.conflict('Username (NIS) sudah digunakan akun lain');
      const rawPassword = input.password || env.studentDefaultPassword;
      const hashed = await bcrypt.hash(rawPassword, 10);
      const user = await tx.user.create({
        data: {
          username: input.nis,
          password: hashed,
          fullName: input.fullName,
          phone: input.phone || null,
          role: 'SISWA',
          isActive: true,
        },
      });
      userId = user.id;
    }

    return tx.student.create({
      data: { ...cleanData(input), userId, enrolledAt: input.enrolledAt || new Date() },
      include: { schoolClass: true, user: { select: { id: true, username: true } } },
    });
  });

  await recordAudit({ userId: actorId, action: 'CREATE', entity: 'Student', entityId: result.id, req });
  return result;
}

async function update(id, input, actorId, req) {
  await getById(id);
  const data = cleanData(input);
  const student = await prisma.student.update({
    where: { id },
    data,
    include: { schoolClass: true, user: { select: { id: true, username: true } } },
  });
  // keep linked user's name in sync
  if (student.userId && (input.fullName || input.phone)) {
    await prisma.user.update({
      where: { id: student.userId },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      },
    });
  }
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'Student', entityId: id, req });
  return student;
}

async function remove(id, actorId, req) {
  await getById(id);
  await prisma.student.delete({ where: { id } });
  await recordAudit({ userId: actorId, action: 'DELETE', entity: 'Student', entityId: id, req });
}

async function resetPassword(id, newPassword, actorId, req) {
  const student = await getById(id);
  if (!student.userId) throw ApiError.badRequest('Siswa ini belum memiliki akun');
  const raw = newPassword || env.studentDefaultPassword;
  const hashed = await bcrypt.hash(raw, 10);
  await prisma.user.update({ where: { id: student.userId }, data: { password: hashed } });
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: student.userId, metadata: { field: 'password', reset: true }, req });
  return { password: raw };
}

async function toggleAccount(id, isActive, actorId, req) {
  const student = await getById(id);
  if (!student.userId) throw ApiError.badRequest('Siswa ini belum memiliki akun');
  await prisma.user.update({ where: { id: student.userId }, data: { isActive } });
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'User', entityId: student.userId, metadata: { isActive }, req });
}

module.exports = { list, getById, create, update, remove, resetPassword, toggleAccount };
