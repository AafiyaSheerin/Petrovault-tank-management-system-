// Oil density defaults (kg per litre) per product type
const OIL_DENSITIES = {
  'furnace_oil': 0.95,
  'ship_oil': 0.91,
  'used_oil': 0.88,
  'sludge': 1.02,
  'crude_oil': 0.85,
  'diesel': 0.84,
  'petrol': 0.74,
  'default': 0.90
};

// Convert any unit to Litres first (base unit)
const toLitres = (value, unit, productType = 'default') => {
  const density = OIL_DENSITIES[productType] || OIL_DENSITIES['default'];

  switch (unit.toLowerCase()) {
    case 'litres':
    case 'l':
      return value;
    case 'kilolitres':
    case 'kl':
      return value * 1000;
    case 'metric_tonnes':
    case 'mt':
      return value / density * 1000;
    case 'barrels':
    case 'bbl':
      return value * 158.987;
    case 'gallons':
    case 'gal':
      return value * 3.78541;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
};

// Convert from Litres to any unit
const fromLitres = (litres, unit, productType = 'default') => {
  const density = OIL_DENSITIES[productType] || OIL_DENSITIES['default'];

  switch (unit.toLowerCase()) {
    case 'litres':
    case 'l':
      return litres;
    case 'kilolitres':
    case 'kl':
      return litres / 1000;
    case 'metric_tonnes':
    case 'mt':
      return (litres * density) / 1000;
    case 'barrels':
    case 'bbl':
      return litres / 158.987;
    case 'gallons':
    case 'gal':
      return litres / 3.78541;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
};

// Main converter — from any unit to any unit
const convertVolume = (value, fromUnit, toUnit, productType = 'default') => {
  const litres = toLitres(value, fromUnit, productType);
  const result = fromLitres(litres, toUnit, productType);
  return Math.round(result * 1000) / 1000; // Round to 3 decimal places
};

const getSupportedUnits = () => {
  return ['litres', 'kilolitres', 'metric_tonnes', 'barrels', 'gallons'];
};

const getDensities = () => {
  return OIL_DENSITIES;
};

module.exports = { convertVolume, getSupportedUnits, getDensities, toLitres, fromLitres };