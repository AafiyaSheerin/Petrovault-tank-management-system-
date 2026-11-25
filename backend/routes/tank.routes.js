const express = require('express');
const router = express.Router();
const {
  getAllTanks,
  getTank,
  createTank,
  updateTank,
  deleteTank,
  addStock,
  removeStock,
  convertCmToLitres,
  copyTank,
} = require('../controllers/tank.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { checkTankAccess, checkPermission } = require('../middleware/tankAccess.middleware');

// All routes require login
router.use(protect);

// View tanks
router.get('/', getAllTanks);
router.get('/:id', checkTankAccess, getTank);

// CM → Litres conversion (no stock change)
router.post('/:id/cm-to-litres', checkTankAccess, convertCmToLitres);

// Add/Remove stock — editor or admin only (accepts dip_cm or volume)
router.post('/:id/add-stock', checkTankAccess, checkPermission('can_add_stock'), addStock);
router.post('/:id/remove-stock', checkTankAccess, checkPermission('can_add_stock'), removeStock);

// Tank management — admin only
router.post('/', requireAdmin, createTank);
router.post('/:id/copy', requireAdmin, copyTank);
router.put('/:id', requireAdmin, updateTank);
router.delete('/:id', requireAdmin, deleteTank);

module.exports = router;