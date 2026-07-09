const KEY = 'pospay_siswa_bill_payment_draft';
const LAST_PAYMENT_KEY = 'pospay_siswa_last_payment';

export function saveBillPaymentDraft(draft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadBillPaymentDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBillPaymentDraft() {
  sessionStorage.removeItem(KEY);
}

export function saveLastPayment(payment) {
  sessionStorage.setItem(LAST_PAYMENT_KEY, JSON.stringify(payment));
}

export function loadLastPayment() {
  try {
    const raw = sessionStorage.getItem(LAST_PAYMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLastPayment() {
  sessionStorage.removeItem(LAST_PAYMENT_KEY);
}

const CASHLESS_CHANNELS = new Set(['QRIS', 'VIRTUAL_ACCOUNT']);
const E_WALLET_KEYWORDS = ['gopay', 'go pay', 'dana', 'shopeepay', 'shopee pay', 'ovo', 'linkaja', 'e-wallet', 'ewallet'];

export function isCashlessMethod(method) {
  if (!method) return false;
  if (isMidtransQrisMethod(method)) return true;
  if (CASHLESS_CHANNELS.has(method.channel)) return true;
  const lower = String(method.name || '').toLowerCase();
  return E_WALLET_KEYWORDS.some((k) => lower.includes(k));
}

export function isMidtransQrisMethod(method) {
  if (!method) return false;
  return method.paymentType === 'QRIS_MIDTRANS' || (method.gateway === 'midtrans' && method.channel === 'QRIS');
}

export function isMidtransTransferMethod(method) {
  if (!method) return false;
  return method.paymentType === 'TRANSFER_MIDTRANS' || (method.gateway === 'midtrans' && method.channel === 'TRANSFER');
}

const CASH_KEYWORDS = ['tunai', 'cash', 'loket'];

export function isCashMethod(method) {
  if (!method) return false;
  if (method.channel === 'CASH') return true;
  const lower = String(method.name || '').toLowerCase();
  return CASH_KEYWORDS.some((k) => lower.includes(k));
}

export function isTransferMethod(method) {
  if (!method) return false;
  return isMidtransTransferMethod(method) || (!isCashlessMethod(method) && !isCashMethod(method));
}
