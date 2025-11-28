const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();

// Enable file uploads
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size too large. Max 5MB allowed.'
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const districtRoutes = require('./routes/districts');
const companyRoutes = require('./routes/companies');
const stateRoutes = require('./routes/states');
const industryRoutes = require('./routes/industries');
const authRoutes = require('./routes/auth');
const topUtilityRoutes = require('./routes/topUtility');
const contactRoutes = require('./routes/contact');
const startupRoutes = require('./routes/startups');
const memberRoutes = require('./routes/members');
const commonRoutes = require('./routes/commonRoutes');
const popupRoutes = require('./routes/popups');
const policyRoutes = require('./routes/policies');
const galleryRoutes = require('./routes/gallery');

// Use routes
app.use('/api/companies', companyRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/top-utility', topUtilityRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/common', commonRoutes);
app.use('/api/popups', popupRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/gallery', galleryRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Company Form API is running!' });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB URI: ${MONGODB_URI ? 'Set' : 'Not set'}`);
});