const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const path = require('path');
const fs = require('fs');

// @desc    Get all members (admin only)
// @route   GET /api/members
// @access  Private/Admin
const getMembers = asyncHandler(async (req, res) => {
  const members = await Member.find({}).sort({ priority: 1 });
  res.json(members);
});

// @desc    Get public members
// @route   GET /api/members/public
// @access  Public
const getPublicMembers = asyncHandler(async (req, res) => {
  const members = await Member.find({ isActive: true })
    .select('-email -phone -isActive -createdAt -updatedAt -__v')
    .sort({ priority: 1 });
  res.json(members);
});

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private/Admin
const getMemberById = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);

  if (member) {
    res.json(member);
  } else {
    res.status(404);
    throw new Error('Member not found');
  }
});

// @desc    Create a member
// @route   POST /api/members
// @access  Private/Admin
const createMember = asyncHandler(async (req, res) => {
  try {
    const { fullName, designation, department, social, isActive, priority } = req.body;

    // Handle file upload using express-fileupload
    let profileImage = '';
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      const ext = path.extname(file.name);
      const filename = `member-${Date.now()}${ext}`;
      const filePath = path.join(__dirname, '../uploads/members', filename);

      await file.mv(filePath);
      profileImage = `/uploads/members/${filename}`;
    }

    const member = new Member({
      fullName,
      designation,
      department,
      profileImage,
      social: social ? (typeof social === 'string' ? JSON.parse(social) : social) : {},
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0
    });

    const createdMember = await member.save();
    res.status(201).json({
      success: true,
      data: createdMember
    });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating member',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Update a member
// @route   PUT /api/members/:id
// @access  Private/Admin
const updateMember = asyncHandler(async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const { fullName, designation, department, social, isActive, priority } = req.body;

    // Handle file upload using express-fileupload
    if (req.files && req.files.profileImage) {
      // Remove old image if exists
      if (member.profileImage) {
        const oldImagePath = path.join(__dirname, '..', member.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new file
      const file = req.files.profileImage;
      const ext = path.extname(file.name);
      const filename = `member-${Date.now()}${ext}`;
      const filePath = path.join(__dirname, '../uploads/members', filename);

      await file.mv(filePath);
      member.profileImage = `/uploads/members/${filename}`;
    }

    member.fullName = fullName || member.fullName;
    member.designation = designation || member.designation;
    member.department = department || member.department;
    member.social = social ? (typeof social === 'string' ? JSON.parse(social) : social) : member.social;
    member.isActive = isActive !== undefined ? isActive : member.isActive;
    member.priority = priority !== undefined ? priority : member.priority;

    const updatedMember = await member.save();
    res.json({
      success: true,
      data: updatedMember
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating member',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Delete a member
// @route   DELETE /api/members/:id
// @access  Private/Admin
const deleteMember = asyncHandler(async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    // Remove image file if exists
    if (member.profileImage) {
      const imagePath = path.join(__dirname, '..', member.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Member.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Member removed'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting member',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Update member priority
// @route   PUT /api/members/:id/priority
// @access  Private/Admin
const updateMemberPriority = asyncHandler(async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      res.status(404);
      throw new Error('Member not found');
    }

    const { priority } = req.body;

    if (priority === undefined || priority === null) {
      res.status(400);
      throw new Error('Priority is required');
    }

    member.priority = priority;
    const updatedMember = await member.save();

    res.json({
      success: true,
      data: updatedMember
    });
  } catch (error) {
    console.error('Error updating member priority:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating member priority',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = {
  getMembers,
  getPublicMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  updateMemberPriority
};
