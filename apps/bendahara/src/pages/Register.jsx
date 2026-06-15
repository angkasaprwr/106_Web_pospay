import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
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

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi password tidak cocok');
    setLoading(true);
    try {
      await register({ fullName: form.fullName, username: form.username, email: form.email, password: form.password });
      toast.success('Akun bendahara berhasil dibuat');
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon.School width={20} height={20} />
          </div>
          <span className="text-lg font-bold">POSPAY</span>
        </div>
        <div className="card p-6">
          {!open ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                <Icon.Warning width={24} height={24} />
              </div>
              <h2 className="text-lg font-bold">Registrasi Ditutup</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Akun bendahara hanya dapat dibuat sekali saat instalasi dan sudah dinonaktifkan. Silakan login menggunakan akun yang ada.
              </p>
              <Link to="/login" className="btn-primary mt-4 inline-flex">
                Ke Halaman Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrasi Bendahara</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pendaftaran ini hanya tersedia satu kali saat instalasi awal.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Username</label>
                  <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Password</label>
                    <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Konfirmasi</label>
                    <input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? <Spinner size={18} className="text-white" /> : 'Daftar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
