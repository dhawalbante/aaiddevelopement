const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Company = require('../models/Company');
const Industry = require('../models/Industry');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]);

// Create new company
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading files'
      });
    }

    try {
      const companyData = req.body;
      
      console.log('Received company data:', companyData);
      
      // Validate required fields
      if (!companyData.companyName || !companyData.contactName || !companyData.email || !companyData.phone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: companyName, contactName, email, and phone are required' 
        });
      }

      // Handle file paths if files were uploaded
      if (req.files) {
        if (req.files.logo) {
          companyData.logo = '/uploads/' + req.files.logo[0].filename;
        }
        if (req.files.banner) {
          companyData.banner = '/uploads/' + req.files.banner[0].filename;
        }
      }

      const newCompany = new Company(companyData);
      const savedCompany = await newCompany.save();
      
      console.log('Company saved successfully:', savedCompany._id);
      
      res.status(201).json({
        success: true,
        message: 'Company registered successfully',
        data: savedCompany
      });
    } catch (error) {
      console.error('Error saving company:', error);
      res.status(500).json({
        success: false,
        message: 'Error saving company',
        error: error.message
      });
    }
  });
});

// Get all companies or filter by industry
router.get('/', async (req, res) => {
  try {
    const { industry } = req.query;
    let query = {};

    if (industry) {
      query.industry = { $regex: new RegExp(industry, 'i') }; // Case-insensitive match
    }

    const companies = await Company.find(query).sort({ companyName: 1 }); // Sort alphabetically A-Z
    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
});

// Get all industries
router.get('/industries', async (req, res) => {
  try {
    const industries = await Industry.find({}, 'name -_id');
    res.json(industries.map(i => i.name));
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ message: 'Error fetching industries' });
  }
});

module.exports = router;