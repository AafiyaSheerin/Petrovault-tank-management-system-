import React, { useState, useEffect } from 'react';
import { Ruler } from 'lucide-react';
import Modal from '../shared/Modal';
import { tankApi } from '../../api/tank.api';
import { useAlertContext } from '../../context/AlertContext';

const CONE_BOTTOM_SHAPES = new Set(['vertical_cylinder_cone', 'cone_bottom']);

/**
 * Local cm → litres calculation (mirrors backend logic)
 */
function localCmToLitres(dipCm, tank) {
    const dip = Number(dipCm);
    if (dip < 0 || !tank) return { litres: 0, fillPercentage: 0 };

    const { shape, litres_per_cm, cone_capacity_litres, capacity_litres } = tank;
    const rRate = Number(litres_per_cm) || 0;
    if (rRate <= 0) return { litres: 0, fillPercentage: 0 };

    let litres = 0;
    const coneCap = Number(cone_capacity_litres) || 0;
    if (CONE_BOTTOM_SHAPES.has(shape) && coneCap > 0) {
        const coneHeightCm = coneCap / rRate;
        if (dip <= coneHeightCm) {
            litres = coneCap * Math.pow(dip / coneHeightCm, 3);
        } else {
            litres = coneCap + (dip - coneHeightCm) * rRate;
        }
    } else {
        litres = dip * rRate;
    }

    const capacity = capacity_litres || 0;
    litres = Math.min(litres, capacity);
    litres = Math.round(litres * 100) / 100;
    const fillPercentage = capacity > 0
        ? Math.min(Math.round((litres / capacity) * 1000) / 10, 100)
        : 0;

    return { litres, fillPercentage };
}

/** Reverse: litres → estimated cm */
function litresToCm(litres, tank) {
    if (!tank) return null;
    const { shape, litres_per_cm, cone_capacity_litres } = tank;
    const rRate = Number(litres_per_cm) || 0;
    if (rRate <= 0) return null;

    let cm = null;
    const coneCap = Number(cone_capacity_litres) || 0;

    if (CONE_BOTTOM_SHAPES.has(shape) && coneCap > 0) {
        const coneHeightCm = coneCap / rRate;
        if (litres <= coneCap) {
            cm = Math.pow(litres / coneCap, 1 / 3) * coneHeightCm;
        } else {
            cm = coneHeightCm + (litres - coneCap) / rRate;
        }
    } else {
        cm = litres / rRate;
    }

    return Math.round(cm * 10) / 10;
}

const AddStockModal = ({ isOpen, onClose, onSuccess, tank }) => {
    const { showToast } = useAlertContext();
    const [dipCm, setDipCm] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDipCm('');
            setNotes('');
            setError('');
        }
    }, [isOpen]);

    if (!tank) return null;

    const currentVolume = tank.current_volume || 0;
    const capacity = tank.capacity_litres || 0;
    const hasConversionRate = Number(tank.litres_per_cm) > 0;
    const hasValidConfig = hasConversionRate;

    // Current dip reading (reverse calculation)
    const currentDipCm = hasValidConfig
        ? litresToCm(currentVolume, tank)
        : null;

    // Max dip = when tank is completely full
    const maxDipCm = hasValidConfig
        ? litresToCm(capacity, tank)
        : null;

    // Live preview from entered dip
    const enteredDip = Number(dipCm);
    const preview = hasValidConfig && dipCm !== '' && enteredDip >= 0
        ? localCmToLitres(enteredDip, tank)
        : null;

    const previewVolume = preview?.litres ?? currentVolume;
    const previewFill = preview?.fillPercentage ?? tank.fill_percentage;

    // Determine what the change means
    const deltaLitres = preview ? preview.litres - currentVolume : 0;
    const isAdding = deltaLitres > 0;
    const isRemoving = deltaLitres < 0;
    const noChange = preview && Math.abs(deltaLitres) < 0.01;
    const isOverfill = preview && preview.litres >= capacity;

    // Validation
    const canSubmit = hasValidConfig && dipCm !== '' && enteredDip >= 0 && !noChange && !loading;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!hasConversionRate) {
            setError('This tank has no CM conversion rate. Please edit the tank and set "1 CM = ? Litres".');
            return;
        }
        if (dipCm === '' || isNaN(enteredDip) || enteredDip < 0) {
            setError('Please enter a valid dip reading in cm');
            return;
        }
        if (noChange) {
            setError('Dip reading matches current level — no change needed');
            return;
        }

        setLoading(true);
        try {
            const actualMode = deltaLitres > 0 ? 'add' : 'remove';
            const noteText = notes.trim() || `Dip reading: ${enteredDip} cm`;

            if (actualMode === 'add') {
                await tankApi.addStock(tank.id, { dip_cm: enteredDip, notes: noteText });
                showToast(
                    `Added ${Math.abs(deltaLitres).toLocaleString(undefined, { maximumFractionDigits: 0 })} L to ${tank.name}`,
                    'success'
                );
            } else {
                await tankApi.removeStock(tank.id, { dip_cm: enteredDip, notes: noteText });
                showToast(
                    `Removed ${Math.abs(deltaLitres).toLocaleString(undefined, { maximumFractionDigits: 0 })} L from ${tank.name}`,
                    'success'
                );
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Update Stock — ${tank.name}`} maxWidth="max-w-md">

            {/* No conversion rate warning */}
            {!hasConversionRate && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
                    ⚠️ This tank has no CM conversion rate set. Please edit the tank and fill in <strong>"1 CM = ? Litres"</strong> before recording a dip reading.
                </div>
            )}

            {/* Current Status */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                    <Ruler size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-navy-dark">Current Tank Status</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-xs text-gray-400">Dip Reading</p>
                        <p className="font-bold text-navy-dark">
                            {currentDipCm !== null ? `${currentDipCm} cm` : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Volume</p>
                        <p className="font-bold text-navy-dark">
                            {currentVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Fill</p>
                        <p className="font-bold text-primary">{tank.fill_percentage}%</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(tank.fill_percentage, 100)}%`, backgroundColor: tank.product_color || '#22c55e' }}
                    />
                </div>
                {maxDipCm && (
                    <p className="text-xs text-gray-400 mt-1.5 text-center">
                        Max dip: <strong>{maxDipCm} cm</strong> = {capacity.toLocaleString(undefined, { maximumFractionDigits: 0 })} L full
                    </p>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dip Reading Input */}
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                        New Dip Reading (cm) *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={dipCm}
                            onChange={(e) => { setDipCm(e.target.value); setError(''); }}
                            placeholder={currentDipCm !== null ? `Current: ${currentDipCm} cm` : 'Enter cm reading'}
                            min="0"
                            step="any"
                            autoFocus
                            disabled={!hasConversionRate}
                            className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">cm</span>
                    </div>
                    {hasConversionRate && (
                        <p className="text-xs text-gray-400 mt-1">
                            1 cm = <strong className="text-primary">{(Number(tank.litres_per_cm) || 0).toFixed(2)} L</strong>
                            {Number(tank.cone_capacity_litres) > 0 && ` · Cone: ${Number(tank.cone_capacity_litres).toLocaleString()} L`}
                        </p>
                    )}
                </div>

                {/* Live Conversion Preview */}
                {preview && dipCm !== '' && (
                    <div className={`rounded-xl p-4 animate-fadeIn border-2 ${
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
                                {noChange ? 'No Change' : isAdding ? '↑ Adding Stock' : '↓ Removing Stock'}
                            </span>
                            <span className={`text-2xl font-bold ${
                                noChange ? 'text-gray-400' :
                                isOverfill ? 'text-danger' :
                                isAdding ? 'text-green-600' : 'text-orange-600'
                            }`}>
                                {previewFill.toFixed(1)}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-400">New Volume</p>
                                <p className="font-bold text-navy-dark">
                                    {previewVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Change</p>
                                <p className={`font-bold ${isAdding ? 'text-green-600' : isRemoving ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {noChange ? '±0 L' : `${isAdding ? '+' : ''}${Math.round(deltaLitres).toLocaleString()} L`}
                                </p>
                            </div>
                        </div>

                        {/* New fill bar */}
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(previewFill, 100)}%`,
                                    backgroundColor: isOverfill ? '#ef4444' : isAdding ? '#22c55e' : '#f97316'
                                }}
                            />
                        </div>

                        {isOverfill && (
                            <p className="text-xs text-danger mt-2 font-semibold">
                                ⚠️ This would exceed tank capacity — will be blocked
                            </p>
                        )}
                        {noChange && (
                            <p className="text-xs text-gray-400 mt-1">Dip reading equals current level</p>
                        )}
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">Notes (optional)</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Morning reading, delivery received"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                    />
                </div>

                {/* Submit */}
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
                        disabled={!canSubmit || isOverfill || noChange}
                        className={`flex-1 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            isRemoving ? 'bg-orange-500 hover:bg-orange-600' : 'bg-success hover:bg-green-600'
                        }`}
                    >
                        {loading
                            ? 'Updating...'
                            : isRemoving
                                ? `Remove ${Math.abs(Math.round(deltaLitres)).toLocaleString()} L`
                                : preview
                                    ? `Add ${Math.round(deltaLitres).toLocaleString()} L`
                                    : 'Record Dip Reading'
                        }
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddStockModal;