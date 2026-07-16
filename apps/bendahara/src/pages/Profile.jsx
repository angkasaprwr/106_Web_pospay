import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icons';
import { Modal, Spinner, Field } from '../components/ui';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

function formatPhone(value) {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return value;
  return digits.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

function formatJoinDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function RowIcon({ children }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
      {children}
    </span>
  );
}

/** Mockup row: icon + Label : Value (+ optional badge) */
function ProfileRow({ icon, label, value, badge }) {
  const showValue = value != null && value !== '';
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
          <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-slate-400 dark:text-slate-500">:</span>
          {showValue ? (
            <span className="min-w-0 break-words font-semibold text-slate-800 dark:text-slate-100">{value}</span>
          ) : !badge ? (
            <span className="font-semibold text-slate-800 dark:text-slate-100">-</span>
          ) : null}
          {badge}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, reload } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data.data);
      setForm({
        fullName: data.data.fullName || '',
        email: data.data.email || '',
        phone: data.data.phone || '',
      });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    setForm({
      fullName: profile?.fullName || user?.fullName || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || user?.phone || '',
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', form);
      setProfile(data.data);
      updateUser(data.data);
      toast.success('Profil berhasil diperbarui');
      setEditOpen(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Format foto harus JPG atau PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await api.patch('/auth/me', { avatarUrl: dataUrl });
      setProfile(data.data);
      updateUser(data.data);
      await reload();
      toast.success('Foto profil diperbarui');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const display = profile || user;
  const initial = (display?.fullName || 'B').charAt(0).toUpperCase();
  const isActive = display?.isActive !== false;

  if (loading && !display) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola informasi akun Anda yang digunakan untuk login ke POSPAY.
        </p>
      </div>

      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <h2 className="text-base font-bold text-[#0056D2] dark:text-blue-400">Informasi Akun</h2>
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0056D2] bg-white px-4 py-2 text-sm font-semibold text-[#0056D2] transition hover:bg-blue-50 dark:border-blue-500 dark:bg-transparent dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Icon.Edit width={16} height={16} />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[240px_1fr] lg:gap-8 lg:p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {display?.avatarUrl ? (
                <img
                  src={display.avatarUrl}
                  alt={display.fullName || 'Foto profil'}
                  className="h-40 w-40 rounded-full border-4 border-blue-100 object-cover shadow-md dark:border-blue-900/50"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-blue-100 bg-gradient-to-br from-[#0056D2] to-[#003d99] text-4xl font-bold text-white shadow-md dark:border-blue-900/50">
                  {initial}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-[#0056D2] bg-white px-4 py-2 text-sm font-semibold text-[#0056D2] transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-500 dark:bg-transparent dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              {uploadingPhoto ? <Spinner size={16} /> : <Icon.Camera width={16} height={16} />}
              Edit Foto
            </button>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Format: JPG, PNG. Maks. 2MB</p>
          </div>

          <div className="min-w-0">
            <ProfileRow
              icon={<Icon.User width={18} height={18} />}
              label="Nama Lengkap"
              value={display?.fullName}
            />
            <ProfileRow
              icon={<Icon.IdCard width={18} height={18} />}
              label="NIP / NIK"
              value={display?.username}
            />
            <ProfileRow
              icon={<Icon.AtSign width={18} height={18} />}
              label="Username"
              value={display?.username}
              badge={(
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  Otomatis
                </span>
              )}
            />
            <ProfileRow
              icon={<Icon.Mail width={18} height={18} />}
              label="Email"
              value={display?.email || '-'}
            />
            <ProfileRow
              icon={<Icon.Phone width={18} height={18} />}
              label="Nomor HP"
              value={formatPhone(display?.phone)}
            />
            <ProfileRow
              icon={<Icon.Briefcase width={18} height={18} />}
              label="Jabatan"
              value="Bendahara"
            />
            <ProfileRow
              icon={<Icon.Shield width={18} height={18} />}
              label="Role"
              value="Bendahara"
            />
            <ProfileRow
              icon={<Icon.CheckCircle width={18} height={18} />}
              label="Status Akun"
              value={null}
              badge={(
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              )}
            />
            <ProfileRow
              icon={<Icon.Calendar width={18} height={18} />}
              label="Tanggal Bergabung"
              value={formatJoinDate(display?.createdAt)}
            />
          </div>
        </div>
      </section>

      <Link
        to="/chatbot"
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-[#0056D2] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#004BB8] dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        <Icon.Chat width={20} height={20} />
        <span className="hidden sm:inline">Butuh bantuan? Tanya lewat Chatbot</span>
      </Link>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Informasi Akun"
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Batal</button>
            <button type="button" className="btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <Field label="Nama Lengkap" required>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Nomor HP">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812-3456-7890" />
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Username/NIP tidak dapat diubah karena terhubung dengan akun login.
          </p>
        </div>
      </Modal>
    </div>
  );
}
