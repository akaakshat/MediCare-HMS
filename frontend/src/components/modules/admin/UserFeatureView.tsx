// frontend/src/components/modules/admin/UserFeatureView.tsx
// Component to display user's granted features in a modal or card

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiClient } from '../../../utils/api';

interface UserFeatureViewProps {
  userId: string;
  userName: string;
  userRole: string;
  onClose?: () => void;
  isOpen?: boolean;
}

interface UserFeatures {
  features: string[];
  grantedAt?: string;
  grantedBy?: string;
}

const featureMetadata: { [key: string]: { name: string; description: string } } = {
  'patient_records': { name: 'Patient Records', description: 'Access patient records and history' },
  'prescriptions': { name: 'Prescriptions', description: 'Manage prescriptions' },
  'appointments': { name: 'Appointments', description: 'Manage appointments' },
  'billing': { name: 'Billing', description: 'Manage billing and payments' },
  'patient_vitals': { name: 'Patient Vitals', description: 'Record patient vitals' },
  'lab_results': { name: 'Lab Results', description: 'View lab results' },
  'care_plans': { name: 'Care Plans', description: 'Create and manage care plans' },
  'medications': { name: 'Medications', description: 'Manage medications' },
  'patient_list': { name: 'Patient List', description: 'View patient list' },
  'reports': { name: 'Reports', description: 'Access reports and analytics' }
};

export const UserFeatureView: React.FC<UserFeatureViewProps> = ({
  userId,
  userName,
  userRole,
  onClose,
  isOpen = true
}) => {
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserFeatures();
    }
  }, [isOpen, userId]);

  const fetchUserFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getUserFeatures(userId);
      
      if (response?.success && Array.isArray(response?.data)) {
        // API returns array of feature_access records
        // Merge all features from all records
        const allFeatures: string[] = [];
        response.data.forEach((record: any) => {
          if (record.features && Array.isArray(record.features)) {
            allFeatures.push(...record.features);
          }
        });
        // Remove duplicates
        setFeatures([...new Set(allFeatures)]);
      } else {
        setFeatures([]);
      }
    } catch (err) {
      console.error('Error fetching user features:', err);
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Role: <span className="font-medium capitalize">{userRole}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Granted Features</h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading features...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          ) : features.length === 0 ? (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <AlertCircle size={32} className="mx-auto text-yellow-600 mb-2" />
              <p className="text-yellow-800 font-medium">No features granted</p>
              <p className="text-yellow-700 text-sm mt-1">
                This user has not been granted any features. They will see "No access granted" message on login.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map(featureId => {
                const feature = featureMetadata[featureId] || {
                  name: featureId,
                  description: 'Custom feature'
                };
                return (
                  <div
                    key={featureId}
                    className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg flex items-start gap-3"
                  >
                    <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{feature.name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {features.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total:</strong> {features.length} feature{features.length !== 1 ? 's' : ''} granted
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
