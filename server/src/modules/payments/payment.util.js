const QRCode = require('qrcode');

const CASHLESS_CHANNELS = new Set(['QRIS', 'VIRTUAL_ACCOUNT']);
const E_WALLET_KEYWORDS = ['gopay', 'go pay', 'dana', 'shopeepay', 'shopee pay', 'ovo', 'linkaja', 'e-wallet', 'ewallet'];

const CASH_KEYWORDS = ['tunai', 'cash', 'loket'];

function isMidtransQrisMethod(method) {
  if (!method) return false;
  if (typeof method === 'object') {
    return method.gateway === 'midtrans' || method.paymentType === 'QRIS_MIDTRANS';
  }
  return false;
}

function isCashlessPayment(channel, methodName = '', method = null) {
  if (isMidtransQrisMethod(method)) return true;
  if (CASHLESS_CHANNELS.has(channel)) return true;
  const lower = String(methodName || '').toLowerCase();
  return E_WALLET_KEYWORDS.some((k) => lower.includes(k));
}

function isCashMethod(channel, methodName = '') {
  if (channel === 'CASH') return true;
  const lower = String(methodName || '').toLowerCase();
  return CASH_KEYWORDS.some((k) => lower.includes(k));
}

function requiresProofUpload(channel, methodName = '') {
  return !isCashlessPayment(channel, methodName) && !isCashMethod(channel, methodName);
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

module.exports = {
  isMidtransQrisMethod,
  isCashlessPayment,
  isCashMethod,
  requiresProofUpload,
  buildQrPayload,
  generateQrDataUrl,
};
