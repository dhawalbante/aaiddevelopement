const mongoose = require('mongoose');

const popupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  ctas: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'CTA text cannot exceed 50 characters']
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'CTA URL must be a valid HTTP or HTTPS URL'
      }
    },
    primary: {
      type: Boolean,
      default: false
    }
  }],
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  backgroundType: {
    type: String,
    enum: ['color', 'image'],
    default: 'color'
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
  backgroundImage: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        // Allow both local paths (starting with /uploads/) and full URLs
        return v.startsWith('/uploads/') || /^https?:\/\//.test(v);
      },
      message: 'Background image must be a valid HTTP/HTTPS URL or start with /uploads/'
    }
  },
  displayDuration: {
    type: Number,
    default: 0, // 0 means no auto-hide
    min: 0,
    max: 300 // Max 5 minutes
  },
  closable: {
    type: Boolean,
    default: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  dailySchedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      validate: {
        validator: function(v) {
          if (!this.dailySchedule.enabled) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    endTime: {
      type: String,
      validate: {
        validator: function(v) {
          if (!this.dailySchedule.enabled) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format'
      }
    }
  },
  delaySeconds: {
    type: Number,
    default: 0,
    min: 0,
    max: 300 // Max 5 minutes delay
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
popupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient querying
popupSchema.index({ enabled: 1, priority: -1, startDate: 1, endDate: 1 });

const Popup = mongoose.model('Popup', popupSchema);

module.exports = Popup;
