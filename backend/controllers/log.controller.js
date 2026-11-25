const supabase = require('../db/supabaseClient');
const { successResponse, errorResponse } = require('../utils/formatResponse');

// Get all activity logs with filters
const getAllLogs = async (req, res) => {
  try {
    const {
      user_id,
      action,
      tank_id,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);
    if (tank_id) query = query.eq('tank_id', tank_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data, error, count } = await query;
    if (error) throw error;

    return successResponse(res, 200, 'Logs fetched successfully', {
      logs: data || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch logs', error.message);
  }
};

// Get logs for a specific tank
const getTankLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('tank_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse(res, 200, 'Tank logs fetched successfully', {
      logs: data || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch tank logs', error.message);
  }
};

// Get logs for a specific user
const getUserLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse(res, 200, 'User logs fetched successfully', {
      logs: data || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch user logs', error.message);
  }
};

// Get log summary stats
const getLogStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: stockAddedToday } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'add_stock')
      .gte('created_at', today.toISOString());

    const { count: loginsToday } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'login')
      .gte('created_at', today.toISOString());

    const { data: recentLogs } = await supabase
      .from('activity_log')
      .select('username')
      .order('created_at', { ascending: false })
      .limit(100);

    const userCounts = {};
    recentLogs?.forEach(log => {
      userCounts[log.username] = (userCounts[log.username] || 0) + 1;
    });
    const mostActiveUser = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return successResponse(res, 200, 'Log stats fetched', {
      today_total: todayCount || 0,
      stock_added_today: stockAddedToday || 0,
      logins_today: loginsToday || 0,
      most_active_user: mostActiveUser
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch log stats', error.message);
  }
};

// Clear logs older than X days (or all if days=0)
const clearLogs = async (req, res) => {
  try {
    const { days } = req.body;

    let query = supabase.from('activity_log').delete();

    if (days && Number(days) > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Number(days));
      query = query.lt('created_at', cutoffDate.toISOString());
    } else {
      query = query.gte('created_at', '1900-01-01');
    }

    const { error } = await query;
    if (error) throw error;

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'delete_employee',
      description: days && Number(days) > 0
        ? `Cleared activity logs older than ${days} days`
        : 'Cleared all activity logs',
    });

    return successResponse(res, 200, 'Logs cleared successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to clear logs', error.message);
  }
};

module.exports = {
  getAllLogs,
  getTankLogs,
  getUserLogs,
  getLogStats,
  clearLogs
};