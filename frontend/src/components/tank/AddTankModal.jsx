import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { tankApi } from '../../api/tank.api';
import { productApi } from '../../api/product.api';
import { useAlertContext } from '../../context/AlertContext';
import TankFillAnimation from './TankFillAnimation';

// ─── All 17 tank types ─────────────────────────────────────────────────────
export const SHAPES = [
    { value: 'vertical_cylinder_flat',          label: 'Vertical Cylinder with Flat Bottom',           group: 'Vertical Cylinders' },
    { value: 'vertical_cylinder_cone',          label: 'Vertical Cylinder with Cone Bottom',           group: 'Vertical Cylinders' },
    { value: 'vertical_cylinder_sloped',        label: 'Vertical Cylinder with Sloped Bottom',         group: 'Vertical Cylinders' },
    { value: 'vertical_cylinder_tori',          label: 'Vertical Cylinder with Dished Bottom (Torispherical)', group: 'Vertical Cylinders' },
    { value: 'vertical_cylinder_ellipsoidal',   label: 'Vertical Cylinder with Ellipsoidal Bottom',   group: 'Vertical Cylinders' },
    { value: 'vertical_cylinder_hemispherical', label: 'Vertical Cylinder with Hemispherical Bottom',  group: 'Vertical Cylinders' },
    { value: 'horizontal_cylinder',             label: 'Horizontal Cylindrical Tank',                  group: 'Horizontal Cylinders' },
    { value: 'horizontal_cylinder_flat',        label: 'Horizontal Cylinder with Flat Ends',           group: 'Horizontal Cylinders' },
    { value: 'horizontal_cylinder_dished',      label: 'Horizontal Cylinder with Dished Ends',        group: 'Horizontal Cylinders' },
    { value: 'horizontal_cylinder_hemispherical','label': 'Horizontal Cylinder with Hemispherical Ends (Bullet Tank)', group: 'Horizontal Cylinders' },
    { value: 'rectangular_prismatic',           label: 'Rectangular / Prismatic Tank',                group: 'Rectangular Tanks' },
    { value: 'rectangular_flat',                label: 'Rectangular Tank (Flat)',                      group: 'Rectangular Tanks' },
    { value: 'cube_ibc',                        label: 'Cube Tank (IBC Tote style)',                   group: 'Rectangular Tanks' },
    { value: 'spherical',                       label: 'Spherical Tank',                               group: 'Spherical Tanks' },
    { value: 'sphere_horton',                   label: 'Sphere (Horton Sphere)',                       group: 'Spherical Tanks' },
    { value: 'spheroid_flat',                   label: 'Spheroid (Flattened Sphere)',                  group: 'Spherical Tanks' },
];

const CONE_SHAPES = new Set(['vertical_cylinder_cone', 'cone_bottom']);

// Shape group detectors
const isVerticalCylinder = (shape) => [
    'vertical_cylinder_flat',
    'vertical_cylinder_sloped',
    'vertical_cylinder_tori',
    'vertical_cylinder_ellipsoidal',
    'vertical_cylinder_hemispherical',
    'cylinder',
    'dome_top'
].includes(shape);

const isConeBottom = (shape) => [
    'vertical_cylinder_cone',
    'cone_bottom'
].includes(shape);

const isRectangular = (shape) => [
    'rectangular',
    'rectangular_flat',
    'rectangular_prismatic',
    'cube_ibc'
].includes(shape);

const isHorizontalCylinder = (shape) => [
    'horizontal_cylinder',
    'horizontal_cylinder_flat',
    'horizontal_cylinder_dished',
    'horizontal_cylinder_hemispherical'
].includes(shape);

const isSpherical = (shape) => [
    'spherical',
    'sphere_horton',
    'spheroid_flat'
].includes(shape);

const NEW_PRODUCT_VALUE = '__new__';
const PRODUCT_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ef4444', '#eab308', '#78716c', '#854d0e'];

const DEFAULT_FORM = {
    name: '',
    shape: 'vertical_cylinder_flat',
    capacity_litres: '',
    litres_per_cm: '',
    cone_capacity_litres: '',
    diameter_cm: '',
    length_cm: '',
    width_cm: '',
    cone_height_cm: '',
    location: '',
    product_id: '',
    new_product_name: '',
    low_threshold: 20,
    high_threshold: 90,
};

// Group shapes for <optgroup>
const groupedShapes = SHAPES.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
}, {});

const AddTankModal = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useAlertContext();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm(DEFAULT_FORM);
            setError('');
            productApi.getAll()
                .then(res => setProducts(res.data.data))
                .catch(() => setProducts([]));
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const isCone = CONE_SHAPES.has(form.shape);
    const activeRate = Number(form.litres_per_cm) || 0;

    // Live preview: convert entered cm (capacity dip) to litres
    const previewFill = form.capacity_litres && activeRate && activeRate > 0
        ? Math.min((activeRate * 100) / Number(form.capacity_litres) * 100, 100)
        : 0; // show at 100cm what fill looks like

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) return setError('Tank name is required');
        if (!form.shape) return setError('Tank type is required');
        if (!form.litres_per_cm || Number(form.litres_per_cm) <= 0) {
            return setError('"1 CM = ? Litres" conversion rate is required');
        }
        if (isCone && (!form.cone_capacity_litres || Number(form.cone_capacity_litres) <= 0)) {
            return setError('Cone Capacity is required for cone-bottom tanks');
        }
        if (!form.capacity_litres || Number(form.capacity_litres) <= 0) {
            return setError('Tank capacity is required');
        }
        if (form.product_id === NEW_PRODUCT_VALUE && !form.new_product_name.trim()) {
            return setError('Please enter a name for the new product');
        }

        setLoading(true);
        try {
            let productId = form.product_id || null;

            if (form.product_id === NEW_PRODUCT_VALUE) {
                const randomColor = PRODUCT_COLORS[Math.floor(Math.random() * PRODUCT_COLORS.length)];
                const productRes = await productApi.create({
                    name: form.new_product_name.trim(),
                    density_kg_per_litre: 0.90,
                    color: randomColor,
                });
                productId = productRes.data.data.id;
            }

            const payload = {
                name: form.name.trim(),
                shape: form.shape,
                capacity_litres: Number(form.capacity_litres),
                location: null,
                product_id: productId,
                low_threshold: 20,
                high_threshold: 90,
                litres_per_cm: Number(form.litres_per_cm),
                cone_capacity_litres: isCone ? Number(form.cone_capacity_litres) : null,
                diameter_cm: null,
                length_cm: null,
                width_cm: null,
                cone_height_cm: null,
            };

            await tankApi.create(payload);

            showToast(`Tank "${form.name.trim()}" created successfully`, 'success');
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create tank');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Tank" maxWidth="max-w-2xl">
            {error && (
                <div className="bg-red-50 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-4" id="add-tank-form">
                        {/* Tank Name */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">Tank Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Tank A1, Storage Tank 1"
                                autoFocus
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                        </div>

                        {/* Tank Type */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">Tank Type *</label>
                            <select
                                name="shape"
                                value={form.shape}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark bg-white"
                            >
                                {Object.entries(groupedShapes).map(([group, shapes]) => (
                                    <optgroup key={group} label={group}>
                                        {shapes.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Product */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">Product</label>
                            <select
                                name="product_id"
                                value={form.product_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark bg-white"
                            >
                                <option value="">-- None --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                <option value={NEW_PRODUCT_VALUE}>+ Add New Product</option>
                            </select>
                        </div>

                        {/* New Product Name */}
                        {form.product_id === NEW_PRODUCT_VALUE && (
                            <div className="animate-fadeIn">
                                <label className="block text-sm font-semibold text-navy-dark mb-1.5">New Product Name *</label>
                                <input
                                    type="text"
                                    name="new_product_name"
                                    value={form.new_product_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Diesel, Furnace Oil"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                />
                            </div>
                        )}

                        {/* litres_per_cm */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">1 CM = ? Litres *</label>
                            <input
                                type="number"
                                name="litres_per_cm"
                                value={form.litres_per_cm}
                                onChange={handleChange}
                                placeholder="e.g. 10.5"
                                min="0.001"
                                step="any"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark font-semibold"
                            />
                        </div>

                        {/* Cone Capacity */}
                        {isCone && (
                            <div>
                                <label className="block text-sm font-semibold text-navy-dark mb-1.5">Cone Capacity (Liters) *</label>
                                <input
                                    type="number"
                                    name="cone_capacity_litres"
                                    value={form.cone_capacity_litres}
                                    onChange={handleChange}
                                    placeholder="e.g. 1770"
                                    min="0.1"
                                    step="any"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                                />
                            </div>
                        )}

                        {/* Tank Capacity */}
                        <div>
                            <label className="block text-sm font-semibold text-navy-dark mb-1.5">Tank Capacity (Liters) *</label>
                            <input
                                type="number"
                                name="capacity_litres"
                                value={form.capacity_litres}
                                onChange={handleChange}
                                placeholder="e.g. 10000"
                                min="1"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-navy-dark"
                            />
                            {activeRate && form.capacity_litres && activeRate > 0 && (
                                <p className="text-xs text-primary mt-1 font-medium">
                                    ≈ {(Number(form.capacity_litres) / activeRate).toFixed(1)} cm total tank depth
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 border border-gray-200 text-navy-dark font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition disabled:opacity-60">
                                {loading ? 'Creating...' : 'Add Tank'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right: Preview */}
                <div className="hidden lg:flex flex-col items-center gap-3 pt-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shape Preview</p>
                    <div className="h-48 w-full">
                        <TankFillAnimation
                            shape={form.shape}
                            fillPercentage={50}
                            fillColor="#3b82f6"
                            label="Preview"
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        {SHAPES.find(s => s.value === form.shape)?.label || form.shape}
                    </p>
                    {activeRate && activeRate > 0 && (
                        <div className="w-full bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500">1 cm =</p>
                            <p className="text-xl font-bold text-primary">{activeRate.toFixed(2)} L</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AddTankModal;