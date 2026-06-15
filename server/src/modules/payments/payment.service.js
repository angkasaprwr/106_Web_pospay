const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { paymentRepository } = require('./payment.repository');
const { computeStatus, outstanding } = require('../bills/bill.helper');
const { generatePaymentRef } = require('../../utils/identifiers');
const { toNumber } = require('../../utils/money');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');

async function list(query) {
  return paymentRepository.list(query);
}

async function getById(id) {
  const payment = await paymentRepository.detail(id);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  return payment;
}

/**
 * Create a payment request against a bill. Status starts as PENDING (needs verification),
 * unless recorded directly by the treasurer as CASH.
 */
async function create(input, { actor, asTreasurer = false, req }) {
  const bill = await prisma.bill.findUnique({ where: { id: input.billId }, include: { student: true } });
  if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');

  // Students may only pay their own bills.
  if (!asTreasurer && actor.studentId && bill.studentId !== actor.studentId) {
    throw ApiError.forbidden('Anda hanya dapat membayar tagihan milik sendiri');
  }
  if (bill.status === 'PAID' || bill.status === 'WAIVED') {
    throw ApiError.badRequest('Tagihan ini sudah lunas atau dibebaskan');
  }

  const remaining = outstanding(bill);
  if (input.amount > remaining + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${remaining})`);
  }

  const payment = await prisma.payment.create({
    data: {
      reference: generatePaymentRef(),
      billId: bill.id,
      paymentMethodId: input.paymentMethodId || null,
      amount: input.amount,
      channel: input.channel || 'TRANSFER',
      proofUrl: input.proofUrl || null,
      note: input.note || null,
      status: 'PENDING',
    },
    include: { bill: { include: { student: true, feeType: true } } },
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });

  // If recorded directly by the treasurer, auto-verify.
  if (asTreasurer) {
    return verify(payment.id, { note: 'Dicatat langsung oleh bendahara' }, actor, req);
  }

  // Notify treasurers there is a payment to verify.
  await notifyTreasurers({
    title: 'Konfirmasi Pembayaran Baru',
    body: `${payment.bill.student.fullName} mengunggah bukti pembayaran ${payment.bill.feeType.name}.`,
    type: 'PAYMENT_SUBMITTED',
    data: { paymentId: payment.id, billId: bill.id },
  });

  return payment;
}

async function applyPaymentToBill(tx, billId) {
  const bill = await tx.bill.findUnique({
    where: { id: billId },
    include: { payments: { where: { status: 'VERIFIED' } } },
  });
  const paidAmount = bill.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
  const status = computeStatus({ ...bill, paidAmount });
  await tx.bill.update({ where: { id: billId }, data: { paidAmount, status } });
  return { paidAmount, status };
}

async function verify(id, input, actor, req) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { bill: { include: { student: true, feeType: true } } } });
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  if (payment.status === 'VERIFIED') throw ApiError.badRequest('Pembayaran sudah diverifikasi');

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById: actor.id,
        verifiedAt: new Date(),
        note: input.note || payment.note,
        rejectionReason: null,
      },
    });
    await applyPaymentToBill(tx, payment.billId);
    return updated;
  });

  await recordAudit({ userId: actor.id, action: 'VERIFY', entity: 'Payment', entityId: id, req });

  if (payment.bill.student.userId) {
    await notifyUser(payment.bill.student.userId, {
      title: 'Pembayaran Terverifikasi',
      body: `Pembayaran ${payment.bill.feeType.name} sebesar ${toNumber(payment.amount)} telah diverifikasi.`,
      type: 'PAYMENT_VERIFIED',
      data: { paymentId: id, billId: payment.billId },
    });
  }

  return getById(result.id);
}

async function reject(id, input, actor, req) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { bill: { include: { student: true, feeType: true } } } });
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  if (payment.status === 'REJECTED') throw ApiError.badRequest('Pembayaran sudah ditolak');

  const wasVerified = payment.status === 'VERIFIED';
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: input.rejectionReason,
        verifiedById: actor.id,
        verifiedAt: new Date(),
      },
    });
    if (wasVerified) await applyPaymentToBill(tx, payment.billId);
  });

  await recordAudit({ userId: actor.id, action: 'REJECT', entity: 'Payment', entityId: id, metadata: { reason: input.rejectionReason }, req });

  if (payment.bill.student.userId) {
    await notifyUser(payment.bill.student.userId, {
      title: 'Pembayaran Ditolak',
      body: `Pembayaran ${payment.bill.feeType.name} ditolak: ${input.rejectionReason}`,
      type: 'PAYMENT_REJECTED',
      data: { paymentId: id, billId: payment.billId },
    });
  }

  return getById(id);
}

async function notifyTreasurers(payload) {
  const treasurers = await prisma.user.findMany({ where: { role: 'BENDAHARA', isActive: true }, select: { id: true } });
  await Promise.all(treasurers.map((t) => notifyUser(t.id, payload)));
}

module.exports = { list, getById, create, verify, reject };
