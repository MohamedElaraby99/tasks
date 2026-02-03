import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

let globalToasts: Toast[] = [];
const toastListeners: Array<(toasts: Toast[]) => void> = [];

const notifyToastListeners = () => {
  toastListeners.forEach((listener) => listener([...globalToasts]));
};

export const addToast = (message: string, type: ToastType = 'success') => {
  const toast: Toast = {
    id: Math.random().toString(36).substr(2, 9),
    message,
    type,
    createdAt: Date.now(),
  };
  globalToasts = [...globalToasts, toast];
  notifyToastListeners();
  setTimeout(() => removeToast(toast.id), 5000);
};

export const removeToast = (id: string) => {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  notifyToastListeners();
};

const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      const i = toastListeners.indexOf(listener);
      if (i !== -1) toastListeners.splice(i, 1);
    };
  }, []);
  return { toasts };
};

const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    default:
      return <Info className="w-5 h-5 text-blue-400" />;
  }
};

export function ToastContainer() {
  const { toasts } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-xl shadow-lg backdrop-blur-xl border animate-slide-in ${
            toast.type === 'success'
              ? 'bg-green-500/20 border-green-500/30'
              : toast.type === 'error'
                ? 'bg-red-500/20 border-red-500/30'
                : toast.type === 'warning'
                  ? 'bg-yellow-500/20 border-yellow-500/30'
                  : 'bg-blue-500/20 border-blue-500/30'
          }`}
        >
          <ToastIcon type={toast.type} />
          <p className="text-white text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
