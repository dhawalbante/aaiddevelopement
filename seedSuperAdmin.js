const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { Admin } = require('mongodb');
require('dotenv').config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/AID-2025', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const createSuperAdmin = async () => {
  try {
    await connectDB();

    // Check if superadmin already exists
    let existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      console.log('Superadmin already exists. Updating password...');
      existingAdmin.password = 'admin123'; // Using a stronger password that meets the 6-character requirement
      await existingAdmin.save();
      console.log('Superadmin password has been reset.');
      console.log('Email: admin@gmail.com');
      console.log('New Password: admin123');
      process.exit(0);
    }

    // Create new superadmin
    const superAdmin = new User({
      email: 'admin@gmail.com',
      password: 'admin123',  // Using a stronger password that meets the 6-character requirement
      name: 'Super Admin',
      role: 'superadmin',
      isActive: true,
      phone: '1234567890'
    });

    await superAdmin.save();
    console.log('Superadmin created successfully!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
