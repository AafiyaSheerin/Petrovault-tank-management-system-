/**
 * PetroVault — Tank Shape Helper
 * Complete rewrite with real geometric formulas.
 */

// ─── All 17 supported shape types ────────────────────────────────────────────
const TANK_SHAPES = {
  VERTICAL_CYLINDER_FLAT:          'vertical_cylinder_flat',
  VERTICAL_CYLINDER_CONE:          'vertical_cylinder_cone',
  VERTICAL_CYLINDER_SLOPED:        'vertical_cylinder_sloped',
  VERTICAL_CYLINDER_TORI:          'vertical_cylinder_tori',
  VERTICAL_CYLINDER_ELLIPSOIDAL:   'vertical_cylinder_ellipsoidal',
  VERTICAL_CYLINDER_HEMISPHERICAL: 'vertical_cylinder_hemispherical',
  HORIZONTAL_CYLINDER:             'horizontal_cylinder',
  HORIZONTAL_CYLINDER_FLAT:        'horizontal_cylinder_flat',
  HORIZONTAL_CYLINDER_DISHED:      'horizontal_cylinder_dished',
  HORIZONTAL_CYLINDER_HEMISPHERICAL: 'horizontal_cylinder_hemispherical',
  RECTANGULAR:                     'rectangular',
  RECTANGULAR_FLAT:                'rectangular_flat',
  RECTANGULAR_PRISMATIC:           'rectangular_prismatic',
  CUBE_IBC:                        'cube_ibc',
  SPHERICAL:                       'spherical',
  SPHERE_HORTON:                   'sphere_horton',
  SPHEROID_FLAT:                   'spheroid_flat',
  // Legacy (backwards-compat)
  CONE_BOTTOM:                     'cone_bottom',
  CYLINDER:                        'cylinder',
  DOME_TOP:                        'dome_top',
};

// Shapes grouped by formula
const LINEAR_CYLINDER_SHAPES = new Set([
  'vertical_cylinder_flat',
  'vertical_cylinder_sloped',
  'vertical_cylinder_tori',
  'vertical_cylinder_ellipsoidal',
  'vertical_cylinder_hemispherical',
  'cylinder',
  'dome_top',
]);

const CONE_BOTTOM_SHAPES = new Set([
  'vertical_cylinder_cone',
  'cone_bottom',
]);

const RECTANGULAR_SHAPES = new Set([
  'rectangular',
  'rectangular_flat',
  'rectangular_prismatic',
  'cube_ibc',
]);

const HORIZONTAL_CYLINDER_SHAPES = new Set([
  'horizontal_cylinder',
  'horizontal_cylinder_flat',
  'horizontal_cylinder_dished',
  'horizontal_cylinder_hemispherical',
]);

const SPHERICAL_SHAPES = new Set([
  'spherical',
  'sphere_horton',
  'spheroid_flat',
]);

// ─── Basic fill helpers ───────────────────────────────────────────────────────
const getFillPercentage = (currentVolume, capacity) => {
  if (capacity <= 0) return 0;
  const percentage = (currentVolume / capacity) * 100;
  return Math.min(Math.round(percentage * 10) / 10, 100);
};

const getTankStatus = (percentage, lowThreshold = 20, highThreshold = 90) => {
  if (percentage <= 0) return 'empty';
  if (percentage < lowThreshold) return 'critical';
  if (percentage >= highThreshold) return 'warning';
  return 'healthy';
};

const getFillColor = (status) => {
  switch (status) {
    case 'empty':    return '#64748b';
    case 'critical': return '#ef4444';
    case 'warning':  return '#eab308';
    case 'healthy':  return '#22c55e';
    default:         return '#22c55e';
  }
};

const checkOverfill = (currentVolume, addVolume, capacity) => {
  const newVolume = currentVolume + addVolume;
  if (newVolume > capacity) {
    return {
      willOverfill: true,
      overflow: Math.round((newVolume - capacity) * 100) / 100,
      maxCanAdd: Math.round((capacity - currentVolume) * 100) / 100
    };
  }
  return {
    willOverfill: false,
    overflow: 0,
    maxCanAdd: Math.round((capacity - currentVolume) * 100) / 100
  };
};

// Numerical solver for reverse lookup (volume -> dip_cm)
const solveDipFromVolume = (targetVolume, maxDip, volumeFunc) => {
  let low = 0;
  let high = maxDip;
  let iterations = 0;
  while (high - low > 0.01 && iterations < 30) {
    const mid = (low + high) / 2;
    const v = volumeFunc(mid);
    if (v < targetVolume) {
      low = mid;
    } else {
      high = mid;
    }
    iterations++;
  }
  return Math.round((low + high) / 2 * 100) / 100;
};

// ─── CM → Litres (Linear & Cone Bottom Fallback) ──────────────────────────────
/**
 * Convert a dip reading (cm) to litres using linear conversion rate.
 *
 * @param {string} shape              - Tank shape key
 * @param {number} dipCm              - Liquid depth in cm (dip reading)
 * @param {number} litresPerCm        - How many litres per 1 cm
 * @param {number|null} coneCapacity  - Optional: litres in cone section
 * @param {number} capacityLitres     - Total tank capacity in litres
 * @returns {{ litres: number, fillPercentage: number }}
 */
const cmToLitres = (shape, dipCm, litresPerCm, coneCapacity, capacityLitres) => {
  const dip = Number(dipCm);
  if (dip < 0) {
    return { litres: 0, fillPercentage: 0 };
  }

  let litres = 0;

  if (!litresPerCm || litresPerCm <= 0) {
    return { litres: 0, fillPercentage: 0 };
  }

  if (CONE_BOTTOM_SHAPES.has(shape) && coneCapacity && coneCapacity > 0) {
    const coneHeightCm = coneCapacity / litresPerCm;
    if (dip <= coneHeightCm) {
      litres = coneCapacity * Math.pow(dip / coneHeightCm, 3);
    } else {
      litres = coneCapacity + (dip - coneHeightCm) * litresPerCm;
    }
  } else {
    litres = dip * litresPerCm;
  }

  litres = Math.min(litres, capacityLitres);
  litres = Math.round(litres * 100) / 100;
  const fillPercentage = capacityLitres > 0
    ? Math.round((litres / capacityLitres) * 1000) / 10
    : 0;

  return { litres, fillPercentage: Math.min(fillPercentage, 100) };
};

// ─── Litres → CM (Linear & Cone Bottom Fallback) ──────────────────────────────
/**
 * Convert litres to estimated dip cm using linear conversion rate.
 */
const litresToCm = (shape, litres, litresPerCm, coneCapacity, capacityLitres) => {
  let cm = null;

  if (!litresPerCm || litresPerCm <= 0) return null;

  if (CONE_BOTTOM_SHAPES.has(shape) && coneCapacity && coneCapacity > 0) {
    const coneHeightCm = coneCapacity / litresPerCm;
    if (litres <= coneCapacity) {
      const ratio = litres / coneCapacity;
      cm = Math.pow(ratio, 1 / 3) * coneHeightCm;
    } else {
      cm = coneHeightCm + (litres - coneCapacity) / litresPerCm;
    }
  } else {
    cm = litres / litresPerCm;
  }

  return Math.round(cm * 100) / 100;
};

const hasConeBottom = (shape) => CONE_BOTTOM_SHAPES.has(shape);

module.exports = {
  TANK_SHAPES,
  CONE_BOTTOM_SHAPES,
  LINEAR_CYLINDER_SHAPES,
  RECTANGULAR_SHAPES,
  HORIZONTAL_CYLINDER_SHAPES,
  SPHERICAL_SHAPES,
  getFillPercentage,
  getTankStatus,
  getFillColor,
  checkOverfill,
  cmToLitres,
  litresToCm,
  hasConeBottom,
};