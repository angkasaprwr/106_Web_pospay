const KEY = 'pospay_siswa_bill_payment_draft';

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
