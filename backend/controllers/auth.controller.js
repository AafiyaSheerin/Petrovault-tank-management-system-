const supabase = require('../db/supabaseClient');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { generateToken } = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/formatResponse');
const { sendPasswordResetOTP } = require('../services/emailService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, 400, 'Username and password are required');
    }

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, full_name, email, phone, role, is_active')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error || !user) {
      return errorResponse(res, 401, 'Invalid username or password');
    }

    // Check if account is active
    if (!user.is_active) {
      return errorResponse(res, 403, 'Your account has been deactivated — contact admin');
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid username or password');
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    // Fetch permissions for non-admin users
    let permissions = null;
    if (user.role !== 'admin') {
      const { data: perms } = await supabase
        .from('employee_permissions')
        .select('*')
        .eq('employee_id', user.id)
        .single();
      permissions = perms;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      username: user.username,
      role: user.role,
      action: 'login',
      description: `${user.full_name || user.username} logged in`,
      ip_address: req.ip
    });

    return successResponse(res, 200, 'Login successful', {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions
      }
    });

  } catch (error) {
    return errorResponse(res, 500, 'Login failed', error.message);
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'logout',
      description: `${req.user.username} logged out`,
      ip_address: req.ip
    });

    return successResponse(res, 200, 'Logged out successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Logout failed', error.message);
  }
};

// Get current logged in user
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, phone, role, is_active, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Get permissions if employee
    let permissions = null;
    if (user.role !== 'admin') {
      const { data: perms } = await supabase
        .from('employee_permissions')
        .select('*')
        .eq('employee_id', user.id)
        .single();
      permissions = perms;
    }

    return successResponse(res, 200, 'User fetched successfully', {
      ...user,
      permissions
    });

  } catch (error) {
    return errorResponse(res, 500, 'Failed to get user', error.message);
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return errorResponse(res, 400, 'Current and new password are required');
    }

    if (new_password.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters');
    }

    // Get current password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password
    const isMatch = await comparePassword(current_password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.user.id);

    return successResponse(res, 200, 'Password changed successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Password change failed', error.message);
  }
};

// Forgot password — send OTP to email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 400, 'Email address is required');
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, is_active')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always return success to prevent email enumeration
    if (error || !user) {
      console.log('⚠️  Forgot password: no user found for email:', email);
      return successResponse(res, 200, 'If that email exists, an OTP has been sent');
    }

    if (!user.is_active) {
      console.log('⚠️  Forgot password: user is inactive:', user.username);
      return successResponse(res, 200, 'If that email exists, an OTP has been sent');
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP for safe storage
    const otpHash = await bcrypt.hash(otp, 10);

    // Set expiry — 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store hashed OTP in DB
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_otp_hash: otpHash,
        reset_otp_expires_at: expiresAt
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to save OTP to DB:', updateError.message);
      return errorResponse(res, 500, 'Failed to initiate password reset. Have you run the database migration? — ' + updateError.message);
    }

    // Send OTP email
    const emailResult = await sendPasswordResetOTP({
      to: user.email,
      otp,
      username: user.full_name || user.username
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send OTP email:', emailResult.error);
      return errorResponse(res, 500, 'Failed to send OTP email: ' + emailResult.error);
    }

    console.log('✅ OTP sent to:', user.email, 'for user:', user.username);
    return successResponse(res, 200, 'OTP sent to your email — check your inbox');

  } catch (error) {
    console.error('❌ forgotPassword error:', error.message);
    return errorResponse(res, 500, 'Failed to process request', error.message);
  }
};

// Reset password — verify OTP and set new password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return errorResponse(res, 400, 'Email, OTP, and new password are required');
    }

    if (new_password.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters');
    }

    // Find user with OTP data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, reset_otp_hash, reset_otp_expires_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user || !user.reset_otp_hash) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    // Check expiry
    if (new Date() > new Date(user.reset_otp_expires_at)) {
      return errorResponse(res, 400, 'OTP has expired — please request a new one');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.reset_otp_hash);
    if (!isValid) {
      return errorResponse(res, 400, 'Invalid or expired OTP');
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password and clear OTP
    await supabase
      .from('users')
      .update({
        password_hash: newHash,
        reset_otp_hash: null,
        reset_otp_expires_at: null
      })
      .eq('id', user.id);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      username: user.username,
      action: 'password_reset',
      description: `${user.username} reset their password via email OTP`,
    });

    return successResponse(res, 200, 'Password reset successfully — you can now log in');

  } catch (error) {
    return errorResponse(res, 500, 'Password reset failed', error.message);
  }
};

module.exports = { login, logout, getMe, changePassword, forgotPassword, resetPassword };