import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import EmployeeFormModal from '../components/admin/EmployeeFormModal';
import { employeeApi } from '../api/employee.api';
import { useAlertContext } from '../context/AlertContext';

const ROLE_STYLES = {
    editor: { bg: 'bg-blue-50', text: 'text-info', label: 'Editor' },
    viewer: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Viewer' },
};

const EmployeeManager = () => {
    const { showToast } = useAlertContext();

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const fetchEmployees = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await employeeApi.getAll();
            setEmployees(res.data.data);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to load employees', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleAdd = () => {
        setEditTarget(null);
        setFormOpen(true);
    };

    const handleEdit = (employee) => {
        setEditTarget(employee);
        setFormOpen(true);
    };

    const handleToggleActive = async (employee) => {
        setTogglingId(employee.id);
        try {
            await employeeApi.update(employee.id, { is_active: !employee.is_active });
            showToast(
                `${employee.username} ${employee.is_active ? 'deactivated' : 'activated'} successfully`,
                'success'
            );
            fetchEmployees(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update employee status', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await employeeApi.delete(deleteTarget.id);
            showToast(`Employee "${deleteTarget.username}" deleted successfully`, 'success');
            setDeleteTarget(null);
            fetchEmployees(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete employee', 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">
                    {/* Page Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-navy-dark">Employee Management</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage staff accounts, roles, permissions and tank access
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchEmployees(true)}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>

                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-primary-dark transition"
                            >
                                <Plus size={16} />
                                Add Employee
                            </button>
                        </div>
                    </div>

                    {/* Employees Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size="large" />
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="bg-white rounded-card shadow-card p-10 text-center">
                            <p className="text-gray-500">No employees yet. Click "Add Employee" to create one.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-card shadow-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="py-3 px-5">Employee</th>
                                            <th className="py-3 px-5">Contact</th>
                                            <th className="py-3 px-5">Role</th>
                                            <th className="py-3 px-5">Tank Access</th>
                                            <th className="py-3 px-5">Status</th>
                                            <th className="py-3 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => {
                                            const roleStyle = ROLE_STYLES[emp.role] || ROLE_STYLES.viewer;
                                            return (
                                                <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                                                    <td className="py-3.5 px-5">
                                                        <p className="font-semibold text-navy-dark">{emp.full_name || emp.username}</p>
                                                        <p className="text-xs text-gray-400">@{emp.username}</p>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <p className="text-navy-dark">{emp.phone || '—'}</p>
                                                        <p className="text-xs text-gray-400">{emp.email || 'No email'}</p>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                                                            {roleStyle.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <span className="text-navy-dark font-medium">
                                                            {emp.tank_access?.length || 0} tank{emp.tank_access?.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <button
                                                            onClick={() => handleToggleActive(emp)}
                                                            disabled={togglingId === emp.id}
                                                            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition disabled:opacity-50 ${emp.is_active
                                                                    ? 'bg-green-50 text-success hover:bg-green-100'
                                                                    : 'bg-red-50 text-danger hover:bg-red-100'
                                                                }`}
                                                        >
                                                            {emp.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                                                            {emp.is_active ? 'Active' : 'Inactive'}
                                                        </button>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleEdit(emp)}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-50 text-info transition"
                                                                title="Edit employee"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteTarget(emp)}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 text-danger transition"
                                                                title="Delete employee"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <EmployeeFormModal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={() => fetchEmployees(true)}
                employee={editTarget}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Employee"
                message={`Are you sure you want to permanently delete "${deleteTarget?.username}"? This action cannot be undone.`}
                confirmLabel="Delete Employee"
                loading={deleting}
                danger
            />
        </div>
    );
};

export default EmployeeManager;