import React, { useId } from 'react';

// ─── SVG Paths for all tank shapes (viewBox 0 0 200 240) ─────────────────────
const SHAPE_PATHS = {
    vertical_cylinder_flat:
        'M40,30 C40,18 160,18 160,30 L160,210 C160,222 40,222 40,210 Z',
    vertical_cylinder_cone:
        'M40,25 C40,13 160,13 160,25 L160,170 L100,225 L40,170 Z',
    vertical_cylinder_sloped:
        'M40,25 C40,13 160,13 160,25 L160,180 L40,225 Z',
    vertical_cylinder_tori:
        'M40,30 C40,18 160,18 160,30 L160,200 Q160,225 135,225 L65,225 Q40,225 40,200 Z',
    vertical_cylinder_ellipsoidal:
        'M40,25 C40,13 160,13 160,25 L160,195 Q130,230 100,230 Q70,230 40,195 Z',
    vertical_cylinder_hemispherical:
        'M40,25 C40,13 160,13 160,25 L160,185 Q160,230 100,230 Q40,230 40,185 Z',
    horizontal_cylinder:
        'M30,60 C30,47 170,47 170,60 L170,180 C170,193 30,193 30,180 Z',
    horizontal_cylinder_flat:
        'M25,55 L175,55 L175,185 L25,185 Z',
    horizontal_cylinder_dished:
        'M35,55 Q25,120 35,185 L165,185 Q175,120 165,55 Z',
    horizontal_cylinder_hemispherical:
        'M50,55 Q20,120 50,185 L150,185 Q180,120 150,55 Z',
    rectangular_prismatic:
        'M35,20 L165,20 L165,225 L35,225 Z',
    rectangular_flat:
        'M30,30 L170,30 L170,220 L30,220 Z',
    cube_ibc:
        'M45,40 L155,40 L155,215 L45,215 Z',
    spherical:
        'M20,120 C20,60 180,60 180,120 C180,180 20,180 20,120 Z',
    sphere_horton:
        'M15,120 C15,55 185,55 185,120 C185,185 15,185 15,120 Z',
    spheroid_flat:
        'M20,100 C20,55 180,55 180,100 L180,140 C180,185 20,185 20,140 Z',
    // Legacy
    cone_bottom:
        'M40,25 C40,13 160,13 160,25 L160,170 L100,225 L40,170 Z',
    cylinder:
        'M40,30 C40,18 160,18 160,30 L160,210 C160,222 40,222 40,210 Z',
    dome_top:
        'M40,55 Q40,15 100,15 Q160,15 160,55 L160,225 L40,225 Z',
    rectangular:
        'M35,20 L165,20 L165,225 L35,225 Z',
};

// Fill bounds — { top, bottom } for the liquid rect in SVG units
const FILL_BOUNDS = {
    vertical_cylinder_flat:           { top: 20,  bottom: 220 },
    vertical_cylinder_cone:           { top: 15,  bottom: 225 },
    vertical_cylinder_sloped:         { top: 15,  bottom: 225 },
    vertical_cylinder_tori:           { top: 20,  bottom: 228 },
    vertical_cylinder_ellipsoidal:    { top: 15,  bottom: 228 },
    vertical_cylinder_hemispherical:  { top: 15,  bottom: 228 },
    horizontal_cylinder:              { top: 50,  bottom: 190 },
    horizontal_cylinder_flat:         { top: 58,  bottom: 183 },
    horizontal_cylinder_dished:       { top: 58,  bottom: 183 },
    horizontal_cylinder_hemispherical:{ top: 58,  bottom: 183 },
    rectangular_prismatic:            { top: 22,  bottom: 223 },
    rectangular_flat:                 { top: 32,  bottom: 218 },
    cube_ibc:                         { top: 42,  bottom: 213 },
    spherical:                        { top: 62,  bottom: 178 },
    sphere_horton:                    { top: 57,  bottom: 183 },
    spheroid_flat:                    { top: 57,  bottom: 183 },
    // Legacy
    cone_bottom:                      { top: 15,  bottom: 225 },
    cylinder:                         { top: 20,  bottom: 220 },
    dome_top:                         { top: 15,  bottom: 225 },
    rectangular:                      { top: 22,  bottom: 223 },
};

// Shapes with a cone at the bottom — need special fill polygon
const CONE_BOTTOM_SHAPES = new Set([
    'vertical_cylinder_cone',
    'cone_bottom',
]);

const CONE_SVG = {
    tipY: 225, coneTopY: 170, tipX: 100, leftX: 40, rightX: 160,
};

/**
 * Returns the SVG polygon points for the liquid fill of a cone-bottom tank.
 * Uses exact liquid surface Y coordinate.
 */
function getConeBottomFillPath(liquidTopY) {
    const { tipY, coneTopY, tipX, leftX, rightX } = CONE_SVG;
    const coneHeightSvg = tipY - coneTopY;          // 55 SVG units

    if (liquidTopY >= tipY) return null;          // empty

    if (liquidTopY >= coneTopY) {
        // ── Liquid is entirely inside the cone ──────────────────────────────
        // At height h from tip, cone half-width = (h / coneHeightSvg) * (rightX - tipX)
        const halfWidthFull = rightX - tipX;        // 60 SVG units
        const liquidDepthInCone = tipY - liquidTopY;
        const halfWidth = (liquidDepthInCone / coneHeightSvg) * halfWidthFull;

        return [
            [tipX - halfWidth, liquidTopY],
            [tipX + halfWidth, liquidTopY],
            [tipX, tipY],
        ].map(([x, y]) => `${x},${y}`).join(' ');
    } else {
        // ── Liquid fills cone + part of cylinder ───────────────────────────
        const cylinderPoints = [
            [leftX,  liquidTopY],
            [rightX, liquidTopY],
            [rightX, coneTopY],
            // cone section
            [tipX,   tipY],
            [leftX,  coneTopY],
        ];
        return cylinderPoints.map(([x, y]) => `${x},${y}`).join(' ');
    }
}

const TankFillAnimation = ({
    shape = 'vertical_cylinder_flat',
    fillPercentage = 0,
    fillColor = '#22c55e',
    emptyColor = '#f1f5f9',
    outlineColor = '#1e293b',
    label,
    currentVolume,
    capacity,
    coneCapacity,
}) => {
    const clipId = useId();
    const path   = SHAPE_PATHS[shape] || SHAPE_PATHS.rectangular_flat;
    const bounds = FILL_BOUNDS[shape]  || FILL_BOUNDS.rectangular_flat;
    const pct    = Math.max(0, Math.min(100, fillPercentage));

    const isCone = CONE_BOTTOM_SHAPES.has(shape);

    // ── Calculate exact liquid surface Y coordinate ─────────────────────────
    let liquidTopY;
    const { tipY, coneTopY } = CONE_SVG;
    const coneHeightSvg = tipY - coneTopY;          // 55 SVG units

    if (isCone && currentVolume !== undefined && capacity !== undefined && coneCapacity !== undefined) {
        const curVol = Number(currentVolume) || 0;
        const totCap = Number(capacity) || 0;
        const coneCap = Number(coneCapacity) || 0;

        if (curVol <= 0) {
            liquidTopY = tipY;
        } else if (curVol <= coneCap) {
            // Geometrically inside the cone: height is proportional to cube root of volume ratio
            const heightInCone = Math.pow(curVol / coneCap, 1/3) * coneHeightSvg;
            liquidTopY = tipY - heightInCone;
        } else {
            // Inside the cylinder: linear height of remaining volume
            const cylinderVolume = Math.min(curVol - coneCap, totCap - coneCap);
            const cylinderCapacity = totCap - coneCap;
            const heightInCylinder = cylinderCapacity > 0 ? (cylinderVolume / cylinderCapacity) * (coneTopY - bounds.top) : 0;
            liquidTopY = coneTopY - heightInCylinder;
        }
    } else {
        // Fallback to simple linear calculation if exact volume details are not passed
        const totalHeight  = bounds.bottom - bounds.top;
        const liquidHeight = (pct / 100) * totalHeight;
        liquidTopY      = bounds.bottom - liquidHeight;
    }

    // ── Cone-bottom: use polygon fill ────────────────────────────────────────
    const conePoints = isCone ? getConeBottomFillPath(liquidTopY) : null;

    // ── Regular: rect fill from bottom up ───────────────────────────────────
    const liquidY      = liquidTopY;
    const waveY        = isCone ? null : liquidY;

    return (
        <svg
            viewBox="0 0 200 240"
            className="w-full h-full"
            role="img"
            aria-label={label ? `${label} tank at ${pct}% full` : `Tank at ${pct}% full`}
        >
            <defs>
                <clipPath id={`clip-${clipId}`}>
                    <path d={path} />
                </clipPath>
            </defs>

            {/* Empty background */}
            <path d={path} fill={emptyColor} />

            {/* Liquid fill — clipped to tank shape */}
            <g clipPath={`url(#clip-${clipId})`}>
                {pct > 0 && (
                    isCone && conePoints ? (
                        /* Cone-bottom polygon fill */
                        <polygon
                            points={conePoints}
                            fill={fillColor}
                            className="tank-fill-transition"
                        />
                    ) : (
                        /* Standard rectangular fill + wave */
                        <>
                            <rect
                                x="0" y={liquidY}
                                width="200" height={(bounds.bottom - liquidY) + 10}
                                fill={fillColor}
                                className="tank-fill-transition"
                            />
                            {/* Wave 1 */}
                            <path
                                d={`M-50,${waveY} C0,${waveY - 4} 50,${waveY + 4} 100,${waveY} C150,${waveY - 4} 200,${waveY + 4} 250,${waveY} L250,${waveY + 15} L-50,${waveY + 15} Z`}
                                fill={fillColor}
                                opacity="0.5"
                                className="animate-wave"
                                style={{ transformOrigin: 'center' }}
                            />
                            {/* Wave 2 */}
                            <path
                                d={`M-50,${waveY} C0,${waveY + 4} 50,${waveY - 4} 100,${waveY} C150,${waveY + 4} 200,${waveY - 4} 250,${waveY} L250,${waveY + 15} L-50,${waveY + 15} Z`}
                                fill={fillColor}
                                opacity="0.3"
                                className="animate-wave"
                                style={{ transformOrigin: 'center', animationDirection: 'reverse', animationDuration: '4s' }}
                            />
                        </>
                    )
                )}
            </g>

            {/* Outline on top */}
            <path d={path} fill="none" stroke={outlineColor} strokeWidth="3" strokeLinejoin="round" />
        </svg>
    );
};

export default TankFillAnimation;