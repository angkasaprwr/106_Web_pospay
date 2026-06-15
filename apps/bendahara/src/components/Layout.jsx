import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

const NAV = [
  { to: '/', label: 'Beranda', icon: Icon.Dashboard, end: true },
  { to: '/siswa', label: 'Data Siswa', icon: Icon.Students },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills },
  { to: '/pembayaran', label: 'Pembayaran', icon: Icon.Payment },
  { to: '/dispensasi', label: 'Dispensasi', icon: Icon.Dispensation },
  { to: '/laporan', label: 'Laporan', icon: Icon.Report },
  { to: '/chatbot', label: 'Chatbot', icon: Icon.Chat },
  { to: '/pengaturan', label: 'Pengaturan', icon: Icon.Settings },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Icon.School width={20} height={20} />
      </div>
      <div>
        <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">POSPAY</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Bendahara</p>
      </div>
    </Link>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef();

  const load = async () => {
    try {
      const { data } = await api.get('/notifications?limit=10');
      setItems(data.data);
      setUnread(data.meta?.unread || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative rounded-lg p-2">
        <Icon.Bell width={20} height={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 card z-40 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="font-semibold">Notifikasi</span>
            <button onClick={markAll} className="text-xs text-brand-600 hover:underline">
              Tandai dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada notifikasi</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`border-b border-slate-100 px-4 py-3 dark:border-slate-800 ${!n.readAt ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {(user?.fullName || 'B')[0].toUpperCase()}
        </div>
        <span className="hidden text-sm font-medium sm:inline">{user?.fullName}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 card z-40 overflow-hidden py-1">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-400">@{user?.username}</p>
          </div>
          <button onClick={() => go('/profil')} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon.User width={16} height={16} /> Profil Saya
          </button>
          <button onClick={() => go('/pengaturan')} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon.Settings width={16} height={16} /> Pengaturan
          </button>
          <button onClick={() => go('/pengaturan/tentang')} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon.Info width={16} height={16} /> Bantuan
          </button>
          <button onClick={logout} className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-900/20">
            <Icon.Logout width={16} height={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon width={20} height={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost rounded-lg p-2 lg:hidden">
            <Icon.Menu />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="btn-ghost rounded-lg p-2" title="Ganti tema">
              {theme === 'dark' ? <Icon.Sun width={20} height={20} /> : <Icon.Moon width={20} height={20} />}
            </button>
            <Notifications />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
