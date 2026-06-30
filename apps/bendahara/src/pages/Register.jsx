import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Register() {
  const { requestRegistration } = useAuth();
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
      const result = await requestRegistration({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
      });
      if (!result.emailSent && result.devCode) {
        toast.info(`Mode developer: kode verifikasi ${result.devCode}`);
      } else {
        toast.success('Kode verifikasi dikirim ke Gmail sekolah Anda');
      }
      navigate('/register/verify', { state: { verificationId: result.verificationId, email: result.email, devCode: result.devCode } });
    } catch (err) {
      toast.error(apiError(err, 'Registrasi gagal'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_45%)]" />
      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pospay text-white shadow-lg shadow-pospay/25">
            <Icon.School width={22} height={22} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-pospay">POSPAY</p>
            <p className="text-lg font-bold text-slate-900">Registrasi Bendahara</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
          {!open ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Icon.Warning width={24} height={24} />
              </div>
              <h2 className="text-lg font-bold">Registrasi Ditutup</h2>
              <p className="mt-2 text-sm text-slate-500">
                Akun bendahara sudah terdaftar. Silakan login menggunakan akun yang ada.
              </p>
              <Link to="/login" className="btn-primary mt-4 inline-flex">
                Ke Halaman Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900">Daftar Akun Bendahara</h2>
              <p className="mt-2 text-sm text-slate-500">
                Gunakan email Gmail resmi sekolah. Kode verifikasi akan dikirim ke email tersebut.
              </p>
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
                  <label className="label">Email Gmail Sekolah</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon.Mail width={18} height={18} />
                    </span>
                    <input
                      className="input pl-10"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="nama@smppusponegoro.sch.id"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Password</label>
                    <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Konfirmasi Password</label>
                    <input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700" disabled={loading}>
                  {loading ? <Spinner size={18} className="text-white" /> : 'Daftar Akun'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-pospay hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
