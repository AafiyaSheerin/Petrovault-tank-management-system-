const express = require('express');
const router = express.Router();
const {
  getAllLogs,
  getTankLogs,
  getUserLogs,
  getLogStats,
  clearLogs
} = require('../controllers/log.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/role.middleware');

// View routes — accessible to admins and employees with can_view_logs permission
router.get('/', protect, requirePermission('can_view_logs'), getAllLogs);
router.get('/stats', protect, requirePermission('can_view_logs'), getLogStats);
router.get('/tank/:id', protect, requirePermission('can_view_logs'), getTankLogs);
router.get('/user/:id', protect, requirePermission('can_view_logs'), getUserLogs);

// Delete route — admin only
router.delete('/clear', protect, requireAdmin, clearLogs);

module.exports = router;