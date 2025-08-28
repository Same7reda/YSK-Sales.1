import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircleIcon, XCircleIcon, InfoIcon } from './icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_DURATION = 4000;

const Toast: React.FC<{ message: ToastMessage; onDismiss: (id: number) => void }> = ({ message, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(message.id), 300); // Wait for fade out animation
        }, TOAST_DURATION);

        return () => clearTimeout(timer);
    }, [message.id, onDismiss]);

    const ICONS: Record<ToastType, React.ReactNode> = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
        error: <XCircleIcon className="w-6 h-6 text-red-500" />,
        info: <InfoIcon className="w-6 h-6 text-blue-500" />,
    };

    const BORDER_COLORS: Record<ToastType, string> = {
        success: 'border-green-500',
        error: 'border-red-500',
        info: 'border-blue-500',
    };

    return (
        <div
            onClick={() => onDismiss(message.id)}
            className={`bg-white rounded-lg shadow-2xl p-4 flex items-center gap-4 border-r-4 ${BORDER_COLORS[message.type]} transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        >
            {ICONS[message.type]}
            <p className="text-gray-800 font-semibold">{message.message}</p>
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; dismissToast: (id: number) => void }> = ({ toasts, dismissToast }) => {
    const portalRoot = document.getElementById('root');
    if (!portalRoot) return null;

    return ReactDOM.createPortal(
        <div className="fixed bottom-8 left-8 z-[100] flex flex-col-reverse space-y-3 space-y-reverse">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast} onDismiss={dismissToast} />
            ))}
        </div>,
        portalRoot
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const value = { addToast };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} dismissToast={dismissToast} />
        </ToastContext.Provider>
    );
};
