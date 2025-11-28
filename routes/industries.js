const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Industry = require('../models/Industry');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/industries';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for larger files
  fileFilter: function (req, file, cb) {
    let filetypes;
    let errorMessage;

    // Define allowed file types based on field name
    switch (file.fieldname) {
      case 'logo':
      case 'coverImage':
      case 'gallery':
      case 'leadershipPhotos':
      case 'mediaCoverageImages':
        filetypes = /jpeg|jpg|png|gif|webp/;
        errorMessage = 'Only image files are allowed for this field!';
        break;
      case 'pressReleasesPdfs':
      case 'governmentPapersFiles':
        filetypes = /pdf|doc|docx/;
        errorMessage = 'Only PDF and document files are allowed for this field!';
        break;
      default:
        filetypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
        errorMessage = 'Unsupported file type!';
    }

    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(errorMessage));
    }
  }
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'leadershipPhotos', maxCount: 10 }, // For leadership photos
  { name: 'pressReleasesPdfs', maxCount: 20 }, // For press release PDFs
  { name: 'mediaCoverageImages', maxCount: 20 }, // For media coverage images
  { name: 'governmentPapersFiles', maxCount: 20 } // For government papers PDFs/docs
]);

// Middleware to handle file uploads
const handleFileUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Get all industries with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;
    const query = {};
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    const industries = await Industry.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const count = await Industry.countDocuments(query);
    
    res.json({
      industries,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single industry by ID
router.get('/:id', async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id);
    if (!industry) {
      return res.status(404).json({ message: 'Industry not found' });
    }
    res.json(industry);
  } catch (error) {
    console.error('Error fetching industry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new industry
router.post('/', handleFileUpload, async (req, res) => {
  try {
    let data = { ...req.body };

    // Handle file paths
    if (req.files) {
      if (req.files['logo']) {
        data.logo = req.files['logo'][0].path.replace(/\\/g, '/');
      }
      if (req.files['coverImage']) {
        data.coverImage = req.files['coverImage'][0].path.replace(/\\/g, '/');
      }
      if (req.files['gallery']) {
        data.gallery = req.files['gallery'].map(file => file.path.replace(/\\/g, '/'));
      }
    }

    // Parse stringified fields
    const fieldsToParse = ['leadership', 'pressReleases', 'mediaCoverage', 'governmentPapers'];
    fieldsToParse.forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          console.error(`Error parsing ${field}:`, e);
        }
      }
    });

    // Handle new file uploads
    if (req.files) {
      // Handle leadership photos
      if (req.files['leadershipPhotos'] && data.leadership) {
        const leadershipPhotos = req.files['leadershipPhotos'];
        data.leadership = data.leadership.map((leader, index) => ({
          ...leader,
          photo: leadershipPhotos[index] ? leadershipPhotos[index].path.replace(/\\/g, '/') : leader.photo
        }));
      }

      // Handle press release PDFs
      if (req.files['pressReleasesPdfs'] && data.pressReleases) {
        const pressReleasePdfs = req.files['pressReleasesPdfs'];
        data.pressReleases = data.pressReleases.map((release, index) => ({
          ...release,
          pdf: pressReleasePdfs[index] ? pressReleasePdfs[index].path.replace(/\\/g, '/') : release.pdf
        }));
      }

      // Handle media coverage images
      if (req.files['mediaCoverageImages'] && data.mediaCoverage) {
        const mediaCoverageImages = req.files['mediaCoverageImages'];
        data.mediaCoverage = data.mediaCoverage.map((coverage, index) => ({
          ...coverage,
          image: mediaCoverageImages[index] ? mediaCoverageImages[index].path.replace(/\\/g, '/') : coverage.image
        }));
      }

      // Handle government papers files
      if (req.files['governmentPapersFiles'] && data.governmentPapers) {
        const governmentPapersFiles = req.files['governmentPapersFiles'];
        data.governmentPapers = data.governmentPapers.map((paper, index) => ({
          ...paper,
          pdf: governmentPapersFiles[index] ? governmentPapersFiles[index].path.replace(/\\/g, '/') : paper.pdf
        }));
      }
    }

    // Validate required fields
    const requiredFields = ['name', 'description', 'overview'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        const files = [];
        if (req.files['logo']) files.push(req.files['logo'][0].path);
        if (req.files['coverImage']) files.push(req.files['coverImage'][0].path);
        if (req.files['gallery']) {
          req.files['gallery'].forEach(file => files.push(file.path));
        }
        
        files.forEach(file => {
          fs.unlink(file, err => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      }
      
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const industry = new Industry(data);
    await industry.save();
    
    res.status(201).json(industry);
  } catch (error) {
    console.error('Error creating industry:', error);
    
    // Clean up uploaded files if there was an error
    if (req.files) {
      const files = [];
      if (req.files['logo']) files.push(req.files['logo'][0].path);
      if (req.files['coverImage']) files.push(req.files['coverImage'][0].path);
      if (req.files['gallery']) {
        req.files['gallery'].forEach(file => files.push(file.path));
      }
      
      files.forEach(file => {
        fs.unlink(file, err => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    
    res.status(400).json({ 
      message: error.message || 'Error creating industry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update an industry
router.put('/:id', handleFileUpload, async (req, res) => {
  try {
    let data = { ...req.body };
    const industry = await Industry.findById(req.params.id);
    
    if (!industry) {
      return res.status(404).json({ message: 'Industry not found' });
    }
    
    // Handle file uploads
    if (req.files) {
      // Delete old files if new ones are uploaded
      const oldFiles = [];
      
      if (req.files['logo']) {
        if (industry.logo) oldFiles.push(industry.logo);
        data.logo = req.files['logo'][0].path.replace(/\\/g, '/');
      }
      
      if (req.files['coverImage']) {
        if (industry.coverImage) oldFiles.push(industry.coverImage);
        data.coverImage = req.files['coverImage'][0].path.replace(/\\/g, '/');
      }
      
      if (req.files['gallery']) {
        // Add old gallery images to be deleted if they're not in the new gallery
        const newGallery = req.files['gallery'].map(file => file.path.replace(/\\/g, '/'));
        if (industry.gallery && industry.gallery.length > 0) {
          industry.gallery.forEach(img => {
            if (!newGallery.includes(img)) {
              oldFiles.push(img);
            }
          });
        }
        data.gallery = newGallery;
      }
      
      // Delete old files
      oldFiles.forEach(file => {
        fs.unlink(file, err => {
          if (err) console.error('Error deleting old file:', err);
        });
      });
    }
    
    // Parse nested objects and arrays
    const fieldsToParse = ['leadership', 'pressReleases', 'mediaCoverage', 'governmentPapers'];
    fieldsToParse.forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          console.error(`Error parsing ${field}:`, e);
        }
      }
    });

    // Handle new file uploads for update
    if (req.files) {
      // Handle leadership photos
      if (req.files['leadershipPhotos'] && data.leadership) {
        const leadershipPhotos = req.files['leadershipPhotos'];
        data.leadership = data.leadership.map((leader, index) => ({
          ...leader,
          photo: leadershipPhotos[index] ? leadershipPhotos[index].path.replace(/\\/g, '/') : leader.photo
        }));
      }

      // Handle press release PDFs
      if (req.files['pressReleasesPdfs'] && data.pressReleases) {
        const pressReleasePdfs = req.files['pressReleasesPdfs'];
        data.pressReleases = data.pressReleases.map((release, index) => ({
          ...release,
          pdf: pressReleasePdfs[index] ? pressReleasePdfs[index].path.replace(/\\/g, '/') : release.pdf
        }));
      }

      // Handle media coverage images
      if (req.files['mediaCoverageImages'] && data.mediaCoverage) {
        const mediaCoverageImages = req.files['mediaCoverageImages'];
        data.mediaCoverage = data.mediaCoverage.map((coverage, index) => ({
          ...coverage,
          image: mediaCoverageImages[index] ? mediaCoverageImages[index].path.replace(/\\/g, '/') : coverage.image
        }));
      }

      // Handle government papers files
      if (req.files['governmentPapersFiles'] && data.governmentPapers) {
        const governmentPapersFiles = req.files['governmentPapersFiles'];
        data.governmentPapers = data.governmentPapers.map((paper, index) => ({
          ...paper,
          pdf: governmentPapersFiles[index] ? governmentPapersFiles[index].path.replace(/\\/g, '/') : paper.pdf
        }));
      }
    }
    
    // Update industry
    const updatedIndustry = await Industry.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    );
    
    res.json(updatedIndustry);
  } catch (error) {
    console.error('Error updating industry:', error);
    
    // Clean up uploaded files if there was an error
    if (req.files) {
      const files = [];
      if (req.files['logo']) files.push(req.files['logo'][0].path);
      if (req.files['coverImage']) files.push(req.files['coverImage'][0].path);
      if (req.files['gallery']) {
        req.files['gallery'].forEach(file => files.push(file.path));
      }
      
      files.forEach(file => {
        fs.unlink(file, err => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    
    res.status(400).json({ 
      message: 'Error updating industry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete an industry
router.delete('/:id', async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id);
    
    if (!industry) {
      return res.status(404).json({ message: 'Industry not found' });
    }
    
    // Delete associated files
    const filesToDelete = [];
    if (industry.logo) filesToDelete.push(industry.logo);
    if (industry.coverImage) filesToDelete.push(industry.coverImage);
    if (industry.gallery && industry.gallery.length > 0) {
      filesToDelete.push(...industry.gallery);
    }
    
    // Delete the industry
    await Industry.findByIdAndDelete(req.params.id);
    
    // Delete the files
    filesToDelete.forEach(file => {
      fs.unlink(file, err => {
        if (err) console.error('Error deleting file:', err);
      });
    });
    
    res.json({ message: 'Industry deleted successfully' });
  } catch (error) {
    console.error('Error deleting industry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get industry categories and subcategories
router.get('/metadata/categories', (req, res) => {
  const categories = {
    'Core & Traditional': [
      'Agriculture & Allied Industries',
      'Food Processing & Agro-based Industries',
      'Dairy & Animal Husbandry',
      'Bamboo & Forest-based Industries',
      'Minerals & Mining',
      'Energy & Renewable Energy',
      'Steel & Allied Industries / PEB',
      'Logistics & Warehousing'
    ],
    'Emerging & Strategic': [
      'IT & ITES',
      'Healthcare & Pharmaceuticals',
      'Automobile & EV Components',
      'Defence & Aerospace',
      'Plastics, Printing & Packaging',
      'Startups & Innovation'
    ],
    'Support & Allied': [
      'Textiles & Readymade Garments',
      'Furniture & Handicrafts',
      'Paper & Allied Industries',
      'Real Estate & Infrastructure',
      'Tourism & Hospitality',
      'Retail, Food & Beverage, Entertainment',
      'Education & Skill Development',
      'AgriTech & Smart Farming',
      'Bioenergy & Waste Management'
    ]
  };
  
  res.json(categories);
});

module.exports = router;
