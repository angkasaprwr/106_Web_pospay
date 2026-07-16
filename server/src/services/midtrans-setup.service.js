const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');
const midtransGateway = require('../modules/payment/gateway/midtrans.gateway');
const { resolveQrDisplayUrl, isEmvQrisString } = require('../modules/payment/dto/payment.dto');
const { ApiError } = require('../core/ApiError');

const ENV_PATH = path.resolve(__dirname, '../../.env');

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

/**
 * Simpan key Midtrans ke server/.env + process.env + env object runtime
 * agar charge QRIS EMV langsung aktif tanpa restart.
 */
function persistMidtransKeysToEnv({ serverKey, clientKey, merchantId, isProduction } = {}) {
  const sk = String(serverKey || '').trim();
  const ck = String(clientKey || '').trim();
  if (!sk || !ck) return { written: false };

  // Jangan tulis key tidak valid ke .env (mencegah overwrite Access Key Midtrans)
  if (!midtransGateway.hasValidMidtransKeys({ serverKey: sk, clientKey: ck })) {
    logger.warn('persistMidtransKeysToEnv dibatalkan: format Server/Client Key tidak valid');
    return { written: false, invalid: true };
  }

  if (fs.existsSync(ENV_PATH)) {
    let content = fs.readFileSync(ENV_PATH, 'utf8');
    content = upsertEnvLine(content, 'MIDTRANS_SERVER_KEY', sk);
    content = upsertEnvLine(content, 'MIDTRANS_CLIENT_KEY', ck);
    if (merchantId) content = upsertEnvLine(content, 'MIDTRANS_MERCHANT_ID', String(merchantId).trim());
    if (typeof isProduction === 'boolean') {
      content = upsertEnvLine(content, 'MIDTRANS_IS_PRODUCTION', isProduction ? 'true' : 'false');
    }
    fs.writeFileSync(ENV_PATH, content.endsWith('\n') ? content : `${content}\n`);
  }

  process.env.MIDTRANS_SERVER_KEY = sk;
  process.env.MIDTRANS_CLIENT_KEY = ck;
  env.midtrans.serverKey = sk;
  env.midtrans.clientKey = ck;
  if (merchantId) {
    process.env.MIDTRANS_MERCHANT_ID = String(merchantId).trim();
    env.midtrans.merchantId = String(merchantId).trim();
  }
  if (typeof isProduction === 'boolean') {
    process.env.MIDTRANS_IS_PRODUCTION = isProduction ? 'true' : 'false';
    env.midtrans.isProduction = isProduction;
  }

  logger.info('MIDTRANS_* tersimpan ke server/.env dan aktif di runtime');
  return { written: true };
}

/**
 * Salin MIDTRANS_* dari server/.env ke metode QRIS/Transfer di DB.
 * Prioritas: Sandbox keys (SB-Mid- / MIDTRANS_SANDBOX_*) agar QRIS scannable tidak tertimpa Production mati.
 */
async function syncMidtransKeysToPaymentMethods() {
  const envSk = String(env.midtrans.serverKey || '').trim();
  const envCk = String(env.midtrans.clientKey || '').trim();
  const sbSk = String(env.midtrans.sandboxServerKey || '').trim();
  const sbCk = String(env.midtrans.sandboxClientKey || '').trim();

  // Preferensi Sandbox jika tersedia (user minta SENDBOX aktif untuk QRIS scannable)
  const preferSandbox = midtransGateway.hasValidMidtransKeys({ serverKey: sbSk, clientKey: sbCk })
    || /^SB-Mid-server-/.test(envSk);

  let sk = preferSandbox && sbSk ? sbSk : envSk;
  let ck = preferSandbox && sbCk ? sbCk : envCk;

  // Jika primary adalah SB-, pakai itu
  if (/^SB-Mid-server-/.test(envSk) && /^SB-Mid-client-/.test(envCk)) {
    sk = envSk;
    ck = envCk;
  }

  if (!sk || !ck) {
    logger.warn(
      'MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY kosong — QRIS tidak bisa di-scan sampai diisi (Sandbox/Production Midtrans).',
    );
    return { updated: 0 };
  }
  if (!midtransGateway.hasValidMidtransKeys({ serverKey: sk, clientKey: ck })) {
    logger.warn('MIDTRANS_* di .env tidak valid — skip sync ke metode pembayaran');
    return { updated: 0, invalid: true };
  }

  // Environment ditentukan flag .env, BUKAN prefix Mid-server- (dashboard Sandbox juga memakai Mid-*).
  const isProduction = Boolean(env.midtrans.isProduction);

  // Mode Sandbox: sync key dari .env (Mid-server- atau SB-Mid-server-) ke metode QRIS dengan productionMode=false.
  if (!isProduction) {
    const result = await prisma.paymentMethod.updateMany({
      where: {
        OR: [
          { gateway: 'midtrans' },
          { paymentType: 'QRIS_MIDTRANS' },
          { paymentType: 'TRANSFER_MIDTRANS' },
          { channel: 'QRIS' },
        ],
      },
      data: {
        midtransServerKey: sk,
        midtransClientKey: ck,
        productionMode: false,
        merchantId: env.midtrans.merchantId || 'M852853652',
        gateway: 'midtrans',
        accountNo: '6513009817',
        accountName: 'PAPK SMP PUSPONEGORO BREBES',
      },
    });
    if (result.count > 0) {
      logger.info(`Midtrans Sandbox keys disinkronkan ke ${result.count} metode pembayaran (host api.sandbox.midtrans.com)`);
    }
    return { updated: result.count, sandbox: true };
  }

  // Jangan timpa key Sandbox valid di DB dengan Production yang sama sekali tanpa kanal
  // (kecuali env memang SB- atau preferSandbox).
  if (isProduction && !preferSandbox) {
    const existingSb = await prisma.paymentMethod.findFirst({
      where: {
        channel: 'QRIS',
        OR: [
          { midtransServerKey: { startsWith: 'SB-Mid-server-' } },
          { productionMode: false },
        ],
      },
      select: { id: true, midtransServerKey: true },
    });
    if (existingSb && /^SB-Mid-server-/.test(String(existingSb.midtransServerKey || ''))) {
      logger.info(
        'Pertahankan Server Key Sandbox di metode QRIS (tidak ditimpa Production dari .env).',
      );
      return { updated: 0, preservedSandbox: true };
    }
  }

  const result = await prisma.paymentMethod.updateMany({
    where: {
      OR: [
        { gateway: 'midtrans' },
        { paymentType: 'QRIS_MIDTRANS' },
        { paymentType: 'TRANSFER_MIDTRANS' },
        { channel: 'QRIS' },
      ],
    },
    data: {
      midtransServerKey: sk,
      midtransClientKey: ck,
      productionMode: isProduction,
      merchantId: env.midtrans.merchantId || 'M852853652',
      gateway: 'midtrans',
      accountNo: '6513009817',
      accountName: 'PAPK SMP PUSPONEGORO BREBES',
    },
  });

  if (result.count > 0) {
    logger.info(`Midtrans keys disinkronkan ke ${result.count} metode pembayaran (${isProduction ? 'production' : 'sandbox'})`);
  }
  return { updated: result.count };
}

/**
 * Uji charge QRIS Midtrans Sandbox → harus mengembalikan EMV qr_string (000201…).
 * Digunakan bendahara setelah mengisi Server/Client Key.
 */
async function testQrisCharge({ methodId, amount = 10000 } = {}) {
  let method = null;
  if (methodId) {
    method = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
  }
  if (!method) {
    method = await prisma.paymentMethod.findFirst({
      where: { channel: 'QRIS', isActive: true },
    });
  }

  const keys = midtransGateway.resolveKeys(method);
  if (!midtransGateway.hasValidMidtransKeys(keys)) {
    throw ApiError.badRequest(
      'Server Key / Client Key Midtrans belum valid. Isi di Pengaturan → Metode Pembayaran (QRIS) dari dashboard Midtrans.',
    );
  }

  const orderId = `POSPAY-TEST-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  const customerDetails = {
    first_name: 'POSPAY Test',
    email: 'test@smppusponegoro.local',
    phone: '081234567890',
  };

  try {
    const charge = await midtransGateway.chargeQris({
      orderId,
      grossAmount: amount,
      method,
      customerDetails,
      itemDetails: [{ id: 'test-qris', price: Math.round(amount), quantity: 1, name: 'Uji QRIS Sekolah' }],
    });
    const qr_url = await resolveQrDisplayUrl(charge.qrUrl, charge.qrString, { serverKey: keys.serverKey });
    const scannable = isEmvQrisString(charge.qrString);
    return {
      success: scannable,
      scannable,
      mode: 'core_api',
      order_id: orderId,
      transaction_id: charge.transactionId,
      qr_string: charge.qrString,
      qr_url,
      qrDataUrl: qr_url,
      school_account: {
        bank: 'BNI',
        accountNo: method?.accountNo || '6513009817',
        accountName: method?.accountName || 'PAPK SMP PUSPONEGORO BREBES',
      },
      message: scannable
        ? 'QRIS EMV berhasil (Core API). Scan via GoPay/Dana/ShopeePay/BRImo/Livin.'
        : 'Charge Core OK tetapi qr_string belum EMV.',
    };
  } catch (coreErr) {
    const snap = await midtransGateway.createSnapTransaction({
      orderId,
      grossAmount: amount,
      method,
      customerDetails,
      enabledPayments: undefined,
    });
    const channelInactive = Boolean(snap.channelInactive);
    return {
      success: !channelInactive,
      scannable: !channelInactive,
      mode: 'snap',
      order_id: orderId,
      snap_token: snap.snapToken,
      snap_redirect_url: snap.redirectUrl,
      midtrans_client_key: snap.clientKey,
      midtrans_is_production: snap.isProduction,
      midtrans_channel_inactive: channelInactive,
      enabled_payments: snap.enabledPayments || [],
      school_account: {
        bank: 'BNI',
        accountNo: method?.accountNo || '6513009817',
        accountName: method?.accountName || 'PAPK SMP PUSPONEGORO BREBES',
      },
      message: channelInactive
        ? `Core API QRIS belum aktif (${coreErr.message}). Snap token dibuat tetapi enabled_payments kosong — aktifkan QRIS/GoPay di MAP atau ganti ke key Sandbox (SB-Mid-…).`
        : `Core API QRIS belum aktif (${coreErr.message}). Fallback Snap OK — scan QRIS Tap via halaman Snap (GoPay/Dana/bank).`,
    };
  }
}

async function applyMidtransKeysFromMethod(data = {}) {
  const sk = String(data.midtransServerKey || '').trim();
  const ck = String(data.midtransClientKey || '').trim();
  if (!sk || !ck) return { written: false, synced: 0 };

  // Tolak key palsu (contoh NIS siswa) supaya tidak menimpa Access Key Midtrans yang valid
  const probe = midtransGateway.resolveKeys({
    midtransServerKey: sk,
    midtransClientKey: ck,
    productionMode: data.productionMode === true,
  });
  if (!midtransGateway.hasValidMidtransKeys(probe)) {
    logger.warn('Abaikan simpan Midtrans key tidak valid (bukan Mid-server-/SB-Mid-server-)');
    return { written: false, synced: 0, invalid: true };
  }

  const isProduction = /^Mid-server-/.test(sk)
    ? true
    : (/^SB-Mid-server-/.test(sk) ? false : data.productionMode === true);

  persistMidtransKeysToEnv({
    serverKey: sk,
    clientKey: ck,
    merchantId: data.merchantId || 'M852853652',
    isProduction,
  });
  const synced = await syncMidtransKeysToPaymentMethods();
  return { written: true, synced: synced.updated };
}

module.exports = {
  persistMidtransKeysToEnv,
  syncMidtransKeysToPaymentMethods,
  testQrisCharge,
  applyMidtransKeysFromMethod,
};
