import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icons';

export default function ThemeToggleButton({ className = '' }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`fixed right-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
    >
      {theme === 'dark' ? <Icon.Sun width={20} height={20} /> : <Icon.Moon width={20} height={20} />}
    </button>
  );
}
