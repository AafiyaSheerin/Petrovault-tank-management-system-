import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAlertContext } from '../../context/AlertContext';

const TOAST_STYLES = {
    success: { bg: 'bg-green-50', border: 'border-success/30', text: 'text-success', icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-danger/30', text: 'text-danger', icon: XCircle },
    warning: { bg: 'bg-yellow-50', border: 'border-warning/30', text: 'text-warning', icon: AlertTriangle },
    info: { bg: 'bg-blue-50', border: 'border-info/30', text: 'text-info', icon: Info },
};

const AlertBanner = () => {
    const { toast, clearToast } = useAlertContext();

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(clearToast, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast, clearToast]);

    if (!toast) return null;

    const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
    const Icon = style.icon;

    return (
        <div className="fixed top-20 right-6 z-50 animate-slideIn">
            <div className={`flex items-center gap-3 ${style.bg} ${style.border} border rounded-lg shadow-cardHover px-4 py-3 min-w-[280px] max-w-sm`}>
                <Icon size={20} className={style.text} />
                <p className="text-sm font-medium text-navy-dark flex-1">{toast.message}</p>
                <button onClick={clearToast} className="text-gray-400 hover:text-navy-dark">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default AlertBanner;