import { useEffect, useState, useContext } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/date';

const getDoctorId = (doctor: any) => String(doctor?._id ?? doctor?.id ?? '');
const matchesDoctorId = (doctor: any, targetId?: string) => getDoctorId(doctor) === String(targetId ?? '');

export function DoctorSchedule({ onBack }: { onBack: () => void }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const [availabilitySchedule, setAvailabilitySchedule] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]); // 0=Sun..6=Sat
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [maxAppointmentsPerSlot, setMaxAppointmentsPerSlot] = useState(1);
  const [slotCapacities, setSlotCapacities] = useState<Record<string, number>>({});
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId || d.id === selectedDoctorId);

  const getTimeRangeOptions = () => {
    const options = [];
    const pad = (n: number) => String(n).padStart(2, '0');
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += 15) {
        const hour24 = `${pad(h)}:${pad(m)}`;
        const hours12 = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        options.push(`${hours12}:${pad(m)} ${ampm}`);
      }
    }
    return options;
  };

  const toDateISO = (date: Date) => date.toISOString().split('T')[0];

  const parseScheduleEntryDate = (slot: string): Date | null => {
    if (!slot || typeof slot !== 'string') return null;

    // Format: YYYY-MM-DD|HH:MM-HH:MM
    if (slot.includes('|')) {
      const [datePart] = slot.split('|');
      // Parse YYYY-MM-DD into a local Date (avoid Date("YYYY-MM-DD") timezone quirks)
      const parts = String(datePart).split('-');
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (![year, month, day].some((n) => Number.isNaN(n))) {
          const d = new Date(year, month - 1, day);
          return Number.isNaN(d.getTime()) ? null : d;
        }
      }
      return null;
    }

    // Format: standard JS parseable date strings
    const dateCandidate = new Date(slot);
    if (!Number.isNaN(dateCandidate.getTime())) return dateCandidate;

    // Fallback format: DD/MM/YYYY or DD/MM/YYYY HH:MM
    const dateMatch = slot.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]) - 1;
      const year = Number(dateMatch[3]);
      const d = new Date(year, month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
  };

  const isSlotInPast = (slot: string) => {
    const slotDate = parseScheduleEntryDate(slot);
    if (!slotDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return slotDate < today;
  };

  const prunePastAvailabilitySchedule = (schedule: string[]) =>
    schedule.filter((s) => !isSlotInPast(s));

  const setDoctorSchedule = async (doctor: any) => {
    if (!doctor) return;
    setSelectedDoctorId(getDoctorId(doctor));

    const rawSchedule = Array.isArray(doctor.availabilitySchedule) ? doctor.availabilitySchedule : [];
    const cleanedSchedule = prunePastAvailabilitySchedule(rawSchedule);

    setAvailabilitySchedule(cleanedSchedule);

    if (doctor.slotCapacities) {
      if (doctor.slotCapacities instanceof Map) {
        setSlotCapacities(Object.fromEntries(doctor.slotCapacities));
      } else if (typeof doctor.slotCapacities === 'object') {
        setSlotCapacities({ ...doctor.slotCapacities });
      } else {
        setSlotCapacities({});
      }
    } else {
      setSlotCapacities({});
    }

    setSelectedSlots(new Set());

    if (cleanedSchedule.length !== rawSchedule.length && (doctor._id || doctor.id)) {
      try {
        await ApiClient.put(`/doctors/${doctor._id || doctor.id}/availability`, {
          availabilitySchedule: cleanedSchedule,
        });
        toast.success('Expired dates removed from doctor schedule');
      } catch (cleanupErr) {
        console.warn('Could not persist expired date cleanup:', cleanupErr);
      }
    }
  };

  const loadAvailability = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const response = await ApiClient.get('/doctors');
      const doctorList = response.doctors || [];
      setDoctors(doctorList);

      let chosen: any;
      if (user.role === 'doctor') {
        chosen = doctorList.find((d: any) => matchesDoctorId(d, user.id || user._id));
      } else {
        if (selectedDoctorId) {
          chosen = doctorList.find((d: any) => matchesDoctorId(d, selectedDoctorId));
        }
        if (!chosen && doctorList.length > 0) {
          chosen = doctorList[0];
        }
      }

      if (chosen) {
        await setDoctorSchedule(chosen);
      } else {
        setSelectedDoctorId(undefined);
        setAvailabilitySchedule([]);
        setSlotCapacities({});
        setSelectedSlots(new Set());
      }
    } catch (err) {
      console.error('Failed to load availability', err);
      toast.error('Failed to load availability schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [user]);

  // When selecting a different doctor, update the visible schedule immediately
  useEffect(() => {
    if (!selectedDoctorId) return;
    const chosen = doctors.find((d) => matchesDoctorId(d, selectedDoctorId));
    if (!chosen) return;

    const existingSchedule: string[] = Array.isArray(chosen.availabilitySchedule) ? chosen.availabilitySchedule : [];
    const cleanedSchedule = prunePastAvailabilitySchedule(existingSchedule);
    setAvailabilitySchedule(cleanedSchedule);

    const syncIfNeeded = async () => {
      if (cleanedSchedule.length !== existingSchedule.length && (chosen._id || chosen.id)) {
        try {
          await ApiClient.put(`/doctors/${chosen._id || chosen.id}/availability`, {
            availabilitySchedule: cleanedSchedule,
          });
          toast.success('Expired dates removed from doctor schedule');
        } catch (cleanupErr) {
          console.warn('Could not persist expired date cleanup:', cleanupErr);
        }
      }
    };

    syncIfNeeded();

    if (chosen.slotCapacities) {
      if (chosen.slotCapacities instanceof Map) {
        setSlotCapacities(Object.fromEntries(chosen.slotCapacities));
      } else if (typeof chosen.slotCapacities === 'object') {
        setSlotCapacities({ ...chosen.slotCapacities });
      } else {
        setSlotCapacities({});
      }
    } else {
      setSlotCapacities({});
    }
    setSelectedSlots(new Set());
  }, [selectedDoctorId, doctors]);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar filter state: restrict this month and highlight selected weekdays.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const nonSelectedWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !selectedWeekdays.includes(d));

  const formatDisplay = (slot: string) => {
    // Supports the new range format: "DD/MM/YYYY to DD/MM/YYYY 09:00 AM - 05:00 PM"
    const rangeLabel = slot.match(/^\d{2}\/\d{2}\/\d{4}\s+to\s+\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)$/i);
    if (rangeLabel) {
      return slot;
    }

    // Supports ISO datetime strings as well as custom range strings like "YYYY-MM-DD|HH:MM-HH:MM"
    if (slot.includes('|')) {
      const [datePart, range] = slot.split('|');
      return `${formatDateDDMMYYYY(datePart)} • ${range.replace('-', ' to ')}`;
    }

    const d = new Date(slot);
    if (Number.isNaN(d.getTime())) return slot;
    return formatDateTimeDDMMYYYY(d);
  };

  const handleAddSlot = () => {
    const datesToUse = buildDatesFromRange();

    if (datesToUse.length === 0) {
      if (selectedWeekdays.length === 0) {
        toast.error('Please select at least one day of the week');
      } else {
        toast.error('Please select a valid date range on calendar (from + to)');
      }
      return;
    }

    if (!startTime || !endTime) {
      toast.error('Please select both start and end times');
      return;
    }

    if (slotDurationMinutes <= 0 || slotDurationMinutes > 480) {
      toast.error('Slot duration must be between 1 and 480 minutes');
      return;
    }

    const parseTime = (t: string) => {
      const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let hh = Number(m[1]);
      const mm = m[2];
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return `${String(hh).padStart(2, '0')}:${mm}`;
    };

    const start24 = parseTime(startTime);
    const end24 = parseTime(endTime);
    if (!start24 || !end24) {
      toast.error('Invalid time format. Please use 12-hour format');
      return;
    }

    if (start24 >= end24) {
      toast.error('End time must be after start time');
      return;
    }

    // Helper to convert HH:MM string to minutes since midnight
    const timeToMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };

    // Helper to convert minutes since midnight back to HH:MM format
    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const newSlots: string[] = [];
    const startMins = timeToMinutes(start24);
    const endMins = timeToMinutes(end24);
    const newCapacities: Record<string, number> = { ...slotCapacities };

    datesToUse.forEach((date) => {
      const dateISO = toDateISO(date);
      
      // Generate appointment slots by dividing the time range
      let currentMins = startMins;
      while (currentMins + slotDurationMinutes <= endMins) {
        const slotStart = minutesToTime(currentMins);
        const slotEnd = minutesToTime(currentMins + slotDurationMinutes);
        const normalized = `${dateISO}|${slotStart}-${slotEnd}`;
        newSlots.push(normalized);
        newCapacities[normalized] = maxAppointmentsPerSlot;
        currentMins += slotDurationMinutes;
      }
    });

    if (newSlots.length === 0) {
      toast.error('No slots could be created. Check that slot duration fits within the time range.');
      return;
    }

    const deduped = Array.from(new Set([...availabilitySchedule, ...newSlots]));
    setAvailabilitySchedule(deduped);
    setSlotCapacities(newCapacities);
    toast.success(`Added ${newSlots.length} appointment slot(s) with capacity ${maxAppointmentsPerSlot}`);
  };

  const handleRemoveSlot = async (iso: string) => {
    setAvailabilitySchedule((prev) => prev.filter((s) => s !== iso));
    // Auto-save after removal
    try {
      const updatedSchedule = availabilitySchedule.filter((s) => s !== iso);
      await ApiClient.put(`/doctors/${selectedDoctorId}/availability`, {
        availabilitySchedule: updatedSchedule,
      });
      toast.success('Slot removed and saved');
    } catch (error) {
      console.error('Failed to save after removal:', error);
      toast.error('Failed to save changes');
      // Revert the local change
      setAvailabilitySchedule((prev) => [...prev, iso]);
    }
  };

  const handleRemoveSelectedSlots = async () => {
    if (selectedSlots.size === 0) {
      toast.error('No slots selected');
      return;
    }
    const slotsToRemove = Array.from(selectedSlots);
    setAvailabilitySchedule((prev) => prev.filter((s) => !selectedSlots.has(s)));
    setSelectedSlots(new Set());
    // Auto-save after removal
    try {
      const updatedSchedule = availabilitySchedule.filter((s) => !slotsToRemove.includes(s));
      await ApiClient.put(`/doctors/${selectedDoctorId}/availability`, {
        availabilitySchedule: updatedSchedule,
      });
      toast.success(`Removed ${slotsToRemove.length} slot(s) and saved`);
    } catch (error) {
      console.error('Failed to save after removal:', error);
      toast.error('Failed to save changes');
      // Revert the local change
      setAvailabilitySchedule((prev) => [...prev, ...slotsToRemove]);
    }
  };

  const toggleSlotSelection = (slot: string) => {
    const newSelection = new Set(selectedSlots);
    if (newSelection.has(slot)) {
      newSelection.delete(slot);
    } else {
      newSelection.add(slot);
    }
    setSelectedSlots(newSelection);
  };

  const buildDatesFromRange = (): Date[] => {
    const start = selectedRange?.from;
    const end = selectedRange?.to;
    if (!start || !end || selectedWeekdays.length === 0) return [];
    if (start > end) return [];

    const dates: Date[] = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      if (selectedWeekdays.includes(dt.getDay())) {
        dates.push(new Date(dt));
      }
    }
    return dates;
  };

  const toggleAllSlots = () => {
    if (selectedSlots.size === availabilitySchedule.length) {
      setSelectedSlots(new Set());
    } else {
      setSelectedSlots(new Set(availabilitySchedule));
    }
  };

  const handleSave = async () => {
    if (!user || !['admin', 'receptionist'].includes(user.role)) {
      toast.error('Only admin and receptionist can save schedules');
      return;
    }

    if (!selectedDoctorId) {
      toast.error('No doctor selected');
      return;
    }

    if (availabilitySchedule.length === 0) {
      toast.error('No slots to save. Please add a date/time range first.');
      return;
    }

    try {
      setLoading(true);
      console.debug('Saving availability schedule', availabilitySchedule);
      // Extra debug for invalid slot diagnosis
      console.log('DoctorSchedule: PUT /availability data', {
        doctorId: selectedDoctorId,
        availabilitySchedule,
      });
      const response = await ApiClient.put(`/doctors/${selectedDoctorId}/availability`, {
        availabilitySchedule,
      });
      console.debug('Save response', response);

      if (response.success) {
        const savedSlots = response.doctor?.availabilitySchedule || availabilitySchedule;
        const hasSavedNoSlots = Array.isArray(savedSlots) && savedSlots.length === 0 && availabilitySchedule.length > 0;

        setAvailabilitySchedule(Array.isArray(savedSlots) ? savedSlots : availabilitySchedule);

        if (hasSavedNoSlots) {
          toast.error(
            'The server did not store any slots. Please check your schedule format and try again.'
          );
        } else {
          toast.success(`Availability schedule updated (${savedSlots.length || availabilitySchedule.length} slots)`);
        }

        if (response.invalidSlots) {
          console.warn('Invalid slots sent to server:', response.invalidSlots);
        }

        // Save slot capacities
        if (Object.keys(slotCapacities).length > 0) {
          try {
            await ApiClient.updateSlotCapacity(selectedDoctorId, slotCapacities);
            toast.success('Slot capacities updated');
          } catch (capacityErr) {
            console.error('Failed to save slot capacities:', capacityErr);
            toast.error('Availability saved but slot capacities could not be updated');
          }
        }

        await loadAvailability();
      }
    } catch (err: any) {
      console.error('Failed to save schedule', err);
      const invalidSlots = err?.response?.invalidSlots;
      if (Array.isArray(invalidSlots) && invalidSlots.length > 0) {
        toast.error(`Invalid entries: ${invalidSlots.join(', ')}`);
      } else {
        toast.error(err?.message || 'Failed to save schedule');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-900 text-lg font-semibold">Schedule Availability</h3>
          <p className="text-sm text-gray-500">
            {user?.role === 'doctor'
              ? 'Read-only doctor schedule: availability edits are managed by admin/receptionist.'
              : ['admin', 'receptionist'].includes(user?.role || '')
              ? 'Set availability for doctors (select dates + 12-hour time).'
              : 'View doctors\' availability slots.'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
        >
          Back
        </button>
      </div>

      {user?.role !== 'doctor' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor</label>
          <select
            value={selectedDoctorId || ''}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedDoctorId(id);
              const chosen = doctors.find((d) => d._id === id || d.id === id);
              setAvailabilitySchedule(
                chosen && Array.isArray(chosen.availabilitySchedule) ? chosen.availabilitySchedule : []
              );
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {doctors.map((doc) => (
              <option key={doc._id || doc.id} value={doc._id || doc.id}>
                {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['admin', 'receptionist'].includes(user?.role || '') ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Schedule Availability Range</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date Range (first click = from, second click = to)</label>
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={(range) =>
                    setSelectedRange(
                      range
                        ? (range as { from: Date | undefined; to: Date | undefined })
                        : { from: undefined, to: undefined }
                    )
                  }
                  className="rounded-lg"
                  fromDate={monthStart}
                  toDate={monthEnd}
                  disabled={[
                    { before: monthStart },
                    { after: monthEnd },
                    ...(selectedWeekdays.length > 0 ? [{ dayOfWeek: nonSelectedWeekdays }] : []),
                  ]}
                  modifiers={{
                    selectedWeekday: selectedWeekdays.length > 0 ? { dayOfWeek: selectedWeekdays } : undefined,
                  }}
                  modifiersClassNames={{
                    selectedWeekday: 'bg-blue-200 text-blue-900 font-semibold rounded-full',
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {selectedRange?.from && selectedRange?.to
                    ? `Selected range: ${formatDateDDMMYYYY(selectedRange.from)} to ${formatDateDDMMYYYY(selectedRange.to)}`
                    : selectedRange?.from
                    ? `Selected start date: ${formatDateDDMMYYYY(selectedRange.from)}. Choose end date.`
                    : 'Select start date for series.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Day(s) of Week</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays([1, 3, 5])}
                    className="text-xs px-2 py-1 border rounded bg-blue-50 text-blue-700"
                  >
                    Mon/Wed/Fri
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6])}
                    className="text-xs px-2 py-1 border rounded bg-green-50 text-green-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays([])}
                    className="text-xs px-2 py-1 border rounded bg-red-50 text-red-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedWeekdays((prev) =>
                          prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={`px-2 py-1 text-xs rounded-lg border ${
                        selectedWeekdays.includes(idx)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">If days are selected, only those weekdays within From/To range are used.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (12hr)</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {getTimeRangeOptions().map((t) => (
                      <option key={`start-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time (12hr)</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {getTimeRangeOptions().map((t) => (
                      <option key={`end-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Slot Duration (minutes)</label>
                <select
                  value={slotDurationMinutes}
                  onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Duration will be divided from start to end time
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Appointments Per Slot</label>
                <select
                  value={maxAppointmentsPerSlot}
                  onChange={(e) => setMaxAppointmentsPerSlot(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'appointment' : 'appointments'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How many patients can book the same time slot
                </p>
              </div>

              <button
                onClick={handleAddSlot}
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Slots
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Doctor Schedule (Read-Only)</h4>
            <p className="text-sm text-gray-500">You can view your availability slots in the list. Schedule changes are managed by admin/receptionist.</p>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Scheduled Slots</h4>
              <p className="text-xs text-gray-500">Doctor: {selectedDoctor?.name || 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              {['admin', 'receptionist'].includes(user?.role || '') && selectedSlots.size > 0 && (
                <button
                  onClick={handleRemoveSelectedSlots}
                  className="text-sm text-white bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete {selectedSlots.size}
                </button>
              )}
              {['admin', 'receptionist'].includes(user?.role || '') && (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="text-sm text-white bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Schedule
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : availabilitySchedule.length === 0 ? (
            <p className="text-sm text-gray-500">No availability slots set yet.</p>
          ) : (
            <>
              {['admin', 'receptionist'].includes(user?.role || '') && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedSlots.size === availabilitySchedule.length && availabilitySchedule.length > 0}
                    onChange={toggleAllSlots}
                    className="w-4 h-4 rounded cursor-pointer"
                    title="Select all slots"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedSlots.size > 0 ? `${selectedSlots.size} selected` : 'Select all'}
                  </span>
                </div>
              )}
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {availabilitySchedule.map((slot) => (
                  <li
                    key={slot}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {['admin', 'receptionist'].includes(user?.role || '') && (
                        <input
                          type="checkbox"
                          checked={selectedSlots.has(slot)}
                          onChange={() => toggleSlotSelection(slot)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      )}
                      <span className="text-sm text-gray-700">{formatDisplay(slot)}</span>
                    </div>
                    {['admin', 'receptionist'].includes(user?.role || '') && !selectedSlots.has(slot) && (
                      <button
                        onClick={() => handleRemoveSlot(slot)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
