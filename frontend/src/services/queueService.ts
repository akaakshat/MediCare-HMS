import { ACTIVE_QUEUE_STATUSES, DEFAULT_AVERAGE_CONSULTATION_MINUTES } from '../utils/constants';
import { getPriorityRank, normalizePriority, type QueuePriority } from '../utils/priority';
import { getAverageConsultationMinutes } from '../utils/time';

export interface QueueAppointmentLike {
  _id?: string;
  appointmentId?: string;
  status?: string;
  scheduledAt?: string | Date | null;
  doctor?: string | any;
  priority?: string | null;
  patient?: string | any;
  date?: string;
  time?: string;
}

export interface QueueItem extends QueueAppointmentLike {
  queuePosition: number;
  estimatedWaitMinutes: number;
  priority: QueuePriority;
  doctorName: string;
  doctorKey: string;
  estimatedFinishMinutes: number;
}

const getAppointmentDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDoctorName = (doctor?: string | any): string => {
  if (!doctor) return 'Unassigned';
  if (typeof doctor === 'string') return doctor;
  if (typeof doctor === 'object') {
    if (typeof doctor.name === 'string' && doctor.name.trim()) return doctor.name;
    if (typeof doctor.fullName === 'string' && doctor.fullName.trim()) return doctor.fullName;
  }
  return 'Unassigned';
};

const getDoctorKey = (doctor?: string | any): string => {
  if (!doctor) return 'unassigned';
  if (typeof doctor === 'string') return doctor.trim().toLowerCase();
  if (typeof doctor === 'object') {
    if (typeof doctor._id === 'string' && doctor._id.trim()) return doctor._id.trim().toLowerCase();
    if (typeof doctor.id === 'string' && doctor.id.trim()) return doctor.id.trim().toLowerCase();
    if (typeof doctor.name === 'string' && doctor.name.trim()) return doctor.name.trim().toLowerCase();
  }
  return 'unassigned';
};

const getStatusKey = (status?: string) => String(status || '').trim();

export const sortQueue = <T extends QueueAppointmentLike>(appointments: T[], averageConsultationMinutes = DEFAULT_AVERAGE_CONSULTATION_MINUTES): T[] => {
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  return safeAppointments
    .filter((appointment) => ACTIVE_QUEUE_STATUSES.includes(getStatusKey(appointment.status)))
    .map((appointment) => ({ ...appointment, priority: normalizePriority(appointment.priority) }))
    .sort((left, right) => {
      const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
      if (priorityDelta !== 0) return priorityDelta;
      const leftDate = getAppointmentDate(left.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDate = getAppointmentDate(right.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (leftDate !== rightDate) return leftDate - rightDate;
      return String(left.appointmentId || left._id || '').localeCompare(String(right.appointmentId || right._id || ''));
    })
    .map((appointment) => ({ ...appointment, priority: normalizePriority(appointment.priority) }));
};

export const calculateWaitTime = <T extends QueueAppointmentLike>(appointments: T[], index: number, averageConsultationMinutes = DEFAULT_AVERAGE_CONSULTATION_MINUTES): number => {
  const safeIndex = Number.isFinite(index) ? Math.max(0, index) : 0;
  const queue = sortQueue(appointments, averageConsultationMinutes);
  return safeIndex * getAverageConsultationMinutes(averageConsultationMinutes);
};

export const calculateQueuePosition = <T extends QueueAppointmentLike>(appointments: T[], averageConsultationMinutes = DEFAULT_AVERAGE_CONSULTATION_MINUTES): QueueItem[] => {
  const sortedQueue = sortQueue(appointments, averageConsultationMinutes);
  return sortedQueue.map((appointment, index) => ({
    ...appointment,
    priority: normalizePriority(appointment.priority),
    doctorName: getDoctorName(appointment.doctor),
    doctorKey: getDoctorKey(appointment.doctor),
    queuePosition: index + 1,
    estimatedWaitMinutes: index * getAverageConsultationMinutes(averageConsultationMinutes),
    estimatedFinishMinutes: (index + 1) * getAverageConsultationMinutes(averageConsultationMinutes),
  }));
};

export const assignBestDoctor = <T extends QueueAppointmentLike>(appointments: T[], doctors: Array<string | { name?: string; _id?: string; id?: string }>, selectedDoctor?: string | null): string | null => {
  if (selectedDoctor) return selectedDoctor;
  if (!Array.isArray(doctors) || doctors.length === 0) return null;

  const queueItems = calculateQueuePosition(appointments);
  const counts: Record<string, number> = {};
  queueItems.forEach((item) => {
    const key = getDoctorKey(item.doctor);
    counts[key] = (counts[key] || 0) + 1;
  });

  const doctorCandidates = doctors.map((doctor) => {
    const doctorName = typeof doctor === 'string' ? doctor : doctor.name || doctor._id || doctor.id || '';
    const doctorKey = typeof doctor === 'string' ? doctor.toLowerCase() : (doctor._id || doctor.id || doctor.name || '').toLowerCase();
    return {
      doctorName,
      doctorKey,
      load: counts[doctorKey] || 0,
    };
  });

  if (doctorCandidates.length === 0) return null;
  return doctorCandidates.sort((left, right) => left.load - right.load || left.doctorName.localeCompare(right.doctorName))[0]?.doctorName || null;
};

export const recalculateQueue = <T extends QueueAppointmentLike>(appointments: T[], doctors: Array<string | { name?: string; _id?: string; id?: string }> = [], averageConsultationMinutes = DEFAULT_AVERAGE_CONSULTATION_MINUTES, selectedDoctor?: string | null): QueueItem[] => {
  const queuedAppointments = calculateQueuePosition(appointments, averageConsultationMinutes);
  return queuedAppointments.map((item) => ({
    ...item,
    doctorName: getDoctorName(item.doctor),
    doctorKey: getDoctorKey(item.doctor),
    estimatedFinishMinutes: (item.queuePosition) * getAverageConsultationMinutes(averageConsultationMinutes),
  }));
};

export const calculateEstimatedFinish = <T extends QueueAppointmentLike>(appointments: T[], index: number, averageConsultationMinutes = DEFAULT_AVERAGE_CONSULTATION_MINUTES): number => {
  const queue = calculateQueuePosition(appointments, averageConsultationMinutes);
  const target = Number.isFinite(index) ? Math.max(0, index) : 0;
  if (target >= queue.length) return 0;
  return queue[target]?.estimatedFinishMinutes ?? 0;
};
