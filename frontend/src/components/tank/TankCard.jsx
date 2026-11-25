import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, ClipboardList, Trash2, Copy } from 'lucide-react';
import TankFillAnimation from './TankFillAnimation';

const STATUS_COLORS = {
    empty: '#94a3b8',
    critical: '#ef4444',
    warning: '#eab308',
    healthy: '#22c55e',
};

const TankCard = ({
    tank,
    isAdmin = false,
    canAddStock = false,
    onEdit,
    onDelete,
    onCopy,
    onUpdateStock,   // single handler — opens the dip modal regardless of add/remove
}) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);

    const {
        id,
        name,
        shape,
        fill_percentage,
        current_volume,
        capacity_litres,
        product_name,
        product_color,
        status,
        cone_capacity_litres,
    } = tank;

    const fillColor = STATUS_COLORS[status] || STATUS_COLORS.healthy;

    return (
        <div
            className="relative bg-white rounded-card shadow-card hover:shadow-cardHover transition-shadow p-4 flex flex-col cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => navigate(`/tanks/${id}`)}
        >
            {/* Hover Action Icons — always kept */}
            {hovered && (
                <div className="absolute top-3 right-3 flex gap-2 z-10 animate-fadeIn">
                    {isAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(tank); }}
                            className="w-8 h-8 rounded-full bg-info text-white flex items-center justify-center shadow hover:opacity-90"
                            title="Edit tank"
                        >
                            <Pencil size={15} />
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCopy?.(tank); }}
                            className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shadow hover:opacity-90"
                            title="Copy tank"
                        >
                            <Copy size={15} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/tanks/${id}`); }}
                        className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow hover:opacity-90"
                        title="View history"
                    >
                        <ClipboardList size={15} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(tank); }}
                            className="w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center shadow hover:opacity-90"
                            title="Delete tank"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )}

            {/* Tank SVG */}
            <div
                className="h-44 mb-2 rounded-xl transition-all duration-200 hover:scale-[1.03] hover:drop-shadow-md"
            >
                <TankFillAnimation
                    shape={shape}
                    fillPercentage={fill_percentage}
                    fillColor={fillColor}
                    label={name}
                    currentVolume={current_volume}
                    capacity={capacity_litres}
                    coneCapacity={cone_capacity_litres}
                />
            </div>

            {/* Clickable hint label */}
            <p className="text-center text-xs text-primary/70 -mt-1 mb-1 font-medium tracking-wide">
                View history & update stock
            </p>

            {/* Tank Name */}
            <h3 className="text-center font-bold text-lg text-navy-dark">{name}</h3>

            {/* Fill Percentage */}
            <p className="text-center text-2xl font-bold text-primary mt-1">
                {fill_percentage}%
            </p>

            {/* Volume Info */}
            <p className="text-center text-sm text-gray-500 mt-1">
                {current_volume?.toLocaleString()} / {capacity_litres?.toLocaleString()} L
            </p>

            {/* Product Name */}
            <div className="flex items-center justify-center gap-2 mt-1">
                <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: product_color || '#22c55e' }}
                />
                <p className="text-center text-sm font-semibold text-navy-dark">
                    {product_name}
                </p>
            </div>

            {/* Shape Label */}
            <p className="text-center text-xs text-gray-400 mt-1">
                {shape}
            </p>
        </div>
    );
};

export default TankCard;