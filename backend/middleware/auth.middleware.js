const { verifyToken } = require('../utils/generateToken');
const { errorResponse } = require('../utils/formatResponse');
const supabase = require('../db/supabaseClient');

const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'No token provided — please login');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, 401, 'Invalid or expired token — please login again');
    }

    // Check if user still exists and is active in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return errorResponse(res, 401, 'User no longer exists — please login again');
    }

    if (!user.is_active) {
      return errorResponse(res, 403, 'Your account has been deactivated — contact admin');
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    return errorResponse(res, 500, 'Authentication error', error.message);
  }
};

module.exports = { protect };