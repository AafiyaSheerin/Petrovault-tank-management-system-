import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Calendar, TrendingUp, TrendingDown, Gauge, Save } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loader from '../components/shared/Loader';
import TankFillAnimation from '../components/tank/TankFillAnimation';
import TankHistoryGraph from '../components/tank/TankHistoryGraph';
import EditTankModal from '../components/tank/EditTankModal';
import Modal from '../components/shared/Modal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { tankApi } from '../api/tank.api';
import { reportApi } from '../api/report.api';
import { productApi } from '../api/product.api';
import { useAuthContext } from '../context/AuthContext';
import { useAlertContext } from '../context/AlertContext';
import { format } from 'date-fns';

const STATUS_COLORS = {
    empty: '#cbd5e1',
    critical: '#ef4444',
    warning: '#eab308',
    healthy: '#22c55e',
};

const STATUS_LABELS = {
    empty: 'Empty',
    critical: 'Critical — Low Stock',
    warning: 'Warning — Near Full',
    healthy: 'Healthy',
};

const SHAPE_LABELS = {
    vertical_cylinder_flat:           'Vertical Cylinder — Flat Bottom',
    vertical_cylinder_cone:           'Vertical Cylinder — Cone Bottom',
    vertical_cylinder_sloped:         'Vertical Cylinder — Sloped Bottom',
    vertical_cylinder_tori:           'Vertical Cylinder — Torispherical Bottom',
    vertical_cylinder_ellipsoidal:    'Vertical Cylinder — Ellipsoidal Bottom',
    vertical_cylinder_hemispherical:  'Vertical Cylinder — Hemispherical Bottom',
    horizontal_cylinder:              'Horizontal Cylindrical Tank',
    horizontal_cylinder_flat:         'Horizontal Cylinder — Flat Ends',
    horizontal_cylinder_dished:       'Horizontal Cylinder — Dished Ends',
    horizontal_cylinder_hemispherical:'Horizontal Cylinder — Hemispherical Ends (Bullet)',
    rectangular_prismatic:            'Rectangular / Prismatic Tank',
    rectangular_flat:                 'Rectangular Tank — Flat',
    cube_ibc:                         'Cube Tank (IBC Tote)',
    spherical:                        'Spherical Tank',
    sphere_horton:                    'Horton Sphere',
    spheroid_flat:                    'Spheroid (Flattened Sphere)',
    // Legacy
    rectangular:                      'Rectangular',
    cone_bottom:                      'Cone Bottom',
    cylinder:                         'Cylinder',
    dome_top:                         'Dome Top',
};

const DATE_FILTERS = [
    { value: 7,   label: 'Last 7 days' },
    { value: 30,  label: 'Last 30 days' },
    { value: 90,  label: 'Last 90 days' },
    { value: 365, label: 'Last year' },
];

// ─── Shape helpers ────────────────────────────────────────────────────────────

const isConeBottom = (shape) =>
    ['vertical_cylinder_cone', 'cone_bottom'].includes(shape);

/**
 * Returns true for all shapes whose bottom / end section is non-flat
 * (cone, ellipsoidal, hemispherical, torispherical, spherical, dished ends).
 * These shapes get the "Is Empty" checkbox.
 * Flat-bottom shapes do NOT.
 */
const hasNonFlatBottom = (shape) => [
    'vertical_cylinder_cone',
    'cone_bottom',
    'vertical_cylinder_ellipsoidal',
    'vertical_cylinder_hemispherical',
    'vertical_cylinder_tori',
    'spherical',
    'sphere_horton',
    'spheroid_flat',
    'horizontal_cylinder_dished',
    'horizontal_cylinder_hemispherical',
].includes(shape);

/** Per-shape label for the "Is Empty" checkbox. */
const getEmptyBottomLabel = (shape) => {
    if (['vertical_cylinder_cone', 'cone_bottom'].includes(shape))
        return 'Cone is empty (no liquid in cone)';
    if (shape === 'vertical_cylinder_ellipsoidal')
        return 'Bottom is empty (no liquid in ellipsoidal cap)';
    if (shape === 'vertical_cylinder_hemispherical')
        return 'Bottom is empty (no liquid in hemispherical cap)';
    if (shape === 'vertical_cylinder_tori')
        return 'Bottom is empty (no liquid in dish)';
    if (['spherical', 'sphere_horton', 'spheroid_flat'].includes(shape))
        return 'Tank is empty';
    if (shape === 'horizontal_cylinder_dished')
        return 'Ends are empty (no liquid in dished ends)';
    if (shape === 'horizontal_cylinder_hemispherical')
        return 'Ends are empty (no liquid in hemispherical ends)';
    return 'Bottom section is empty';
};

/** Get custom warning/notice message for non-flat bottom/ends tanks. */
const getShapeNoticeMessage = (tank) => {
    if (!tank) return null;
    const shape = tank.shape;
    const capacity = Number(tank.cone_capacity_litres) || 0;

    if (['vertical_cylinder_cone', 'cone_bottom'].includes(shape)) {
        return `Cone Bottom Tank: This tank has a cone capacity of ${capacity} liters. Enter CM above the cone level (0 = cone is full, check "Cone Empty" if cone is also empty).`;
    }
    if (shape === 'vertical_cylinder_ellipsoidal') {
        return `Ellipsoidal Bottom Tank: This tank has an ellipsoidal capacity of ${capacity} liters. Enter CM above the bottom cap (0 = cap is full, check "Bottom is empty" if bottom cap is also empty).`;
    }
    if (shape === 'vertical_cylinder_hemispherical') {
        return `Hemispherical Bottom Tank: This tank has a hemispherical capacity of ${capacity} liters. Enter CM above the bottom cap (0 = cap is full, check "Bottom is empty" if bottom cap is also empty).`;
    }
    if (shape === 'vertical_cylinder_tori') {
        return `Torispherical Bottom Tank: This tank has a torispherical capacity of ${capacity} liters. Enter CM above the bottom cap (0 = cap is full, check "Bottom is empty" if bottom cap is also empty).`;
    }
    if (['spherical', 'sphere_horton', 'spheroid_flat'].includes(shape)) {
        return `Spherical Tank: This tank has a capacity of ${Number(tank.capacity_litres).toLocaleString()} liters. Enter CM reading (check "Tank is empty" if it is empty).`;
    }
    if (shape === 'horizontal_cylinder_dished') {
        return `Horizontal Cylinder (Dished Ends): This tank has dished ends capacity of ${capacity} liters. Enter CM above end caps (check "Ends are empty" if they are empty).`;
    }
    if (shape === 'horizontal_cylinder_hemispherical') {
        return `Horizontal Cylinder (Hemispherical Ends): This tank has hemispherical ends capacity of ${capacity} liters. Enter CM above end caps (check "Ends are empty" if they are empty).`;
    }
    return null;
};

/** Placeholder text for the level input, per shape. */
const getLevelPlaceholder = (shape) => {
    if (isConeBottom(shape)) return 'CM above cone';
    if (['spherical', 'sphere_horton', 'spheroid_flat'].includes(shape)) return 'CM reading';
    if (['vertical_cylinder_ellipsoidal', 'vertical_cylinder_hemispherical', 'vertical_cylinder_tori'].includes(shape))
        return 'CM above bottom cap';
    if (['horizontal_cylinder_dished', 'horizontal_cylinder_hemispherical'].includes(shape))
        return 'CM above end caps';
    return 'Enter CM';
};

// ─── Volume helpers ───────────────────────────────────────────────────────────

/**
 * Calculates new volume from a CM level reading.
 * For non-flat-bottom tanks the bottom section capacity (stored in
 * cone_capacity_litres regardless of actual shape) is added on top of the
 * cylindrical portion.  When bottomEmpty is true, volume = 0.
 */
const calcVolumeFromLevel = (levelCm, tank, bottomEmpty) => {
    const litresPerCm = Number(tank.litres_per_cm) || 0;
    const bottomCap   = Number(tank.cone_capacity_litres) || 0;
    const capacity    = Number(tank.capacity_litres) || 0;

    if (hasNonFlatBottom(tank.shape) && bottomEmpty) return 0;

    const lvl = Number(levelCm) || 0;
    const vol = (hasNonFlatBottom(tank.shape) && bottomCap > 0)
        ? bottomCap + lvl * litresPerCm
        : lvl * litresPerCm;

    return Math.min(vol, capacity);
};

/**
 * Reverse: current volume → estimated CM reading above the bottom section.
 */
const litresToCm = (tank) => {
    if (!tank) return null;
    const litresPerCm = Number(tank.litres_per_cm) || 0;
    const bottomCap   = Number(tank.cone_capacity_litres) || 0;
    const litres      = tank.current_volume || 0;
    if (litresPerCm <= 0) return null;
    if (hasNonFlatBottom(tank.shape) && bottomCap > 0) {
        if (litres <= bottomCap) return 0;
        return (litres - bottomCap) / litresPerCm;
    }
    return litres / litresPerCm;
};

// ─── Component ───────────────────────────────────────────────────────────────

const TankDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin, permissions } = useAuthContext();
    const { showToast } = useAlertContext();

    const [tank, setTank] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [days, setDays] = useState(30);

    // UI toggles
    const [readingOpen, setReadingOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Unified reading form (auto-determines add vs remove from delta)
    const [products, setProducts] = useState([]);
    const [level, setLevel] = useState('');
    const [bottomEmpty, setBottomEmpty] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [savingReading, setSavingReading] = useState(false);

    const canAddStock = isAdmin || permissions?.can_add_stock;

    // ── Data fetching ─────────────────────────────────────────────────────

    const fetchTank = useCallback(async () => {
        setLoading(true);
        try {
            const res = await tankApi.getOne(id);
            setTank(res.data.data);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to load tank', 'error');
            navigate('/');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, showToast]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const res = await reportApi.getHistory({
                tank_id: id,
                start_date: startDate.toISOString(),
            });
            setHistory(res.data.data || []);
        } catch {
            // non-blocking
        } finally {
            setHistoryLoading(false);
        }
    }, [id, days]);

    useEffect(() => { fetchTank(); }, [fetchTank]);
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    useEffect(() => {
        productApi.getAll()
            .then(res => setProducts(res.data.data || []))
            .catch(() => setProducts([]));
    }, []);

    useEffect(() => {
        if (tank) setSelectedProductId(tank.product_id || '');
    }, [tank]);

    const handleRefreshAll = () => { fetchTank(); fetchHistory(); };

    // ── Modal open/close ──────────────────────────────────────────────────

    const openReadingModal = () => {
        setLevel('');
        setBottomEmpty(false);
        setRemarks('');
        setReadingOpen(true);
    };

    // ── Unified save — auto-detects add vs remove from delta ──────────────

    const handleSaveReading = async (e) => {
        e.preventDefault();
        if (savingReading) return;

        const newVolume    = calcVolumeFromLevel(level, tank, bottomEmpty);
        const currentVol   = tank.current_volume || 0;
        const deltaLitres  = newVolume - currentVol;

        if (Math.abs(deltaLitres) < 0.01) {
            showToast('Volume is unchanged. Please enter a different level.', 'warning');
            return;
        }

        // Build effective total dip for the backend
        const litresPerCm = Number(tank.litres_per_cm) || 0;
        const bottomCap   = Number(tank.cone_capacity_litres) || 0;
        let totalDip = 0;
        if (!bottomEmpty) {
            if (hasNonFlatBottom(tank.shape) && bottomCap > 0 && litresPerCm > 0) {
                totalDip = (Number(level) || 0) + bottomCap / litresPerCm;
            } else {
                totalDip = Number(level) || 0;
            }
        }

        setSavingReading(true);
        try {
            // Update product if tank is nearly empty and product changed
            if (tank.fill_percentage < 5 && selectedProductId !== (tank.product_id || '')) {
                await tankApi.update(tank.id, { product_id: selectedProductId || null });
            }

            const noteText = remarks.trim() ||
                `Level reading: ${bottomEmpty ? '0 (empty)' : `${level} cm`}`;

            if (deltaLitres > 0) {
                await tankApi.addStock(tank.id, { dip_cm: totalDip, notes: noteText });
                showToast(
                    `Added ${Math.round(deltaLitres).toLocaleString()} L to ${tank.name}`,
                    'success'
                );
            } else {
                await tankApi.removeStock(tank.id, { dip_cm: totalDip, notes: noteText });
                showToast(
                    `Removed ${Math.abs(Math.round(deltaLitres)).toLocaleString()} L from ${tank.name}`,
                    'success'
                );
            }

            setLevel('');
            setRemarks('');
            setBottomEmpty(false);
            setReadingOpen(false);
            handleRefreshAll();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save reading', 'error');
        } finally {
            setSavingReading(false);
        }
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await tankApi.delete(id);
            showToast(`Tank "${tank.name}" deleted successfully`, 'success');
            navigate('/');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete tank', 'error');
        } finally {
            setDeleting(false);
            setDeleteOpen(false);
        }
    };

    // ── Loading state ─────────────────────────────────────────────────────

    if (loading || !tank) {
        return (
            <div className="flex">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen">
                    <Navbar />
                    <main className="flex-1 bg-background flex items-center justify-center">
                        <Loader size="large" />
                    </main>
                </div>
            </div>
        );
    }

    const fillColor = STATUS_COLORS[tank.status] || STATUS_COLORS.healthy;

    // ── Live preview values (derived from current form state) ─────────────

    const hasRate         = Number(tank.litres_per_cm) > 0;
    const showingBottom   = hasNonFlatBottom(tank.shape);
    const currentDipCm    = litresToCm(tank);

    const previewVolume = (level !== '' || bottomEmpty)
        ? calcVolumeFromLevel(level, tank, bottomEmpty)
        : null;

    const previewDelta = previewVolume !== null
        ? previewVolume - (tank.current_volume || 0)
        : null;

    const isAdding   = previewDelta !== null && previewDelta > 0.01;
    const isRemoving = previewDelta !== null && previewDelta < -0.01;
    const noChange   = previewDelta !== null && Math.abs(previewDelta) < 0.01;
    const isOverfill = previewVolume !== null && previewVolume >= (tank.capacity_litres || 0);

    const previewFill = (previewVolume !== null && tank.capacity_litres > 0)
        ? Math.min(Math.round((previewVolume / tank.capacity_litres) * 1000) / 10, 100)
        : tank.fill_percentage;

    const canSubmit = hasRate &&
        (bottomEmpty || (level !== '' && Number(level) >= 0)) &&
        !noChange && !savingReading && !isOverfill;

    // ─────────────────────────────────────────────────────────────────────

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">

                    {/* Back button */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-navy-dark mb-4 transition"
                    >
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </button>

                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-navy-dark">{tank.name}</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {SHAPE_LABELS[tank.shape]} &middot; {tank.location || 'No location set'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => setEditOpen(true)}
                                        className="flex items-center gap-2 bg-info text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 transition"
                                    >
                                        <Pencil size={16} /> Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteOpen(true)}
                                        className="flex items-center gap-2 bg-danger text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-red-600 transition"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tank visual + info cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

                        {/* Tank animation */}
                        <div className="bg-white rounded-card shadow-card p-6 flex flex-col items-center">
                            <div className="h-56 w-full">
                                <TankFillAnimation
                                    shape={tank.shape}
                                    fillPercentage={tank.fill_percentage}
                                    fillColor={fillColor}
                                    label={tank.name}
                                    currentVolume={tank.current_volume}
                                    capacity={tank.capacity_litres}
                                    coneCapacity={tank.cone_capacity_litres}
                                />
                            </div>
                            <p className="text-3xl font-bold text-primary mt-3">{tank.fill_percentage}%</p>
                            <span
                                className="text-xs font-semibold px-3 py-1 rounded-full mt-2"
                                style={{
                                    backgroundColor: `${STATUS_COLORS[tank.status]}22`,
                                    color: STATUS_COLORS[tank.status],
                                }}
                            >
                                {STATUS_LABELS[tank.status]}
                            </span>
                        </div>

                        {/* Info cards */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Volume</p>
                                <p className="text-2xl font-bold text-navy-dark">{tank.current_volume?.toLocaleString()} L</p>
                            </div>

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Capacity</p>
                                <p className="text-2xl font-bold text-navy-dark">{tank.capacity_litres?.toLocaleString()} L</p>
                            </div>

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tank.product_color }} />
                                    <p className="text-lg font-bold text-navy-dark">{tank.product_name}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alert Thresholds</p>
                                <p className="text-sm text-navy-dark mt-1">
                                    Low: <strong className="text-danger">{tank.low_threshold}%</strong>
                                    {' '}&middot;{' '}
                                    High: <strong className="text-warning">{tank.high_threshold}%</strong>
                                </p>
                            </div>

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Available Capacity</p>
                                <p className="text-sm text-navy-dark mt-1">
                                    Can add{' '}
                                    <strong className="text-success">
                                        {(tank.capacity_litres - tank.current_volume).toLocaleString()} L
                                    </strong>{' '}
                                    more
                                </p>
                            </div>

                            <div className="bg-white rounded-card shadow-card p-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Configuration &amp; Dip</p>
                                {tank.litres_per_cm ? (
                                    <div className="text-sm space-y-1 mt-1.5 animate-fadeIn">
                                        <div className="flex justify-between text-navy-dark">
                                            <span className="text-gray-400 font-medium">Conversion Rate:</span>
                                            <span className="font-semibold text-primary">
                                                {Number(tank.litres_per_cm).toFixed(2)} L/cm
                                            </span>
                                        </div>
                                        {Number(tank.cone_capacity_litres) > 0 && (
                                            <div className="flex justify-between text-navy-dark">
                                                <span className="text-gray-400 font-medium">
                                                    {isConeBottom(tank.shape) ? 'Cone Capacity:' : 'Bottom Section:'}
                                                </span>
                                                <span className="font-semibold text-navy-dark">
                                                    {Number(tank.cone_capacity_litres).toLocaleString()} L
                                                </span>
                                            </div>
                                        )}
                                        {currentDipCm !== null && (
                                            <div className="flex justify-between text-navy-dark pt-1 border-t border-gray-100">
                                                <span className="text-gray-500 font-semibold">Current Dip:</span>
                                                <span className="font-bold text-primary">
                                                    {Number(currentDipCm).toFixed(1)} cm
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 mt-1">Not configured — edit tank to set</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Unified Add/Update Reading Inline Form */}
                    {canAddStock && (
                        <div className="bg-white rounded-card shadow-card p-6 mb-6">
                            {/* Material type info banner */}
                            {tank.product_name && (
                                <div className="bg-sky-50 border border-sky-200 text-sky-800 text-sm rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
                                    <span className="text-base mt-0.5">ℹ</span>
                                    <span>
                                        <strong>Material Type:</strong> Currently using <strong>{tank.product_name}</strong>. Material type can only be changed when tank is below 5% capacity.
                                    </span>
                                </div>
                            )}

                            {/* Blue Warning/Notice banner for non-flat tanks */}
                            {getShapeNoticeMessage(tank) && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
                                    <span className="text-base mt-0.5">⚠️</span>
                                    <span className="font-medium">{getShapeNoticeMessage(tank)}</span>
                                </div>
                            )}

                            {/* No conversion rate warning */}
                            {!hasRate && (
                                <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-4 py-3 mb-5">
                                    ⚠️ This tank has no CM conversion rate set. Please edit the tank and fill in{' '}
                                    <strong>"1 CM = ? Litres"</strong> before recording a dip reading.
                                </div>
                            )}

                            <h2 className="text-lg font-bold text-navy-dark mb-4">Add New Reading</h2>

                            <form onSubmit={handleSaveReading} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Level input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                            Level (CM) *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={level}
                                                onChange={(e) => setLevel(e.target.value)}
                                                placeholder={bottomEmpty ? '— (empty)' : getLevelPlaceholder(tank.shape)}
                                                disabled={!hasRate || bottomEmpty}
                                                min="0"
                                                step="any"
                                                className="w-full px-4 py-2.5 pr-16 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark font-semibold disabled:opacity-50 disabled:bg-gray-50"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">cm</span>
                                        </div>
                                        {hasRate && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                1 cm = <strong className="text-primary">{Number(tank.litres_per_cm).toFixed(2)} L</strong>
                                                {Number(tank.cone_capacity_litres) > 0 && (
                                                    <span className="ml-2">
                                                        ·{' '}
                                                        {isConeBottom(tank.shape) ? 'Cone' : 'Bottom section'}:{' '}
                                                        {Number(tank.cone_capacity_litres).toLocaleString()} L
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-dark mb-1.5">Remarks</label>
                                        <input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Optional notes"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                        />
                                    </div>
                                </div>

                                {/* "Is Empty" checkbox — only for non-flat-bottom tanks */}
                                {showingBottom && (
                                    <div className="flex items-center gap-2 py-1">
                                        <input
                                            type="checkbox"
                                            id="bottomEmptyCheck"
                                            checked={bottomEmpty}
                                            onChange={(e) => {
                                                setBottomEmpty(e.target.checked);
                                                if (e.target.checked) setLevel('');
                                            }}
                                            className="w-4 h-4 text-primary border-gray-200 rounded focus:ring-primary cursor-pointer"
                                        />
                                        <label
                                            htmlFor="bottomEmptyCheck"
                                            className="text-sm font-semibold text-navy-dark cursor-pointer select-none"
                                        >
                                            {getEmptyBottomLabel(tank.shape)}
                                        </label>
                                    </div>
                                )}

                                {/* Material Type (only when tank is nearly empty) */}
                                {tank.fill_percentage < 5 && (
                                    <div className="max-w-md">
                                        <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                            Material Type *
                                        </label>
                                        <select
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark bg-white font-semibold"
                                        >
                                            <option value="">Select material...</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Live preview — shows when a value is entered */}
                                {previewVolume !== null ? (
                                    <div className={`rounded-xl p-4 border-2 ${
                                        noChange
                                            ? 'bg-gray-50 border-gray-200'
                                            : isOverfill
                                                ? 'bg-red-50 border-danger/40'
                                                : isAdding
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-orange-50 border-orange-300'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {noChange
                                                    ? 'No Change'
                                                    : isAdding
                                                        ? '↑ Adding Stock'
                                                        : isOverfill
                                                            ? '⚠ Overfill'
                                                            : '↓ Removing Stock'}
                                            </span>
                                            <span className={`text-2xl font-bold ${
                                                noChange   ? 'text-gray-400' :
                                                isOverfill ? 'text-danger'   :
                                                isAdding   ? 'text-green-600' : 'text-orange-600'
                                            }`}>
                                                {previewFill.toFixed(1)}%
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-400">New Volume</p>
                                                <p className="font-bold text-navy-dark">
                                                    {Math.round(previewVolume).toLocaleString()} L
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Change</p>
                                                <p className={`font-bold ${
                                                    isAdding   ? 'text-green-600' :
                                                    isRemoving ? 'text-orange-600' : 'text-gray-400'
                                                }`}>
                                                    {noChange
                                                        ? '±0 L'
                                                        : `${isAdding ? '+' : ''}${Math.round(previewDelta).toLocaleString()} L`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${Math.min(previewFill, 100)}%`,
                                                    backgroundColor: isOverfill ? '#ef4444' : isAdding ? '#22c55e' : '#f97316',
                                                }}
                                            />
                                        </div>

                                        {isOverfill && (
                                            <p className="text-xs text-danger mt-2 font-semibold">
                                                ⚠️ This would exceed tank capacity — will be blocked
                                            </p>
                                        )}
                                        {noChange && (
                                            <p className="text-xs text-gray-400 mt-1">Reading equals current level</p>
                                        )}
                                    </div>
                                ) : (
                                    /* Default zero-state preview box before any value is entered */
                                    <div className="rounded-xl p-4 border-2 bg-gray-50 border-gray-200">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Calculated Volume:</p>
                                        <p className="text-2xl font-bold text-primary">0 Liters</p>
                                        <p className="text-xs text-gray-400 mt-1">Based on: -</p>
                                    </div>
                                )}

                                {/* Action submit button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || (tank.fill_percentage < 5 && !selectedProductId)}
                                        className={`w-full text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                            isRemoving
                                                ? 'bg-amber-500 hover:bg-amber-600'
                                                : 'bg-primary hover:opacity-90'
                                        }`}
                                    >
                                        <Save size={16} />
                                        {savingReading
                                            ? 'Saving...'
                                            : isRemoving
                                                ? `Save Reading (Remove ${Math.abs(Math.round(previewDelta ?? 0)).toLocaleString()} L)`
                                                : `Save Reading`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* History Graph */}
                    <div className="bg-white rounded-card shadow-card p-5 mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h2 className="text-lg font-bold text-navy-dark flex items-center gap-2">
                                <Calendar size={18} className="text-primary" />
                                Fill Level History
                            </h2>
                            <div className="flex gap-2">
                                {DATE_FILTERS.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setDays(f.value)}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                                            days === f.value
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {historyLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader />
                            </div>
                        ) : (
                            <TankHistoryGraph history={history} />
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white rounded-card shadow-card p-5">
                        <h2 className="text-lg font-bold text-navy-dark mb-4">Recent Transactions</h2>

                        {history.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-8">No transactions in this period</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="py-2 pr-4">Date &amp; Time</th>
                                            <th className="py-2 pr-4">Action</th>
                                            <th className="py-2 pr-4">Volume Change</th>
                                            <th className="py-2 pr-4">Fill Before → After</th>
                                            <th className="py-2 pr-4">By</th>
                                            <th className="py-2">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.slice(0, 20).map((h) => (
                                            <tr key={h.id} className="border-b border-gray-50 last:border-0">
                                                <td className="py-3 pr-4 text-navy-dark whitespace-nowrap">
                                                    {format(new Date(h.created_at), 'dd MMM yyyy, HH:mm')}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                                                        h.action === 'add_stock'
                                                            ? 'bg-green-50 text-success'
                                                            : 'bg-yellow-50 text-warning'
                                                    }`}>
                                                        {h.action === 'add_stock'
                                                            ? <TrendingUp size={12} />
                                                            : <TrendingDown size={12} />}
                                                        {h.action === 'add_stock' ? 'Stock Added' : 'Stock Removed'}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 font-semibold text-navy-dark whitespace-nowrap">
                                                    {h.action === 'add_stock' ? '+' : '-'}{h.volume_changed?.toLocaleString()} L
                                                </td>
                                                <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                                                    {h.fill_percentage_before}% → {h.fill_percentage_after}%
                                                </td>
                                                <td className="py-3 pr-4 text-navy-dark whitespace-nowrap">
                                                    {h.recorded_by_name || 'N/A'}
                                                </td>
                                                <td className="py-3 text-gray-500">{h.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Edit & Delete */}
            <EditTankModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={fetchTank}
                tank={tank}
            />

            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Tank"
                message={`Are you sure you want to delete tank "${tank.name}"? This action cannot be undone.`}
                confirmLabel="Delete Tank"
                loading={deleting}
                danger
            />
        </div>
    );
};

export default TankDetail;