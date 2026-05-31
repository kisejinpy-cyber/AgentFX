'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Loader2, Info, X, ExternalLink } from 'lucide-react';
import { explorerTxUrl } from '@/lib/constants';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, update: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  loading: Loader2,
  info: Info,
};

const COLOR_MAP = {
  success: 'border-emerald-500/40 bg-emerald-950/60',
  error: 'border-red-500/40 bg-red-950/60',
  loading: 'border-cyan-500/40 bg-cyan-950/60',
  info: 'border-blue-500/40 bg-blue-950/60',
};

const ICON_COLOR_MAP = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  loading: 'text-cyan-400 animate-spin',
  info: 'text-blue-400',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = ICON_MAP[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl
        animate-slide-up max-w-sm w-full
        ${COLOR_MAP[toast.type]}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_COLOR_MAP[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-400 mt-1 break-words">{toast.message}</p>
        )}
        {toast.txHash && (
          <a
            href={explorerTxUrl(toast.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
          >
            View on ArcScan
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);

    if (toast.type !== 'loading') {
      const duration = toast.duration ?? 5000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, update: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, ...update } : t))
    );

    if (update.type && update.type !== 'loading') {
      const duration = update.duration ?? 5000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, updateToast }}>
      {children}
      {/* Toast Container — fixed bottom-right */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
