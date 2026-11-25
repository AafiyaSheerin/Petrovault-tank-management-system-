const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updatePermissions,
  grantTankAccess,
  revokeTankAccess,
  grantAllTanksAccess,
  resetPassword
} = require('../controllers/employee.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

// All employee routes — admin only
router.use(protect, requireAdmin);

router.get('/', getAllEmployees);
router.get('/:id', getEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

// Permissions
router.put('/:id/permissions', updatePermissions);

// Tank access
router.post('/:id/tank-access', grantTankAccess);
router.delete('/:id/tank-access/:tank_id', revokeTankAccess);
router.post('/:id/grant-all-tanks', grantAllTanksAccess);

// Password reset
router.put('/:id/reset-password', resetPassword);

module.exports = router;