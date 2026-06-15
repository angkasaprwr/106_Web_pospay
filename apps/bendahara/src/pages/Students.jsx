import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Pagination, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';

const emptyForm = { nis: '', nisn: '', fullName: '', gender: '', classId: '', parentName: '', parentPhone: '', phone: '', address: '', createAccount: true };

export default function Students() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ search: '', classId: '', status: '', page: 1 });
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', data}
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

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
    api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ mode: 'create' });
  };
  const openEdit = (s) => {
    setForm({ ...emptyForm, ...s, classId: s.classId || '' });
    setModal({ mode: 'edit', data: s });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (modal.mode === 'create') {
        await api.post('/students', payload);
        toast.success('Siswa ditambahkan');
      } else {
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

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        subtitle="Kelola data dan akun siswa"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Icon.Plus width={18} height={18} /> Tambah Siswa
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cari nama / NIS..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
        <select className="input w-auto" value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value, page: 1 })}>
          <option value="">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="GRADUATED">Lulus</option>
          <option value="TRANSFERRED">Pindah</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada siswa" description="Tambahkan data siswa untuk mulai mengelola tagihan." icon={Icon.Students} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead>
                <tr>
                  <th>NIS</th>
                  <th>Nama</th>
                  <th>Kelas</th>
                  <th>Orang Tua</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.nis}</td>
                    <td className="font-medium">{s.fullName}</td>
                    <td>{s.schoolClass?.name || '-'}</td>
                    <td className="text-sm">{s.parentName || '-'}</td>
                    <td>
                      <span className={`badge ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button title="Reset password" onClick={() => resetPassword(s)} className="btn-ghost rounded p-1.5"><Icon.Shield width={16} height={16} /></button>
                        <button title="Edit" onClick={() => openEdit(s)} className="btn-ghost rounded p-1.5"><Icon.Edit width={16} height={16} /></button>
                        <button title="Hapus" onClick={() => setConfirm(s)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters({ ...filters, page: p })} />
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Tambah Siswa' : 'Edit Siswa'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
          </>
        }
      >
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIS" required><input className="input" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} required disabled={modal?.mode === 'edit'} /></Field>
          <Field label="NISN"><input className="input" value={form.nisn || ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} /></Field>
          <Field label="Nama Lengkap" required><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
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
          <Field label="No. HP Siswa"><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Nama Orang Tua"><input className="input" value={form.parentName || ''} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></Field>
          <Field label="No. HP Orang Tua"><input className="input" value={form.parentPhone || ''} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Alamat"><textarea className="input" rows={2} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          </div>
          {modal?.mode === 'create' && (
            <label className="sm:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
              Buat akun login otomatis (username = NIS, password default)
            </label>
          )}
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} message={`Hapus siswa "${confirm?.fullName}"? Tindakan ini tidak dapat dibatalkan.`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}
