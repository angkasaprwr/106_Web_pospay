import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatDateTime } from '../lib/format';
import About from './About';

const TABS = [
  { key: 'school', label: 'Profil Sekolah', icon: Icon.School },
  { key: 'users', label: 'Pengguna & Akun', icon: Icon.User },
  { key: 'methods', label: 'Metode Pembayaran', icon: Icon.Payment },
  { key: 'master', label: 'Data Master', icon: Icon.Bills },
  { key: 'backup', label: 'Backup & Restore', icon: Icon.Database },
  { key: 'security', label: 'Keamanan', icon: Icon.Shield },
  { key: 'about', label: 'Tentang Aplikasi', icon: Icon.Info },
];

export default function Settings() {
  const [tab, setTab] = useState('school');
  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Konfigurasi aplikasi & sekolah" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="card overflow-hidden p-2">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                <t.icon width={18} height={18} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          {tab === 'school' && <SchoolProfile />}
          {tab === 'users' && <Users />}
          {tab === 'methods' && <PaymentMethods />}
          {tab === 'master' && <MasterData />}
          {tab === 'backup' && <Backup />}
          {tab === 'security' && <Security />}
          {tab === 'about' && <About embedded />}
        </div>
      </div>
    </div>
  );
}

function SchoolProfile() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/settings/school-profile').then(({ data }) => setForm(data.data)).catch((e) => toast.error(apiError(e))); }, []); // eslint-disable-line
  const save = async () => {
    setSaving(true);
    try { await api.patch('/settings/school-profile', form); toast.success('Profil sekolah disimpan'); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };
  const uploadLogo = async (file) => {
    const fd = new FormData(); fd.append('logo', file);
    try { const { data } = await api.post('/settings/school-profile/logo', fd); setForm(data.data); toast.success('Logo diperbarui'); } catch (e) { toast.error(apiError(e)); }
  };
  if (!form) return <div className="card flex h-40 items-center justify-center"><Spinner size={28} /></div>;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {form.logoUrl ? <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" /> : <Icon.School width={28} height={28} className="text-slate-400" />}
        </div>
        <label className="btn-secondary cursor-pointer"><Icon.Upload width={16} height={16} /> Ganti Logo<input type="file" hidden accept="image/*" onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} /></label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama Sekolah"><input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="NPSN"><input className="input" value={form.npsn || ''} onChange={(e) => setForm({ ...form, npsn: e.target.value })} /></Field>
        <Field label="Telepon"><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email"><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Kepala Sekolah"><input className="input" value={form.headmaster || ''} onChange={(e) => setForm({ ...form, headmaster: e.target.value })} /></Field>
        <Field label="Bendahara"><input className="input" value={form.treasurer || ''} onChange={(e) => setForm({ ...form, treasurer: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Alamat"><textarea className="input" rows={2} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
      </div>
      <button className="btn-primary mt-4" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
    </div>
  );
}

function Users() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { try { const { data } = await api.get('/settings/users?role=BENDAHARA'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openCreate = () => { setForm({ fullName: '', username: '', email: '', password: '' }); setModal({ mode: 'create' }); };
  const openEdit = (u) => { setForm({ fullName: u.fullName, email: u.email || '', isActive: u.isActive }); setModal({ mode: 'edit', data: u }); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create') await api.post('/settings/users', form);
      else await api.patch(`/settings/users/${modal.data.id}`, form);
      toast.success('Tersimpan'); setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };
  const del = async () => { setSaving(true); try { await api.delete(`/settings/users/${confirm.id}`); setConfirm(null); load(); toast.success('Dihapus'); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="font-semibold">Akun Bendahara</span>
        <button className="btn-primary" onClick={openCreate}><Icon.Plus width={16} height={16} /> Tambah</button>
      </div>
      {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={28} /></div> : (
        <table className="table-base">
          <thead><tr><th>Nama</th><th>Username</th><th>Email</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.fullName}</td>
                <td className="font-mono text-xs">{u.username}</td>
                <td className="text-sm">{u.email || '-'}</td>
                <td><span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>{u.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="text-right">
                  <button onClick={() => openEdit(u)} className="btn-ghost rounded p-1.5"><Icon.Edit width={16} height={16} /></button>
                  <button onClick={() => setConfirm(u)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Tambah Pengguna' : 'Edit Pengguna'} footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        <div className="space-y-3">
          <Field label="Nama Lengkap" required><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          {modal?.mode === 'create' && <Field label="Username" required><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>}
          <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={modal?.mode === 'create' ? 'Password' : 'Password Baru (opsional)'}><input type="password" className="input" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {modal?.mode === 'edit' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Akun aktif</label>}
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} message={`Hapus pengguna ${confirm?.fullName}?`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}

function PaymentMethods() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', channel: 'TRANSFER', accountName: '', accountNo: '', instruction: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { try { const { data } = await api.get('/masterdata/payment-methods'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line
  const openCreate = () => { setForm({ name: '', channel: 'TRANSFER', accountName: '', accountNo: '', instruction: '', isActive: true }); setModal({ mode: 'create' }); };
  const openEdit = (m) => { setForm({ ...m }); setModal({ mode: 'edit', data: m }); };
  const save = async () => { setSaving(true); try { if (modal.mode === 'create') await api.post('/masterdata/payment-methods', form); else await api.patch(`/masterdata/payment-methods/${modal.data.id}`, form); toast.success('Tersimpan'); setModal(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };
  const del = async () => { setSaving(true); try { await api.delete(`/masterdata/payment-methods/${confirm.id}`); setConfirm(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><span className="font-semibold">Metode Pembayaran</span><button className="btn-primary" onClick={openCreate}><Icon.Plus width={16} height={16} /> Tambah</button></div>
      {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={28} /></div> : items.length === 0 ? <EmptyState title="Belum ada metode" icon={Icon.Payment} /> : (
        <table className="table-base">
          <thead><tr><th>Nama</th><th>Channel</th><th>Atas Nama</th><th>No. Rekening</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td className="font-medium">{m.name}</td><td>{m.channel}</td><td>{m.accountName || '-'}</td><td className="font-mono text-xs">{m.accountNo || '-'}</td>
                <td><span className={`badge ${m.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>{m.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="text-right"><button onClick={() => openEdit(m)} className="btn-ghost rounded p-1.5"><Icon.Edit width={16} height={16} /></button><button onClick={() => setConfirm(m)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title="Metode Pembayaran" footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        <div className="space-y-3">
          <Field label="Nama" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Channel"><select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option value="TRANSFER">Transfer</option><option value="QRIS">QRIS</option><option value="CASH">Tunai</option><option value="VIRTUAL_ACCOUNT">Virtual Account</option><option value="OTHER">Lainnya</option></select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Atas Nama"><input className="input" value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></Field>
            <Field label="No. Rekening"><input className="input" value={form.accountNo || ''} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></Field>
          </div>
          <Field label="Instruksi"><textarea className="input" rows={2} value={form.instruction || ''} onChange={(e) => setForm({ ...form, instruction: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Aktif</label>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} message={`Hapus metode "${confirm?.name}"?`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}

function MasterData() {
  const toast = useToast();
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [ft, cl, ay] = await Promise.all([api.get('/masterdata/fee-types'), api.get('/masterdata/classes'), api.get('/masterdata/academic-years')]);
      setFeeTypes(ft.data.data); setClasses(cl.data.data); setYears(ay.data.data);
    } catch (e) { toast.error(apiError(e)); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const save = async () => {
    setSaving(true);
    try {
      const { type } = modal;
      const url = type === 'fee' ? '/masterdata/fee-types' : type === 'class' ? '/masterdata/classes' : '/masterdata/academic-years';
      await api.post(url, form);
      toast.success('Tersimpan'); setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Section title="Jenis Tagihan" onAdd={() => { setForm({ code: '', name: '', defaultAmount: 0, isRecurring: true, isActive: true }); setModal({ type: 'fee' }); }}>
        {feeTypes.map((f) => <li key={f.id} className="flex justify-between py-2 text-sm"><span>{f.code} · {f.name}</span><span className="text-slate-400">{Number(f.defaultAmount).toLocaleString('id-ID')}</span></li>)}
      </Section>
      <Section title="Tahun Ajaran" onAdd={() => { setForm({ name: '', isActive: false }); setModal({ type: 'year' }); }}>
        {years.map((y) => <li key={y.id} className="flex justify-between py-2 text-sm"><span>{y.name}</span>{y.isActive && <span className="badge bg-emerald-100 text-emerald-700">Aktif</span>}</li>)}
      </Section>
      <Section title="Kelas" onAdd={() => { setForm({ name: '', grade: 7, academicYearId: years[0]?.id || '' }); setModal({ type: 'class' }); }}>
        {classes.map((c) => <li key={c.id} className="flex justify-between py-2 text-sm"><span>{c.name}</span><span className="text-slate-400">{c._count?.students || 0} siswa</span></li>)}
      </Section>

      <Modal open={!!modal} onClose={() => setModal(null)} title="Tambah Data Master" footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        {modal?.type === 'fee' && (
          <div className="space-y-3">
            <Field label="Kode" required><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Nama" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Nominal Default"><input type="number" className="input" value={form.defaultAmount} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} /></Field>
          </div>
        )}
        {modal?.type === 'year' && <Field label="Nama (mis. 2025/2026)" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>}
        {modal?.type === 'class' && (
          <div className="space-y-3">
            <Field label="Nama Kelas" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Tingkat"><input type="number" className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></Field>
            <Field label="Tahun Ajaran" required><select className="input" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, onAdd, children }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{title}</h3><button className="btn-secondary px-3 py-1 text-xs" onClick={onAdd}><Icon.Plus width={14} height={14} /> Tambah</button></div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
    </div>
  );
}

function Backup() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState(null);

  const load = async () => { try { const { data } = await api.get('/backups'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => { setBusy(true); try { await api.post('/backups'); toast.success('Backup dibuat'); load(); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); } };
  const doRestore = async () => { setBusy(true); try { await api.post(`/backups/${restore.id}/restore`); toast.success('Database direstore'); setRestore(null); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); } };
  const download = async (b) => { try { await downloadFile(`/backups/${b.id}/download`, b.fileName); } catch (e) { toast.error(apiError(e)); } };
  const uploadRestore = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    setBusy(true);
    try { await api.post('/backups/restore-upload', fd); toast.success('Database direstore dari file'); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="font-semibold">Backup & Restore Database</span>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer"><Icon.Upload width={16} height={16} /> Restore dari File<input type="file" hidden accept=".json" onChange={(e) => e.target.files[0] && uploadRestore(e.target.files[0])} /></label>
          <button className="btn-primary" onClick={create} disabled={busy}>{busy ? <Spinner size={16} className="text-white" /> : <><Icon.Database width={16} height={16} /> Buat Backup</>}</button>
        </div>
      </div>
      {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={28} /></div> : items.length === 0 ? <EmptyState title="Belum ada backup" icon={Icon.Database} /> : (
        <table className="table-base">
          <thead><tr><th>Nama File</th><th>Ukuran</th><th>Tanggal</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td className="font-mono text-xs">{b.fileName}</td>
                <td>{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                <td className="text-xs">{formatDateTime(b.createdAt)}</td>
                <td className="text-right">
                  <button onClick={() => download(b)} className="btn-ghost rounded p-1.5"><Icon.Download width={16} height={16} /></button>
                  <button onClick={() => setRestore(b)} className="btn-secondary px-3 py-1 text-xs">Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ConfirmDialog open={!!restore} title="Restore Database" danger={false} confirmText="Restore" message="Restore akan MENGGANTI seluruh data saat ini dengan isi backup. Lanjutkan?" onConfirm={doRestore} onClose={() => setRestore(null)} loading={busy} />
    </div>
  );
}

function Security() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/settings/security').then(({ data }) => setForm(data.data)).catch((e) => toast.error(apiError(e))); }, []); // eslint-disable-line
  const save = async () => { setSaving(true); try { await api.patch('/settings/security', form); toast.success('Pengaturan keamanan disimpan'); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };
  if (!form) return <div className="card flex h-40 items-center justify-center"><Spinner size={28} /></div>;
  return (
    <div className="card space-y-4 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Panjang Minimal Password"><input type="number" className="input" value={form.passwordMinLength} onChange={(e) => setForm({ ...form, passwordMinLength: Number(e.target.value) })} /></Field>
        <Field label="Timeout Sesi (menit)"><input type="number" className="input" value={form.sessionTimeoutMinutes} onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })} /></Field>
        <Field label="Maks. Percobaan Login"><input type="number" className="input" value={form.maxLoginAttempts} onChange={(e) => setForm({ ...form, maxLoginAttempts: Number(e.target.value) })} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requireStrongPassword} onChange={(e) => setForm({ ...form, requireStrongPassword: e.target.checked })} /> Wajibkan password kuat</label>
      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
    </div>
  );
}
