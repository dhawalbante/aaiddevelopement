const express = require('express');
const path = require('path');
const fs = require('fs');
const { auth: protect } = require('../middleware/auth');

const memberController = require('../controllers/memberController');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/members');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes
router.get('/public', memberController.getPublicMembers);

// Protected routes (require authentication)
router.route('/')
  .get(protect, memberController.getMembers)
  .post(protect, memberController.createMember);

router.route('/:id')
  .get(protect, memberController.getMemberById)
  .put(protect, memberController.updateMember)
  .delete(protect, memberController.deleteMember);

router.put('/:id/priority', protect, memberController.updateMemberPriority);

module.exports = router;
