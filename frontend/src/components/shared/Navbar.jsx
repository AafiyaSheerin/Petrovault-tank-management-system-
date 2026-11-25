import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Bell, LogOut, User, ChevronDown, KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useAlertContext } from '../../context/AlertContext';
import { authApi } from '../../api/auth.api';
import Modal from './Modal';
import Logo from './Logo';

const ROLE_LABELS = {
    admin: 'Administrator',
    editor: 'Editor',
    viewer: 'Viewer',
};

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { showToast } = useAlertContext();
    const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
    const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm({ current: '', newPass: '', confirm: '' });
            setError('');
        }
    }, [isOpen]);

    const toggle = (field) => setShow(prev => ({ ...prev, [field]: !prev[field] }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.current || !form.newPass || !form.confirm) {
            return setError('All fields are required');
        }
        if (form.newPass.length < 6) {
            return setError('New password must be at least 6 characters');
        }
        if (form.newPass !== form.confirm) {
            return setError('New passwords do not match');
        }
        if (form.current === form.newPass) {
            return setError('New password must be different from current password');
        }

        setLoading(true);
        try {
            await authApi.changePassword(form.current, form.newPass);
            showToast('Password changed successfully', 'success');
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const PasswordField = ({ label, field, placeholder }) => (
        <div>
            <label className="block text-sm font-semibold text-navy-dark mb-1.5">{label}</label>
            <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type={show[field] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark text-sm"
                />
                <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-dark"
                >
                    {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password" maxWidth="max-w-sm">
            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordField label="Current Password" field="current" placeholder="Enter current password" />
                <PasswordField label="New Password" field="newPass" placeholder="At least 6 characters" />
                <PasswordField label="Confirm New Password" field="confirm" placeholder="Repeat new password" />

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 border border-gray-200 text-navy-dark font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60 text-sm"
                    >
                        {loading ? 'Saving...' : 'Change Password'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthContext();
    const { unreadCount } = useAlertContext();

    const [menuOpen, setMenuOpen] = useState(false);
    const [changePassOpen, setChangePassOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const openChangePassword = () => {
        setMenuOpen(false);
        setChangePassOpen(true);
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Logo size={36} />
                    <span className="font-bold text-lg text-navy-dark">PetroVault</span>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {/* Notification Bell */}
                    <button
                        onClick={() => navigate('/admin')}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
                        title="Alerts"
                    >
                        <Bell size={20} className="text-navy-dark" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User size={16} className="text-primary" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-semibold text-navy-dark leading-tight">
                                    {user?.full_name || user?.username}
                                </p>
                                <p className="text-xs text-gray-500 leading-tight">
                                    {ROLE_LABELS[user?.role] || user?.role}
                                </p>
                            </div>
                            <ChevronDown size={16} className="text-gray-400" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-cardHover border border-gray-100 py-2 animate-slideIn z-50">
                                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                    <p className="text-sm font-semibold text-navy-dark">{user?.full_name || user?.username}</p>
                                    <p className="text-xs text-gray-500">@{user?.username}</p>
                                </div>
                                <button
                                    onClick={openChangePassword}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-navy-dark hover:bg-gray-50 transition"
                                >
                                    <KeyRound size={15} className="text-primary" />
                                    Change Password
                                </button>
                                <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50 transition"
                                    >
                                        <LogOut size={15} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <ChangePasswordModal isOpen={changePassOpen} onClose={() => setChangePassOpen(false)} />
        </>
    );
};

export default Navbar;