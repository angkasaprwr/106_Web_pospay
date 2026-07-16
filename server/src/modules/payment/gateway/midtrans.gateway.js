const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const { env } = require('../../../config/env');
const { ApiError } = require('../../../core/ApiError');
const { logger } = require('../../../utils/logger');
const { isEmvQrisString } = require('../dto/payment.dto');

/** Kanal Snap default — harus cocok dengan yang diaktifkan di MAP Sandbox/Production */
const DEFAULT_SNAP_ENABLED_PAYMENTS = [
  'qris',
  'gopay',
  'shopeepay',
  'bni_va',
  'bca_va',
  'bri_va',
  'other_va',
  'echannel',
];

function resolveKeys(method) {
  const methodSk = String(method?.midtransServerKey || '').trim();
  const methodCk = String(method?.midtransClientKey || '').trim();
  const envSk = String(env.midtrans.serverKey || '').trim();
  const envCk = String(env.midtrans.clientKey || '').trim();
  const sbSk = String(env.midtrans.sandboxServerKey || '').trim();
  const sbCk = String(env.midtrans.sandboxClientKey || '').trim();

  // Preferensi Sandbox: method SB- → env SB- → MIDTRANS_SANDBOX_* → method/env primary
  let serverKey = methodSk || envSk;
  let clientKey = methodCk || envCk;

  const methodIsSb = /^SB-Mid-server-/.test(methodSk);
  const envIsSb = /^SB-Mid-server-/.test(envSk);
  const hasSandboxPair = hasValidMidtransKeys({ serverKey: sbSk, clientKey: sbCk });

  // Jika primary Production tetapi Sandbox tersedia & preferSandbox, pakai Sandbox
  const primaryIsProd = /^Mid-server-/.test(serverKey);
  if (!methodIsSb && !envIsSb && primaryIsProd && hasSandboxPair && env.midtrans.preferSandbox !== false) {
    serverKey = sbSk;
    clientKey = sbCk;
    logger.info('Midtrans: memakai MIDTRANS_SANDBOX_* (preferensi Sandbox)');
  } else if (methodIsSb) {
    serverKey = methodSk;
    clientKey = methodCk || sbCk || envCk;
  } else if (envIsSb) {
    serverKey = envSk;
    clientKey = envCk;
  } else if (hasSandboxPair && !primaryIsProd) {
    serverKey = sbSk;
    clientKey = sbCk;
  }

  let isProduction = method?.productionMode ?? env.midtrans.isProduction;
  if (/^Mid-server-/.test(serverKey)) isProduction = true;
  if (/^SB-Mid-server-/.test(serverKey)) isProduction = false;

  if (isProduction && env.midtrans.isProduction === false) {
    logger.warn(
      'MIDTRANS_IS_PRODUCTION=false tetapi Server Key berawalan Mid-server- (Production). Ganti ke SB-Mid-server-… untuk Sandbox.',
    );
  }

  return { serverKey, clientKey, isProduction };
}

function hasValidMidtransKeys(keys) {
  const sk = String(keys?.serverKey || '').trim();
  const ck = String(keys?.clientKey || '').trim();
  if (!sk || sk.length < 20) return false;
  const invalid = /replace_me|your-|changeme|xxx|placeholder|example|dummy/i;
  if (invalid.test(sk) || invalid.test(ck)) return false;
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

function buildDefaultItemDetails(orderId, amount) {
  return [
    {
      id: String(orderId).slice(-12) || 'ITEM1',
      price: Number(amount),
      quantity: 1,
      name: 'Pembayaran Tagihan Sekolah',
    },
  ];
}

function buildDefaultCustomerDetails(customerDetails) {
  return {
    first_name: customerDetails?.first_name || customerDetails?.firstName || 'Siswa',
    last_name: customerDetails?.last_name || customerDetails?.lastName || '',
    email: customerDetails?.email || 'siswa@smppusponegoro.local',
    phone: customerDetails?.phone || '081234567890',
  };
}

/**
 * Snap createTransaction — payload lengkap + logging + probe kanal.
 */
async function createSnapTransaction({
  orderId,
  grossAmount,
  method,
  customerDetails,
  itemDetails,
  enabledPayments,
} = {}) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Isi MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY Sandbox (SB-Mid-…) di server/.env.',
    );
  }

  const amount = Number(Math.round(Number(grossAmount)));
  if (!Number.isFinite(amount) || amount < 1) {
    throw ApiError.badRequest('gross_amount Midtrans harus Number >= 1');
  }
  if (!orderId || String(orderId).length < 5) {
    throw ApiError.badRequest('order_id Midtrans wajib unik');
  }

  const payments = Array.isArray(enabledPayments) && enabledPayments.length
    ? enabledPayments
    : DEFAULT_SNAP_ENABLED_PAYMENTS;

  const parameter = {
    transaction_details: {
      order_id: String(orderId),
      gross_amount: amount, // Number (bukan string)
    },
    customer_details: buildDefaultCustomerDetails(customerDetails),
    item_details: Array.isArray(itemDetails) && itemDetails.length
      ? itemDetails.map((it) => ({
        id: String(it.id || 'ITEM').slice(0, 50),
        price: Number(Math.round(Number(it.price))),
        quantity: Number(it.quantity || 1),
        name: String(it.name || 'Tagihan').slice(0, 50),
      }))
      : buildDefaultItemDetails(orderId, amount),
    enabled_payments: payments,
  };

  logger.info('Midtrans Snap createTransaction REQUEST', {
    isProduction: keys.isProduction,
    keyPrefix: keys.serverKey.slice(0, 14),
    merchantId: env.midtrans.merchantId || null,
    parameter,
  });
  // eslint-disable-next-line no-console
  console.log('[Midtrans Snap] parameter', JSON.stringify(parameter, null, 2));

  const snap = createSnapApi(method);
  let result;
  try {
    result = await snap.createTransaction(parameter);
  } catch (err) {
    const apiBody = err.ApiResponse || err.httpStatusCode || err.message;
    logger.error('Midtrans Snap createTransaction FAILED', apiBody);
    // eslint-disable-next-line no-console
    console.error('[Midtrans Snap] error response', apiBody);
    throw ApiError.badRequest(
      `Gagal createTransaction Midtrans: ${typeof apiBody === 'object' ? JSON.stringify(apiBody) : apiBody}`,
    );
  }

  logger.info('Midtrans Snap createTransaction RESPONSE', {
    token: result.token,
    redirect_url: result.redirect_url,
  });
  // eslint-disable-next-line no-console
  console.log('[Midtrans Snap] response', JSON.stringify({
    token: result.token,
    redirect_url: result.redirect_url,
  }, null, 2));

  const probed = await probeSnapEnabledPayments(result.token, keys.isProduction);
  const channelInactive = !probed.enabledPayments || probed.enabledPayments.length === 0;

  if (channelInactive) {
    logger.warn('Midtrans Snap enabled_payments KOSONG — No payment channels available', {
      isProduction: keys.isProduction,
      keyPrefix: keys.serverKey.slice(0, 14),
      probe: probed.raw,
    });
    // eslint-disable-next-line no-console
    console.warn('[Midtrans Snap] enabled_payments kosong. Probe lengkap:', JSON.stringify(probed.raw, null, 2));
  } else {
    logger.info('Midtrans Snap payment channels', probed.enabledPayments);
  }

  return {
    snapToken: result.token,
    redirectUrl: result.redirect_url,
    clientKey: keys.clientKey,
    isProduction: keys.isProduction,
    enabledPayments: probed.enabledPayments,
    channelInactive,
    transactionStatus: 'pending',
    probeRaw: probed.raw,
    requestParameter: parameter,
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
    if (!res.ok) return { enabledPayments: [], raw: { httpStatus: res.status } };
    const data = await res.json();
    const enabled = Array.isArray(data.enabled_payments) ? data.enabled_payments : [];
    return { enabledPayments: enabled, raw: data };
  } catch (e) {
    return { enabledPayments: [], raw: { error: e.message } };
  }
}

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

async function chargeQris({ orderId, grossAmount, method, customerDetails, itemDetails }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Konfigurasi Midtrans belum lengkap. Atur MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di server/.env atau di Pengaturan metode QRIS.',
    );
  }

  const core = createCoreApi(method);
  const amount = Number(Math.round(Number(grossAmount)));
  const parameter = {
    payment_type: 'qris',
    transaction_details: {
      order_id: String(orderId),
      gross_amount: amount,
    },
    customer_details: buildDefaultCustomerDetails(customerDetails),
    qris: { acquirer: 'gopay' },
    item_details: Array.isArray(itemDetails) && itemDetails.length
      ? itemDetails
      : buildDefaultItemDetails(orderId, amount),
  };

  logger.info('Midtrans Core QRIS charge REQUEST', { isProduction: keys.isProduction, parameter });
  // eslint-disable-next-line no-console
  console.log('[Midtrans Core QRIS] parameter', JSON.stringify(parameter, null, 2));

  const response = await core.charge(parameter);
  // eslint-disable-next-line no-console
  console.log('[Midtrans Core QRIS] response', JSON.stringify({
    status_code: response.status_code,
    status_message: response.status_message,
    transaction_id: response.transaction_id,
    qr_string: (response.qr_string || '').slice(0, 40),
    actions: response.actions,
  }, null, 2));

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
      order_id: String(orderId),
      gross_amount: Number(Math.round(Number(grossAmount))),
    },
    customer_details: buildDefaultCustomerDetails(customerDetails),
    bank_transfer: { bank },
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
  DEFAULT_SNAP_ENABLED_PAYMENTS,
};
