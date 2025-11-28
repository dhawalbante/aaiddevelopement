const express = require('express');
const router = express.Router();
const {
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  getPublishedPolicies,
  upload
} = require('../controllers/policyController');

// Middleware for authentication (assuming you have auth middleware)
const admin = require('../middleware/admin');

// Public routes
router.get('/published', getPublishedPolicies);
router.get('/:id', getPolicyById);

// Admin routes (protected)
router.post('/', admin, upload.single('documentFile'), createPolicy);
router.get('/', admin, getAllPolicies);
router.put('/:id', admin, upload.single('documentFile'), updatePolicy);
router.delete('/:id', admin, deletePolicy);

module.exports = router;
