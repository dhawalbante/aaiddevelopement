const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Company Information
  companyName: { 
    type: String, 
    required: [true, 'Company name is required'] 
  },
  directorCeo: {
    type: String,
    required: [true, 'Director/CEO name is required']
  },
  industry: {
    type: String,
    // required: [true, 'Industry is required']
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
    // required: [true, 'Company logo is required']
  },
  banner: String,
  
  // Additional fields that might be added later
  address: String,
  city: String,
  state: String,
  country: String,
  pincode: String,
  
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
  timestamps: true // This will automatically add createdAt and updatedAt
});

// Add text index for search
companySchema.index({
  companyName: 'text',
  industry: 'text',
  email: 'text',
  phone: 'text',
  directorCeo: 'text'
});

module.exports = mongoose.model('Company', companySchema);