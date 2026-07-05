// utils/validationRules.js
// Validation rules and utilities for user management

/**
 * Email validation
 */
exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (Indian format)
 * Accepts: +91-XXXXXXXXXX, +91 XXXXXXXXXX, XXXXXXXXXX, 0XXXXXXXXXX
 */
exports.validatePhone = (phone) => {
  const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Password strength validation
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
exports.validatePassword = (password) => {
  const rules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  return {
    isStrong: Object.values(rules).every(v => v),
    rules
  };
};

/**
 * Date of Birth validation
 * - Must be at least 18 years old
 * - Must be a valid date
 */
exports.validateDateOfBirth = (dob) => {
  if (!dob) {
    return { isValid: false, age: 0, message: 'Date of birth is required' };
  }

  const birthDate = new Date(dob);
  
  // Check if the date is valid
  if (isNaN(birthDate.getTime())) {
    return { isValid: false, age: 0, message: 'Invalid date of birth format' };
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return { isValid: false, age, message: 'Must be at least 18 years old' };
  }

  return {
    isValid: true,
    age,
    message: ''
  };
};

/**
 * License number validation (generic)
 * Format: Starting with letters, followed by numbers
 */
exports.validateLicenseNumber = (licenseNumber) => {
  const licenseRegex = /^[A-Z]{2,4}\d{4,8}$/;
  return licenseRegex.test(licenseNumber.toUpperCase());
};

/**
 * Registration number validation
 * Format: similar to license number
 */
exports.validateRegistrationNumber = (regNumber) => {
  const regRegex = /^[A-Z]{2,4}\d{4,8}$/;
  return regRegex.test(regNumber.toUpperCase());
};

/**
 * Experience validation
 * Must be non-negative number
 */
exports.validateExperience = (experience) => {
  const exp = parseFloat(experience);
  return exp >= 0 && !isNaN(exp);
};

/**
 * Time slot validation
 */
exports.validateTimeSlot = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return {
    isValid: endMinutes > startMinutes,
    message: endMinutes <= startMinutes ? 'End time must be after start time' : ''
  };
};

/**
 * Common user fields validation
 */
exports.validateCommonUserFields = (data) => {
  const errors = {};

  if (!data.fullName || data.fullName.trim().length === 0) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.trim().length < 3) {
    errors.fullName = 'Full name must be at least 3 characters';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!this.validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!this.validatePhone(data.phone)) {
    errors.phone = 'Invalid phone number';
  }

  if (!data.dateOfBirth) {
    // Date of birth is now optional
  } else {
    const dobValidation = this.validateDateOfBirth(data.dateOfBirth);
    if (!dobValidation.isValid) {
      errors.dateOfBirth = dobValidation.message;
    }
  }

  if (!data.gender || !['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.gender = 'Valid gender is required';
  }

  if (!data.address || data.address.trim().length === 0) {
    errors.address = 'Address is required';
  }

  if (!data.username || data.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isStrong) {
      errors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }
  }

  if (!data.role || !['doctor', 'receptionist', 'nurse', 'admin', 'staff'].includes(data.role)) {
    errors.role = 'Valid role is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Doctor-specific validation
 */
exports.validateDoctorProfile = (data) => {
  const errors = {};

  if (!data.specialization) {
    errors.specialization = 'Specialization is required';
  }

  if (!data.qualification || data.qualification.trim().length === 0) {
    errors.qualification = 'Qualification is required';
  }

  if (data.experience === undefined || data.experience === null) {
    errors.experience = 'Experience is required';
  } else if (!this.validateExperience(data.experience)) {
    errors.experience = 'Experience must be a non-negative number';
  }

  if (!data.licenseNumber || !this.validateLicenseNumber(data.licenseNumber)) {
    errors.licenseNumber = 'Invalid license number';
  }

  if (!data.licenseExpiry) {
    errors.licenseExpiry = 'License expiry date is required';
  } else if (new Date(data.licenseExpiry) <= new Date()) {
    errors.licenseExpiry = 'License expiry date must be in the future';
  }

  if (!data.consultationFees || parseFloat(data.consultationFees) <= 0) {
    errors.consultationFees = 'Consultation fees must be greater than 0';
  }

  if (!data.department) {
    errors.department = 'Department is required';
  }

  if (!data.availableDays || data.availableDays.length === 0) {
    errors.availableDays = 'At least one available day is required';
  }

  if (!data.timeSlots || data.timeSlots.length === 0) {
    errors.timeSlots = 'At least one time slot is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Receptionist-specific validation
 */
exports.validateReceptionistProfile = (data) => {
  const errors = {};

  const hasShiftTimingInput = Boolean(
    data.shiftTiming && (
      data.shiftTiming.startTime ||
      data.shiftTiming.endTime ||
      (data.shiftTiming.daysOfWeek && data.shiftTiming.daysOfWeek.length > 0)
    )
  );

  if (hasShiftTimingInput && (data.shiftTiming.startTime || data.shiftTiming.endTime)) {
    if (!data.shiftTiming.startTime || !data.shiftTiming.endTime) {
      errors.shiftTiming = 'Complete shift timing is required when provided';
    } else {
      const timeValidation = this.validateTimeSlot(data.shiftTiming.startTime, data.shiftTiming.endTime);
      if (!timeValidation.isValid) {
        errors.shiftTiming = timeValidation.message;
      }
    }
  }

  if (data.workExperience === undefined || data.workExperience === null) {
    errors.workExperience = 'Work experience is required';
  } else if (!this.validateExperience(data.workExperience)) {
    errors.workExperience = 'Work experience must be a non-negative number';
  }

  if (data.shiftTiming && (!data.shiftTiming.daysOfWeek || data.shiftTiming.daysOfWeek.length === 0)) {
    errors.daysOfWeek = 'At least one day of work is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Nurse-specific validation
 */
exports.validateNurseProfile = (data) => {
  const errors = {};

  if (!data.qualification) {
    errors.qualification = 'Qualification is required';
  }

  if (!data.registrationNumber || !this.validateRegistrationNumber(data.registrationNumber)) {
    errors.registrationNumber = 'Invalid registration number';
  }

  if (data.experience === undefined || data.experience === null) {
    errors.experience = 'Experience is required';
  } else if (!this.validateExperience(data.experience)) {
    errors.experience = 'Experience must be a non-negative number';
  }

  const hasShiftTimingInput = Boolean(
    data.shiftTiming && (
      data.shiftTiming.startTime ||
      data.shiftTiming.endTime ||
      (data.shiftTiming.daysOfWeek && data.shiftTiming.daysOfWeek.length > 0)
    )
  );

  if (hasShiftTimingInput && (data.shiftTiming.startTime || data.shiftTiming.endTime)) {
    if (!data.shiftTiming.startTime || !data.shiftTiming.endTime) {
      errors.shiftTiming = 'Complete shift timing is required when provided';
    } else {
      const timeValidation = this.validateTimeSlot(data.shiftTiming.startTime, data.shiftTiming.endTime);
      if (!timeValidation.isValid) {
        errors.shiftTiming = timeValidation.message;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Staff-specific validation
 */
exports.validateStaffProfile = (data) => {
  const errors = {};

  if (!data.jobTitle) {
    errors.jobTitle = 'Job title is required';
  }

  const validJobTitles = [
    'Ward Attendant',
    'Lab Technician',
    'Clerical Staff',
    'Maintenance Staff',
    'Security',
    'Housekeeping',
    'Medical Records Officer',
    'Administrative Officer',
    'Other'
  ];

  if (data.jobTitle && !validJobTitles.includes(data.jobTitle)) {
    errors.jobTitle = 'Invalid job title selected';
  }

  if (data.workExperience === undefined || data.workExperience === null) {
    errors.workExperience = 'Work experience is required';
  } else if (!this.validateExperience(data.workExperience)) {
    errors.workExperience = 'Experience must be a non-negative number';
  }

  if (data.employmentType && !['Full-time', 'Part-time', 'Contract', 'Temporary'].includes(data.employmentType)) {
    errors.employmentType = 'Invalid employment type';
  }

  if (data.shiftTiming) {
    if (data.shiftTiming.startTime && data.shiftTiming.endTime) {
      const timeValidation = this.validateTimeSlot(data.shiftTiming.startTime, data.shiftTiming.endTime);
      if (!timeValidation.isValid) {
        errors.shiftTiming = timeValidation.message;
      }
    }

    if (!data.shiftTiming.daysOfWeek || data.shiftTiming.daysOfWeek.length === 0) {
      errors.daysOfWeek = 'At least one day of work is required';
    }
  }

  if (data.emergencyContactPhone && !this.validatePhone(data.emergencyContactPhone)) {
    errors.emergencyContactPhone = 'Invalid emergency contact phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
