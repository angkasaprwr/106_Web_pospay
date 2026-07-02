const { z } = require('zod');

const createStudentSchema = z.object({
  nis: z.string().min(1, 'NIS wajib diisi').optional(),
  nisn: z.string().optional().or(z.literal('')),
  fullName: z.string().min(2, 'Nama lengkap wajib diisi'),
  gender: z.enum(['L', 'P']).optional(),
  birthPlace: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  classId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED']).optional(),
  createAccount: z.boolean().optional().default(true),
  password: z.string().min(6).optional(),
});

const updateStudentSchema = createStudentSchema.partial().omit({ createAccount: true, password: true });

const listStudentSchema = z.object({
  search: z.string().optional(),
  classId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6).optional(),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  listStudentSchema,
  resetPasswordSchema,
};
