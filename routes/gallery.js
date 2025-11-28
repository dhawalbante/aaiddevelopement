const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const galleryController = require('../controllers/galleryController');

// Public routes
router.get('/active', galleryController.getActiveGalleryImages);
router.get('/:id', galleryController.getGalleryImage);

// Protected admin routes
router.use(auth);
router.use(admin);
router.get('/', galleryController.getGalleryImages);
router.post('/', galleryController.createGalleryImage);
router.put('/:id', galleryController.updateGalleryImage);
router.delete('/:id', galleryController.deleteGalleryImage);
router.patch('/:id/status', galleryController.toggleGalleryImageStatus);

module.exports = router;
