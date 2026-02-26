import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ToastContext = createContext({ addToast: () => {} });

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const addToast = ({ type = 'info', title = '', message = '' }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, title, message }]);
    setTimeout(() => remove(id), 3500);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail) addToast(e.detail);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 w-[320px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-2xl shadow-lg border px-4 py-3 animate-fade-in-up ' +
              (t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : t.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-slate-200 text-stone-800')
            }
          >
            {t.title && <div className="font-semibold text-sm">{t.title}</div>}
            {t.message && <div className="text-sm">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export const emitToast = (payload) => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: payload }));
};
