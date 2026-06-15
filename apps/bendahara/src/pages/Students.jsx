import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';

const emptyForm = {
  nis: '', nisn: '', fullName: '', gender: '', classId: '',
  parentName: '', parentPhone: '', phone: '', address: '', createAccount: true,
};

/* ── Small header stat card ── */
function HeaderStat({ icon: IconC, iconBg, label, value, sub }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3 min-w-[140px]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <IconC width={18} height={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

/* ── Custom pagination ── */
function TablePagination({ meta, limit, onPage, onLimit }) {
  if (!meta || meta.total === 0) return null;
  const { page, totalPages, total } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = [];
  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (page <= 3) {
    pages.push(1, 2, 3, '...', totalPages);
  } else if (page >= totalPages - 2) {
    pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
      <p className="text-slate-500 dark:text-slate-400">
        Menampilkan {from} - {to} dari {total.toLocaleString('id-ID')} data
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium transition ${
                p === page
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span>Tampilkan</span>
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {[8, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>data</span>
      </div>
    </div>
  );
}

export default function Students() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [limit, setLimit] = useState(8);
  const [filters, setFilters] = useState({ search: '', classId: '', status: '', page: 1 });
  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      params.set('limit', limit);
      const { data } = await api.get(`/students?${params}`);
      setItems(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters, limit]); // eslint-disable-line

  /* Load per-page data + aggregate stats */
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api.get('/students?limit=1').catch(() => ({ data: { meta: { total: 0 } } })),
      api.get('/students?status=ACTIVE&limit=1').catch(() => ({ data: { meta: { total: 0 } } })),
    ]).then(([all, active]) => {
      const total = all.data.meta?.total || 0;
      const activeCount = active.data.meta?.total || 0;
      setStats({ total, active: activeCount, inactive: total - activeCount });
    });
    api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
  }, []);

  const openCreate = () => { setForm(emptyForm); setModal({ mode: 'create' }); };
  const openEdit = (s) => { setForm({ ...emptyForm, ...s, classId: s.classId || '' }); setModal({ mode: 'edit', data: s }); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/students', form);
        toast.success('Siswa ditambahkan');
      } else {
        const payload = { ...form };
        delete payload.createAccount;
        await api.patch(`/students/${modal.data.id}`, payload);
        toast.success('Siswa diperbarui');
      }
      setModal(null);
      load();
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
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (s) => {
    try {
      const { data } = await api.post(`/students/${s.id}/reset-password`, {});
      toast.success(`Password direset ke: ${data.data.password}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const rowStart = meta ? (meta.page - 1) * limit : 0;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Siswa</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola data siswa dan akun akses sistem POSPAY.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HeaderStat
            icon={Icon.Students}
            iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            label="Total Siswa"
            value={stats.total.toLocaleString('id-ID')}
            sub="Siswa"
          />
          <HeaderStat
            icon={Icon.Check}
            iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            label="Akun Aktif"
            value={stats.active.toLocaleString('id-ID')}
            sub="Siswa"
          />
          <HeaderStat
            icon={Icon.User}
            iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
            label="Belum Aktif"
            value={stats.inactive.toLocaleString('id-ID')}
            sub="Siswa"
          />
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary gap-1.5" onClick={openCreate}>
            <Icon.Plus width={16} height={16} /> Tambah Siswa
          </button>
          <button className="btn-secondary gap-1.5" onClick={() => toast.error('Fitur import akan segera tersedia')}>
            <Icon.Upload width={16} height={16} /> Import Data
          </button>
          <button className="btn-secondary gap-1.5" onClick={() => toast.error('Fitur download template akan segera tersedia')}>
            <Icon.Download width={16} height={16} /> Download Template
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon.Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-60 pl-9 text-sm"
              placeholder="Cari NIS atau nama siswa..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <button
            onClick={() => setShowFilter((o) => !o)}
            className={`btn-secondary gap-1.5 ${showFilter ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filter
          </button>
        </div>
      </div>

      {/* Filter dropdown */}
      {showFilter && (
        <div className="card mb-4 flex flex-wrap gap-3 p-4">
          <div>
            <label className="label text-xs">Kelas</label>
            <select className="input w-auto text-sm" value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value, page: 1 })}>
              <option value="">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select className="input w-auto text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
              <option value="GRADUATED">Lulus</option>
              <option value="TRANSFERRED">Pindah</option>
            </select>
          </div>
          <button className="self-end btn-secondary text-xs" onClick={() => { setFilters({ search: '', classId: '', status: '', page: 1 }); setShowFilter(false); }}>
            Reset
          </button>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada data siswa"
            description="Tambahkan data siswa untuk mulai mengelola tagihan dan pembayaran."
            icon={Icon.Students}
            action={
              <button className="btn-primary mt-2" onClick={openCreate}>
                <Icon.Plus width={16} height={16} /> Tambah Siswa Pertama
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 w-10">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">NIS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Nama Siswa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Username (NIS)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Status Akun</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{rowStart + idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-200">{s.nis}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.schoolClass?.name || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{s.nis}</td>
                    <td className="px-4 py-3">
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Belum Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 border border-brand-200 dark:border-brand-800 transition"
                        >
                          <Icon.Edit width={13} height={13} /> Edit
                        </button>
                        <button
                          onClick={() => resetPassword(s)}
                          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800 transition"
                        >
                          <Icon.Shield width={13} height={13} /> Reset Password
                        </button>
                        <button
                          onClick={() => setConfirm(s)}
                          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition"
                        >
                          <Icon.Trash width={13} height={13} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          meta={meta}
          limit={limit}
          onPage={(p) => setFilters({ ...filters, page: p })}
          onLimit={(l) => { setLimit(l); setFilters({ ...filters, page: 1 }); }}
        />
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Tambah Siswa' : 'Edit Siswa'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIS" required>
            <input className="input" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} required disabled={modal?.mode === 'edit'} />
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
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          {modal?.mode === 'create' && (
            <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} className="accent-brand-600" />
              Buat akun login otomatis (username = NIS, password default)
            </label>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        message={`Hapus siswa "${confirm?.fullName}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={del}
        onClose={() => setConfirm(null)}
        loading={saving}
      />
    </div>
  );
}
