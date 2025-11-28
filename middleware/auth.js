const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async function(req, res, next) {
  // Get token from header - check both Authorization Bearer format and x-auth-token
  let token = req.header('x-auth-token');

  // If no x-auth-token, check Authorization header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from the token and attach to request object
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    res.status(500).send('Server Error');
  }
};

// Admin middleware
const admin = async function(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'No user found. Authentication required.' });
    }

    // Get the user from database to ensure we have the latest role
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        msg: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).send('Server Error');
  }
};

module.exports = { auth, admin };
