const express = require('express');
const router = express.Router();
const {
  exportTanksPDF,
  exportTanksSheets,
  exportHistoryPDF,
  exportHistorySheets,
  exportSingleTankPDF,
  exportSingleTankSheets
} = require('../controllers/export.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/tankAccess.middleware');
const { exportLimiter } = require('../middleware/rateLimit.middleware');

router.use(protect);
router.use(checkPermission('can_export'));
router.use(exportLimiter);

// All tanks
router.get('/pdf/tanks', exportTanksPDF);
router.get('/pdf/history', exportHistoryPDF);
router.post('/sheets/tanks', exportTanksSheets);
router.post('/sheets/history', exportHistorySheets);

// Single tank
router.get('/pdf/tank/:id', exportSingleTankPDF);
router.post('/sheets/tank/:id', exportSingleTankSheets);

module.exports = router;