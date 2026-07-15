const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

/**
 * Salin MIDTRANS_* dari server/.env ke metode QRIS/Transfer di DB
 * agar bendahara tidak perlu mengisi ulang di Pengaturan.
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
    },
  });

  if (result.count > 0) {
    logger.info(`Midtrans keys disinkronkan ke ${result.count} metode pembayaran`);
  }
  return { updated: result.count };
}

module.exports = { syncMidtransKeysToPaymentMethods };
