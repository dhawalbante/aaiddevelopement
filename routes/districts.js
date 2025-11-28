const express = require('express');
const District = require('../models/District');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for awards photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'awardsPhotos');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, baseName + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG files are allowed.'));
    }
  }
});

// Create new district with awards photos upload
router.post('/', upload.array('awardsPhotos', 10), async (req, res) => {
  try {
    const districtData = JSON.parse(req.body.districtData);
    if (!districtData.districtName) {
      return res.status(400).json({ success: false, message: 'districtName is required' });
    }

    if (req.files && req.files.length > 0) {
      districtData.awardsPhotos = req.files.map(file => `/uploads/awardsPhotos/${file.filename}`);
    }

    const newDistrict = new District(districtData);
    const savedDistrict = await newDistrict.save();
    res.status(201).json({ success: true, message: 'District created successfully', data: savedDistrict });
  } catch (error) {
    console.error('Error saving district:', error);
    res.status(500).json({ success: false, message: 'Error saving district data', error: error.message });
  }
});

// Get all districts
router.get('/', async (req, res) => {
  try {
    const districts = await District.find().sort({ createdAt: -1 });
    res.json({ success: true, count: districts.length, data: districts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching districts', error: error.message });
  }
});

// Get district by name
router.get('/:districtName', async (req, res) => {
  try {
    const district = await District.findOne({ districtName: new RegExp('^' + req.params.districtName + '$', 'i') });
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({ success: true, data: district });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching district', error: error.message });
  }
});

// Update district by id with awards photos upload
router.put('/:id', upload.array('awardsPhotos', 10), async (req, res) => {
  try {
    let districtData = {};
    if (req.body.districtData) {
      districtData = JSON.parse(req.body.districtData);
    }

    if (req.files && req.files.length > 0) {
      districtData.awardsPhotos = districtData.awardsPhotos || [];
      // Append new photos
      const newPhotos = req.files.map(file => `/uploads/awardsPhotos/${file.filename}`);
      districtData.awardsPhotos = districtData.awardsPhotos.concat(newPhotos);
    }

    const updatedDistrict = await District.findByIdAndUpdate(req.params.id, districtData, { new: true });

    if (!updatedDistrict) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({ success: true, message: 'District updated successfully', data: updatedDistrict });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating district', error: error.message });
  }
});

// Delete district by id
router.delete('/:id', async (req, res) => {
  try {
    const deletedDistrict = await District.findByIdAndDelete(req.params.id);
    if (!deletedDistrict) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({ success: true, message: 'District deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting district', error: error.message });
  }
});

module.exports = router;
