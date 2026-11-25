import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw, TrendingUp, TrendingDown, BarChart2, Package, Sheet } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import { reportApi } from '../api/report.api';
import { exportApi } from '../api/export.api';
import { useAlertContext } from '../context/AlertContext';
import { format } from 'date-fns';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

const STATUS_COLORS = {
    empty: '#cbd5e1',
    critical: '#ef4444',
    warning: '#eab308',
    healthy: '#22c55e',
};

const ReportsPage = () => {
    const { showToast } = useAlertContext();

    const [tanks, setTanks] = useState([]);
    const [productSummary, setProductSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingSheets, setExportingSheets] = useState(false);
    const [exportingTankId, setExportingTankId] = useState(null); // tracks which tank row is exporting
    const [exportingTankType, setExportingTankType] = useState(null); // 'pdf' | 'sheets'
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const [tanksRes, productsRes] = await Promise.all([
                reportApi.getFull(),
                reportApi.getProductSummary(),
            ]);
            setTanks(tanksRes.data.data || []);
            setProductSummary(productsRes.data.data || []);
        } catch (error) {
            showToast('Failed to load report data', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportPDF = async () => {
        setExportingPDF(true);
        try {
            const res = await exportApi.downloadTanksPDF();
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `petrovault-report-${format(new Date(), 'dd-MM-yyyy')}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('PDF downloaded successfully', 'success');
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
            a.download = `petrovault-sheets-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Exported to Google Sheets successfully', 'success');
        } catch (err) {
            let errorMessage = 'Google Sheets export failed — check your Sheets configuration in .env';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text);
                    errorMessage = parsed.message || errorMessage;
                } catch (e) {
                    // Ignore parsing error, keep default
                }
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }
            showToast(errorMessage, 'error');
        } finally {
            setExportingSheets(false);
        }
    };

    // Per-tank export handlers
    const handleTankPDF = async (tank) => {
        setExportingTankId(tank.id);
        setExportingTankType('pdf');
        try {
            const res = await exportApi.downloadSingleTankPDF(tank.id);
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `petrovault-${tank.name.replace(/\s+/g, '-')}-${format(new Date(), 'dd-MM-yyyy')}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast(`PDF for "${tank.name}" downloaded`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'PDF export failed', 'error');
        } finally {
            setExportingTankId(null);
            setExportingTankType(null);
        }
    };

    const handleTankSheets = async (tank) => {
        setExportingTankId(tank.id);
        setExportingTankType('sheets');
        try {
            const res = await exportApi.exportSingleTankSheets(tank.id);
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `petrovault-${tank.name.replace(/\s+/g, '-')}-${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            showToast(`Sheets for "${tank.name}" downloaded`, 'success');
        } catch (err) {
            let errMsg = 'Sheets export failed';
            if (err.response?.data instanceof Blob) {
                try { const t = await err.response.data.text(); errMsg = JSON.parse(t).message || errMsg; } catch {}
            } else if (err.response?.data?.message) errMsg = err.response.data.message;
            showToast(errMsg, 'error');
        } finally {
            setExportingTankId(null);
            setExportingTankType(null);
        }
    };

    // Summary stats
    const totalTanks = tanks.length;
    const healthyCount = tanks.filter(t => t.status === 'healthy').length;
    const warningCount = tanks.filter(t => t.status === 'warning').length;
    const criticalCount = tanks.filter(t => t.status === 'critical').length;
    const emptyCount = tanks.filter(t => t.status === 'empty').length;
    const totalVolume = tanks.reduce((sum, t) => sum + (t.current_volume || 0), 0);
    const totalCapacity = tanks.reduce((sum, t) => sum + (t.capacity_litres || 0), 0);
    const overallFill = totalCapacity > 0 ? Math.round((totalVolume / totalCapacity) * 100 * 10) / 10 : 0;

    // Chart data
    const tankChartData = tanks.map(t => ({
        name: t.name,
        fill: t.fill_percentage,
        volume: t.current_volume,
    }));

    const productChartData = productSummary.map(p => ({
        name: p.product_name,
        fill: p.overall_fill,
        volume: Math.round(p.total_volume / 1000), // KL
    }));

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">
                    {/* Page Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-navy-dark">Reports</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Tank status overview and export options
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>

                            <button
                                onClick={handleExportPDF}
                                disabled={exportingPDF}
                                className="flex items-center gap-2 bg-danger text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                            >
                                <FileText size={16} />
                                {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
                            </button>

                            <button
                                onClick={handleExportSheets}
                                disabled={exportingSheets}
                                className="flex items-center gap-2 bg-success text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-green-600 transition disabled:opacity-60"
                            >
                                <Download size={16} />
                                {exportingSheets ? 'Exporting...' : 'Export to Sheets'}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size="large" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-card shadow-card p-5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Tanks</p>
                                    <p className="text-3xl font-bold text-navy-dark">{totalTanks}</p>
                                </div>
                                <div className="bg-white rounded-card shadow-card p-5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Overall Fill</p>
                                    <p className="text-3xl font-bold text-primary">{overallFill}%</p>
                                    <p className="text-xs text-gray-400 mt-1">{(totalVolume / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} KL / {(totalCapacity / 1000).toLocaleString()} KL</p>
                                </div>
                                <div className="bg-white rounded-card shadow-card p-5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status Breakdown</p>
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                        <span className="text-xs font-semibold text-success">{healthyCount} Healthy</span>
                                        <span className="text-xs font-semibold text-warning">{warningCount} Warning</span>
                                        <span className="text-xs font-semibold text-danger">{criticalCount} Critical</span>
                                        <span className="text-xs font-semibold text-gray-400">{emptyCount} Empty</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-card shadow-card p-5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Products</p>
                                    <p className="text-3xl font-bold text-navy-dark">{productSummary.length}</p>
                                    <p className="text-xs text-gray-400 mt-1">across all tanks</p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-5">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'overview'
                                            ? 'bg-primary text-white'
                                            : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <BarChart2 size={16} />
                                    Tank Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('products')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'products'
                                            ? 'bg-primary text-white'
                                            : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Package size={16} />
                                    Product Summary
                                </button>
                                <button
                                    onClick={() => setActiveTab('table')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'table'
                                            ? 'bg-primary text-white'
                                            : 'bg-white text-navy-dark border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <FileText size={16} />
                                    Full Table
                                </button>
                            </div>

                            {/* Tank Overview Chart */}
                            {activeTab === 'overview' && (
                                <div className="bg-white rounded-card shadow-card p-6">
                                    <h2 className="text-lg font-bold text-navy-dark mb-4 flex items-center gap-2">
                                        <BarChart2 size={18} className="text-primary" />
                                        Tank Fill Levels
                                    </h2>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={tankChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                formatter={(value) => [`${value}%`, 'Fill Level']}
                                            />
                                            <Bar dataKey="fill" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Fill Level" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Product Summary Chart */}
                            {activeTab === 'products' && (
                                <div className="space-y-4">
                                    <div className="bg-white rounded-card shadow-card p-6">
                                        <h2 className="text-lg font-bold text-navy-dark mb-4 flex items-center gap-2">
                                            <Package size={18} className="text-primary" />
                                            Volume by Product (KL)
                                        </h2>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <BarChart data={productChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit=" KL" />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                    formatter={(value) => [`${value} KL`, 'Volume']}
                                                />
                                                <Bar dataKey="volume" fill="#22c55e" radius={[4, 4, 0, 0]} name="Volume (KL)" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="bg-white rounded-card shadow-card overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                                                    <th className="py-3 px-5">Product</th>
                                                    <th className="py-3 px-5">Tanks</th>
                                                    <th className="py-3 px-5">Total Volume</th>
                                                    <th className="py-3 px-5">Total Capacity</th>
                                                    <th className="py-3 px-5">Overall Fill</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productSummary.map((p) => (
                                                    <tr key={p.product_name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                        <td className="py-3.5 px-5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="font-semibold text-navy-dark">{p.product_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-navy-dark">{p.tank_count}</td>
                                                        <td className="py-3.5 px-5 text-navy-dark">{p.total_volume?.toLocaleString()} L</td>
                                                        <td className="py-3.5 px-5 text-navy-dark">{p.total_capacity?.toLocaleString()} L</td>
                                                        <td className="py-3.5 px-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{ width: `${Math.min(p.overall_fill, 100)}%`, backgroundColor: p.color }}
                                                                    />
                                                                </div>
                                                                <span className="font-semibold text-primary text-xs">{p.overall_fill}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Full Table */}
                            {activeTab === 'table' && (
                                <div className="bg-white rounded-card shadow-card overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                                                    <th className="py-3 px-5">Tank</th>
                                                    <th className="py-3 px-5">Shape</th>
                                                    <th className="py-3 px-5">Product</th>
                                                    <th className="py-3 px-5">Location</th>
                                                    <th className="py-3 px-5">Current Volume</th>
                                                    <th className="py-3 px-5">Capacity</th>
                                                    <th className="py-3 px-5">Fill %</th>
                                                    <th className="py-3 px-5">Status</th>
                                                    <th className="py-3 px-5">Last Updated</th>
                                                    <th className="py-3 px-5 text-right">Export</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tanks.map((tank) => (
                                                    <tr key={tank.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                        <td className="py-3.5 px-5 font-bold text-navy-dark">{tank.name}</td>
                                                        <td className="py-3.5 px-5 text-gray-500 capitalize">{tank.shape?.replace('_', ' ')}</td>
                                                        <td className="py-3.5 px-5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tank.product_color }} />
                                                                <span className="text-navy-dark">{tank.product_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-gray-500">{tank.location || '—'}</td>
                                                        <td className="py-3.5 px-5 text-navy-dark">{tank.current_volume?.toLocaleString()} L</td>
                                                        <td className="py-3.5 px-5 text-navy-dark">{tank.capacity_litres?.toLocaleString()} L</td>
                                                        <td className="py-3.5 px-5 font-bold text-primary">{tank.fill_percentage}%</td>
                                                        <td className="py-3.5 px-5">
                                                            <span
                                                                className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                                                                style={{
                                                                    backgroundColor: `${STATUS_COLORS[tank.status]}22`,
                                                                    color: STATUS_COLORS[tank.status],
                                                                }}
                                                            >
                                                                {tank.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-gray-400 text-xs whitespace-nowrap">
                                                            {tank.updated_at ? format(new Date(tank.updated_at), 'dd MMM yyyy, HH:mm') : '—'}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleTankPDF(tank)}
                                                                    disabled={exportingTankId === tank.id}
                                                                    title="Download PDF for this tank"
                                                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-danger hover:bg-red-100 transition disabled:opacity-40"
                                                                >
                                                                    {exportingTankId === tank.id && exportingTankType === 'pdf'
                                                                        ? <span className="animate-pulse">...</span>
                                                                        : <><FileText size={12} /> PDF</>}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleTankSheets(tank)}
                                                                    disabled={exportingTankId === tank.id}
                                                                    title="Download Sheets for this tank"
                                                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-success hover:bg-green-100 transition disabled:opacity-40"
                                                                >
                                                                    {exportingTankId === tank.id && exportingTankType === 'sheets'
                                                                        ? <span className="animate-pulse">...</span>
                                                                        : <><Download size={12} /> Sheets</>}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ReportsPage;