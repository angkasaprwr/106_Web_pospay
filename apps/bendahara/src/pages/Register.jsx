import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nik: '', fullName: '', phone: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get('/auth/registration-status')
      .then(({ data }) => setOpen(data.data.open))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleNikChange = (e) => {
    const nik = e.target.value.replace(/\D/g, '').slice(0, 16);
    setForm({ ...form, nik });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi kata sandi tidak cocok');
    if (form.nik.length < 16) return toast.error('NIK harus 16 digit');
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        username: form.nik,
        phone: form.phone || undefined,
        email: form.email || undefined,
        password: form.password,
      });
      toast.success('Akun berhasil dibuat');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Registrasi gagal'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-10 xl:p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Icon.School width={24} height={24} />
          </div>
          <span className="text-xl font-bold">POSPAY</span>
        </div>
        <div>
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">
            Sistem Informasi Keuangan Sekolah Berbasis Website
          </h1>
          <p className="mt-4 max-w-sm text-brand-100 text-sm xl:text-base">
            POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
          </p>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} SMP Pusponegoro Brebes</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-slate-950 p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Icon.School width={18} height={18} />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
            </div>
            <button onClick={toggle} className="btn-ghost rounded-lg p-2" aria-label="Toggle theme">
              {theme === 'dark' ? <Icon.Sun width={18} height={18} /> : <Icon.Moon width={18} height={18} />}
            </button>
          </div>

          {/* Desktop theme toggle */}
          <div className="mb-4 hidden lg:flex justify-end">
            <button onClick={toggle} className="btn-ghost rounded-lg p-2" aria-label="Toggle theme">
              {theme === 'dark' ? <Icon.Sun width={18} height={18} /> : <Icon.Moon width={18} height={18} />}
            </button>
          </div>

          {!open ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                <Icon.Warning width={28} height={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrasi Ditutup</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Akun hanya dapat dibuat sekali saat instalasi dan sudah dinonaktifkan. Silakan masuk menggunakan akun yang ada.
              </p>
              <Link to="/login" className="btn-primary mt-6 inline-flex">
                Ke Halaman Masuk
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Buat akun untuk mengakses sistem POSPAY
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {/* NIK */}
                <div>
                  <label className="label">NIK</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan NIK (16 digit)"
                    value={form.nik}
                    onChange={handleNikChange}
                    maxLength={16}
                    required
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                {/* No. HP */}
                <div>
                  <label className="label">No. HP</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="Masukkan nomor HP"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {/* Email Sekolah */}
                <div>
                  <label className="label">Email Sekolah</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="Masukkan email sekolah"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {/* Username (auto-generated) */}
                <div>
                  <label className="label">Username</label>
                  <input
                    className="input bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    type="text"
                    placeholder="Akan otomatis ter-generate menggunakan NIK"
                    value={form.nik}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="label">Kata Sandi</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan kata sandi"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <Icon.EyeOff width={16} height={16} /> : <Icon.Eye width={16} height={16} />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label className="label">Konfirmasi Kata Sandi</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Masukkan ulang kata sandi"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showConfirm ? <Icon.EyeOff width={16} height={16} /> : <Icon.Eye width={16} height={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                  {loading ? <Spinner size={18} className="text-white" /> : 'Daftar'}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400">atau</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              </div>

              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Sudah memiliki akun?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                  Login di sini
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
