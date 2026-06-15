import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ── Shared left panel illustration: dashboard on screen ── */
function DashboardIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-xl">
      {/* Books stack left */}
      <rect x="8" y="148" width="52" height="10" rx="3" fill="#93c5fd" opacity="0.6" />
      <rect x="12" y="138" width="44" height="10" rx="3" fill="#bfdbfe" opacity="0.5" />
      <rect x="16" y="128" width="38" height="10" rx="3" fill="#dbeafe" opacity="0.4" />

      {/* Browser window */}
      <rect x="54" y="20" width="210" height="150" rx="10" fill="white" opacity="0.95" />
      {/* Browser chrome bar */}
      <rect x="54" y="20" width="210" height="26" rx="10" fill="#e2e8f0" opacity="0.8" />
      <circle cx="72" cy="33" r="4" fill="#f87171" opacity="0.8" />
      <circle cx="84" cy="33" r="4" fill="#fbbf24" opacity="0.8" />
      <circle cx="96" cy="33" r="4" fill="#4ade80" opacity="0.8" />
      <rect x="108" y="28" width="100" height="10" rx="5" fill="white" opacity="0.7" />

      {/* Cards inside browser */}
      <rect x="64" y="56" width="42" height="24" rx="4" fill="#dbeafe" />
      <rect x="114" y="56" width="42" height="24" rx="4" fill="#dcfce7" />
      <rect x="164" y="56" width="42" height="24" rx="4" fill="#fef3c7" />
      <rect x="214" y="56" width="42" height="24" rx="4" fill="#fce7f3" />

      {/* Bar chart */}
      <rect x="64" y="120" width="12" height="36" rx="2" fill="#2563eb" opacity="0.7" />
      <rect x="80" y="110" width="12" height="46" rx="2" fill="#2563eb" opacity="0.8" />
      <rect x="96" y="100" width="12" height="56" rx="2" fill="#2563eb" />
      <rect x="112" y="115" width="12" height="41" rx="2" fill="#60a5fa" opacity="0.8" />
      <rect x="128" y="105" width="12" height="51" rx="2" fill="#93c5fd" opacity="0.7" />
      {/* X-axis */}
      <line x1="64" y1="157" x2="145" y2="157" stroke="#cbd5e1" strokeWidth="1" />

      {/* Pie / donut chart */}
      <circle cx="195" cy="128" r="26" fill="none" stroke="#dbeafe" strokeWidth="14" />
      <circle cx="195" cy="128" r="26" fill="none" stroke="#2563eb" strokeWidth="14"
        strokeDasharray="72 92" strokeDashoffset="23" />
      <circle cx="195" cy="128" r="26" fill="none" stroke="#60a5fa" strokeWidth="14"
        strokeDasharray="36 128" strokeDashoffset="-49" />
      <circle cx="195" cy="128" r="14" fill="white" opacity="0.95" />
      <text x="195" y="132" textAnchor="middle" fontSize="9" fill="#1e40af" fontWeight="bold">87%</text>

      {/* Line chart snippet */}
      <polyline points="155,148 165,138 175,142 185,130 195,135 205,120 215,125 225,112 235,118 245,105"
        stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinejoin="round" opacity="0.7" />

      {/* Plant right */}
      <ellipse cx="294" cy="165" rx="16" ry="20" fill="#4ade80" opacity="0.35" />
      <ellipse cx="280" cy="155" rx="12" ry="16" fill="#22c55e" opacity="0.3" />
      <ellipse cx="305" cy="150" rx="10" ry="14" fill="#86efac" opacity="0.3" />
      <rect x="290" y="168" width="8" height="18" rx="2" fill="#86efac" opacity="0.4" />
      <rect x="282" y="178" width="24" height="8" rx="3" fill="#4ade80" opacity="0.3" />
    </svg>
  );
}

/* ── Shared left panel ── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 shrink-0 flex-col bg-gradient-to-br from-[#1a56db] to-[#1e3a8a] text-white">
      <div className="flex flex-1 flex-col px-10 xl:px-12 py-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
            <Icon.School width={24} height={24} className="text-brand-700" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">POSPAY</span>
        </div>

        {/* Title + rule + chatbot button */}
        <div className="mt-6">
          <h1 className="text-2xl xl:text-3xl font-extrabold leading-snug">
            Sistem Informasi Keuangan Sekolah Berbasis Website
          </h1>
          <div className="mt-4 h-px w-12 bg-white/40" />
          <button className="mt-5 flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition">
            <Icon.Chat width={16} height={16} />
            Dengan Fitur Bantuan Chatbot
          </button>
        </div>

        {/* Illustration */}
        <div className="mt-6 flex-1 flex items-center">
          <DashboardIllustration />
        </div>
      </div>

      {/* SMP info footer */}
      <div className="border-t border-white/20 px-10 xl:px-12 py-6">
        <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-2">Studi Kasus</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icon.Shield width={18} height={18} />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">SMP Pusponegoro Brebes</p>
            <div className="mt-0.5 h-px w-24 bg-white/30" />
          </div>
        </div>
        <p className="mt-3 text-xs text-blue-200 leading-relaxed">
          POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
        </p>
      </div>
    </div>
  );
}

/* ── Input field with left icon ── */
function IconInput({ icon: IconC, className = '', ...props }) {
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 ${className}`}>
      <div className="flex w-10 shrink-0 items-center justify-center">
        <IconC width={15} height={15} className="text-slate-400" />
      </div>
      <input
        className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
    </div>
  );
}

/* ── Password input with icon + toggle ── */
function PasswordInput({ show, onToggle, ...props }) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex w-10 shrink-0 items-center justify-center">
        <Icon.Lock width={15} height={15} className="text-slate-400" />
      </div>
      <input
        type={show ? 'text' : 'password'}
        className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
      >
        {show ? <Icon.EyeOff width={15} height={15} /> : <Icon.Eye width={15} height={15} />}
      </button>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
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
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white px-6 py-10 dark:bg-slate-950 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {!open ? (
            /* ── Registration closed state ── */
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
              {/* Heading */}
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-[#1a3c6e] dark:text-white">Daftar</h2>
                <div className="mx-auto mt-1.5 h-0.5 w-8 rounded-full bg-brand-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Buat akun bendahara untuk mengakses sistem POSPAY
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {/* NIK */}
                <div>
                  <label className="label">NIK</label>
                  <IconInput
                    icon={Icon.Hash}
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan NIK"
                    value={form.nik}
                    onChange={handleNikChange}
                    maxLength={16}
                    required
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="label">Nama Lengkap</label>
                  <IconInput
                    icon={Icon.User}
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
                  <IconInput
                    icon={Icon.Phone}
                    type="tel"
                    placeholder="Masukkan nomor HP"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {/* Email Sekolah */}
                <div>
                  <label className="label">Email Sekolah</label>
                  <IconInput
                    icon={Icon.Mail}
                    type="email"
                    placeholder="Masukkan email sekolah"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {/* Username (auto-generated) */}
                <div>
                  <label className="label">Username</label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex w-10 shrink-0 items-center justify-center">
                      <Icon.User width={15} height={15} className="text-slate-300" />
                    </div>
                    <input
                      type="text"
                      className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-slate-400 placeholder-slate-400 outline-none cursor-not-allowed"
                      placeholder="Akan otomatis ter-generate menggunakan NIK"
                      value={form.nik}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="label">Kata Sandi</label>
                  <PasswordInput
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    placeholder="Masukkan kata sandi"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label className="label">Konfirmasi Kata Sandi</label>
                  <PasswordInput
                    show={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    placeholder="Masukkan ulang kata sandi"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 mt-1"
                  disabled={loading}
                >
                  {loading ? <Spinner size={18} className="text-white" /> : 'Daftar'}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
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
