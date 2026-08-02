const toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clampPercentage = (value) => {
  if (Number.isNaN(value) || value === Infinity || value === -Infinity) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const valid = values.map((value) => toSafeNumber(value)).filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const sum = (values) => {
  if (!Array.isArray(values)) return 0;
  return values.reduce((sumValue, item) => sumValue + toSafeNumber(item), 0);
};

const uniq = (values) => {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null).map(String)));
};

const groupBy = (items = [], keyFn) => {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
};

const formatDateKey = (date, period = 'day') => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  switch (period) {
    case 'week': {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'year':
      return `${d.getFullYear()}`;
    default:
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

const countBy = (items, keyFn) => {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    if (!counts[key]) counts[key] = 0;
    counts[key] += 1;
    return counts;
  }, {});
};

module.exports = {
  toSafeNumber,
  clampPercentage,
  average,
  sum,
  uniq,
  groupBy,
  formatDateKey,
  countBy,
};
