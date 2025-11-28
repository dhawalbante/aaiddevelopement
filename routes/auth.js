// In server/routes/auth.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../models/User');
const Company = require('../models/Company');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
});

router.post('/register', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  console.log('Registration request received:', {
    body: req.body,
    files: req.files ? Object.keys(req.files) : 'No files',
    headers: req.headers
  });
  try {
    const { 
      companyName, 
      directorCeo, 
      contactName,
      industry, 
      email, 
      phone, 
      website, 
      password, 
      password2 
    } = req.body;
    
    // Use contactName if provided, otherwise fall back to directorCeo
    const contactPerson = contactName || directorCeo;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }

    // Check if passwords match
    if (password !== password2) {
      return res.status(400).json({ errors: [{ msg: 'Passwords do not match' }] });
    }

    // Handle file uploads
    const logoPath = req.files['logo'] ? req.files['logo'][0].path : '';
    const bannerPath = req.files['banner'] ? req.files['banner'][0].path : '';

    // 1. Create new user
    user = new User({
      email,
      password,
      role: 'company',
      name: companyName,
      phone
    });

    await user.save();

    // 2. Create company profile
    const company = new Company({
      user: user._id,
      companyName,
      directorCeo: contactPerson,
      industry,
      email,
      phone,
      website,
      logo: logoPath,
      banner: bannerPath
    });

    await company.save();

    // 3. Update user with company reference
    user.company = company._id;
    await user.save();

    // 4. Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company: user.company
          }
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    // Clean up uploaded files if there was an error
    try {
      if (req.files) {
        for (const fileArray of Object.values(req.files)) {
          for (const file of fileArray) {
            try {
              if (file && file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
                console.log(`Cleaned up file: ${file.path}`);
              }
            } catch (fileError) {
              console.error('Error cleaning up file:', fileError);
            }
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error during file cleanup:', cleanupError);
    }
    
    // Determine error message
    let errorMessage = 'Server error during registration';
    if (error.errors) {
      errorMessage = Object.values(error.errors).map(e => e.message).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  console.log('Login request received:', { body: req.body });
  
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      errors: [{ 
        msg: 'Please provide both email and password',
        field: !email ? 'email' : 'password'
      }] 
    });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ 
        success: false,
        errors: [{ msg: 'Invalid email or password' }] 
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        errors: [{ msg: 'Invalid email or password' }] 
      });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company: user.company
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if no token
    if (!token) {
      return res.status(401).json({ 
        success: false,
        errors: [{ msg: 'No token, authorization denied' }] 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from the token
    const user = await User.findById(decoded.user.id)
      .select('-password')
      .populate('company');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        errors: [{ msg: 'User not found' }] 
      });
    }

    res.json({ 
      success: true,
      user 
    });
  } catch (err) {
    console.error('Error in /me route:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        errors: [{ msg: 'Token is not valid' }] 
      });
    }
    res.status(500).json({ 
      success: false,
      errors: [{ msg: 'Server Error' }] 
    });
  }
});

module.exports = router;