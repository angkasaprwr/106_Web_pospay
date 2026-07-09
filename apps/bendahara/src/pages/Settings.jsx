import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { downloadFile } from '../lib/download';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatDateTime } from '../lib/format';
import About from './About';

const TABS = [
  { id: 'school', label: 'Profil Sekolah', icon: Icon.School },
  { id: 'users', label: 'Pengguna & Akses', icon: Icon.Students },
  { id: 'methods', label: 'Metode Pembayaran', icon: Icon.Payment },
  { id: 'backup', label: 'Backup & Restore', icon: Icon.Database },
  { id: 'security', label: 'Keamanan', icon: Icon.Shield },
  { id: 'about', label: 'Tentang Aplikasi', icon: Icon.Info },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'school';
  const [tab, setTab] = useState(initialTab);

  const selectTab = (id) => {
    setTab(id);
    if (id === 'school') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', id);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    if (TABS.some((t) => t.id === tabParam) && tabParam !== tab) {
      setTab(tabParam);
    }
  }, [tabParam]); // eslint-disable-line

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pospay sm:text-3xl">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">Konfigurasi profil sekolah, pengguna, keamanan, dan sistem.</p>
      </div>

      <div className="flex flex-wrap gap-0 border-b border-slate-200">
        {TABS.map((t) => {
          const IconC = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'border-pospay text-pospay'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-pospay'
              }`}
            >
              <IconC width={18} height={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'school' && <SchoolProfile />}
      {tab === 'users' && <Users />}
      {tab === 'methods' && <PaymentMethods />}
      {tab === 'backup' && <Backup />}
      {tab === 'security' && <Security />}
      {tab === 'about' && <About embedded />}

      <Link
        to="/chatbot"
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-pospay px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pospay-700"
      >
        <Icon.Chat width={20} height={20} />
        <span className="hidden sm:inline">Butuh bantuan? Tanya lewat Chatbot</span>
      </Link>
    </div>
  );
}

function SchoolProfile() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(null);
  const [years, setYears] = useState([]);
  const [activeYearId, setActiveYearId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    try {
      const [profileRes, yearsRes] = await Promise.all([
        api.get('/settings/school-profile'),
        api.get('/masterdata/academic-years'),
      ]);
      setForm(profileRes.data.data);
      const yearList = yearsRes.data.data || [];
      setYears(yearList);
      const active = yearList.find((y) => y.isActive);
      setActiveYearId(active?.id || yearList[0]?.id || '');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const patchField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateLogo = (file) => {
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Format logo harus JPG atau PNG');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB');
      return false;
    }
    return true;
  };

  const uploadLogo = async (file) => {
    if (!validateLogo(file)) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const { data } = await api.post('/settings/school-profile/logo', fd);
      setForm(data.data);
      toast.success('Logo diperbarui');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const removeLogo = async () => {
    try {
      const { data } = await api.patch('/settings/school-profile', { logoUrl: '' });
      setForm(data.data);
      toast.success('Logo dihapus');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        npsn: form.npsn || '',
        address: form.address || '',
        phone: form.phone || '',
        email: form.email || '',
        website: form.website || '',
        headmaster: form.headmaster || '',
        treasurer: form.treasurer || '',
      };
      const { data } = await api.patch('/settings/school-profile', payload);
      setForm(data.data);

      const currentActive = years.find((y) => y.isActive);
      if (activeYearId && currentActive?.id !== activeYearId) {
        await api.post(`/masterdata/academic-years/${activeYearId}/activate`);
        const { data: yearsData } = await api.get('/masterdata/academic-years');
        setYears(yearsData.data || []);
      }

      setEditing(false);
      toast.success('Profil sekolah disimpan');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/settings/school-profile', {
        name: 'SMP Pusponegoro Brebes',
        npsn: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        headmaster: '',
        treasurer: '',
        logoUrl: '',
      });
      setForm(data.data);
      setEditing(false);
      setConfirmDelete(false);
      toast.success('Profil sekolah direset');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="card flex h-64 items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const inputClass = `input ${!editing ? 'bg-slate-50 text-slate-700' : ''}`;
  const schoolActive = Boolean(form.name?.trim());

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="card p-6 xl:col-span-2">
        <h2 className="mb-5 text-lg font-semibold text-slate-800">Informasi Sekolah</h2>
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex shrink-0 flex-col items-center lg:w-52">
            <p className="mb-3 text-sm font-medium text-slate-700">Logo Sekolah</p>
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo sekolah" className="h-full w-full object-contain" />
              ) : (
                <Icon.School width={56} height={56} className="text-slate-300" />
              )}
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <label className={`btn-secondary w-full justify-center ${editing ? 'cursor-pointer' : 'pointer-events-none opacity-50'}`}>
                <Icon.Upload width={16} height={16} />
                Ubah Logo
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png"
                  disabled={!editing}
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadLogo(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-secondary w-full justify-center border-red-200 text-red-600 hover:bg-red-50"
                disabled={!editing || !form.logoUrl}
                onClick={removeLogo}
              >
                <Icon.Trash width={16} height={16} />
                Hapus Logo
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Format: JPG, PNG (maks. 2MB). Ukuran disarankan: 512×512px
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama Sekolah">
                <input className={inputClass} value={form.name || ''} disabled={!editing} onChange={(e) => patchField('name', e.target.value)} />
              </Field>
              <Field label="NPSN">
                <input className={inputClass} value={form.npsn || ''} disabled={!editing} onChange={(e) => patchField('npsn', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Alamat">
                  <textarea className={inputClass} rows={3} value={form.address || ''} disabled={!editing} onChange={(e) => patchField('address', e.target.value)} />
                </Field>
              </div>
              <Field label="Nomor Telepon">
                <input className={inputClass} value={form.phone || ''} disabled={!editing} onChange={(e) => patchField('phone', e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" value={form.email || ''} disabled={!editing} onChange={(e) => patchField('email', e.target.value)} />
              </Field>
              <Field label="Website">
                <input className={inputClass} value={form.website || ''} disabled={!editing} onChange={(e) => patchField('website', e.target.value)} />
              </Field>
              <Field label="Nama Kepala Sekolah">
                <input className={inputClass} value={form.headmaster || ''} disabled={!editing} onChange={(e) => patchField('headmaster', e.target.value)} />
              </Field>
              <Field label="Tahun Ajaran Aktif">
                <select
                  className={inputClass}
                  value={activeYearId}
                  disabled={!editing}
                  onChange={(e) => setActiveYearId(e.target.value)}
                >
                  {years.length === 0 && <option value="">Belum ada tahun ajaran</option>}
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status Sekolah">
                <div className="flex h-10 items-center">
                  <span className={`badge ${schoolActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {schoolActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-5 text-lg font-semibold text-slate-800">Informasi & Aksi</h2>

        <div className="mb-6 flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          <Icon.Info width={20} height={20} className="mt-0.5 shrink-0 text-sky-600" />
          <p>
            <span className="font-semibold">Tentang Profil Sekolah: </span>
            Informasi ini akan ditampilkan di berbagai dokumen dan halaman sistem seperti tagihan, laporan, dan cetakan resmi.
          </p>
        </div>

        <p className="mb-3 text-sm font-semibold text-slate-700">Aksi Cepat</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-4 rounded-xl bg-sky-50 p-4 text-left transition hover:bg-sky-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Icon.Edit width={22} height={22} />
            </span>
            <span>
              <span className="block font-semibold text-slate-800">Edit Profil</span>
              <span className="text-xs text-slate-500">Ubah informasi profil sekolah</span>
            </span>
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving || !editing}
            className="flex w-full items-center gap-4 rounded-xl bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              {saving ? <Spinner size={20} /> : <Icon.Check width={22} height={22} />}
            </span>
            <span>
              <span className="block font-semibold text-slate-800">Simpan Perubahan</span>
              <span className="text-xs text-slate-500">Simpan semua perubahan data</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            className="flex w-full items-center gap-4 rounded-xl bg-red-50 p-4 text-left transition hover:bg-red-100 disabled:opacity-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Icon.Trash width={22} height={22} />
            </span>
            <span>
              <span className="block font-semibold text-slate-800">Hapus Profil</span>
              <span className="text-xs text-slate-500">Reset semua data profil sekolah</span>
            </span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Profil Sekolah"
        danger
        message="Semua data profil sekolah akan direset ke nilai default. Logo juga akan dihapus. Lanjutkan?"
        onConfirm={deleteProfile}
        onClose={() => setConfirmDelete(false)}
        loading={saving}
      />
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
  const [form, setForm] = useState({
    name: '',
    channel: 'TRANSFER',
    accountName: '',
    accountNo: '',
    instruction: '',
    isActive: true,
    paymentType: '',
    gateway: 'manual',
    merchantName: '',
    merchantId: '',
    midtransClientKey: '',
    midtransServerKey: '',
    productionMode: false,
    callbackUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { try { const { data } = await api.get('/masterdata/payment-methods'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const applyChannelDefaults = (channel, prev) => {
    if (channel === 'CASH') {
      return { ...prev, channel, paymentType: 'CASH', gateway: 'manual' };
    }
    if (channel === 'QRIS') {
      return { ...prev, channel, paymentType: 'QRIS_MIDTRANS', gateway: 'midtrans', merchantName: prev.merchantName || 'SMP Pusponegoro Brebes' };
    }
    if (channel === 'TRANSFER') {
      return { ...prev, channel, paymentType: 'TRANSFER_MIDTRANS', gateway: 'midtrans', merchantName: prev.merchantName || 'SMP Pusponegoro Brebes' };
    }
    return { ...prev, channel, paymentType: 'OTHER', gateway: 'manual' };
  };

  const openCreate = () => {
    setForm(applyChannelDefaults('CASH', {
      name: 'Cash',
      channel: 'CASH',
      accountName: '',
      accountNo: '',
      instruction: 'Bayar tunai di loket bendahara sekolah.',
      isActive: true,
      paymentType: 'CASH',
      gateway: 'manual',
      merchantName: '',
      merchantId: '',
      midtransClientKey: '',
      midtransServerKey: '',
      productionMode: false,
      callbackUrl: '',
    }));
    setModal({ mode: 'create' });
  };
  const openEdit = (m) => { setForm({ ...m, callbackUrl: m.callbackUrl || '', midtransClientKey: m.midtransClientKey || '', midtransServerKey: m.midtransServerKey || '' }); setModal({ mode: 'edit', data: m }); };
  const save = async () => { setSaving(true); try { if (modal.mode === 'create') await api.post('/masterdata/payment-methods', form); else await api.patch(`/masterdata/payment-methods/${modal.data.id}`, form); toast.success('Tersimpan'); setModal(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };
  const del = async () => { setSaving(true); try { await api.delete(`/masterdata/payment-methods/${confirm.id}`); setConfirm(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><span className="font-semibold">Metode Pembayaran</span><button className="btn-primary" onClick={openCreate}><Icon.Plus width={16} height={16} /> Tambah</button></div>
      {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={28} /></div> : items.length === 0 ? <EmptyState title="Belum ada metode" icon={Icon.Payment} /> : (
        <table className="table-base">
          <thead><tr><th>Nama</th><th>Channel</th><th>Gateway</th><th>Atas Nama</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td className="font-medium">{m.name}</td><td>{m.channel}</td><td>{m.gateway || '-'}</td><td>{m.merchantName || m.accountName || '-'}</td>
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
          <Field label="Channel"><select className="input" value={form.channel} onChange={(e) => setForm((f) => applyChannelDefaults(e.target.value, f))}><option value="CASH">Tunai (Cash)</option><option value="QRIS">QRIS Midtrans</option><option value="TRANSFER">Transfer</option><option value="VIRTUAL_ACCOUNT">Virtual Account</option><option value="OTHER">Lainnya</option></select></Field>
          {form.channel === 'QRIS' && (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Konfigurasi Midtrans QRIS</p>
              <Field label="Merchant Name"><input className="input" value={form.merchantName || ''} onChange={(e) => setForm({ ...form, merchantName: e.target.value })} /></Field>
              <Field label="Merchant ID"><input className="input" value={form.merchantId || ''} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} /></Field>
              <Field label="Client Key"><input className="input" value={form.midtransClientKey || ''} onChange={(e) => setForm({ ...form, midtransClientKey: e.target.value })} /></Field>
              <Field label="Server Key"><input type="password" className="input" value={form.midtransServerKey || ''} onChange={(e) => setForm({ ...form, midtransServerKey: e.target.value })} /></Field>
              <Field label="Callback URL"><input className="input" placeholder="https://domain.com/api/payment/webhook" value={form.callbackUrl || ''} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.productionMode} onChange={(e) => setForm({ ...form, productionMode: e.target.checked })} /> Production Mode</label>
            </div>
          )}
          {form.channel !== 'QRIS' && form.channel !== 'TRANSFER' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Atas Nama"><input className="input" value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></Field>
              <Field label="No. Rekening"><input className="input" value={form.accountNo || ''} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></Field>
            </div>
          )}
          {form.channel === 'TRANSFER' && (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Konfigurasi Transfer Bank Midtrans</p>
              <Field label="Merchant Name"><input className="input" value={form.merchantName || ''} onChange={(e) => setForm({ ...form, merchantName: e.target.value })} /></Field>
              <Field label="Merchant ID"><input className="input" value={form.merchantId || ''} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} /></Field>
              <Field label="Client Key"><input className="input" value={form.midtransClientKey || ''} onChange={(e) => setForm({ ...form, midtransClientKey: e.target.value })} /></Field>
              <Field label="Server Key"><input type="password" className="input" value={form.midtransServerKey || ''} onChange={(e) => setForm({ ...form, midtransServerKey: e.target.value })} /></Field>
            </div>
          )}
          <Field label="Instruksi"><textarea className="input" rows={2} value={form.instruction || ''} onChange={(e) => setForm({ ...form, instruction: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Aktif</label>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} message={`Hapus metode "${confirm?.name}"?`} onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
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
