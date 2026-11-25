const express = require('express');
const router = express.Router();
const { convert, convertToAll, getUnits, getOilDensities } = require('../controllers/converter.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/convert', convert);
router.post('/convert-all', convertToAll);
router.get('/units', getUnits);
router.get('/densities', getOilDensities);

module.exports = router;