const AttendanceRecord = require('./attendance.model');
const User = require('../users/user.model');
const Business = require('../businesses/business.model');
const {
  buildWorkerName,
  pickJobLocationSnapshot,
  normalizeSimpleLocationInput
} = require('./attendance.helpers');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SHIFT_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
const MIN_SHIFT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SHIFT_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
const DEFAULT_WEEKLY_WINDOW_DAYS = 35; // 5 weeks
const DEFAULT_MONTHLY_WINDOW_MONTHS = 6;
const DEFAULT_CUSTOM_WINDOW_DAYS = 60;
const MAX_GENERATED_OCCURRENCES = 365;

const DAY_NAME_TO_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const DAY_GROUPS = {
  weekday: [1, 2, 3, 4, 5],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
  weekends: [0, 6],
  daily: [0, 1, 2, 3, 4, 5, 6],
  everyday: [0, 1, 2, 3, 4, 5, 6],
  all: [0, 1, 2, 3, 4, 5, 6]
};

const ensureDate = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const startOfDayUtc = (value) => {
  const date = ensureDate(value);
  if (!date) {
    return null;
  }
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const addDaysUtc = (date, amount) => {
  const base = ensureDate(date);
  if (!base) {
    return null;
  }
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
};

const addMonthsUtc = (date, amount) => {
  const base = ensureDate(date);
  if (!base) {
    return null;
  }
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next;
};

const parseTimeString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0
  };
};

const deriveTimeParts = (timeLabel, fallbackDate, defaultParts = null) => {
  const parsed = parseTimeString(timeLabel);
  if (parsed) {
    return parsed;
  }
  const fallback = ensureDate(fallbackDate);
  if (fallback) {
    return {
      hours: fallback.getUTCHours(),
      minutes: fallback.getUTCMinutes(),
      seconds: fallback.getUTCSeconds(),
      milliseconds: fallback.getUTCMilliseconds()
    };
  }
  if (defaultParts) {
    return { ...defaultParts };
  }
  return null;
};

const buildDateTimeFromParts = (day, timeParts) => {
  const base = ensureDate(day);
  if (!base) {
    return null;
  }
  if (!timeParts) {
    return new Date(base);
  }
  const composed = new Date(base);
  composed.setUTCHours(0, 0, 0, 0);
  composed.setUTCHours(
    timeParts.hours ?? 0,
    timeParts.minutes ?? 0,
    timeParts.seconds ?? 0,
    timeParts.milliseconds ?? 0
  );
  return composed;
};

const clampDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return DEFAULT_SHIFT_DURATION_MS;
  }
  const clamped = Math.min(durationMs, MAX_SHIFT_DURATION_MS);
  return Math.max(clamped, MIN_SHIFT_DURATION_MS);
};

const computeShiftDurationMs = ({ recurrence, startParts, endParts, baseStart, baseEnd }) => {
  const isOneTime = recurrence === 'one-time' || recurrence === 'once';
  if (isOneTime && baseStart && baseEnd && baseEnd > baseStart) {
    return Math.max(baseEnd - baseStart, MIN_SHIFT_DURATION_MS);
  }

  if (startParts && endParts) {
    let diffMinutes =
      endParts.hours * 60 + endParts.minutes - (startParts.hours * 60 + startParts.minutes);
    if (diffMinutes <= 0) {
      diffMinutes += 24 * 60;
    }
    return clampDuration(diffMinutes * 60 * 1000);
  }

  if (baseStart && baseEnd) {
    const maybeDiff = baseEnd - baseStart;
    if (maybeDiff > 0 && maybeDiff <= MAX_SHIFT_DURATION_MS) {
      return clampDuration(maybeDiff);
    }
  }

  return DEFAULT_SHIFT_DURATION_MS;
};

const deriveWorkdaySet = (workDays, fallbackDayIndex) => {
  const set = new Set();
  if (Array.isArray(workDays)) {
    workDays.forEach((value) => {
      if (typeof value === 'number' && value >= 0 && value <= 6) {
        set.add(value);
        return;
      }
      if (!value && value !== 0) {
        return;
      }
      const normalized = value.toString().trim().toLowerCase();
      if (!normalized) {
        return;
      }
      if (DAY_GROUPS[normalized]) {
        DAY_GROUPS[normalized].forEach((dayIndex) => set.add(dayIndex));
        return;
      }
      if (DAY_NAME_TO_INDEX[normalized] !== undefined) {
        set.add(DAY_NAME_TO_INDEX[normalized]);
        return;
      }
      const shortMatch = Object.entries(DAY_NAME_TO_INDEX).find(([name]) =>
        name.startsWith(normalized)
      );
      if (shortMatch) {
        set.add(shortMatch[1]);
      }
    });
  }

  if (!set.size && typeof fallbackDayIndex === 'number') {
    set.add(fallbackDayIndex);
  }

  return set;
};

const extractCustomDates = (schedule) => {
  if (!schedule) {
    return [];
  }
  const candidates = [];
  if (Array.isArray(schedule.customDates)) {
    candidates.push(...schedule.customDates);
  }
  if (
    schedule.recurrence &&
    schedule.recurrence.toString().toLowerCase() === 'custom' &&
    Array.isArray(schedule.workDays)
  ) {
    candidates.push(...schedule.workDays);
  }

  const dedup = new Map();
  candidates.forEach((value) => {
    const date = ensureDate(value);
    if (!date) {
      return;
    }
    const keyDate = startOfDayUtc(date);
    if (keyDate) {
      dedup.set(keyDate.getTime(), keyDate);
    }
  });
  return Array.from(dedup.values()).sort((a, b) => a - b);
};

const buildOccurrences = (schedule, { maxOccurrences } = {}) => {
  if (!schedule) {
    return [];
  }

  const limit =
    Math.min(
      MAX_GENERATED_OCCURRENCES,
      Math.max(Number(maxOccurrences) || MAX_GENERATED_OCCURRENCES, 1)
    ) || MAX_GENERATED_OCCURRENCES;

  const recurrence = (schedule.recurrence || 'one-time').toString().toLowerCase();
  const baseStart = ensureDate(schedule.startDate);
  if (!baseStart) {
    return [];
  }
  const baseEnd = ensureDate(schedule.endDate);
  const now = new Date();

  const startParts =
    deriveTimeParts(schedule.startTime, baseStart, {
      hours: baseStart.getUTCHours(),
      minutes: baseStart.getUTCMinutes(),
      seconds: baseStart.getUTCSeconds(),
      milliseconds: baseStart.getUTCMilliseconds()
    }) || { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 };

  const endFallback =
    baseEnd &&
    baseEnd > baseStart &&
    baseEnd - baseStart <= MAX_SHIFT_DURATION_MS
      ? baseEnd
      : null;

  const endParts = deriveTimeParts(schedule.endTime, endFallback, null);

  const shiftDuration = computeShiftDurationMs({
    recurrence,
    startParts,
    endParts,
    baseStart,
    baseEnd
  });

  const occurrences = [];

  if (recurrence === 'one-time' || recurrence === 'once') {
    const singleStart = buildDateTimeFromParts(baseStart, startParts) || baseStart;
    const singleEnd =
      baseEnd && baseEnd > singleStart
        ? baseEnd
        : new Date(singleStart.getTime() + shiftDuration);
    if (singleEnd > now) {
      occurrences.push({ start: singleStart, end: singleEnd });
    }
    return occurrences.slice(0, limit);
  }

  const customDates = recurrence === 'custom' ? extractCustomDates(schedule) : [];
  if (customDates.length) {
    for (const day of customDates) {
      if (occurrences.length >= limit) {
        break;
      }
      const start = buildDateTimeFromParts(day, startParts) || new Date(day);
      const end = new Date(start.getTime() + shiftDuration);
      if (end > now) {
        occurrences.push({ start, end });
      }
    }
    return occurrences;
  }

  let windowStart = startOfDayUtc(baseStart);
  const today = startOfDayUtc(now);
  if (!windowStart) {
    windowStart = today;
  } else if (today && windowStart < today) {
    windowStart = today;
  }

  let windowEnd = startOfDayUtc(baseEnd);
  if (!windowEnd || windowEnd < windowStart) {
    if (recurrence === 'monthly') {
      windowEnd = startOfDayUtc(addMonthsUtc(windowStart, DEFAULT_MONTHLY_WINDOW_MONTHS));
    } else {
      const daysWindow =
        recurrence === 'custom'
          ? DEFAULT_CUSTOM_WINDOW_DAYS
          : DEFAULT_WEEKLY_WINDOW_DAYS;
      windowEnd = startOfDayUtc(addDaysUtc(windowStart, daysWindow));
    }
  }
  if (!windowEnd) {
    windowEnd = startOfDayUtc(addDaysUtc(windowStart, DEFAULT_WEEKLY_WINDOW_DAYS));
  }

  const targetDays = deriveWorkdaySet(schedule.workDays, baseStart.getUTCDay());
  let cursor = new Date(windowStart);
  while (cursor <= windowEnd && occurrences.length < limit) {
    const dayIndex = cursor.getUTCDay();
    if (!targetDays.size || targetDays.has(dayIndex)) {
      const start = buildDateTimeFromParts(cursor, startParts) || new Date(cursor);
      const end = new Date(start.getTime() + shiftDuration);
      if (end > now) {
        occurrences.push({ start, end });
      }
    }
    cursor = addDaysUtc(cursor, 1);
  }

  return occurrences;
};

const ensureWorkerDocument = async (worker) => {
  if (!worker) {
    return null;
  }
  if (worker.firstName || worker.fullName) {
    return worker;
  }
  return User.findById(worker).select('firstName lastName fullName email userType');
};

const ensureBusinessForJob = async (job) => {
  if (!job || !job.business) {
    return null;
  }
  if (job.business.location) {
    return job.business;
  }
  const businessId = job.business._id || job.business;
  if (!businessId) {
    return null;
  }
  const business = await Business.findById(businessId).select(
    'name businessName location address line1 city state postalCode country latitude longitude allowedRadius'
  );
  if (business) {
    job.business = business;
  }
  return job.business;
};

const buildJobLocationSnapshot = (job) =>
  pickJobLocationSnapshot(job) || job.businessAddress || job.title || 'Job location';

const buildJobLocationPayload = (job, fallbackLabel) =>
  normalizeSimpleLocationInput(job.location, {
    formattedAddress: job.businessAddress,
    fallbackLabel,
    allowedRadius: job.location?.allowedRadius
  }) ||
  normalizeSimpleLocationInput(job.business?.location, {
    fallbackLabel: job.business?.name
  });

const autoScheduleJobShifts = async ({
  job,
  worker,
  employerId,
  maxOccurrences = MAX_GENERATED_OCCURRENCES
}) => {
  if (!job || !job.schedule) {
    return { created: 0, reason: 'missing-schedule' };
  }
  if (job.status && job.status.toString().toLowerCase() === 'closed') {
    return { created: 0, reason: 'job-closed' };
  }

  const workerDoc = await ensureWorkerDocument(worker);
  if (!workerDoc) {
    return { created: 0, reason: 'worker-not-found' };
  }

  await ensureBusinessForJob(job);

  const occurrences = buildOccurrences(job.schedule, { maxOccurrences });
  if (!occurrences.length) {
    return { created: 0, reason: 'no-occurrences' };
  }

  const businessId = job.business?._id || job.business || null;
  const employer =
    employerId ||
    (job.employer && job.employer._id ? job.employer._id : job.employer) ||
    null;
  const hourlyRate = job.hourlyRate;
  const locationSnapshot = buildJobLocationSnapshot(job);
  const jobLocationPayload = buildJobLocationPayload(job, locationSnapshot);

  const existingRecords = await AttendanceRecord.find({
    worker: workerDoc._id,
    job: job._id,
    scheduledStart: { $in: occurrences.map((occ) => occ.start) }
  }).select('scheduledStart');

  const existing = new Set(existingRecords.map((record) => record.scheduledStart.getTime()));
  const payloads = occurrences
    .filter((occ) => !existing.has(occ.start.getTime()))
    .map((occ) => {
      const data = {
        worker: workerDoc._id,
        employer,
        job: job._id,
        business: businessId,
        scheduledStart: occ.start,
        scheduledEnd: occ.end,
        hourlyRate,
        workerNameSnapshot: buildWorkerName(workerDoc, null),
        jobTitleSnapshot: job.title || 'Untitled Role',
        locationSnapshot
      };
      if (jobLocationPayload) {
        data.jobLocation = jobLocationPayload;
      }
      return data;
    });

  if (!payloads.length) {
    return { created: 0, reason: 'all-exist', planned: occurrences.length };
  }

  await AttendanceRecord.insertMany(payloads, { ordered: false });

  return {
    created: payloads.length,
    planned: occurrences.length
  };
};

module.exports = {
  autoScheduleJobShifts
};
