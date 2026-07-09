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
  if (CASHLESS_CHANNELS.has(method.channel)) return true;
  const lower = String(method.name || '').toLowerCase();
  return E_WALLET_KEYWORDS.some((k) => lower.includes(k));
}
