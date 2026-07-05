// controllers/userController.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const newUser = new User({ name, email, password });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, permissions: newUser.permissions || [] },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------
// LOGIN USER
// ------------------------------------
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, permissions: user.permissions || [] },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------
// GET USER PROFILE
// ------------------------------------
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(200).json(userResponse);
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------
// GET ALL USERS (Admin only)
// ------------------------------------
exports.getUsers = async (req, res) => {
  try {
    // Only admin can access user list
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can view user list' });
    }

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
  }
};

// ------------------------------------
// DELETE USER (Admin only)
// ------------------------------------
exports.deleteUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete users' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last administrator' });
      }
    }

    // Delete feature access records
    try {
      const MasterData = require('../models/MasterData');
      await MasterData.deleteMany({
        type: 'feature_access',
        $or: [
          { userId: req.params.id },
          { 'metadata.targetId': req.params.id }
        ]
      });
    } catch (featureError) {
      console.error('Error deleting feature access records:', featureError);
      // Continue with user deletion
    }

    // Log the deletion
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.log(
        'DELETE',
        req.params.id,
        req.user,
        'USER',
        req.params.id,
        { role: user.role, email: user.email },
        `User permanently deleted: ${user.name} (${user.email})`,
        req.ip,
        req.headers['user-agent'],
        { deletedBy: req.user.id }
      );
    } catch (auditError) {
      console.error('Error logging user deletion:', auditError);
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Error deleting user', error: err.message });
  }
};

// ------------------------------------
// UPDATE USER (Admin only)
// ------------------------------------
exports.updateUser = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can update users' });
    }

    const { id } = req.params;
    const { name, phone, role } = req.body;

    // Validate input
    if (!name && !phone && !role) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role.toLowerCase();

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        permissions: user.permissions || [],
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Error updating user', error: err.message });
  }
};

// ------------------------------------
// GET USER WITH PERMISSIONS (Admin only)
// ------------------------------------
exports.getUserPermissions = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can view user permissions' });
    }

    const { id } = req.params;
    const user = await User.findById(id, { password: 0 });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('Error fetching user permissions:', err);
    res.status(500).json({ success: false, message: 'Error fetching user permissions', error: err.message });
  }
};

// ------------------------------------
// UPDATE USER PERMISSIONS (Admin only)
// ------------------------------------
exports.updateUserPermissions = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can manage user permissions' });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.permissions = permissions;
    await user.save();

    console.log(`Admin ${req.user.name} updated permissions for user ${user.email}: [${permissions.join(', ')}]`);

    res.json({
      success: true,
      message: 'User permissions updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('Error updating user permissions:', err);
    res.status(500).json({ success: false, message: 'Error updating user permissions', error: err.message });
  }
};
