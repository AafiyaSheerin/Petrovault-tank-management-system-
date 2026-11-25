const express = require('express');
const router = express.Router();
const { login, logout, getMe, changePassword, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimit.middleware');

// Rate limiter for password reset (max 5 per 15 min)
const rateLimit = require('express-rate-limit');
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many reset attempts — please try again after 15 minutes' }
});

// Public routes
router.post('/login', loginLimiter, login);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;