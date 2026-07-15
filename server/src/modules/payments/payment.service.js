const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { paymentRepository } = require('./payment.repository');
const { computeStatus, outstanding } = require('../bills/bill.helper');
const { generatePaymentRef } = require('../../utils/identifiers');
const { toNumber } = require('../../utils/money');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');
const { emitPaymentUpdated } = require('../../services/socket.service');
const { resolveStudent } = require('../portal/portal.service');
const { isCashlessPayment, isCashMethod, requiresProofUpload, isMidtransQrisMethod, generateQrDataUrl } = require('./payment.util');

const CASHLESS_SETTLE_MS = parseInt(process.env.CASHLESS_SETTLE_MS || '8000', 10);

async function list(query) {
  return paymentRepository.list(query);
}

async function getById(id) {
  const payment = await paymentRepository.detail(id);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  return payment;
}

async function getForStudent(user, id) {
  const student = await resolveStudent(user);
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bill: { include: { student: true, feeType: true } },
      paymentMethod: true,
    },
  });
  if (!payment || payment.bill.studentId !== student.id) {
    throw ApiError.notFound('Pembayaran tidak ditemukan');
  }
  return payment;
}

async function getQrForStudent(user, id) {
  const payment = await getForStudent(user, id);
  const method = payment.paymentMethod;
  if (!isCashlessPayment(payment.channel, method?.name, method)) {
    throw ApiError.badRequest('QR hanya tersedia untuk metode pembayaran QRIS');
  }
  if (isMidtransQrisMethod(method)) {
    return {
      paymentId: payment.id,
      reference: payment.reference,
      amount: toNumber(payment.amount),
      methodName: method?.name || payment.channel,
      accountNo: method?.accountNo || null,
      accountName: method?.accountName || 'SMP Pusponegoro Brebes',
      status: payment.status,
      qrDataUrl: payment.qrUrl,
      qr_string: payment.qrString,
      expiry_time: payment.expiryTime,
      order_id: payment.orderId,
      transaction_id: payment.transactionId,
      midtrans: true,
    };
  }
  const qrDataUrl = await generateQrDataUrl(payment, method);
  return {
    paymentId: payment.id,
    reference: payment.reference,
    amount: toNumber(payment.amount),
    methodName: method?.name || payment.channel,
    accountNo: method?.accountNo || null,
    accountName: method?.accountName || 'SMP Pusponegoro Brebes',
    status: payment.status,
    qrDataUrl,
  };
}

function scheduleCashlessSettlement(paymentId, actor, req) {
  setTimeout(async () => {
    try {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== 'PENDING') return;
      await settleCashless(paymentId, actor, req);
    } catch (err) {
      console.error('[cashless-settle]', paymentId, err.message);
    }
  }, CASHLESS_SETTLE_MS);
}

/**
 * Create a payment request against a bill. Status starts as PENDING (needs verification),
 * unless recorded directly by the treasurer as CASH or cashless without proof (auto-settle).
 */
async function create(input, { actor, asTreasurer = false, req }) {
  const bill = await prisma.bill.findUnique({
    where: { id: input.billId },
    include: { student: true, feeType: true },
  });
  if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');

  if (!asTreasurer) {
    const student = await resolveStudent(actor);
    if (bill.studentId !== student.id) {
      throw ApiError.forbidden('Anda hanya dapat membayar tagihan milik sendiri');
    }
  }

  if (bill.status === 'PAID' || bill.status === 'WAIVED') {
    throw ApiError.badRequest('Tagihan ini sudah lunas atau dibebaskan');
  }

  const remaining = outstanding(bill);
  if (input.amount > remaining + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${remaining})`);
  }

  let paymentMethod = null;
  if (input.paymentMethodId) {
    paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });
    if (!paymentMethod || !paymentMethod.isActive) {
      throw ApiError.badRequest('Metode pembayaran tidak valid');
    }
  }

  if (!asTreasurer && isMidtransQrisMethod(paymentMethod)) {
    throw ApiError.badRequest('Gunakan endpoint /payment/create untuk pembayaran QRIS Midtrans');
  }

  const channel = input.channel || paymentMethod?.channel || 'TRANSFER';
  const methodName = paymentMethod?.name || '';
  const cashless = isCashlessPayment(channel, methodName, paymentMethod);
  const cash = isCashMethod(channel, methodName);
  const needsProof = requiresProofUpload(channel, methodName);
  const hasProof = Boolean(input.proofUrl);

  if (cashless && hasProof) {
    throw ApiError.badRequest('Pembayaran cashless tidak memerlukan unggahan bukti');
  }
  if (!asTreasurer && needsProof && !hasProof) {
    throw ApiError.badRequest('Unggah bukti pembayaran untuk metode transfer');
  }

  const payment = await prisma.payment.create({
    data: {
      reference: generatePaymentRef(),
      billId: bill.id,
      paymentMethodId: input.paymentMethodId || null,
      amount: input.amount,
      channel,
      proofUrl: input.proofUrl || null,
      note: input.note || null,
      status: 'PENDING',
    },
    include: { bill: { include: { student: true, feeType: true } }, paymentMethod: true },
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });

  if (asTreasurer) {
    return verify(payment.id, { note: 'Dicatat langsung oleh bendahara' }, actor, req);
  }

  if (cashless && !hasProof && !isMidtransQrisMethod(paymentMethod)) {
    scheduleCashlessSettlement(payment.id, actor, req);
    return { ...payment, cashlessPending: true };
  }

  const notifyTitle = cash
    ? 'Pembayaran Tunai Menunggu Verifikasi'
    : 'Konfirmasi Pembayaran Baru';
  const notifyBody = cash
    ? `${payment.bill.student.fullName} mengajukan pembayaran tunai ${payment.bill.feeType.name} — menunggu verifikasi di loket.`
    : `${payment.bill.student.fullName} mengunggah bukti pembayaran ${payment.bill.feeType.name}.`;

  await notifyTreasurers({
    title: notifyTitle,
    body: notifyBody,
    type: 'PAYMENT_SUBMITTED',
    data: { paymentId: payment.id, billId: bill.id },
  });

  return payment;
}

async function settleCashless(id, actor, req) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { bill: { include: { student: true, feeType: true } }, paymentMethod: true },
  });
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  if (payment.status === 'VERIFIED') return getById(id);
  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest('Pembayaran tidak dapat diselesaikan');
  }
  if (!isCashlessPayment(payment.channel, payment.paymentMethod?.name)) {
    throw ApiError.badRequest('Hanya pembayaran cashless yang dapat diselesaikan otomatis');
  }

  const verified = await verify(
    id,
    { note: 'Pembayaran cashless otomatis terverifikasi — dana masuk rekening sekolah' },
    actor,
    req,
  );

  await notifyTreasurers({
    title: 'Pembayaran Cashless Masuk',
    body: `${payment.bill.student.fullName} — ${payment.bill.feeType.name} ${toNumber(payment.amount)} via ${payment.paymentMethod?.name || payment.channel}.`,
    type: 'PAYMENT_CASHLESS_RECEIVED',
    data: { paymentId: id, billId: payment.billId },
  });

  return verified;
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
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { bill: { include: { student: true, feeType: true } } },
  });
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
    await tx.invoice.upsert({
      where: { paymentId: id },
      create: {
        billId: payment.billId,
        paymentId: id,
        invoiceNo: payment.bill.invoiceNo,
        grossAmount: payment.amount,
        status: 'PAID',
        paidAt: new Date(),
      },
      update: {
        status: 'PAID',
        paidAt: new Date(),
        grossAmount: payment.amount,
      },
    });
    return updated;
  });

  await recordAudit({ userId: actor.id, action: 'VERIFY', entity: 'Payment', entityId: id, req });

  if (payment.bill.student.userId) {
    await notifyUser(payment.bill.student.userId, {
      title: 'Pembayaran Berhasil',
      body: 'Pembayaran tagihan berhasil diterima.',
      type: 'PAYMENT_VERIFIED',
      data: { paymentId: id, billId: payment.billId },
    });
  }

  const verified = await getById(result.id);
  emitPaymentUpdated({ ...verified, bill: payment.bill }, { settled: true });
  return verified;
}

async function reject(id, input, actor, req) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { bill: { include: { student: true, feeType: true } } },
  });
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

  await recordAudit({
    userId: actor.id,
    action: 'REJECT',
    entity: 'Payment',
    entityId: id,
    metadata: { reason: input.rejectionReason },
    req,
  });

  if (payment.bill.student.userId) {
    await notifyUser(payment.bill.student.userId, {
      title: 'Pembayaran Ditolak',
      body: `Pembayaran ${payment.bill.feeType.name} ditolak: ${input.rejectionReason}`,
      type: 'PAYMENT_REJECTED',
      data: { paymentId: id, billId: payment.billId },
    });
  }

  const rejected = await getById(id);
  emitPaymentUpdated({ ...rejected, bill: payment.bill }, { failed: true });
  return rejected;
}

async function notifyTreasurers(payload) {
  const treasurers = await prisma.user.findMany({
    where: { role: 'BENDAHARA', isActive: true },
    select: { id: true },
  });
  await Promise.all(treasurers.map((t) => notifyUser(t.id, payload)));
}

module.exports = {
  list,
  getById,
  getForStudent,
  getQrForStudent,
  create,
  settleCashless,
  verify,
  reject,
  isCashlessPayment,
  isCashMethod,
};
