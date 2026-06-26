import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import { AuthLeftPanel } from './Login';

/* ──────────────────────────────────────────────────────
   Dashboard illustration (for Register left panel)
────────────────────────────────────────────────────── */
function DashboardIllustration() {
  return (
    <svg viewBox="0 0 380 240" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm mx-auto">
      {/* Books */}
      <rect x="6"  y="196" width="64" height="12" rx="4" fill="#93c5fd" opacity="0.58"/>
      <rect x="12" y="184" width="56" height="12" rx="4" fill="#bfdbfe" opacity="0.48"/>
      <rect x="18" y="172" width="48" height="12" rx="4" fill="#dbeafe" opacity="0.38"/>
      {/* Browser frame */}
      <rect x="60" y="14" width="264" height="186" rx="12" fill="white" opacity="0.96"/>
      <rect x="60" y="14" width="264" height="28"  rx="12" fill="#e8eef8" opacity="0.9"/>
      <rect x="60" y="30" width="264" height="12"        fill="#e8eef8" opacity="0.9"/>
      <circle cx="80"  cy="28" r="5" fill="#f87171" opacity="0.75"/>
      <circle cx="95"  cy="28" r="5" fill="#fbbf24" opacity="0.75"/>
      <circle cx="110" cy="28" r="5" fill="#4ade80" opacity="0.75"/>
      <rect x="122" y="21" width="130" height="14" rx="7" fill="white" opacity="0.8"/>
      {/* Stat cards */}
      <rect x="72"  y="52" width="54" height="28" rx="5" fill="#dbeafe" opacity="0.9"/>
      <rect x="134" y="52" width="54" height="28" rx="5" fill="#dcfce7" opacity="0.9"/>
      <rect x="196" y="52" width="54" height="28" rx="5" fill="#fef3c7" opacity="0.9"/>
      <rect x="258" y="52" width="54" height="28" rx="5" fill="#fce7f3" opacity="0.9"/>
      {/* Bar chart */}
      <rect x="72"  y="154" width="14" height="36" rx="3" fill="#2563eb" opacity="0.70"/>
      <rect x="90"  y="140" width="14" height="50" rx="3" fill="#2563eb" opacity="0.80"/>
      <rect x="108" y="126" width="14" height="64" rx="3" fill="#2563eb"/>
      <rect x="126" y="144" width="14" height="46" rx="3" fill="#60a5fa" opacity="0.80"/>
      <rect x="144" y="132" width="14" height="58" rx="3" fill="#93c5fd" opacity="0.70"/>
      <line x1="72" y1="191" x2="162" y2="191" stroke="#cbd5e1" strokeWidth="1"/>
      {/* Donut */}
      <circle cx="224" cy="160" r="30" fill="none" stroke="#dbeafe" strokeWidth="16"/>
      <circle cx="224" cy="160" r="30" fill="none" stroke="#2563eb" strokeWidth="16"
        strokeDasharray="82 106" strokeDashoffset="26"/>
      <circle cx="224" cy="160" r="30" fill="none" stroke="#60a5fa" strokeWidth="16"
        strokeDasharray="40 148" strokeDashoffset="-56"/>
      <circle cx="224" cy="160" r="16" fill="white" opacity="0.96"/>
      <text x="224" y="165" textAnchor="middle" fontSize="10" fill="#1e40af" fontWeight="bold">87%</text>
      {/* Line chart */}
      <polyline points="178,186 192,172 206,178 220,160 234,166 248,148 262,154 276,136 290,142"
        stroke="#3b82f6" strokeWidth="2.2" fill="none" strokeLinejoin="round" opacity="0.65"/>
      {/* Plant */}
      <ellipse cx="352" cy="180" rx="18" ry="24" fill="#4ade80" opacity="0.36"/>
      <ellipse cx="336" cy="165" rx="14" ry="19" fill="#22c55e" opacity="0.30"/>
      <ellipse cx="365" cy="160" rx="12" ry="16" fill="#86efac" opacity="0.33"/>
      <rect x="346" y="192" width="9" height="22" rx="3" fill="#86efac" opacity="0.40"/>
      <rect x="334" y="205" width="32" height="10" rx="4" fill="#4ade80" opacity="0.28"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────
   Input helpers
────────────────────────────────────────────────────── */
function IconInput({ icon: IconC, hint, ...props }) {
  return (
    <div>
      <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white
        transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
        dark:border-slate-600 dark:bg-slate-800">
        <div className="flex w-10 shrink-0 items-center justify-center">
          <IconC width={15} height={15} className="text-slate-400"/>
        </div>
        <input
          className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
          {...props}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PasswordInput({ show, onToggle, ...props }) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white
      transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
      dark:border-slate-600 dark:bg-slate-800">
      <div className="flex w-10 shrink-0 items-center justify-center">
        <Icon.Lock width={15} height={15} className="text-slate-400"/>
      </div>
      <input
        type={show ? 'text' : 'password'}
        className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600">
        {show ? <Icon.EyeOff width={15} height={15}/> : <Icon.Eye width={15} height={15}/>}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   REGISTER PAGE
────────────────────────────────────────────────────── */
export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/auth/registration-status')
      .then(({ data }) => setOpen(data.data.open))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi kata sandi tidak cocok');
    if (form.username.length < 3) return toast.error('Username minimal 3 karakter');
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        username: form.username,
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
        <Spinner size={32}/>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f6fb] dark:bg-slate-900 lg:bg-white lg:dark:bg-slate-950">
      <AuthLeftPanel illustration={<DashboardIllustration />} />

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10
          shadow-sm dark:border-slate-700 dark:bg-slate-900
          lg:rounded-none lg:border-0 lg:shadow-none lg:bg-transparent lg:dark:bg-transparent lg:px-10 lg:py-0">

          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {!open ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                <Icon.Warning width={28} height={28}/>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrasi Ditutup</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                Akun sudah dibuat. Silakan masuk menggunakan akun yang terdaftar.
              </p>
              <Link to="/login" className="btn-primary mt-6 inline-flex">
                Ke Halaman Masuk
              </Link>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-6 text-center">
                <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Daftar Akun
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Buat akun bendahara untuk mengakses sistem POSPAY
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {/* Nama Lengkap */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nama Lengkap
                  </label>
                  <IconInput
                    icon={Icon.User}
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                {/* Username — manual input */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <IconInput
                    icon={Icon.User}
                    type="text"
                    placeholder="Masukkan username (contoh: bendahara)"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
                    hint="Username digunakan untuk login. Minimal 3 karakter, tanpa spasi."
                    required
                  />
                </div>

                {/* No. HP */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    No. HP <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <IconInput
                    icon={Icon.Phone}
                    type="tel"
                    placeholder="Masukkan nomor HP"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Sekolah <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <IconInput
                    icon={Icon.Mail}
                    type="email"
                    placeholder="Masukkan email sekolah"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <PasswordInput
                    show={showPassword}
                    onToggle={() => setShowPassword(v => !v)}
                    placeholder="Masukkan kata sandi (min. 6 karakter)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Konfirmasi Kata Sandi
                  </label>
                  <PasswordInput
                    show={showConfirm}
                    onToggle={() => setShowConfirm(v => !v)}
                    placeholder="Masukkan ulang kata sandi"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-brand-600 py-3
                    text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60
                    transition-colors shadow-sm mt-1">
                  {loading ? <Spinner size={18} className="text-white"/> : 'Daftar'}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
                <span className="text-xs text-slate-400">atau</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
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
