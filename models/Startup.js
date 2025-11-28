const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Startup Information
  startupName: { 
    type: String, 
    required: [true, 'Startup name is required'] 
  },
  founderName: {
    type: String,
    required: [true, 'Founder name is required']
  },
  description: {
    type: String,
    required: [true, 'Startup description is required']
  },
  industry: {
    type: String,
    required: [true, 'Industry is required']
  },
  stage: {
    type: String,
    enum: ['Idea', 'Prototype', 'Seed', 'Series A', 'Series B', 'Series C+'],
    required: [true, 'Startup stage is required']
  },
  
  // Contact Information
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'] 
  },
  website: { 
    type: String,
    match: [/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/, 'Please enter a valid URL']
  },
  
  // File uploads
  logo: {
    type: String,
    required: [true, 'Startup logo is required']
  },
  pitchDeck: String,
  
  // Additional fields
  foundedYear: Number,
  teamSize: {
    type: String,
    enum: ['1-5', '6-10', '11-50', '51-200', '200+']
  },
  fundingStage: {
    type: String,
    enum: ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Not seeking funding']
  },
  
  // Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add text index for search
startupSchema.index({
  startupName: 'text',
  description: 'text',
  industry: 'text',
  email: 'text',
  founderName: 'text'
});

module.exports = mongoose.model('Startup', startupSchema);
