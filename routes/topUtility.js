const express = require('express');
const router = express.Router();
const TopUtilityConfig = require('../models/TopUtilityConfig');
const Announcement = require('../models/Announcement');

// Get top utility configuration
router.get('/config', async (req, res) => {
  try {
    let config = await TopUtilityConfig.findOne({ isActive: true });
    if (!config) {
      // Create default config if none exists
      config = new TopUtilityConfig();
      await config.save();
    }
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching top utility config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update top utility configuration
router.put('/config', async (req, res) => {
  try {
    const { countdownTitle, targetDate, phone, email, socialLinks } = req.body;

    let config = await TopUtilityConfig.findOne({ isActive: true });
    if (!config) {
      config = new TopUtilityConfig();
    }

    if (countdownTitle !== undefined) config.countdownTitle = countdownTitle;
    if (targetDate !== undefined) config.targetDate = new Date(targetDate);
    if (phone !== undefined) config.phone = phone;
    if (email !== undefined) config.email = email;
    if (socialLinks !== undefined) config.socialLinks = socialLinks;

    await config.save();
    res.json({ success: true, data: config, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating top utility config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all announcements
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new announcement
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, url, backgroundColor, textColor, animationSpeed, order } = req.body;

    const newAnnouncement = new Announcement({
      title,
      content,
      url,
      backgroundColor,
      textColor,
      animationSpeed,
      order: order || 0
    });

    await newAnnouncement.save();
    res.status(201).json({ success: true, data: newAnnouncement, message: 'Announcement created successfully' });
  } catch (error) {
    console.error('Error creating announcement:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Update announcement
router.put('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, url, backgroundColor, textColor, animationSpeed, order, isActive } = req.body;

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      {
        title,
        content,
        url,
        backgroundColor,
        textColor,
        animationSpeed,
        order,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!updatedAnnouncement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, data: updatedAnnouncement, message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Delete announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

    if (!deletedAnnouncement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reorder announcements
router.put('/announcements/reorder', async (req, res) => {
  try {
    const { announcements } = req.body; // Array of { id, order }

    const bulkOps = announcements.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order }
      }
    }));

    await Announcement.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Announcements reordered successfully' });
  } catch (error) {
    console.error('Error reordering announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
