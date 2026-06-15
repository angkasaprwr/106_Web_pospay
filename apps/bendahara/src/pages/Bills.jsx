import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Pagination, Field, EmptyState, Badge, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatIDR, formatDate, BILL_STATUS } from '../lib/format';

export default function Bills() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', feeTypeId: '', classId: '', page: 1 });
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(null); // 'single' | 'bulk'
  const [single, setSingle] = useState({ studentId: '', feeTypeId: '', amount: '', dueDate: '', period: '', description: '' });
  const [bulk, setBulk] = useState({ feeTypeId: '', amount: '', dueDate: '', period: '', target: 'ALL', classId: '' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/bills?${params}`);
      setItems(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/masterdata/fee-types').then(({ data }) => setFeeTypes(data.data)).catch(() => {});
    api.get('/masterdata/classes').then(({ data }) => setClasses(data.data)).catch(() => {});
    api.get('/students?limit=100').then(({ data }) => setStudents(data.data)).catch(() => {});
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
      toast.success('Tagihan dibuat');
      setModal(null);
      load();
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
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      await api.delete(`/bills/${confirm.id}`);
      toast.success('Tagihan dihapus');
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tagihan"
        subtitle="Daftar tagihan dan status pembayaran"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setModal('bulk')}><Icon.Plus width={18} height={18} /> Tagihan Massal</button>
            <button className="btn-primary" onClick={() => setModal('single')}><Icon.Plus width={18} height={18} /> Tagihan Baru</button>
          </>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-10" placeholder="Cari invoice / siswa..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        </div>
        <select className="input w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          {Object.entries(BILL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input w-auto" value={filters.feeTypeId} onChange={(e) => setFilters({ ...filters, feeTypeId: e.target.value, page: 1 })}>
          <option value="">Semua Jenis</option>
          {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="input w-auto" value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value, page: 1 })}>
          <option value="">Semua Kelas</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada tagihan" icon={Icon.Bills} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice</th><th>Siswa</th><th>Jenis</th><th className="text-right">Nominal</th><th className="text-right">Terbayar</th><th>Jatuh Tempo</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs">{b.invoiceNo}</td>
                    <td><div className="font-medium">{b.student?.fullName}</div><div className="text-xs text-slate-400">{b.student?.schoolClass?.name}</div></td>
                    <td>{b.feeType?.name}{b.period ? ` (${b.period})` : ''}</td>
                    <td className="text-right">{formatIDR(b.amount)}</td>
                    <td className="text-right text-emerald-600">{formatIDR(b.paidAmount)}</td>
                    <td>{formatDate(b.dueDate)}</td>
                    <td><Badge status={b.status} map={BILL_STATUS} /></td>
                    <td className="text-right"><button onClick={() => setConfirm(b)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters({ ...filters, page: p })} />
      </div>

      {/* Single bill modal */}
      <Modal open={modal === 'single'} onClose={() => setModal(null)} title="Buat Tagihan" footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={saveSingle} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
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
            <Field label="Keterangan"><input className="input" value={single.description} onChange={(e) => setSingle({ ...single, description: e.target.value })} /></Field>
          </div>
        </form>
      </Modal>

      {/* Bulk bill modal */}
      <Modal open={modal === 'bulk'} onClose={() => setModal(null)} title="Tagihan Massal" footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={saveBulk} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Buat'}</button></>}>
        <form onSubmit={saveBulk} className="space-y-4">
          <Field label="Jenis Tagihan" required>
            <select className="input" value={bulk.feeTypeId} onChange={(e) => onFeeChange(e.target.value, setBulk, bulk)} required>
              <option value="">Pilih jenis</option>
              {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Target" required>
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
          <Field label="Periode"><input className="input" placeholder="2025-09" value={bulk.period} onChange={(e) => setBulk({ ...bulk, period: e.target.value })} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} message={`Hapus tagihan ${confirm?.invoiceNo}?`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}
