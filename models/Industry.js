const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,

  },

  // Industry Details
  overview: {
    type: String
  },
  investmentOpportunities: {
    type: String
  },
  infrastructureRequirements: {
    type: String
  },
  governmentIncentives: {
    type: String
  },
  growthPotential: {
    type: String
  },

  // Chair / Co-Chair Section
  leadership: [{
    role: {
      type: String,
      enum: ['Chair', 'Co-Chair'],
     
    },
    name: {
      type: String,

    },
    designation: {
      type: String,
      
    },
    photo: {
      type: String  // URL to the photo
    }
  }],

  // Press Releases Section
  pressReleases: [{
    title: {
      type: String,
      
    },
    newsArticleLink: {
      type: String,
     
    },
    pdf: {
      type: String  // URL to the PDF file (optional)
    },
    date: {
      type: Date,
     
    }
  }],

  // Media Coverage Section
  mediaCoverage: [{
    title: {
      type: String,
      
    },
    image: {
      type: String,  // URL to the image
      
    },
    sourceLink: {
      type: String  // URL (optional)
    }
  }],

  // Government Papers Section
  governmentPapers: [{
    title: {
      type: String,
     
    },
    pdfOrDocument: {
      type: String,  // URL to the PDF/doc file
     
    },
    description: {
      type: String,
      
    }
  }],

  // Media
  logo: {
    type: String  // URL to the logo image
  },
  coverImage: {
    type: String  // URL to the cover image
  },
  gallery: [{
    type: String  // Array of image URLs for the gallery
  }],

  // Metadata
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

// Update the updatedAt field on save
industrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Text index for search
industrySchema.index({
  'name': 'text',
  'description': 'text',
  'overview': 'text'
});

const Industry = mongoose.model('Industry', industrySchema);

module.exports = Industry;