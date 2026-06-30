import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    api.get('/auth/registration-status').then(({ data }) => setRegistrationOpen(data.data.open)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Login berhasil');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_35%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative hidden w-[48%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Icon.School width={28} height={28} />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-100">POSPAY</p>
            <p className="text-lg font-bold">Portal Bendahara</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-100 ring-1 ring-white/20">
            SMP Pusponegoro Brebes
          </p>
          <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">
            Sistem Informasi Keuangan Sekolah
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100">
            Kelola tagihan, pembayaran, dispensasi, dan laporan keuangan sekolah dalam satu portal bendahara yang aman dan modern.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {['Tagihan & Pembayaran', 'Laporan Keuangan', 'Dispensasi Siswa', 'Notifikasi Gmail'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-brand-200">© {new Date().getFullYear()} SMP Pusponegoro Brebes · POSPAY</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <Icon.School width={22} height={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">POSPAY</p>
              <p className="text-lg font-bold text-slate-900">Portal Bendahara</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900">Masuk Bendahara</h2>
              <p className="mt-2 text-sm text-slate-500">Silakan masuk untuk mengelola keuangan sekolah.</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.User width={18} height={18} />
                  </span>
                  <input
                    className="input pl-10"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="bendahara"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    className="input pl-10 pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary h-12 w-full rounded-xl text-base shadow-lg shadow-brand-600/25" disabled={loading}>
                {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
              </button>
            </form>

            {registrationOpen && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Belum punya akun bendahara?{' '}
                <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                  Daftar Akun
                </Link>
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Gunakan akun yang sudah diverifikasi melalui email Gmail sekolah.
          </p>
        </div>
      </div>
    </div>
  );
}
