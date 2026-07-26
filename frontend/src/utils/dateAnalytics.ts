export const getAppointmentDate = (value?: string | Date | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatTimeLabel = (value?: Date | string | null) => {
  const date = getAppointmentDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const formatMinutesToLabel = (minutes: number) => {
  if (!Number.isFinite(minutes)) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
