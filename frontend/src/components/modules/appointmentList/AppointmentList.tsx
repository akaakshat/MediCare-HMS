import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Plus, Calendar, Clock, User, Phone, CheckCircle, XCircle, X, Loader2, Edit, Trash2, Eye, Search } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/date';
import { Permissions } from '../../../config/permissions';
import { AuthContext } from '../../../context/AuthContext';

interface AppointmentListProps {
  onBack: () => void;
}

interface Appointment {
  _id?: string;
  appointmentId?: string;
  scheduledAt?: string;
  patient: string | any;
  uhid?: string;
  doctor: string | any;
  date?: string;
  time?: string;
  type?: string;
  status: string;
  phone?: string;
}

export function AppointmentList({ onBack }: AppointmentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patient: '',
    uhid: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    slot: '',
    time: '09:00',
    type: 'Consultation',
    status: 'Pending',
    phone: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorAvailabilityNote, setDoctorAvailabilityNote] = useState('');
  const [isDoctorAvailable, setIsDoctorAvailable] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadAppointments();
    fetchDoctors();
  }, [page, limit, debouncedSearch]);

  const fetchDoctors = async () => {
    try {
      const resp = await ApiClient.getDoctors();
      setDoctors(resp.doctors || []);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  // When UHID changes, try to fetch patient details and prefill name/phone
  useEffect(() => {
    const uhid = formData.uhid?.trim();
    if (!uhid) return;

    const t = setTimeout(async () => {
      try {
        const resp: any = await ApiClient.getPatientByUHID(uhid);
        if (resp && resp.success) {
          const firstPatient = resp.patient || (Array.isArray(resp.patients) ? resp.patients[0] : null);
          if (!firstPatient) return;

          setFormData((s) => ({ ...s, patient: firstPatient.name || s.patient, phone: firstPatient.phone || s.phone }));

          if (Array.isArray(resp.patients) && resp.patients.length > 1) {
            toast(`Multiple patients found for UHID ${uhid}: ${resp.patients.map((x: any) => x._id || x.name).join(', ')}`);
          }
        }
      } catch (err) {
        // no-op if not found
      }
    }, 400);

    return () => clearTimeout(t);
  }, [formData.uhid]);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (!formData.doctor || !formData.date) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const doctorObj = doctors.find((d) => (d._id || d.id) === formData.doctor);
        if (!doctorObj) {
          setAvailableSlots([]);
          return;
        }

        const response: any = await ApiClient.getDoctorSlots(doctorObj._id || doctorObj.id, formData.date);
        if (response.success) {
          setAvailableSlots(response.slots || []);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    const timer = setTimeout(fetchSlots, 300);
    return () => clearTimeout(timer);
  }, [formData.doctor, formData.date, doctors]);

  const formatDateTimeFromScheduledAt = (scheduledAt?: string) => {
    if (!scheduledAt) return { date: '', time: '' };
    const dt = new Date(scheduledAt);
    if (isNaN(dt.getTime())) return { date: '', time: '' };
    const date = formatDateDDMMYYYY(dt);
    const time = dt.toTimeString().slice(0, 5);
    return { date, time };
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getAppointments({ page, limit, search: debouncedSearch });
      const list: Appointment[] = (response.appointments || []).map((apt: any) => {
        const { date, time } = formatDateTimeFromScheduledAt(apt.scheduledAt);
        return {
          ...apt,
          appointmentId: apt.appointmentId || apt._id,
          date: apt.date || date,
          time: apt.time || time,
          type: apt.type || 'Consultation',
        };
      });
      setAppointments(list);
      setTotal(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load appointments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDoctorAvailable) {
      toast.error('Cannot book appointment: selected doctor is not available at this time.');
      return;
    }

    if (!formData.slot) {
      toast.error('Please select an available appointment slot');
      return;
    }

    // Check if slot is still available (race condition prevention)
    const selectedSlot = availableSlots.find((s) => s.slot === formData.slot);
    if (selectedSlot && !selectedSlot.isAvailable) {
      toast.error('This appointment slot is no longer available. Please select another slot.');
      return;
    }

    try {
      // Extract time from slot (slot format: "YYYY-MM-DD|HH:MM-HH:MM")
      const [, timeRange] = formData.slot.split('|');
      const [startTime] = timeRange.split('-');

      // Get doctor's name instead of ID
      const doctorObj = doctors.find(d => (d._id || d.id) === formData.doctor);
      const doctorName = doctorObj ? doctorObj.name.trim() : formData.doctor;

      const payload = { ...formData, doctor: doctorName, time: startTime, slot: formData.slot };

      const response: any = await ApiClient.createAppointment(payload);
      if (response.success && response.duplicateUHIDs && response.duplicateUHIDs.length > 0) {
        toast(`Appointment booked with duplicate number. Matching UHIDs: ${response.duplicateUHIDs.join(', ')}`, {
          icon: '⚠️',
        });
      } else {
        toast.success('Appointment booked successfully');
      }

      setShowAddModal(false);
      setFormData({
        patient: '',
        uhid: '',
        doctor: '',
        date: new Date().toISOString().split('T')[0],
        slot: '',
        time: '09:00',
        type: 'Consultation',
        status: 'Pending',
        phone: ''
      });
      setAvailableSlots([]);
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    }
  };

  const openEditModal = (apt: Appointment) => {
    setSelectedAppointment(apt);

    const doctorId = typeof apt.doctor === 'string' ? apt.doctor : apt.doctor?._id || apt.doctor?.id || '';
    const match = doctors.find((d) => (d._id || d.id) === doctorId);
    if (match) {
      const availability = match.availability || 'Available';
      if (availability !== 'Available') {
        setDoctorAvailabilityNote(`Doctor is currently ${availability}. Please choose another time or doctor.`);
        setIsDoctorAvailable(false);
      } else {
        setDoctorAvailabilityNote('');
        setIsDoctorAvailable(true);
      }
    } else {
      setDoctorAvailabilityNote('');
      setIsDoctorAvailable(true);
    }

    setFormData({
      patient: typeof apt.patient === 'string' ? apt.patient : apt.patient?.name || '',
      uhid: apt.uhid || (typeof apt.patient === 'object' ? apt.patient?.uhid || '' : ''),
      doctor: doctorId,
      // Use computed date/time if schedule stored in scheduledAt
      date: apt.date || (apt.scheduledAt ? new Date(apt.scheduledAt).toISOString().split('T')[0] : ''),
      time: apt.time || (apt.scheduledAt ? new Date(apt.scheduledAt).toTimeString().slice(0, 5) : '09:00'),
      type: apt.type || 'Consultation',
      status: apt.status,
      phone: apt.phone || (typeof apt.patient === 'object' ? apt.patient?.phone || '' : '')
    });
    setShowEditModal(true);
  };

  const openViewModal = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowViewModal(true);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if (!isDoctorAvailable) {
      toast.error('Cannot update appointment: selected doctor is not available at this time.');
      return;
    }

    try {
      const id = (selectedAppointment as any)._id || (selectedAppointment as any).id;
      // prefer sending a patient ObjectId when we have a populated patient
      const payload: any = { ...formData };
      if (selectedAppointment.patient && typeof selectedAppointment.patient === 'object' && selectedAppointment.patient._id) {
        payload.patient = selectedAppointment.patient._id;
      } else if (formData.patient && typeof formData.patient === 'string' && (formData.patient as string).match(/^[0-9a-fA-F]{24}$/)) {
        // if user edited and provided an ObjectId-like string, send that
        payload.patient = formData.patient;
      }

      // Get doctor's name instead of ID
      const doctorObj = doctors.find(d => (d._id || d.id) === payload.doctor);
      payload.doctor = doctorObj ? doctorObj.name.trim() : payload.doctor;

      await ApiClient.updateAppointment(id, payload);
      toast.success('Appointment updated');
      setShowEditModal(false);
      setDoctorAvailabilityNote('');
      setIsDoctorAvailable(true);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update appointment');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await ApiClient.deleteAppointment(id);
      toast.success('Appointment cancelled successfully');
      setShowViewModal(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel appointment');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await ApiClient.updateAppointment(id, { status });
      toast.success(`Appointment ${status.toLowerCase()}`);
      loadAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      case 'Completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDoctorDisplayName = (doctor: string | any) => {
    if (!doctor) return 'N/A';

    if (typeof doctor === 'object') {
      if (doctor.name) return doctor.name;
      if (doctor.fullName) return doctor.fullName;
      if (doctor.email) return doctor.email;
    }

    if (typeof doctor === 'string') {
      const matched = doctors.find((d) => (d._id || d.id) === doctor || d.name === doctor);
      if (matched && matched.name) return matched.name;
      return doctor; // fallback to string ID or name-like value
    }

    return 'N/A';
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
            <h2 className="text-gray-900">Appointment Management</h2>
            <p className="text-sm text-gray-500">View and manage all appointments</p>
          </div>
        </div>
        {Permissions.appointmentCreate.includes(user?.role || '') && (
          <button 
            onClick={() => {
              setShowAddModal(true);
              setDoctorAvailabilityNote('');
              setIsDoctorAvailable(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search appointments (patient/doctor/status)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Patient</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">UHID</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Doctor</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt._id || apt.appointmentId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{apt.appointmentId || apt._id}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{typeof apt.patient === 'string' ? apt.patient : apt.patient?.name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.uhid || (typeof apt.patient === 'object' ? apt.patient?.uhid || 'N/A' : 'N/A')}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{getDoctorDisplayName(apt.doctor)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.time}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(apt)}
                          className="p-1 hover:bg-blue-50 rounded text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {Permissions.appointmentModify.includes(user?.role || '') && apt.status === 'Pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(apt._id || apt.appointmentId || '')}
                            className="p-1 hover:bg-green-50 rounded text-green-600"
                            title="Confirm"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {Permissions.appointmentModify.includes(user?.role || '') && (
                          <button
                            onClick={() => openEditModal(apt)}
                            className="p-1 hover:bg-yellow-50 rounded text-yellow-600"
                            title="Reschedule"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {Permissions.appointmentCancel.includes(user?.role || '') && (
                          <button 
                            onClick={() => handleDeleteAppointment(apt._id || apt.appointmentId || '')}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {appointments.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {appointments.length} of {total} appointments
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

            {appointments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No appointments found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Book New Appointment</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setDoctorAvailabilityNote('');
                  setIsDoctorAvailable(true);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">UHID</label>
                  <input
                    type="text"
                    value={formData.uhid}
                    onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Doctor *</label>
                  <select
                    required
                    value={formData.doctor}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setFormData({ ...formData, doctor: selected, slot: '' });

                      const match = doctors.find((d) => (d._id || d.id) === selected);
                      if (match) {
                        const availability = match.availability || 'Available';
                        if (availability !== 'Available') {
                          setDoctorAvailabilityNote(`Doctor is currently ${availability}. Please choose another time or doctor.`);
                          setIsDoctorAvailable(false);
                        } else {
                          setDoctorAvailabilityNote('');
                          setIsDoctorAvailable(true);
                        }
                      } else {
                        setDoctorAvailabilityNote('');
                        setIsDoctorAvailable(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                    ))}
                  </select>
                  {doctorAvailabilityNote && (
                    <p className="mt-2 text-sm text-orange-600">{doctorAvailabilityNote}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, slot: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Appointment Slot *</label>
                  {loadingSlots ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                      Loading available slots...
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.slot}
                      onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      disabled={availableSlots.length === 0 || !formData.doctor || !formData.date}
                    >
                      <option value="">
                        {!formData.doctor ? 'Select doctor first' : !formData.date ? 'Select date first' : availableSlots.length === 0 ? 'No available slots' : 'Select a slot'}
                      </option>
                      {availableSlots.map((slot, idx) => (
                        <option key={idx} value={slot.slot} disabled={!slot.isAvailable}>
                          {slot.startTime} - {slot.endTime}
                          {slot.isAvailable ? ` (${slot.availableSpots}/${slot.maxCapacity} available)` : ' (FULL)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Check-up">Check-up</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
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
                  disabled={!isDoctorAvailable}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${isDoctorAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Reschedule Appointment</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditAppointment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">UHID</label>
                  <input
                    type="text"
                    value={formData.uhid}
                    onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Doctor *</label>
                  <select
                    required
                    value={formData.doctor}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setFormData({ ...formData, doctor: selected });

                      const match = doctors.find((d) => d.name === selected);
                      if (match) {
                        const availability = match.availability || 'Available';
                        if (availability !== 'Available') {
                          setDoctorAvailabilityNote(`Doctor is currently ${availability}. Please choose another time or doctor.`);
                          setIsDoctorAvailable(false);
                        } else {
                          setDoctorAvailabilityNote('');
                          setIsDoctorAvailable(true);
                        }
                      } else {
                        setDoctorAvailabilityNote('');
                        setIsDoctorAvailable(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id || d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  {doctorAvailabilityNote && (
                    <p className="mt-2 text-sm text-orange-600">{doctorAvailabilityNote}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Check-up">Check-up</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setDoctorAvailabilityNote('');
                    setIsDoctorAvailable(true);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isDoctorAvailable}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${isDoctorAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  Update Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      {showViewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Appointment Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Appointment ID</p>
                <p className="text-gray-900">{selectedAppointment.appointmentId || selectedAppointment._id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Patient</p>
                <p className="text-gray-900">{typeof selectedAppointment.patient === 'string' ? selectedAppointment.patient : selectedAppointment.patient?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">UHID</p>
                <p className="text-gray-900">{selectedAppointment.uhid || (typeof selectedAppointment.patient === 'object' ? selectedAppointment.patient?.uhid || 'N/A' : 'N/A')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Doctor</p>
                <p className="text-gray-900">{typeof selectedAppointment.doctor === 'string' ? selectedAppointment.doctor : selectedAppointment.doctor?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-gray-900">{selectedAppointment.type || 'Consultation'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-gray-900">{selectedAppointment.date || (selectedAppointment.scheduledAt ? new Date(selectedAppointment.scheduledAt).toISOString().split('T')[0] : 'N/A')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-gray-900">{selectedAppointment.time || (selectedAppointment.scheduledAt ? new Date(selectedAppointment.scheduledAt).toTimeString().slice(0, 5) : 'N/A')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Notes / Reason</p>
                <p className="text-gray-900">{(selectedAppointment as any).reason || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {Permissions.appointmentCancel.includes(user?.role || '') && (
                <button
                  onClick={() => selectedAppointment && handleDeleteAppointment(selectedAppointment._id || selectedAppointment.appointmentId || '')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Cancel Appointment
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
