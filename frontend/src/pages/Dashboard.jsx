import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import TankCard from '../components/tank/TankCard';
import Loader from '../components/shared/Loader';
import AddTankModal from '../components/tank/AddTankModal';
import EditTankModal from '../components/tank/EditTankModal';
import AddStockModal from '../components/tank/AddStockModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { tankApi } from '../api/tank.api';
import { useAuthContext } from '../context/AuthContext';
import { useAlertContext } from '../context/AlertContext';

const Dashboard = () => {
    const { isAdmin, permissions } = useAuthContext();
    const { showToast } = useAlertContext();

    const [tanks, setTanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addTankOpen, setAddTankOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [stockTarget, setStockTarget] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const canAddStock = isAdmin || permissions?.can_add_stock;

    const fetchTanks = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await tankApi.getAll();
            setTanks(res.data.data);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to load tanks', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTanks();
    }, [fetchTanks]);

    const handleRefresh = () => fetchTanks(true);

    const handleEdit = (tank) => setEditTarget(tank);

    const handleDelete = (tank) => setDeleteTarget(tank);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await tankApi.delete(deleteTarget.id);
            showToast(`Tank "${deleteTarget.name}" deleted successfully`, 'success');
            setDeleteTarget(null);
            fetchTanks(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete tank', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleUpdateStock = (tank) => setStockTarget(tank);
    const handleAddTank = () => setAddTankOpen(true);

    const handleCopyTank = async (tank) => {
        try {
            await tankApi.copy(tank.id);
            showToast(`Tank "${tank.name}" copied successfully`, 'success');
            fetchTanks(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to copy tank', 'error');
        }
    };

    const filteredTanks = tanks.filter((tank) =>
        tank.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">
                    {/* Page Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-navy-dark">Tank Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Real-time overview of all oil tanks
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 bg-white border border-gray-200 text-navy-dark font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>

                            {isAdmin && (
                                <button
                                    onClick={handleAddTank}
                                    className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-primary-dark transition"
                                >
                                    <Plus size={16} />
                                    Add Tank
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6 max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search tanks by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark text-sm bg-white"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search size={18} />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tank Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size="large" />
                        </div>
                    ) : tanks.length === 0 ? (
                        <div className="bg-white rounded-card shadow-card p-10 text-center">
                            <p className="text-gray-500">
                                {isAdmin
                                    ? 'No tanks yet. Click "Add Tank" to create your first tank.'
                                    : 'No tanks have been assigned to you yet. Contact your administrator.'}
                            </p>
                        </div>
                    ) : filteredTanks.length === 0 ? (
                        <div className="bg-white rounded-card shadow-card p-10 text-center">
                            <p className="text-gray-500">
                                No tanks match your search query "{searchQuery}".
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredTanks.map((tank) => (
                                <TankCard
                                    key={tank.id}
                                    tank={tank}
                                    isAdmin={isAdmin}
                                    canAddStock={canAddStock}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onCopy={handleCopyTank}
                                    onUpdateStock={handleUpdateStock}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <AddTankModal
                isOpen={addTankOpen}
                onClose={() => setAddTankOpen(false)}
                onSuccess={() => fetchTanks(true)}
            />

            <EditTankModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={() => fetchTanks(true)}
                tank={editTarget}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Tank"
                message={`Are you sure you want to delete tank "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete Tank"
                loading={deleting}
                danger
            />

        </div>
    );
};

export default Dashboard;
