export interface OptimizerConfidence {
  value: number;
  label: 'Very High' | 'High' | 'Medium' | 'Low';
}

export interface OptimizerReliability {
  score: number;
  label: string;
  badge: string;
  text: string;
  confidence: number;
  confidenceLabel: string;
}

export interface OptimizerOutcome {
  predictedLateMinutes: number;
  suggestedOffsetMinutes: number;
  suggestedBookingTime: Date | null;
  reliability: OptimizerReliability;
  suggestion: string;
  recommendedTimeLabel: string | null;
  confidence: number;
  confidenceLabel: string;
}

export interface OptimizerDashboardSummary {
  averagePatientDelay: number;
  averageDoctorDelay: number;
  averageWaitingTime: number;
  predictionAccuracy: number;
  noShowRate: number;
  lateArrivalRate: number;
  mostDelayedDoctor: string;
  mostReliablePatient: string;
  topAppointmentType: string;
  averageConsultationTime: number;
}

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 15;
export const DEFAULT_CONFIDENCE_LOW = 35;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
