import { DEFAULT_AVERAGE_CONSULTATION_MINUTES } from './constants';

export const formatMinutesToLabel = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 mins';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainder} mins`;
};

export const getAverageConsultationMinutes = (value?: number | null): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : DEFAULT_AVERAGE_CONSULTATION_MINUTES;
};
