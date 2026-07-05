// frontend/src/components/modules/admin/StaffFields.tsx
// Staff-specific form fields component

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface StaffFieldsProps {
  data: any;
  errors: any;
  departments: any[];
  onChange: (field: string, value: any) => void;
}

export const StaffFields: React.FC<StaffFieldsProps> = ({
  data,
  errors,
  departments,
  onChange
}) => {
  const jobTitles = [
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

  const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary'];

  return (
    <div className="space-y-6 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-800">Staff Profile</h3>

      {/* Job Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Title <span className="text-red-500">*</span>
        </label>
        <select
          value={data.jobTitle || ''}
          onChange={(e) => onChange('jobTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Job Title</option>
          {jobTitles.map(title => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
        {errors.jobTitle && (
          <div className="mt-1 flex items-center text-red-500 text-sm">
            <AlertCircle size={14} className="mr-1" />
            {errors.jobTitle}
          </div>
        )}
      </div>

      {/* Employment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employment Type
        </label>
        <select
          value={data.employmentType || 'Full-time'}
          onChange={(e) => onChange('employmentType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {employmentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Work Experience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Work Experience (years) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="0"
          value={data.workExperience || ''}
          onChange={(e) => onChange('workExperience', parseInt(e.target.value) || 0)}
          placeholder="Enter years of experience"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.workExperience && (
          <div className="mt-1 flex items-center text-red-500 text-sm">
            <AlertCircle size={14} className="mr-1" />
            {errors.workExperience}
          </div>
        )}
      </div>

      {/* Department (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Department (Optional)
        </label>
        <select
          value={data.department || ''}
          onChange={(e) => onChange('department', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Department</option>
          {departments?.map(dept => (
            <option key={dept._id} value={dept._id}>{dept.name}</option>
          ))}
        </select>
      </div>

      {/* Shift Timing */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shift Start Time
          </label>
          <input
            type="time"
            value={data.shiftTiming?.startTime || ''}
            onChange={(e) => onChange('shiftTiming', {
              ...data.shiftTiming,
              startTime: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shift End Time
          </label>
          <input
            type="time"
            value={data.shiftTiming?.endTime || ''}
            onChange={(e) => onChange('shiftTiming', {
              ...data.shiftTiming,
              endTime: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Days of Work
          </label>
          <select
            multiple
            value={data.shiftTiming?.daysOfWeek || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onChange('shiftTiming', {
                ...data.shiftTiming,
                daysOfWeek: selected
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skills (comma-separated)
        </label>
        <textarea
          value={data.skills?.join(', ') || ''}
          onChange={(e) => onChange('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="e.g., Data Entry, Patient Care, Filing"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Emergency Contact */}
      <div className="grid grid-cols-3 gap-4 border-t pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Contact Name
          </label>
          <input
            type="text"
            value={data.emergencyContactName || ''}
            onChange={(e) => onChange('emergencyContactName', e.target.value)}
            placeholder="Contact name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Contact Phone
          </label>
          <input
            type="tel"
            value={data.emergencyContactPhone || ''}
            onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
            placeholder="+91-XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.emergencyContactPhone && (
            <div className="mt-1 flex items-center text-red-500 text-sm">
              <AlertCircle size={14} className="mr-1" />
              {errors.emergencyContactPhone}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relation
          </label>
          <input
            type="text"
            value={data.emergencyContactRelation || ''}
            onChange={(e) => onChange('emergencyContactRelation', e.target.value)}
            placeholder="e.g., Brother, Friend"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Remarks
        </label>
        <textarea
          value={data.remarks || ''}
          onChange={(e) => onChange('remarks', e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
