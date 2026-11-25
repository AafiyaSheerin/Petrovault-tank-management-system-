const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  // Supabase errors
  if (err.code === 'PGRST116') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token — please login again'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired — please login again'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Default server error
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;