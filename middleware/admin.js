const User = require('../models/User');

module.exports = function(roles = ['admin']) {
  return async function(req, res, next) {
    try {
      // Check if user exists on request (should be set by auth middleware)
      if (!req.user) {
        return res.status(401).json({ msg: 'No user found. Authentication required.' });
      }

      // Get the user from database to ensure we have the latest role
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({ msg: 'User not found' });
      }

      // Check if user has one of the required roles
      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          msg: `Access denied. Requires one of these roles: ${roles.join(', ')}` 
        });
      }

      // If we get here, user is authorized
      next();
    } catch (err) {
      console.error('Admin middleware error:', err);
      res.status(500).json({ msg: 'Server error in admin middleware' });
    }
  };
};
