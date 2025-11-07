const mongoose = require('mongoose');
const WorkerProfile = require('./workerProfile.model');
const User = require('../users/user.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const Shift = require('../shifts/shift.model');
const SwapRequest = require('../shifts/swapRequest.model');
const WorkerFeedback = require('./feedback.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { minimizeProfileImages } = require('../../shared/utils/logoUrlMinimizer');
const { buildApplicationPresenter } = require('../applications/application.presenter');
const {
  mapRecordToScheduleEntry,
  buildSectionTotals,
  buildStatusCounter
} = require('../attendance/attendanceSchedule.utils');

exports.getWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  const user = await User.findById(workerId);
  if (!user || user.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }
  const profile = await WorkerProfile.findOne({ user: workerId });
  
  // Minimize profile images for faster loading
  const optimizedProfile = profile ? minimizeProfileImages(profile, 'worker') : null;
  
  res.status(200).json({ status: 'success', data: { user, profile: optimizedProfile } });
});

exports.getWorkerDashboard = catchAsync(async (req, res, next) => {
  const workerId = req.user._id;
  
  // Get recent applications
  const applications = await Application.find({ worker: workerId })
    .sort({ createdAt: -1 })
    .limit(5);

  // Get upcoming shifts
  const now = new Date();
  const shifts = await Shift.find({
    worker: workerId,
    startDate: { $gte: now }
  }).sort({ startDate: 1 }).limit(5);

  // Get recent attendance
  const attendance = await AttendanceRecord.find({ worker: workerId })
    .sort({ date: -1 })
    .limit(5);

  // Get metrics
  const metrics = {
    totalApplications: await Application.countDocuments({ worker: workerId }),
    activeApplications: await Application.countDocuments({ 
      worker: workerId,
      status: 'pending'
    }),
    completedShifts: await Shift.countDocuments({
      worker: workerId,
      endDate: { $lt: now }
    }),
    upcomingShifts: await Shift.countDocuments({
      worker: workerId,
      startDate: { $gte: now }
    })
  };

  res.status(200).json({
    status: 'success',
    data: {
      metrics,
      recentApplications: applications,
      upcomingShifts: shifts,
      recentAttendance: attendance
    }
  });
});

exports.getEmploymentHistory = catchAsync(async (req, res) => {
  const workerId = req.user._id;

  // Get completed shifts grouped by business
  const history = await Shift.aggregate([
    { $match: { worker: workerId, status: 'completed' } },
    { $group: {
      _id: '$business',
      totalShifts: { $sum: 1 },
      totalHours: { $sum: '$hoursWorked' },
      firstShift: { $min: '$startDate' },
      lastShift: { $max: '$endDate' }
    }},
    { $lookup: {
      from: 'businesses',
      localField: '_id',
      foreignField: '_id',
      as: 'business'
    }},
    { $unwind: '$business' }
  ]);

  res.status(200).json({
    status: 'success',
    data: history
  });
});

exports.getWorkerFeedback = catchAsync(async (req, res) => {
  const workerId = req.user._id;
  
  const feedback = await WorkerFeedback.find({ worker: workerId })
    .populate('employer', 'firstName lastName')
    .populate('job', 'title')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    data: feedback
  });
});

exports.updateWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType !== 'worker' || req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only update your own profile', 403));
  }
  const allowedFields = ['firstName', 'lastName', 'phone'];
  allowedFields.forEach((field) => {
    if (field in req.body) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();

  const profileFields = ['bio', 'skills', 'experience', 'languages', 'profilePicture', 'portfolioImages'];
  const profile = await WorkerProfile.findOneAndUpdate(
    { user: workerId },
    profileFields.reduce((acc, field) => {
      if (field in req.body) {
        acc[field] = req.body[field];
      }
      return acc;
    }, {}),
    { new: true }
  );

  // Minimize profile images for response
  const optimizedProfile = profile ? minimizeProfileImages(profile, 'worker') : null;

  res.status(200).json({ status: 'success', data: { user: req.user, profile: optimizedProfile } });
});

exports.getWorkerApplications = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own applications', 403));
  }
  const applications = await Application.find({ worker: workerId })
    .populate({
      path: 'job',
      select:
        'title status description hourlyRate business schedule location urgency tags overtime verificationRequired premiumRequired applicantsCount',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone userType'
    })
    .sort({ createdAt: -1 });

  const workerProfile = await WorkerProfile.findOne({ user: workerId });

  const data = applications.map((application) =>
    buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails: true
    })
  );

  res.status(200).json({ status: 'success', results: data.length, data });
});

exports.getWorkerAttendance = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own attendance', 403));
  }
  const filter = { worker: workerId };
  if (req.query.date) {
    const targetDate = new Date(req.query.date);
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    filter.scheduledStart = { $gte: start, $lte: end };
  }
  const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getWorkerAttendanceSchedule = catchAsync(async (req, res, next) => {
  const requestedWorkerId = req.params.workerId || req.user._id.toString();

  if (req.user.userType === 'worker' && req.user._id.toString() !== requestedWorkerId.toString()) {
    return next(new AppError('You can only view your own schedule', 403));
  }
  if (!req.params.workerId && req.user.userType !== 'worker') {
    return next(new AppError('Employers must specify a workerId to view schedules', 400));
  }
  if (req.params.workerId && !mongoose.Types.ObjectId.isValid(req.params.workerId)) {
    return next(new AppError('Invalid workerId parameter', 400));
  }

  const worker = await User.findById(requestedWorkerId);
  if (!worker || worker.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }

  const statusFilter = (req.query.status || 'all')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const allowedStatuses = new Set(['scheduled', 'clocked-in', 'completed', 'missed', 'all']);
  if (!allowedStatuses.has(statusFilter)) {
    return next(new AppError('Invalid status filter', 400));
  }

  const filter = { worker: worker._id };
  if (statusFilter !== 'all') {
    filter.status = statusFilter;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }

  const parseBoundary = (value, boundary) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return null;
    }
    if (boundary === 'start') {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const fromBoundary = parseBoundary(req.query.from, 'start');
  const toBoundary = parseBoundary(req.query.to, 'end');

  if (req.query.from && !fromBoundary) {
    return next(new AppError('Invalid from parameter', 400));
  }
  if (req.query.to && !toBoundary) {
    return next(new AppError('Invalid to parameter', 400));
  }

  if (fromBoundary || toBoundary) {
    filter.scheduledStart = {};
    if (fromBoundary) {
      filter.scheduledStart.$gte = fromBoundary;
    }
    if (toBoundary) {
      filter.scheduledStart.$lte = toBoundary;
    }
  }

  const records = await AttendanceRecord.find(filter)
    .populate([
      {
        path: 'job',
        select: 'title hourlyRate location business businessAddress',
        populate: { path: 'business', select: 'name' }
      },
      { path: 'business', select: 'name' }
    ])
    .sort({ scheduledStart: 1 })
    .lean();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const entries = records
    .map((record) => mapRecordToScheduleEntry(record, { now, startOfToday, endOfToday }))
    .filter(Boolean);

  const statusCounts = buildStatusCounter();
  let pastCount = 0;
  let upcomingCount = 0;
  let firstUpcomingDate = null;
  let lastPastDate = null;
  let rangeStart = null;
  let rangeEnd = null;

  entries.forEach((entry) => {
    if (entry.status) {
      statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
    }
    if (entry.isPast) {
      pastCount += 1;
      if (!lastPastDate || entry.date > lastPastDate) {
        lastPastDate = entry.date;
      }
    } else {
      upcomingCount += 1;
      if (!firstUpcomingDate || entry.date < firstUpcomingDate) {
        firstUpcomingDate = entry.date;
      }
    }
    if (!rangeStart || entry.date < rangeStart) {
      rangeStart = entry.date;
    }
    if (!rangeEnd || entry.date > rangeEnd) {
      rangeEnd = entry.date;
    }
  });

  const grouped = new Map();
  entries.forEach((entry) => {
    if (!grouped.has(entry.date)) {
      grouped.set(entry.date, {
        date: entry.date,
        dayOfWeek: entry.dayOfWeek,
        isPast: entry.isPast,
        isUpcoming: entry.isUpcoming,
        isFuture: entry.isFuture,
        isToday: entry.isToday,
        hasInProgress: entry.isInProgress,
        entries: []
      });
    }
    const group = grouped.get(entry.date);
    if (group.entries.length > 0) {
      group.isPast = group.isPast && entry.isPast;
      group.isUpcoming = group.isUpcoming || entry.isUpcoming;
      group.isFuture = group.isFuture && entry.isFuture;
      group.isToday = group.isToday || entry.isToday;
    }
    group.hasInProgress = group.hasInProgress || entry.isInProgress;
    group.entries.push(entry);
  });

  const schedule = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      totals: buildSectionTotals(group.entries)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byStatus = Object.entries(statusCounts).reduce((acc, [key, value]) => {
    if (value > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const summary = {
    totalRecords: entries.length,
    pastCount,
    upcomingCount,
    byStatus,
    firstUpcomingDate,
    lastPastDate,
    range: entries.length ? { start: rangeStart, end: rangeEnd } : null
  };

  res.status(200).json({
    status: 'success',
    data: {
      workerId: worker._id.toString(),
      summary,
      schedule
    }
  });
});

exports.getWorkerShifts = catchAsync(async (req, res, next) => {
  // For /me/shifts route or when accessing other workers' shifts
  const workerId = req.params.workerId || req.user._id;

  // If worker tries to access another worker's shifts
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own shifts', 403));
  }

  // If employer/admin tries to access worker shifts, they should have appropriate permissions
  if (req.user.userType !== 'worker' && !req.user.permissions?.includes('view_shifts')) {
    return next(new AppError('You do not have permission to view shifts', 403));
  }

  const shifts = await Shift.find({ worker: workerId }).sort({ scheduledStart: 1 });
  const swapRequests = await SwapRequest.find({
    $or: [{ fromWorker: workerId }, { toWorker: workerId }]
  })
    .populate('shift')
    .sort({ createdAt: -1 });

  res.status(200).json({ status: 'success', data: { shifts, swapRequests } });
});
