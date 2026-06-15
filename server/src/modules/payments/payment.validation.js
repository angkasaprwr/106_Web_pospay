const { z } = require('zod');

const createPaymentSchema = z.object({
  billId: z.string().min(1, 'Tagihan wajib dipilih'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  channel: z.enum(['CASH', 'TRANSFER', 'QRIS', 'VIRTUAL_ACCOUNT', 'OTHER']).optional().default('TRANSFER'),
  paymentMethodId: z.string().optional().or(z.literal('')),
  note: z.string().optional(),
  proofUrl: z.string().optional(),
});

const verifySchema = z.object({
  note: z.string().optional(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(3, 'Alasan penolakan wajib diisi'),
});

const listPaymentSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  studentId: z.string().optional(),
  billId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

module.exports = { createPaymentSchema, verifySchema, rejectSchema, listPaymentSchema };
