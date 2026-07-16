const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { env } = require('../../config/env');
const { outstanding, computeStatus } = require('../bills/bill.helper');
const { generatePaymentRef, generateMidtransOrderId } = require('../../utils/identifiers');
const { toNumber } = require('../../utils/money');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');
const { resolveStudent } = require('../portal/portal.service');
const legacyPaymentService = require('../payments/payment.service');
const { paymentRepository } = require('./repository/payment.repository');
const midtransGateway = require('./gateway/midtrans.gateway');
const {
  FCM_SUCCESS_TITLE,
  FCM_SUCCESS_BODY,
  isMidtransQrisMethod,
  isMidtransTransferMethod,
  isCashPaymentMethod,
} = require('./domain/payment.domain');
const {
  sanitizeMethodForPortal,
  resolveQrDisplayUrl,
  formatPaymentStatusResponse,
  isEmvQrisString,
} = require('./dto/payment.dto');
const { emitPaymentUpdated, emitCatalogChanged } = require('../../services/socket.service');

function drawPospayLogo(doc, x, y, size = 40) {
  doc.save();
  doc.roundedRect(x, y, size, size, 8).fill('#0056D2');
  doc.fillColor('#ffffff').fontSize(size * 0.28).text('P', x + size * 0.34, y + size * 0.28);
  doc.restore();
  doc.fillColor('#000000');
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

  const pending = await paymentRepository.findPendingByBillId(bill.id);
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
  await paymentRepository.createPaymentNotification({ paymentId, userId, type, title, body });
  if (userId) {
    await notifyUser(userId, { title, body, type, data: { paymentId } });
  }
}

async function createCashPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (!isCashPaymentMethod(method)) {
    throw ApiError.badRequest('Metode pembayaran bukan tunai');
  }

  const { bill, student } = await validateBillForStudent(input.billId, actor);
  const amount = input.amount ?? outstanding(bill);
  if (amount > outstanding(bill) + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${outstanding(bill)})`);
  }

  // Satu pembayaran PENDING per tagihan — hindari duplikat setelah batal/bayar ulang.
  const existingPending = await paymentRepository.findPendingByBillId(bill.id);
  if (existingPending) {
    if (
      existingPending.paymentMethodId === method.id
      || existingPending.channel === 'CASH'
      || existingPending.paymentType === 'CASH'
    ) {
      return paymentRepository.findPaymentById(existingPending.id);
    }
    await prisma.payment.delete({ where: { id: existingPending.id } }).catch(() => {});
  }

  const payment = await paymentRepository.createPaymentWithHistory(
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
    body: `${student.fullName} mengajukan pembayaran tunai ${bill.feeType.name}.`,
    type: 'PAYMENT_SUBMITTED',
    data: { paymentId: payment.id, billId: bill.id },
  });

  emitPaymentUpdated({ ...payment, bill: { student } }, { paymentType: 'CASH' });
  return payment;
}

async function createMidtransPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (!isMidtransQrisMethod(method)) {
    throw ApiError.badRequest('Metode pembayaran bukan QRIS Midtrans');
  }

  const bill = await prisma.bill.findUnique({
    where: { id: input.billId },
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

  const schoolAccount = {
    bank: 'BNI',
    accountNo: method.accountNo || '6513009817',
    accountName: method.accountName || 'PAPK SMP PUSPONEGORO BREBES',
  };

  const keys = midtransGateway.resolveKeys(method);

  // Jika sudah ada transaksi QRIS Midtrans pending, kembalikan QR yang sama
  // kecuali pending lama adalah demo lokal — regenerate jika key Midtrans sudah valid.
  const existingPending = await paymentRepository.findPendingByBillId(bill.id);
  if (existingPending) {
    const full = await paymentRepository.findPaymentByInvoiceRef(existingPending.id);
    if (
      full
      && isMidtransQrisMethod(full.paymentMethod || method)
      && (full.paymentMethodId === method.id || full.channel === 'QRIS')
    ) {
      const wasLocal = String(full.transactionId || '').startsWith('sandbox-local-')
        || !isEmvQrisString(full.qrString);
      const canUpgrade = wasLocal && midtransGateway.hasValidMidtransKeys(keys);

      if (!canUpgrade) {
        const snapTok = String(full.qrString || '').startsWith('SNAP:')
          ? String(full.qrString).slice(5)
          : null;
        const qr_url = snapTok
          ? null
          : await resolveQrDisplayUrl(full.qrUrl, full.qrString, { serverKey: keys.serverKey });
        if (qr_url || snapTok) {
          const sandboxLocal = String(full.transactionId || '').startsWith('sandbox-local-');
          return {
            ...full,
            qr_string: full.qrString,
            qr_url: qr_url || full.qrUrl,
            qrDataUrl: qr_url,
            expiry_time: full.expiryTime,
            transaction_id: full.transactionId,
            order_id: full.orderId,
            gross_amount: toNumber(full.amount),
            school_name: env.school.name,
            invoice_no: bill.invoiceNo,
            school_account: schoolAccount,
            sandbox_local: sandboxLocal,
            scannable: Boolean(snapTok) || (isEmvQrisString(full.qrString) && !sandboxLocal),
            snap_token: snapTok,
            snap_redirect_url: snapTok ? full.qrUrl : null,
            midtrans_client_key: keys.clientKey,
            midtrans_is_production: keys.isProduction,
            display_mode: snapTok ? 'snap_embed' : (sandboxLocal ? 'demo' : 'qris_image'),
          };
        }
        throw ApiError.badRequest('Tagihan ini masih memiliki pembayaran yang menunggu proses');
      }
      // Tolak pending demo → buat charge Midtrans EMV baru
      await prisma.payment.update({
        where: { id: full.id },
        data: { status: 'REJECTED', rejectionReason: 'Diganti QRIS Midtrans EMV scannable' },
      });
    } else {
      throw ApiError.badRequest('Tagihan ini masih memiliki pembayaran yang menunggu proses');
    }
  }

  const amount = input.amount ?? outstanding(bill);
  if (amount > outstanding(bill) + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${outstanding(bill)})`);
  }

  const orderId = generateMidtransOrderId();
  const payment = await paymentRepository.createPaymentWithHistory(
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

  const buildLocalQrisCharge = async (reason) => {
    // QR demo — BUKAN EMV QRIS, tidak bisa di-scan e-wallet/bank (hanya alur UI dev)
    const qrPayload = [
      'POSPAY-QRIS-DEMO-NOT-SCANNABLE',
      `INV:${bill.invoiceNo}`,
      `ORDER:${orderId}`,
      `AMT:${Math.round(Number(amount))}`,
      `BANK:${schoolAccount.bank}`,
      `REK:${schoolAccount.accountNo}`,
      `AN:${schoolAccount.accountName}`,
    ].join('|');
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
    return {
      transactionId: `sandbox-local-${payment.id}`,
      orderId,
      grossAmount: amount,
      qrString: qrPayload,
      qrUrl: qrDataUrl,
      expiryTime: new Date(Date.now() + 30 * 60 * 1000),
      midtransStatus: 'pending',
      statusCode: '201',
      scannable: false,
      raw: { sandbox_local: true, reason, school_account: schoolAccount, scannable: false },
    };
  };

  let charge;
  let sandboxLocal = false;
  let snapPayload = null;
  const itemDetails = [
    {
      id: bill.id.slice(-12),
      price: Math.round(Number(amount)),
      quantity: 1,
      name: `${bill.feeType?.name || 'Tagihan'} - ${student.nis}`.slice(0, 50),
    },
  ];
  const customerDetails = {
    first_name: student.fullName,
    email: actor.email || `${student.nis}@siswa.local`,
    phone: student.parentPhone || actor.phone || '08123456789',
  };

  if (!midtransGateway.hasValidMidtransKeys(keys)) {
    if (!env.midtrans.sandboxFallback) {
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
      throw ApiError.badRequest(
        'QRIS Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env.',
      );
    }
    sandboxLocal = true;
    charge = await buildLocalQrisCharge('midtrans_keys_invalid_or_placeholder');
  } else {
    try {
      charge = await midtransGateway.chargeQris({
        orderId,
        grossAmount: amount,
        method,
        customerDetails,
        itemDetails,
      });
    } catch (coreErr) {
      // Core API QRIS sering 402 jika kanal belum diaktifkan — fallback Snap (QRIS Tap via UI Midtrans)
      const channelInactive = /not activated|402|channel is not|pop id is not found/i.test(
        String(coreErr.message || ''),
      );
      try {
        snapPayload = await midtransGateway.createSnapTransaction({
          orderId,
          grossAmount: amount,
          method,
          customerDetails,
          // Jika Core bilang kanal mati, jangan filter ketat — tampilkan semua kanal Snap yang aktif
          enabledPayments: channelInactive ? undefined : ['qris', 'gopay', 'other_qris'],
        });
        charge = {
          transactionId: snapPayload.snapToken,
          orderId,
          grossAmount: amount,
          qrString: `SNAP:${snapPayload.snapToken}`,
          qrUrl: snapPayload.redirectUrl,
          expiryTime: new Date(Date.now() + 30 * 60 * 1000),
          midtransStatus: 'pending',
          statusCode: '201',
          // Token Snap bisa dibuat meski kanal QRIS belum aktif; scannable hanya jika Core tidak 402
          scannable: !channelInactive,
          channelInactive,
          snapToken: snapPayload.snapToken,
          snapRedirectUrl: snapPayload.redirectUrl,
          clientKey: snapPayload.clientKey,
          isProduction: snapPayload.isProduction,
          raw: { snap: true, ...snapPayload, core_error: coreErr.message, channel_inactive: channelInactive },
        };
      } catch (snapErr) {
        if (!env.midtrans.sandboxFallback) {
          await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
          throw ApiError.badRequest(
            `Gagal membuat QRIS Midtrans: ${coreErr.message || snapErr.message}. Aktifkan kanal QRIS/GoPay di dashboard Midtrans.`,
          );
        }
        sandboxLocal = true;
        charge = await buildLocalQrisCharge(coreErr.message || 'midtrans_charge_failed');
      }
    }
  }

  const updated = await paymentRepository.updatePaymentWithHistory(
    payment.id,
    {
      transactionId: charge.transactionId,
      qrString: charge.qrString,
      qrUrl: charge.qrUrl,
      expiryTime: charge.expiryTime,
      midtransStatus: charge.midtransStatus,
    },
    {
      note: sandboxLocal
        ? 'QRIS demo lokal (belum scannable)'
        : snapPayload
          ? 'QRIS Midtrans Snap (QRIS Tap e-wallet/bank)'
          : 'QRIS Midtrans Core (EMV scannable)',
      metadata: { statusCode: charge.statusCode, sandboxLocal, snap: Boolean(snapPayload) },
    },
  );

  await paymentRepository.createMidtransLog({
    paymentId: payment.id,
    orderId,
    eventType: sandboxLocal ? 'charge_sandbox_local' : (snapPayload ? 'charge_snap' : 'charge'),
    payload: { orderId, amount, schoolAccount },
    response: charge.raw,
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });

  const qr_url = sandboxLocal || !snapPayload
    ? await resolveQrDisplayUrl(charge.qrUrl, charge.qrString, { serverKey: keys.serverKey })
    : null;

  if (!qr_url && !snapPayload) {
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    throw ApiError.badRequest('Kode QR Midtrans tidak tersedia dari server. Periksa konfigurasi Midtrans.');
  }

  const channelInactive = Boolean(charge.channelInactive);
  const scannable = !sandboxLocal
    && !channelInactive
    && (Boolean(snapPayload && !channelInactive) || charge.scannable || isEmvQrisString(charge.qrString));

  emitPaymentUpdated({ ...updated, bill: { student } }, {
    paymentType: 'QRIS_MIDTRANS',
    sandboxLocal,
    scannable,
    snap: Boolean(snapPayload),
    channelInactive,
  });

  return {
    ...updated,
    qr_string: charge.qrString,
    qr_url: qr_url || charge.qrUrl,
    qrDataUrl: qr_url,
    expiry_time: charge.expiryTime,
    transaction_id: charge.transactionId,
    order_id: orderId,
    gross_amount: toNumber(amount),
    school_name: env.school.name,
    invoice_no: bill.invoiceNo,
    school_account: schoolAccount,
    sandbox_local: sandboxLocal,
    scannable,
    midtrans_channel_inactive: channelInactive,
    midtrans_hint: channelInactive
      ? 'Kanal QRIS/GoPay belum aktif di Midtrans MAP. Aktifkan Payment Channels (QRIS + GoPay) dan pastikan settlement ke rekening BNI 6513009817 agar kode QR bisa di-scan e-wallet/bank.'
      : null,
    snap_token: snapPayload?.snapToken || null,
    snap_redirect_url: snapPayload?.redirectUrl || null,
    midtrans_client_key: snapPayload?.clientKey || keys.clientKey || null,
    midtrans_is_production: snapPayload?.isProduction ?? keys.isProduction,
    display_mode: snapPayload ? 'snap_embed' : (sandboxLocal ? 'demo' : 'qris_image'),
    midtrans_simulator_url: !keys.isProduction && scannable && !snapPayload
      ? 'https://simulator.sandbox.midtrans.com/openapi/qris/index'
      : null,
  };
}

async function createMidtransTransferPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (!isMidtransTransferMethod(method)) {
    throw ApiError.badRequest('Metode pembayaran bukan transfer Midtrans');
  }

  const { bill, student } = await validateBillForStudent(input.billId, actor);
  const amount = input.amount ?? outstanding(bill);
  if (amount > outstanding(bill) + 0.001) {
    throw ApiError.badRequest(`Nominal melebihi sisa tagihan (${outstanding(bill)})`);
  }

  const schoolAccount = {
    bank: 'BNI',
    accountNo: method.accountNo || '6513009817',
    accountName: method.accountName || 'PAPK SMP PUSPONEGORO BREBES',
  };

  const orderId = generateMidtransOrderId();
  const payment = await paymentRepository.createPaymentWithHistory(
    {
      reference: generatePaymentRef(),
      billId: bill.id,
      paymentMethodId: method.id,
      amount,
      channel: 'TRANSFER',
      paymentType: 'TRANSFER_MIDTRANS',
      gateway: 'midtrans',
      orderId,
      note: input.note || null,
      status: 'PENDING',
    },
    'Transaksi transfer Midtrans dibuat',
  );

  const keys = midtransGateway.resolveKeys(method);
  let charge;
  let sandboxLocal = false;

  if (!midtransGateway.hasValidMidtransKeys(keys)) {
    sandboxLocal = true;
    charge = {
      transactionId: `sandbox-tf-${payment.id}`,
      orderId,
      grossAmount: amount,
      paymentType: 'bank_transfer',
      paymentUrl: null,
      vaNumber: schoolAccount.accountNo,
      bank: schoolAccount.bank,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      midtransStatus: 'pending',
      statusCode: '201',
      raw: { sandbox_local: true, reason: 'midtrans_keys_invalid', school_account: schoolAccount },
    };
  } else {
    try {
      charge = await midtransGateway.chargeBankTransfer({
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
      // Fallback sandbox: arahkan transfer ke rekening resmi sekolah
      sandboxLocal = true;
      charge = {
        transactionId: `sandbox-tf-${payment.id}`,
        orderId,
        grossAmount: amount,
        paymentType: 'bank_transfer',
        paymentUrl: null,
        vaNumber: schoolAccount.accountNo,
        bank: schoolAccount.bank,
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        midtransStatus: 'pending',
        statusCode: '201',
        raw: { sandbox_local: true, reason: err.message || 'midtrans_transfer_failed', school_account: schoolAccount },
      };
    }
  }

  const updated = await paymentRepository.updatePaymentWithHistory(
    payment.id,
    {
      transactionId: charge.transactionId,
      qrString: charge.vaNumber || schoolAccount.accountNo,
      qrUrl: charge.paymentUrl || null,
      expiryTime: charge.expiryTime,
      midtransStatus: charge.midtransStatus,
    },
    {
      note: sandboxLocal
        ? 'Transfer sandbox lokal → rekening BNI sekolah'
        : 'Transfer Midtrans di-generate',
      metadata: { statusCode: charge.statusCode, bank: charge.bank, sandboxLocal },
    },
  );

  await paymentRepository.createMidtransLog({
    paymentId: payment.id,
    orderId,
    eventType: sandboxLocal ? 'charge_sandbox_local' : 'charge',
    payload: { orderId, amount, bank: charge.bank, channel: 'TRANSFER', schoolAccount },
    response: charge.raw,
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, req });
  emitPaymentUpdated({ ...updated, bill: { student } }, { paymentType: 'TRANSFER_MIDTRANS', sandboxLocal });

  return {
    ...updated,
    order_id: orderId,
    transaction_id: charge.transactionId,
    gross_amount: toNumber(amount),
    payment_type: charge.paymentType,
    payment_url: charge.paymentUrl || null,
    va_number: charge.vaNumber || schoolAccount.accountNo,
    bank: charge.bank || schoolAccount.bank,
    expiry_time: charge.expiryTime,
    school_name: env.school.name,
    invoice_no: bill.invoiceNo,
    school_account: schoolAccount,
    sandbox_local: sandboxLocal,
  };
}

async function createPayment(input, actor, req) {
  const method = await loadPaymentMethod(input.paymentMethodId);
  if (isMidtransQrisMethod(method)) return createMidtransPayment(input, actor, req);
  if (isMidtransTransferMethod(method)) return createMidtransTransferPayment(input, actor, req);
  if (isCashPaymentMethod(method)) return createCashPayment(input, actor, req);
  throw ApiError.badRequest('Gunakan portal pembayaran untuk metode transfer dengan bukti');
}

async function getStatus(invoiceRef, actor) {
  const payment = await paymentRepository.findPaymentByInvoiceRef(invoiceRef);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  if (actor.role === 'SISWA') {
    const student = await resolveStudent(actor);
    if (payment.bill.studentId !== student.id) throw ApiError.forbidden('Akses ditolak');
  }

  const keys = midtransGateway.resolveKeys(payment.paymentMethod);
  return formatPaymentStatusResponse(payment, {
    serverKey: keys.serverKey,
    clientKey: keys.clientKey,
    isProduction: keys.isProduction,
  });
}

async function getPaymentMethods() {
  const methods = await paymentRepository.listActivePaymentMethods();
  return methods.map(sanitizeMethodForPortal);
}

async function getHistory(actor, query) {
  const student = await resolveStudent(actor);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, parseInt(query.limit || '20', 10));
  const [items, total] = await paymentRepository.listHistoryForStudent(student.id, {
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
    await tx.invoice.upsert({
      where: { paymentId: payment.id },
      create: {
        billId: payment.billId,
        paymentId: payment.id,
        invoiceNo: updated.bill.invoiceNo,
        grossAmount: payment.amount,
        status: 'PAID',
        paidAt: meta.paidAt || new Date(),
      },
      update: {
        status: 'PAID',
        paidAt: meta.paidAt || new Date(),
        grossAmount: payment.amount,
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
      FCM_SUCCESS_TITLE,
      FCM_SUCCESS_BODY,
    );
  }

  await notifyTreasurers({
    title: 'Pembayaran Masuk',
    body: `${result.bill.student.fullName} — ${result.bill.feeType.name} ${toNumber(result.amount)} lunas.`,
    type: 'PAYMENT_VERIFIED',
    data: { paymentId: payment.id, billId: payment.billId },
  });

  emitPaymentUpdated(result, { settled: true });
  return result;
}

async function handleMidtransWebhook(payload) {
  const orderId = payload.order_id;
  if (!orderId) throw ApiError.badRequest('order_id tidak valid');

  const payment = await paymentRepository.findPaymentByOrderId(orderId);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  const keys = midtransGateway.resolveKeys(payment.paymentMethod);
  let signatureValid = false;
  if (midtransGateway.hasValidMidtransKeys(keys) && payload.signature_key) {
    signatureValid = midtransGateway.verifySignature(payload, keys.serverKey);
    if (!signatureValid) throw ApiError.forbidden('Signature Midtrans tidak valid');
  }

  await paymentRepository.createMidtransLog({
    paymentId: payment.id,
    orderId,
    eventType: 'webhook',
    payload,
    response: { receivedAt: new Date().toISOString() },
  });

  await paymentRepository.createPaymentWebhook({
    paymentId: payment.id,
    provider: 'midtrans',
    orderId,
    eventType: String(payload.transaction_status || 'notification'),
    payload,
    signatureValid,
    processedAt: new Date(),
  });

  if (payment.status === 'VERIFIED') {
    return { payment, alreadyVerified: true };
  }

  const transactionStatus = String(payload.transaction_status || '').toLowerCase();
  const fraudStatus = payload.fraud_status || null;

  if (midtransGateway.isSettlementStatus(transactionStatus) || transactionStatus === 'success') {
    await paymentRepository.createPaymentTransaction({
      paymentId: payment.id,
      transactionId: payload.transaction_id || payment.transactionId,
      orderId,
      paymentType: payload.payment_type || payment.paymentType || 'qris',
      grossAmount: payment.amount,
      transactionTime: payload.transaction_time ? new Date(payload.transaction_time) : new Date(),
      settlementTime: payload.settlement_time ? new Date(payload.settlement_time) : new Date(),
      fraudStatus,
      status: transactionStatus,
    });

    const verified = await finalizeVerifiedPayment(payment, null, null, {
      paidAt: payload.settlement_time ? new Date(payload.settlement_time) : new Date(),
      settlementTime: payload.settlement_time ? new Date(payload.settlement_time) : new Date(),
      fraudStatus,
      signatureKey: payload.signature_key || null,
      midtransStatus: transactionStatus,
      transactionId: payload.transaction_id || payment.transactionId,
      note: 'Pembayaran Midtrans terverifikasi otomatis',
      metadata: payload,
    });
    return { payment: verified, settled: true };
  }

  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
    const rejected = await paymentRepository.updatePaymentWithHistory(
      payment.id,
      {
        status: 'REJECTED',
        midtransStatus: transactionStatus,
        fraudStatus,
        rejectionReason: `Midtrans: ${transactionStatus}`,
      },
      { note: `Pembayaran gagal: ${transactionStatus}`, metadata: payload },
    );

    if (payment.bill?.student?.userId) {
      await recordPaymentNotification(
        payment.id,
        payment.bill.student.userId,
        'PAYMENT_REJECTED',
        'Pembayaran Ditolak',
        `Pembayaran tagihan gagal: ${transactionStatus}.`,
      );
    }

    emitPaymentUpdated({ ...rejected, bill: payment.bill }, { failed: true });
    return { payment: rejected, failed: true };
  }

  if (transactionStatus === 'challenge') {
    const challenged = await paymentRepository.updatePaymentWithHistory(
      payment.id,
      { midtransStatus: transactionStatus, fraudStatus },
      { note: 'Pembayaran menunggu challenge 3DS / fraud review Midtrans', metadata: payload },
    );
    emitPaymentUpdated({ ...challenged, bill: payment.bill }, { challenge: true });
    return { payment: challenged, challenge: true };
  }

  const pending = await paymentRepository.updatePaymentWithHistory(
    payment.id,
    { midtransStatus: transactionStatus, fraudStatus },
    { note: `Status Midtrans: ${transactionStatus}`, metadata: payload },
  );
  emitPaymentUpdated({ ...pending, bill: payment.bill }, { pending: true });
  return { payment: pending, pending: true };
}

async function approvePayment(paymentId, input, actor, req) {
  return legacyPaymentService.verify(paymentId, input, actor, req);
}

async function rejectPayment(paymentId, input, actor, req) {
  return legacyPaymentService.reject(paymentId, input, actor, req);
}

/**
 * Siswa membatalkan pembayaran yang masih PENDING.
 * Hapus permanen dari PostgreSQL → tagihan kembali status belumbayar / menunggu verifikasi hilang.
 */
async function cancelPendingPayment(paymentId, actor, req) {
  if (!paymentId) throw ApiError.badRequest('ID pembayaran wajib diisi');
  const student = await resolveStudent(actor);

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { bill: { include: { student: true, feeType: true } } },
  });
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');
  if (payment.bill.studentId !== student.id) {
    throw ApiError.forbidden('Anda hanya dapat membatalkan pembayaran milik sendiri');
  }
  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest('Hanya pembayaran menunggu verifikasi yang dapat dibatalkan');
  }

  // Hapus permanen — PaymentHistory / MidtransLog ikut cascade / setNull.
  await prisma.payment.delete({ where: { id: paymentId } });

  await recordAudit({
    userId: actor.id,
    action: 'DELETE',
    entity: 'Payment',
    entityId: paymentId,
    metadata: {
      cancelledBy: 'SISWA',
      billId: payment.billId,
      previousStatus: 'PENDING',
      reason: 'Dibatalkan siswa pada konfirmasi pembayaran',
    },
    req,
  });

  const billStatus = payment.bill.status === 'PAID' || payment.bill.status === 'WAIVED'
    ? payment.bill.status
    : (Number(payment.bill.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID');

  emitPaymentUpdated(
    {
      id: paymentId,
      billId: payment.billId,
      status: 'REJECTED',
      bill: payment.bill,
    },
    { cancelled: true, billStatus },
  );
  emitCatalogChanged({
    reason: 'payment_cancelled',
    paymentId,
    billId: payment.billId,
    billStatus,
  });

  return {
    paymentId,
    billId: payment.billId,
    bill_status: billStatus,
    cancelled: true,
    message: 'Pembayaran dibatalkan. Tagihan kembali belum dibayar.',
  };
}

async function streamInvoicePdf(paymentId, actor, res) {
  const payment = await paymentRepository.findPaymentById(paymentId);
  if (!payment) throw ApiError.notFound('Pembayaran tidak ditemukan');

  if (actor.role === 'SISWA') {
    const student = await resolveStudent(actor);
    if (payment.bill.studentId !== student.id) throw ApiError.forbidden('Akses ditolak');
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="bukti-${payment.reference}.pdf"`);
  doc.pipe(res);

  const logoPath = path.resolve(__dirname, '../../assets/pospay-logo.png');
  try {
    doc.image(logoPath, 50, 45, { width: 48, height: 48 });
  } catch {
    drawPospayLogo(doc, 50, 45, 48);
  }

  doc.fontSize(16).fillColor('#0056D2').text(env.school.name, 110, 50);
  doc.fontSize(11).fillColor('#333333').text('Bukti Pembayaran POSPAY', 110, 72);
  doc.moveDown(2);

  const className = payment.bill.student?.schoolClass?.name || '-';
  const paidDate = payment.verifiedAt || payment.paidAt || payment.createdAt;
  const statusLabel = payment.status === 'VERIFIED' ? 'LUNAS' : payment.status;

  const rows = [
    ['Nomor Invoice', payment.bill.invoiceNo],
    ['Referensi', payment.reference],
    ['Nama Siswa', payment.bill.student.fullName],
    ['NIS', payment.bill.student.nis],
    ['Kelas', className],
    ['Jenis Tagihan', payment.bill.feeType?.name || '-'],
    ['Nominal', `Rp ${toNumber(payment.amount).toLocaleString('id-ID')}`],
    ['Metode Pembayaran', payment.paymentMethod?.name || payment.channel],
    ['Tanggal Bayar', paidDate.toLocaleString('id-ID')],
    ['Status', statusLabel],
  ];

  if (payment.orderId) rows.push(['Order ID', payment.orderId]);
  if (payment.transactionId) rows.push(['Transaction ID', payment.transactionId]);

  doc.fontSize(10).fillColor('#000000');
  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}:`, { continued: true });
    doc.font('Helvetica').text(` ${value}`);
  });

  const qrPayload = payment.transactionId || payment.orderId || payment.reference;
  if (qrPayload && payment.status === 'VERIFIED') {
    try {
      const qrBuffer = await QRCode.toBuffer(qrPayload, { width: 120, margin: 1 });
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(9).text('QR Transaksi:');
      doc.image(qrBuffer, 50, doc.y, { width: 100 });
      doc.moveDown(6);
    } catch {
      /* skip */
    }
  }

  doc.moveDown();
  doc.fontSize(8).fillColor('#666666').text(`Dicetak ${new Date().toLocaleString('id-ID')} — POSPAY`, { align: 'center' });
  doc.end();
}

module.exports = {
  isMidtransQrisMethod,
  isMidtransTransferMethod,
  isCashPaymentMethod,
  sanitizeMethodForPortal,
  createPayment,
  createCashPayment,
  createMidtransPayment,
  createMidtransTransferPayment,
  getStatus,
  getPaymentMethods,
  getHistory,
  handleMidtransWebhook,
  approvePayment,
  rejectPayment,
  cancelPendingPayment,
  streamInvoicePdf,
  finalizeVerifiedPayment,
};
