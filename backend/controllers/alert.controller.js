const supabase = require('../db/supabaseClient');
const { successResponse, errorResponse } = require('../utils/formatResponse');
const { getUnreadAlertsCount, markAllAlertsRead, getEmailAlertsEnabled, setEmailAlertsEnabled } = require('../services/alertService');

// Get all alerts with filters
const getAllAlerts = async (req, res) => {
  try {
    const {
      tank_id,
      alert_type,
      is_read,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('alerts')
      .select(`
        *,
        tanks ( name, shape ),
        users ( username, full_name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tank_id) query = query.eq('tank_id', tank_id);
    if (alert_type) query = query.eq('alert_type', alert_type);
    if (is_read !== undefined) query = query.eq('is_read', is_read === 'true');
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data, error, count } = await query;
    if (error) throw error;

    return successResponse(res, 200, 'Alerts fetched successfully', {
      alerts: data || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch alerts', error.message);
  }
};

// Get unread alerts count for navbar badge
const getUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadAlertsCount();
    return successResponse(res, 200, 'Unread count fetched', { count });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch unread count', error.message);
  }
};

// Mark single alert as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    return successResponse(res, 200, 'Alert marked as read');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to mark alert as read', error.message);
  }
};

// Mark all alerts as read
const markAllRead = async (req, res) => {
  try {
    const success = await markAllAlertsRead();
    if (!success) {
      return errorResponse(res, 500, 'Failed to mark all alerts as read');
    }
    return successResponse(res, 200, 'All alerts marked as read');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to mark alerts as read', error.message);
  }
};

// Get alert recipients
const getRecipients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alert_recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, 200, 'Recipients fetched successfully', data || []);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch recipients', error.message);
  }
};

// Add alert recipient
const addRecipient = async (req, res) => {
  try {
    const { email, full_name, alert_types } = req.body;

    if (!email) {
      return errorResponse(res, 400, 'Email is required');
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('alert_recipients')
      .select('id')
      .eq('email', email.trim())
      .single();

    if (existing) {
      return errorResponse(res, 400, `Email "${email}" is already a recipient`);
    }

    const { data, error } = await supabase
      .from('alert_recipients')
      .insert({
        email: email.trim(),
        full_name,
        alert_types: alert_types || [
          'low_stock',
          'high_stock',
          'tank_full',
          'overfill_attempt'
        ],
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse(res, 201, 'Recipient added successfully', data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to add recipient', error.message);
  }
};

// Update alert recipient
const updateRecipient = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, alert_types, is_active } = req.body;

    const { data, error } = await supabase
      .from('alert_recipients')
      .update({ full_name, alert_types, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(res, 200, 'Recipient updated successfully', data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to update recipient', error.message);
  }
};

// ─── Global email alert toggle ───────────────────────────────────────────────
const getAlertToggle = async (req, res) => {
  try {
    const enabled = await getEmailAlertsEnabled();
    return successResponse(res, 200, 'Alert toggle fetched', { email_alerts_enabled: enabled });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch alert toggle', error.message);
  }
};

const setAlertToggle = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return errorResponse(res, 400, '"enabled" must be a boolean (true or false)');
    }
    const success = await setEmailAlertsEnabled(enabled);
    if (!success) return errorResponse(res, 500, 'Failed to update alert toggle');
    return successResponse(res, 200, `Email alerts ${enabled ? 'enabled' : 'disabled'}`, { email_alerts_enabled: enabled });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update alert toggle', error.message);
  }
};

// Delete alert recipient
const deleteRecipient = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('alert_recipients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(res, 200, 'Recipient deleted successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete recipient', error.message);
  }
};

module.exports = {
  getAllAlerts,
  getUnreadCount,
  markAsRead,
  markAllRead,
  getRecipients,
  addRecipient,
  updateRecipient,
  deleteRecipient,
  getAlertToggle,
  setAlertToggle,
};