const express = require('express');
const router = express.Router();
const ContactForm = require('../models/ContactForm');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST api/contact/submit
// @desc    Submit contact form
// @access  Public
router.post('/submit', [
  body('fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { fullName, email, phone, message } = req.body;

    // Sanitize inputs (basic sanitization)
    const sanitizedFullName = fullName.replace(/[<>\"']/g, '');
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedPhone = phone ? phone.replace(/[^\d+\-\s()]/g, '') : '';
    const sanitizedMessage = message.replace(/[<>\"']/g, '');

    // Create new contact form submission
    const contactForm = new ContactForm({
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      message: sanitizedMessage
    });

    await contactForm.save();

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET api/contact
// @desc    Get all contact form submissions (admin only)
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Search
    const search = req.query.search || '';
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Get total count for pagination
    const total = await ContactForm.countDocuments(searchQuery);
    
    // Get paginated and sorted results
    const submissions = await ContactForm.find(searchQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// @route   GET api/contact/admin/submissions
// @desc    Get all contact form submissions for admin
// @access  Private (Admin only)
router.get('/admin/submissions', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search ? {
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const total = await ContactForm.countDocuments(searchQuery);

    // Get submissions with pagination, search, and sorting
    const submissions = await ContactForm.find(searchQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    res.json({
      success: true,
      data: submissions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

module.exports = router;
