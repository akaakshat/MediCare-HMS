// frontend/src/components/modules/admin/FeatureAccessSelector.tsx
// Component to select and manage feature access for users with role-based categorization

import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ApiClient } from '../../../utils/api';

interface Feature {
  _id: string;
  name: string;
  description: string;
  type: string;
  category?: string;
}

interface FeatureCategory {
  category: string;
  features: Feature[];
}

interface FeaturePreset {
  id: string;
  name: string;
  role: string;
  features: string[];
  createdAt: string;
}

interface FeatureAccessSelectorProps {
  selectedRole: string;
  selectedFeatures: string[];
  onChange: (featureIds: string[]) => void;
  errors: any;
  userId?: string; // For viewing existing user's features
  mode?: 'edit' | 'view'; // edit mode = can change, view mode = readonly
}

export const FeatureAccessSelector: React.FC<FeatureAccessSelectorProps> = ({
  selectedRole,
  selectedFeatures,
  onChange,
  errors,
  userId,
  mode = 'edit'
}) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [grantedFeatures, setGrantedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [savedPresets, setSavedPresets] = useState<FeaturePreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const FEATURE_DRAFT_STORAGE_KEY = 'clinic-user-feature-draft-v1';
  const FEATURE_PRESETS_STORAGE_KEY = 'clinic-user-feature-presets-v1';

  // Role-based feature recommendations
  const ROLE_FEATURE_RECOMMENDATIONS: { [key: string]: string[] } = {
    doctor: [
      'patients',
      'patient_records',
      'patient_list',
      'appointments',
      'appointment_view',
      'emr',
      'emr_view',
      'emr_create',
      'emr_update',
      'prescriptions',
      'case_sheets',
      'patient_vitals',
      'lab_results',
      'care_plans',
      'icd_codes',
      'dashboard'
    ],
    receptionist: [
      'patients',
      'patient_list',
      'patient_create',
      'appointments',
      'appointment_create',
      'appointment_modify',
      'appointment_view',
      'appointment_cancel',
      'doctor_schedule',
      'doctors',
      'billing_view',
      'dashboard'
    ],
    nurse: [
      'patients',
      'patient_records',
      'patient_vitals',
      'appointments',
      'appointment_view',
      'emr',
      'emr_view',
      'prescriptions',
      'case_sheets',
      'patient_vitals',
      'lab_results',
      'care_plans',
      'dashboard'
    ],
    staff: [
      'patients',
      'patient_list',
      'appointments',
      'appointment_view',
      'emr',
      'emr_view',
      'dashboard'
    ],
    admin: [] // Admin gets all features
  };

  // Categorize features
  const categorizeFeatures = (featureList: Feature[]): FeatureCategory[] => {
    const categoryMap: { [key: string]: Feature[] } = {};

    featureList.forEach(feature => {
      let category = 'Other';

      if (feature._id.includes('patient')) {
        category = 'Patient Management';
      } else if (feature._id.includes('appointment')) {
        category = 'Appointments';
      } else if (feature._id.includes('emr')) {
        category = 'Electronic Medical Records';
      } else if (feature._id.includes('prescription')) {
        category = 'Prescriptions';
      } else if (feature._id.includes('doctor')) {
        category = 'Doctor Management';
      } else if (feature._id.includes('pharmacy') || feature._id.includes('medication') || feature._id.includes('inventory')) {
        category = 'Pharmacy & Inventory';
      } else if (feature._id.includes('billing') || feature._id.includes('payment')) {
        category = 'Billing & Payments';
      } else if (feature._id.includes('icd')) {
        category = 'ICD Management';
      } else if (feature._id.includes('lab') || feature._id.includes('vital') || feature._id.includes('care_plan')) {
        category = 'Clinical Data';
      } else if (feature._id.includes('report') || feature._id.includes('analytic')) {
        category = 'Reports & Analytics';
      } else if (feature._id.includes('user') || feature._id.includes('clinic_user')) {
        category = 'User Management';
      } else if (feature._id === 'dashboard' || feature._id === 'settings' || feature._id === 'audit_logs') {
        category = 'System & Administration';
      }

      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(feature);
    });

    return Object.entries(categoryMap)
      .map(([category, features]) => ({ category, features }))
      .sort((a, b) => a.category.localeCompare(b.category));
  };

  // Fetch available features
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoading(true);
        let response = await ApiClient.get('/masters/feature_access');
        if (!response?.success) {
          throw new Error('Failed to load feature access');
        }
        setFeatures(response?.data || []);
      } catch (error: any) {
        console.error('Error fetching features:', error);
        if (
          error?.status === 400 ||
          error?.status === 404 ||
          String(error?.message).toLowerCase().includes('invalid master type')
        ) {
          try {
            const fallback = await ApiClient.get('/masters/feature');
            setFeatures(fallback?.data || []);
            return;
          } catch (fallbackError) {
            console.warn('Fallback feature route failed:', fallbackError);
          }
        }

        // Set default features if fetch fails
        setFeatures([
          { _id: 'patients', name: 'Patient Management', description: 'Access patient records, create, update, and view patient information', type: 'feature_access' },
          { _id: 'patient_records', name: 'Patient Records', description: 'Access patient records and history', type: 'feature_access' },
          { _id: 'patient_list', name: 'Patient List', description: 'View patient list and basic information', type: 'feature_access' },
          { _id: 'patient_create', name: 'Create Patients', description: 'Create new patient records', type: 'feature_access' },
          { _id: 'patient_modify', name: 'Modify Patients', description: 'Update existing patient information', type: 'feature_access' },
          { _id: 'patient_delete', name: 'Delete Patients', description: 'Delete patient records', type: 'feature_access' },
          { _id: 'appointments', name: 'Appointment Management', description: 'Manage appointments, scheduling, and calendar', type: 'feature_access' },
          { _id: 'appointment_create', name: 'Create Appointments', description: 'Schedule new appointments', type: 'feature_access' },
          { _id: 'appointment_modify', name: 'Modify Appointments', description: 'Update and reschedule appointments', type: 'feature_access' },
          { _id: 'appointment_view', name: 'View Appointments', description: 'View appointment schedules and details', type: 'feature_access' },
          { _id: 'appointment_cancel', name: 'Cancel Appointments', description: 'Cancel existing appointments', type: 'feature_access' },
          { _id: 'doctors', name: 'Doctor Management', description: 'Manage doctor profiles, schedules, and availability', type: 'feature_access' },
          { _id: 'doctor_schedule', name: 'Doctor Scheduling', description: 'Manage doctor availability and time slots', type: 'feature_access' },
          { _id: 'doctor_management', name: 'Doctor Administration', description: 'Full doctor profile management', type: 'feature_access' },
          { _id: 'emr', name: 'Electronic Medical Records', description: 'Access and manage electronic medical records', type: 'feature_access' },
          { _id: 'emr_view', name: 'View EMR', description: 'View patient medical records', type: 'feature_access' },
          { _id: 'emr_create', name: 'Create EMR', description: 'Create new medical records', type: 'feature_access' },
          { _id: 'emr_update', name: 'Update EMR', description: 'Update existing medical records', type: 'feature_access' },
          { _id: 'emr_delete', name: 'Delete EMR', description: 'Delete medical records', type: 'feature_access' },
          { _id: 'pharmacy', name: 'Pharmacy Management', description: 'Manage medications, inventory, and prescriptions', type: 'feature_access' },
          { _id: 'pharmacy_view', name: 'View Pharmacy', description: 'View pharmacy inventory and medications', type: 'feature_access' },
          { _id: 'pharmacy_create', name: 'Create Pharmacy Items', description: 'Add new medications to inventory', type: 'feature_access' },
          { _id: 'pharmacy_update', name: 'Update Pharmacy', description: 'Update medication information and stock', type: 'feature_access' },
          { _id: 'pharmacy_delete', name: 'Delete Pharmacy Items', description: 'Remove medications from inventory', type: 'feature_access' },
          { _id: 'medications', name: 'Medications', description: 'Manage patient medications and prescriptions', type: 'feature_access' },
          { _id: 'inventory', name: 'Inventory', description: 'Manage pharmacy inventory and stock levels', type: 'feature_access' },
          { _id: 'billing', name: 'Billing & Payments', description: 'Manage billing, payments, and financial records', type: 'feature_access' },
          { _id: 'billing_view', name: 'View Billing', description: 'View billing information and payment history', type: 'feature_access' },
          { _id: 'billing_create', name: 'Create Bills', description: 'Create new billing records', type: 'feature_access' },
          { _id: 'billing_modify', name: 'Modify Billing', description: 'Update billing information', type: 'feature_access' },
          { _id: 'payments', name: 'Payment Processing', description: 'Process and manage payments', type: 'feature_access' },
          { _id: 'icd', name: 'ICD Management', description: 'Manage ICD codes and classifications', type: 'feature_access' },
          { _id: 'icd_view', name: 'View ICD', description: 'View ICD codes and descriptions', type: 'feature_access' },
          { _id: 'icd_manage', name: 'Manage ICD', description: 'Create and update ICD codes', type: 'feature_access' },
          { _id: 'icd_codes', name: 'ICD Codes', description: 'Access ICD code database', type: 'feature_access' },
          { _id: 'reports', name: 'Reports & Analytics', description: 'Access reports, analytics, and performance metrics', type: 'feature_access' },
          { _id: 'reports_view', name: 'View Reports', description: 'View system reports and analytics', type: 'feature_access' },
          { _id: 'analytics', name: 'Analytics', description: 'Access advanced analytics and insights', type: 'feature_access' },
          { _id: 'case_sheets', name: 'Case Sheets', description: 'Manage patient case sheets and documentation', type: 'feature_access' },
          { _id: 'prescriptions', name: 'Prescriptions', description: 'Manage patient prescriptions', type: 'feature_access' },
          { _id: 'lab_results', name: 'Lab Results', description: 'View and manage laboratory test results', type: 'feature_access' },
          { _id: 'care_plans', name: 'Care Plans', description: 'Create and manage patient care plans', type: 'feature_access' },
          { _id: 'patient_vitals', name: 'Patient Vitals', description: 'Record and monitor patient vital signs', type: 'feature_access' },
          { _id: 'clinic_users', name: 'Clinic User Management', description: 'Manage clinic staff and user accounts', type: 'feature_access' },
          { _id: 'user_management', name: 'User Administration', description: 'Full user account management', type: 'feature_access' },
          { _id: 'settings', name: 'System Settings', description: 'Access system configuration and settings', type: 'feature_access' },
          { _id: 'audit_logs', name: 'Audit Logs', description: 'View system audit logs and activity', type: 'feature_access' },
          { _id: 'dashboard', name: 'Dashboard Access', description: 'Access main dashboard and overview', type: 'feature_access' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedRole) {
      fetchFeatures();
    }
  }, [selectedRole]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEATURE_PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPresets(parsed);
        }
      }
    } catch (error) {
      console.warn('Unable to load saved feature presets:', error);
    }
  }, []);

  useEffect(() => {
    if (!selectedRole) return;

    try {
      const draftKey = `${FEATURE_DRAFT_STORAGE_KEY}:${selectedRole}`;
      const storedDraft = localStorage.getItem(draftKey);
      if (storedDraft) {
        const parsedDraft = JSON.parse(storedDraft);
        if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
          const normalizedDraft = [...new Set(parsedDraft.filter(Boolean))];
          const hasChanged = normalizedDraft.length !== selectedFeatures.length || normalizedDraft.some((feature, index) => feature !== selectedFeatures[index]);
          if (hasChanged) {
            onChange(normalizedDraft);
          }
        }
      }
    } catch (error) {
      console.warn('Unable to restore saved feature draft:', error);
    }
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedRole) return;

    try {
      const draftKey = `${FEATURE_DRAFT_STORAGE_KEY}:${selectedRole}`;
      localStorage.setItem(draftKey, JSON.stringify(selectedFeatures));
    } catch (error) {
      console.warn('Unable to save feature draft:', error);
    }
  }, [selectedRole, selectedFeatures]);

  // Fetch user's granted features if userId provided
  useEffect(() => {
    const fetchUserFeatures = async () => {
      if (!userId) return;

      try {
        const response = await ApiClient.getUserFeatures(userId);

        if (response?.success && Array.isArray(response?.data)) {
          const allFeatures: string[] = [];
          response.data.forEach((record: any) => {
            if (record.features && Array.isArray(record.features)) {
              allFeatures.push(...record.features);
            }
          });
          setGrantedFeatures([...new Set(allFeatures)]);
        }
      } catch (error) {
        console.error('Error fetching user features:', error);
      }
    };

    if (mode === 'view' && userId) {
      fetchUserFeatures();
    }
  }, [userId, mode]);

  const toggleFeature = (featureId: string) => {
    if (selectedFeatures.includes(featureId)) {
      onChange(selectedFeatures.filter(f => f !== featureId));
    } else {
      onChange([...selectedFeatures, featureId]);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const persistPresets = (nextPresets: FeaturePreset[]) => {
    setSavedPresets(nextPresets);
    localStorage.setItem(FEATURE_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
  };

  const saveCurrentSelectionAsPreset = () => {
    if (!selectedRole || selectedFeatures.length === 0) return;

    const trimmedName = presetName.trim() || `${selectedRole} access`;
    const newPreset: FeaturePreset = {
      id: `${selectedRole}-${Date.now()}`,
      name: trimmedName,
      role: selectedRole,
      features: [...selectedFeatures],
      createdAt: new Date().toISOString()
    };

    const nextPresets = [newPreset, ...savedPresets.filter(preset => preset.id !== newPreset.id)].slice(0, 8);
    persistPresets(nextPresets);
    setPresetName('');
    setSelectedPresetId(newPreset.id);
  };

  const applyPreset = (presetId: string) => {
    const preset = savedPresets.find(item => item.id === presetId);
    if (!preset) return;

    onChange([...preset.features]);
    setSelectedPresetId(preset.id);
  };

  const deletePreset = (presetId: string) => {
    const nextPresets = savedPresets.filter(item => item.id !== presetId);
    persistPresets(nextPresets);
    if (selectedPresetId === presetId) {
      setSelectedPresetId('');
    }
  };

  if (!selectedRole) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">Select a role first to assign features</p>
      </div>
    );
  }

  // In view mode, show only granted features
  if (mode === 'view') {
    const categorized = categorizeFeatures(features.filter(f => grantedFeatures.includes(f._id)));
    
    return (
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-800">Granted Features</h4>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading features...</p>
        ) : grantedFeatures.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <AlertCircle size={16} />
              <span><strong>No features granted.</strong> User will see "No access granted" message.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {categorized.map(({ category, features: catFeatures }) => (
              <div key={category} className="border border-green-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-3">
                  <h5 className="font-semibold text-sm text-gray-800">{category}</h5>
                  <p className="text-xs text-gray-500">{catFeatures.length} features</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-white">
                  {catFeatures.map(feature => (
                    <div
                      key={feature._id}
                      className="flex items-start p-2 bg-green-50 border border-green-200 rounded"
                    >
                      <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-gray-800">{feature.name}</div>
                        <div className="text-xs text-gray-500">{feature.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Total Granted:</strong> {grantedFeatures.length} feature{grantedFeatures.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  // In edit mode, show all available features with role-based recommendations
  const categorized = categorizeFeatures(features);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <p className="text-sm text-blue-800 mb-3">
          <strong>Individual feature access:</strong> Choose each feature one by one. The current selection is saved automatically for this role and can be reused later.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr] gap-3">
          <input
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Name this access bundle"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={saveCurrentSelectionAsPreset}
            disabled={selectedFeatures.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save as preset
          </button>
        </div>

        {savedPresets.filter(preset => preset.role === selectedRole).length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-2 items-center">
            <select
              value={selectedPresetId}
              onChange={(event) => applyPreset(event.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
            >
              <option value="">Select a saved preset</option>
              {savedPresets
                .filter(preset => preset.role === selectedRole)
                .map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => selectedPresetId && deletePreset(selectedPresetId)}
              disabled={!selectedPresetId}
              className="px-3 py-2 border border-red-200 text-red-600 text-sm rounded hover:bg-red-50 transition disabled:text-gray-400 disabled:border-gray-200"
            >
              Delete
            </button>
            <span className="text-xs text-blue-700">Saved presets stay in this browser.</span>
          </div>
        )}
      </div>

      {errors.features && (
        <div className="flex items-center text-red-500 text-sm mb-3">
          <AlertCircle size={14} className="mr-2" />
          {errors.features}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
        {loading ? (
          <p className="text-gray-500 text-sm col-span-2">Loading features...</p>
        ) : features.length === 0 ? (
          <p className="text-gray-500 text-sm col-span-2">No features available</p>
        ) : (
          categorized.map(({ category, features: catFeatures }) => (
            <div key={category} className="border border-gray-300 rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  {expandedCategories.has(category) ? (
                    <ChevronDown size={18} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-600" />
                  )}
                  <div className="text-left">
                    <h5 className="font-semibold text-sm text-gray-800">{category}</h5>
                    <p className="text-xs text-gray-500">{catFeatures.length} features</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {selectedFeatures.filter(f => catFeatures.map(c => c._id).includes(f)).length}/{catFeatures.length}
                </div>
              </button>

              {expandedCategories.has(category) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  {catFeatures.map(feature => (
                    <label
                      key={feature._id}
                      className={`flex items-start p-3 border rounded cursor-pointer transition ${
                        selectedFeatures.includes(feature._id)
                          ? 'bg-blue-50 border-blue-400 shadow-sm'
                          : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(feature._id)}
                        onChange={() => toggleFeature(feature._id)}
                        className="mt-1 mr-3 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-800">{feature.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{feature.description}</div>
                      </div>
                      {selectedFeatures.includes(feature._id) && (
                        <Check size={16} className="text-green-600 ml-2 mt-1 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={`p-3 border rounded flex items-center justify-between ${
        selectedFeatures.length === 0 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div>
          <p className={`text-sm font-semibold ${
            selectedFeatures.length === 0 
              ? 'text-orange-800' 
              : 'text-green-800'
          }`}>
            Selected: {selectedFeatures.length} feature{selectedFeatures.length !== 1 ? 's' : ''}
          </p>
          {selectedFeatures.length === 0 && (
            <p className="text-xs text-orange-700 mt-1">
              ⚠️ No features selected - user will have NO access
            </p>
          )}
        </div>
        {selectedFeatures.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
            title="Remove all selected features"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
