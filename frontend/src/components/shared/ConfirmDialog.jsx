import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Delete',
    loading = false,
    danger = true,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
            <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${danger ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <AlertTriangle size={24} className={danger ? 'text-danger' : 'text-warning'} />
                </div>
                <div className="text-sm text-gray-600 mb-6 w-full">{message}</div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-200 text-navy-dark font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 ${danger ? 'bg-danger hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'
                            }`}
                    >
                        {loading ? 'Please wait...' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;