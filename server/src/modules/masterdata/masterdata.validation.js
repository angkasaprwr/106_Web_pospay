const { z } = require('zod');

const feeTypeSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  defaultAmount: z.coerce.number().nonnegative().optional().default(0),
  isRecurring: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  channel: z.enum(['CASH', 'TRANSFER', 'QRIS', 'VIRTUAL_ACCOUNT', 'OTHER']).optional().default('TRANSFER'),
  accountName: z.string().optional(),
  accountNo: z.string().optional(),
  instruction: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  paymentType: z.enum(['CASH', 'QRIS_MIDTRANS', 'TRANSFER', 'OTHER']).optional(),
  gateway: z.enum(['midtrans', 'manual']).optional(),
  merchantName: z.string().optional(),
  merchantId: z.string().optional(),
  midtransClientKey: z.string().optional(),
  midtransServerKey: z.string().optional(),
  productionMode: z.boolean().optional().default(false),
  callbackUrl: z.union([z.string().url(), z.literal('')]).optional(),
});

const academicYearSchema = z.object({
  name: z.string().min(1, 'Nama tahun ajaran wajib diisi'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional().default(false),
});

const classSchema = z.object({
  name: z.string().min(1, 'Nama kelas wajib diisi'),
  grade: z.coerce.number().int().min(1).max(12),
  homeroom: z.string().optional(),
  academicYearId: z.string().min(1, 'Tahun ajaran wajib dipilih'),
});

module.exports = {
  feeTypeSchema,
  paymentMethodSchema,
  academicYearSchema,
  classSchema,
};
