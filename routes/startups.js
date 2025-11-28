const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const expressvalidator = require('express-validator');
const fs = require('fs');
const Startup = require('../models/Startup');
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/startups';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only images (JPEG, JPG, PNG) and PDFs are allowed!');
    }
  }
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'pitchDeck', maxCount: 1 }
]);

// @route   POST api/startups/register
// @desc    Register a new startup
// @access  Public
router.post('/register', (req, res) => {
  // Handle file upload
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ errors: [{ msg: err }] });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => {
            fs.unlink(file.path, () => {});
          });
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startupName,
      founderName,
      description,
      industry,
      stage,
      email,
      phone,
      website,
      foundedYear,
      teamSize,
      fundingStage,
      password,
      password2
    } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Check if passwords match
      if (password !== password2) {
        return res.status(400).json({ errors: [{ msg: 'Passwords do not match' }] });
      }

      // Create new user
      user = new User({
        name: founderName,
        email,
        password,
        role: 'startup'
      });

      // Save user
      await user.save();

      // Create startup profile
      const startupFields = {
        user: user._id,
        startupName,
        founderName,
        description,
        industry,
        stage,
        email,
        phone,
        website: website || '',
        teamSize: teamSize || '',
        fundingStage: fundingStage || '',
      };

      // Add file paths if files were uploaded
      if (req.files) {
        if (req.files['logo']) {
          startupFields.logo = req.files['logo'][0].path;
        }
        if (req.files['pitchDeck']) {
          startupFields.pitchDeck = req.files['pitchDeck'][0].path;
        }
      }

      // Add optional fields if they exist
      if (foundedYear) startupFields.foundedYear = foundedYear;

      const startup = new Startup(startupFields);
      await startup.save();

      // Generate JWT
      const token = user.getSignedJwtToken();

      res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
});

// @route   GET api/startups/me
// @desc    Get current user's startup profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const startup = await Startup.findOne({ user: req.user.id })
      .select('-__v')
      .populate('user', ['name', 'email']);

    if (!startup) {
      return res.status(400).json({ msg: 'There is no startup profile for this user' });
    }

    res.json(startup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/startups/me
// @desc    Update startup profile
// @access  Private
router.put('/me', [auth, upload], async (req, res) => {
  const {
    startupName,
    founderName,
    description,
    industry,
    stage,
    phone,
    website,
    foundedYear,
    teamSize,
    fundingStage,
  } = req.body;

  // Build profile object
  const profileFields = {};
  if (startupName) profileFields.startupName = startupName;
  if (founderName) profileFields.founderName = founderName;
  if (description) profileFields.description = description;
  if (industry) profileFields.industry = industry;
  if (stage) profileFields.stage = stage;
  if (phone) profileFields.phone = phone;
  if (website) profileFields.website = website;
  if (foundedYear) profileFields.foundedYear = foundedYear;
  if (teamSize) profileFields.teamSize = teamSize;
  if (fundingStage) profileFields.fundingStage = fundingStage;

  try {
    let startup = await Startup.findOne({ user: req.user.id });

    if (!startup) {
      return res.status(404).json({ msg: 'Startup profile not found' });
    }

    // Update files if new ones are uploaded
    if (req.files) {
      if (req.files['logo']) {
        // Delete old logo if exists
        if (startup.logo && fs.existsSync(startup.logo)) {
          fs.unlinkSync(startup.logo);
        }
        profileFields.logo = req.files['logo'][0].path;
      }
      if (req.files['pitchDeck']) {
        // Delete old pitch deck if exists
        if (startup.pitchDeck && fs.existsSync(startup.pitchDeck)) {
          fs.unlinkSync(startup.pitchDeck);
        }
        profileFields.pitchDeck = req.files['pitchDeck'][0].path;
      }
    }

    // Update profile
    startup = await Startup.findOneAndUpdate(
      { user: req.user.id },
      { $set: profileFields },
      { new: true }
    );

    res.json(startup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/startups
// @desc    Get all startups
// @access  Public
router.get('/', async (req, res) => {
  try {
    const startups = await Startup.find({ isVerified: true, isActive: true })
      .select('-__v')
      .sort({ createdAt: -1 });
    res.json(startups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/startups/:id
// @desc    Get startup by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id)
      .select('-__v')
      .populate('user', ['name', 'email']);

    if (!startup) {
      return res.status(404).json({ msg: 'Startup not found' });
    }

    res.json(startup);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Startup not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/startups/me
// @desc    Delete startup profile and user
// @access  Private
router.delete('/me', auth, async (req, res) => {
  try {
    // Remove startup profile
    const startup = await Startup.findOneAndRemove({ user: req.user.id });
    
    if (!startup) {
      return res.status(404).json({ msg: 'Startup profile not found' });
    }

    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });

    // Remove files
    if (startup.logo && fs.existsSync(startup.logo)) {
      fs.unlinkSync(startup.logo);
    }
    if (startup.pitchDeck && fs.existsSync(startup.pitchDeck)) {
      fs.unlinkSync(startup.pitchDeck);
    }

    res.json({ msg: 'Startup profile and user removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/startups/verify/:id
// @desc    Verify a startup
// @access  Private/Admin
router.put('/verify/:id', [auth], async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return res.status(404).json({ msg: 'Startup not found' });
    }

    startup.isVerified = true;
    await startup.save();

    res.json(startup);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Startup not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
