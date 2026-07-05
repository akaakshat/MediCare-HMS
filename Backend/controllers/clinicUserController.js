// controllers/clinicUserController.js
// Clinic user management with role-based profile creation

const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const ReceptionistProfile = require('../models/ReceptionistProfile');
const NurseProfile = require('../models/NurseProfile');
const StaffProfile = require('../models/StaffProfile');
const AuditLog = require('../models/AuditLog');
const validationRules = require('../utils/validationRules');

const collectUserFeatureAccess = (user = {}, featureAccessRecord = null) => {
  const featureSet = new Set();

  const addFeatures = (value) => {
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      const normalized = String(item || '').trim().toLowerCase();
      if (normalized) featureSet.add(normalized);
    });
  };

  addFeatures(user?.permissions);
  addFeatures(featureAccessRecord?.features);
  addFeatures(featureAccessRecord?.metadata?.features);

  return Array.from(featureSet);
};

/**
 * Create new clinic user with role-specific profile
 * POST /api/clinic-users
 * Admin only
 */
exports.createClinicUser = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can create clinic users'
      });
    }

    const { commonFields, roleSpecificFields } = req.body;
    if (commonFields?.email) {
      commonFields.email = commonFields.email.toString().trim().toLowerCase();
    }

    // Validate common fields
    const commonValidation = validationRules.validateCommonUserFields(commonFields);
    if (!commonValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: commonValidation.errors
      });
    }

    // Validate role-specific fields
    let roleValidation;
    switch (commonFields.role.toLowerCase()) {
      case 'doctor':
        roleValidation = validationRules.validateDoctorProfile(roleSpecificFields);
        break;
      case 'receptionist':
        roleValidation = validationRules.validateReceptionistProfile(roleSpecificFields);
        break;
      case 'nurse':
        roleValidation = validationRules.validateNurseProfile(roleSpecificFields);
        break;
      case 'staff':
        roleValidation = validationRules.validateStaffProfile(roleSpecificFields);
        break;
      default:
        roleValidation = { isValid: true, errors: {} };
    }

    if (!roleValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: roleValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: commonFields.email },
        { username: commonFields.username }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user (password will be hashed by User model pre-save hook)
    const newUser = new User({
      email: commonFields.email,
      password: commonFields.password, // Plain text - will be hashed by User model
      name: commonFields.fullName,
      phone: commonFields.phone,
      role: commonFields.role.toLowerCase(),
      status: commonFields.status || 'active',
      username: commonFields.username,
      gender: commonFields.gender,
      dateOfBirth: commonFields.dateOfBirth,
      address: commonFields.address,
      permissions: [],
      createdBy: req.user.id,
      profileImage: commonFields.profileImage || null
    });

    await newUser.save();

    // Create role-specific profile
    let roleProfile;
    switch (commonFields.role.toLowerCase()) {
      case 'doctor':
        roleProfile = new DoctorProfile({
          userId: newUser._id,
          specialization: roleSpecificFields.specialization,
          qualification: roleSpecificFields.qualification,
          experience: roleSpecificFields.experience,
          licenseNumber: roleSpecificFields.licenseNumber,
          licenseExpiry: roleSpecificFields.licenseExpiry,
          consultationFees: roleSpecificFields.consultationFees,
          department: roleSpecificFields.department,
          availableDays: roleSpecificFields.availableDays,
          timeSlots: roleSpecificFields.timeSlots,
          bio: roleSpecificFields.bio || '',
          registrationNumber: roleSpecificFields.registrationNumber
        });
        await roleProfile.save();
        break;

      case 'receptionist':
        roleProfile = new ReceptionistProfile({
          userId: newUser._id,
          shiftTiming: roleSpecificFields.shiftTiming,
          workExperience: roleSpecificFields.workExperience,
          department: roleSpecificFields.department || null,
          assignedToDoctor: roleSpecificFields.assignedToDoctor || null,
          skills: roleSpecificFields.skills || []
        });
        await roleProfile.save();
        break;

      case 'nurse':
        roleProfile = new NurseProfile({
          userId: newUser._id,
          qualification: roleSpecificFields.qualification,
          registrationNumber: roleSpecificFields.registrationNumber,
          experience: roleSpecificFields.experience,
          assignedDoctor: roleSpecificFields.assignedDoctor || null,
          assignedDepartment: roleSpecificFields.assignedDepartment || null,
          shiftTiming: roleSpecificFields.shiftTiming,
          specialization: roleSpecificFields.specialization || 'General',
          certifications: roleSpecificFields.certifications || []
        });
        await roleProfile.save();
        break;

      case 'staff':
        roleProfile = new StaffProfile({
          userId: newUser._id,
          jobTitle: roleSpecificFields.jobTitle,
          department: roleSpecificFields.department || null,
          shiftTiming: roleSpecificFields.shiftTiming || null,
          workExperience: roleSpecificFields.workExperience || 0,
          certifications: roleSpecificFields.certifications || [],
          skills: roleSpecificFields.skills || [],
          employmentType: roleSpecificFields.employmentType || 'Full-time',
          joiningDate: roleSpecificFields.joiningDate || new Date(),
          supervisorId: roleSpecificFields.supervisorId || null,
          emergencyContactName: roleSpecificFields.emergencyContactName,
          emergencyContactPhone: roleSpecificFields.emergencyContactPhone,
          emergencyContactRelation: roleSpecificFields.emergencyContactRelation,
          remarks: roleSpecificFields.remarks
        });
        await roleProfile.save();
        break;
    }

    // Create audit log
    await AuditLog.log(
      'CREATE',
      newUser._id,
      req.user,
      'USER',
      newUser._id,
      null,
      `New ${commonFields.role} user created: ${newUser.name} (${newUser.email})`,
      req.ip,
      req.headers['user-agent'],
      { role: commonFields.role, status: commonFields.status }
    );

    res.status(201).json({
      success: true,
      message: `${commonFields.role} user created successfully`,
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
        },
        profile: roleProfile
      }
    });
  } catch (error) {
    console.error('Error in createClinicUser:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create clinic user'
    });
  }
};

/**
 * Get clinic user by ID with role profile
 * GET /api/clinic-users/:userId
 */
exports.getClinicUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let roleProfile;
    switch (user.role) {
      case 'doctor':
        roleProfile = await DoctorProfile.findOne({ userId });
        break;
      case 'receptionist':
        roleProfile = await ReceptionistProfile.findOne({ userId });
        break;
      case 'nurse':
        roleProfile = await NurseProfile.findOne({ userId });
        break;
      case 'staff':
        roleProfile = await StaffProfile.findOne({ userId });
        break;
    }

    // Fetch feature access
    const MasterData = require('../models/MasterData');
    const featureAccess = await MasterData.findOne({ userId, type: 'feature_access' });
    const combinedFeatures = collectUserFeatureAccess(user, featureAccess);

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          permissions: user.permissions || [],
          features: combinedFeatures
        },
        profile: roleProfile,
        features: combinedFeatures,
        permissions: combinedFeatures
      }
    });
  } catch (error) {
    console.error('Error in getClinicUser:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all users with optional role filter
 * GET /api/clinic-users?role=doctor
 */
exports.getAllClinicUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    let query = {};

    if (role) {
      query.role = role.toLowerCase();
    }

    // By default, exclude inactive users unless explicitly requested
    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Only show active users by default
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error in getAllClinicUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update clinic user
 * PUT /api/clinic-users/:userId
 * Admin only
 */
exports.updateClinicUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can update users'
      });
    }

    const { userId } = req.params;
    const { commonFields, roleSpecificFields } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update common fields
    if (commonFields) {
      user.name = commonFields.fullName || user.name;
      user.email = commonFields.email || user.email;
      user.phone = commonFields.phone || user.phone;
      user.gender = commonFields.gender || user.gender;
      user.address = commonFields.address || user.address;
      user.status = commonFields.status || user.status;
      user.dateOfBirth = commonFields.dateOfBirth || user.dateOfBirth;
      if (commonFields.role) {
        user.role = commonFields.role.toLowerCase();
      }
      if (commonFields.permissions !== undefined) {
        user.permissions = commonFields.permissions;
      }

      if (commonFields.password) {
        const passwordValidation = validationRules.validatePassword(commonFields.password);
        if (!passwordValidation.isStrong) {
          return res.status(400).json({
            success: false,
            message: 'Password must contain uppercase, lowercase, number, and special character'
          });
        }
        user.password = commonFields.password; // Plain text - will be hashed by User model pre-save hook
      }
    }

    user.updatedBy = req.user.id;
    user.updatedAt = new Date();
    console.log('Updating user:', user._id, 'with permissions:', user.permissions, 'role:', user.role);

    await user.save();
    console.log('User updated successfully in database');

    // Update role-specific profile if provided
    if (roleSpecificFields) {
      let roleProfile;
      switch (user.role) {
        case 'doctor':
          roleProfile = await DoctorProfile.findOneAndUpdate(
            { userId },
            { ...roleSpecificFields, updatedAt: new Date() },
            { new: true }
          );
          break;
        case 'receptionist':
          roleProfile = await ReceptionistProfile.findOneAndUpdate(
            { userId },
            { ...roleSpecificFields, updatedAt: new Date() },
            { new: true }
          );
          break;
        case 'nurse':
          roleProfile = await NurseProfile.findOneAndUpdate(
            { userId },
            { ...roleSpecificFields, updatedAt: new Date() },
            { new: true }
          );
          break;
      }
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully. If permissions were changed, the user may need to log out and log back in for changes to take effect.',
      data: {
        user: user.toObject()
      }
    });
  } catch (error) {
    console.error('Error in updateClinicUser:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete clinic user
 * DELETE /api/clinic-users/:userId
 * Admin only
 */
exports.deleteClinicUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete users'
      });
    }

    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of admin users for safety
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete related profile based on role
    try {
      switch (user.role) {
        case 'doctor':
          await DoctorProfile.findOneAndDelete({ userId });
          break;
        case 'receptionist':
          await ReceptionistProfile.findOneAndDelete({ userId });
          break;
        case 'nurse':
          await NurseProfile.findOneAndDelete({ userId });
          break;
        case 'staff':
          await StaffProfile.findOneAndDelete({ userId });
          break;
      }
    } catch (profileError) {
      console.error('Error deleting user profile:', profileError);
      // Continue with user deletion even if profile deletion fails
    }

    // Delete feature access records
    try {
      const MasterData = require('../models/MasterData');
      await MasterData.deleteMany({
        type: 'feature_access',
        $or: [
          { userId: userId },
          { 'metadata.targetId': userId }
        ]
      });
    } catch (featureError) {
      console.error('Error deleting feature access records:', featureError);
      // Continue with user deletion
    }

    // Log the deletion before deleting the user
    try {
      await AuditLog.log(
        'DELETE',
        userId,
        req.user,
        'USER',
        userId,
        { role: user.role, email: user.email },
        `User permanently deleted: ${user.name} (${user.email})`,
        req.ip,
        req.headers['user-agent'],
        { deletedBy: req.user.id }
      );
    } catch (auditError) {
      console.error('Error logging user deletion:', auditError);
    }

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteClinicUser:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get users by role
 * GET /api/clinic-users/role/:role
 */
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const validRoles = ['doctor', 'receptionist', 'nurse', 'admin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const users = await User.find({
      role: role.toLowerCase(),
      status: 'active'
    }).select('-password').sort({ name: 1 });

    let enrichedUsers = [];

    for (const user of users) {
      let profile;
      switch (role.toLowerCase()) {
        case 'doctor':
          profile = await DoctorProfile.findOne({ userId: user._id });
          break;
        case 'receptionist':
          profile = await ReceptionistProfile.findOne({ userId: user._id });
          break;
        case 'nurse':
          profile = await NurseProfile.findOne({ userId: user._id });
          break;
      }

      enrichedUsers.push({
        user,
        profile
      });
    }

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      data: enrichedUsers
    });
  } catch (error) {
    console.error('Error in getUsersByRole:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
