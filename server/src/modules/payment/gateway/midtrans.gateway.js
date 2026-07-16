const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const { env } = require('../../../config/env');
const { ApiError } = require('../../../core/ApiError');
const { isEmvQrisString } = require('../dto/payment.dto');

function resolveKeys(method) {
  const serverKey = String(method?.midtransServerKey || env.midtrans.serverKey || '').trim();
  const clientKey = String(method?.midtransClientKey || env.midtrans.clientKey || '').trim();
  // Deteksi otomatis: Mid-server- = Production, SB-Mid-server- = Sandbox
  // (mencegah 401 jika key production dipakai dengan isProduction=false)
  let isProduction = method?.productionMode ?? env.midtrans.isProduction;
  if (/^Mid-server-/.test(serverKey)) isProduction = true;
  if (/^SB-Mid-server-/.test(serverKey)) isProduction = false;
  return { serverKey, clientKey, isProduction };
}

function hasValidMidtransKeys(keys) {
  const sk = String(keys?.serverKey || '').trim();
  const ck = String(keys?.clientKey || '').trim();
  if (!sk || sk.length < 20) return false;
  const invalid = /replace_me|your-|changeme|xxx|placeholder|example|dummy/i;
  if (invalid.test(sk) || invalid.test(ck)) return false;
  // Sandbox: SB-Mid-server- / SB-Mid-client- ; Production: Mid-server- / Mid-client-
  if (!/^SB-Mid-server-|^Mid-server-/.test(sk)) return false;
  if (ck && !/^SB-Mid-client-|^Mid-client-/.test(ck)) return false;
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
  // ASPI border (v2) lebih kompatibel dengan scanner bank/e-wallet QRIS Tap
  const qrAction =
    actions.find((a) => /generate-qr-code-v2/i.test(String(a.name || '')))
    || actions.find((a) => /generate-qr-code|qr-code|qr/i.test(String(a.name || '')))
    || actions.find((a) => /qr/i.test(String(a.url || '')))
    || actions[0];
  const qrUrl = qrAction?.url || chargeResponse.qr_url || null;
  const qrString = chargeResponse.qr_string || chargeResponse.qrString || null;

  return {
    transactionId: chargeResponse.transaction_id || null,
    orderId: chargeResponse.order_id,
    grossAmount: chargeResponse.gross_amount,
    qrString,
    qrUrl,
    acquirer: chargeResponse.acquirer || null,
    expiryTime: chargeResponse.expiry_time ? new Date(chargeResponse.expiry_time) : new Date(Date.now() + 15 * 60 * 1000),
    midtransStatus: chargeResponse.transaction_status || 'pending',
    statusCode: chargeResponse.status_code || '201',
    raw: chargeResponse,
    scannable: isEmvQrisString(qrString),
  };
}

function normalizeBankFromMethod(method) {
  const source = `${method?.merchantName || ''} ${method?.name || ''}`.toLowerCase();
  if (source.includes('bca')) return 'bca';
  if (source.includes('bri')) return 'bri';
  if (source.includes('bni')) return 'bni';
  if (source.includes('mandiri')) return 'mandiri';
  if (source.includes('jateng')) return 'permata';
  return 'bni';
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
 * Snap Sandbox/Production transaction token (Midtrans Snap API).
 * Setelah create, probe enabled_payments — array kosong = kanal MAP belum aktif.
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
  };
  if (Array.isArray(enabledPayments) && enabledPayments.length) {
    parameter.enabled_payments = enabledPayments;
  }

  const result = await snap.createTransaction(parameter);
  const probed = await probeSnapEnabledPayments(result.token, keys.isProduction);
  return {
    snapToken: result.token,
    redirectUrl: result.redirect_url,
    clientKey: keys.clientKey,
    isProduction: keys.isProduction,
    enabledPayments: probed.enabledPayments,
    channelInactive: probed.enabledPayments.length === 0,
  };
}

/**
 * Cek kanal Snap yang aktif untuk token (enabled_payments kosong = QRIS tidak bisa tampil).
 */
async function probeSnapEnabledPayments(snapToken, isProduction) {
  const host = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  try {
    const res = await fetch(`${host}/snap/v1/transactions/${snapToken}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { enabledPayments: [], raw: null };
    const data = await res.json();
    const enabled = Array.isArray(data.enabled_payments) ? data.enabled_payments : [];
    return { enabledPayments: enabled, raw: data };
  } catch {
    return { enabledPayments: [], raw: null };
  }
}

/**
 * Buat method proxy dengan key Sandbox eksplisit (fallback jika Production tanpa kanal).
 */
function withSandboxKeys(method) {
  const sk = String(env.midtrans.sandboxServerKey || '').trim();
  const ck = String(env.midtrans.sandboxClientKey || '').trim();
  if (!hasValidMidtransKeys({ serverKey: sk, clientKey: ck })) return null;
  return {
    ...method,
    midtransServerKey: sk,
    midtransClientKey: ck,
    productionMode: false,
  };
}

/**
 * Charge QRIS Midtrans — menghasilkan qr_string EMV (000201…) yang bisa di-scan
 * GoPay, Dana, ShopeePay, SeaBank, Livin, BRImo, BNI Mobile, BCA, Mandiri, dll.
 * Dana settlement ke rekening merchant (BNI 6513009817) dikonfigurasi di dashboard Midtrans.
 */
async function chargeQris({ orderId, grossAmount, method, customerDetails, itemDetails }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Atur MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env atau di Pengaturan metode QRIS.',
    );
  }

  const core = createCoreApi(method);
  const amount = Math.round(grossAmount);
  const parameter = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: customerDetails,
    // acquirer gopay = QRIS unified (QRIS Tap semua issuer terdaftar BI)
    qris: {
      acquirer: 'gopay',
    },
    item_details: itemDetails || [
      {
        id: orderId.slice(-12),
        price: amount,
        quantity: 1,
        name: 'Pembayaran Tagihan Sekolah',
      },
    ],
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
      'Midtrans tidak mengembalikan kode QR. Pastikan fitur QRIS aktif di dashboard Sandbox Midtrans.',
    );
  }
  if (!extracted.scannable && !extracted.qrUrl) {
    throw ApiError.badRequest(
      'Midtrans tidak mengembalikan QRIS EMV yang valid. Periksa Server Key Sandbox dan aktivasi QRIS.',
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
  probeSnapEnabledPayments,
  withSandboxKeys,
  verifySignature,
  resolveKeys,
  hasValidMidtransKeys,
  isSettlementStatus,
};
