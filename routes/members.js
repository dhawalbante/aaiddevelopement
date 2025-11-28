const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth: protect } = require('../middleware/auth');

const memberController = require('../controllers/memberController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/members');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Public routes
router.get('/public', memberController.getPublicMembers);

// Protected routes (require authentication)
router.route('/')
  .get(protect, memberController.getMembers)
  .post(protect, upload.single('profileImage'), memberController.createMember);

router.route('/:id')
  .get(protect, memberController.getMemberById)
  .put(protect, upload.single('profileImage'), memberController.updateMember)
  .delete(protect, memberController.deleteMember);

router.put('/:id/priority', protect, memberController.updateMemberPriority);

module.exports = router;
