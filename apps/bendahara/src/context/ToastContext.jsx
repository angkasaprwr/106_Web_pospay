import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext();

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const toast = {
    success: (m) => push('success', m),
    error: (m) => { if (!m) return; push('error', m); },
    info: (m) => push('info', m),
  };

  const styles = {
    success: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    info: 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`animate-[slidein_.2s_ease-out] rounded-lg border-l-4 p-3 text-sm shadow-lg ${styles[t.type]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span>{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-lg leading-none opacity-60 hover:opacity-100">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
