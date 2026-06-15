import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ── Register left panel illustration: dashboard on browser window ── */
function DashboardIllustration() {
  return (
    <svg viewBox="0 0 380 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      {/* Books stack – left */}
      <rect x="6"  y="196" width="64" height="12" rx="4" fill="#93c5fd" opacity="0.58" />
      <rect x="12" y="184" width="56" height="12" rx="4" fill="#bfdbfe" opacity="0.48" />
      <rect x="18" y="172" width="48" height="12" rx="4" fill="#dbeafe" opacity="0.38" />

      {/* Browser window frame */}
      <rect x="60" y="14" width="264" height="186" rx="12" fill="white" opacity="0.96" />
      {/* Browser top bar */}
      <rect x="60" y="14" width="264" height="28" rx="12" fill="#e8eef8" opacity="0.9" />
      <rect x="60" y="30" width="264" height="12" fill="#e8eef8" opacity="0.9" />
      {/* Traffic light dots */}
      <circle cx="80"  cy="28" r="5" fill="#f87171" opacity="0.75" />
      <circle cx="95"  cy="28" r="5" fill="#fbbf24" opacity="0.75" />
      <circle cx="110" cy="28" r="5" fill="#4ade80" opacity="0.75" />
      {/* URL bar */}
      <rect x="122" y="21" width="130" height="14" rx="7" fill="white" opacity="0.8" />

      {/* Stat mini-cards row */}
      <rect x="72"  y="52" width="54" height="28" rx="5" fill="#dbeafe" opacity="0.9" />
      <rect x="134" y="52" width="54" height="28" rx="5" fill="#dcfce7" opacity="0.9" />
      <rect x="196" y="52" width="54" height="28" rx="5" fill="#fef3c7" opacity="0.9" />
      <rect x="258" y="52" width="54" height="28" rx="5" fill="#fce7f3" opacity="0.9" />

      {/* Bar chart */}
      <rect x="72"  y="154" width="14" height="36" rx="3" fill="#2563eb" opacity="0.70" />
      <rect x="90"  y="140" width="14" height="50" rx="3" fill="#2563eb" opacity="0.80" />
      <rect x="108" y="126" width="14" height="64" rx="3" fill="#2563eb" />
      <rect x="126" y="144" width="14" height="46" rx="3" fill="#60a5fa" opacity="0.80" />
      <rect x="144" y="132" width="14" height="58" rx="3" fill="#93c5fd" opacity="0.70" />
      <line x1="72" y1="191" x2="162" y2="191" stroke="#cbd5e1" strokeWidth="1" />

      {/* Donut chart */}
      <circle cx="224" cy="160" r="30" fill="none" stroke="#dbeafe" strokeWidth="16" />
      <circle cx="224" cy="160" r="30" fill="none" stroke="#2563eb" strokeWidth="16"
        strokeDasharray="82 106" strokeDashoffset="26" />
      <circle cx="224" cy="160" r="30" fill="none" stroke="#60a5fa" strokeWidth="16"
        strokeDasharray="40 148" strokeDashoffset="-56" />
      <circle cx="224" cy="160" r="16" fill="white" opacity="0.96" />
      <text x="224" y="165" textAnchor="middle" fontSize="10" fill="#1e40af" fontWeight="bold">87%</text>

      {/* Line chart (right half, overlapping donut area) */}
      <polyline
        points="178,186 192,172 206,178 220,160 234,166 248,148 262,154 276,136 290,142"
        stroke="#3b82f6" strokeWidth="2.2" fill="none" strokeLinejoin="round" opacity="0.65" />

      {/* Plant – right */}
      <ellipse cx="352" cy="180" rx="18" ry="24" fill="#4ade80" opacity="0.36" />
      <ellipse cx="336" cy="165" rx="14" ry="19" fill="#22c55e" opacity="0.30" />
      <ellipse cx="365" cy="160" rx="12" ry="16" fill="#86efac" opacity="0.33" />
      <rect x="346" y="192" width="9" height="22" rx="3" fill="#86efac" opacity="0.40" />
      <rect x="334" y="205" width="32" height="10" rx="4" fill="#4ade80" opacity="0.28" />
    </svg>
  );
}

/* ── Shared left panel ── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] shrink-0 flex-col bg-gradient-to-br from-[#1a56db] to-[#1e3a8a] text-white">
      <div className="flex flex-1 flex-col items-center px-10 xl:px-12 py-10 text-center">
        {/* POSPAY logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="14" width="24" height="14" rx="3" fill="#1d4ed8" />
              <rect x="8" y="18" width="7" height="6" rx="1.5" fill="white" opacity="0.7" />
              <rect x="4" y="17" width="24" height="3" fill="#1e40af" opacity="0.6" />
              <path d="M8 14 L16 7 L24 14" stroke="#1d4ed8" strokeWidth="2" fill="none" strokeLinejoin="round" />
              <circle cx="16" cy="11" r="2.5" fill="#2563eb" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold tracking-tight">POSPAY</span>
        </div>

        {/* Title */}
        <p className="mt-4 text-base font-semibold leading-snug text-white/90 xl:text-lg">
          Sistem Informasi Keuangan Sekolah<br />Berbasis Website
        </p>

        {/* Divider */}
        <div className="mt-4 h-px w-10 bg-white/40" />

        {/* Chatbot button */}
        <button className="mt-5 flex items-center gap-2.5 rounded-xl bg-[#1535a8]/70 px-5 py-2.5 text-sm font-semibold text-white shadow-inner hover:bg-[#1535a8] transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Dengan Fitur Bantuan Chatbot
        </button>

        {/* Illustration */}
        <div className="mt-5 w-full flex items-center justify-center">
          <DashboardIllustration />
        </div>
      </div>

      {/* SMP footer */}
      <div className="border-t border-white/15 px-8 xl:px-10 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Studi Kasus</p>
        <div className="mt-2 flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
            <circle cx="20" cy="20" r="19" fill="#f59e0b" />
            <circle cx="20" cy="20" r="15" fill="#1d4ed8" />
            <circle cx="20" cy="20" r="12" fill="#1e40af" />
            <path d="M14 22 L20 14 L26 22 Z" fill="#fbbf24" opacity="0.9" />
            <rect x="16" y="22" width="8" height="6" rx="1" fill="#fbbf24" opacity="0.8" />
            <path d="M12 18 Q20 12 28 18" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
            <text x="20" y="34" textAnchor="middle" fontSize="5" fill="#fbbf24" fontWeight="bold">BREBES</text>
          </svg>
          <div>
            <p className="font-bold text-sm leading-tight">SMP Pusponegoro Brebes</p>
            <div className="mt-1 h-px w-20 bg-white/30" />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-blue-200 leading-relaxed">
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
