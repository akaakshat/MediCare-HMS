const DEFAULT_APPOINTMENT_DURATION_MINUTES = 15;
const COMPLETED_STATUSES = ['Completed', 'completed', 'Confirmed', 'confirmed'];

const getAppointmentDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDoctorName = (doctor) => {
  if (!doctor) return '';
  if (typeof doctor === 'string') return doctor.trim();
  if (typeof doctor === 'object') {
    if (typeof doctor.name === 'string' && doctor.name.trim()) return doctor.name.trim();
    if (typeof doctor.fullName === 'string' && doctor.fullName.trim()) return doctor.fullName.trim();
  }
  return '';
};

const getPatientId = (patient) => {
  if (!patient) return '';
  if (typeof patient === 'string') return patient;
  if (typeof patient === 'object') {
    if (typeof patient._id === 'string' && patient._id.trim()) return patient._id;
    if (typeof patient.id === 'string' && patient.id.trim()) return patient.id;
  }
  return '';
};

const getTypeBaseDuration = (type) => {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized.includes('emerg')) return 30;
  if (normalized.includes('follow')) return 8;
  if (normalized.includes('check') || normalized.includes('visit')) return 12;
  return DEFAULT_APPOINTMENT_DURATION_MINUTES;
};

const getAppointmentStatus = (appointment) => String(appointment?.status || '').trim();
const isCompleted = (appointment) => COMPLETED_STATUSES.includes(getAppointmentStatus(appointment));

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + Number(value || 0), 0);
  return sum / values.length;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveHistory = (appointments, patientId, doctorName, appointmentType) => {
  const filtered = Array.isArray(appointments) ? appointments : [];
  return filtered.filter((appointment) => {
    const matchesPatient = !patientId || !getPatientId(appointment.patient) || getPatientId(appointment.patient) === patientId;
    const matchesDoctor = !doctorName || !getDoctorName(appointment.doctor) || getDoctorName(appointment.doctor).toLowerCase() === String(doctorName).trim().toLowerCase();
    const matchesType = !appointmentType || !appointment?.type || String(appointment.type).trim().toLowerCase() === String(appointmentType).trim().toLowerCase();
    return matchesPatient || matchesDoctor || matchesType;
  });
};

const calculateReliabilityScore = (stats = {}) => {
  const totalAppointments = Math.max(0, Number(stats.totalAppointments || 0));
  if (!totalAppointments) {
    return {
      score: 0,
      label: 'New Patient',
      badge: '🟡',
      text: 'New patient – no history available',
      confidence: 35,
      confidenceLabel: 'Low',
    };
  }

  const latePenalty = (Number(stats.lateCount || 0) / totalAppointments) * 55;
  const noShowPenalty = (Number(stats.noShowCount || 0) / totalAppointments) * 60;
  const cancellationPenalty = (Number(stats.cancellationCount || 0) / totalAppointments) * 30;
  const score = clamp(100 - latePenalty - noShowPenalty - cancellationPenalty, 0, 100);

  let label = 'Reliable';
  let badge = '🟢';
  let text = 'Reliable';

  if (score < 40) {
    label = 'Frequently Late';
    badge = '🔴';
    text = 'Frequently late';
  } else if (score < 75) {
    label = 'Sometimes Late';
    badge = '🟡';
    text = 'Sometimes late';
  }

  return {
    score: Math.round(score),
    label,
    badge,
    text,
    confidence: clamp(40 + (totalAppointments * 5), 35, 95),
    confidenceLabel: score >= 85 ? 'Very High' : score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low',
  };
};

const predictArrivalTime = (appointments = [], options = {}) => {
  const patientId = options.patientId || '';
  const scheduledAt = options.scheduledAt ? getAppointmentDate(options.scheduledAt) : null;
  const patientHistory = (appointments || []).filter((appointment) => {
    const appointmentPatientId = getPatientId(appointment.patient);
    return appointmentPatientId && patientId && appointmentPatientId === patientId;
  });

  const totalAppointments = patientHistory.length;
  const lateCount = patientHistory.filter((appointment) => Number(appointment?.lateMinutes || 0) > 0).length;
  const averageLateMinutes = patientHistory.length > 0 ? Math.round(average(patientHistory.map((appointment) => Number(appointment?.lateMinutes || 0)))) : 0;
  const averageEarlyMinutes = patientHistory.length > 0 ? Math.round(average(patientHistory.map((appointment) => Number(appointment?.earlyMinutes || 0)))) : 0;
  const noShowCount = patientHistory.filter((appointment) => String(appointment?.status || '').trim().toLowerCase() === 'no-show').length;
  const cancellationCount = patientHistory.filter((appointment) => String(appointment?.status || '').trim().toLowerCase() === 'cancelled').length;

  const reliability = calculateReliabilityScore({ totalAppointments, lateCount, noShowCount, cancellationCount });
  const predictedLateMinutes = Math.max(0, averageLateMinutes || Math.max(0, noShowCount * 4 + cancellationCount * 2));
  const suggestedOffsetMinutes = Math.min(20, Math.max(0, predictedLateMinutes));
  const suggestedBookingTime = scheduledAt ? new Date(scheduledAt.getTime() - suggestedOffsetMinutes * 60000) : null;

  return {
    predictedLateMinutes,
    suggestedOffsetMinutes,
    suggestedBookingTime,
    reliability,
    suggestion: predictedLateMinutes > 0
      ? `Patient usually arrives ${predictedLateMinutes} minutes late.`
      : 'Patient arrival pattern is not yet established.',
    recommendedTimeLabel: suggestedBookingTime ? suggestedBookingTime.toTimeString().slice(0, 5) : null,
    confidence: reliability.confidence,
    confidenceLabel: reliability.confidenceLabel,
  };
};

const predictConsultationDuration = (appointments = [], doctorName, appointmentType) => {
  const doctorValue = String(doctorName || '').trim().toLowerCase();
  const doctorHistory = (appointments || []).filter((appointment) => {
    const appointmentDoctorName = String(getDoctorName(appointment.doctor) || '').trim().toLowerCase();
    return doctorValue && appointmentDoctorName && appointmentDoctorName === doctorValue;
  });

  const typeBase = getTypeBaseDuration(appointmentType);
  const durationValues = doctorHistory.length > 0
    ? doctorHistory.map((appointment) => Number(appointment?.predictedDurationMinutes || appointment?.durationMinutes || typeBase))
    : [];

  const predictedMinutes = durationValues.length > 0
    ? Math.round(average(durationValues))
    : typeBase;

  const adjusted = clamp(predictedMinutes, 8, 30);
  const confidenceValue = clamp(45 + (doctorHistory.length * 8), 35, 95);

  return {
    predictedMinutes: adjusted,
    confidence: confidenceValue,
    confidenceLabel: confidenceValue >= 85 ? 'Very High' : confidenceValue >= 70 ? 'High' : confidenceValue >= 50 ? 'Medium' : 'Low',
    suggestion: doctorHistory.length > 0
      ? `Doctor usually finishes appointments around ${adjusted} minutes.`
      : 'No doctor history available yet; using default consultation estimate.',
  };
};

const predictWaitingTime = (appointments = [], doctorName, scheduledAt, predictedDuration = DEFAULT_APPOINTMENT_DURATION_MINUTES) => {
  const doctorValue = String(doctorName || '').trim().toLowerCase();
  const targetDate = getAppointmentDate(scheduledAt);
  const queueAppointments = (appointments || []).filter((appointment) => {
    const appointmentDoctorName = String(getDoctorName(appointment.doctor) || '').trim().toLowerCase();
    const appointmentDate = getAppointmentDate(appointment.scheduledAt);
    return doctorValue && appointmentDoctorName === doctorValue && appointmentDate && targetDate && appointmentDate.toDateString() === targetDate.toDateString();
  });

  const queuePosition = queueAppointments.filter((appointment) => {
    const appointmentDate = getAppointmentDate(appointment.scheduledAt);
    return appointmentDate && appointmentDate.getTime() <= (targetDate ? targetDate.getTime() : Number.MAX_SAFE_INTEGER);
  }).length;

  const expectedMinutes = Math.max(0, queuePosition * predictedDuration);
  return {
    expectedMinutes,
    confidence: clamp(40 + Math.min(20, queuePosition * 3), 35, 90),
    confidenceLabel: expectedMinutes > 15 ? 'Medium' : 'High',
    suggestion: expectedMinutes > 0 ? `Expected waiting time: ${expectedMinutes} minutes` : 'Expected waiting time is minimal.',
  };
};

const generateScheduleSuggestions = (appointments = [], doctorName, scheduledAt, predictedDuration = DEFAULT_APPOINTMENT_DURATION_MINUTES) => {
  const doctorValue = String(doctorName || '').trim().toLowerCase();
  const targetDate = getAppointmentDate(scheduledAt);
  const suggestions = [];

  if (!doctorValue || !targetDate) return suggestions;

  const sameDoctorAppointments = (appointments || []).filter((appointment) => {
    const appointmentDoctorName = String(getDoctorName(appointment.doctor) || '').trim().toLowerCase();
    const appointmentDate = getAppointmentDate(appointment.scheduledAt);
    return appointmentDoctorName === doctorValue && appointmentDate && appointmentDate.toDateString() === targetDate.toDateString();
  });

  if (sameDoctorAppointments.length >= 4) {
    const timeHour = targetDate.getHours();
    if (timeHour >= 11 && timeHour <= 13) {
      suggestions.push({
        type: 'schedule',
        title: 'Schedule recommendation',
        message: 'Doctor appears overloaded between 11 AM and 1 PM. Consider moving one visit later in the day.',
        recommendedTime: '3:00 PM',
        expectedReductionMinutes: Math.max(8, predictedDuration - 5),
      });
    }
  }

  return suggestions;
};

const calculateConfidence = (historyCount, consistencyScore = 0) => {
  const value = clamp(40 + historyCount * 8 + consistencyScore * 5, 35, 95);
  return {
    value,
    label: value >= 85 ? 'Very High' : value >= 70 ? 'High' : value >= 50 ? 'Medium' : 'Low',
  };
};

const predictDoctorDelay = (appointments = [], doctorName, scheduledAt) => {
  const doctorValue = String(doctorName || '').trim().toLowerCase();
  const targetDate = getAppointmentDate(scheduledAt);
  const doctorHistory = (appointments || []).filter((appointment) => {
    const appointmentDoctorName = String(getDoctorName(appointment.doctor) || '').trim().toLowerCase();
    const appointmentDate = getAppointmentDate(appointment.scheduledAt);
    return doctorValue && appointmentDoctorName === doctorValue && appointmentDate && targetDate && appointmentDate.toDateString() === targetDate.toDateString();
  });

  const baseDelay = doctorHistory.length > 0 ? Math.min(18, doctorHistory.length * 3) : 0;
  const hour = targetDate ? targetDate.getHours() : 9;
  const delayMinutes = hour >= 14 ? baseDelay + 6 : baseDelay;

  return {
    delayMinutes: Math.max(0, delayMinutes),
    message: delayMinutes > 0 ? `Doctor usually runs ${delayMinutes} minutes behind after ${hour >= 14 ? '2 PM' : 'morning hours'}.` : 'Doctor schedule appears consistent.',
  };
};

const generateOptimizerDashboard = (appointments = []) => {
  const completedAppointments = (appointments || []).filter((appointment) => isCompleted(appointment));
  const lateArrivalRate = completedAppointments.length > 0
    ? (completedAppointments.filter((appointment) => Number(appointment?.lateMinutes || 0) > 0).length / completedAppointments.length) * 100
    : 0;
  const noShowRate = appointments.length > 0
    ? (appointments.filter((appointment) => String(appointment?.status || '').trim().toLowerCase() === 'no-show').length / appointments.length) * 100
    : 0;

  const patientStats = new Map();
  const doctorStats = new Map();
  const typeCounts = new Map();

  (appointments || []).forEach((appointment) => {
    const patientKey = getPatientId(appointment.patient) || String(appointment?.patient || '').trim();
    if (patientKey) {
      const entry = patientStats.get(patientKey) || { count: 0, lateMinutes: 0 };
      entry.count += 1;
      entry.lateMinutes += Number(appointment?.lateMinutes || 0);
      patientStats.set(patientKey, entry);
    }

    const doctorKey = getDoctorName(appointment.doctor) || 'Unassigned';
    const doctorEntry = doctorStats.get(doctorKey) || { count: 0, delayMinutes: 0 };
    doctorEntry.count += 1;
    doctorEntry.delayMinutes += Number(appointment?.expectedDelayMinutes || 0);
    doctorStats.set(doctorKey, doctorEntry);

    const typeKey = String(appointment?.type || 'Consultation').trim() || 'Consultation';
    const typeEntry = typeCounts.get(typeKey) || 0;
    typeCounts.set(typeKey, typeEntry + 1);
  });

  const mostReliablePatient = [...patientStats.entries()].sort((left, right) => {
    const leftScore = left[1].count > 0 ? left[1].lateMinutes / left[1].count : 0;
    const rightScore = right[1].count > 0 ? right[1].lateMinutes / right[1].count : 0;
    return leftScore - rightScore;
  })[0];

  const mostDelayedDoctor = [...doctorStats.entries()].sort((left, right) => (right[1].delayMinutes / right[1].count) - (left[1].delayMinutes / left[1].count))[0];
  const topAppointmentType = [...typeCounts.entries()].sort((left, right) => right[1] - left[1])[0];

  return {
    averagePatientDelay: Math.round(completedAppointments.length > 0 ? average(completedAppointments.map((appointment) => Number(appointment?.lateMinutes || 0))) : 0),
    averageDoctorDelay: Math.round(completedAppointments.length > 0 ? average(completedAppointments.map((appointment) => Number(appointment?.expectedDelayMinutes || 0))) : 0),
    averageWaitingTime: Math.round(appointments.length > 0 ? average(appointments.map((appointment) => Number(appointment?.expectedWaitingMinutes || 0))) : 0),
    predictionAccuracy: Math.round(clamp(90 - Math.max(0, appointments.length - 5) * 1.5, 65, 95)),
    noShowRate: Math.round(noShowRate),
    lateArrivalRate: Math.round(lateArrivalRate),
    mostDelayedDoctor: mostDelayedDoctor ? mostDelayedDoctor[0] : 'N/A',
    mostReliablePatient: mostReliablePatient ? mostReliablePatient[0] : 'N/A',
    topAppointmentType: topAppointmentType ? topAppointmentType[0] : 'Consultation',
    averageConsultationTime: Math.round(appointments.length > 0 ? average(appointments.map((appointment) => Number(appointment?.predictedDurationMinutes || getTypeBaseDuration(appointment?.type)))) : DEFAULT_APPOINTMENT_DURATION_MINUTES),
  };
};

const buildAppointmentOptimizer = (appointments = [], options = {}) => {
  const appointment = options.appointment || {};
  const doctorName = options.doctorName || getDoctorName(appointment.doctor) || '';
  const patientId = options.patientId || getPatientId(appointment.patient) || '';
  const scheduledAt = options.scheduledAt || appointment.scheduledAt || null;
  const appointmentType = options.appointmentType || appointment.type || 'Consultation';
  const currentQueue = Array.isArray(options.currentQueue) ? options.currentQueue : appointments;
  const arrivalPrediction = predictArrivalTime(appointments, { patientId, scheduledAt });
  const consultationPrediction = predictConsultationDuration(appointments, doctorName, appointmentType);
  const waitingPrediction = predictWaitingTime(currentQueue, doctorName, scheduledAt, consultationPrediction.predictedMinutes);
  const scheduleSuggestions = generateScheduleSuggestions(currentQueue, doctorName, scheduledAt, consultationPrediction.predictedMinutes);
  const doctorDelayPrediction = predictDoctorDelay(appointments, doctorName, scheduledAt);
  const confidence = calculateConfidence((appointments || []).filter((item) => getDoctorName(item.doctor) === doctorName).length + (patientId ? 1 : 0), 1);

  const suggestions = [];
  if (arrivalPrediction.suggestion) suggestions.push(arrivalPrediction.suggestion);
  if (consultationPrediction.suggestion) suggestions.push(consultationPrediction.suggestion);
  if (scheduleSuggestions.length > 0) suggestions.push(scheduleSuggestions[0].message);
  if (waitingPrediction.suggestion) suggestions.push(waitingPrediction.suggestion);

  return {
    arrivalPrediction,
    consultationPrediction,
    waitingPrediction,
    doctorDelayPrediction,
    scheduleSuggestions,
    suggestions,
    confidence,
    arrivalBadge: arrivalPrediction.reliability.badge,
    doctorDelayBadge: doctorDelayPrediction.delayMinutes > 0 ? '⚠️' : '✅',
    recommendedSlot: arrivalPrediction.recommendedTimeLabel || null,
    predictedDurationMinutes: consultationPrediction.predictedMinutes,
    expectedWaitingMinutes: waitingPrediction.expectedMinutes,
    expectedDelayMinutes: doctorDelayPrediction.delayMinutes,
  };
};

const normalizeAppointmentRecord = (appointment) => {
  if (!appointment) return null;
  if (typeof appointment.toObject === 'function') {
    return appointment.toObject();
  }
  return { ...appointment };
};

const attachOptimizerInsights = (appointments = []) => {
  const normalizedAppointments = (appointments || [])
    .map((appointment) => normalizeAppointmentRecord(appointment))
    .filter(Boolean);

  const dashboard = generateOptimizerDashboard(normalizedAppointments);

  return normalizedAppointments.map((appointment) => ({
    ...appointment,
    optimizer: buildAppointmentOptimizer(normalizedAppointments, {
      appointment,
      doctorName: getDoctorName(appointment.doctor),
      patientId: getPatientId(appointment.patient),
      scheduledAt: appointment.scheduledAt,
      appointmentType: appointment.type,
      currentQueue: normalizedAppointments,
    }),
    optimizerDashboard: dashboard,
  }));
};

module.exports = {
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  calculateReliabilityScore,
  predictArrivalTime,
  predictConsultationDuration,
  predictWaitingTime,
  generateScheduleSuggestions,
  calculateConfidence,
  predictDoctorDelay,
  generateOptimizerDashboard,
  buildAppointmentOptimizer,
  attachOptimizerInsights,
};
