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
 */
async function syncMidtransKeysToPaymentMethods() {
  const sk = String(env.midtrans.serverKey || '').trim();
  const ck = String(env.midtrans.clientKey || '').trim();
  if (!sk || !ck) {
    logger.warn(
      'MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY kosong — QRIS tidak bisa di-scan sampai diisi (Sandbox Midtrans).',
    );
    return { updated: 0 };
  }

  const result = await prisma.paymentMethod.updateMany({
    where: {
      gateway: 'midtrans',
      OR: [
        { paymentType: 'QRIS_MIDTRANS' },
        { paymentType: 'TRANSFER_MIDTRANS' },
        { channel: 'QRIS' },
      ],
    },
    data: {
      midtransServerKey: sk,
      midtransClientKey: ck,
      productionMode: env.midtrans.isProduction,
      merchantId: env.midtrans.merchantId || undefined,
      accountNo: '6513009817',
      accountName: 'PAPK SMP PUSPONEGORO BREBES',
    },
  });

  if (result.count > 0) {
    logger.info(`Midtrans keys disinkronkan ke ${result.count} metode pembayaran`);
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
      'Server Key / Client Key Midtrans belum valid. Isi di Pengaturan → Metode Pembayaran (QRIS) dari dashboard Sandbox Midtrans.',
    );
  }

  const orderId = `POSPAY-TEST-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  const charge = await midtransGateway.chargeQris({
    orderId,
    grossAmount: amount,
    method,
    customerDetails: {
      first_name: 'POSPAY Test',
      email: 'test@smppusponegoro.local',
      phone: '081234567890',
    },
    itemDetails: [
      {
        id: 'test-qris',
        price: Math.round(amount),
        quantity: 1,
        name: 'Uji QRIS Sekolah',
      },
    ],
  });

  const qr_url = await resolveQrDisplayUrl(charge.qrUrl, charge.qrString, { serverKey: keys.serverKey });
  const scannable = isEmvQrisString(charge.qrString);

  return {
    success: scannable,
    scannable,
    order_id: orderId,
    transaction_id: charge.transactionId,
    qr_string: charge.qrString,
    qr_url,
    qrDataUrl: qr_url,
    acquirer: charge.acquirer,
    school_account: {
      bank: 'BNI',
      accountNo: method?.accountNo || '6513009817',
      accountName: method?.accountName || 'PAPK SMP PUSPONEGORO BREBES',
    },
    midtrans_simulator_url: 'https://simulator.sandbox.midtrans.com/openapi/qris/index',
    message: scannable
      ? 'QRIS EMV berhasil. Scan via GoPay/Dana/ShopeePay/BRImo/Livin atau Simulator Midtrans Sandbox.'
      : 'Charge berhasil tetapi qr_string belum EMV. Periksa aktivasi QRIS di dashboard Midtrans.',
  };
}

async function applyMidtransKeysFromMethod(data = {}) {
  const sk = String(data.midtransServerKey || '').trim();
  const ck = String(data.midtransClientKey || '').trim();
  if (!sk || !ck) return { written: false, synced: 0 };

  persistMidtransKeysToEnv({
    serverKey: sk,
    clientKey: ck,
    merchantId: data.merchantId,
    isProduction: data.productionMode === true,
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
