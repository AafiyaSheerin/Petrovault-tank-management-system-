import React, { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import Modal from '../shared/Modal';
import PermissionToggle from './PermissionToggle';
import TankAccessManager from './TankAccessManager';
import { employeeApi } from '../../api/employee.api';
import { useAlertContext } from '../../context/AlertContext';

const PERMISSION_FIELDS = [
    { key: 'can_view_tanks', label: 'View Tanks' },
    { key: 'can_add_stock', label: 'Add / Remove Stock' },
    { key: 'can_edit_tank', label: 'Edit Tank Details' },
    { key: 'can_delete_tank', label: 'Delete Tanks' },
    { key: 'can_view_reports', label: 'View Reports' },
    { key: 'can_export', label: 'Export PDF / Sheets' },
    { key: 'can_view_logs', label: 'View Activity Log' },
    { key: 'can_convert_volume', label: 'Use Volume Converter' },
];

// Permissions that Viewers are never allowed to have
const VIEWER_LOCKED_PERMISSIONS = ['can_add_stock', 'can_edit_tank', 'can_delete_tank'];

const initialForm = {
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'viewer',
};

const initialPermissions = {
    can_view_tanks: true,
    can_add_stock: false,
    can_edit_tank: false,
    can_delete_tank: false,
    can_view_reports: false,
    can_export: false,
    can_view_logs: false,
    can_convert_volume: true,
};

const EmployeeFormModal = ({ isOpen, onClose, onSuccess, employee }) => {
    const { showToast } = useAlertContext();
    const isEdit = !!employee;

    const [form, setForm] = useState(initialForm);
    const [permissions, setPermissions] = useState(initialPermissions);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetting, setResetting] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (employee) {
                setForm({
                    username: employee.username || '',
                    full_name: employee.full_name || '',
                    email: employee.email || '',
                    phone: employee.phone || '',
                    password: '',
                    role: employee.role || 'viewer',
                });
                setPermissions(employee.permissions || initialPermissions);
                setCurrentEmployee(employee);
            } else {
                setForm(initialForm);
                setPermissions(initialPermissions);
                setCurrentEmployee(null);
            }
        }
    }, [isOpen, employee]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (role) => {
        setForm(prev => ({ ...prev, role }));
        // When switching to viewer, force edit-type permissions off immediately
        if (role === 'viewer') {
            setPermissions(prev => {
                const updated = { ...prev };
                VIEWER_LOCKED_PERMISSIONS.forEach(key => { updated[key] = false; });
                return updated;
            });
        }
    };

    const handlePermissionChange = (key, value) => {
        setPermissions(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username.trim()) {
            setError('Username is required');
            return;
        }

        if (!isEdit && !form.password.trim()) {
            setError('Password is required');
            return;
        }

        if (!isEdit && form.password.trim().length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        // Clamp locked permissions to false for viewers before saving
        const finalPermissions = { ...permissions };
        if (form.role === 'viewer') {
            VIEWER_LOCKED_PERMISSIONS.forEach(key => { finalPermissions[key] = false; });
        }
        try {
            if (isEdit) {
                const updatePayload = {
                    full_name: form.full_name.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    role: form.role,
                };
                // Only send password if admin typed a new one
                if (form.password.trim()) {
                    updatePayload.password = form.password.trim();
                }
                await employeeApi.update(employee.id, updatePayload);
                await employeeApi.updatePermissions(employee.id, finalPermissions);
                showToast(`Employee "${form.username}" updated successfully`, 'success');
            } else {
                const res = await employeeApi.create({
                    username: form.username.trim().toLowerCase(),
                    full_name: form.full_name.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    password: form.password.trim(),
                    role: form.role,
                });
                await employeeApi.updatePermissions(res.data.data.id, finalPermissions);
                showToast(`Employee "${form.username}" created successfully`, 'success');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} employee`);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!form.password.trim()) {
            showToast('Enter a new password in the Password field first, then save.', 'warning');
            return;
        }
        setResetting(true);
        try {
            await employeeApi.update(employee.id, { password: form.password.trim() });
            showToast(`Password updated for ${employee.username}`, 'success');
            setForm(prev => ({ ...prev, password: '' }));
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reset password', 'error');
        } finally {
            setResetting(false);
        }
    };

    const handleTankAccessUpdate = async () => {
        try {
            const res = await employeeApi.getOne(employee.id);
            setCurrentEmployee(res.data.data);
        } catch {
            // ignore
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Employee — ${employee?.username}` : 'Add New Employee'}
            maxWidth="max-w-2xl"
        >
            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <div>
                    <h3 className="text-sm font-bold text-navy-dark mb-3">Basic Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Username *
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                disabled={isEdit}
                                placeholder="e.g. ravi"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark disabled:bg-gray-100 disabled:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                placeholder="e.g. Ravi Kumar"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="e.g. ravi@example.com"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Password {isEdit ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : <span className="text-danger">*</span>}
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder={isEdit ? 'Enter new password to change' : 'Set login password'}
                                autoComplete="new-password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                            {!isEdit && (
                                <p className="text-xs text-gray-400 mt-1">Min 6 characters. Any letters, numbers or symbols.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                Phone Number <span className="text-gray-400 font-normal">(optional, for contact)</span>
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="e.g. 9876543210"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                            Role *
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleRoleChange('editor')}
                                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm border transition ${form.role === 'editor'
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-navy-dark border-gray-200 hover:border-primary/40'
                                    }`}
                            >
                                Editor — can add/remove stock
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleChange('viewer')}
                                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm border transition ${form.role === 'viewer'
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-navy-dark border-gray-200 hover:border-primary/40'
                                    }`}
                            >
                                Viewer — view only
                            </button>
                        </div>
                    </div>

                    {isEdit && (
                        <p className="text-xs text-gray-400 mt-2">
                            <Key size={11} className="inline mr-1" />
                            To change this employee's password, fill in the Password field above and save.
                        </p>
                    )}
                </div>

                {/* Permissions */}
                <div>
                    <h3 className="text-sm font-bold text-navy-dark mb-3">Feature Permissions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border border-gray-100 rounded-lg p-2">
                        {PERMISSION_FIELDS.map((field) => {
                            const isViewerLocked = form.role === 'viewer' && VIEWER_LOCKED_PERMISSIONS.includes(field.key);
                            return (
                                <PermissionToggle
                                    key={field.key}
                                    label={field.label}
                                    checked={isViewerLocked ? false : !!permissions[field.key]}
                                    onChange={(val) => handlePermissionChange(field.key, val)}
                                    disabled={isViewerLocked}
                                />
                            );
                        })}
                    </div>
                    {form.role === 'viewer' && (
                        <p className="text-xs text-gray-400 mt-2">
                            Edit-type permissions are unavailable for Viewer accounts.
                        </p>
                    )}
                </div>

                {/* Tank Access — only for existing employees */}
                {isEdit && currentEmployee && (
                    <div>
                        <h3 className="text-sm font-bold text-navy-dark mb-3">Tank Access</h3>
                        <div className="border border-gray-100 rounded-lg p-3">
                            <TankAccessManager employee={currentEmployee} onUpdate={handleTankAccessUpdate} />
                        </div>
                    </div>
                )}

                {!isEdit && (
                    <div className="bg-blue-50 border border-info/20 rounded-lg p-3">
                        <p className="text-xs text-gray-600">
                            Tank access can be assigned after creating the employee — edit them again to grant access to specific tanks.
                        </p>
                    </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 border border-gray-200 text-navy-dark font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60"
                    >
                        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EmployeeFormModal;