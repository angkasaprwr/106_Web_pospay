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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(37,99,235,0.12),_transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pospay text-white shadow-lg shadow-pospay/25">
            <Icon.Mail width={22} height={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pospay">Verifikasi Email</p>
            <p className="text-lg font-bold text-slate-900">Kode Gmail Sekolah</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
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
            <button type="submit" className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700" disabled={loading || code.length !== 6}>
              {loading ? <Spinner size={18} className="text-white" /> : 'Verifikasi & Masuk'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Salah email?{' '}
          <Link to="/register" className="font-semibold text-pospay hover:underline">
            Daftar ulang
          </Link>
        </p>
      </div>
    </div>
  );
}
