const { z } = require('zod');

const createBillSchema = z.object({
  studentId: z.string().min(1, 'Siswa wajib dipilih'),
  feeTypeId: z.string().min(1, 'Jenis tagihan wajib dipilih'),
  academicYearId: z.string().optional().or(z.literal('')),
  period: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().nonnegative('Nominal tidak valid'),
  discount: z.coerce.number().nonnegative().optional().default(0),
  dueDate: z.coerce.date().optional(),
});

const bulkBillSchema = z.object({
  feeTypeId: z.string().min(1),
  academicYearId: z.string().optional().or(z.literal('')),
  classId: z.string().optional().or(z.literal('')),
  period: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  dueDate: z.coerce.date().optional(),
  target: z.enum(['ALL', 'CLASS']).default('ALL'),
});

const updateBillSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  discount: z.coerce.number().nonnegative().optional(),
  dueDate: z.coerce.date().optional(),
  period: z.string().optional(),
});

const listBillSchema = z.object({
  search: z.string().optional(),
  studentId: z.string().optional(),
  feeTypeId: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

module.exports = { createBillSchema, bulkBillSchema, updateBillSchema, listBillSchema };
