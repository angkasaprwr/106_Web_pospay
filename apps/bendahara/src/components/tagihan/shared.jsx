import { formatIDR, formatDate, BILL_STATUS } from '../../lib/format';

export function StatCard({ label, value, subtext, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="min-w-[130px] flex-1 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{value}</p>
          {subtext && <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtext}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <IconC width={20} height={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

export function TagihanPagination({ meta, limit, onPage, onLimit }) {
  if (!meta) return null;
  const { page, total, totalPages } = meta;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  let startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i += 1) pages.push(i);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex-row">
      <p>
        Menampilkan {start} - {end} dari {total} data
      </p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 px-2 py-1.5 disabled:opacity-40">‹</button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`min-w-[32px] rounded-lg px-2.5 py-1.5 font-medium ${p === page ? 'bg-pospay text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 px-2 py-1.5 disabled:opacity-40">›</button>
      </div>
      {onLimit && (
        <div className="flex items-center gap-2 text-sm">
          <span>Tampilkan</span>
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>data</span>
        </div>
      )}
    </div>
  );
}

const FEE_BADGE = {
  SPP: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  GEDUNG: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  SERAGAM: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  KEGIATAN: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  UJIAN: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

export function FeeTypeBadge({ feeType }) {
  const code = feeType?.code || '';
  const cls = FEE_BADGE[code] || 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {feeType?.name || '-'}
    </span>
  );
}

export function billDisplayName(bill) {
  if (bill.description) return bill.description;
  const period = bill.period ? ` ${bill.period}` : '';
  return `${bill.feeType?.name || 'Tagihan'}${period}`;
}

export function billStatusLabel(status) {
  if (status === 'PAID') return { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
  if (status === 'WAIVED') return { label: 'Dibebaskan', cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' };
  return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
}

export function formatBillDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatClassLabel(name) {
  if (!name) return '-';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

export function paymentStatusDisplay(bill, pendingBillIds) {
  if (bill.status === 'PAID') {
    return { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', key: 'lunas' };
  }
  if (pendingBillIds?.has(bill.id)) {
    return { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', key: 'pending' };
  }
  return { label: 'Belum Bayar', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', key: 'unpaid' };
}

export function paymentBillName(payment) {
  const bill = payment?.bill;
  if (!bill) return '-';
  if (bill.description) return bill.description;
  const period = bill.period ? ` ${bill.period}` : '';
  return `${bill.feeType?.name || 'Tagihan'}${period}`;
}

export function paymentMethodLabel(payment) {
  if (payment.paymentMethod?.name) return payment.paymentMethod.name;
  const channels = { TRANSFER: 'Transfer Bank', CASH: 'Tunai', QRIS: 'QRIS', VIRTUAL_ACCOUNT: 'Virtual Account', OTHER: 'Lainnya' };
  return channels[payment.channel] || payment.channel || '-';
}

export function proofFileMeta(proofUrl) {
  if (!proofUrl) return { name: '-', size: '' };
  const raw = String(proofUrl).split('/').pop()?.split('?')[0] || '';
  const looksLikeUrl = /https?:\/\//i.test(proofUrl) || proofUrl.includes('/uploads/');
  const name = !raw || looksLikeUrl || raw.length > 48 ? 'Bukti transfer' : raw;
  return { name, size: '' };
}

export function proofIsImage(proofUrl) {
  if (!proofUrl) return false;
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(proofUrl);
}

export function verificationStatusBadge(status) {
  if (status === 'VERIFIED') return { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', key: 'verified', color: '#10b981' };
  if (status === 'REJECTED') return { label: 'Ditolak', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', key: 'rejected', color: '#ef4444' };
  return { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', key: 'pending', color: '#f59e0b' };
}

export function buildPaymentTagihanGroups(payments) {
  const map = new Map();
  payments.forEach((p) => {
    const bill = p.bill;
    if (!bill) return;
    const key = `${bill.feeType?.id || ''}|${bill.period || ''}|${bill.description || ''}`;
    if (!map.has(key)) {
      map.set(key, { key, label: paymentBillName(p) });
    }
  });
  return Array.from(map.values());
}

export function dispensationStatusBadge(status) {
  if (status === 'APPROVED') return { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
  if (status === 'REJECTED') return { label: 'Ditolak', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
  return { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
}

const DISP_TYPE_LABEL = { WAIVER: 'Pembebasan', DISCOUNT: 'Potongan', POSTPONE: 'Penundaan' };

export function dispensationTypeLabel(type) {
  return DISP_TYPE_LABEL[type] || type || '-';
}

export function exportDispensationsCsv(items, arrearsMap) {
  const header = 'No,Nama Siswa,NIS,Jumlah Tunggakan,Jumlah Tagihan,Alasan,Tanggal Kesanggupan Bayar,Status\n';
  const rows = items.map((d, i) => {
    const arr = arrearsMap[d.studentId] || { amount: 0, count: 0 };
    const st = dispensationStatusBadge(d.status);
    const cols = [
      i + 1,
      d.student?.fullName,
      d.student?.nis,
      Number(arr.amount),
      arr.count,
      d.reason,
      d.newDueDate ? new Date(d.newDueDate).toLocaleDateString('id-ID') : '',
      st.label,
    ];
    return cols.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tunggakan-dispensasi-pospay-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function tagihanGroupKey(bill) {
  return `${bill.feeTypeId || ''}|${bill.period || ''}|${bill.description || ''}`;
}

export function exportStatusCsv(items, pendingBillIds, paymentDates = {}) {
  const header = 'No,Nama Siswa,Kelas,Tagihan,Nominal,Status,Tanggal Pembayaran\n';
  const rows = items.map((b, i) => {
    const st = paymentStatusDisplay(b, pendingBillIds);
    const cols = [
      i + 1,
      b.student?.fullName,
      formatClassLabel(b.student?.schoolClass?.name),
      billDisplayName(b),
      Number(b.amount),
      st.label,
      paymentDates[b.id] || '',
    ];
    return cols.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `status-pembayaran-pospay-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBillsCsv(items) {
  const header = 'Invoice,Nama Tagihan,Jenis,Periode,Nominal,Jatuh Tempo,Status,Siswa\n';
  const rows = items.map((b) => {
    const cols = [
      b.invoiceNo,
      billDisplayName(b),
      b.feeType?.name,
      b.period || '',
      Number(b.amount),
      b.dueDate ? formatDate(b.dueDate) : '',
      BILL_STATUS[b.status]?.label || b.status,
      b.student?.fullName,
    ];
    return cols.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daftar-tagihan-pospay-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
