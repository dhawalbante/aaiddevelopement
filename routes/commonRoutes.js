const express = require('express');
const { getIndustries, getDistricts } = require('../controllers/commonController');

const router = express.Router();

// Public routes
router.get('/industries', getIndustries);
router.get('/districts', getDistricts);

module.exports = router;
