const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfWeek = (date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const endOfWeek = (date) => {
  const d = endOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d;
};

const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  return startOfDay(d);
};

const endOfMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return endOfDay(d);
};

const startOfYear = (date) => {
  const d = new Date(date);
  d.setMonth(0, 0);
  return startOfDay(d);
};

const endOfYear = (date) => {
  const d = new Date(date);
  d.setMonth(11, 31);
  return endOfDay(d);
};

const buildDateRange = ({ range, fromDate, toDate }) => {
  const now = new Date();
  const normalizedRange = String(range || 'today').trim().toLowerCase();
  let start = startOfDay(now);
  let end = endOfDay(now);

  switch (normalizedRange) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
      break;
    }
    case 'last7days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      start = startOfDay(from);
      end = endOfDay(now);
      break;
    }
    case 'last30days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      start = startOfDay(from);
      end = endOfDay(now);
      break;
    }
    case 'last90days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 89);
      start = startOfDay(from);
      end = endOfDay(now);
      break;
    }
    case 'thismonth':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'lastmonth': {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      start = startOfMonth(from);
      end = endOfMonth(from);
      break;
    }
    default:
      if (fromDate && toDate) {
        const from = parseDate(fromDate);
        const to = parseDate(toDate);
        if (from && to) {
          start = startOfDay(from);
          end = endOfDay(to);
        }
      }
      break;
  }

  return { start, end };
};

const normalizeDateKey = (date, period = 'day') => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  switch (period) {
    case 'week': {
      const start = startOfWeek(d);
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-` + `${String(start.getDate()).padStart(2, '0')}`;
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'year':
      return `${d.getFullYear()}`;
    default:
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

module.exports = {
  parseDate,
  buildDateRange,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  normalizeDateKey,
};
