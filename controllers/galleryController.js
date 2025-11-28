const Gallery = require('../models/Gallery');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to save file to local storage
const saveFile = (file, filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(uploadDir, filename);
    
    // Use the mv() method to place the file in the uploads directory
    file.mv(filePath, (err) => {
      if (err) {
        console.error('Error saving file:', err);
        return reject(err);
      }
      resolve(`/uploads/gallery/${filename}`);
    });
  });
};

// Helper function to delete file from local storage
const deleteFile = (filePath) => {
  if (!filePath) return Promise.resolve();
  const fullPath = path.join(__dirname, '..', filePath);
  return new Promise((resolve, reject) => {
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
};

// @desc    Get all gallery images
// @route   GET /api/gallery
// @access  Private/Admin
exports.getGalleryImages = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const images = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Gallery.countDocuments(query);

    res.json({
      images,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error getting gallery images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active gallery images
// @route   GET /api/gallery/active
// @access  Public
exports.getActiveGalleryImages = async (req, res) => {
  try {
    const images = await Gallery.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error('Error getting active gallery images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single gallery image
// @route   GET /api/gallery/:id
// @access  Public
exports.getGalleryImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.json(image);
  } catch (error) {
    console.error('Error getting gallery image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new gallery image
// @route   POST /api/gallery
// @access  Private/Admin
exports.createGalleryImage = async (req, res) => {
  try {
    const { title, description, isActive, order } = req.body;
    
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    // Save file to local storage
    const file = req.files.image;
    const ext = path.extname(file.name);
    const filename = `gallery-${Date.now()}${ext}`;
    const imageUrl = await saveFile(file, filename);

    const newImage = new Gallery({
      title,
      description,
      imageUrl,
      isActive: isActive || false,
      order: order || 0
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error creating gallery image:', error);
    res.status(500).json({ message: 'Error creating gallery image' });
  }
};

// @desc    Update gallery image
// @route   PUT /api/gallery/:id
// @access  Private/Admin
exports.updateGalleryImage = async (req, res) => {
  try {
    const { title, description, isActive, order } = req.body;
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const updateData = {
      title: title || image.title,
      description: description || image.description,
      isActive: isActive !== undefined ? isActive : image.isActive,
      order: order !== undefined ? order : image.order
    };

    if (req.files && req.files.image) {
      // Delete old image from local storage
      if (image.imageUrl) {
        await deleteFile(image.imageUrl);
      }
      
      // Save new file
      const file = req.files.image;
      const ext = path.extname(file.name);
      const filename = `gallery-${Date.now()}${ext}`;
      updateData.imageUrl = await saveFile(file, filename);
    }

    const updatedImage = await Gallery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updatedImage);
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({ message: 'Error updating gallery image' });
  }
};

// @desc    Delete gallery image
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
exports.deleteGalleryImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete image from local storage if exists
    if (image.imageUrl) {
      await deleteFile(image.imageUrl);
    }
    // Delete from database
    await Gallery.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Image removed' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle gallery image status
// @route   PATCH /api/gallery/:id/status
// @access  Private/Admin
exports.toggleGalleryImageStatus = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    image.isActive = !image.isActive;
    await image.save();
    
    res.json({ 
      _id: image._id, 
      isActive: image.isActive,
      message: `Image ${image.isActive ? 'activated' : 'deactivated'}` 
    });
  } catch (error) {
    console.error('Error toggling gallery image status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
