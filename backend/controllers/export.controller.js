const { successResponse, errorResponse } = require('../utils/formatResponse');
const { generatePDF, generateSingleTankPDF } = require('../services/pdfService');
const { exportTanksToSheets, exportHistoryToSheets, exportSingleTankToSheets } = require('../services/sheetsService');
const { getFullTankReport, getTankHistoryReport } = require('../services/reportService');
const supabase = require('../db/supabaseClient');

// Export tanks to PDF
const exportTanksPDF = async (req, res) => {
  try {
    const { title, date_range } = req.query;

    // Get full tank report
    const report = await getFullTankReport();
    if (!report.success) {
      return errorResponse(res, 500, 'Failed to fetch tank data');
    }

    // Generate PDF
    const pdf = await generatePDF({
      title: title || 'Tank Status Report',
      tanks: report.data,
      dateRange: date_range || new Date().toLocaleDateString('en-IN'),
      generatedBy: req.user.username
    });

    if (!pdf.success) {
      return errorResponse(res, 500, 'Failed to generate PDF');
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_pdf',
      description: `Exported tank report as PDF`
    });

    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="petrovault-report-${Date.now()}.pdf"`
    );
    res.send(pdf.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'PDF export failed', error.message);
  }
};

// Export tanks to Google Sheets
const exportTanksSheets = async (req, res) => {
  try {
    // Get full tank report
    const report = await getFullTankReport();
    if (!report.success) {
      return errorResponse(res, 500, 'Failed to fetch tank data');
    }

    // Export to sheets
    const result = await exportTanksToSheets({
      tanks: report.data,
      generatedBy: req.user.username
    });

    if (!result.success) {
      return errorResponse(res, 500, `Google Sheets export failed: ${result.error}`);
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_sheets',
      description: `Exported tank report to Google Sheets`
    });

    // Send XLSX as download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="petrovault-report-${Date.now()}.xlsx"`
    );
    return res.send(result.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'Google Sheets export failed', error.message);
  }
};

// Export tank history to PDF
const exportHistoryPDF = async (req, res) => {
  try {
    const { tank_id, start_date, end_date } = req.query;

    const report = await getTankHistoryReport({
      tankId: tank_id,
      startDate: start_date,
      endDate: end_date
    });

    if (!report.success) {
      return errorResponse(res, 500, 'Failed to fetch history data');
    }

    // Get tank name
    let tankName = 'All Tanks';
    if (tank_id) {
      const { data: tank } = await supabase
        .from('tanks')
        .select('name')
        .eq('id', tank_id)
        .single();
      tankName = tank?.name || 'Unknown Tank';
    }

    const pdf = await generatePDF({
      title: `History Report — ${tankName}`,
      tanks: report.data,
      dateRange: start_date && end_date
        ? `${start_date} to ${end_date}`
        : 'All Time',
      generatedBy: req.user.username
    });

    if (!pdf.success) {
      return errorResponse(res, 500, 'Failed to generate PDF');
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_pdf',
      description: `Exported history report as PDF for ${tankName}`
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="petrovault-history-${Date.now()}.pdf"`
    );
    res.send(pdf.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'History PDF export failed', error.message);
  }
};

// Export tank history to Google Sheets
const exportHistorySheets = async (req, res) => {
  try {
    const { tank_id, start_date, end_date } = req.query;

    const report = await getTankHistoryReport({
      tankId: tank_id,
      startDate: start_date,
      endDate: end_date
    });

    if (!report.success) {
      return errorResponse(res, 500, 'Failed to fetch history data');
    }

    let tankName = 'All Tanks';
    if (tank_id) {
      const { data: tank } = await supabase
        .from('tanks')
        .select('name')
        .eq('id', tank_id)
        .single();
      tankName = tank?.name || 'Unknown Tank';
    }

    const result = await exportHistoryToSheets({
      history: report.data,
      tankName,
      generatedBy: req.user.username
    });

    if (!result.success) {
      return errorResponse(res, 500, `Google Sheets export failed: ${result.error}`);
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_sheets',
      description: `Exported history to Google Sheets for ${tankName}`
    });

    // Send XLSX as download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="petrovault-history-${Date.now()}.xlsx"`
    );
    return res.send(result.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'History Sheets export failed', error.message);
  }
};

// Export a single tank (snapshot + history) to PDF
const exportSingleTankPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get tank details
    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select(`
        id, name, shape, capacity_litres, location, low_threshold, high_threshold, updated_at,
        products ( name, color ),
        tank_levels ( current_volume, fill_percentage, status, updated_at )
      `)
      .eq('id', id)
      .single();

    if (tankError || !tank) {
      return errorResponse(res, 404, 'Tank not found');
    }

    const flatTank = {
      ...tank,
      product_name: tank.products?.name || 'N/A',
      product_color: tank.products?.color || '#22c55e',
      current_volume: tank.tank_levels?.current_volume || 0,
      fill_percentage: tank.tank_levels?.fill_percentage || 0,
      status: tank.tank_levels?.status || 'empty',
    };

    // Get last 90 days history for this tank
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const { data: history } = await supabase
      .from('tank_history')
      .select('*')
      .eq('tank_id', id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    const pdf = await generateSingleTankPDF({
      tank: flatTank,
      history: history || [],
      generatedBy: req.user.username
    });

    if (!pdf.success) {
      return errorResponse(res, 500, 'Failed to generate PDF');
    }

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_pdf',
      description: `Exported individual tank report as PDF for ${tank.name}`
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="petrovault-tank-${tank.name.replace(/\s+/g,'-')}-${Date.now()}.pdf"`);
    res.send(pdf.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'Single tank PDF export failed', error.message);
  }
};

// Export a single tank (snapshot + history) to Sheets / XLSX
const exportSingleTankSheets = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select(`
        id, name, shape, capacity_litres, location, low_threshold, high_threshold, updated_at,
        products ( name, color ),
        tank_levels ( current_volume, fill_percentage, status, updated_at )
      `)
      .eq('id', id)
      .single();

    if (tankError || !tank) {
      return errorResponse(res, 404, 'Tank not found');
    }

    const flatTank = {
      ...tank,
      product_name: tank.products?.name || 'N/A',
      product_color: tank.products?.color || '#22c55e',
      current_volume: tank.tank_levels?.current_volume || 0,
      fill_percentage: tank.tank_levels?.fill_percentage || 0,
      status: tank.tank_levels?.status || 'empty',
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const { data: history } = await supabase
      .from('tank_history')
      .select('*')
      .eq('tank_id', id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    const result = await exportSingleTankToSheets({
      tank: flatTank,
      history: history || [],
      generatedBy: req.user.username
    });

    if (!result.success) {
      return errorResponse(res, 500, `Google Sheets export failed: ${result.error}`);
    }

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'export_sheets',
      description: `Exported individual tank report to Sheets for ${tank.name}`
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="petrovault-tank-${tank.name.replace(/\s+/g,'-')}-${Date.now()}.xlsx"`);
    return res.send(result.buffer);

  } catch (error) {
    return errorResponse(res, 500, 'Single tank Sheets export failed', error.message);
  }
};

module.exports = {
  exportTanksPDF,
  exportTanksSheets,
  exportHistoryPDF,
  exportHistorySheets,
  exportSingleTankPDF,
  exportSingleTankSheets
};