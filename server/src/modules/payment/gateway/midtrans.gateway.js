const crypto = require('crypto');
const { env } = require('../../../config/env');
const {
  resolveEnvMidtransKeys,
  createSnapFromEnv,
  createCoreFromEnv,
  keyPrefix,
  isProductionFlag,
} = require('../../../config/midtrans.config');
const { ApiError } = require('../../../core/ApiError');
const { logger } = require('../../../utils/logger');
const { isEmvQrisString } = require('../dto/payment.dto');

/** Hanya QRIS — agar Snap/Core menampilkan QRIS scannable lintas e-wallet/bank */
const DEFAULT_SNAP_ENABLED_PAYMENTS = [
  'qris',
];

const QRIS_EXPIRY_HOURS = 24;

/**
 * Resolve keys: environment ditentukan MIDTRANS_IS_PRODUCTION, bukan prefix key.
 * Dashboard Sandbox boleh menampilkan Mid-server- / Mid-client-.
 */
function resolveKeys(method) {
  const resolved = resolveEnvMidtransKeys(method);
  return {
    serverKey: resolved.serverKey,
    clientKey: resolved.clientKey,
    isProduction: resolved.isProduction,
    mode: resolved.mode,
    source: resolved.source,
  };
}

/**
 * Siap untuk QRIS Sandbox: mode non-production + Server/Client Key valid (Mid-* atau SB-Mid-*).
 */
function isSandboxKeyPair(keys) {
  const sk = String(keys?.serverKey || '');
  const ck = String(keys?.clientKey || '');
  if (!sk || sk.length < 20) return false;
  if (!/^SB-Mid-server-|^Mid-server-/.test(sk)) return false;
  if (ck && !/^SB-Mid-client-|^Mid-client-/.test(ck)) return false;
  // Mode harus Sandbox (host api.sandbox.midtrans.com)
  if (keys?.isProduction === true) return false;
  if (isProductionFlag()) return false;
  return true;
}

function assertSandboxConfigured(method) {
  const keys = resolveKeys(method);
  if (!keys.serverKey) {
    throw ApiError.badRequest(
      'MIDTRANS_SERVER_KEY kosong. Isi Server Key dari dashboard.sandbox.midtrans.com → Settings → Access Keys ke server/.env.',
    );
  }
  if (!keys.clientKey) {
    throw ApiError.badRequest(
      'MIDTRANS_CLIENT_KEY kosong. Isi Client Key dari dashboard.sandbox.midtrans.com → Settings → Access Keys ke server/.env.',
    );
  }
  if (env.midtrans.isProduction === false && !isSandboxKeyPair(keys)) {
    throw ApiError.badRequest(
      'QRIS Sandbox belum siap. '
      + `Mode=${keys.mode || 'Sandbox'}, Server Prefix=${keyPrefix(keys.serverKey, 'server')}, `
      + `Client Prefix=${keyPrefix(keys.clientKey, 'client')}. `
      + 'Pastikan MIDTRANS_IS_PRODUCTION=false dan Server/Client Key dari dashboard Sandbox tersimpan di server/.env, lalu restart.',
    );
  }
  return keys;
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
  const { core } = createCoreFromEnv(method);
  return core;
}

function createSnapApi(method) {
  // Pola resmi: isProduction dari env string "true", key dari dotenv
  const { snap } = createSnapFromEnv(method);
  return snap;
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
    // Masa berlaku QRIS / Snap: 24 jam
    expiry: {
      unit: 'hour',
      duration: QRIS_EXPIRY_HOURS,
    },
  };

  logger.info('Midtrans Snap createTransaction REQUEST', {
    mode: keys.mode || (keys.isProduction ? 'Production' : 'Sandbox'),
    isProduction: keys.isProduction,
    envIsProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKeyPrefix: keyPrefix(keys.serverKey, 'server'),
    clientKeyPrefix: keyPrefix(keys.clientKey, 'client'),
    keySource: keys.source || null,
    merchantId: env.midtrans.merchantId || null,
    enabled_payments: payments,
    order_id: parameter.transaction_details.order_id,
    gross_amount: parameter.transaction_details.gross_amount,
  });
  // eslint-disable-next-line no-console
  console.log('[Midtrans Snap] Mode:', keys.isProduction ? 'Production' : 'Sandbox');
  // eslint-disable-next-line no-console
  console.log('[Midtrans Snap] Server Key Prefix:', keyPrefix(keys.serverKey, 'server'));
  // eslint-disable-next-line no-console
  console.log('[Midtrans Snap] Client Key Prefix:', keyPrefix(keys.clientKey, 'client'));
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
    const statusHint = /401|unauthorized|unknown merchant/i.test(JSON.stringify(apiBody))
      ? ' (kemungkinan Server/Client Key salah atau key Production dipakai di host Sandbox)'
      : '';
    throw ApiError.badRequest(
      `Gagal createTransaction Midtrans${statusHint}: ${typeof apiBody === 'object' ? JSON.stringify(apiBody) : apiBody}`,
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

  // Probe host harus cocok dengan isProduction flag env (Sandbox vs Production app URL)
  const probeIsProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const probed = await probeSnapEnabledPayments(result.token, probeIsProd);
  const channelInactive = !probed.enabledPayments || probed.enabledPayments.length === 0;

  if (channelInactive) {
    const cause = diagnoseEmptyChannels(keys, probed);
    logger.error('Midtrans Snap: No payment channels available — penyebab', cause);
    // eslint-disable-next-line no-console
    console.error('[Midtrans Snap] No payment channels available');
    // eslint-disable-next-line no-console
    console.error('[Midtrans Snap] PENYEBAB:', cause.summary);
    // eslint-disable-next-line no-console
    console.error('[Midtrans Snap] Detail:', JSON.stringify(cause, null, 2));
    // eslint-disable-next-line no-console
    console.warn('[Midtrans Snap] enabled_payments kosong. Probe:', JSON.stringify(probed.raw, null, 2));
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
    channelInactiveCause: channelInactive ? diagnoseEmptyChannels(keys, probed) : null,
    transactionStatus: 'pending',
    probeRaw: probed.raw,
    requestParameter: parameter,
  };
}

function diagnoseEmptyChannels(keys, probed) {
  const reasons = [];
  if (process.env.MIDTRANS_IS_PRODUCTION === 'true') {
    reasons.push('Mode Production: pastikan kanal QRIS/GoPay aktif di MAP Production.');
  } else if (!keys.serverKey) {
    reasons.push('SERVER_KEY kosong.');
  } else if (!keys.clientKey) {
    reasons.push('CLIENT_KEY kosong.');
  }
  if (Array.isArray(probed?.enabledPayments) && probed.enabledPayments.length === 0) {
    reasons.push('Snap token valid tetapi enabled_payments kosong — aktifkan QRIS/GoPay/ShopeePay/Transfer di Midtrans MAP Sandbox.');
  }
  if (probed?.raw?.httpStatus) {
    reasons.push(`Probe Snap HTTP ${probed.raw.httpStatus}.`);
  }
  return {
    summary: reasons.join(' ') || 'enabled_payments kosong dari Midtrans (kanal belum aktif di MAP).',
    reasons,
    mode: keys.mode || (keys.isProduction ? 'Production' : 'Sandbox'),
    serverKeyPrefix: keyPrefix(keys.serverKey, 'server'),
    clientKeyPrefix: keyPrefix(keys.clientKey, 'client'),
    keySource: keys.source || null,
    requestedEnabledPayments: DEFAULT_SNAP_ENABLED_PAYMENTS,
    probeEnabledPayments: probed?.enabledPayments || [],
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
      ? itemDetails.map((it) => ({
        id: String(it.id || 'ITEM').slice(0, 50),
        price: Number(Math.round(Number(it.price))),
        quantity: Number(it.quantity || 1),
        name: String(it.name || 'Tagihan').slice(0, 50),
      }))
      : buildDefaultItemDetails(orderId, amount),
    // Masa berlaku QRIS Midtrans: 24 jam
    custom_expiry: {
      expiry_duration: QRIS_EXPIRY_HOURS,
      unit: 'hour',
    },
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
  if (!extracted.qrString) {
    logger.error('QRIS Created FAILED: qr_string kosong dari Midtrans', {
      orderId,
      status_code: response.status_code,
      actions: response.actions,
    });
  }
  if (!extracted.qrUrl) {
    logger.warn('QRIS Created: qr_url kosong — akan render dari qr_string EMV Midtrans', { orderId });
  }
  if (!extracted.qrString && !extracted.qrUrl) {
    throw ApiError.badRequest(
      'Midtrans tidak mengembalikan kode QR. Pastikan fitur QRIS aktif di dashboard Sandbox Midtrans.',
    );
  }
  // QR wajib EMV Midtrans (000201...) — jangan pakai order_id/snap_token sebagai payload QR
  if (extracted.qrString && !isEmvQrisString(extracted.qrString)) {
    logger.error('QRIS Created REJECTED: qr_string bukan EMV Midtrans', {
      orderId,
      prefix: String(extracted.qrString).slice(0, 20),
    });
    throw ApiError.badRequest(
      'QRIS dari Midtrans tidak valid (bukan payload EMV). Jangan gunakan order_id/snap_token sebagai QR.',
    );
  }
  // Pastikan expiry 24 jam tersimpan
  if (!extracted.expiryTime || Number.isNaN(new Date(extracted.expiryTime).getTime())) {
    extracted.expiryTime = new Date(Date.now() + QRIS_EXPIRY_HOURS * 60 * 60 * 1000);
  }
  logger.info('QRIS Created', {
    orderId: extracted.orderId,
    transactionId: extracted.transactionId,
    expiryTime: extracted.expiryTime,
    qrEmv: true,
    hasQrUrl: Boolean(extracted.qrUrl),
    qrLen: (extracted.qrString || '').length,
  });
  // eslint-disable-next-line no-console
  console.log('[Midtrans] QRIS Created order=', extracted.orderId, 'expiry=', extracted.expiryTime);
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
  isSandboxKeyPair,
  assertSandboxConfigured,
  isSettlementStatus,
  DEFAULT_SNAP_ENABLED_PAYMENTS,
  QRIS_EXPIRY_HOURS,
};
