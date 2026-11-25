const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Route imports
const authRoutes = require('./routes/auth.routes');
const tankRoutes = require('./routes/tank.routes');
const productRoutes = require('./routes/product.routes');
const employeeRoutes = require('./routes/employee.routes');
const alertRoutes = require('./routes/alert.routes');
const converterRoutes = require('./routes/converter.routes');
const reportRoutes = require('./routes/report.routes');
const exportRoutes = require('./routes/export.routes');
const logRoutes = require('./routes/log.routes');

// Middleware imports
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8082',
    'http://localhost:8082',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parser ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logger ───────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Rate Limiting ────────────────────────────────────
app.use('/api/v1', apiLimiter);

// ─── Health Check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🛢️ PetroVault API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ─── API Routes ───────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tanks', tankRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/converter', converterRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/logs', logRoutes);

// ─── 404 Handler ──────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🛢️  ================================');
  console.log('🛢️   PetroVault API Server');
  console.log('🛢️  ================================');
  console.log(`✅  Server running on port ${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗  Health: http://localhost:${PORT}/health`);
  console.log('🛢️  ================================');
  console.log('');
});

module.exports = app;