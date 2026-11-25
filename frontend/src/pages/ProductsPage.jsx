import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, RefreshCw, Pencil, Trash2, Plus, ChevronRight, ChevronDown, FileText, Download } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { productApi } from '../api/product.api';
import { exportApi } from '../api/export.api';
import { useAuthContext } from '../context/AuthContext';
import { useAlertContext } from '../context/AlertContext';
import { format } from 'date-fns';

const STATUS_COLORS = {
    empty: '#94a3b8',
    critical: '#ef4444',
    warning: '#eab308',
    healthy: '#22c55e',
};

const PRODUCT_COLORS = [
    '#22c55e', '#f97316', '#3b82f6', '#8b5cf6',
    '#ef4444', '#eab308', '#78716c', '#854d0e', '#06b6d4', '#ec4899'
];

// ─── Product Form Modal ───────────────────────────────────────────────────────
const ProductFormModal = ({ isOpen, onClose, onSuccess, product }) => {
    const { showToast } = useAlertContext();
    const [form, setForm] = useState({ name: '', description: '', density_kg_per_litre: 0.90, color: PRODUCT_COLORS[0] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isEdit = !!product;

    useEffect(() => {
        if (isOpen) {
            setForm({
                name: product?.name || '',
                description: product?.description || '',
                density_kg_per_litre: product?.density_kg_per_litre || 0.90,
                color: product?.color || PRODUCT_COLORS[Math.floor(Math.random() * PRODUCT_COLORS.length)],
            });
            setError('');
        }
    }, [isOpen, product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) { setError('Product name is required'); return; }

        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                density_kg_per_litre: Number(form.density_kg_per_litre) || 0.90,
                color: form.color,
            };
            if (isEdit) {
                await productApi.update(product.id, payload);
                showToast(`Product "${form.name}" updated`, 'success');
            } else {
                await productApi.create(payload);
                showToast(`Product "${form.name}" created`, 'success');
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} product`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Edit — ${product?.name}` : 'Add New Product'} maxWidth="max-w-md">
            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">Product Name *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange}
                        placeholder="e.g. Furnace Oil, Diesel"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">Description</label>
                    <input type="text" name="description" value={form.description} onChange={handleChange}
                        placeholder="Optional short description"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">Density (kg/L)</label>
                    <input type="number" name="density_kg_per_litre" value={form.density_kg_per_litre} onChange={handleChange}
                        step="0.01" min="0.1" max="2"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark" />
                    <p className="text-xs text-gray-400 mt-1">Used for Litres ↔ Metric Tonnes conversion (typical 0.7–1.1)</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">Display Color</label>
                    <div className="flex flex-wrap gap-2">
                        {PRODUCT_COLORS.map((c) => (
                            <button key={c} type="button"
                                onClick={() => setForm(prev => ({ ...prev, color: c }))}
                                className={`w-8 h-8 rounded-full border-2 transition ${form.color === c ? 'border-navy-dark scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose}
                        className="flex-1 border border-gray-200 text-navy-dark font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60">
                        {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// ─── Main ProductsPage ────────────────────────────────────────────────────────
const ProductsPage = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuthContext();
    const { showToast } = useAlertContext();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingSheets, setExportingSheets] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchProducts = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await productApi.getAll();
            setProducts(res.data.data);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to load products', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await productApi.delete(deleteTarget.id);
            showToast(`Product "${deleteTarget.name}" deleted`, 'success');
            setDeleteTarget(null);
            fetchProducts(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete product', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleExportPDF = async () => {
        setExportingPDF(true);
        try {
            const res = await exportApi.downloadTanksPDF();
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `petrovault-products-${format(new Date(), 'dd-MM-yyyy')}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Products PDF downloaded', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'PDF export failed', 'error');
        } finally {
            setExportingPDF(false);
        }
    };

    const handleExportSheets = async () => {
        setExportingSheets(true);
        try {
            const res = await exportApi.exportTanksSheets();
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `petrovault-products-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Products exported to Sheets', 'success');
        } catch (err) {
            let errMsg = 'Sheets export failed — check your Sheets configuration';
            if (err.response?.data instanceof Blob) {
                try { const t = await err.response.data.text(); errMsg = JSON.parse(t).message || errMsg; } catch {}
            } else if (err.response?.data?.message) errMsg = err.response.data.message;
            showToast(errMsg, 'error');
        } finally {
            setExportingSheets(false);
        }
    };

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-navy-dark">Products Overview</h1>
                            <p className="text-sm text-gray-500 mt-1">Total volume and tank breakdown per product</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchProducts(true)}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>

                            <button
                                onClick={handleExportPDF}
                                disabled={exportingPDF}
                                className="flex items-center gap-2 bg-danger text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                            >
                                <FileText size={15} />
                                {exportingPDF ? 'Generating...' : 'Export PDF'}
                            </button>

                            <button
                                onClick={handleExportSheets}
                                disabled={exportingSheets}
                                className="flex items-center gap-2 bg-success text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-green-600 transition disabled:opacity-60"
                            >
                                <Download size={15} />
                                {exportingSheets ? 'Exporting...' : 'Export to Sheets'}
                            </button>

                            {isAdmin && (
                                <button
                                    onClick={() => { setEditTarget(null); setFormOpen(true); }}
                                    className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-primary-dark transition"
                                >
                                    <Plus size={15} /> Add New Product
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Product List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size="large" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="bg-white rounded-card shadow-card p-12 text-center">
                            <Package size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No products yet</p>
                            {isAdmin && (
                                <button
                                    onClick={() => { setEditTarget(null); setFormOpen(true); }}
                                    className="mt-4 inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary-dark transition"
                                >
                                    <Plus size={14} /> Add First Product
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {products.map((product) => {
                                const isExpanded = !!expanded[product.id];
                                const totalVol = product.total_volume || 0;

                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                    >
                                        {/* ── Product Row ── */}
                                        <div className="flex items-center gap-4 px-5 py-4">
                                            {/* Icon */}
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${product.color}22` }}
                                            >
                                                <Package size={18} style={{ color: product.color }} />
                                            </div>

                                            {/* Name + tanks count */}
                                            <div className="flex-1 min-w-0">
                                                <h2 className="font-extrabold text-navy-dark text-base uppercase tracking-wide leading-tight truncate">
                                                    {product.name}
                                                </h2>
                                                <button
                                                    onClick={() => toggleExpand(product.id)}
                                                    className="text-xs text-gray-400 hover:text-primary transition mt-0.5 text-left"
                                                >
                                                    {product.tank_count} tank{product.tank_count !== 1 ? 's' : ''} · Click to view details
                                                </button>
                                            </div>

                                            {/* Total Volume */}
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <span
                                                    className="text-2xl font-extrabold"
                                                    style={{ color: totalVol > 0 ? '#4f46e5' : '#94a3b8' }}
                                                >
                                                    {totalVol > 0
                                                        ? totalVol.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                        : '0'} L
                                                </span>

                                                {/* Admin actions */}
                                                {isAdmin && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditTarget(product); setFormOpen(true); }}
                                                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-blue-50 text-info transition"
                                                            title="Edit product"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(product); }}
                                                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 text-danger transition"
                                                            title="Delete product"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Expand toggle */}
                                                <button
                                                    onClick={() => toggleExpand(product.id)}
                                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition"
                                                >
                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── Expanded Tank List ── */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 animate-fadeIn">
                                                {!product.tanks || product.tanks.length === 0 ? (
                                                    <p className="text-sm text-gray-400 text-center py-3">No tanks using this product</p>
                                                ) : (
                                                    <>
                                                        {/* Overall fill bar */}
                                                        <div className="mb-4">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500 font-medium">Overall Fill</span>
                                                                <span className="font-bold" style={{ color: '#4f46e5' }}>
                                                                    {product.overall_fill}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${Math.min(product.overall_fill, 100)}%`,
                                                                        backgroundColor: product.color,
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {(product.total_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                                                                {' / '}
                                                                {(product.total_capacity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L total capacity
                                                            </p>
                                                        </div>

                                                        {/* Individual tanks */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                            {product.tanks.map((t) => (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => navigate(`/tanks/${t.id}`)}
                                                                    className="bg-white rounded-xl p-3.5 text-left hover:shadow-card transition border border-gray-100 hover:border-primary/20 group"
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="font-bold text-navy-dark text-sm group-hover:text-primary transition">
                                                                            {t.name}
                                                                        </span>
                                                                        <span
                                                                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                                            style={{
                                                                                backgroundColor: `${STATUS_COLORS[t.status]}22`,
                                                                                color: STATUS_COLORS[t.status],
                                                                            }}
                                                                        >
                                                                            {t.fill_percentage}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                                                                        <div
                                                                            className="h-full rounded-full transition-all"
                                                                            style={{
                                                                                width: `${Math.min(t.fill_percentage, 100)}%`,
                                                                                backgroundColor: STATUS_COLORS[t.status],
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <p className="text-xs text-gray-400">
                                                                        {(t.current_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} / {(t.capacity_litres || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                                                                    </p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            <ProductFormModal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={() => fetchProducts(true)}
                product={editTarget}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? Only possible if no active tanks use this product.`}
                confirmLabel="Delete Product"
                loading={deleting}
                danger
            />
        </div>
    );
};

export default ProductsPage;