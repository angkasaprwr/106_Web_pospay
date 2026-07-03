import { useEffect, useState, useCallback, useRef } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import StudentCreateModal from './StudentCreateModal';
import ClassManagementSection from './ClassManagementSection';

const emptyForm = {
  nis: '',
  nisn: '',
  fullName: '',
  gender: '',
  classId: '',
  parentName: '',
  parentPhone: '',
  phone: '',
  address: '',
  createAccount: true,
};

function formatClassLabel(name) {
  if (!name) return '-';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

function accountStatus(student) {
  if (student.user?.isActive) return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
  return { label: 'Belum Aktif', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
}

function StatCard({ label, value, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <IconC width={20} height={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

function StudentsPagination({ meta, limit, onPage, onLimit }) {
  if (!meta) return null;
  const { page, total, totalPages } = meta;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
  for (let i = startPage; i <= endPage; i += 1) pages.push(i);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row">
      <p>
        Menampilkan {start} - {end} dari {total} data
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          ‹
        </button>
        {startPage > 1 && (
          <>
            <button type="button" onClick={() => onPage(1)} className="rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
              1
            </button>
            {startPage > 2 && <span className="px-1">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={`min-w-[32px] rounded-lg px-2.5 py-1.5 font-medium ${
              p === page ? 'bg-pospay text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1">…</span>}
            <button type="button" onClick={() => onPage(totalPages)} className="rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          ›
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Tampilkan</span>
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-pospay"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>data</span>
      </div>
    </div>
  );
}

export default function Students() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ search: '', classId: '', status: '', page: 1, limit: 10 });
  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      let page = 1;
      let total = 0;
      let active = 0;
      let inactive = 0;
      let totalPages = 1;
      do {
        const { data } = await api.get(`/students?page=${page}&limit=100`);
        total = data.meta.total;
        totalPages = data.meta.totalPages;
        data.data.forEach((s) => {
          if (s.user?.isActive) active += 1;
          else inactive += 1;
        });
        page += 1;
      } while (page <= totalPages);
      setStats({ total, active, inactive });
    } catch {
      /* ignore stats error */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/students?${params}`);
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
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
  }, []);

  const refreshClasses = useCallback((list) => {
    if (list) setClasses(list);
    else api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setModal({ mode: 'create' });
  };

  const openEdit = (s) => {
    setForm({ ...emptyForm, ...s, classId: s.classId || '' });
    setModal({ mode: 'edit', data: s });
  };

  const save = async (e) => {
    e.preventDefault();
    if (modal?.mode !== 'edit') return;
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.createAccount;
      await api.patch(`/students/${modal.data.id}`, payload);
      toast.success('Siswa diperbarui');
      setModal(null);
      load();
      loadStats();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      await api.delete(`/students/${confirm.id}`);
      toast.success('Siswa dihapus');
      setConfirm(null);
      load();
      loadStats();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/students/${resetTarget.id}/reset-password`, {});
      toast.success(`Password direset ke: ${data.data.password}`);
      setResetTarget(null);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'NIS,NISN,Nama Lengkap,Kelas (contoh: 7A),Jenis Kelamin (L/P),Nama Orang Tua,No HP Orang Tua,Alamat\n';
    const sample = '240101001,,Nama Siswa Contoh,7A,L,Nama Orang Tua,081234567890,Alamat lengkap\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-siswa-pospay.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('NIS'));
      let ok = 0;
      for (const line of lines) {
        const [nis, nisn, fullName, className, gender, parentName, parentPhone, address] = line.split(',').map((c) => c.trim());
        if (!nis || !fullName) continue;
        const cls = classes.find((c) => c.name === className);
        await api.post('/students', {
          nis,
          nisn: nisn || '',
          fullName,
          classId: cls?.id || '',
          gender: gender || undefined,
          parentName: parentName || '',
          parentPhone: parentPhone || '',
          address: address || '',
          password: nis.length >= 6 ? nis : `${nis}123456`.slice(0, 12),
          createAccount: true,
        });
        ok += 1;
      }
      toast.success(`${ok} siswa berhasil diimpor`);
      load();
      loadStats();
    } catch (err) {
      toast.error(apiError(err, 'Import gagal'));
    }
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header + statistik */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Data Siswa</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola data siswa dan akun akses sistem POSPAY.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:max-w-2xl">
          <StatCard
            label="Total Siswa"
            value={`${stats.total} Siswa`}
            icon={Icon.Students}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Akun Aktif"
            value={`${stats.active} Siswa`}
            icon={Icon.Check}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            label="Belum Aktif"
            value={`${stats.inactive} Siswa`}
            icon={Icon.User}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pospay-700">
            <Icon.Plus width={18} height={18} />
            Tambah Siswa
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-pospay/30 bg-white px-4 py-2.5 text-sm font-medium text-pospay hover:bg-pospay-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            <Icon.Upload width={18} height={18} />
            Import Data
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-pospay/30 bg-white px-4 py-2.5 text-sm font-medium text-pospay hover:bg-pospay-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            <Icon.Download width={18} height={18} />
            Download Template
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 lg:w-64 lg:flex-none">
            <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-pospay focus:ring-2 focus:ring-pospay/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Cari NIS atau nama siswa..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
              showFilter ? 'border-pospay bg-pospay-50 text-pospay dark:bg-blue-950/40 dark:text-blue-400' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value, page: 1 })}
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {formatClassLabel(c.name)}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">Semua Status Siswa</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="GRADUATED">Lulus</option>
            <option value="TRANSFERRED">Pindah</option>
          </select>
        </div>
      )}

      {/* Tabel */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Spinner size={32} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada data siswa"
            description="Klik Tambah Siswa untuk menambah data. Data akan tersimpan ke PostgreSQL dan akun login siswa dibuat otomatis."
            icon={Icon.Students}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">No</th>
                  <th className="px-4 py-3 font-medium">NIS</th>
                  <th className="px-4 py-3 font-medium">Nama Siswa</th>
                  <th className="px-4 py-3 font-medium">Kelas</th>
                  <th className="px-4 py-3 font-medium">Username (NIS)</th>
                  <th className="px-4 py-3 font-medium">Status Akun</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, idx) => {
                  const acct = accountStatus(s);
                  const rowNo = (filters.page - 1) * filters.limit + idx + 1;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 text-slate-700 hover:bg-slate-50/50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-500">{rowNo}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.nis}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.fullName}</td>
                      <td className="px-4 py-3">{formatClassLabel(s.schoolClass?.name)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.user?.username || s.nis}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${acct.cls}`}>
                          {acct.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            <Icon.Edit width={14} height={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetTarget(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
                          >
                            <Icon.Lock width={14} height={14} />
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Icon.Trash width={14} height={14} />
                            Hapus
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
          <StudentsPagination
            meta={meta}
            limit={filters.limit}
            onPage={(p) => setFilters({ ...filters, page: p })}
            onLimit={(limit) => setFilters({ ...filters, limit, page: 1 })}
          />
        )}
      </div>

      <ClassManagementSection onClassesChange={refreshClasses} />

      <StudentCreateModal
        open={modal?.mode === 'create'}
        onClose={() => setModal(null)}
        classes={classes}
        onSaved={() => { load(); loadStats(); }}
      />

      <Modal
        open={modal?.mode === 'edit'}
        onClose={() => setModal(null)}
        title="Edit Siswa"
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Batal
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIS" required>
            <input className="input" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} required disabled />
          </Field>
          <Field label="NISN">
            <input className="input" value={form.nisn || ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} />
          </Field>
          <Field label="Nama Lengkap" required>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </Field>
          <Field label="Jenis Kelamin">
            <select className="input" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label="Kelas">
            <select className="input" value={form.classId || ''} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">-</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatClassLabel(c.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="No. HP Siswa">
            <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Nama Orang Tua">
            <input className="input" value={form.parentName || ''} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
          </Field>
          <Field label="No. HP Orang Tua">
            <input className="input" value={form.parentPhone || ''} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Alamat">
              <textarea className="input" rows={2} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        message={`Hapus siswa "${confirm?.fullName}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={del}
        onClose={() => setConfirm(null)}
        loading={saving}
      />

      <ConfirmDialog
        open={!!resetTarget}
        message={`Reset password akun siswa "${resetTarget?.fullName}" (${resetTarget?.nis})?`}
        onConfirm={resetPassword}
        onClose={() => setResetTarget(null)}
        loading={saving}
      />
    </div>
  );
}
