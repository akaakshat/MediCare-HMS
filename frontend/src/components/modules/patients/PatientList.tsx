import { useState, useEffect, useContext } from 'react';
import { Search, Plus, Eye, Edit, Trash2, ArrowLeft, Phone, Mail, MapPin, X, Loader2 } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { MDMDropdown } from '../../ui/mdm-dropdown';
import { Permissions } from '../../../config/permissions';
import { formatDateDDMMYYYY } from '../../../utils/date';

interface PatientListProps {
  onBack: () => void;
}

interface Patient {
  _id: string;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  genderId?: any;
  phone: string;
  email?: string;
  address?: string;
  lastVisit?: string;
  status: string;
  isInactive?: boolean;
  lastActivityDate?: string;
}

export function PatientList({ onBack }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhoneMatchModal, setShowPhoneMatchModal] = useState(false);
  const [phoneMatchedPatients, setPhoneMatchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    genderId: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active'
  });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, showInactive]);

  useEffect(() => {
    loadPatients();
  }, [page, limit, debouncedSearch, showInactive]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getPatients({
        page,
        limit,
        search: debouncedSearch,
        includeInactive: showInactive ? true : undefined
      });
      setPatients(response.patients || []);
      setTotal(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load patients');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const formatted = formatDateDDMMYYYY(dateString);
    return formatted === '-' ? dateString : formatted;
  };

  const handlePhoneBlur = async () => {
    if (!formData.phone.trim()) return;
    try {
      const response: any = await ApiClient.checkPhone(formData.phone.trim());
      if (response.exists) {
        setPhoneMatchedPatients(response.patients || []);
        setShowPhoneMatchModal(true);
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    }
  };

  const handleSelectExistingPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      genderId: typeof patient.genderId === 'string' ? patient.genderId : patient.genderId?._id || '',
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
      status: patient.status
    });
    setShowPhoneMatchModal(false);
    toast.success(`Selected existing patient UHID ${patient.uhid}`);
  };

  const handleContinueNewRegistration = () => {
    setShowPhoneMatchModal(false);
    toast.success('Continue new patient registration');
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedPatient && selectedPatient.phone === formData.phone.trim()) {
        // If existing patient was selected, update that record instead
        const payload: any = { ...formData, age: parseInt(formData.age) };
        // Do not send fallback genderId values to backend - send gender name instead
        if (payload.genderId && String(payload.genderId).startsWith('fallback-')) {
          delete payload.genderId;
        }
        await ApiClient.updatePatient(selectedPatient._id, payload);
        toast.success(`Existing patient ${selectedPatient.uhid} updated successfully`);
      } else {
        const payload: any = {
          ...formData,
          age: parseInt(formData.age),
          lastVisit: new Date().toISOString().split('T')[0]
        };
        if (payload.genderId && String(payload.genderId).startsWith('fallback-')) {
          delete payload.genderId;
        }
        const response = await ApiClient.createPatient(payload);
        if (response.warning) {
          toast.warning(response.warning);
        }
        toast.success('Patient added successfully');
      }

      setShowAddModal(false);
      setSelectedPatient(null);
      setFormData({ name: '', age: '', gender: 'Male', genderId: '', phone: '', email: '', address: '', status: 'Active' });
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add patient');
    }
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    try {
      // Backend expects the Mongo _id in the URL (not UHID)
      const payload: any = { ...formData, age: parseInt(formData.age) };
      if (payload.genderId && String(payload.genderId).startsWith('fallback-')) {
        delete payload.genderId;
      }
      await ApiClient.updatePatient(selectedPatient._id, payload);
      toast.success('Patient updated successfully');
      setShowEditModal(false);
      setSelectedPatient(null);
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update patient');
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    
    try {
      // Backend expects the Mongo _id in the URL (not UHID)
      await ApiClient.deletePatient(id);
      toast.success('Patient deleted successfully');
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete patient');
    }
  };

  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
      genderId: typeof patient.genderId === 'string'
        ? patient.genderId
        : patient.genderId?._id || '',
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
      status: patient.status
    });
    setShowEditModal(true);
  };

  const openViewModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Patient Management</h2>
            <p className="text-sm text-gray-500">Manage all patient records</p>
          </div>
        </div>
        {Permissions.patientCreate.includes(user?.role || '') && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Patient
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm flex-1"
              />
            </div>
            {user?.role === 'admin' && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={showInactive}
                  onChange={() => setShowInactive(!showInactive)}
                />
                Show inactive patients
              </label>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading patients...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm text-gray-600">UHID</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Patient Name</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Age</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Gender</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Phone</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Last Visit</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Last Active</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.uhid} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{patient.uhid}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{patient.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{patient.age}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{patient.gender}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{patient.phone}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(patient.lastVisit)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(patient.lastActivityDate)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${patient.isInactive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {patient.isInactive ? 'Inactive' : (patient.status || 'Active')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openViewModal(patient)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {Permissions.patientModify.includes(user?.role || '') && (
                            <>
                              <button 
                                onClick={() => openEditModal(patient)}
                                className="p-1 hover:bg-yellow-50 rounded text-yellow-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {Permissions.patientDelete.includes(user?.role || '') && (
                            <button 
                              onClick={() => handleDeletePatient(patient._id)}
                              className="p-1 hover:bg-red-50 rounded text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {patients.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No patients found</p>
                </div>
              )}
            </div>

            {patients.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {patients.length} of {total} patients
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="text-sm border rounded-lg px-2 py-1"
                  >
                    {[10, 20, 50, 100].map((l) => (
                      <option key={l} value={l}>
                        {l} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Add New Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Age *</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <MDMDropdown
                    label="Gender *"
                    masterType="gender"
                    value={formData.genderId || null}
                    onChange={(value, option) =>
                      setFormData({
                        ...formData,
                        genderId: value || '',
                        gender: option?.name || formData.gender,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={handlePhoneBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone-match popup when phone already exists */}
      {showPhoneMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-900">Phone number already registered</h3>
              <button onClick={() => setShowPhoneMatchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">The phone number <strong>{formData.phone}</strong> is already linked to the following UHID(s). Select one to load the patient, or close to continue new registration.</p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {phoneMatchedPatients.map((patient) => (
                <div key={patient._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-semibold">{patient.name} ({patient.uhid})</p>
                    <p className="text-xs text-gray-500">{patient.gender}, age {patient.age}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectExistingPatient(patient)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Select Patient
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleContinueNewRegistration}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Register New Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Edit Patient</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Age *</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <MDMDropdown
                    label="Gender *"
                    masterType="gender"
                    value={formData.genderId || null}
                    onChange={(value, option) =>
                      setFormData({
                        ...formData,
                        genderId: value || '',
                        gender: option?.name || formData.gender,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Patient Modal */}
      {showViewModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Patient Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">UHID</p>
                  <p className="text-gray-900">{selectedPatient.uhid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-gray-900">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="text-gray-900">{selectedPatient.age}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="text-gray-900">{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{selectedPatient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Visit</p>
                  <p className="text-gray-900">{formatDate(selectedPatient.lastVisit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {selectedPatient.status}
                  </span>
                </div>
              </div>
              {selectedPatient.address ? (
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">{selectedPatient.address}</p>
                </div>
              ) : null}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}