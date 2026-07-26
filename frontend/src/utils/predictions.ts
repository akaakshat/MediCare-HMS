import { DEFAULT_APPOINTMENT_DURATION_MINUTES, clamp } from './optimizer';

export const getTypeBaseDuration = (type?: string) => {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized.includes('emerg')) return 30;
  if (normalized.includes('follow')) return 8;
  if (normalized.includes('check') || normalized.includes('visit')) return 12;
  return DEFAULT_APPOINTMENT_DURATION_MINUTES;
};

export const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 85) return 'Very High';
  if (confidence >= 70) return 'High';
  if (confidence >= 50) return 'Medium';
  return 'Low';
};

export const calculateConfidence = (historyCount: number, consistencyScore = 1) => {
  const value = clamp(40 + historyCount * 8 + consistencyScore * 5, 35, 95);
  return { value, label: getConfidenceLabel(value) };
};
