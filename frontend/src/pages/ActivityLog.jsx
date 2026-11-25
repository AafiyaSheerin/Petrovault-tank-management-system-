import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Filter, Calendar, TrendingUp, TrendingDown, LogIn, LogOut, Plus, Pencil, Trash2, Shield, FileText, Download } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import axiosClient from '../api/axiosClient';
import { useAlertContext } from '../context/AlertContext';
import { useAuthContext } from '../context/AuthContext';
import { format } from 'date-fns';

const ACTION_CONFIG = {
    login: { icon: LogIn, color: '#22c55e', label: 'Login' },
    logout: { icon: LogOut, color: '#64748b', label: 'Logout' },
    add_stock: { icon: TrendingUp, color: '#22c55e', label: 'Stock Added' },
    remove_stock: { icon: TrendingDown, color: '#eab308', label: 'Stock Removed' },
    add_tank: { icon: Plus, color: '#7c3aed', label: 'Tank Created' },
    edit_tank: { icon: Pencil, color: '#3b82f6', label: 'Tank Edited' },
    delete_tank: { icon: Trash2, color: '#ef4444', label: 'Tank Deleted' },
    add_product: { icon: Plus, color: '#7c3aed', label: 'Product Created' },
    edit_product: { icon: Pencil, color: '#3b82f6', label: 'Product Edited' },
    delete_product: { icon: Trash2, color: '#ef4444', label: 'Product Deleted' },
    add_employee: { icon: Plus, color: '#7c3aed', label: 'Employee Added' },
    edit_employee: { icon: Pencil, color: '#3b82f6', label: 'Employee Edited' },
    delete_employee: { icon: Trash2, color: '#ef4444', label: 'Employee Deleted' },
    update_permissions: { icon: Shield, color: '#3b82f6', label: 'Permissions Updated' },
    grant_tank_access: { icon: Shield, color: '#22c55e', label: 'Tank Access Granted' },
    revoke_tank_access: { icon: Shield, color: '#ef4444', label: 'Tank Access Revoked' },
    export_pdf: { icon: FileText, color: '#7c3aed', label: 'PDF Exported' },
    export_sheets: { icon: Download, color: '#7c3aed', label: 'Sheets Exported' },
    view_report: { icon: FileText, color: '#3b82f6', label: 'Report Viewed' },
    send_alert: { icon: Shield, color: '#eab308', label: 'Alert Sent' },
};

const ACTION_OPTIONS = [
    { value: '', label: 'All Actions' },
    ...Object.entries(ACTION_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
];

const ActivityLog = () => {
    const { showToast } = useAlertContext();
    const { isAdmin } = useAuthContext();

    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

    const [clearOpen, setClearOpen] = useState(false);
    const [clearDays, setClearDays] = useState('90');
    const [clearing, setClearing] = useState(false);

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const params = { page, limit: 25 };
            if (actionFilter) params.action = actionFilter;

            const res = await axiosClient.get('/logs', { params });
            setLogs(res.data.data.logs);
            setPagination(res.data.data.pagination);
        } catch (error) {
            // ignore
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, actionFilter]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await axiosClient.get('/logs/stats');
            setStats(res.data.data);
        } catch (error) {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleFilterChange = (value) => {
        setActionFilter(value);
        setPage(1);
    };

    const handleRefresh = () => {
        fetchLogs(true);
        fetchStats();
    };

    const handleClearLogs = async () => {
        setClearing(true);
        try {
            await axiosClient.delete('/logs/clear', { data: { days: Number(clearDays) } });
            showToast(
                Number(clearDays) > 0
                    ? `Cleared logs older than ${clearDays} days`
                    : 'All logs cleared',
                'success'
            );
            setClearOpen(false);
            setPage(1);
            fetchLogs();
            fetchStats();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to clear logs', 'error');
        } finally {
            setClearing(false);
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
                            <h1 className="text-2xl font-bold text-navy-dark">Activity Log</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Complete audit trail of all actions across PetroVault
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <button
                                    onClick={() => setClearOpen(true)}
                                    className="flex items-center gap-2 bg-white border border-danger/30 text-danger font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-red-50 transition"
                                >
                                    <Trash2 size={16} />
                                    Clear Logs
                                </button>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Actions Today</p>
                                <p className="text-2xl font-bold text-navy-dark">{stats.today_total}</p>
                            </div>
                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Stock Added Today</p>
                                <p className="text-2xl font-bold text-success">{stats.stock_added_today}</p>
                            </div>
                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Logins Today</p>
                                <p className="text-2xl font-bold text-info">{stats.logins_today}</p>
                            </div>
                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Most Active User</p>
                                <p className="text-2xl font-bold text-primary">{stats.most_active_user}</p>
                            </div>
                        </div>
                    )}

                    {/* Filter */}
                    <div className="bg-white rounded-card shadow-card p-4 mb-4 flex items-center gap-3">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={actionFilter}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="text-sm font-medium text-navy-dark bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        >
                            {ACTION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-400 ml-auto">
                            {pagination.total} total record{pagination.total !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Logs List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size="large" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="bg-white rounded-card shadow-card p-10 text-center">
                            <p className="text-gray-500">No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-card shadow-card overflow-hidden">
                            <div className="divide-y divide-gray-50">
                                {logs.map((log) => {
                                    const config = ACTION_CONFIG[log.action] || { icon: FileText, color: '#64748b', label: log.action };
                                    const Icon = config.icon;
                                    return (
                                        <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50/50 transition">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${config.color}15` }}
                                            >
                                                <Icon size={18} style={{ color: config.color }} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-navy-dark text-sm">{log.username}</span>
                                                    <span
                                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                                    >
                                                        {config.label}
                                                    </span>
                                                    {log.role && (
                                                        <span className="text-xs text-gray-400 capitalize">({log.role})</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5">{log.description}</p>
                                                {log.tank_name && (
                                                    <p className="text-xs text-gray-400 mt-0.5">Tank: {log.tank_name}</p>
                                                )}
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                                    <Calendar size={11} />
                                                    {format(new Date(log.created_at), 'dd MMM yyyy')}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {format(new Date(log.created_at), 'HH:mm:ss')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {pagination.total_pages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="text-sm font-semibold text-navy-dark px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-500">
                                        Page {page} of {pagination.total_pages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                                        disabled={page === pagination.total_pages}
                                        className="text-sm font-semibold text-navy-dark px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <ConfirmDialog
                isOpen={clearOpen}
                onClose={() => setClearOpen(false)}
                onConfirm={handleClearLogs}
                title="Clear Activity Logs"
                message={
                    <div className="text-left w-full">
                        <p className="mb-3">Choose how much history to clear:</p>
                        <select
                            value={clearDays}
                            onChange={(e) => setClearDays(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-navy-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                            <option value="30">Older than 30 days</option>
                            <option value="90">Older than 90 days</option>
                            <option value="180">Older than 180 days</option>
                            <option value="365">Older than 1 year</option>
                            <option value="0">Everything (all logs)</option>
                        </select>
                    </div>
                }
                confirmLabel="Clear Logs"
                loading={clearing}
                danger
            />
        </div>
    );
};

export default ActivityLog;