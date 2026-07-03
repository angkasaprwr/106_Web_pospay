import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, Modal, Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const TABS = [
  { id: 'security', label: 'Keamanan Akun', icon: Icon.Shield },
  { id: 'help', label: 'Bantuan', icon: Icon.HelpCircle },
  { id: 'about', label: 'Tentang Aplikasi', icon: Icon.Info },
];

function SettingsFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">
            <Icon.School width={20} height={20} />
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">SMP Pusponegoro Brebes</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Jl. Pusponegoro No. 1, Brebes</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 POSPAY. Semua hak dilindungi.</p>
      </div>
    </footer>
  );
}

function SecurityTab({ onChangePassword }) {
  return (
    <div className={`${CARD} p-5 sm:p-8`}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#0056D2] dark:text-blue-400">Keamanan Akun</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola keamanan akun Anda untuk menjaga data tetap aman.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800/40 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#0056D2] dark:bg-sky-950/50 dark:text-blue-400">
              <Icon.Lock width={22} height={22} />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Kata Sandi</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ubah kata sandi akun Anda secara berkala untuk keamanan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangePassword}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#0056D2] bg-white px-5 py-2.5 text-sm font-semibold text-[#0056D2] hover:bg-blue-50 dark:border-blue-500 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Icon.Wrench width={16} height={16} />
            Ganti
          </button>
        </div>
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className={`${CARD} p-5 sm:p-8`}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#0056D2] dark:text-blue-400">Bantuan</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dapatkan bantuan seputar tagihan, pembayaran, dan dispensasi.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center dark:border-slate-600 dark:bg-slate-800/30">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-800">
          <Icon.HelpCircle width={24} height={24} />
        </div>
        <p className="font-medium text-slate-600 dark:text-slate-300">Chatbot Bantuan</p>
        <p className="mt-1 max-w-sm text-sm text-slate-400 dark:text-slate-500">
          Tanyakan seputar tagihan dan pembayaran melalui asisten keuangan sekolah.
        </p>
        <Link
          to="/bantuan"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0056D2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#004BB8] dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Icon.Chat width={18} height={18} />
          Buka Chatbot
        </Link>
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className={`${CARD} p-5 sm:p-8`}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#0056D2] dark:text-blue-400">Tentang Aplikasi</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Informasi mengenai aplikasi POSPAY untuk siswa.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-600 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0056D2] text-white dark:bg-blue-600">
            <Icon.School width={24} height={24} />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">POSPAY</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sistem Informasi Keuangan Sekolah</p>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
          <p><span className="font-medium text-slate-700 dark:text-slate-200">Versi:</span> 1.0.0</p>
          <p className="mt-2"><span className="font-medium text-slate-700 dark:text-slate-200">Sekolah:</span> SMP Pusponegoro Brebes</p>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Portal siswa untuk melihat tagihan, melakukan pembayaran, mengajukan dispensasi, dan memantau riwayat keuangan.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'security';
  const [tab, setTab] = useState(initialTab);
  const [pwdModal, setPwdModal] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changing, setChanging] = useState(false);

  const selectTab = (id) => {
    setTab(id);
    if (id === 'security') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', id);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    if (TABS.some((t) => t.id === tabParam) && tabParam !== tab) {
      setTab(tabParam);
    }
  }, [tabParam]); // eslint-disable-line

  const openPasswordModal = () => {
    setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    setPwdModal(true);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    setChanging(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success('Password diubah, silakan login kembali');
      setPwdModal(false);
      setTimeout(logout, 1200);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0056D2] dark:text-blue-400 sm:text-3xl">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola pengaturan akun Anda.</p>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap gap-0 border-b border-slate-100 dark:border-slate-700">
          {TABS.map((t) => {
            const IconC = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`inline-flex items-center gap-2 border-b-[3px] px-5 py-4 text-sm font-semibold transition ${
                  active
                    ? 'border-[#0056D2] text-[#0056D2] dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <IconC width={18} height={18} className={active ? 'text-[#0056D2] dark:text-blue-400' : 'text-slate-400'} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'security' && <SecurityTab onChangePassword={openPasswordModal} />}
      {tab === 'help' && <HelpTab />}
      {tab === 'about' && <AboutTab />}

      <Modal
        open={pwdModal}
        onClose={() => setPwdModal(false)}
        title="Ganti Kata Sandi"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPwdModal(false)}>
              Batal
            </button>
            <button type="button" className="btn-primary" onClick={changePassword} disabled={changing}>
              {changing ? <Spinner size={16} className="text-white" /> : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="Password Lama">
            <input
              type="password"
              className="input"
              value={pwd.currentPassword}
              onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
              placeholder="Masukkan password lama"
              required
            />
          </Field>
          <Field label="Password Baru">
            <input
              type="password"
              className="input"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
              placeholder="Masukkan password baru"
              required
            />
          </Field>
          <Field label="Konfirmasi Password Baru">
            <input
              type="password"
              className="input"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              placeholder="Ulangi password baru"
              required
            />
          </Field>
        </form>
      </Modal>

      <SettingsFooter />
    </div>
  );
}
