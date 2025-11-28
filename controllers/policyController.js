const Policy = require('../models/Policy');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'policies');
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

// Configure multer middleware
const fileFilter = function (req, file, cb) {
  const allowedTypes = /pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only .pdf, .doc, .docx, and .txt files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter
});

// Create new policy
const createPolicy = async (req, res) => {
  try {
    let policyData = { ...req.body };

    // Handle file upload if present
    if (req.file) {
      policyData.fileURL = `/uploads/policies/${req.file.filename}`;
      policyData.fileSize = req.file.size;
    }

    // Add createdBy field if user is authenticated
    if (req.user) {
      policyData.createdBy = req.user._id;
    }

    const policy = new Policy(policyData);
    await policy.save();

    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);

    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '..', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(400).json({
      message: error.message || 'Error creating policy',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all policies
const getAllPolicies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (status) {
      query.status = status;
    }

    const policies = await Policy.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Policy.countDocuments(query);

    res.json({
      policies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get policy by ID
const getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id).populate('createdBy', 'name email');
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }
    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update policy
const updatePolicy = async (req, res) => {
  try {
    let updateData = { ...req.body };

    // Handle file upload if present
    if (req.file) {
      updateData.fileURL = `/uploads/policies/${req.file.filename}`;
      updateData.fileSize = req.file.size;

      // Delete old file if it exists
      const oldPolicy = await Policy.findById(req.params.id);
      if (oldPolicy && oldPolicy.fileURL) {
        const oldFilePath = path.join(__dirname, '..', oldPolicy.fileURL);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    const updatedPolicy = await Policy.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!updatedPolicy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error updating policy:', error);

    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '..', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(400).json({
      message: 'Error updating policy',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete policy
const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    // Delete associated file if it exists
    if (policy.documentFile) {
      const filePath = path.join(__dirname, '..', policy.documentFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Policy.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get published policies for public view with search and filter
const getPublishedPolicies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const query = { status: 'Published' };

    if (search) {
      query.$text = { $search: search };
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const policies = await Policy.find(query)
      .populate('createdBy', 'name')
      .sort({ publishedOn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Policy.countDocuments(query);

    res.json({
      policies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching published policies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  getPublishedPolicies,
  upload
};
