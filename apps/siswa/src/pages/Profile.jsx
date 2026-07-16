import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return digits.replace(/(\d{4})(\d{4})(\d+)/, '$1$2$3');
}

function RowIcon({ children }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
      {children}
    </span>
  );
}

/** Mockup row: icon + Label : Value */
function ProfileRow({ icon, label, value, badge }) {
  const showValue = value != null && value !== '';
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
          <span className="shrink-0 font-medium text-[#0056D2] dark:text-blue-400">{label}</span>
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
  const navigate = useNavigate();
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
      toast.error('Format foto harus JPG, JPEG, atau PNG');
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
  const student = display?.student;
  const photoUrl = display?.avatarUrl || student?.photoUrl;
  const initial = (display?.fullName || 'S').charAt(0).toUpperCase();
  const nis = student?.nis || display?.username || '-';
  const className = student?.schoolClass?.name || '-';
  const academicYear = student?.schoolClass?.academicYear?.name || '-';
  const isActive = display?.isActive !== false;

  if (loading && !display) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Page header — back + title (mockup) */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0056D2] shadow-sm transition hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
          aria-label="Kembali"
        >
          <Icon.ArrowLeft width={18} height={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">Profil Saya</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola informasi profil akun Anda.
          </p>
        </div>
      </div>

      <section className={`${CARD} overflow-hidden`}>
        <div className="grid grid-cols-1 gap-8 p-5 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-10 lg:p-8">
          {/* Left: avatar + change photo */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={display?.fullName || 'Foto profil'}
                  className="h-40 w-40 rounded-full border-4 border-blue-100 object-cover shadow-md dark:border-blue-900/50"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-blue-100 bg-gradient-to-br from-[#0056D2] to-[#003d99] text-4xl font-bold text-white shadow-md dark:border-blue-900/50">
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#0056D2] text-white shadow-md transition hover:bg-[#004BB8] disabled:opacity-60 dark:border-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500"
                aria-label="Ganti foto profil"
              >
                {uploadingPhoto ? <Spinner size={16} className="text-white" /> : <Icon.Camera width={18} height={18} />}
              </button>
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
              className="mt-4 text-sm font-bold text-[#0056D2] hover:underline disabled:opacity-60 dark:text-blue-400"
            >
              Ganti Foto Profil
            </button>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Format: JPG, JPEG, PNG</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Maks. 2MB</p>
          </div>

          {/* Right: Informasi Siswa */}
          <div className="min-w-0">
            <h2 className="mb-1 text-lg font-bold text-[#0056D2] dark:text-blue-400">Informasi Siswa</h2>

            <ProfileRow
              icon={<Icon.User width={16} height={16} />}
              label="Nama Lengkap"
              value={display?.fullName}
            />
            <ProfileRow
              icon={<Icon.Hash width={16} height={16} />}
              label="NIS"
              value={nis}
            />
            <ProfileRow
              icon={<Icon.AtSign width={16} height={16} />}
              label="Username"
              value={display?.username}
            />
            <ProfileRow
              icon={<Icon.Mail width={16} height={16} />}
              label="Email"
              value={display?.email || '-'}
            />
            <ProfileRow
              icon={<Icon.Phone width={16} height={16} />}
              label="Nomor HP"
              value={formatPhone(display?.phone)}
            />
            <ProfileRow
              icon={<Icon.School width={16} height={16} />}
              label="Kelas"
              value={className}
            />
            <ProfileRow
              icon={<Icon.Calendar width={16} height={16} />}
              label="Tahun Masuk Ajaran"
              value={academicYear}
            />
            <ProfileRow
              icon={<Icon.CheckCircle width={16} height={16} />}
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

            <button
              type="button"
              onClick={openEdit}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0056D2] px-4 py-2.5 text-sm font-semibold text-[#0056D2] transition hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <Icon.Edit width={16} height={16} />
              Edit Profil
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profil"
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
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Nomor HP">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="081234567890"
            />
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            NIS dan Username tidak dapat diubah karena terhubung dengan akun login.
          </p>
        </div>
      </Modal>
    </div>
  );
}
