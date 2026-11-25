const { errorResponse } = require('../utils/formatResponse');
const supabase = require('../db/supabaseClient');

const checkTankAccess = async (req, res, next) => {
  try {
    const { id: tankId } = req.params;
    const user = req.user;

    // Admin has access to all tanks — no check needed
    if (user.role === 'admin') {
      return next();
    }

    // Check if employee has access to this specific tank
    const { data: access, error } = await supabase
      .from('employee_tank_access')
      .select('id')
      .eq('employee_id', user.id)
      .eq('tank_id', tankId)
      .single();

    if (error || !access) {
      return errorResponse(
        res,
        403,
        'Access denied — you do not have access to this tank'
      );
    }

    next();

  } catch (error) {
    return errorResponse(res, 500, 'Tank access check failed', error.message);
  }
};

// Check if employee has permission for a specific feature
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Get employee permissions from database
      const { data: permissions, error } = await supabase
        .from('employee_permissions')
        .select('*')
        .eq('employee_id', user.id)
        .single();

      if (error || !permissions) {
        return errorResponse(res, 403, 'Access denied — permissions not found');
      }

      if (!permissions[permission]) {
        return errorResponse(
          res,
          403,
          `Access denied — you do not have ${permission} permission`
        );
      }

      next();

    } catch (error) {
      return errorResponse(res, 500, 'Permission check failed', error.message);
    }
  };
};

module.exports = { checkTankAccess, checkPermission };