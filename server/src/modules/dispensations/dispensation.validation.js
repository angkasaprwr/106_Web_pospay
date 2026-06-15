const { z } = require('zod');

const createDispensationSchema = z.object({
  studentId: z.string().optional(),
  billId: z.string().optional().or(z.literal('')),
  type: z.enum(['WAIVER', 'DISCOUNT', 'POSTPONE']).default('POSTPONE'),
  reason: z.string().min(5, 'Alasan minimal 5 karakter'),
  amount: z.coerce.number().nonnegative().optional().default(0),
  newDueDate: z.coerce.date().optional(),
  attachmentUrl: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  newDueDate: z.coerce.date().optional(),
});

const listDispensationSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  type: z.enum(['WAIVER', 'DISCOUNT', 'POSTPONE']).optional(),
  studentId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

module.exports = { createDispensationSchema, reviewSchema, listDispensationSchema };
