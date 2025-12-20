const AttendanceRecord = require('./attendance.model');
const Job = require('../jobs/job.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const catchAsync = require('../../shared/utils/catchAsync');
const { getAccessibleBusinessIds } = require('../../shared/utils/businessAccess');
const notificationUtils = require('../notification/notification.utils');

const HOURS_IN_MS = 1000 * 60 * 60;

const roundToTwo = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const buildDayRange = (dateInput) => {
  const base = new Date(dateInput);
  if (Number.isNaN(base.valueOf())) {
    return null;
  }
  // Work in UTC to avoid timezone dependencies
  const start = new Date(base);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const toTimeString = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toDateString = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  return date.toISOString().split('T')[0];
};

const toIdString = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Object && value._id) {
    return value._id.toString();
  }
  if (value.toString) {
    return value.toString();
  }
  return null;
};

const buildWorkerName = (worker, snapshot) => {
  if (snapshot) {
    return snapshot;
  }
  if (!worker) {
    return 'Unknown Worker';
  }
  if (worker.fullName) {
    return worker.fullName;
  }
  const parts = [worker.firstName, worker.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  if (worker.email) {
    return worker.email;
  }
  return 'Unknown Worker';
};

const formatLocationSnapshot = (input, fallbackLabel = null) => {
  if (!input) {
    return fallbackLabel || null;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed || fallbackLabel || null;
  }

  if (input.formattedAddress) {
    return input.formattedAddress;
  }

  const parts = [];
  if (input.line1) {
    parts.push(input.line1);
  }
  if (input.address && input.address !== input.line1) {
    parts.push(input.address);
  }
  const cityState = [input.city, input.state].filter(Boolean).join(', ');
  if (cityState) {
    parts.push(cityState);
  } else if (input.city) {
    parts.push(input.city);
  }
  if (input.postalCode) {
    parts.push(input.postalCode);
  }
  if (parts.length > 0) {
    return parts.join(', ');
  }
  if (input.name) {
    return input.name;
  }
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return `${input.latitude}, ${input.longitude}`;
  }
  if (input.description) {
    return input.description;
  }
  return fallbackLabel || null;
};

const pickJobLocationSnapshot = (job) => {
  if (!job) return null;

  const jobLocation = job.location;
  const fromJob = formatLocationSnapshot(jobLocation, job.title ? `${job.title} Location` : null);
  if (fromJob) {
    return fromJob;
  }

  const business = job.business;
  if (business && typeof business === 'object' && business.location) {
    const fromBusiness = formatLocationSnapshot(
      business.location,
      business.name ? `${business.name} Location` : null
    );
    if (fromBusiness) {
      return fromBusiness;
    }
    if (business.name) {
      return business.name;
    }
  }

  return null;
};

const buildLocationLabel = (record) => {
  const snapshot = formatLocationSnapshot(record.locationSnapshot);
  if (snapshot) {
    return snapshot;
  }
  const fromJob = pickJobLocationSnapshot(record.job);
  if (fromJob) {
    return fromJob;
  }
  if (record.business && typeof record.business === 'object' && record.business.name) {
    return record.business.name;
  }
  return 'Location TBD';
};

const toPlainObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value.toObject === 'function') {
    return value.toObject();
  }
  return value;
};

const normalizeSimpleLocationInput = (input, fallback = {}) => {
  const source = toPlainObject(input);
  if (!source || typeof source !== 'object') {
    return null;
  }

  const latitude = Number(source.latitude);
  const longitude = Number(source.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const allowedRadiusSource =
    source.allowedRadius ??
    source.radius ??
    fallback.allowedRadius;
  const allowedRadius = Number(allowedRadiusSource);

  const formattedAddress =
    source.formattedAddress ||
    fallback.formattedAddress ||
    formatLocationSnapshot(source, fallback.fallbackLabel || null);

  if (!formattedAddress) {
    return null;
  }

  const normalized = {
    latitude,
    longitude,
    formattedAddress
  };

  if (Number.isFinite(allowedRadius)) {
    normalized.allowedRadius = allowedRadius;
  }

  return normalized;
};

const ensureRecordJobLocation = (record) => {
  if (record.jobLocation) {
    return record.jobLocation;
  }

  const job = record.job || {};
  const derived =
    normalizeSimpleLocationInput(job.location, {
      formattedAddress: job.businessAddress,
      fallbackLabel: pickJobLocationSnapshot(job),
      allowedRadius: job.location?.allowedRadius
    }) ||
    normalizeSimpleLocationInput(job.business?.location, {
      fallbackLabel: job.business?.name
    });

  if (derived) {
    record.jobLocation = derived;
  }

  return record.jobLocation;
};

const resolveHourlyRate = (record) => {
  if (typeof record.hourlyRate === 'number') {
    return record.hourlyRate;
  }
  if (record.job && typeof record.job.hourlyRate === 'number') {
    return record.job.hourlyRate;
  }
  return 0;
};

const mapRecordToManagementView = (record) => {
  if (!record) {
    return null;
  }
  const scheduledStart = record.scheduledStart ? new Date(record.scheduledStart) : null;
  const scheduledEnd = record.scheduledEnd ? new Date(record.scheduledEnd) : null;
  const dto = {
    id: toIdString(record._id),
    workerId: toIdString(record.worker),
    workerName: buildWorkerName(record.worker, record.workerNameSnapshot),
    jobId: toIdString(record.job),
    jobTitle: record.jobTitleSnapshot || record.job?.title || 'Untitled Role',
    location: buildLocationLabel(record),
    date: toDateString(scheduledStart),
    clockIn: toTimeString(record.clockInAt),
    clockOut: toTimeString(record.clockOutAt),
    totalHours: Number(record.totalHours || 0),
    hourlyRate: resolveHourlyRate(record),
    earnings: Number(record.earnings || 0),
    status: record.status,
    isLate: Boolean(record.isLate),
    scheduledStart: toTimeString(scheduledStart),
    scheduledEnd: toTimeString(scheduledEnd)
  };
  return dto;
};

const buildManagementSummary = (records) => {
  const initial = {
    totalWorkers: 0,
    completedShifts: 0,
    totalHours: 0,
    totalPayroll: 0,
    lateArrivals: 0
  };
  return records.reduce((acc, record) => {
    acc.totalWorkers += 1;
    if (record.status === 'completed') {
      acc.completedShifts += 1;
    }
    if (record.isLate) {
      acc.lateArrivals += 1;
    }
    acc.totalHours = roundToTwo(acc.totalHours + (record.totalHours || 0));
    acc.totalPayroll = roundToTwo(acc.totalPayroll + (record.earnings || 0));
    return acc;
  }, initial);
};

exports.listAttendance = catchAsync(async (req, res, next) => {
  const filter = {};
  
  // Workers can only see their own attendance records
  if (req.user.userType === 'worker') {
    filter.worker = req.user._id;
  }
  // Add business access control for employers
  else if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    if (!accessibleBusinessIds.size) {
      return res.status(200).json({ status: 'success', results: 0, data: [] });
    }

    if (req.query.businessId) {
      if (!accessibleBusinessIds.has(req.query.businessId)) {
        return next(new AppError('You do not have access to this business', 403));
      }
      filter.business = req.query.businessId;
    } else {
      filter.business = { $in: Array.from(accessibleBusinessIds) };
    }
  }
  // Other user types shouldn't have access to attendance
  else {
    return next(new AppError('You do not have permission to view attendance records', 403));
  }

  if (req.query.workerId && req.user.userType !== 'worker') {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }

  if (req.query.date) {
    const range = buildDayRange(req.query.date);
    if (!range) {
      return next(new AppError('Invalid date parameter', 400));
    }
    // Find records where the scheduled time range overlaps with the queried date
    // A job overlaps with a date if: job_start <= day_end AND job_end > day_start
    filter.scheduledStart = { $lte: range.end };
    filter.scheduledEnd = { $gt: range.start };
  } else {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const buildBoundary = (value, boundary) => {
      const range = buildDayRange(value);
      if (!range) {
        return null;
      }
      return boundary === 'end' ? range.end : range.start;
    };

    const startBoundary = startDate ? buildBoundary(startDate, 'start') : null;
    const endBoundary = endDate ? buildBoundary(endDate, 'end') : null;

    if (startDate && !startBoundary) {
      return next(new AppError('Invalid startDate parameter', 400));
    }
    if (endDate && !endBoundary) {
      return next(new AppError('Invalid endDate parameter', 400));
    }

    if (startBoundary || endBoundary) {
      // Use range intersection logic for date ranges
      // Find records that overlap with the specified date range
      if (startBoundary && endBoundary) {
        // Both start and end dates specified - find records that overlap with this range
        filter.scheduledStart = { $lte: endBoundary };
        filter.scheduledEnd = { $gt: startBoundary };
      } else if (startBoundary) {
        // Only start date - find records that end after this date
        filter.scheduledEnd = { $gt: startBoundary };
      } else if (endBoundary) {
        // Only end date - find records that start before this date
        filter.scheduledStart = { $lte: endBoundary };
      }
    }
  }
  if (req.query.status) {
    const normalizedStatus = req.query.status.toString().trim().toLowerCase().replace(/_/g, '-');
    if (normalizedStatus && normalizedStatus !== 'all') {
      filter.status = normalizedStatus;
    }
  }
  const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getAttendanceRecord = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId).populate([
    { path: 'worker', select: 'firstName lastName email phone userType' },
    {
      path: 'job',
      select: 'title hourlyRate location business businessAddress',
      populate: { path: 'business', select: 'name location' }
    },
    { path: 'business', select: 'name location' }
  ]);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker?._id?.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only view your own attendance records', 403));
  }
  // Add business access control for employers
  if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    const businessId = record.business?._id?.toString() || record.business?.toString();
    if (!businessId || !accessibleBusinessIds.has(businessId)) {
      return next(new AppError('You do not have access to this attendance record', 403));
    }
  }
  res.status(200).json({ status: 'success', data: record });
});

exports.scheduleAttendance = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can schedule attendance', 403));
  }
  const { job: jobId, worker: workerId, scheduledStart: scheduledStartInput, scheduledEnd: scheduledEndInput } = req.body;

  if (!jobId || !workerId) {
    return next(new AppError('job and worker fields are required', 400));
  }

  if (!scheduledStartInput || !scheduledEndInput) {
    return next(new AppError('scheduledStart and scheduledEnd are required', 400));
  }

  const scheduledStart = new Date(scheduledStartInput);
  const scheduledEnd = new Date(scheduledEndInput);
  if (Number.isNaN(scheduledStart.valueOf()) || Number.isNaN(scheduledEnd.valueOf())) {
    return next(new AppError('Invalid scheduledStart or scheduledEnd', 400));
  }
  if (scheduledEnd <= scheduledStart) {
    return next(new AppError('scheduledEnd must be after scheduledStart', 400));
  }

  const job = await Job.findById(jobId)
    .populate({ path: 'business', select: 'name location' });
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (job.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only schedule attendance for your own jobs', 403));
  }
  if (!job.business) {
    return next(new AppError('Job must be associated with a business', 400));
  }

  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }
  if (worker.userType !== 'worker') {
    return next(new AppError('Selected user is not a worker', 400));
  }

  const hourlyRate =
    req.body.hourlyRate !== undefined
      ? Number(req.body.hourlyRate)
      : job.hourlyRate;
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return next(new AppError('hourlyRate must be a non-negative number', 400));
  }

  const workerNameSnapshot = req.body.workerNameSnapshot || buildWorkerName(worker, null);
  const jobTitleSnapshot = req.body.jobTitleSnapshot || job.title || 'Untitled Role';
  const locationSnapshot =
    formatLocationSnapshot(req.body.locationSnapshot) ||
    pickJobLocationSnapshot(job) ||
    job.businessAddress ||
    jobTitleSnapshot;

  const derivedJobLocation =
    normalizeSimpleLocationInput(req.body.jobLocation, {
      formattedAddress: locationSnapshot,
      allowedRadius: job.location?.allowedRadius,
      fallbackLabel: locationSnapshot
    }) ||
    normalizeSimpleLocationInput(job.location, {
      formattedAddress: job.businessAddress,
      fallbackLabel: locationSnapshot
    }) ||
    normalizeSimpleLocationInput(job.business?.location, {
      fallbackLabel: job.business?.name
    });

  const record = await AttendanceRecord.create({
    worker: workerId,
    job: job._id,
    employer: req.user._id,
    business: job.business._id || job.business,
    scheduledStart,
    scheduledEnd,
    hourlyRate,
    workerNameSnapshot,
    jobTitleSnapshot,
    locationSnapshot,
    notes: req.body.notes,
    ...(derivedJobLocation ? { jobLocation: derivedJobLocation } : {})
  });

  res.status(201).json({ status: 'success', data: record });
});

exports.clockIn = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only clock in for your own shift', 403));
  }
  if (record.clockInAt) {
    return next(new AppError('Already clocked in', 400));
  }
  await record.populate([
    {
      path: 'job',
      select: 'hourlyRate location title business businessAddress',
      populate: { path: 'business', select: 'name location' }
    },
    { path: 'worker', select: 'firstName lastName email' },
    { path: 'business', select: 'name location' }
  ]);
  const now = new Date();
  record.clockInAt = now;
  record.status = 'clocked-in';
  if (now > record.scheduledStart) {
    record.isLate = true;
  }
  if (!record.hourlyRate && record.job?.hourlyRate) {
    record.hourlyRate = record.job.hourlyRate;
  }
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  const fallbackLocationLabel =
    record.locationSnapshot ||
    pickJobLocationSnapshot(record.job) ||
    record.job?.businessAddress ||
    'Location TBD';
  if (!record.locationSnapshot && fallbackLocationLabel) {
    record.locationSnapshot = fallbackLocationLabel;
  }

  const jobLocation = ensureRecordJobLocation(record);

  if (req.body.clockInLocation) {
    const normalized = normalizeSimpleLocationInput(req.body.clockInLocation, {
      formattedAddress: fallbackLocationLabel || jobLocation?.formattedAddress,
      fallbackLabel: fallbackLocationLabel || jobLocation?.formattedAddress,
      allowedRadius: jobLocation?.allowedRadius
    });
    if (!normalized) {
      return next(new AppError('clockInLocation must include latitude and longitude', 400));
    }
    record.clockInLocation = normalized;
    if (jobLocation) {
      const validation = record.isLocationValid(normalized.latitude, normalized.longitude);
      record.clockInDistance = validation.distance;
      record.locationValidated = validation.isValid;
      record.locationValidationMessage = validation.message;
    }
  }

  await record.save();

  // SEND NOTIFICATION - Attendance Check In
  try {
    const formattedTime = new Date(record.clockInAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    await notificationUtils.sendTemplatedNotification(
      req.user._id.toString(),
      "attendanceCheckIn",
      [req.user.firstName || record.workerNameSnapshot || 'Worker', formattedTime],
      {
        data: {
          recordId: record._id.toString(),
          jobTitle: record.jobTitleSnapshot
        }
      }
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }

  res.status(200).json({ status: 'success', data: record });
});

exports.clockOut = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType === 'worker' && record.worker.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only clock out for your own shift', 403));
  }
  if (!record.clockInAt) {
    return next(new AppError('Clock in before clocking out', 400));
  }
  if (record.clockOutAt) {
    return next(new AppError('Already clocked out', 400));
  }
  await record.populate([
    {
      path: 'job',
      select: 'hourlyRate location title business businessAddress',
      populate: { path: 'business', select: 'name location' }
    },
    { path: 'worker', select: 'firstName lastName email' },
    { path: 'business', select: 'name location' }
  ]);
  record.clockOutAt = new Date();
  record.status = 'completed';
  const durationHours = (record.clockOutAt - record.clockInAt) / HOURS_IN_MS;
  record.totalHours = roundToTwo(durationHours);
  const resolvedRate = typeof req.body.hourlyRate === 'number'
    ? req.body.hourlyRate
    : resolveHourlyRate(record);
  record.hourlyRate = resolvedRate;
  record.earnings = roundToTwo(record.totalHours * resolvedRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  const fallbackLocationLabel =
    record.locationSnapshot ||
    pickJobLocationSnapshot(record.job) ||
    record.job?.businessAddress ||
    'Location TBD';
  if (!record.locationSnapshot && fallbackLocationLabel) {
    record.locationSnapshot = fallbackLocationLabel;
  }

  const jobLocation = ensureRecordJobLocation(record);

  if (req.body.clockOutLocation) {
    const normalized = normalizeSimpleLocationInput(req.body.clockOutLocation, {
      formattedAddress: fallbackLocationLabel || jobLocation?.formattedAddress,
      fallbackLabel: fallbackLocationLabel || jobLocation?.formattedAddress,
      allowedRadius: jobLocation?.allowedRadius
    });
    if (!normalized) {
      return next(new AppError('clockOutLocation must include latitude and longitude', 400));
    }
    record.clockOutLocation = normalized;
    if (jobLocation) {
      const validation = record.isLocationValid(normalized.latitude, normalized.longitude);
      record.clockOutDistance = validation.distance;
      record.locationValidated = validation.isValid;
      record.locationValidationMessage = validation.message;
    }
  }

  await record.save();

  // SEND NOTIFICATION - Attendance Check Out
  try {
    const formattedTime = new Date(record.clockOutAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    await notificationUtils.sendTemplatedNotification(
      req.user._id.toString(),
      "attendanceCheckOut",
      [req.user.firstName || record.workerNameSnapshot || 'Worker', formattedTime],
      {
        data: {
          recordId: record._id.toString(),
          totalHours: record.totalHours,
          earnings: record.earnings
        }
      }
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }

  res.status(200).json({ status: 'success', data: record });
});

exports.getManagementView = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can access attendance management', 403));
  }
  if (!req.query.date) {
    return next(new AppError('The date query parameter is required', 400));
  }
  const range = buildDayRange(req.query.date);
  if (!range) {
    return next(new AppError('Invalid date parameter', 400));
  }
  
  // Add business access control
  const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
  if (!accessibleBusinessIds.size) {
    return res.status(200).json({ 
      status: 'success', 
      data: [], 
      summary: { totalWorkers: 0, totalHours: 0, totalDistance: 0 } 
    });
  }

  const filter = {
    employer: req.user._id,
    // Find records where the scheduled time range overlaps with the queried date
    // A job overlaps with a date if: job_start <= day_end AND job_end > day_start
    scheduledStart: { $lte: range.end },
    scheduledEnd: { $gt: range.start },
    business: { $in: Array.from(accessibleBusinessIds) }
  };

  if (req.query.businessId) {
    if (!accessibleBusinessIds.has(req.query.businessId)) {
      return next(new AppError('You do not have access to this business', 403));
    }
    filter.business = req.query.businessId;
  }

  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  const records = await AttendanceRecord.find(filter)
    .populate([
      { path: 'worker', select: 'firstName lastName email' },
      { path: 'job', select: 'title hourlyRate location business' }
    ])
    .sort({ scheduledStart: 1 })
    .lean();
  const managementRecords = records.map(mapRecordToManagementView).filter(Boolean);
  const summary = buildManagementSummary(managementRecords);
  res.status(200).json({
    status: 'success',
    data: {
      records: managementRecords,
      summary
    }
  });
});

exports.markComplete = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update this record', 403));
  }
  
  // Add business access control
  if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    const businessId = record.business?.toString();
    if (!businessId || !accessibleBusinessIds.has(businessId)) {
      return next(new AppError('You do not have access to this business', 403));
    }
  }

  if (!record.clockInAt) {
    return next(new AppError('Clock in before marking complete', 400));
  }
  if (record.status !== 'clocked-in') {
    return next(new AppError('Only clocked-in shifts can be marked complete', 400));
  }
  await record.populate([
    {
      path: 'job',
      select: 'title hourlyRate location business businessAddress',
      populate: { path: 'business', select: 'name location' }
    },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  const scheduledEnd = record.scheduledEnd ? new Date(record.scheduledEnd) : null;
  const effectiveClockOut = scheduledEnd && scheduledEnd > record.clockInAt ? scheduledEnd : new Date();
  record.clockOutAt = effectiveClockOut;
  record.status = 'completed';
  const durationHours = Math.max(0, (effectiveClockOut - record.clockInAt) / HOURS_IN_MS);
  record.totalHours = roundToTwo(durationHours);
  const hourlyRate = resolveHourlyRate(record);
  record.hourlyRate = hourlyRate;
  record.earnings = roundToTwo(record.totalHours * hourlyRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }
  await record.save();

  const dto = mapRecordToManagementView(
    record.toObject({ virtuals: true })
  );
  res.status(200).json({ status: 'success', data: dto });
});

exports.updateHours = catchAsync(async (req, res, next) => {
  const { totalHours, hourlyRate } = req.body;
  if (totalHours === undefined) {
    return next(new AppError('totalHours is required', 400));
  }
  const parsedHours = Number(totalHours);
  if (!Number.isFinite(parsedHours) || parsedHours < 0) {
    return next(new AppError('totalHours must be a non-negative number', 400));
  }
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update this record', 403));
  }
  
  // Add business access control
  if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    const businessId = record.business?.toString();
    if (!businessId || !accessibleBusinessIds.has(businessId)) {
      return next(new AppError('You do not have access to this business', 403));
    }
  }

  await record.populate([
    {
      path: 'job',
      select: 'title hourlyRate location business businessAddress',
      populate: { path: 'business', select: 'name location' }
    },
    { path: 'worker', select: 'firstName lastName email' }
  ]);
  const resolvedRate =
    hourlyRate !== undefined ? Number(hourlyRate) : resolveHourlyRate(record);
  if (!Number.isFinite(resolvedRate) || resolvedRate < 0) {
    return next(new AppError('hourlyRate must be a non-negative number', 400));
  }
  record.totalHours = roundToTwo(parsedHours);
  record.hourlyRate = resolvedRate;
  record.earnings = roundToTwo(record.totalHours * resolvedRate);
  if (!record.workerNameSnapshot && record.worker) {
    record.workerNameSnapshot = buildWorkerName(record.worker, null);
  }
  if (!record.jobTitleSnapshot && record.job) {
    record.jobTitleSnapshot = record.job.title;
  }
  if (!record.locationSnapshot) {
    const locationFromJob = pickJobLocationSnapshot(record.job);
    if (locationFromJob) {
      record.locationSnapshot = locationFromJob;
    }
  }
  await record.save();
  const dto = mapRecordToManagementView(
    record.toObject({ virtuals: true })
  );
  res.status(200).json({ status: 'success', data: dto });
});

exports.updateAttendance = catchAsync(async (req, res, next) => {
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return next(new AppError('Attendance record not found', 404));
  }
  if (req.user.userType !== 'employer' || record.employer?.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the owning employer can update attendance', 403));
  }
  
  // Add business access control
  if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    const businessId = record.business?.toString();
    if (!businessId || !accessibleBusinessIds.has(businessId)) {
      return next(new AppError('You do not have access to this business', 403));
    }
  }

  Object.assign(record, req.body);
  await record.save();
  res.status(200).json({ status: 'success', data: record });
});
