const { z } = require('zod');

const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(50),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  fullName: z.string().min(2, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().optional(),
});

const verifyRegistrationSchema = z.object({
  verificationId: z.string().min(1, 'ID verifikasi wajib diisi'),
  code: z.string().length(6, 'Kode verifikasi harus 6 digit'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

module.exports = {
  registerSchema,
  verifyRegistrationSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  updateProfileSchema,
};
