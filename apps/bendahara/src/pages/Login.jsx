import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
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
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Icon.School width={24} height={24} />
          </div>
          <span className="text-xl font-bold">POSPAY</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Sistem Informasi Keuangan Sekolah</h1>
          <p className="mt-4 max-w-md text-brand-100">
            Kelola tagihan, pembayaran, dispensasi, dan laporan keuangan SMP Pusponegoro Brebes dalam satu portal bendahara yang modern.
          </p>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} SMP Pusponegoro Brebes</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Icon.School width={18} height={18} />
              </div>
              <span className="font-bold">POSPAY</span>
            </div>
            <button onClick={toggle} className="btn-ghost ml-auto rounded-lg p-2">
              {theme === 'dark' ? <Icon.Sun width={18} height={18} /> : <Icon.Moon width={18} height={18} />}
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Masuk Bendahara</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Silakan masuk untuk mengelola keuangan sekolah.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="bendahara" autoFocus required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
            </button>
          </form>

          {registrationOpen && (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada akun bendahara?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:underline">
                Daftar (instalasi)
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
