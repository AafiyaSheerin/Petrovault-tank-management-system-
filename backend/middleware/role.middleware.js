const { errorResponse } = require('../utils/formatResponse');
const supabase = require('../db/supabaseClient');

// Check if user has required role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Not authenticated — please login');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied — requires ${roles.join(' or ')} role`
      );
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Not authenticated — please login');
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 403, 'Access denied — admin only');
  }

  next();
};

// Check if user is admin or editor
const requireEditor = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Not authenticated — please login');
  }

  if (!['admin', 'editor'].includes(req.user.role)) {
    return errorResponse(res, 403, 'Access denied — admin or editor only');
  }

  next();
};

// Check if user has a specific permission (admin always passes)
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Not authenticated — please login');
    }

    // Admin always has full access
    if (req.user.role === 'admin') return next();

    try {
      const { data, error } = await supabase
        .from('employee_permissions')
        .select(permissionKey)
        .eq('employee_id', req.user.id)
        .single();

      if (error || !data || !data[permissionKey]) {
        return errorResponse(res, 403, 'Access denied — permission not granted');
      }

      next();
    } catch (err) {
      return errorResponse(res, 500, 'Permission check failed', err.message);
    }
  };
};

module.exports = { requireRole, requireAdmin, requireEditor, requirePermission };