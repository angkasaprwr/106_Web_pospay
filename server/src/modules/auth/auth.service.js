const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../../config/prisma');
const { env } = require('../../config/env');
const { ApiError } = require('../../core/ApiError');
const tokenService = require('./token.service');
const { recordAudit } = require('../audit/audit.service');
const emailService = require('../../services/email.service');

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

/** Whether bendahara self-registration is still allowed. */
async function isRegistrationOpen() {
  if (env.registrationAlwaysOpen) return true;
  const count = await prisma.user.count({ where: { role: 'BENDAHARA', emailVerified: true } });
  return count === 0;
}

async function requestRegistration(input, req) {
  const open = await isRegistrationOpen();
  if (!open) {
    throw ApiError.forbidden(
      'Registrasi bendahara sudah dinonaktifkan. Akun bendahara hanya dapat dibuat sekali saat instalasi.',
    );
  }

  if (!input.email) throw ApiError.badRequest('Email Gmail sekolah wajib diisi');
  if (!emailService.isSchoolEmail(input.email)) {
    throw ApiError.badRequest(
      `Email harus menggunakan domain sekolah (@${env.school.emailDomain}) atau Gmail resmi sekolah (${env.school.gmailAddress})`,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: input.username }, { email: input.email }] },
  });
  if (existing) throw ApiError.conflict('Username atau email sudah digunakan');

  const code = generateCode();
  const hashed = await bcrypt.hash(input.password, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.registrationVerification.deleteMany({ where: { email: input.email } });
  const pending = await prisma.registrationVerification.create({
    data: {
      email: input.email,
      code,
      fullName: input.fullName,
      username: input.username,
      password: hashed,
      expiresAt,
    },
  });

  const mailResult = await emailService.sendVerificationCode(input.email, code, input.fullName);

  return {
    verificationId: pending.id,
    email: input.email,
    message: mailResult.sent
      ? 'Kode verifikasi telah dikirim ke email Gmail sekolah Anda. Periksa kotak masuk atau folder spam.'
      : mailResult.smtpError
        ? 'Gagal mengirim email Gmail. Gunakan kode verifikasi yang ditampilkan untuk pengujian developer.'
        : 'Kode verifikasi siap. Periksa email atau gunakan kode di bawah (mode pengembangan).',
    emailSent: mailResult.sent,
    devCode: mailResult.devCode || null,
    smtpError: mailResult.smtpError || null,
  };
}

async function verifyRegistration(input, req) {
  const pending = await prisma.registrationVerification.findUnique({ where: { id: input.verificationId } });
  if (!pending || pending.usedAt) throw ApiError.badRequest('Permintaan verifikasi tidak valid');
  if (pending.expiresAt < new Date()) throw ApiError.badRequest('Kode verifikasi sudah kedaluwarsa. Silakan daftar ulang.');
  if (pending.code !== input.code) throw ApiError.badRequest('Kode verifikasi salah');

  const open = await isRegistrationOpen();
  if (!open) throw ApiError.forbidden('Registrasi bendahara sudah ditutup');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: pending.username }, { email: pending.email }] },
  });
  if (existing) throw ApiError.conflict('Username atau email sudah digunakan');

  const user = await prisma.user.create({
    data: {
      username: pending.username,
      password: pending.password,
      fullName: pending.fullName,
      email: pending.email,
      phone: null,
      role: 'BENDAHARA',
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.registrationVerification.update({
    where: { id: pending.id },
    data: { usedAt: new Date() },
  });

  await recordAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    metadata: { role: 'BENDAHARA', via: 'register-verify' },
    req,
  });

  return issueSession(user, req);
}

async function register(input, req) {
  const result = await requestRegistration(input, req);
  return { pending: true, ...result };
}

async function login(username, password, req) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw ApiError.unauthorized('Username atau password salah');
  if (!user.isActive) throw ApiError.forbidden('Akun Anda tidak aktif. Hubungi bendahara.');
  if (user.role === 'BENDAHARA' && !user.emailVerified) {
    throw ApiError.forbidden('Akun belum diverifikasi. Selesaikan verifikasi email terlebih dahulu.');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw ApiError.unauthorized('Username atau password salah');

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
        include: { schoolClass: { include: { academicYear: true } } },
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

async function requestPasswordReset(identifier, req) {
  const raw = String(identifier || '').trim();
  if (!raw) throw ApiError.badRequest('Email Gmail sekolah atau username wajib diisi');

  const user = await resolveBendaharaForPasswordReset(raw);
  const deliveryEmail = resolvePasswordResetDeliveryEmail(raw, user);

  if (!user) {
    return {
      message: 'Jika email terdaftar, tautan reset telah dikirim ke Gmail sekolah Anda.',
      emailSent: false,
    };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, email: deliveryEmail, expiresAt },
  });

  const resetUrl = `${env.frontend.bendaharaUrl}/lupa-kata-sandi/reset?token=${token}`;
  const mailResult = await emailService.sendPasswordResetLink(deliveryEmail, user.fullName, resetUrl);

  await recordAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'User',
    entityId: user.id,
    metadata: { field: 'password-reset-request', deliveryEmail, emailSent: mailResult.sent },
    req,
  });

  if (mailResult.sent) {
    return {
      message: 'Tautan reset kata sandi telah dikirim ke Gmail sekolah Anda.',
      emailSent: true,
    };
  }

  return {
    message: mailResult.smtpError
      ? 'Tautan reset dibuat, tetapi email belum terkirim karena konfigurasi Gmail SMTP. Gunakan tautan di bawah atau perbarui App Password di server/.env.'
      : 'SMTP belum dikonfigurasi. Gunakan tautan reset yang ditampilkan untuk pengujian developer.',
    emailSent: false,
    devResetUrl: mailResult.devResetUrl || resetUrl,
    smtpError: mailResult.smtpError || null,
  };
}

async function resolveBendaharaForPasswordReset(raw) {
  const normalized = raw.toLowerCase();
  const schoolGmail = env.school.gmailAddress;

  if (raw.includes('@')) {
    if (!emailService.isSchoolEmail(normalized)) {
      throw ApiError.badRequest(
        `Email harus menggunakan domain sekolah (@${env.school.emailDomain}) atau Gmail resmi sekolah (${schoolGmail})`,
      );
    }

    const byEmail = await prisma.user.findFirst({
      where: {
        role: 'BENDAHARA',
        isActive: true,
        email: { equals: normalized, mode: 'insensitive' },
      },
    });
    if (byEmail) return byEmail;

    if (normalized === schoolGmail) {
      const bySchoolDomain = await prisma.user.findFirst({
        where: {
          role: 'BENDAHARA',
          isActive: true,
          OR: [
            { email: { equals: schoolGmail, mode: 'insensitive' } },
            { email: { endsWith: `@${env.school.emailDomain}`, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
      if (bySchoolDomain) return bySchoolDomain;

      return prisma.user.findFirst({
        where: { role: 'BENDAHARA', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return null;
  }

  return prisma.user.findFirst({
    where: {
      role: 'BENDAHARA',
      isActive: true,
      OR: [
        { username: { equals: raw, mode: 'insensitive' } },
        { fullName: { contains: raw, mode: 'insensitive' } },
      ],
    },
  });
}

function resolvePasswordResetDeliveryEmail(raw, user) {
  if (!user) return null;
  const normalized = raw.toLowerCase();

  if (raw.includes('@') && emailService.isSchoolEmail(normalized)) {
    return normalized;
  }

  if (user.email && emailService.isSchoolEmail(user.email)) {
    return user.email.toLowerCase();
  }

  return env.school.gmailAddress;
}

async function validatePasswordResetToken(token) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt) return { valid: false };
  if (record.expiresAt < new Date()) return { valid: false, expired: true };
  return { valid: true, email: record.email };
}

async function resetPasswordWithToken(input, req) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
    include: { user: true },
  });

  if (!record || record.usedAt) throw ApiError.badRequest('Tautan reset tidak valid atau sudah digunakan');
  if (record.expiresAt < new Date()) throw ApiError.badRequest('Tautan reset sudah kedaluwarsa. Silakan minta tautan baru.');
  if (!record.user || record.user.role !== 'BENDAHARA') throw ApiError.forbidden('Reset hanya untuk akun bendahara');

  const hashed = await bcrypt.hash(input.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await tokenService.revokeAllForUser(record.userId);
  await recordAudit({
    userId: record.userId,
    action: 'UPDATE',
    entity: 'User',
    entityId: record.userId,
    metadata: { field: 'password-reset' },
    req,
  });

  return { message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' };
}

module.exports = {
  isRegistrationOpen,
  requestRegistration,
  verifyRegistration,
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  validatePasswordResetToken,
  resetPasswordWithToken,
  sanitizeUser,
};
