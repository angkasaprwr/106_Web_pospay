import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';

const TABS = [
  { key: 'payments', label: 'Pembayaran' },
  { key: 'arrears', label: 'Tunggakan & Dispensasi' },
  { key: 'dispensations', label: 'Dispensasi' },
];

const COLUMNS = {
  payments: [
    { key: 'date', label: 'Tanggal' },
    { key: 'nis', label: 'NIS' },
    { key: 'student', label: 'Siswa' },
    { key: 'className', label: 'Kelas' },
    { key: 'feeType', label: 'Jenis' },
    { key: 'method', label: 'Metode' },
    { key: 'amountFormatted', label: 'Nominal' },
  ],
  arrears: [
    { key: 'invoiceNo', label: 'Invoice' },
    { key: 'nis', label: 'NIS' },
    { key: 'student', label: 'Siswa' },
    { key: 'className', label: 'Kelas' },
    { key: 'feeType', label: 'Jenis' },
    { key: 'dueDate', label: 'Jatuh Tempo' },
    { key: 'status', label: 'Status' },
    { key: 'outstandingFormatted', label: 'Tunggakan' },
  ],
  dispensations: [
    { key: 'date', label: 'Tanggal' },
    { key: 'nis', label: 'NIS' },
    { key: 'student', label: 'Siswa' },
    { key: 'type', label: 'Tipe' },
    { key: 'status', label: 'Status' },
    { key: 'amountFormatted', label: 'Nominal' },
  ],
};

export default function Reports() {
  const toast = useToast();
  const [tab, setTab] = useState('payments');
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range.from) params.append('from', range.from);
      if (range.to) params.append('to', range.to);
      const { data } = await api.get(`/reports/${tab}?${params}`);
      setData(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [tab, range]); // eslint-disable-line

  useEffect(() => { load(); }, [tab]); // eslint-disable-line

  const exportFile = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      if (range.from) params.append('from', range.from);
      if (range.to) params.append('to', range.to);
      await downloadFile(`/reports/${tab}/export?${params}`, `laporan-${tab}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      toast.success('Laporan diunduh');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const cols = COLUMNS[tab];

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Laporan keuangan & ekspor PDF/Excel"
        actions={
          <>
            <button className="btn-secondary" onClick={() => exportFile('pdf')}><Icon.Download width={16} height={16} /> PDF</button>
            <button className="btn-secondary" onClick={() => exportFile('excel')}><Icon.Download width={16} height={16} /> Excel</button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div><label className="label">Dari</label><input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
          <div><label className="label">Sampai</label><input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          <button className="btn-primary" onClick={load}>Terapkan</button>
        </div>
      </div>

      {data && (
        <div className="mb-4 card flex items-center justify-between p-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
          <span className="text-xl font-bold text-brand-600">{data.totalFormatted}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title="Tidak ada data" icon={Icon.Report} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
