const supabase = require('../db/supabaseClient');
const { hashPassword } = require('../utils/hashPassword');
const { successResponse, errorResponse } = require('../utils/formatResponse');

// Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        phone,
        role,
        is_active,
        created_at
      `)
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get permissions and tank access for each employee
    const employeesWithDetails = await Promise.all(
      data.map(async (emp) => {
        const { data: permissions } = await supabase
          .from('employee_permissions')
          .select('*')
          .eq('employee_id', emp.id)
          .single();

        const { data: tankAccess } = await supabase
          .from('employee_tank_access')
          .select(`
            tank_id,
            granted_at,
            tanks ( id, name, shape )
          `)
          .eq('employee_id', emp.id);

        return {
          ...emp,
          permissions: permissions || null,
          tank_access: tankAccess?.map(a => ({
            tank_id: a.tank_id,
            tank_name: a.tanks?.name,
            tank_shape: a.tanks?.shape,
            granted_at: a.granted_at
          })) || []
        };
      })
    );

    return successResponse(res, 200, 'Employees fetched successfully', employeesWithDetails);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch employees', error.message);
  }
};

// Get single employee
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emp, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, phone, role, is_active, created_at')
      .eq('id', id)
      .single();

    if (error || !emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    const { data: permissions } = await supabase
      .from('employee_permissions')
      .select('*')
      .eq('employee_id', id)
      .single();

    const { data: tankAccess } = await supabase
      .from('employee_tank_access')
      .select(`
        tank_id,
        granted_at,
        tanks ( id, name, shape )
      `)
      .eq('employee_id', id);

    return successResponse(res, 200, 'Employee fetched successfully', {
      ...emp,
      permissions: permissions || null,
      tank_access: tankAccess?.map(a => ({
        tank_id: a.tank_id,
        tank_name: a.tanks?.name,
        tank_shape: a.tanks?.shape,
        granted_at: a.granted_at
      })) || []
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch employee', error.message);
  }
};

// Create employee
const createEmployee = async (req, res) => {
  try {
    const { username, full_name, email, phone, password, role } = req.body;

    if (!username || !password) {
      return errorResponse(res, 400, 'Username and password are required');
    }

    if (password.trim().length < 6) {
      return errorResponse(res, 400, 'Password must be at least 6 characters');
    }

    if (!['editor', 'viewer'].includes(role)) {
      return errorResponse(res, 400, 'Role must be editor or viewer');
    }

    // Check duplicate username
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (existing) {
      return errorResponse(res, 400, `Username "${username}" already exists`);
    }

    // Hash the supplied password
    const passwordHash = await hashPassword(password.trim());

    const { data: employee, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name || null,
        email: email || null,
        phone: phone ? phone.trim() : null,
        role,
        is_active: true
      })
      .select('id, username, full_name, email, phone, role, is_active, created_at')
      .single();

    if (error) throw error;

    // Create default permissions
    await supabase.from('employee_permissions').insert({
      employee_id: employee.id,
      can_view_tanks: true,
      can_add_stock: role === 'editor',
      can_edit_tank: false,
      can_delete_tank: false,
      can_view_reports: false,
      can_export: false,
      can_view_logs: false,
      can_convert_volume: true
    });

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'add_employee',
      description: `Created new employee: ${username} (${role})`,
      new_value: { username, role }
    });

    return successResponse(res, 201, 'Employee created successfully', employee);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to create employee', error.message);
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, password, role, is_active } = req.body;

    const { data: oldEmp } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldEmp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    const updateData = {
      full_name: full_name !== undefined ? full_name : oldEmp.full_name,
      email: email !== undefined ? email : oldEmp.email,
      phone: phone !== undefined ? (phone || null) : oldEmp.phone,
      role: role || oldEmp.role,
      is_active: is_active !== undefined ? is_active : oldEmp.is_active
    };

    // If a new password is provided, hash and update it
    if (password && password.trim().length >= 4) {
      updateData.password_hash = await hashPassword(password.trim());
    }

    const { data: employee, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, full_name, email, phone, role, is_active')
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'edit_employee',
      description: `Updated employee: ${oldEmp.username}`,
      old_value: { role: oldEmp.role, is_active: oldEmp.is_active },
      new_value: { role: updateData.role, is_active: updateData.is_active }
    });

    return successResponse(res, 200, 'Employee updated successfully', employee);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to update employee', error.message);
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emp } = await supabase
      .from('users')
      .select('username, role')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    if (emp.role === 'admin') {
      return errorResponse(res, 403, 'Cannot delete admin account');
    }

    await supabase.from('users').delete().eq('id', id);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'delete_employee',
      description: `Deleted employee: ${emp.username}`
    });

    return successResponse(res, 200, 'Employee deleted successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete employee', error.message);
  }
};

// Update employee permissions
const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = req.body;

    const { data: emp } = await supabase
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    const { data, error } = await supabase
      .from('employee_permissions')
      .update(permissions)
      .eq('employee_id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'update_permissions',
      description: `Updated permissions for: ${emp.username}`,
      new_value: permissions
    });

    return successResponse(res, 200, 'Permissions updated successfully', data);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to update permissions', error.message);
  }
};

// Grant tank access to employee
const grantTankAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { tank_id } = req.body;

    const { data: emp } = await supabase
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    const { error } = await supabase
      .from('employee_tank_access')
      .upsert({
        employee_id: id,
        tank_id,
        granted_by: req.user.id
      }, { onConflict: 'employee_id, tank_id' });

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'grant_tank_access',
      description: `Granted tank access to: ${emp.username}`,
      tank_id,
      new_value: { employee: emp.username, tank_id }
    });

    return successResponse(res, 200, 'Tank access granted successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to grant tank access', error.message);
  }
};

// Revoke tank access from employee
const revokeTankAccess = async (req, res) => {
  try {
    const { id, tank_id } = req.params;

    const { data: emp } = await supabase
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    await supabase
      .from('employee_tank_access')
      .delete()
      .eq('employee_id', id)
      .eq('tank_id', tank_id);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'revoke_tank_access',
      description: `Revoked tank access from: ${emp.username}`,
      tank_id
    });

    return successResponse(res, 200, 'Tank access revoked successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to revoke tank access', error.message);
  }
};

// Grant all tanks access to employee
const grantAllTanksAccess = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emp } = await supabase
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    // Get all active tanks
    const { data: tanks } = await supabase
      .from('tanks')
      .select('id')
      .eq('is_active', true);

    if (!tanks || tanks.length === 0) {
      return errorResponse(res, 404, 'No active tanks found');
    }

    // Grant access to all tanks
    const accessRecords = tanks.map(tank => ({
      employee_id: id,
      tank_id: tank.id,
      granted_by: req.user.id
    }));

    await supabase
      .from('employee_tank_access')
      .upsert(accessRecords, { onConflict: 'employee_id, tank_id' });

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'grant_tank_access',
      description: `Granted ALL tank access to: ${emp.username}`
    });

    return successResponse(res, 200, `All ${tanks.length} tanks access granted to ${emp.username}`);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to grant all tank access', error.message);
  }
};

// Reset employee password to phone number
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emp } = await supabase
      .from('users')
      .select('username, phone')
      .eq('id', id)
      .single();

    if (!emp) {
      return errorResponse(res, 404, 'Employee not found');
    }

    if (!emp.phone) {
      return errorResponse(res, 400, 'Employee has no phone number set');
    }

    const passwordHash = await hashPassword(emp.phone);

    await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    return successResponse(
      res, 200,
      `Password reset to phone number for ${emp.username}`
    );

  } catch (error) {
    return errorResponse(res, 500, 'Failed to reset password', error.message);
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updatePermissions,
  grantTankAccess,
  revokeTankAccess,
  grantAllTanksAccess,
  resetPassword
};