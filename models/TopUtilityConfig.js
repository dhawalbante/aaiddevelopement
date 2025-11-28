const mongoose = require('mongoose');

const topUtilityConfigSchema = new mongoose.Schema({
  countdownTitle: {
    type: String,
    default: 'Event Countdown',
    trim: true
  },
  targetDate: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
  },
  phone: {
    type: String,
    default: '+91-1234567890',
    trim: true
  },
  email: {
    type: String,
    default: 'info@example.com',
    trim: true,
    lowercase: true
  },
  socialLinks: {
    facebook: { type: String, default: '', trim: true },
    twitter: { type: String, default: '', trim: true },
    linkedin: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
    youtube: { type: String, default: '', trim: true }
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
topUtilityConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const TopUtilityConfig = mongoose.model('TopUtilityConfig', topUtilityConfigSchema);

module.exports = TopUtilityConfig;
