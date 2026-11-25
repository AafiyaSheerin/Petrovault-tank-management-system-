const supabase = require('../db/supabaseClient');

// Get full tank report with levels and products
const getFullTankReport = async () => {
  try {
    const { data, error } = await supabase
      .from('tanks')
      .select(`
        id,
        name,
        shape,
        capacity_litres,
        location,
        low_threshold,
        high_threshold,
        is_active,
        created_at,
        updated_at,
        products (
          id,
          name,
          density_kg_per_litre,
          color
        ),
        tank_levels (
          current_volume,
          fill_percentage,
          status,
          updated_at
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Flatten the data for easier use
    const tanks = data.map(tank => ({
      id: tank.id,
      name: tank.name,
      shape: tank.shape,
      capacity_litres: tank.capacity_litres,
      location: tank.location,
      low_threshold: tank.low_threshold,
      high_threshold: tank.high_threshold,
      product_name: tank.products?.name || 'N/A',
      product_color: tank.products?.color || '#22c55e',
      density: tank.products?.density_kg_per_litre || 0.90,
      current_volume: tank.tank_levels?.current_volume || 0,
      fill_percentage: tank.tank_levels?.fill_percentage || 0,
      status: tank.tank_levels?.status || 'empty',
      updated_at: tank.tank_levels?.updated_at || tank.updated_at
    }));

    return { success: true, data: tanks };

  } catch (error) {
    console.error('❌ Full tank report failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Get tank history report with filters
const getTankHistoryReport = async ({ tankId, startDate, endDate, action }) => {
  try {
    let query = supabase
      .from('tank_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (tankId) query = query.eq('tank_id', tankId);
    if (action) query = query.eq('action', action);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };

  } catch (error) {
    console.error('❌ Tank history report failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Get daily summary report
const getDailySummaryReport = async ({ tankId, days = 30 }) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('tank_history')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (tankId) query = query.eq('tank_id', tankId);

    const { data, error } = await query;
    if (error) throw error;

    // Group by date and tank
    const summary = {};
    data.forEach(record => {
      const date = new Date(record.created_at).toLocaleDateString('en-IN');
      const key = `${date}_${record.tank_id}`;

      if (!summary[key]) {
        summary[key] = {
          date,
          tank_id: record.tank_id,
          tank_name: record.tank_name,
          product_name: record.product_name,
          total_added: 0,
          total_removed: 0,
          transactions: 0,
          min_fill: record.fill_percentage_after,
          max_fill: record.fill_percentage_after,
          final_fill: record.fill_percentage_after
        };
      }

      if (record.action === 'add_stock') {
        summary[key].total_added += record.volume_changed;
      } else if (record.action === 'remove_stock') {
        summary[key].total_removed += record.volume_changed;
      }

      summary[key].transactions += 1;
      summary[key].min_fill = Math.min(summary[key].min_fill, record.fill_percentage_after);
      summary[key].max_fill = Math.max(summary[key].max_fill, record.fill_percentage_after);
      summary[key].final_fill = record.fill_percentage_after;
    });

    return { success: true, data: Object.values(summary) };

  } catch (error) {
    console.error('❌ Daily summary report failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Get product summary report
const getProductSummaryReport = async () => {
  try {
    const { data: tanks, error } = await supabase
      .from('tanks')
      .select(`
        name,
        capacity_litres,
        products ( name, color ),
        tank_levels ( current_volume, fill_percentage, status )
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Group by product
    const products = {};
    tanks.forEach(tank => {
      const productName = tank.products?.name || 'Unknown';
      if (!products[productName]) {
        products[productName] = {
          product_name: productName,
          color: tank.products?.color || '#22c55e',
          total_capacity: 0,
          total_volume: 0,
          tank_count: 0,
          tanks: []
        };
      }

      products[productName].total_capacity += tank.capacity_litres || 0;
      products[productName].total_volume += tank.tank_levels?.current_volume || 0;
      products[productName].tank_count += 1;
      products[productName].tanks.push({
        name: tank.name,
        fill_percentage: tank.tank_levels?.fill_percentage || 0,
        status: tank.tank_levels?.status || 'empty'
      });
    });

    // Add overall fill percentage per product
    const result = Object.values(products).map(p => ({
      ...p,
      overall_fill: p.total_capacity > 0
        ? Math.round((p.total_volume / p.total_capacity) * 100 * 10) / 10
        : 0
    }));

    return { success: true, data: result };

  } catch (error) {
    console.error('❌ Product summary report failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getFullTankReport,
  getTankHistoryReport,
  getDailySummaryReport,
  getProductSummaryReport
};