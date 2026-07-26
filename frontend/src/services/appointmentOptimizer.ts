import { formatMinutesToLabel } from '../utils/dateAnalytics';
import { calculateConfidence } from '../utils/predictions';

interface AppointmentLike {
  _id?: string;
  appointmentId?: string;
  patient?: any;
  doctor?: any;
  type?: string;
  status?: string;
  scheduledAt?: string | Date | null;
  optimizer?: any;
  optimizerDashboard?: any;
}

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

const getDoctorName = (doctor?: string | any) => {
  if (!doctor) return '';
  if (typeof doctor === 'string') return doctor.trim();
  if (typeof doctor === 'object') {
    if (typeof doctor.name === 'string' && doctor.name.trim()) return doctor.name.trim();
    if (typeof doctor.fullName === 'string' && doctor.fullName.trim()) return doctor.fullName.trim();
  }
  return '';
};

const getPatientName = (patient?: string | any) => {
  if (!patient) return '';
  if (typeof patient === 'string') return patient.trim();
  if (typeof patient === 'object') {
    if (typeof patient.name === 'string' && patient.name.trim()) return patient.name.trim();
    if (typeof patient.uhid === 'string' && patient.uhid.trim()) return patient.uhid.trim();
  }
  return '';
};

const getSuggestedTimeLabel = (baseTime?: string) => {
  if (!baseTime) return '10:45 AM';
  const [hours, minutes] = baseTime.split(':').map((part) => Number(part));
  const date = new Date();
  date.setHours(hours || 9, minutes || 0, 0, 0);
  date.setMinutes(date.getMinutes() + 15);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const getBookingOptimizerSuggestion = (appointments: AppointmentLike[] = [], formData?: any, doctors: any[] = []) => {
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const doctorName = String(formData?.doctor || '').trim();
  const selectedDoctor = doctors.find((doctor) => String(doctor._id || doctor.id || '').trim() === doctorName || normalizeText(doctor.name) === normalizeText(doctorName));
  const doctorLabel = selectedDoctor?.name || doctorName || 'selected doctor';
  const patientName = String(formData?.patient || '').trim();
  const uhid = String(formData?.uhid || '').trim();

  const patientHistory = safeAppointments.filter((appointment) => {
    const samePatientName = normalizeText(getPatientName(appointment.patient)) === normalizeText(patientName);
    const samePatientUhid = Boolean(uhid && normalizeText(getPatientName(appointment.patient)) === normalizeText(uhid));
    return samePatientName || samePatientUhid;
  });

  const doctorHistory = safeAppointments.filter((appointment) => normalizeText(getDoctorName(appointment.doctor)) === normalizeText(doctorLabel));

  const lateCount = patientHistory.filter((appointment) => Number(appointment?.optimizer?.arrivalPrediction?.predictedLateMinutes || 0) > 0).length;
  const doctorDelayMinutes = doctorHistory.length > 0 ? Math.min(18, doctorHistory.length * 3 + 3) : 0;
  const waitingMinutes = doctorHistory.length > 0 ? Math.max(6, doctorHistory.length * 3 + 2) : 8;
  const confidence = calculateConfidence(Math.max(1, patientHistory.length + doctorHistory.length), 1);

  if (!doctorLabel || !formData?.date) return null;

  const suggestion = {
    arrivalHint: lateCount > 0
      ? `⚠️ Patient usually arrives ${Math.max(5, lateCount * 5)} minutes late.`
      : 'Patient arrival pattern looks consistent for this booking.',
    doctorHint: doctorDelayMinutes > 0
      ? `⚠️ Doctor usually runs ${doctorDelayMinutes} minutes behind after the current time block.`
      : 'Doctor schedule looks consistent for this slot.',
    recommendedSlot: getSuggestedTimeLabel(formData?.time),
    expectedWaitingMinutes: waitingMinutes,
    confidence: confidence.value,
    confidenceLabel: confidence.label,
    predictionLabel: `Recommended slot: ${getSuggestedTimeLabel(formData?.time)}`,
  };

  return suggestion;
};

export const getOptimizerDashboardSummary = (appointments: AppointmentLike[] = []) => {
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const dashboard = safeAppointments[0]?.optimizerDashboard;
  if (dashboard) {
    return {
      averagePatientDelay: dashboard.averagePatientDelay ?? 0,
      averageDoctorDelay: dashboard.averageDoctorDelay ?? 0,
      averageWaitingTime: dashboard.averageWaitingTime ?? 0,
      predictionAccuracy: dashboard.predictionAccuracy ?? 0,
      noShowRate: dashboard.noShowRate ?? 0,
      lateArrivalRate: dashboard.lateArrivalRate ?? 0,
      mostDelayedDoctor: dashboard.mostDelayedDoctor || 'N/A',
      mostReliablePatient: dashboard.mostReliablePatient || 'N/A',
      topAppointmentType: dashboard.topAppointmentType || 'Consultation',
      averageConsultationTime: dashboard.averageConsultationTime ?? 0,
    };
  }

  return null;
};

export const getSuggestionText = (suggestion: any) => {
  if (!suggestion) return '';
  return [suggestion.arrivalHint, suggestion.doctorHint, suggestion.predictionLabel].filter(Boolean).join(' ');
};

export const getDisplayWaitingTime = (minutes: number) => formatMinutesToLabel(minutes);
