import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../../lib/api';
import { downloadFile } from '../../lib/download';
import { useToast } from '../../context/ToastContext';
import { Spinner, EmptyState } from '../ui';
import { Icon } from '../Icons';
import { formatIDR } from '../../lib/format';

export default function LaporanTunggakanTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/reports/arrears');
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    load();
  }, [load]);

  const exportReport = async (format) => {
    try {
      await downloadFile(`/reports/arrears/export?format=${format}`, `laporan-tunggakan.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      toast.success(`Laporan ${format.toUpperCase()} diunduh`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const cols = [
    { key: 'invoiceNo', label: 'Invoice' },
    { key: 'nis', label: 'NIS' },
    { key: 'student', label: 'Siswa' },
    { key: 'className', label: 'Kelas' },
    { key: 'feeType', label: 'Jenis' },
    { key: 'dueDate', label: 'Jatuh Tempo' },
    { key: 'status', label: 'Status' },
    { key: 'outstandingFormatted', label: 'Tunggakan' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Laporan Tunggakan & Dispensasi</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportReport('pdf')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Icon.Download width={16} height={16} /> PDF
          </button>
          <button type="button" onClick={() => exportReport('excel')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Icon.Download width={16} height={16} /> Excel
          </button>
        </div>
      </div>

      {data && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Tunggakan</p>
          <p className="text-2xl font-bold text-red-600">{data.totalFormatted}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : !data?.rows?.length ? (
          <EmptyState title="Tidak ada data tunggakan" icon={Icon.Warning} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                  {cols.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {cols.map((c) => <td key={c.key} className="px-4 py-3">{r[c.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
