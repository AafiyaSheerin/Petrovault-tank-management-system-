const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');
const {
  getProductThresholds,
  upsertProductThreshold,
  deleteProductThreshold,
} = require('../controllers/productAlert.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.use(protect);

// All logged in users can view products
router.get('/', getAllProducts);

// Product alert thresholds — admin only (before /:id so it doesn't conflict)
router.get('/alert-thresholds', requireAdmin, getProductThresholds);
router.put('/:id/alert-threshold', requireAdmin, upsertProductThreshold);
router.delete('/:id/alert-threshold', requireAdmin, deleteProductThreshold);

router.get('/:id', getProduct);

// Admin only
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);

module.exports = router;