export const parseDate = (value?: string | Date | number | null): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatDateDDMMYYYY = (value?: string | Date | number | null): string => {
  const date = parseDate(value);
  if (!date) return '-';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export const formatDateTimeDDMMYYYY = (value?: string | Date | number | null): string => {
  const date = parseDate(value);
  if (!date) return '-';
  const datePart = formatDateDDMMYYYY(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
};
