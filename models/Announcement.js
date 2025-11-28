const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [500, 'Content cannot exceed 500 characters']
  },
  url: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty URLs
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  backgroundColor: {
    type: String,
    default: '#ffffff',
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Background color must be a valid hex color (e.g., #ffffff)'
    }
  },
  textColor: {
    type: String,
    default: '#000000',
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Text color must be a valid hex color (e.g., #000000)'
    }
  },
  animationSpeed: {
    type: String,
    enum: ['slow', 'normal', 'fast'],
    default: 'normal'
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
announcementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient querying
announcementSchema.index({ isActive: 1, order: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
