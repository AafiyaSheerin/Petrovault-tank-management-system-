const rateLimit = require('express-rate-limit');

// Strict limiter for login — prevents brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts — please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API limiter — prevents API abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests — please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Export limiter — prevents export spam
const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 exports per minute
  message: {
    success: false,
    message: 'Too many export requests — please wait a minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { loginLimiter, apiLimiter, exportLimiter };