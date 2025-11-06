const Application = require('./application.model');
const Job = require('../jobs/job.model');
const Business = require('../businesses/business.model');
const WorkerProfile = require('../workers/workerProfile.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { ensureBusinessAccess } = require('../../shared/utils/businessAccess');
const { buildApplicationPresenter } = require('./application.presenter');

const APPLICATION_FREE_QUOTA = 3;

exports.createApplication = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can apply to jobs', 403));
  }

  const job = await Job.findById(req.params.jobId).populate('business');
  if (!job || job.status !== 'active') {
    return next(new AppError('Job is not available for applications', 400));
  }

  const existing = await Application.findOne({ job: job._id, worker: req.user._id });
  if (existing) {
    return next(new AppError('You have already applied to this job', 400));
  }

  if (!req.user.premium && req.user.freeApplicationsUsed >= APPLICATION_FREE_QUOTA) {
    return next(new AppError('Free application limit reached. Upgrade to continue.', 402));
  }

  const profile = await WorkerProfile.findOne({ user: req.user._id });

  // Get location from job or business
  // Get location from job or business and ensure it's complete
  const jobLocation = job.location || job.business?.location;
  
  if (!jobLocation) {
    return next(new AppError('Job location information is required', 400));
  }

  // Construct a complete location object
  const locationData = {
    latitude: parseFloat(jobLocation.latitude) || 0,
    longitude: parseFloat(jobLocation.longitude) || 0,
    formattedAddress: jobLocation.formattedAddress || [
      jobLocation.line1,
      jobLocation.city,
      jobLocation.state,
      jobLocation.postalCode,
      jobLocation.country
    ].filter(Boolean).join(', '),
    allowedRadius: parseInt(jobLocation.allowedRadius, 10) || 150
  };

  // Validate location data
  if (!locationData.latitude || !locationData.longitude) {
    return next(new AppError('Valid location coordinates are required', 400));
  }

  if (!locationData.formattedAddress) {
    if (jobLocation.line1 || jobLocation.city || jobLocation.state) {
      locationData.formattedAddress = [
        jobLocation.line1,
        jobLocation.city,
        jobLocation.state
      ].filter(Boolean).join(', ');
    } else {
      locationData.formattedAddress = `${jobLocation.latitude}, ${jobLocation.longitude}`;
    }
  }

  const application = await Application.create({
    job: job._id,
    worker: req.user._id,
    business: job.business._id,
    location: locationData,
    message: req.body.message || '',
    snapshot: {
      name: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      skills: profile?.skills || [],
      experience: profile?.experience || ''
    }
  });

  job.applicantsCount += 1;
  await job.save();

  if (!req.user.premium) {
    req.user.freeApplicationsUsed += 1;
    await req.user.save();
  }

  res.status(201).json({ status: 'success', data: application });
});

exports.getWorkerApplications = catchAsync(async (req, res, next) => {
  const { workerId } = req.params;

  // Check if user exists and has a valid token
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  // Only allow workers to view their own applications or employers with proper permissions
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId) {
    return next(new AppError('You can only view your own applications', 403));
  }

  if (req.user.userType === 'employer' && !req.user.permissions?.includes('view_applications')) {
    return next(new AppError('You do not have permission to view worker applications', 403));
  }

  // Find applications for the specified worker
  const applications = await Application.find({ worker: workerId })
    .populate({
      path: 'job',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .populate('worker', 'firstName lastName email phone userType')
    .sort({ createdAt: -1 });

  if (!applications.length) {
    return next(new AppError('No applications found for this worker', 404));
  }

  const workerProfile = await WorkerProfile.findOne({ user: workerId });

  const data = applications.map(application => buildApplicationPresenter(application, {
    workerProfile,
    includeApplicantDetails: true
  }));

  res.status(200).json({ 
    status: 'success', 
    results: data.length,
    data 
  });
});

// Workers view their own applications
exports.listWorkerApplications = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Access denied. Worker account required.', 403));
  }

  const applications = await Application.find({ worker: req.user._id })
    .populate({
      path: 'job',
      select: 'title description salary location status',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .select('-__v')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: { applications }
  });
});

// Get all applications for all businesses owned by the employer
exports.listAllBusinessApplications = catchAsync(async (req, res, next) => {
  console.log('Debug - User:', {
    id: req.user._id,
    type: req.user.userType
  });

  if (req.user.userType !== 'employer') {
    return next(new AppError('Access denied. Employer account required.', 403));
  }

  // Find all businesses owned by this employer
  const businesses = await Business.find({ owner: req.user._id });
  console.log('Debug - Found businesses:', businesses.map(b => ({
    id: b._id,
    name: b.name
  })));
  
  const businessIds = businesses.map(b => b._id);

  // Get applications for all these businesses
  console.log('Debug - Looking for applications with businessIds:', businessIds);
  
  const applications = await Application.find({ business: { $in: businessIds } })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'job',
      select: 'title location salary business'
    })
    .populate('business', 'name')
    .select('-__v')
    .sort({ createdAt: -1 })
    .lean();

  console.log('Debug - Found applications:', applications.map(app => ({
    id: app._id,
    businessId: app.business?._id,
    jobId: app.job?._id,
    status: app.status
  })));

  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: { 
      applications: applications.map(app => ({
        ...app.toObject(),
        canHire: app.status === 'pending',
        canReject: app.status === 'pending'
      }))
    }
  });
});

// Employers view applications for a specific business
exports.listBusinessApplications = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Access denied. Employer account required.', 403));
  }

  const { businessId } = req.params;

  // Verify business ownership
  const business = await Business.findOne({ _id: businessId, owner: req.user._id });
  if (!business) {
    return next(new AppError('Business not found or access denied', 404));
  }

  const applications = await Application.find({ business: businessId })
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'job',
      select: 'title location salary'
    })
    .select('-__v')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: { 
      applications: applications.map(app => ({
        ...app.toObject(),
        canHire: app.status === 'pending',
        canReject: app.status === 'pending'
      }))
    }
  });
});

// Employers update application status (hire/reject)
exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  const { applicationId } = req.params;
  const { status, hiringNotes } = req.body;

  if (!['hired', 'rejected'].includes(status)) {
    return next(new AppError('Invalid status. Use "hired" or "rejected"', 400));
  }

  const application = await Application.findById(applicationId)
    .populate({
      path: 'business',
      select: 'owner'
    });

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Verify business ownership
  if (!application.business || application.business.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }

  // Check if the application can be updated
  if (application.status !== 'pending') {
    return next(new AppError(`Cannot ${status} application. Current status: ${application.status}`, 400));
  }

  // Update application status
  application.status = status;
  if (hiringNotes) application.hiringNotes = hiringNotes;
  
  if (status === 'hired') {
    application.hiredAt = new Date();
    application.rejectedAt = undefined;
  } else if (status === 'rejected') {
    application.rejectedAt = new Date();
    application.hiredAt = undefined;
  }

  await application.save();

  // Return updated application with populated fields
  const updatedApplication = await Application.findById(applicationId)
    .populate({
      path: 'worker',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'job',
      select: 'title location salary'
    });

  res.status(200).json({
    status: 'success',
    data: { 
      application: {
        ...updatedApplication.toObject(),
        canHire: updatedApplication.status === 'pending',
        canReject: updatedApplication.status === 'pending'
      }
    }
  });
});

exports.listApplications = catchAsync(async (req, res, next) => {
  // Find applications for the authenticated worker
  const applications = await Application.find({ worker: req.user._id })
    .populate({
      path: 'job',
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

  const workerProfiles = await WorkerProfile.find({ user: req.user._id });
  const profileMap = new Map(
    workerProfiles.map((profile) => [profile.user.toString(), profile])
  );

  const data = applications.map((application) => {
    const workerId =
      application.worker && application.worker._id
        ? application.worker._id.toString()
        : application.worker?.toString();
    const workerProfile = workerId ? profileMap.get(workerId) || null : null;
    return buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails: true
    });
  });

  res.status(200).json({ status: 'success', results: data.length, data });
});

exports.updateApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate('job');
  if (!application) {
    return next(new AppError('Application not found', 404));
  }
  if (req.user.userType === 'worker') {
    if (application.worker.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only modify your application', 403));
    }
    const previousStatus = application.status;

    if (req.body.status === 'withdrawn') {
      if (previousStatus === 'hired') {
        return next(new AppError('You cannot withdraw an application that has already been hired', 400));
      }

      if (previousStatus === 'rejected') {
        return next(new AppError('You cannot withdraw an application that has already been decided', 400));
      }

      if (previousStatus !== 'withdrawn') {
        application.status = 'withdrawn';
        application.withdrawnAt = new Date();
        application.rejectedAt = undefined;

        if (application.job && typeof application.job.applicantsCount === 'number') {
          if (typeof application.job.save === 'function' && previousStatus === 'pending') {
            application.job.applicantsCount = Math.max(0, application.job.applicantsCount - 1);
            await application.job.save();
          }
        }
      }
    }

    if (typeof req.body.message !== 'undefined') {
      application.message = req.body.message;
    }

    await application.save();
    const updatedApplication = await Application.findById(application._id).populate('job');
    return res.status(200).json({ status: 'success', data: updatedApplication });
  }
  if (req.user.userType === 'employer') {
    if (!application.job) {
      return next(new AppError('Job information missing for application', 400));
    }

    await ensureBusinessAccess({
      user: req.user,
      businessId: application.job.business,
      requiredPermissions: 'manage_applications',
    });

    if (!['pending', 'hired', 'rejected'].includes(req.body.status)) {
      return next(new AppError('Invalid status', 400));
    }
    application.status = req.body.status;
    if (req.body.status === 'hired') {
      application.hiredAt = new Date();
      application.withdrawnAt = undefined;
    }
    if (req.body.status === 'rejected') {
      application.rejectedAt = new Date();
      application.withdrawnAt = undefined;
    }
    await application.save();
    return res.status(200).json({ status: 'success', data: application });
  }
  return next(new AppError('Not authorized to update application', 403));
});

exports.listApplications = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  const applications = await Application.find(filter)
    .populate({
      path: 'job',
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

  const workerIds = new Set();
  applications.forEach((application) => {
    const worker = application.worker;
    if (!worker) return;
    const id =
      worker && worker._id
        ? worker._id.toString()
        : typeof worker === 'string'
        ? worker
        : null;
    if (id) {
      workerIds.add(id);
    }
  });

  const profiles = workerIds.size
    ? await WorkerProfile.find({ user: { $in: Array.from(workerIds) } })
    : [];
  const profileMap = new Map(
    profiles.map((profile) => [profile.user.toString(), profile])
  );

  const data = applications.map((application) => {
    const worker = application.worker;
    const workerId =
      worker && worker._id
        ? worker._id.toString()
        : typeof worker === 'string'
        ? worker
        : null;
    const workerProfile = workerId ? profileMap.get(workerId) || null : null;
    return buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails: true
    });
  });

  res.status(200).json({ status: 'success', results: data.length, data });
});
