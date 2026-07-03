import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatIDR } from '../lib/format';
import { FeeTypeBadge } from '../components/tagihan/shared';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  defaultAmount: '',
  isRecurring: true,
  isActive: true,
};

export default function FeeTypeManagementSection({ onFeeTypesChange }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const loadFeeTypes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masterdata/fee-types');
      const list = data.data || [];
      setItems(list);
      onFeeTypesChange?.(list);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [onFeeTypesChange]); // eslint-disable-line

  useEffect(() => {
    loadFeeTypes();
  }, [loadFeeTypes]);

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ mode: 'create' });
  };

  const openEdit = (f) => {
    setForm({
      code: f.code,
      name: f.name,
      description: f.description || '',
      defaultAmount: String(Number(f.defaultAmount) || ''),
      isRecurring: f.isRecurring,
      isActive: f.isActive,
    });
    setModal({ mode: 'edit', data: f });
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Kode dan nama jenis tagihan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        defaultAmount: form.defaultAmount === '' ? 0 : Number(form.defaultAmount),
        isRecurring: form.isRecurring,
        isActive: form.isActive,
      };
      if (modal.mode === 'create') {
        await api.post('/masterdata/fee-types', payload);
        toast.success('Jenis tagihan berhasil ditambahkan');
      } else {
        await api.patch(`/masterdata/fee-types/${modal.data.id}`, payload);
        toast.success('Jenis tagihan berhasil diperbarui');
      }
      setModal(null);
      loadFeeTypes();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      await api.delete(`/masterdata/fee-types/${confirm.id}`);
      toast.success('Jenis tagihan dihapus');
      setConfirm(null);
      loadFeeTypes();
    } catch (e) {
      toast.error(apiError(e, 'Jenis tagihan tidak dapat dihapus karena masih dipakai. Nonaktifkan saja.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Pengaturan Jenis Tagihan</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar jenis tagihan yang ditampilkan pada form Buat Tagihan Baru dan filter daftar tagihan.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pospay-700"
        >
          <Icon.Plus width={18} height={18} />
          Tambah Jenis Tagihan
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada jenis tagihan"
          description="Tambahkan jenis tagihan (contoh: SPP, Uang Gedung) untuk digunakan saat membuat tagihan siswa. Data tersimpan ke PostgreSQL."
          icon={Icon.Bills}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Jenis Tagihan</th>
                <th className="px-4 py-3 font-medium">Deskripsi</th>
                <th className="px-4 py-3 font-medium text-right">Nominal Default</th>
                <th className="px-4 py-3 font-medium text-center">Berulang</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f, idx) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-50 text-slate-700 hover:bg-slate-50/50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{f.code}</td>
                  <td className="px-4 py-3">
                    <FeeTypeBadge feeType={f} />
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                    {f.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatIDR(f.defaultAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.isRecurring
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    >
                      {f.isRecurring ? 'Ya' : 'Tidak'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    >
                      {f.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      >
                        <Icon.Edit width={14} height={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm(f)}
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
        title={modal?.mode === 'create' ? 'Tambah Jenis Tagihan' : 'Edit Jenis Tagihan'}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kode" required>
              <input
                className="input font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SPP"
                required
                disabled={modal?.mode === 'edit'}
              />
            </Field>
            <Field label="Nama Jenis Tagihan" required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="SPP Bulanan"
                required
              />
            </Field>
          </div>
          <Field label="Deskripsi">
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Keterangan jenis tagihan (opsional)"
            />
          </Field>
          <Field label="Nominal Default (Rp)">
            <input
              type="number"
              min="0"
              className="input"
              value={form.defaultAmount}
              onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })}
              placeholder="150000"
            />
          </Field>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                className="rounded border-slate-300"
              />
              Tagihan berulang (bulanan)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-slate-300"
              />
              Aktif
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        message={`Hapus jenis tagihan "${confirm?.name}"? Jika masih dipakai oleh tagihan, gunakan opsi nonaktifkan melalui Edit.`}
        onConfirm={del}
        onClose={() => setConfirm(null)}
        loading={saving}
      />
    </section>
  );
}
