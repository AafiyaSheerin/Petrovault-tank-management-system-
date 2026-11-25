const { convertVolume, getSupportedUnits, getDensities } = require('../utils/volumeConverter');
const { successResponse, errorResponse } = require('../utils/formatResponse');

// Convert volume between units
const convert = async (req, res) => {
  try {
    const { value, from_unit, to_unit, product_type } = req.body;

    if (!value || !from_unit || !to_unit) {
      return errorResponse(res, 400, 'Value, from_unit and to_unit are required');
    }

    if (isNaN(value) || value < 0) {
      return errorResponse(res, 400, 'Value must be a positive number');
    }

    const result = convertVolume(
      parseFloat(value),
      from_unit,
      to_unit,
      product_type || 'default'
    );

    return successResponse(res, 200, 'Conversion successful', {
      input: {
        value: parseFloat(value),
        unit: from_unit,
        product_type: product_type || 'default'
      },
      output: {
        value: result,
        unit: to_unit
      },
      formula: `${value} ${from_unit} = ${result} ${to_unit}`
    });

  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

// Convert to all units at once
const convertToAll = async (req, res) => {
  try {
    const { value, from_unit, product_type } = req.body;

    if (!value || !from_unit) {
      return errorResponse(res, 400, 'Value and from_unit are required');
    }

    if (isNaN(value) || value < 0) {
      return errorResponse(res, 400, 'Value must be a positive number');
    }

    const units = getSupportedUnits();
    const results = {};

    units.forEach(unit => {
      try {
        results[unit] = convertVolume(
          parseFloat(value),
          from_unit,
          unit,
          product_type || 'default'
        );
      } catch {
        results[unit] = null;
      }
    });

    return successResponse(res, 200, 'Conversion successful', {
      input: {
        value: parseFloat(value),
        unit: from_unit,
        product_type: product_type || 'default'
      },
      results
    });

  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

// Get supported units
const getUnits = async (req, res) => {
  try {
    const units = getSupportedUnits();
    return successResponse(res, 200, 'Units fetched', { units });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch units', error.message);
  }
};

// Get oil densities
const getOilDensities = async (req, res) => {
  try {
    const densities = getDensities();
    return successResponse(res, 200, 'Densities fetched', { densities });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch densities', error.message);
  }
};

module.exports = { convert, convertToAll, getUnits, getOilDensities };