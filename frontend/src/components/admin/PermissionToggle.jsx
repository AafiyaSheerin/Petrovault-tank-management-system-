import React from 'react';

const PermissionToggle = ({ label, checked, onChange, disabled = false }) => {
    return (
        <label className={`flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="text-sm font-medium text-navy-dark">{label}</span>
            <button
                type="button"
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300'}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </label>
    );
};

export default PermissionToggle;