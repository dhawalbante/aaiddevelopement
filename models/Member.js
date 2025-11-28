const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String, // Cloud URL or file path
    default: null
  },
  social: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    linkedin: {
      type: String,
      trim: true
    }
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
memberSchema.index({ isActive: 1, priority: -1 });
memberSchema.index({ department: 1 });
memberSchema.index({ fullName: 'text', designation: 'text' });

module.exports = mongoose.model('Member', memberSchema);
