import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader, Field, Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Settings() {
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changing, setChanging] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) return toast.error('Konfirmasi password tidak cocok');
    setChanging(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password diubah, silakan login kembali');
      setTimeout(logout, 1200);
    } catch (e) { toast.error(apiError(e)); } finally { setChanging(false); }
  };

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Keamanan akun & informasi" />

      <div className="space-y-5">
        <section className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-semibold"><Icon.Shield width={18} height={18} /> Keamanan Akun</h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Ubah password Anda secara berkala.</p>
          <form onSubmit={changePassword} className="space-y-3">
            <Field label="Password Lama"><input type="password" className="input" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required /></Field>
            <Field label="Password Baru"><input type="password" className="input" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required /></Field>
            <Field label="Konfirmasi Password Baru"><input type="password" className="input" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required /></Field>
            <button className="btn-primary" disabled={changing}>{changing ? <Spinner size={16} className="text-white" /> : 'Ubah Password'}</button>
          </form>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon.Settings width={18} height={18} /> Tampilan</h3>
          <button onClick={toggle} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <span className="flex items-center gap-2 text-sm">{theme === 'dark' ? <Icon.Moon width={18} height={18} /> : <Icon.Sun width={18} height={18} />} Mode {theme === 'dark' ? 'Gelap' : 'Terang'}</span>
            <span className="text-xs text-brand-600">Ubah</span>
          </button>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon.Chat width={18} height={18} /> Bantuan</h3>
          <Link to="/bantuan" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <span>Buka Chatbot Bantuan</span>
            <Icon.ChevronRight width={18} height={18} className="text-slate-400" />
          </Link>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon.Info width={18} height={18} /> Tentang Aplikasi</h3>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>POSPAY · Sistem Informasi Keuangan Sekolah</p>
            <p className="text-slate-400">Versi 1.0.0 · SMP Pusponegoro Brebes</p>
          </div>
        </section>

        <button onClick={logout} className="btn-secondary w-full text-red-600"><Icon.Logout width={18} height={18} /> Keluar</button>
      </div>
    </div>
  );
}
