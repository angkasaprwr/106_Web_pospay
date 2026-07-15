const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const { env } = require('../../../config/env');
const { ApiError } = require('../../../core/ApiError');

function resolveKeys(method) {
  return {
    serverKey: method?.midtransServerKey || env.midtrans.serverKey,
    clientKey: method?.midtransClientKey || env.midtrans.clientKey,
    isProduction: method?.productionMode ?? env.midtrans.isProduction,
  };
}

function hasValidMidtransKeys(keys) {
  const sk = String(keys?.serverKey || '').trim();
  const ck = String(keys?.clientKey || '').trim();
  if (!sk || sk.length < 20) return false;
  const invalid = /replace_me|your-|changeme|xxx|placeholder|example|dummy/i;
  if (invalid.test(sk) || invalid.test(ck)) return false;
  if (!/^SB-Mid-server-|^Mid-server-/.test(sk)) return false;
  return true;
}

function createCoreApi(method) {
  const keys = resolveKeys(method);
  return new midtransClient.CoreApi({
    isProduction: keys.isProduction,
    serverKey: keys.serverKey,
    clientKey: keys.clientKey,
  });
}

function verifySignature({ order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signatureKey }, serverKey) {
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return hash === signatureKey;
}

function extractQrisData(chargeResponse) {
  const actions = Array.isArray(chargeResponse.actions) ? chargeResponse.actions : [];
  const qrAction =
    actions.find((a) => /generate-qr-code|qr-code|qr/i.test(String(a.name || '')))
    || actions.find((a) => /qr/i.test(String(a.url || '')))
    || actions[0];
  const qrUrl = qrAction?.url || chargeResponse.qr_url || null;
  // Prefer EMV qr_string; jangan pakai URL HTTP sebagai qrString (nanti kita generate dataURL terpisah).
  const qrString = chargeResponse.qr_string
    || chargeResponse.qrString
    || null;

  return {
    transactionId: chargeResponse.transaction_id || null,
    orderId: chargeResponse.order_id,
    grossAmount: chargeResponse.gross_amount,
    qrString,
    qrUrl,
    expiryTime: chargeResponse.expiry_time ? new Date(chargeResponse.expiry_time) : new Date(Date.now() + 15 * 60 * 1000),
    midtransStatus: chargeResponse.transaction_status || 'pending',
    statusCode: chargeResponse.status_code || '201',
    raw: chargeResponse,
  };
}

function normalizeBankFromMethod(method) {
  const source = `${method?.merchantName || ''} ${method?.name || ''}`.toLowerCase();
  if (source.includes('bca')) return 'bca';
  if (source.includes('bri')) return 'bri';
  if (source.includes('bni')) return 'bni';
  if (source.includes('mandiri')) return 'mandiri';
  if (source.includes('jateng')) return 'permata';
  return 'bca';
}

function createSnapApi(method) {
  const keys = resolveKeys(method);
  return new midtransClient.Snap({
    isProduction: keys.isProduction,
    serverKey: keys.serverKey,
    clientKey: keys.clientKey,
  });
}

/**
 * Snap Sandbox transaction token (Midtrans Snap API).
 * Digunakan untuk fallback / integrasi Snap.js; QRIS custom UI memakai CoreApi.charge(payment_type=qris).
 */
async function createSnapTransaction({ orderId, grossAmount, method, customerDetails, enabledPayments }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Atur MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env.',
    );
  }

  const snap = createSnapApi(method);
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(grossAmount),
    },
    customer_details: customerDetails,
    enabled_payments: enabledPayments || ['qris', 'gopay', 'other_qris'],
  };

  const result = await snap.createTransaction(parameter);
  return {
    snapToken: result.token,
    redirectUrl: result.redirect_url,
    clientKey: keys.clientKey,
    isProduction: keys.isProduction,
  };
}

async function chargeQris({ orderId, grossAmount, method, customerDetails }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Atur MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env atau di Pengaturan metode QRIS.',
    );
  }

  // Midtrans Sandbox (MIDTRANS_IS_PRODUCTION=false): charge payment_type=qris
  // memakai midtrans-client → menghasilkan QR scannable (GoPay/Dana/ShopeePay/dll).
  const core = createCoreApi(method);
  const parameter = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(grossAmount),
    },
    customer_details: customerDetails,
  };

  const response = await core.charge(parameter);
  if (String(response.status_code || '').startsWith('4') || String(response.status_code || '').startsWith('5')) {
    throw ApiError.badRequest(
      `Midtrans menolak charge QRIS (${response.status_code}): ${response.status_message || 'error'}`,
    );
  }
  const extracted = extractQrisData(response);
  if (!extracted.qrString && !extracted.qrUrl) {
    throw ApiError.badRequest(
      'Midtrans tidak mengembalikan kode QR. Pastikan fitur QRIS aktif di dashboard Sandbox Midtrans dan Server Key benar.',
    );
  }
  return extracted;
}

async function chargeBankTransfer({ orderId, grossAmount, method, customerDetails }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Atur MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env atau di Pengaturan metode transfer.',
    );
  }

  const bank = normalizeBankFromMethod(method);
  const core = createCoreApi(method);
  const parameter = {
    payment_type: 'bank_transfer',
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(grossAmount),
    },
    customer_details: customerDetails,
    bank_transfer: {
      bank,
    },
  };

  const response = await core.charge(parameter);
  const va = Array.isArray(response.va_numbers) ? response.va_numbers[0] : null;
  return {
    transactionId: response.transaction_id || null,
    orderId: response.order_id,
    grossAmount: response.gross_amount,
    paymentType: response.payment_type || 'bank_transfer',
    paymentUrl: response.permata_va_number || null,
    vaNumber: va?.va_number || response.permata_va_number || null,
    bank: va?.bank || bank,
    expiryTime: response.expiry_time ? new Date(response.expiry_time) : null,
    midtransStatus: response.transaction_status || 'pending',
    statusCode: response.status_code || '201',
    raw: response,
  };
}

function isSettlementStatus(transactionStatus) {
  return ['settlement', 'capture'].includes(String(transactionStatus || '').toLowerCase());
}

module.exports = {
  chargeQris,
  chargeBankTransfer,
  createSnapTransaction,
  verifySignature,
  resolveKeys,
  hasValidMidtransKeys,
  isSettlementStatus,
};
