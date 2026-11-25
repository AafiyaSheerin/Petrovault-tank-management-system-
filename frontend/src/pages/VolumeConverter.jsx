import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Droplet, Info } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import { productApi } from '../api/product.api';
import { useAlertContext } from '../context/AlertContext';

const UNIT_LABELS = {
    litres: 'Litres (L)',
    kilolitres: 'Kilolitres (KL)',
    metric_tonnes: 'Metric Tonnes (MT)',
    barrels: 'Barrels (bbl)',
    gallons: 'Gallons (gal)',
};

const VolumeConverter = () => {
    const { showToast } = useAlertContext();

    const [value, setValue] = useState('1000');
    const [fromUnit, setFromUnit] = useState('litres');
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('custom');
    const [customDensity, setCustomDensity] = useState('0.90');
    const [results, setResults] = useState(null);

    useEffect(() => {
        productApi.getAll()
            .then(res => setProducts(res.data.data || []))
            .catch(() => setProducts([]));
    }, []);

    // When user picks a product, auto-fill its density (but they can still edit it)
    const handleProductChange = (e) => {
        const id = e.target.value;
        setSelectedProductId(id);

        if (id !== 'custom') {
            const product = products.find(p => p.id === id);
            if (product) {
                setCustomDensity(String(product.density_kg_per_litre));
            }
        }
    };

    const density = Number(customDensity) || 0;

    const computeResults = () => {
        const v = Number(value);

        if (isNaN(v) || v < 0) {
            showToast('Please enter a valid positive number', 'error');
            return;
        }

        if (density <= 0) {
            showToast('Density must be greater than 0', 'error');
            return;
        }

        let litres;
        switch (fromUnit) {
            case 'litres': litres = v; break;
            case 'kilolitres': litres = v * 1000; break;
            case 'metric_tonnes': litres = (v / density) * 1000; break;
            case 'barrels': litres = v * 158.987; break;
            case 'gallons': litres = v * 3.78541; break;
            default: litres = v;
        }

        const round = (n) => Math.round(n * 1000) / 1000;

        setResults({
            litres: round(litres),
            kilolitres: round(litres / 1000),
            metric_tonnes: round((litres * density) / 1000),
            barrels: round(litres / 158.987),
            gallons: round(litres / 3.78541),
        });
    };

    useEffect(() => {
        if (value && !isNaN(value) && Number(value) >= 0 && density > 0) {
            computeResults();
        }
    }, [value, fromUnit, customDensity]);

    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-1 bg-background p-6">
                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-navy-dark">Volume Converter</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Convert oil volumes between Litres, Kilolitres, Metric Tonnes, Barrels and Gallons
                        </p>
                    </div>

                    <div className="max-w-3xl">
                        {/* Input Card */}
                        <div className="bg-white rounded-card shadow-card p-6 mb-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                {/* Value Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        Value
                                    </label>
                                    <input
                                        type="number"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder="Enter amount"
                                        min="0"
                                        step="any"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark text-lg font-semibold"
                                    />
                                </div>

                                {/* From Unit */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        From Unit
                                    </label>
                                    <select
                                        value={fromUnit}
                                        onChange={(e) => setFromUnit(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark bg-white"
                                    >
                                        {Object.keys(UNIT_LABELS).map((u) => (
                                            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Density Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Product picker (optional shortcut) */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        Quick-fill from Product
                                    </label>
                                    <select
                                        value={selectedProductId}
                                        onChange={handleProductChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark bg-white"
                                    >
                                        <option value="custom">Custom Density</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.density_kg_per_litre})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Custom density input — always editable */}
                                <div>
                                    <label className="block text-sm font-semibold text-navy-dark mb-1.5">
                                        Density (kg per Litre) *
                                    </label>
                                    <input
                                        type="number"
                                        value={customDensity}
                                        onChange={(e) => { setCustomDensity(e.target.value); setSelectedProductId('custom'); }}
                                        step="0.001"
                                        min="0.01"
                                        max="3"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-2 mt-3 bg-blue-50 rounded-lg p-3">
                                <Info size={16} className="text-info mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-600">
                                    Density only affects conversion to/from <strong>Metric Tonnes</strong>. Different oils, batches, and temperatures have different densities — type any value you need, or pick a product to auto-fill its current density.
                                </p>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="bg-white rounded-card shadow-card p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowLeftRight size={18} className="text-primary" />
                                <h2 className="text-lg font-bold text-navy-dark">Converted Values</h2>
                            </div>

                            {!results ? (
                                <p className="text-sm text-gray-400 text-center py-6">Enter a value and density to see conversions</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(results).map(([unit, val]) => {
                                        const isSource = unit === fromUnit;
                                        return (
                                            <div
                                                key={unit}
                                                className={`rounded-lg p-4 border transition ${isSource
                                                        ? 'bg-primary/5 border-primary/30'
                                                        : 'bg-gray-50 border-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        {UNIT_LABELS[unit] || unit}
                                                    </p>
                                                    {isSource && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                                                            <Droplet size={12} /> Input
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xl font-bold ${isSource ? 'text-primary' : 'text-navy-dark'}`}>
                                                    {val !== null ? val.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VolumeConverter;