const QRCode = require('qrcode');

const CASHLESS_CHANNELS = new Set(['QRIS', 'VIRTUAL_ACCOUNT']);
const E_WALLET_KEYWORDS = ['gopay', 'go pay', 'dana', 'shopeepay', 'shopee pay', 'ovo', 'linkaja', 'e-wallet', 'ewallet'];

function isCashlessPayment(channel, methodName = '') {
  if (CASHLESS_CHANNELS.has(channel)) return true;
  const lower = String(methodName || '').toLowerCase();
  return E_WALLET_KEYWORDS.some((k) => lower.includes(k));
}

function buildQrPayload(payment, method) {
  const account = method?.accountNo || 'REKENING-SEKOLAH';
  const merchant = method?.accountName || 'SMP Pusponegoro Brebes';
  const provider = method?.name || payment.channel;
  return [
    'POSPAY',
    `PROVIDER:${provider}`,
    `REF:${payment.reference}`,
    `AMT:${payment.amount}`,
    `ACC:${account}`,
    `MERCHANT:${merchant}`,
  ].join('|');
}

async function generateQrDataUrl(payment, method) {
  const payload = buildQrPayload(payment, method);
  return QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
}

module.exports = { isCashlessPayment, buildQrPayload, generateQrDataUrl };
