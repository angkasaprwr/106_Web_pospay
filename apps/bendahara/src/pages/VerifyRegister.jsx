import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function VerifyRegister() {
  const { verifyRegistration } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const verificationId = location.state?.verificationId;
  const email = location.state?.email;
  const devCode = location.state?.devCode;

  useEffect(() => {
    if (!verificationId) navigate('/register', { replace: true });
  }, [verificationId, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyRegistration({ verificationId, code });
      toast.success('Akun bendahara berhasil diverifikasi');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Verifikasi gagal'));
    } finally {
      setLoading(false);
    }
  };

  if (!verificationId) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(37,99,235,0.12),_transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Icon.Mail width={22} height={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Verifikasi Email</p>
            <p className="text-lg font-bold text-slate-900">Kode Gmail Sekolah</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/95 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
          <h2 className="text-2xl font-extrabold text-slate-900">Masukkan Kode Verifikasi</h2>
          <p className="mt-2 text-sm text-slate-500">
            Kode 6 digit telah dikirim ke notifikasi Gmail sekolah:
            <span className="mt-1 block font-semibold text-slate-700">{email}</span>
          </p>

          {devCode && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mode pengujian developer — kode: <strong className="tracking-widest">{devCode}</strong>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Kode Verifikasi</label>
              <input
                className="input text-center text-2xl font-bold tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn-primary h-12 w-full rounded-xl text-base" disabled={loading || code.length !== 6}>
              {loading ? <Spinner size={18} className="text-white" /> : 'Verifikasi & Masuk'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Salah email?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Daftar ulang
          </Link>
        </p>
      </div>
    </div>
  );
}
