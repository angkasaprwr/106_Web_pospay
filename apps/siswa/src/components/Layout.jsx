import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

const NAV = [
  { to: '/', label: 'Beranda', icon: Icon.Dashboard, end: true },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills },
  { to: '/riwayat', label: 'Riwayat', icon: Icon.History },
  { to: '/bantuan', label: 'Bantuan', icon: Icon.Chat },
  { to: '/profil', label: 'Profil', icon: Icon.User },
];

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
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] card z-50 overflow-hidden shadow-lg">
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
                <div
                  key={n.id}
                  className={`border-b border-slate-100 px-4 py-3 dark:border-slate-800 ${!n.readAt ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}
                >
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

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-16 dark:bg-slate-950 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon.School width={18} height={18} />
          </div>
          <div className="hidden xs:block">
            <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">POSPAY</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Portal Siswa</p>
          </div>
        </Link>

        {/* Desktop / tablet nav */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon width={17} height={17} />
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button onClick={toggle} className="btn-ghost rounded-lg p-2" aria-label="Ganti tema">
            {theme === 'dark' ? <Icon.Sun width={20} height={20} /> : <Icon.Moon width={20} height={20} />}
          </button>
          <Notifications />
          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
            >
              {(user?.fullName || 'S')[0].toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 card z-50 overflow-hidden py-1 shadow-lg">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-400">NIS: {user?.username}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profil'); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon.User width={16} height={16} /> Profil Saya
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/pengaturan'); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon.Settings width={16} height={16} /> Pengaturan
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-900/20"
                >
                  <Icon.Logout width={16} height={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-screen-sm px-4 py-4 sm:max-w-screen-md sm:px-6 sm:py-6 lg:max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Footer (tablet+) */}
      <footer className="hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:block">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-6 py-3 text-xs text-slate-400">
          <span>SMP Pusponegoro Brebes</span>
          <span>© {new Date().getFullYear()} POSPAY</span>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                isActive ? 'text-brand-600' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <item.icon width={20} height={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
