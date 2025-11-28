const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Allow local paths (starting with /uploads/) and full URLs
        return v.startsWith('/uploads/') || /^https?:\/\//.test(v);
      },
      message: 'Image URL must be a valid HTTP/HTTPS URL or start with /uploads/'
    }
  },
  altText: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  order: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
gallerySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient querying
gallerySchema.index({ isActive: 1, order: 1, createdAt: -1 });

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = Gallery;
