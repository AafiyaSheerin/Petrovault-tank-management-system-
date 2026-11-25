import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, Bell, BellOff, Mail, CheckCircle, XCircle, AlertTriangle, Power, Gauge, Save, X } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { alertApi } from '../api/alert.api';
import { productApi } from '../api/product.api';
import { useAlertContext } from '../context/AlertContext';
import { format } from 'date-fns';

const ALERT_TYPE_CONFIG = {
    low_stock: { label: 'Low Stock', color: '#ef4444', icon: AlertTriangle },
    high_stock: { label: 'High Stock', color: '#eab308', icon: AlertTriangle },
    tank_full: { label: 'Tank Full', color: '#ef4444', icon: AlertTriangle },
    tank_empty: { label: 'Tank Empty', color: '#64748b', icon: AlertTriangle },
    overfill_attempt: { label: 'Overfill Attempt', color: '#7c3aed', icon: AlertTriangle },
};

const ALERT_TYPE_OPTIONS = [
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'high_stock', label: 'High Stock' },
    { value: 'tank_full', label: 'Tank Full' },
    { value: 'tank_empty', label: 'Tank Empty' },
    { value: 'overfill_attempt', label: 'Overfill Attempt' },
];

// Add Recipient Modal
const AddRecipientModal = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useAlertContext();
    const [form, setForm] = useState({ email: '', full_name: '', alert_types: ['low_stock', 'high_stock', 'tank_full', 'overfill_attempt'] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm({ email: '', full_name: '', alert_types: ['low_stock', 'high_stock', 'tank_full', 'overfill_attempt'] });
            setError('');
        }
    }, [isOpen]);

    const toggleAlertType = (type) => {
        setForm(prev => ({
            ...prev,
            alert_types: prev.alert_types.includes(type)
                ? prev.alert_types.filter(t => t !== type)
                : [...prev.alert_types, type]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email.trim()) {
            setError('Email is required');
            return;
        }

        if (form.alert_types.length === 0) {
            setError('Please select at least one alert type');
            return;
        }

        setLoading(true);
        try {
            await alertApi.addRecipient({
                email: form.email.trim(),
                full_name: form.full_name.trim() || null,
                alert_types: form.alert_types,
            });
            showToast(`${form.email} added as alert recipient`, 'success');
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add recipient');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Alert Recipient" maxWidth="max-w-md">
            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. manager@company.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                        Full Name (optional)
                    </label>
                    <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="e.g. Site Manager"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-2">
                        Receive Alerts For *
                    </label>
                    <div className="space-y-2">
                        {ALERT_TYPE_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={form.alert_types.includes(opt.value)}
                                    onChange={() => toggleAlertType(opt.value)}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium text-navy-dark">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
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
                        {loading ? 'Adding...' : 'Add Recipient'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const AdminPanel = () => {
    const { showToast, markAllRead, unreadCount } = useAlertContext();

    const [alerts, setAlerts] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [recipientsLoading, setRecipientsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('alerts');

    const [addRecipientOpen, setAddRecipientOpen] = useState(false);
    const [deleteRecipient, setDeleteRecipient] = useState(null);
    const [deletingRecipient, setDeletingRecipient] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
    const [page, setPage] = useState(1);

    // Global email alert toggle
    const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Product alert thresholds
    const [products, setProducts] = useState([]);
    const [thresholds, setThresholds] = useState({});        // { productId: { low, high } }
    const [editingThresh, setEditingThresh] = useState({});  // { productId: { low: '', high: '' } }
    const [thresholdSaving, setThresholdSaving] = useState({});
    const [productThresholdsLoading, setProductThresholdsLoading] = useState(true);

    const fetchAlertToggle = useCallback(async () => {
        try {
            const res = await alertApi.getAlertToggle();
            setEmailAlertsEnabled(res.data.data.email_alerts_enabled);
        } catch { /* ignore */ }
    }, []);

    const fetchProductThresholds = useCallback(async () => {
        setProductThresholdsLoading(true);
        try {
            const [prodRes, threshRes] = await Promise.all([
                productApi.getAll(),
                productApi.getAlertThresholds(),
            ]);
            const allProducts = prodRes.data.data || [];
            const allThresholds = threshRes.data.data || [];

            setProducts(allProducts);

            const thMap = {};
            const editMap = {};
            allProducts.forEach(p => {
                const existing = allThresholds.find(t => t.product_id === p.id);
                thMap[p.id] = existing ? {
                    low: existing.low_threshold_litres,
                    high: existing.high_threshold_litres,
                } : { low: null, high: null };
                editMap[p.id] = {
                    low: existing?.low_threshold_litres ?? '',
                    high: existing?.high_threshold_litres ?? '',
                };
            });
            setThresholds(thMap);
            setEditingThresh(editMap);
        } catch { /* ignore */ } finally {
            setProductThresholdsLoading(false);
        }
    }, []);

    const handleGlobalToggle = async () => {
        setToggleLoading(true);
        try {
            const newVal = !emailAlertsEnabled;
            await alertApi.setAlertToggle(newVal);
            setEmailAlertsEnabled(newVal);
            showToast(`Email alerts ${newVal ? 'enabled' : 'disabled'} globally`, newVal ? 'success' : 'warning');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update toggle', 'error');
        } finally {
            setToggleLoading(false);
        }
    };

    const fetchAlerts = useCallback(async (silent = false) => {
        if (!silent) setAlertsLoading(true);
        try {
            const res = await alertApi.getAll({ page, limit: 20 });
            setAlerts(res.data.data.alerts);
            setPagination(res.data.data.pagination);
        } catch (error) {
            // ignore
        } finally {
            setAlertsLoading(false);
        }
    }, [page]);

    const fetchRecipients = useCallback(async () => {
        setRecipientsLoading(true);
        try {
            const res = await alertApi.getRecipients();
            setRecipients(res.data.data);
        } catch (error) {
            // ignore
        } finally {
            setRecipientsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    useEffect(() => {
        fetchRecipients();
        fetchAlertToggle();
        fetchProductThresholds();
    }, [fetchRecipients, fetchAlertToggle, fetchProductThresholds]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchAlerts(true), fetchRecipients(), fetchProductThresholds()]);
        setRefreshing(false);
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        fetchAlerts(true);
        showToast('All alerts marked as read', 'success');
    };

    const handleMarkOneRead = async (alert) => {
        if (alert.is_read) return;
        await alertApi.markAsRead(alert.id);
        fetchAlerts(true);
    };

    const handleToggleRecipient = async (recipient) => {
        try {
            await alertApi.updateRecipient(recipient.id, { is_active: !recipient.is_active });
            showToast(
                `${recipient.email} ${recipient.is_active ? 'deactivated' : 'activated'}`,
                'success'
            );
            fetchRecipients();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update recipient', 'error');
        }
    };

    const confirmDeleteRecipient = async () => {
        setDeletingRecipient(true);
        try {
            await alertApi.deleteRecipient(deleteRecipient.id);
            showToast(`${deleteRecipient.email} removed from alert recipients`, 'success');
            setDeleteRecipient(null);
            fetchRecipients();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete recipient', 'error');
        } finally {
            setDeletingRecipient(false);
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
                            <h1 className="text-2xl font-bold text-navy-dark">Alert Settings</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage email alert recipients and view triggered alerts
                            </p>
                        </div>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-5">
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'alerts'
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Bell size={16} />
                            Alerts
                            {unreadCount > 0 && (
                                <span className="bg-danger text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('recipients')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'recipients'
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Mail size={16} />
                            Email Recipients
                            <span className="bg-gray-200 text-gray-600 text-xs font-bold rounded-full px-1.5 py-0.5">
                                {recipients.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('product_alerts')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'product_alerts'
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Gauge size={16} />
                            Product Alerts
                            <span className="bg-gray-200 text-gray-600 text-xs font-bold rounded-full px-1.5 py-0.5">
                                {products.length}
                            </span>
                        </button>
                    </div>

                    {/* Alerts Tab */}
                    {activeTab === 'alerts' && (
                        <div>
                            {unreadCount > 0 && (
                                <div className="flex justify-end mb-3">
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-sm font-semibold text-primary hover:underline"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            )}

                            {alertsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader size="large" />
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="bg-white rounded-card shadow-card p-10 text-center">
                                    <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">No alerts triggered yet.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-card shadow-card overflow-hidden">
                                    <div className="divide-y divide-gray-50">
                                        {alerts.map((alert) => {
                                            const config = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.low_stock;
                                            const Icon = config.icon;
                                            return (
                                                <div
                                                    key={alert.id}
                                                    onClick={() => handleMarkOneRead(alert)}
                                                    className={`flex items-start gap-4 p-4 cursor-pointer transition ${alert.is_read ? 'hover:bg-gray-50/50' : 'bg-blue-50/30 hover:bg-blue-50/50'
                                                        }`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{ backgroundColor: `${config.color}15` }}
                                                    >
                                                        <Icon size={18} style={{ color: config.color }} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span
                                                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                                            >
                                                                {config.label}
                                                            </span>
                                                            {alert.tanks?.name && (
                                                                <span className="text-xs text-gray-400">Tank: {alert.tanks.name}</span>
                                                            )}
                                                            {!alert.is_read && (
                                                                <span className="w-2 h-2 bg-primary rounded-full" title="Unread" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-700 mt-0.5">{alert.message}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-xs text-gray-400">
                                                                Fill: {alert.fill_percentage}% &middot; Volume: {alert.current_volume?.toLocaleString()} / {alert.capacity?.toLocaleString()} L
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(alert.created_at), 'dd MMM yyyy')}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {format(new Date(alert.created_at), 'HH:mm')}
                                                        </p>
                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            {alert.email_sent ? (
                                                                <span className="flex items-center gap-1 text-xs text-success">
                                                                    <CheckCircle size={11} /> Email sent
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <XCircle size={11} /> No email
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

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
                        </div>
                    )}

                    {/* Recipients Tab */}
                    {activeTab === 'recipients' && (
                        <div>
                            {/* Global Email Alert Toggle Banner */}
                            <div className={`rounded-xl p-4 mb-4 border-2 flex items-center justify-between gap-4 transition ${emailAlertsEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emailAlertsEnabled ? 'bg-success/15' : 'bg-danger/15'}`}>
                                        <Power size={18} className={emailAlertsEnabled ? 'text-success' : 'text-danger'} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-navy-dark">
                                            Global Email Alerts — {emailAlertsEnabled ? '✅ ON' : '🔴 OFF'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {emailAlertsEnabled
                                                ? 'Alert emails are being sent to all active recipients'
                                                : 'All email alerts are paused — no emails will be sent'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGlobalToggle}
                                    disabled={toggleLoading}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                                        emailAlertsEnabled ? 'bg-success' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                        emailAlertsEnabled ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={() => setAddRecipientOpen(true)}
                                    className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-primary-dark transition"
                                >
                                    <Plus size={16} />
                                    Add Recipient
                                </button>
                            </div>

                            {recipientsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader size="large" />
                                </div>
                            ) : recipients.length === 0 ? (
                                <div className="bg-white rounded-card shadow-card p-10 text-center">
                                    <Mail size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">No email recipients yet. Add one to start receiving alerts.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-card shadow-card overflow-hidden">
                                    <div className="divide-y divide-gray-100">
                                        {recipients.map((recipient) => (
                                            <div key={recipient.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Mail size={18} className="text-primary" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-navy-dark">{recipient.email}</p>
                                                    {recipient.full_name && (
                                                        <p className="text-xs text-gray-400">{recipient.full_name}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {recipient.alert_types?.map((type) => {
                                                            const config = ALERT_TYPE_CONFIG[type];
                                                            return config ? (
                                                                <span
                                                                    key={type}
                                                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                                                >
                                                                    {config.label}
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleRecipient(recipient)}
                                                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${recipient.is_active
                                                                ? 'bg-green-50 text-success hover:bg-green-100'
                                                                : 'bg-red-50 text-danger hover:bg-red-100'
                                                            }`}
                                                    >
                                                        {recipient.is_active ? <Bell size={12} /> : <BellOff size={12} />}
                                                        {recipient.is_active ? 'Active' : 'Paused'}
                                                    </button>

                                                    <button
                                                        onClick={() => setDeleteRecipient(recipient)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 text-danger transition"
                                                        title="Remove recipient"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Product Alerts Tab */}
                    {activeTab === 'product_alerts' && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-info mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-navy-dark text-sm">How Product Alerts Work</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Set low and/or high volume thresholds per product (in Litres). When the <strong>total volume</strong> of all tanks
                                            sharing that product crosses a threshold, an alert is triggered and an email is sent to all active recipients.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {productThresholdsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader size="large" />
                                </div>
                            ) : products.length === 0 ? (
                                <div className="bg-white rounded-card shadow-card p-10 text-center">
                                    <Gauge size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">No products found. Add products first.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-card shadow-card overflow-hidden">
                                    <div className="divide-y divide-gray-100">
                                        {products.map((product) => {
                                            const saved = thresholds[product.id] || { low: null, high: null };
                                            const editing = editingThresh[product.id] || { low: '', high: '' };
                                            const hasThreshold = saved.low !== null || saved.high !== null;
                                            const isSaving = thresholdSaving[product.id];

                                            const handleSave = async () => {
                                                setThresholdSaving(prev => ({ ...prev, [product.id]: true }));
                                                try {
                                                    await productApi.setAlertThreshold(product.id, {
                                                        low_threshold_litres: editing.low === '' ? null : Number(editing.low),
                                                        high_threshold_litres: editing.high === '' ? null : Number(editing.high),
                                                    });
                                                    showToast(`Threshold saved for ${product.name}`, 'success');
                                                    fetchProductThresholds();
                                                } catch (err) {
                                                    showToast(err.response?.data?.message || 'Failed to save threshold', 'error');
                                                } finally {
                                                    setThresholdSaving(prev => ({ ...prev, [product.id]: false }));
                                                }
                                            };

                                            const handleClear = async () => {
                                                setThresholdSaving(prev => ({ ...prev, [product.id]: true }));
                                                try {
                                                    await productApi.removeAlertThreshold(product.id);
                                                    showToast(`Threshold cleared for ${product.name}`, 'success');
                                                    fetchProductThresholds();
                                                } catch (err) {
                                                    showToast(err.response?.data?.message || 'Failed to clear threshold', 'error');
                                                } finally {
                                                    setThresholdSaving(prev => ({ ...prev, [product.id]: false }));
                                                }
                                            };

                                            return (
                                                <div key={product.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-gray-50/50 transition">
                                                    {/* Product info */}
                                                    <div className="flex items-center gap-2 w-36 flex-shrink-0">
                                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: product.color || '#22c55e' }} />
                                                        <span className="font-semibold text-navy-dark text-sm truncate">{product.name}</span>
                                                    </div>

                                                    {/* Badge */}
                                                    {hasThreshold ? (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-success">Configured</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">No threshold</span>
                                                    )}

                                                    {/* Low threshold input */}
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="text-xs text-gray-500 whitespace-nowrap">Low (L)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="e.g. 5000"
                                                            value={editing.low}
                                                            onChange={(e) => setEditingThresh(prev => ({
                                                                ...prev,
                                                                [product.id]: { ...prev[product.id], low: e.target.value }
                                                            }))}
                                                            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger text-navy-dark"
                                                        />
                                                    </div>

                                                    {/* High threshold input */}
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="text-xs text-gray-500 whitespace-nowrap">High (L)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="e.g. 50000"
                                                            value={editing.high}
                                                            onChange={(e) => setEditingThresh(prev => ({
                                                                ...prev,
                                                                [product.id]: { ...prev[product.id], high: e.target.value }
                                                            }))}
                                                            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning text-navy-dark"
                                                        />
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <button
                                                            onClick={handleSave}
                                                            disabled={isSaving}
                                                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition disabled:opacity-60"
                                                        >
                                                            <Save size={12} />
                                                            {isSaving ? 'Saving…' : 'Save'}
                                                        </button>
                                                        {hasThreshold && (
                                                            <button
                                                                onClick={handleClear}
                                                                disabled={isSaving}
                                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-danger hover:bg-red-100 transition disabled:opacity-60"
                                                            >
                                                                <X size={12} />
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <AddRecipientModal
                isOpen={addRecipientOpen}
                onClose={() => setAddRecipientOpen(false)}
                onSuccess={fetchRecipients}
            />

            <ConfirmDialog
                isOpen={!!deleteRecipient}
                onClose={() => setDeleteRecipient(null)}
                onConfirm={confirmDeleteRecipient}
                title="Remove Recipient"
                message={`Are you sure you want to remove "${deleteRecipient?.email}" from alert recipients?`}
                confirmLabel="Remove"
                loading={deletingRecipient}
                danger
            />
        </div>
    );
};

export default AdminPanel;