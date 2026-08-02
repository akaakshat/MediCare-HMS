const Appointment = require('../models/Appoinment');
const Bill = require('../models/Bill');
const User = require('../models/User');
const EMR = require('../models/EMR');
const { buildDateRange, normalizeDateKey } = require('../utils/dateFilters');
const { average, clampPercentage, groupBy, sum, uniq, countBy, formatDateKey } = require('../utils/doctorPerformance');

const normalizeDoctorId = (value) => {
  if (!value) return null;
  return String(value).trim();
};

const getDoctorQueryScope = (reqUser, doctorId) => {
  const normalizedDoctorId = normalizeDoctorId(doctorId);
  if (reqUser.role === 'doctor') {
    return { doctor: String(reqUser.id) };
  }
  if (normalizedDoctorId) {
    return { doctor: normalizedDoctorId };
  }
  return {};
};

const sanitizeDateRange = ({ range, fromDate, toDate }) => buildDateRange({ range, fromDate, toDate });

const filterByDateRange = (items, dateField, start, end) => {
  return (items || []).filter((item) => {
    const value = item[dateField] || item?.createdAt || item?.date;
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date >= start && date <= end;
  });
};

const calculateAverageConsultationTime = (appointments = []) => {
  const completed = appointments.filter((appt) => String(appt.status).toLowerCase() === 'completed');
  if (completed.length === 0) return 0;
  const durations = completed.map((appt) => Number(appt.durationMinutes ?? appt.predictedDurationMinutes ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  return durations.length === 0 ? 0 : Math.round(average(durations) * 10) / 10;
};

const calculatePatientsPerDay = (appointments = [], start, end) => {
  const completed = appointments.filter((appt) => String(appt.status).toLowerCase() === 'completed');
  const patientsByDay = {};
  completed.forEach((appt) => {
    const date = appt.scheduledAt || appt.createdAt || appt.date;
    if (!date) return;
    const key = normalizeDateKey(date, 'day');
    if (!key) return;
    patientsByDay[key] = patientsByDay[key] || new Set();
    const patientId = appt.patient?._id || appt.patient;
    if (patientId) patientsByDay[key].add(String(patientId));
  });

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const totalPatients = Object.values(patientsByDay).reduce((acc, set) => acc + set.size, 0);
  return {
    totalByDay: Object.fromEntries(Object.entries(patientsByDay).map(([key, set]) => [key, set.size])),
    averagePerDay: Math.round((totalPatients / days) * 10) / 10,
    totalDays: days,
  };
};

const calculateFollowUpRate = (appointments = []) => {
  const total = appointments.length;
  if (total === 0) return 0;
  const followUps = appointments.filter((appt) => String(appt.type).toLowerCase() === 'follow-up').length;
  return clampPercentage((followUps / total) * 100);
};

const calculateCancellationRate = (appointments = []) => {
  const total = appointments.length;
  if (total === 0) return 0;
  const cancelled = appointments.filter((appt) => String(appt.status).toLowerCase() === 'cancelled').length;
  return clampPercentage((cancelled / total) * 100);
};

const calculateRevenue = (appointments = [], bills = [], start, end) => {
  const completedAppointments = appointments.filter((appt) => String(appt.status).toLowerCase() === 'completed');
  const validBills = (bills || []).filter((bill) => {
    const status = String(bill.status || '').toLowerCase();
    const date = bill.date || bill.createdAt || bill.created;
    if (!date) return false;
    if (Number.isNaN(new Date(date).getTime())) return false;
    if (status === 'cancelled') return false;
    if (bill.paid === false && status === 'pending') return false;
    return true;
  });

  const revenueByPeriod = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    custom: 0,
  };

  const now = new Date();
  const todayStart = buildDateRange({ range: 'today' }).start;
  const thisWeekStart = buildDateRange({ range: 'last7days' }).start;
  const thisMonthStart = buildDateRange({ range: 'thismonth' }).start;
  const thisYearStart = buildDateRange({ range: 'thisyear' }).start;

  const addRevenue = (bill) => {
    const billDate = new Date(bill.date || bill.createdAt || bill.created);
    if (Number.isNaN(billDate.getTime())) return;
    const amount = Number(bill.amount ?? 0) || 0;
    if (billDate >= todayStart) revenueByPeriod.today += amount;
    if (billDate >= thisWeekStart) revenueByPeriod.thisWeek += amount;
    if (billDate >= thisMonthStart) revenueByPeriod.thisMonth += amount;
    if (billDate >= thisYearStart) revenueByPeriod.thisYear += amount;
    if (billDate >= start && billDate <= end) revenueByPeriod.custom += amount;
  };

  validBills.forEach(addRevenue);

  return {
    ...revenueByPeriod,
    totalCompletedAppointments: completedAppointments.length,
    totalBillCount: validBills.length,
  };
};

const calculateRevisitPercentage = (appointments = [], windowDays = 30) => {
  if (!Array.isArray(appointments) || appointments.length === 0) return 0;

  const patients = {};
  appointments.forEach((appt) => {
    const patientId = appt.patient?._id || appt.patient;
    const scheduledAt = appt.scheduledAt || appt.date || appt.createdAt;
    if (!patientId || !scheduledAt) return;
    const key = String(patientId);
    patients[key] = patients[key] || [];
    patients[key].push(new Date(scheduledAt));
  });

  const revisitedPatientCount = Object.values(patients).reduce((count, dates) => {
    const sorted = dates.filter((d) => d instanceof Date && !Number.isNaN(d.getTime())).sort((a, b) => a - b);
    if (sorted.length < 2) return count;
    for (let i = 1; i < sorted.length; i += 1) {
      const diff = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= windowDays) return count + 1;
    }
    return count;
  }, 0);

  const uniqueCount = Object.keys(patients).length;
  if (uniqueCount === 0) return 0;
  return clampPercentage((revisitedPatientCount / uniqueCount) * 100);
};

const calculateNoShowRate = (appointments = []) => {
  const scheduled = appointments.filter((appt) => String(appt.status).toLowerCase() !== 'cancelled');
  if (scheduled.length === 0) return 0;
  const noShows = appointments.filter((appt) => String(appt.status).toLowerCase() === 'no-show').length;
  return clampPercentage((noShows / scheduled.length) * 100);
};

const calculateCompletionRate = (appointments = []) => {
  const scheduled = appointments.filter((appt) => String(appt.status).toLowerCase() !== 'cancelled');
  if (scheduled.length === 0) return 0;
  const completed = appointments.filter((appt) => String(appt.status).toLowerCase() === 'completed').length;
  return clampPercentage((completed / scheduled.length) * 100);
};

const calculateWorkingHours = (appointments = [], start, end) => {
  const completed = appointments.filter((appt) => String(appt.status).toLowerCase() === 'completed');
  if (completed.length === 0) return 0;

  const days = {};
  completed.forEach((appt) => {
    const scheduledAt = appt.scheduledAt || appt.date || appt.createdAt;
    if (!scheduledAt) return;
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) return;
    const key = normalizeDateKey(date, 'day');
    days[key] = days[key] || [];
    days[key].push(date);
  });

  const workingDurations = Object.values(days).map((dates) => {
    const sorted = dates.sort((a, b) => a - b);
    return (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / (1000 * 60);
  }).filter((d) => Number.isFinite(d) && d >= 0);

  return workingDurations.length === 0 ? 0 : Math.round((average(workingDurations)) * 10) / 10;
};

const calculateAverageWaitingTime = (appointments = []) => {
  const waitingValues = appointments.map((appt) => Number(appt.waitingMinutes ?? appt.expectedWaitingMinutes ?? 0)).filter((n) => Number.isFinite(n) && n >= 0);
  return waitingValues.length === 0 ? 0 : Math.round(average(waitingValues) * 10) / 10;
};

const calculateTrend = (appointmentsOrBills = [], dateField, start, end, period = 'day', metricField = null) => {
  const grouped = {};
  (appointmentsOrBills || []).forEach((item) => {
    const date = item[dateField] || item.createdAt || item.date;
    if (!date) return;
    const key = formatDateKey(date, period);
    if (!key) return;
    grouped[key] = grouped[key] || { count: 0, total: 0 };
    grouped[key].count += 1;
    grouped[key].total += Number(metricField ? (item[metricField] ?? 0) : 1);
  });

  const keys = Object.keys(grouped).sort();
  return keys.map((key) => ({ period: key, count: grouped[key].count, total: Math.round(grouped[key].total * 100) / 100 }));
};

const calculateTopDiagnoses = async (doctorFilter, start, end) => {
  const query = { deleted: false };
  if (doctorFilter.doctor) query.doctor = doctorFilter.doctor;
  const records = await EMR.find(query).lean();
  const filtered = filterByDateRange(records, 'createdAt', start, end);

  const diagnosisCounts = countBy(filtered, (record) => String(record.diagnosis || 'Unknown').trim() || 'Unknown');
  return Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

const calculateTopProcedures = async (doctorFilter, start, end) => {
  const query = { deleted: false };
  if (doctorFilter.doctor) query.doctor = doctorFilter.doctor;
  const records = await EMR.find(query).lean();
  const filtered = filterByDateRange(records, 'createdAt', start, end);

  const procedureCounts = {};
  filtered.forEach((record) => {
    const treatments = Array.isArray(record.treatmentTypeIds) ? record.treatmentTypeIds : [];
    treatments.forEach((treatment) => {
      const name = typeof treatment === 'string' ? treatment : treatment?.name || treatment?.code || '';
      const key = String(name).trim() || 'Unknown';
      procedureCounts[key] = (procedureCounts[key] || 0) + 1;
    });
  });

  return Object.entries(procedureCounts)
    .map(([procedure, count]) => ({ procedure, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

const generateDoctorAnalytics = async (reqUser, options = {}) => {
  const dateRange = sanitizeDateRange(options);
  const start = dateRange.start;
  const end = dateRange.end;
  const doctorFilter = getDoctorQueryScope(reqUser, options.doctorId);

  const appointmentQuery = {};
  if (doctorFilter.doctor) appointmentQuery.doctor = doctorFilter.doctor;
  const appointments = await Appointment.find(appointmentQuery).lean();
  const filteredAppointments = filterByDateRange(appointments, 'scheduledAt', start, end);

  const billQuery = {};
  if (doctorFilter.doctor) billQuery.doctor = doctorFilter.doctor;
  const bills = await Bill.find(billQuery).lean();
  const filteredBills = filterByDateRange(bills, 'date', start, end);

  const doctorId = doctorFilter.doctor;
  const doctor = doctorId ? await User.findById(doctorId).select('name email specialization departmentId').lean() : null;

  const patientsData = calculatePatientsPerDay(filteredAppointments, start, end);
  const revenueData = calculateRevenue(filteredAppointments, filteredBills, start, end);

  return {
    doctor: doctor ? { _id: doctor._id, name: doctor.name, email: doctor.email, specialization: doctor.specialization } : null,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      range: String(options.range || 'custom').toLowerCase(),
    },
    metrics: {
      averageConsultationTime: calculateAverageConsultationTime(filteredAppointments),
      patientsPerDay: patientsData.totalByDay,
      patientsPerDayAverage: patientsData.averagePerDay,
      followUpRate: calculateFollowUpRate(filteredAppointments),
      cancellationRate: calculateCancellationRate(filteredAppointments),
      revenue: revenueData,
      revisitPercentage: calculateRevisitPercentage(filteredAppointments, Number(options.revisitWindowDays || 30)),
      noShowRate: calculateNoShowRate(filteredAppointments),
      completionRate: calculateCompletionRate(filteredAppointments),
      averageWorkingHours: calculateWorkingHours(filteredAppointments, start, end),
      averageWaitingTime: calculateAverageWaitingTime(filteredAppointments),
    },
    trends: {
      consultationTrend: calculateTrend(filteredAppointments, 'scheduledAt', start, end, String(options.trendPeriod || 'day'), 'durationMinutes'),
      revenueTrend: calculateTrend(filteredBills, 'date', start, end, String(options.trendPeriod || 'week'), 'amount'),
      patientsPerDayTrend: Object.entries(patientsData.totalByDay).map(([day, count]) => ({ day, count })),
    },
    topDiagnoses: await calculateTopDiagnoses(doctorFilter, start, end),
    topProcedures: await calculateTopProcedures(doctorFilter, start, end),
    returningPatients: {
      returning: calculateRevisitPercentage(filteredAppointments, Number(options.revisitWindowDays || 30)),
      newPatientRate: clampPercentage(100 - calculateRevisitPercentage(filteredAppointments, Number(options.revisitWindowDays || 30))),
    },
  };
};

module.exports = {
  calculateAverageConsultationTime,
  calculatePatientsPerDay,
  calculateFollowUpRate,
  calculateCancellationRate,
  calculateRevenue,
  calculateRevisitPercentage,
  calculateNoShowRate,
  calculateCompletionRate,
  calculateWorkingHours,
  calculateAverageWaitingTime,
  calculateTrend,
  calculateTopDiagnoses,
  calculateTopProcedures,
  generateDoctorAnalytics,
};
