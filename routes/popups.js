const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Popup = require('../models/Popup');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'popup-' + uniqueSuffix + ext);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, gif)'), false);
  }
};

// Initialize multer with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('backgroundImage');

// Helper function to convert form data types
const convertPopupData = (body) => {
  const data = { ...body };

  // Convert numeric fields
  if (data.priority !== undefined) {
    const parsed = parseInt(data.priority);
    data.priority = isNaN(parsed) ? 0 : parsed;
  }
  if (data.displayDuration !== undefined) {
    const parsed = parseInt(data.displayDuration);
    data.displayDuration = isNaN(parsed) ? 0 : parsed;
  }
  if (data.delaySeconds !== undefined) {
    const parsed = parseInt(data.delaySeconds);
    data.delaySeconds = isNaN(parsed) ? 0 : parsed;
  }

  // Convert boolean fields
  if (data.enabled !== undefined) data.enabled = data.enabled === 'true';
  if (data.closable !== undefined) data.closable = data.closable === 'true';

  // Convert date fields
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  // Convert dailySchedule
  if (data.dailySchedule) {
    data.dailySchedule = {
      enabled: data.dailySchedule.enabled === 'true' || data.dailySchedule.enabled === 'on',
      startTime: data.dailySchedule.startTime,
      endTime: data.dailySchedule.endTime
    };
  }

  // Convert CTAs
  if (data.ctas && Array.isArray(data.ctas)) {
    data.ctas = data.ctas.map(cta => ({
      text: cta.text,
      url: cta.url,
      primary: cta.primary === 'true'
    }));
  }

  // Convert backgroundImage
  if (data.backgroundImage === undefined || 
      data.backgroundImage === null || 
      (typeof data.backgroundImage === 'object' && Object.keys(data.backgroundImage).length === 0)) {
    // If backgroundImage is undefined, null, or an empty object, set it to empty string
    data.backgroundImage = '';
  } else if (typeof data.backgroundImage === 'string') {
    // If it's a string, trim it
    data.backgroundImage = data.backgroundImage.trim();
  } else if (typeof data.backgroundImage === 'object' && data.backgroundImage.path) {
    // If it's a file object with a path (handled by multer), leave it as is
    // The route handler will process this and set the correct path
  } else {
    // For any other case, set to empty string to be safe
    data.backgroundImage = '';
  }

  return data;
};

// Get all popups with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, enabled, search } = req.query;
    const query = {};

    // Filter by enabled status
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const popups = await Popup.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Popup.countDocuments(query);

    res.json({
      popups,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalItems: count
    });
  } catch (error) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active popups for frontend display
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const query = {
      enabled: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };

    // Filter by daily schedule if enabled
    query.$or = [
      { 'dailySchedule.enabled': false },
      {
        'dailySchedule.enabled': true,
        'dailySchedule.startTime': { $lte: currentTime },
        'dailySchedule.endTime': { $gte: currentTime }
      }
    ];

    const popups = await Popup.find(query)
      .sort({ priority: -1 })
      .exec();

    res.json(popups);
  } catch (error) {
    console.error('Error fetching active popups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single popup by ID
router.get('/:id', async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    if (!popup) {
      return res.status(404).json({ message: 'Popup not found' });
    }
    res.json(popup);
  } catch (error) {
    console.error('Error fetching popup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new popup
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      // First convert the form data
      const popupData = convertPopupData(req.body);

      // Handle background image upload
      if (req.file) {
        // Store the relative path in the database
        popupData.backgroundImage = '/uploads/' + path.basename(req.file.path);
      } else if (req.body.backgroundImage === '') {
        // Explicitly set to empty string if no file was uploaded and it's empty
        popupData.backgroundImage = '';
      }

      const popup = new Popup(popupData);
      await popup.save();
      res.status(201).json(popup);
    } catch (error) {
      console.error('Error creating popup:', error);
      // Clean up uploaded file if there was an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up uploaded file:', unlinkError);
        }
      }
      res.status(400).json({
        message: error.message || 'Error creating popup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// Update a popup
router.put('/:id', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const popup = await Popup.findById(req.params.id);

      if (!popup) {
        // Clean up uploaded file if popup not found
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Popup not found' });
      }

      // First convert the form data
      const popupData = convertPopupData(req.body);

      // Handle background image upload
      if (req.file) {
        // Delete old image if it exists
        if (popup.backgroundImage) {
          const oldImagePath = path.join(__dirname, '..', popup.backgroundImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        popupData.backgroundImage = '/uploads/' + path.basename(req.file.path);
      } else if (req.body.backgroundImage === '') {
        // If background image was explicitly set to empty, delete the old one
        if (popup.backgroundImage) {
          const oldImagePath = path.join(__dirname, '..', popup.backgroundImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        popupData.backgroundImage = '';
      }

      const updatedPopup = await Popup.findByIdAndUpdate(
        req.params.id,
        { $set: popupData },
        { new: true, runValidators: true }
      );

      res.json(updatedPopup);
    } catch (error) {
      console.error('Error updating popup:', error);
      // Clean up uploaded file if there was an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up uploaded file:', unlinkError);
        }
      }
      res.status(400).json({
        message: error.message || 'Error updating popup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// Delete a popup
router.delete('/:id', async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);

    if (!popup) {
      return res.status(404).json({ message: 'Popup not found' });
    }

    // Delete the associated image file if it exists
    if (popup.backgroundImage) {
      const imagePath = path.join(__dirname, '..', popup.backgroundImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Popup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Popup deleted successfully' });
  } catch (error) {
    console.error('Error deleting popup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle popup enabled status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);

    if (!popup) {
      return res.status(404).json({ message: 'Popup not found' });
    }

    popup.enabled = !popup.enabled;
    await popup.save();

    res.json(popup);
  } catch (error) {
    console.error('Error toggling popup status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
