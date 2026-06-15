export function formatIDR(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const BILL_STATUS = {
  UNPAID: { label: 'Belum Bayar', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  PARTIAL: { label: 'Sebagian', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  PAID: { label: 'Lunas', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  OVERDUE: { label: 'Jatuh Tempo', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  WAIVED: { label: 'Dibebaskan', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
};

export const PAYMENT_STATUS = {
  PENDING: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  VERIFIED: { label: 'Terverifikasi', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

export const DISP_STATUS = {
  PENDING: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  APPROVED: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};
