const PDFDocument = require('pdfkit');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { env } = require('../../config/env');
const { outstanding, computeStatus } = require('../bills/bill.helper');
const { generatePaymentRef, generateMidtransOrderId } = require('../../utils/identifiers');
const { toNumber } = require('../../utils/money');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');
const { resolveStudent } = require('../portal/portal.service');
const paymentService = require('../payments/payment.service');
const { paymentFlowRepository } = require('./payment-flow.repository');
const midtransService = require('./midtrans.service');

function isMidtransQrisMethod(method) {
  if (!method) return false;
  return method.gateway === 'midtrans' || method.paymentType === 'QRIS_MIDTRANS';
}

function isCashPaymentMethod(method) {
  if (!method) return false;
  return method.paymentType === 'CASH' || method.channel === 'CASH';
}

function sanitizeMethodForPortal(method) {
  if (!method) return method;
  const { midtransServerKey, midtransClientKey, ...safe } = method;
  return safe;
}

async function validateBillForStudent(billId, actor) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { student: true, feeType: true },
  });
  if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');

  const student = await resolveStudent(actor);
  if (bill.studentId !== student.id) {
    throw ApiError.forbidden('Anda hanya dapat membayar tagihan milik sendiri');
  }
  if (bill.status === 'PAID' || bill.status === 'WAIVED') {
    throw ApiError.badRequest('Tagihan ini sudah lunas atau dibebaskan');
  }

  const pending = await paymentFlowRepository.findPendingByBillId(bill.id);
  if (pending) {
    throw ApiError.badRequest('Tagihan ini masih memiliki pembayaran yang menunggu proses');
  }

  return { bill, student };
}

async function loadPaymentMethod(paymentMethodId) {
  const method = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
  if (!method || !method.isActive) throw ApiError.badRequest('Metode pembayaran tidak valid');
  return method;
}

async function notifyTreasurers(payload) {
  const treasurers = await prisma.user.findMany({
    where: { role: 'BENDAHARA', isActive: true },
    select: { id: true },
  });
  await Promise.all(treasurers.map((t) => notifyUser(t.id, payload)));
}

async function recordPaymentNotification(paymentId, userId, type, title, body) {
  await paymentFlowRepository.createPaymentNotification({ paymentId, userId, type, title, body });
  if (userId) {
    await notifyUser(userId, { title, body, type, data: { paymentId } });
  }
}

async function createCashPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (!isCashPaymentMethod(method)) {
    throw ApiError.badRequest('Metode pembayaran bukan tunai');
  }

  const { bill } = await validateBillForStudent(input.billId, actor);
  const amount = input.amount ?? outstanding(bill);
  if (amount > outstanding(bill) + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${outstanding(bill)})`);
  }

  const payment = await paymentFlowRepository.createPaymentWithHistory(
    {
      reference: generatePaymentRef(),
      billId: bill.id,
      paymentMethodId: method.id,
      amount,
      channel: 'CASH',
      paymentType: 'CASH',
      gateway: method.gateway || 'manual',
      note: input.note || null,
      status: 'PENDING',
    },
    'Pembayaran tunai diajukan — menunggu verifikasi bendahara',
  );

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });
  await notifyTreasurers({
    title: 'Pembayaran Tunai Menunggu Verifikasi',
    body: `${bill.student.fullName} mengajukan pembayaran tunai ${bill.feeType.name}.`,
    type: 'PAYMENT_SUBMITTED',
    data: { paymentId: payment.id, billId: bill.id },
  });

  return payment;
}

async function createMidtransPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (!isMidtransQrisMethod(method)) {
    throw ApiError.badRequest('Metode pembayaran bukan QRIS Midtrans');
  }

  const { bill, student } = await validateBillForStudent(input.billId, actor);
  const amount = input.amount ?? outstanding(bill);
  if (amount > outstanding(bill) + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${outstanding(bill)})`);
  }

  const orderId = generateMidtransOrderId();
  const payment = await paymentFlowRepository.createPaymentWithHistory(
    {
      reference: generatePaymentRef(),
      billId: bill.id,
      paymentMethodId: method.id,
      amount,
      channel: 'QRIS',
      paymentType: 'QRIS_MIDTRANS',
      gateway: 'midtrans',
      orderId,
      note: input.note || null,
      status: 'PENDING',
    },
    'Transaksi QRIS Midtrans dibuat',
  );

  let charge;
  try {
    charge = await midtransService.chargeQris({
      orderId,
      grossAmount: amount,
      method,
      customerDetails: {
        first_name: student.fullName,
        email: actor.email || `${student.nis}@siswa.local`,
        phone: student.parentPhone || actor.phone || '08123456789',
      },
    });
  } catch (err) {
    await prisma.payment.delete({ where: { id: payment.id } });
    throw ApiError.badRequest(`Gagal membuat transaksi Midtrans: ${err.message}`);
  }

  const updated = await paymentFlowRepository.updatePaymentWithHistory(
    payment.id,
    {
      transactionId: charge.transactionId,
      qrString: charge.qrString,
      qrUrl: charge.qrUrl,
      expiryTime: charge.expiryTime,
      midtransStatus: charge.midtransStatus,
    },
    { note: 'QRIS Midtrans di-generate', metadata: { statusCode: charge.statusCode } },
  );

  await paymentFlowRepository.createMidtransLog({
    paymentId: payment.id,
    orderId,
    eventType: 'charge',
    payload: { orderId, amount },
    response: charge.raw,
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });

  return {
    ...updated,
    qr_string: charge.qrString,
    qr_url: charge.qrUrl,
    expiry_time: charge.expiryTime,
    transaction_id: charge.transactionId,
    order_id: orderId,
    gross_amount: toNumber(amount),
    school_name: env.school.name,
    invoice_no: bill.invoiceNo,
  };
}

async function createPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (isMidtransQrisMethod(method)) {
    return createMidtransPayment(input, actor, req);
  }
  if (isCashPaymentMethod(method)) {
    return createCashPayment(input, actor, req);
  }
  throw ApiError.badRequest('Gunakan portal pembayaran untuk metode transfer dengan bukti');
}

async function getStatus(paymentId, actor) {
  const payment = await paymentFlowRepository.findPaymentById(paymentId);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  if (actor.role === 'SISWA') {
    const student = await resolveStudent(actor);
    if (payment.bill.studentId !== student.id) {
      throw ApiError.forbidden('Akses ditolak');
    }
  }

  return {
    id: payment.id,
    reference: payment.reference,
    order_id: payment.orderId,
    transaction_id: payment.transactionId,
    status: payment.status,
    midtrans_status: payment.midtransStatus,
    amount: toNumber(payment.amount),
    qr_string: payment.qrString,
    qr_url: payment.qrUrl,
    expiry_time: payment.expiryTime,
    paid_at: payment.verifiedAt || payment.paidAt,
    settlement_time: payment.settlementTime,
    fraud_status: payment.fraudStatus,
    bill: {
      id: payment.bill.id,
      invoiceNo: payment.bill.invoiceNo,
      status: payment.bill.status,
      feeType: payment.bill.feeType?.name,
    },
    payment_method: sanitizeMethodForPortal(payment.paymentMethod),
  };
}

async function getHistory(actor, query) {
  const student = await resolveStudent(actor);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, parseInt(query.limit || '20', 10));
  const [items, total] = await paymentFlowRepository.listHistoryForStudent(student.id, {
    status: query.status,
    year: query.year,
    page,
    limit,
  });
  return { items, total, page, limit };
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

async function finalizeVerifiedPayment(payment, actor, req, meta = {}) {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'VERIFIED',
        verifiedById: actor?.id || null,
        verifiedAt: new Date(),
        paidAt: meta.paidAt || new Date(),
        settlementTime: meta.settlementTime || null,
        fraudStatus: meta.fraudStatus || null,
        signatureKey: meta.signatureKey || null,
        midtransStatus: meta.midtransStatus || payment.midtransStatus,
        transactionId: meta.transactionId || payment.transactionId,
        note: meta.note || payment.note,
        rejectionReason: null,
      },
      include: {
        bill: { include: { student: true, feeType: true } },
        paymentMethod: true,
      },
    });
    await applyPaymentToBill(tx, payment.billId);
    await tx.paymentHistory.create({
      data: {
        paymentId: payment.id,
        status: 'VERIFIED',
        amount: payment.amount,
        note: meta.note || 'Pembayaran diverifikasi',
        metadata: meta.metadata || null,
      },
    });
    return updated;
  });

  if (actor?.id) {
    await recordAudit({ userId: actor.id, action: 'VERIFY', entity: 'Payment', entityId: payment.id, req });
  }

  if (result.bill.student.userId) {
    await recordPaymentNotification(
      payment.id,
      result.bill.student.userId,
      'PAYMENT_VERIFIED',
      'Pembayaran Berhasil',
      `Pembayaran ${result.bill.feeType.name} sebesar ${toNumber(result.amount)} telah lunas.`,
    );
  }

  await notifyTreasurers({
    title: 'Pembayaran Masuk',
    body: `${result.bill.student.fullName} — ${result.bill.feeType.name} ${toNumber(result.amount)} lunas.`,
    type: 'PAYMENT_VERIFIED',
    data: { paymentId: payment.id, billId: payment.billId },
  });

  return result;
}

async function handleMidtransWebhook(payload) {
  const orderId = payload.order_id;
  if (!orderId) throw ApiError.badRequest('order_id tidak valid');

  const payment = await paymentFlowRepository.findPaymentByOrderId(orderId);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  const keys = midtransService.resolveKeys(payment.paymentMethod);
  if (midtransService.hasValidMidtransKeys(keys) && payload.signature_key) {
    const valid = midtransService.verifySignature(payload, keys.serverKey);
    if (!valid) throw ApiError.forbidden('Signature Midtrans tidak valid');
  }

  await paymentFlowRepository.createMidtransLog({
    paymentId: payment.id,
    orderId,
    eventType: 'webhook',
    payload,
    response: { receivedAt: new Date().toISOString() },
  });

  if (payment.status === 'VERIFIED') {
    return { payment, alreadyVerified: true };
  }

  const transactionStatus = String(payload.transaction_status || '').toLowerCase();
  const fraudStatus = payload.fraud_status || null;

  if (midtransService.isSettlementStatus(transactionStatus)) {
    const verified = await finalizeVerifiedPayment(payment, null, null, {
      paidAt: payload.settlement_time ? new Date(payload.settlement_time) : new Date(),
      settlementTime: payload.settlement_time ? new Date(payload.settlement_time) : new Date(),
      fraudStatus,
      signatureKey: payload.signature_key || null,
      midtransStatus: transactionStatus,
      transactionId: payload.transaction_id || payment.transactionId,
      note: 'Pembayaran QRIS Midtrans terverifikasi otomatis',
      metadata: payload,
    });
    return { payment: verified, settled: true };
  }

  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
    const rejected = await paymentFlowRepository.updatePaymentWithHistory(
      payment.id,
      {
        status: 'REJECTED',
        midtransStatus: transactionStatus,
        fraudStatus,
        rejectionReason: `Midtrans: ${transactionStatus}`,
      },
      { note: `Pembayaran gagal: ${transactionStatus}`, metadata: payload },
    );
    return { payment: rejected, failed: true };
  }

  const pending = await paymentFlowRepository.updatePaymentWithHistory(
    payment.id,
    { midtransStatus: transactionStatus, fraudStatus },
    { note: `Status Midtrans: ${transactionStatus}`, metadata: payload },
  );
  return { payment: pending, pending: true };
}

async function approvePayment(paymentId, input, actor, req) {
  return paymentService.verify(paymentId, input, actor, req);
}

async function rejectPayment(paymentId, input, actor, req) {
  return paymentService.reject(paymentId, input, actor, req);
}

async function streamInvoicePdf(paymentId, actor, res) {
  const payment = await paymentFlowRepository.findPaymentById(paymentId);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  if (actor.role === 'SISWA') {
    const student = await resolveStudent(actor);
    if (payment.bill.studentId !== student.id) throw ApiError.forbidden('Akses ditolak');
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="bukti-${payment.reference}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(env.school.name, { align: 'center' });
  doc.fontSize(12).text('Bukti Pembayaran POSPAY', { align: 'center' });
  doc.moveDown();

  const rows = [
    ['Referensi', payment.reference],
    ['Invoice', payment.bill.invoiceNo],
    ['Siswa', payment.bill.student.fullName],
    ['NIS', payment.bill.student.nis],
    ['Tagihan', payment.bill.feeType?.name || '-'],
    ['Metode', payment.paymentMethod?.name || payment.channel],
    ['Nominal', `Rp ${toNumber(payment.amount).toLocaleString('id-ID')}`],
    ['Status', payment.status === 'VERIFIED' ? 'Lunas' : payment.status],
    ['Tanggal', (payment.verifiedAt || payment.createdAt).toLocaleString('id-ID')],
  ];

  if (payment.orderId) rows.push(['Order ID', payment.orderId]);
  if (payment.transactionId) rows.push(['Transaction ID', payment.transactionId]);

  rows.forEach(([label, value]) => {
    doc.fontSize(10).text(`${label}: ${value}`);
  });

  doc.moveDown();
  doc.fontSize(8).fillColor('#666').text(`Dicetak ${new Date().toLocaleString('id-ID')} — POSPAY`, { align: 'center' });
  doc.end();
}

module.exports = {
  isMidtransQrisMethod,
  isCashPaymentMethod,
  sanitizeMethodForPortal,
  createPayment,
  createCashPayment,
  createMidtransPayment,
  getStatus,
  getHistory,
  handleMidtransWebhook,
  approvePayment,
  rejectPayment,
  streamInvoicePdf,
};
