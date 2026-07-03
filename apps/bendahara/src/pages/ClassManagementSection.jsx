import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatClassLabel } from '../components/tagihan/shared';

const GRADE_OPTIONS = [
  { value: 7, label: 'Kelas 7 (VII)' },
  { value: 8, label: 'Kelas 8 (VIII)' },
  { value: 9, label: 'Kelas 9 (IX)' },
];

const emptyForm = { name: '', grade: 7, homeroom: '', academicYearId: '' };

export default function ClassManagementSection({ onClassesChange }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [years, setYears] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const loadYears = useCallback(async () => {
    try {
      const { data } = await api.get('/masterdata/academic-years');
      const list = data.data || [];
      setYears(list);
      const active = list.find((y) => y.isActive);
      if (active && !yearFilter) setYearFilter(active.id);
      return list;
    } catch (e) {
      toast.error(apiError(e));
      return [];
    }
  }, [yearFilter]);

  const loadClasses = useCallback(async (academicYearId) => {
    setLoading(true);
    try {
      const q = academicYearId ? `?academicYearId=${academicYearId}` : '';
      const { data } = await api.get(`/masterdata/classes${q}`);
      const list = data.data || [];
      setItems(list);
      onClassesChange?.(list);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [onClassesChange]); // eslint-disable-line

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  useEffect(() => {
    loadClasses(yearFilter || undefined);
  }, [yearFilter, loadClasses]);

  const openCreate = () => {
    const activeYear = years.find((y) => y.isActive) || years[0];
    setForm({ ...emptyForm, academicYearId: activeYear?.id || yearFilter || '' });
    setModal({ mode: 'create' });
  };

  const openEdit = (c) => {
    setForm({
      name: c.name,
      grade: c.grade,
      homeroom: c.homeroom || '',
      academicYearId: c.academicYearId,
    });
    setModal({ mode: 'edit', data: c });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama kelas wajib diisi');
      return;
    }
    if (!form.academicYearId) {
      toast.error('Tahun ajaran wajib dipilih');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        grade: Number(form.grade),
        homeroom: form.homeroom.trim() || undefined,
        academicYearId: form.academicYearId,
      };
      if (modal.mode === 'create') {
        await api.post('/masterdata/classes', payload);
        toast.success('Kelas berhasil ditambahkan');
      } else {
        await api.patch(`/masterdata/classes/${modal.data.id}`, payload);
        toast.success('Kelas berhasil diperbarui');
      }
      setModal(null);
      loadClasses(yearFilter || undefined);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    const studentCount = confirm._count?.students ?? 0;
    if (studentCount > 0) {
      toast.error(`Kelas masih memiliki ${studentCount} siswa. Pindahkan siswa terlebih dahulu.`);
      setConfirm(null);
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/masterdata/classes/${confirm.id}`);
      toast.success('Kelas dihapus');
      setConfirm(null);
      loadClasses(yearFilter || undefined);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Pengaturan Kelas</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar kelas yang ditampilkan pada form Tambah Siswa dan filter data siswa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Semua Tahun Ajaran</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}{y.isActive ? ' (Aktif)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pospay-700"
          >
            <Icon.Plus width={18} height={18} />
            Tambah Kelas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada kelas"
          description="Tambahkan kelas untuk ditampilkan pada pilihan form Tambah Siswa. Data tersimpan ke PostgreSQL."
          icon={Icon.School}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Nama Kelas</th>
                <th className="px-4 py-3 font-medium">Tingkat</th>
                <th className="px-4 py-3 font-medium">Wali Kelas</th>
                <th className="px-4 py-3 font-medium">Tahun Ajaran</th>
                <th className="px-4 py-3 font-medium text-center">Jumlah Siswa</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, idx) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 text-slate-700 hover:bg-slate-50/50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {formatClassLabel(c.name)}
                    <span className="ml-2 font-mono text-xs text-slate-400">({c.name})</span>
                  </td>
                  <td className="px-4 py-3">Kelas {c.grade}</td>
                  <td className="px-4 py-3">{c.homeroom || '—'}</td>
                  <td className="px-4 py-3">{c.academicYear?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">{c._count?.students ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      >
                        <Icon.Edit width={14} height={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm(c)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Icon.Trash width={14} height={14} />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Tambah Kelas' : 'Edit Kelas'}
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
        <form onSubmit={save} className="space-y-4">
          <Field label="Nama Kelas" required>
            <p className="mb-1.5 text-xs text-slate-400">Contoh: 7A, 8B, 9C</p>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="7A"
              required
            />
          </Field>
          <Field label="Tingkat" required>
            <select
              className="input"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Wali Kelas">
            <input
              className="input"
              value={form.homeroom}
              onChange={(e) => setForm({ ...form, homeroom: e.target.value })}
              placeholder="Nama wali kelas (opsional)"
            />
          </Field>
          <Field label="Tahun Ajaran" required>
            <select
              className="input"
              value={form.academicYearId}
              onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
              required
            >
              <option value="">Pilih tahun ajaran</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isActive ? ' (Aktif)' : ''}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        message={
          confirm?._count?.students > 0
            ? `Kelas "${formatClassLabel(confirm?.name)}" masih memiliki ${confirm._count.students} siswa. Hapus hanya jika kelas tidak dipakai.`
            : `Hapus kelas "${formatClassLabel(confirm?.name)}"? Tindakan ini tidak dapat dibatalkan.`
        }
        onConfirm={del}
        onClose={() => setConfirm(null)}
        loading={saving}
      />
    </section>
  );
}
