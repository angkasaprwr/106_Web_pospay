import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/lupa-kata-sandi', { replace: true });
      return;
    }
    api
      .get('/auth/reset-password/validate', { params: { token } })
      .then(({ data }) => {
        if (data.data.valid) {
          setTokenValid(true);
          setEmail(data.data.email || '');
        } else {
          toast.error(data.data.expired ? 'Tautan reset sudah kedaluwarsa' : 'Tautan reset tidak valid');
          navigate('/lupa-kata-sandi', { replace: true });
        }
      })
      .catch(() => navigate('/lupa-kata-sandi', { replace: true }))
      .finally(() => setValidating(false));
  }, [token, navigate, toast]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi kata sandi tidak cocok');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: form.password,
        confirmPassword: form.confirm,
      });
      toast.success('Kata sandi berhasil diperbarui');
      navigate('/login');
    } catch (err) {
      toast.error(apiError(err, 'Gagal memperbarui kata sandi'));
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Spinner size={32} />
      </div>
    );
  }

  if (!tokenValid) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="relative flex w-full flex-col justify-between overflow-hidden bg-pospay px-6 py-8 text-white sm:px-10 sm:py-10 lg:w-1/2 lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <PospayLogo size={48} />
          <span className="text-2xl font-extrabold tracking-wide sm:text-3xl">POSPAY</span>
        </div>
        <div className="relative my-8 flex flex-1 flex-col items-center justify-center gap-6 py-4 lg:my-0">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Icon.Lock width={52} height={52} className="text-white" />
          </div>
          <p className="max-w-sm text-center text-sm leading-relaxed text-white/85">
            Atur kata sandi baru untuk akun bendahara Anda. Pastikan kata sandi kuat dan mudah diingat.
          </p>
        </div>
        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Kata Sandi Baru</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">Reset Akun Bendahara</p>
            {email && <p className="mt-2 text-sm text-white/80">{email}</p>}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-8 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-pospay sm:text-[28px]">Kata Sandi Baru</h1>
              <p className="mt-1 text-sm text-slate-500">Masukkan dan konfirmasi kata sandi baru Anda</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="password"
                    className={inputClass}
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Masukkan kata sandi baru"
                    autoFocus
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password"
                  >
                    {showPassword ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="confirm"
                    className={inputClass}
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Ulangi kata sandi baru"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle confirm password"
                  >
                    {showConfirm ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Simpan Kata Sandi Baru'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-pospay hover:underline">
                Kembali ke login
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Perubahan kata sandi tersimpan langsung ke database sekolah</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
