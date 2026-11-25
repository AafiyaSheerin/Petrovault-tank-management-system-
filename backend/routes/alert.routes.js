const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  getUnreadCount,
  markAsRead,
  markAllRead,
  getRecipients,
  addRecipient,
  updateRecipient,
  deleteRecipient,
  getAlertToggle,
  setAlertToggle,
} = require('../controllers/alert.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.use(protect);

// Alerts — all logged in users
router.get('/', getAllAlerts);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllRead);
router.put('/:id/read', markAsRead);

// Global email alert toggle — admin only
router.get('/settings/toggle', requireAdmin, getAlertToggle);
router.put('/settings/toggle', requireAdmin, setAlertToggle);

// Recipients — admin only
router.get('/recipients', requireAdmin, getRecipients);
router.post('/recipients', requireAdmin, addRecipient);
router.put('/recipients/:id', requireAdmin, updateRecipient);
router.delete('/recipients/:id', requireAdmin, deleteRecipient);

module.exports = router;