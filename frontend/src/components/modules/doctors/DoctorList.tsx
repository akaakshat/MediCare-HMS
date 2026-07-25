import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Plus, Search, Stethoscope, Calendar, Clock, Award, Edit, Trash2, X } from 'lucide-react';
import { TableSkeleton } from '../../ui/LoadingSkeleton';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { Permissions } from '../../../config/permissions';

interface DoctorListProps {
  onBack: () => void;
}

interface Doctor {
  _id?: string;
  id: string;
  name: string;
  specialization: string;
  experience: number;
  phone: string;
  email: string;
  availability: string;
  availabilitySchedule?: string[];
  rating?: number;
  patients?: number;
}

export function DoctorList({ onBack }: DoctorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: '',
    specialization: '',
    experience: 0,
    phone: '',
    email: '',
    availability: 'Available',
    availabilitySchedule: []
  });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/doctors');
      if (response.success) {
        setDoctors(response.doctors);
      }
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDoctor) {
        const id = (editingDoctor as any)._id || (editingDoctor as any).id;
        const canUpdateSchedule = ['admin', 'receptionist'].includes(user?.role || '');

        if (canUpdateSchedule && Array.isArray(formData.availabilitySchedule)) {
          const response = await ApiClient.put(`/doctors/${id}/availability`, {
            availabilitySchedule: formData.availabilitySchedule || []
          });
          if (response.success) {
            toast.success('Availability updated successfully');
            fetchDoctors();
            closeDialog();
          }
        } else {
          const response = await ApiClient.put(`/doctors/${id}`, formData);
          if (response.success) {
            toast.success('Doctor updated successfully');
            fetchDoctors();
            closeDialog();
          }
        }
      } else {
        const response = await ApiClient.post('/doctors', formData);
        if (response.success) {
          toast.success('Doctor added successfully');
          fetchDoctors();
          closeDialog();
        }
      }
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      toast.error(error.message || 'Failed to save doctor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    
    try {
      const response = await ApiClient.delete(`/doctors/${id}`);
      if (response.success) {
        toast.success('Doctor deleted successfully');
        fetchDoctors();
      }
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      toast.error(error.message || 'Failed to delete doctor');
    }
  };

  const openDialog = (doctor?: Doctor) => {
    if (doctor) {
      // normalize id to prefer _id when present and only copy editable fields
      const normalized = { ...doctor, id: (doctor as any)._id || doctor.id } as Doctor;
      setEditingDoctor(normalized);
      setFormData({
        name: doctor.name,
        specialization: (doctor as any).specialization,
        experience: (doctor as any).experience ?? 0,
        phone: (doctor as any).phone || '',
        email: (doctor as any).email || '',
        availability: (doctor as any).availability || 'Available',
        availabilitySchedule: (doctor as any).availabilitySchedule || []
      });
    } else {
      setEditingDoctor(null);
      setFormData({
        name: '',
        specialization: '',
        experience: 0,
        phone: '',
        email: '',
        availability: 'Available',
        availabilitySchedule: []
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingDoctor(null);
    setFormData({
      name: '',
      specialization: '',
      experience: 0,
      phone: '',
      email: '',
      availability: 'Available'
    });
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availabilityOptions = ['Available', 'Busy', 'Off Duty'];

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-700';
      case 'Busy':
        return 'bg-yellow-100 text-yellow-700';
      case 'Off Duty':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNextAvailability = (current: string) => {
    const idx = availabilityOptions.indexOf(current);
    if (idx === -1) return availabilityOptions[0];
    return availabilityOptions[(idx + 1) % availabilityOptions.length];
  };

  const handleToggleAvailability = async (doctor: Doctor) => {
    try {
      const id = (doctor as any)._id || (doctor as any).id;
      const next = getNextAvailability(doctor.availability || 'Available');
      const response = await ApiClient.put(`/doctors/${id}`, { availability: next });
      if (response.success) {
        toast.success(`Availability set to ${next}`);
        fetchDoctors();
      }
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const openMySchedule = () => {
    if (!user || user.role !== 'doctor') return;
    const mine = doctors.find((doc) => {
      const id = (doc as any)._id || doc.id;
      return user.id === id || user._id === id;
    });

    if (!mine) {
      toast.error('Your doctor profile was not found.');
      return;
    }

    openDialog(mine);
  };

  const isDoctorSelf = (doctor?: Doctor) => {
    if (!user || user.role !== 'doctor' || !doctor) return false;
    const doctorId = (doctor as any)._id || doctor.id;
    return user.id === doctorId || (user._id && user._id === doctorId);
  };

  const parseSchedule = (schedule?: string[]) => {
    if (!Array.isArray(schedule)) return [];

    return schedule
      .map((d) => {
        if (typeof d !== 'string') return null;
        const parts = d.split('-').map((p) => parseInt(p, 10));
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
      })
      .filter(Boolean) as Date[];
  };

  const isSelfDoctorEditing = user?.role === 'doctor' && isDoctorSelf(editingDoctor || undefined);

  if (loading) {
    return <TableSkeleton rows={6} columns={7} className="pt-4" />;
  }

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
            <h2 className="text-gray-900">Doctor Management</h2>
            <p className="text-sm text-gray-500">Manage doctor profiles and schedules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Only allow admin/receptionist to manage schedule */}
          {['admin', 'receptionist'].includes(user?.role || '') && (
            <button
              onClick={openMySchedule}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule Availability
            </button>
          )}

          {/* Only allow admins and staff to add/edit/delete doctors; doctors have view-only access */}
          {Permissions.doctorsManage.includes(user?.role || '') && (
            <button 
              onClick={() => openDialog()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No doctors found</p>
            <button 
              onClick={() => openDialog()}
              className="mt-4 text-purple-600 hover:text-purple-700"
            >
              Add your first doctor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor._id || doctor.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(doctor)}
                    className={`px-2 py-1 rounded text-xs ${getAvailabilityColor(doctor.availability)} hover:opacity-90 focus:ring-2 focus:ring-purple-400 focus:outline-none`}
                    title="Click to change availability"
                  >
                    {doctor.availability}
                  </button>
                </div>

                <h3 className="text-gray-900 mb-1">{doctor.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{doctor.specialization}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4" />
                    <span>{doctor.experience} years experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{doctor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{doctor.email}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {Permissions.doctorsManage.includes(user?.role || '') ? (
                    <>
                      <button 
                        onClick={() => openDialog(doctor)}
                        className="flex-1 bg-purple-50 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(doctor._id || doctor.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed opacity-60" disabled>
                      View Only
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-gray-900">
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h3>
              <button
                onClick={closeDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isSelfDoctorEditing && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  You can update your availability schedule here. Other profile fields are read-only for doctors.
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  disabled={isSelfDoctorEditing}
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Specialization *</label>
                <input
                  type="text"
                  required
                  disabled={isSelfDoctorEditing}
                  value={formData.specialization || ''}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Experience (years) *</label>
                <input
                  type="number"
                  required
                  disabled={isSelfDoctorEditing}
                  min="0"
                  value={formData.experience || 0}
                  onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  disabled={isSelfDoctorEditing}
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  disabled={isSelfDoctorEditing}
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Availability *</label>
                <select
                  required
                  disabled={isSelfDoctorEditing}
                  value={formData.availability || 'Available'}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>

              {/* Availability calendar (only editable by the doctor themselves) */}
              {isDoctorSelf(editingDoctor || undefined) && (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-700 mb-1">Availability Calendar</label>
                  <DayPicker
                    mode="multiple"
                    selected={parseSchedule(formData.availabilitySchedule)}
                    onSelect={(dates) => {
                      const selected: Date[] = Array.isArray(dates) ? dates : dates ? [dates] : [];
                      const isoDates = selected
                        .filter(Boolean)
                        .map((d) => d.toISOString().split('T')[0]);
                      setFormData({ ...formData, availabilitySchedule: isoDates });
                    }}
                    numberOfMonths={2}
                    showOutsideDays
                  />
                  <p className="text-xs text-gray-500">Select dates when you are available. Save to apply.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingDoctor ? 'Update' : 'Add'} Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}