import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../ui';
import { Icon } from '../Icons';
import { formatIDR } from '../../lib/format';
import {
  FeeTypeBadge,
  TagihanPagination,
  billDisplayName,
  billStatusLabel,
  formatBillDate,
  exportBillsCsv,
} from './shared';
import FeeTypeManagementSection from '../../pages/FeeTypeManagementSection';
import { deleteOnce } from '../../lib/deleteOnce';

export default function DaftarTagihanTab({ onStatsChange }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    feeTypeId: '',
    classId: '',
    academicYearId: '',
    period: '',
    page: 1,
    limit: 5,
  });
  const [modal, setModal] = useState(null);
  const [single, setSingle] = useState({ studentId: '', feeTypeId: '', amount: '', dueDate: '', period: '', description: '', academicYearId: '' });
  const [bulk, setBulk] = useState({ feeTypeId: '', amount: '', dueDate: '', period: '', target: 'ALL', classId: '', academicYearId: '', description: '' });
  const [editForm, setEditForm] = useState({ description: '', amount: '', dueDate: '', period: '' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const { period, search, ...rest } = filters;
      Object.entries(rest).forEach(([k, v]) => v && params.append(k, v));
      const q = period || search;
      if (q) params.set('search', q);
      const { data } = await api.get(`/bills?${params}`);
      setItems(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onStatsChange?.();
  }, [items, onStatsChange]);

  useEffect(() => {
    api.get('/masterdata/fee-types').then(({ data }) => setFeeTypes(data.data)).catch(() => {});
    api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
    api.get('/masterdata/academic-years').then(({ data }) => setYears(data.data)).catch(() => {});
    api.get('/students?limit=100').then(({ data }) => setStudents(data.data)).catch(() => {});
  }, []);

  const refreshFeeTypes = useCallback((list) => {
    if (list) setFeeTypes(list);
    else api.get('/masterdata/fee-types').then(({ data }) => setFeeTypes(data.data)).catch(() => {});
  }, []);

  const onFeeChange = (id, setter, current) => {
    const ft = feeTypes.find((f) => f.id === id);
    setter({ ...current, feeTypeId: id, amount: ft ? Number(ft.defaultAmount) : current.amount });
  };

  const saveSingle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/bills', single);
      toast.success('Tagihan dibuat dan akan muncul di akun siswa');
      setModal(null);
      load();
      onStatsChange?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveBulk = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/bills/bulk', bulk);
      toast.success(`${data.data.created} tagihan dibuat`);
      setModal(null);
      load();
      onStatsChange?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/bills/${modal.data.id}`, editForm);
      toast.success('Tagihan diperbarui');
      setModal(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirm?.id || saving) return;
    setSaving(true);
    try {
      await deleteOnce(`bill:${confirm.id}`, async () => {
        await api.delete(`/bills/${confirm.id}`);
      });
      toast.success('Tagihan dihapus permanen');
      setConfirm(null);
      load();
      onStatsChange?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (b) => {
    setEditForm({
      description: b.description || '',
      amount: Number(b.amount),
      dueDate: b.dueDate ? b.dueDate.slice(0, 10) : '',
      period: b.period || '',
    });
    setModal({ mode: 'edit', data: b });
  };

  return (
    <div className="space-y-6">
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">A. Daftar Tagihan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Buat dan kelola daftar tagihan sekolah.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2.5 text-sm font-semibold text-white hover:bg-pospay-700"
          >
            <Icon.Plus width={18} height={18} />
            Buat Tagihan Baru
          </button>
          <button
            type="button"
            onClick={() => exportBillsCsv(items)}
            disabled={!items.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Icon.Download width={18} height={18} />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-50 p-4 dark:border-slate-800">
        <select
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={filters.academicYearId}
          onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value, page: 1 })}
        >
          <option value="">Tahun Ajaran</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={filters.feeTypeId}
          onChange={(e) => setFilters({ ...filters, feeTypeId: e.target.value, page: 1 })}
        >
          <option value="">Semua Jenis</option>
          {feeTypes.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={filters.period}
          onChange={(e) => setFilters({ ...filters, period: e.target.value, page: 1 })}
        >
          <option value="">Semua Periode</option>
          <option value="2025-01">Januari 2025</option>
          <option value="2025-02">Februari 2025</option>
          <option value="2025-07">Juli 2025</option>
          <option value="2025-09">September 2025</option>
        </select>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Cari nama tagihan..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada tagihan" description="Klik Buat Tagihan Baru. Data tersimpan ke PostgreSQL dan muncul di akun siswa." icon={Icon.Bills} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Nama Tagihan</th>
                <th className="px-4 py-3 font-medium">Jenis Tagihan</th>
                <th className="px-4 py-3 font-medium">Periode</th>
                <th className="px-4 py-3 font-medium text-right">Nominal</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Dibuat Oleh</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b, idx) => {
                const st = billStatusLabel(b.status);
                const rowNo = (filters.page - 1) * filters.limit + idx + 1;
                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-500">{rowNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{billDisplayName(b)}</td>
                    <td className="px-4 py-3"><FeeTypeBadge feeType={b.feeType} /></td>
                    <td className="px-4 py-3">{b.period || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatIDR(b.amount)}</td>
                    <td className="px-4 py-3">{formatBillDate(b.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">Bendahara</p>
                      <p className="text-xs text-slate-400">{formatBillDate(b.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => openEdit(b)} className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600 hover:bg-blue-100" title="Edit">
                          <Icon.Edit width={16} height={16} />
                        </button>
                        <button type="button" onClick={() => setConfirm(b)} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Hapus">
                          <Icon.Trash width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && items.length > 0 && (
        <TagihanPagination
          meta={meta}
          limit={filters.limit}
          onPage={(p) => setFilters({ ...filters, page: p })}
          onLimit={(limit) => setFilters({ ...filters, limit, page: 1 })}
        />
      )}

      <div className="mx-4 mb-4 flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <Icon.Info width={20} height={20} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <p>
          <strong>Informasi:</strong> Tagihan yang dibuat akan otomatis muncul di akun siswa. Pastikan nominal dan jatuh tempo sudah sesuai.
        </p>
      </div>

      <Modal
        open={modal?.mode === 'create'}
        onClose={() => setModal(null)}
        title="Buat Tagihan Baru"
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal({ mode: 'bulk' })}>Tagihan Massal</button>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button type="button" className="btn-primary" onClick={saveSingle} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
          </>
        }
      >
        <form onSubmit={saveSingle} className="space-y-4">
          <Field label="Siswa" required>
            <select className="input" value={single.studentId} onChange={(e) => setSingle({ ...single, studentId: e.target.value })} required>
              <option value="">Pilih siswa</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.nis} - {s.fullName}</option>)}
            </select>
          </Field>
          <Field label="Jenis Tagihan" required>
            <select className="input" value={single.feeTypeId} onChange={(e) => onFeeChange(e.target.value, setSingle, single)} required>
              <option value="">Pilih jenis</option>
              {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nominal" required><input type="number" className="input" value={single.amount} onChange={(e) => setSingle({ ...single, amount: e.target.value })} required /></Field>
            <Field label="Jatuh Tempo"><input type="date" className="input" value={single.dueDate} onChange={(e) => setSingle({ ...single, dueDate: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Periode"><input className="input" placeholder="2025-09" value={single.period} onChange={(e) => setSingle({ ...single, period: e.target.value })} /></Field>
            <Field label="Nama Tagihan"><input className="input" value={single.description} onChange={(e) => setSingle({ ...single, description: e.target.value })} placeholder="SPP Bulanan Januari 2025" /></Field>
          </div>
        </form>
      </Modal>

      <Modal open={modal?.mode === 'bulk'} onClose={() => setModal(null)} title="Tagihan Massal" footer={<><button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button type="button" className="btn-primary" onClick={saveBulk} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Buat'}</button></>}>
        <form onSubmit={saveBulk} className="space-y-4">
          <Field label="Jenis Tagihan" required>
            <select className="input" value={bulk.feeTypeId} onChange={(e) => onFeeChange(e.target.value, setBulk, bulk)} required>
              <option value="">Pilih jenis</option>
              {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Target">
            <select className="input" value={bulk.target} onChange={(e) => setBulk({ ...bulk, target: e.target.value })}>
              <option value="ALL">Semua Siswa Aktif</option>
              <option value="CLASS">Per Kelas</option>
            </select>
          </Field>
          {bulk.target === 'CLASS' && (
            <Field label="Kelas" required>
              <select className="input" value={bulk.classId} onChange={(e) => setBulk({ ...bulk, classId: e.target.value })} required>
                <option value="">Pilih kelas</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nominal" required><input type="number" className="input" value={bulk.amount} onChange={(e) => setBulk({ ...bulk, amount: e.target.value })} required /></Field>
            <Field label="Jatuh Tempo"><input type="date" className="input" value={bulk.dueDate} onChange={(e) => setBulk({ ...bulk, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Periode"><input className="input" value={bulk.period} onChange={(e) => setBulk({ ...bulk, period: e.target.value })} /></Field>
          <Field label="Nama Tagihan"><input className="input" value={bulk.description} onChange={(e) => setBulk({ ...bulk, description: e.target.value })} /></Field>
        </form>
      </Modal>

      <Modal open={modal?.mode === 'edit'} onClose={() => setModal(null)} title="Edit Tagihan" footer={<><button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button type="button" className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        <form onSubmit={saveEdit} className="space-y-4">
          <Field label="Nama Tagihan"><input className="input" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nominal" required><input type="number" className="input" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required /></Field>
            <Field label="Jatuh Tempo"><input type="date" className="input" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Periode"><input className="input" value={editForm.period} onChange={(e) => setEditForm({ ...editForm, period: e.target.value })} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} message={`Hapus tagihan "${billDisplayName(confirm || {})}"?`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>

    <FeeTypeManagementSection onFeeTypesChange={refreshFeeTypes} />
    </div>
  );
}
