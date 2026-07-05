// frontend/src/components/modules/admin/ClinicUserForm.tsx
// Comprehensive clinic user form with role-based dynamic fields

import React, { useState, useEffect } from 'react';
import { Calendar, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../../utils/api';

const padTime = (value: number) => String(value).padStart(2, '0');

const parseTimeTo12Hour = (time?: string) => {
  if (!time) return { hour: '09', minute: '00', period: 'AM' };
  const [hourString, minute = '00'] = time.split(':');
  let hour = parseInt(hourString, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return {
    hour: padTime(hour),
    minute: padTime(parseInt(minute, 10)),
    period
  };
};

const build24HourTime = (hour12: string, minute: string, period: string) => {
  let hour = parseInt(hour12, 10);
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${padTime(hour)}:${padTime(parseInt(minute, 10))}`;
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => padTime(index + 1));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const FALLBACK_DEPARTMENTS = [
  { _id: 'general-medicine', name: 'General Medicine' },
  { _id: 'cardiology', name: 'Cardiology' },
  { _id: 'neurology', name: 'Neurology' },
  { _id: 'pediatrics', name: 'Pediatrics' },
  { _id: 'orthopedics', name: 'Orthopedics' },
  { _id: 'emergency', name: 'Emergency' },
  { _id: 'administration', name: 'Administration' }
];

const normalizeDepartments = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

interface FormData {
  commonFields: {
    fullName: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    role: string;
    username: string;
    password: string;
    dateOfBirth: string;
    status: 'active' | 'inactive';
    profileImage?: string;
  };
  roleSpecificFields: any;
}

interface Errors {
  [key: string]: string;
}

interface PasswordStrength {
  isStrong: boolean;
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const ClinicUserForm: React.FC<{
  userToEdit?: { _id: string } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}> = ({ userToEdit = null, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    commonFields: {
      fullName: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      role: 'doctor',
      username: '',
      password: '',
      dateOfBirth: '',
      status: 'active'
    },
    roleSpecificFields: {}
  });

  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    isStrong: false,
    rules: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const isEditMode = Boolean(userToEdit);

  const resetForm = () => {
    setFormData({
      commonFields: {
        fullName: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        role: 'doctor',
        username: '',
        password: '',
        dateOfBirth: '',
        status: 'active'
      },
      roleSpecificFields: {}
    });
    setErrors({});
    setPasswordStrength({
      isStrong: false,
      rules: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      }
    });
  };

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Try to reach the backend
        const response = await fetch('http://localhost:5000/api/health', {
          method: 'GET',
        }).catch(() => null);
        
        if (!response || !response.ok) {
          setBackendError('Backend server is not responding. Make sure the backend is running on port 5000.');
        } else {
          setBackendError(null);
        }
      } catch (error) {
        setBackendError('Cannot connect to backend. Ensure server is running on port 5000.');
      }
    };
    
    checkBackend();
  }, []);

  // Use local department options instead of the removed master-data endpoint.
  useEffect(() => {
    setDepartments(FALLBACK_DEPARTMENTS);
  }, []);

  useEffect(() => {
    const loadUserForEdit = async () => {
      if (!userToEdit) {
        resetForm();
        return;
      }

      setInitialLoading(true);
      try {
        const response = await ApiClient.get(`/clinic-users/${userToEdit._id}`);
        if (response?.success && response.data) {
          const user = response.data.user;
          const profile = response.data.profile || {};

          setFormData({
            commonFields: {
              fullName: user.name || '',
              gender: user.gender || '',
              phone: user.phone || '',
              email: user.email || '',
              address: user.address || '',
              role: user.role || 'doctor',
              username: user.username || '',
              password: '',
              dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
              status: user.status || 'active',
              profileImage: user.profileImage || ''
            },
            roleSpecificFields: profile || {}
          });

        }
      } catch (error: any) {
        console.error('Failed to load user for edit:', error);
        toast.error('Unable to load user data for editing');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserForEdit();
  }, [userToEdit]);

  const handleCommonFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      commonFields: {
        ...prev.commonFields,
        [name]: value
      }
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    setFormData(prev => ({
      ...prev,
      commonFields: {
        ...prev.commonFields,
        role
      },
      roleSpecificFields: {}
    }));
    setErrors({});
  };

  const handleRoleSpecificChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      roleSpecificFields: {
        ...prev.roleSpecificFields,
        [name]: value
      }
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData(prev => ({
      ...prev,
      commonFields: {
        ...prev.commonFields,
        password
      }
    }));

    // Check password strength
    const rules = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    setPasswordStrength({
      isStrong: Object.values(rules).every(v => v),
      rules
    });
  };

  const handleTimeSlotAdd = () => {
    if (!formData.roleSpecificFields.timeSlots) {
      formData.roleSpecificFields.timeSlots = [];
    }
    formData.roleSpecificFields.timeSlots.push({
      day: 'Monday',
      startTime: '09:00',
      endTime: '12:00',
      slotDuration: 30
    });
    setFormData({ ...formData });
  };

  const handleTimeSlotChange = (index: number, field: string, value: any) => {
    if (!formData.roleSpecificFields.timeSlots) {
      formData.roleSpecificFields.timeSlots = [];
    }
    formData.roleSpecificFields.timeSlots[index][field] = value;
    setFormData({ ...formData });
  };

  const handleAvailableDaysChange = (day: string) => {
    const days = formData.roleSpecificFields.availableDays || [];
    if (days.includes(day)) {
      formData.roleSpecificFields.availableDays = days.filter((d: string) => d !== day);
    } else {
      formData.roleSpecificFields.availableDays = [...days, day];
    }
    setFormData({ ...formData });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submissionData: any = {
        ...formData
      };

      if (isEditMode && !submissionData.commonFields.password) {
        const { password, ...commonFieldsWithoutPassword } = submissionData.commonFields;
        submissionData.commonFields = commonFieldsWithoutPassword;
      }

      const response = isEditMode
        ? await ApiClient.put(`/clinic-users/${userToEdit?._id}`, submissionData)
        : await ApiClient.post('/clinic-users', submissionData);

      if (response?.success) {
        toast.success(isEditMode ? 'User updated successfully' : 'User created successfully');
        if (!isEditMode) {
          resetForm();
        }
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      const errorMsg = error.message || (isEditMode ? 'Failed to update user' : 'Failed to create user');
      toast.error(errorMsg);
      
      if (error.response?.errors) {
        setErrors(error.response.errors);
        console.error('Validation errors:', error.response.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {isEditMode ? 'Edit Clinic User' : 'Add New Clinic User'}
      </h2>

      {/* Backend Connection Error */}
      {backendError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Backend Connection Error</p>
              <p className="text-red-700 text-sm mt-1">{backendError}</p>
              <p className="text-red-700 text-sm mt-2">
                📝 <strong>To start the backend:</strong>
              </p>
              <ul className="text-red-700 text-sm mt-1 ml-5 list-disc">
                <li>Navigate to the Backend folder: <code className="bg-red-100 px-2 py-1 rounded">cd Backend</code></li>
                <li>Start the server: <code className="bg-red-100 px-2 py-1 rounded">npm start</code> or <code className="bg-red-100 px-2 py-1 rounded">node server.js</code></li>
                <li>Verify it's running on port 5000</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.commonFields.fullName}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.commonFields.email}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
            <select
              name="gender"
              value={formData.commonFields.gender}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.gender ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.commonFields.phone}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10-digit phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.commonFields.dateOfBirth}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
            <p className="text-xs text-gray-500 mt-1">Must be at least 18 years old</p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.commonFields.username}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter username"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              name="role"
              value={formData.commonFields.role}
              onChange={handleRoleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="nurse">Nurse</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              type="text"
              name="address"
              value={formData.commonFields.address}
              onChange={handleCommonFieldChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter address"
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {isEditMode ? '(leave blank to keep current password)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.commonFields.password}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={isEditMode ? 'Leave blank to keep existing password' : 'Enter strong password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-900"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className={`h-2 flex-1 rounded ${passwordStrength.rules.minLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-600">Min 8 chars</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className={passwordStrength.rules.hasUppercase ? 'text-green-600' : 'text-gray-400'}>
                  {passwordStrength.rules.hasUppercase ? '✓' : '○'} Uppercase
                </span>
                <span className={passwordStrength.rules.hasLowercase ? 'text-green-600' : 'text-gray-400'}>
                  {passwordStrength.rules.hasLowercase ? '✓' : '○'} Lowercase
                </span>
                <span className={passwordStrength.rules.hasNumber ? 'text-green-600' : 'text-gray-400'}>
                  {passwordStrength.rules.hasNumber ? '✓' : '○'} Number
                </span>
                <span className={passwordStrength.rules.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}>
                  {passwordStrength.rules.hasSpecialChar ? '✓' : '○'} Special
                </span>
              </div>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.commonFields.status}
              onChange={handleCommonFieldChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Role-Specific Fields */}
      {formData.commonFields.role === 'doctor' && (
        <DoctorFields
          fields={formData.roleSpecificFields}
          onChange={handleRoleSpecificChange}
          onAvailableDaysChange={handleAvailableDaysChange}
          onTimeSlotAdd={handleTimeSlotAdd}
          onTimeSlotChange={handleTimeSlotChange}
          departments={departments}
          errors={errors}
        />
      )}

      {formData.commonFields.role === 'receptionist' && (
        <ReceptionistFields
          fields={formData.roleSpecificFields}
          onChange={handleRoleSpecificChange}
          departments={departments}
          errors={errors}
        />
      )}

      {formData.commonFields.role === 'nurse' && (
        <NurseFields
          fields={formData.roleSpecificFields}
          onChange={handleRoleSpecificChange}
          onTimeSlotChange={(field: string, value: any) => handleRoleSpecificChange({
            target: { name: field, value }
          } as any)}
          errors={errors}
        />
      )}

      {formData.commonFields.role === 'staff' && (
        <StaffFields
          fields={formData.roleSpecificFields}
          onChange={handleRoleSpecificChange}
          departments={departments}
          errors={errors}
        />
      )}

      {/* Form Actions */}
      <div className="mt-8 flex gap-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (!isEditMode && !passwordStrength.isStrong) || !!backendError}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          title={backendError ? 'Backend server is not responding. Please start the backend first.' : isEditMode ? 'Save changes' : 'Create user'}
        >
          {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save User' : 'Create User')}
        </button>
      </div>
    </form>
  );
};

// Doctor-specific fields component
const DoctorFields: React.FC<any> = ({
  fields,
  onChange,
  onAvailableDaysChange,
  onTimeSlotAdd,
  onTimeSlotChange,
  departments,
  errors
}) => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const SPECIALIZATIONS = ['General', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Psychiatry', 'Surgery', 'ENT', 'Gynecology'];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Doctor Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
          <select
            name="specialization"
            value={fields.specialization || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.specialization ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Specialization</option>
            {SPECIALIZATIONS.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          {errors.specialization && <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            name="department"
            value={fields.department || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.department ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
          {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qualification *</label>
          <input
            type="text"
            name="qualification"
            value={fields.qualification || ''}
            onChange={onChange}
            placeholder="e.g., MBBS, MD Cardiology"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.qualification ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.qualification && <p className="text-red-500 text-sm mt-1">{errors.qualification}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years) *</label>
          <input
            type="number"
            name="experience"
            min="0"
            value={fields.experience || ''}
            onChange={onChange}
            placeholder="Years of experience"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.experience ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.experience && <p className="text-red-500 text-sm mt-1">{errors.experience}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
          <input
            type="text"
            name="licenseNumber"
            value={fields.licenseNumber || ''}
            onChange={onChange}
            placeholder="License number"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry *</label>
          <input
            type="date"
            name="licenseExpiry"
            value={fields.licenseExpiry || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.licenseExpiry ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.licenseExpiry && <p className="text-red-500 text-sm mt-1">{errors.licenseExpiry}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            name="registrationNumber"
            value={fields.registrationNumber || ''}
            onChange={onChange}
            placeholder="Registration number"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.registrationNumber && <p className="text-red-500 text-sm mt-1">{errors.registrationNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fees *</label>
          <input
            type="number"
            name="consultationFees"
            min="0"
            value={fields.consultationFees || ''}
            onChange={onChange}
            placeholder="Fees in rupees"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.consultationFees ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.consultationFees && <p className="text-red-500 text-sm mt-1">{errors.consultationFees}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Available Days *</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={(fields.availableDays || []).includes(day)}
                  onChange={() => onAvailableDaysChange(day)}
                  className="rounded"
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
          {errors.availableDays && <p className="text-red-500 text-sm mt-1">{errors.availableDays}</p>}
        </div>
      </div>

      {/* Time Slots */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-700">Time Slots *</h4>
          <button
            type="button"
            onClick={onTimeSlotAdd}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            + Add Slot
          </button>
        </div>

        <div className="space-y-3">
          {(fields.timeSlots || []).map((slot: any, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
              <select
                value={slot.day}
                onChange={(e) => onTimeSlotChange(index, 'day', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => onTimeSlotChange(index, 'startTime', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => onTimeSlotChange(index, 'endTime', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                min="15"
                max="60"
                value={slot.slotDuration || 30}
                onChange={(e) => onTimeSlotChange(index, 'slotDuration', parseInt(e.target.value))}
                placeholder="Duration (min)"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          ))}
        </div>
        {errors.timeSlots && <p className="text-red-500 text-sm mt-1">{errors.timeSlots}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Bio (Optional)</label>
        <textarea
          name="bio"
          value={fields.bio || ''}
          onChange={onChange}
          placeholder="Brief biography"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

// Receptionist-specific fields component
const ReceptionistFields: React.FC<any> = ({
  fields,
  onChange,
  departments,
  errors
}) => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Receptionist Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start Time *</label>
          {(() => {
            const start = parseTimeTo12Hour(fields.shiftTiming?.startTime);
            const shiftTiming = fields.shiftTiming || {};

            const updateStartTime = (hour: string, minute: string, period: string) => {
              shiftTiming.startTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={start.hour}
                  onChange={(e) => updateStartTime(e.target.value, start.minute, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={start.minute}
                  onChange={(e) => updateStartTime(start.hour, e.target.value, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={start.period}
                  onChange={(e) => updateStartTime(start.hour, start.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift End Time *</label>
          {(() => {
            const end = parseTimeTo12Hour(fields.shiftTiming?.endTime);
            const shiftTiming = fields.shiftTiming || {};

            const updateEndTime = (hour: string, minute: string, period: string) => {
              shiftTiming.endTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={end.hour}
                  onChange={(e) => updateEndTime(e.target.value, end.minute, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={end.minute}
                  onChange={(e) => updateEndTime(end.hour, e.target.value, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={end.period}
                  onChange={(e) => updateEndTime(end.hour, end.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Experience (Years) *</label>
          <input
            type="number"
            name="workExperience"
            min="0"
            value={fields.workExperience || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.workExperience ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.workExperience && <p className="text-red-500 text-sm mt-1">{errors.workExperience}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
          <select
            name="department"
            value={fields.department || ''}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Days *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fields.shiftTiming?.daysOfWeek?.includes(day) || false}
                  onChange={() => {
                    const shiftTiming = fields.shiftTiming || {};
                    const days = shiftTiming.daysOfWeek || [];
                    if (days.includes(day)) {
                      shiftTiming.daysOfWeek = days.filter((d: string) => d !== day);
                    } else {
                      shiftTiming.daysOfWeek = [...days, day];
                    }
                    onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                {day}
              </label>
            ))}
          </div>
          {errors.daysOfWeek && <p className="text-red-500 text-sm mt-1">{errors.daysOfWeek}</p>}
        </div>
      </div>
      {errors.shiftTiming && <p className="text-red-500 text-sm mt-2">{errors.shiftTiming}</p>}
    </div>
  );
};

// Nurse-specific fields component
const NurseFields: React.FC<any> = ({
  fields,
  onChange,
  onTimeSlotChange,
  errors
}) => {
  const QUALIFICATIONS = ['GNM', 'BSc Nursing', 'MSc Nursing', 'Diploma Nursing', 'ANM'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Nurse Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qualification *</label>
          <select
            name="qualification"
            value={fields.qualification || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.qualification ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Qualification</option>
            {QUALIFICATIONS.map(qual => (
              <option key={qual} value={qual}>{qual}</option>
            ))}
          </select>
          {errors.qualification && <p className="text-red-500 text-sm mt-1">{errors.qualification}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            name="registrationNumber"
            value={fields.registrationNumber || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.registrationNumber && <p className="text-red-500 text-sm mt-1">{errors.registrationNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years) *</label>
          <input
            type="number"
            name="experience"
            min="0"
            value={fields.experience || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.experience ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.experience && <p className="text-red-500 text-sm mt-1">{errors.experience}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
          <input
            type="text"
            name="specialization"
            value={fields.specialization || 'General'}
            onChange={onChange}
            placeholder="e.g., ICU, Emergency"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start Time *</label>
          {(() => {
            const start = parseTimeTo12Hour(fields.shiftTiming?.startTime);
            const shiftTiming = fields.shiftTiming || {};
            const updateStartTime = (hour: string, minute: string, period: string) => {
              shiftTiming.startTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={start.hour}
                  onChange={(e) => updateStartTime(e.target.value, start.minute, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={start.minute}
                  onChange={(e) => updateStartTime(start.hour, e.target.value, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={start.period}
                  onChange={(e) => updateStartTime(start.hour, start.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift End Time *</label>
          {(() => {
            const end = parseTimeTo12Hour(fields.shiftTiming?.endTime);
            const shiftTiming = fields.shiftTiming || {};
            const updateEndTime = (hour: string, minute: string, period: string) => {
              shiftTiming.endTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={end.hour}
                  onChange={(e) => updateEndTime(e.target.value, end.minute, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={end.minute}
                  onChange={(e) => updateEndTime(end.hour, e.target.value, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={end.period}
                  onChange={(e) => updateEndTime(end.hour, end.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Days *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fields.shiftTiming?.daysOfWeek?.includes(day) || false}
                  onChange={() => {
                    const shiftTiming = fields.shiftTiming || {};
                    const days = shiftTiming.daysOfWeek || [];
                    if (days.includes(day)) {
                      shiftTiming.daysOfWeek = days.filter((d: string) => d !== day);
                    } else {
                      shiftTiming.daysOfWeek = [...days, day];
                    }
                    onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                {day}
              </label>
            ))}
          </div>
          {errors.daysOfWeek && <p className="text-red-500 text-sm mt-1">{errors.daysOfWeek}</p>}
        </div>
      </div>
      {errors.shiftTiming && <p className="text-red-500 text-sm mt-2">{errors.shiftTiming}</p>}
    </div>
  );
};

const StaffFields: React.FC<any> = ({
  fields,
  onChange,
  departments,
  errors
}) => {
  const JOB_TITLES = [
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
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Staff Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
          <select
            name="jobTitle"
            value={fields.jobTitle || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.jobTitle ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Job Title</option>
            {JOB_TITLES.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
          {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Experience (Years) *</label>
          <input
            type="number"
            name="workExperience"
            min="0"
            value={fields.workExperience || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.workExperience ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.workExperience && <p className="text-red-500 text-sm mt-1">{errors.workExperience}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            name="employmentType"
            value={fields.employmentType || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.employmentType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Employment Type</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Temporary">Temporary</option>
          </select>
          {errors.employmentType && <p className="text-red-500 text-sm mt-1">{errors.employmentType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
          <select
            name="department"
            value={fields.department || ''}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start Time</label>
          {(() => {
            const start = parseTimeTo12Hour(fields.shiftTiming?.startTime);
            const shiftTiming = fields.shiftTiming || {};
            const updateStartTime = (hour: string, minute: string, period: string) => {
              shiftTiming.startTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={start.hour}
                  onChange={(e) => updateStartTime(e.target.value, start.minute, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={start.minute}
                  onChange={(e) => updateStartTime(start.hour, e.target.value, start.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={start.period}
                  onChange={(e) => updateStartTime(start.hour, start.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift End Time</label>
          {(() => {
            const end = parseTimeTo12Hour(fields.shiftTiming?.endTime);
            const shiftTiming = fields.shiftTiming || {};
            const updateEndTime = (hour: string, minute: string, period: string) => {
              shiftTiming.endTime = build24HourTime(hour, minute, period);
              onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
            };

            return (
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={end.hour}
                  onChange={(e) => updateEndTime(e.target.value, end.minute, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {HOUR_OPTIONS.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={end.minute}
                  onChange={(e) => updateEndTime(end.hour, e.target.value, end.period)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MINUTE_OPTIONS.map(minute => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  value={end.period}
                  onChange={(e) => updateEndTime(end.hour, end.minute, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            );
          })()}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Days</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fields.shiftTiming?.daysOfWeek?.includes(day) || false}
                  onChange={() => {
                    const shiftTiming = fields.shiftTiming || {};
                    const days = shiftTiming.daysOfWeek || [];
                    if (days.includes(day)) {
                      shiftTiming.daysOfWeek = days.filter((d: string) => d !== day);
                    } else {
                      shiftTiming.daysOfWeek = [...days, day];
                    }
                    onChange({ target: { name: 'shiftTiming', value: shiftTiming } } as any);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                {day}
              </label>
            ))}
          </div>
          {errors.daysOfWeek && <p className="text-red-500 text-sm mt-1">{errors.daysOfWeek}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
          <input
            type="tel"
            name="emergencyContactPhone"
            value={fields.emergencyContactPhone || ''}
            onChange={onChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.emergencyContactPhone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.emergencyContactPhone && <p className="text-red-500 text-sm mt-1">{errors.emergencyContactPhone}</p>}
        </div>
      </div>
      {errors.shiftTiming && <p className="text-red-500 text-sm mt-2">{errors.shiftTiming}</p>}
    </div>
  );
};
