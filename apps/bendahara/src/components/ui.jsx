import { useEffect } from 'react';
import { Icon } from './Icons';

export function Spinner({ size = 24, className = '' }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size={36} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ status, map }) {
  const meta = map?.[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

export function EmptyState({ title = 'Belum ada data', description, icon: IconC = Icon.Info, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-800">
        <IconC width={28} height={28} />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={`mt-10 w-full ${sizes[size]} card animate-[slidein_.2s_ease-out]`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} disabled={!onClose} className="btn-ghost rounded-lg p-1.5 disabled:opacity-40">
            <Icon.X width={18} height={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
      <span>Total {total} data</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary px-3 py-1">
          Sebelumnya
        </button>
        <span className="px-3">
          {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="btn-secondary px-3 py-1">
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export function Field({ label, error, children, required }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function StatCard({ label, value, icon: IconC, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      {IconC && (
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <IconC width={24} height={24} />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title = 'Konfirmasi', message, confirmText = 'Hapus', onConfirm, onClose, loading, danger = true }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              if (loading) return;
              onConfirm?.();
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} className="text-white" />
                Menghapus…
              </span>
            ) : confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}
