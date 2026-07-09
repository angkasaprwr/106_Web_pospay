import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icons';
import { Modal, Spinner, Field } from '../components/ui';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

function formatClassLabel(name) {
  if (!name) return '—';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

function formatAcademicYear(student) {
  const yearName = student?.schoolClass?.academicYear?.name;
  if (yearName) return yearName;
  const enrolledAt = student?.enrolledAt;
  if (!enrolledAt) return '—';
  const y = new Date(enrolledAt).getFullYear();
  return `${y}/${y + 1}`;
}

function formatPhone(value) {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return value;
  return digits.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

function RowIcon({ children }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
      {children}
    </span>
  );
}

function ProfileRow({ icon, label, value, badge }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value || '—'}</p>
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
        phone: data.data.phone || data.data.student?.phone || '',
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
    const display = profile || user;
    setForm({
      fullName: display?.fullName || '',
      email: display?.email || '',
      phone: display?.phone || display?.student?.phone || '',
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
    }
  };

  const display = profile || user;
  const student = display?.student;
  const photoUrl = display?.avatarUrl || student?.photoUrl;
  const initial = (display?.fullName || 'S').charAt(0).toUpperCase();

  if (loading && !display) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Kembali"
        >
          <Icon.ArrowLeft width={18} height={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profil Saya</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola informasi profil akun Anda.
          </p>
        </div>
      </div>

      <section className={`${CARD} overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center bg-slate-50 px-6 py-8 text-center dark:bg-slate-800/40 lg:min-h-[420px] lg:justify-center">
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={display?.fullName || 'Foto profil'}
                  className="h-36 w-36 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-700"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#0056D2] to-[#003d99] text-4xl font-bold text-white shadow-md dark:border-slate-700">
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0056D2] text-white shadow-md transition hover:bg-[#004BB8] disabled:opacity-60 dark:border-slate-700"
                aria-label="Ganti foto profil"
              >
                {uploadingPhoto ? <Spinner size={14} className="text-white" /> : <Icon.Camera width={16} height={16} />}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
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
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Format: JPG, JPEG, PNG</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Maks. 2MB</p>
          </div>

          <div className="border-t border-slate-100 p-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:p-6">
            <h2 className="mb-4 text-base font-bold text-slate-800 dark:text-slate-100">Informasi Siswa</h2>
            <ProfileRow icon={<Icon.User width={18} height={18} />} label="Nama Lengkap" value={display?.fullName} />
            <ProfileRow icon={<Icon.IdCard width={18} height={18} />} label="NIS" value={student?.nis || display?.username} />
            <ProfileRow icon={<Icon.User width={18} height={18} />} label="Username" value={display?.username} />
            <ProfileRow icon={<Icon.Mail width={18} height={18} />} label="Email" value={display?.email} />
            <ProfileRow icon={<Icon.Phone width={18} height={18} />} label="Nomor HP" value={formatPhone(display?.phone || student?.phone)} />
            <ProfileRow icon={<Icon.Students width={18} height={18} />} label="Kelas" value={formatClassLabel(student?.schoolClass?.name)} />
            <ProfileRow icon={<Icon.Calendar width={18} height={18} />} label="Tahun Masuk Ajaran" value={formatAcademicYear(student)} />
            <ProfileRow
              icon={<Icon.Shield width={18} height={18} />}
              label="Status Akun"
              value={display?.isActive ? 'Aktif' : 'Nonaktif'}
              badge={(
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${display?.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {display?.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              )}
            />

            <button
              type="button"
              onClick={openEdit}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0056D2] py-3 text-sm font-bold text-[#0056D2] transition hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <Icon.Edit width={18} height={18} />
              Edit Profil
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">
              <Icon.School width={20} height={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">SMP Pusponegoro Brebes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Jl. Pusponegoro No. 1, Brebes</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 POSPAY. Semua hak dilindungi.</p>
        </div>
      </footer>

      <Link
        to="/bantuan"
        className="fixed bottom-6 right-4 z-30 flex max-w-sm items-center gap-3 rounded-full bg-[#0056D2] py-3 pl-3 pr-6 text-white shadow-xl hover:bg-[#004BB8] dark:bg-blue-700 dark:hover:bg-blue-600 sm:right-8"
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon.Chat width={24} height={24} />
        </span>
        <span className="text-left text-sm leading-tight">
          <span className="block font-bold">Butuh Bantuan?</span>
          <span className="text-xs text-white/90">Tanya lewat Chatbot</span>
        </span>
      </Link>

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
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Nomor HP">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" />
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            NIS, kelas, dan username tidak dapat diubah dari halaman ini.
          </p>
        </div>
      </Modal>
    </div>
  );
}
