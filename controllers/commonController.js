const asyncHandler = require('express-async-handler');
const Industry = require('../models/Industry');
const District = require('../models/District');

// @desc    Get all industries
// @route   GET /api/common/industries
// @access  Public
const getIndustries = asyncHandler(async (req, res) => {
  const industries = await Industry.find({}, 'name');
  res.json(industries);
});

// @desc    Get all districts
// @route   GET /api/common/districts
// @access  Public
const getDistricts = asyncHandler(async (req, res) => {
  const districts = await District.find({}, 'districtName state');
  res.json(districts);
});

module.exports = {
  getIndustries,
  getDistricts
};
