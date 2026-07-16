const { z } = require('zod');

const createPaymentSchema = z.object({
  billId: z.string().min(1, 'Tagihan wajib dipilih'),
  paymentMethodId: z.string().min(1, 'Metode pembayaran wajib dipilih'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0').optional(),
  note: z.string().optional(),
});

const approveSchema = z.object({
  note: z.string().optional(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(3, 'Alasan penolakan wajib diisi'),
});

const cashActionSchema = z.object({
  paymentId: z.string().min(1, 'ID pembayaran wajib diisi'),
  note: z.string().optional(),
});

const cashRejectSchema = z.object({
  paymentId: z.string().min(1, 'ID pembayaran wajib diisi'),
  rejectionReason: z.string().min(3, 'Alasan penolakan wajib diisi'),
});

const historyQuerySchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  year: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = {
  createPaymentSchema,
  approveSchema,
  rejectSchema,
  cashActionSchema,
  cashRejectSchema,
  historyQuerySchema,
};
