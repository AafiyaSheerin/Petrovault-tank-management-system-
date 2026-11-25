const express = require('express');
const router = express.Router();
const {
  getFullReport,
  getHistoryReport,
  getDailyReport,
  getProductReport
} = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/full', getFullReport);
router.get('/history', getHistoryReport);
router.get('/daily', getDailyReport);
router.get('/product', getProductReport);

module.exports = router;
