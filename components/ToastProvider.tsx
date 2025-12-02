import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'rare-card';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  rareCard: (cardName: string, rarity: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message, icon: '✅' });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, icon: '❌', duration: 7000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, icon: '⚠️' });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message, icon: 'ℹ️' });
  }, [addToast]);

  const rareCard = useCallback((cardName: string, rarity: string) => {
    addToast({ 
      type: 'rare-card', 
      title: `${rarity} obtenue !`, 
      message: cardName,
      icon: rarity === 'Légendaire' ? '🌟' : rarity === 'Épique' ? '💎' : '✨',
      duration: 8000
    });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, rareCard }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Individual Toast Item
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-forest-600 border-forest-500',
  error: 'bg-blood-600 border-blood-500',
  warning: 'bg-yellow-600 border-yellow-500',
  info: 'bg-blue-600 border-blue-500',
  'rare-card': 'bg-gradient-to-r from-valthera-600 to-purple-600 border-valthera-400 animate-glow',
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  return (
    <div 
      className={`${toastStyles[toast.type]} border rounded-lg p-4 shadow-xl text-white animate-fade-in flex items-start gap-3 min-w-[280px]`}
      role="alert"
    >
      {toast.icon && <span className="text-xl flex-shrink-0">{toast.icon}</span>}
      <div className="flex-1">
        <p className="font-bold font-medieval">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>}
      </div>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label="Fermer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default ToastProvider;
