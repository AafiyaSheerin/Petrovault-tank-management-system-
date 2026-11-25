const { successResponse, errorResponse } = require('../utils/formatResponse');
const {
  getFullTankReport,
  getTankHistoryReport,
  getDailySummaryReport,
  getProductSummaryReport
} = require('../services/reportService');

// Get full tank report
const getFullReport = async (req, res) => {
  try {
    const result = await getFullTankReport();
    if (!result.success) {
      return errorResponse(res, 500, result.error);
    }
    return successResponse(res, 200, 'Full report fetched', result.data);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get full report', error.message);
  }
};

// Get tank history report
const getHistoryReport = async (req, res) => {
  try {
    const { tank_id, start_date, end_date, action } = req.query;

    const result = await getTankHistoryReport({
      tankId: tank_id,
      startDate: start_date,
      endDate: end_date,
      action
    });

    if (!result.success) {
      return errorResponse(res, 500, result.error);
    }

    return successResponse(res, 200, 'History report fetched', result.data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to get history report', error.message);
  }
};

// Get daily summary report
const getDailyReport = async (req, res) => {
  try {
    const { tank_id, days } = req.query;

    const result = await getDailySummaryReport({
      tankId: tank_id,
      days: parseInt(days) || 30
    });

    if (!result.success) {
      return errorResponse(res, 500, result.error);
    }

    return successResponse(res, 200, 'Daily report fetched', result.data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to get daily report', error.message);
  }
};

// Get product summary report
const getProductReport = async (req, res) => {
  try {
    const result = await getProductSummaryReport();

    if (!result.success) {
      return errorResponse(res, 500, result.error);
    }

    return successResponse(res, 200, 'Product report fetched', result.data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to get product report', error.message);
  }
};

module.exports = {
  getFullReport,
  getHistoryReport,
  getDailyReport,
  getProductReport
};