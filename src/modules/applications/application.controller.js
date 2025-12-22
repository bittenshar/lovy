const Application = require('./application.model');
const Job = require('../jobs/job.model');
const WorkerProfile = require('../workers/workerProfile.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds
} = require('../../shared/utils/businessAccess');
const { buildApplicationPresenter } = require('./application.presenter');
const notificationUtils = require('../notification/notification.utils');

const APPLICATION_FREE_QUOTA = 2;
const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }  
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
};

exports.createApplication = catchAsync(async (req, res, next) => {
  // Allow both workers and employers to apply to jobs (for testing purposes)
  // In production, you might want to restrict this to workers only
  if (req.user.userType !== 'worker' && req.user.userType !== 'employer') {
    console.log('❌ [APP] Application rejected - user type:', req.user.userType);
    return next(new AppError('Only workers and employers can apply to jobs', 403));
  }

  console.log('✅ [APP] Application creation allowed for', req.user.userType);

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

  // SEND NOTIFICATION - Job Applied
  try {
    // Send notification to the employer who posted the job
    const employerId = job.employer ? job.employer.toString() : job.createdBy?.toString();
    if (employerId) {
      await notificationUtils.sendTemplatedNotification(
        employerId,
        "jobApplied",
        [job.title, job.business.name],
        {
          data: {
            jobId: job._id.toString(),
            applicationId: application._id.toString(),
            applicantName: req.user.firstName
          }
        }
      );
    }
  } catch (error) {
    console.error("Notification error:", error.message);
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
    .populate('worker', '_id firstName lastName email phone userType')
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

exports.listMyApplications = catchAsync(async (req, res, next) => {
  // Check if user exists and has a valid token
  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required', 401));
  }

  console.log('📋 [APP-CONTROLLER] listMyApplications called for user type:', req.user.userType);

  let query;
  
  // Different logic based on user type
  if (req.user.userType === 'worker' || req.user.userType === 'employee') {
    // Workers/employees: view their own applications
    console.log('   → Worker/employee: finding their own applications');
    query = { worker: req.user._id };
  } else if (req.user.userType === 'employer') {
    // Employers: view applications to their jobs
    console.log('   → Employer: finding applications to their jobs');
    const jobIds = await Job.distinct('_id', { employer: req.user._id });
    console.log('   → Found', jobIds.length, 'jobs for this employer');
    query = { job: { $in: jobIds } };
  } else {
    return next(new AppError('Invalid user type for this operation', 403));
  }

  // Find applications
  const applications = await Application.find(query)
    .populate({
      path: 'job',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .populate({
      path: 'worker',
      select: '_id firstName lastName email phone userType'
    })
    .sort({ createdAt: -1 });

  console.log('   → Found', applications.length, 'applications');

  const workerProfiles = await WorkerProfile.find();
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
      includeApplicantDetails: true,
      rawJobId: application.job?.toString ? application.job.toString() : application.job
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
  if (req.user.userType === 'employer' || req.user.userType === 'employee') {
    if (!application.job) {
      return next(new AppError('Job information missing for application', 400));
    }

    console.log('🔍 Employer/Employee hiring attempt:');
    console.log('   User ID:', req.user._id);
    console.log('   User Type:', req.user.userType);
    console.log('   Job Business ID:', application.job.business);

    // For employer/employee hiring, verify access to the business
    const Business = require('../../modules/businesses/business.model');
    const TeamMember = require('../../modules/businesses/teamMember.model');
    const business = await Business.findById(application.job.business);
    
    if (!business) {
      return next(new AppError('Job business not found', 404));
    }

    const businessOwnerId = business.owner.toString ? business.owner.toString() : business.owner;
    const userId = req.user._id.toString ? req.user._id.toString() : req.user._id;
    
    console.log('   Business owner ID:', businessOwnerId);
    console.log('   Current user ID:', userId);
    
    let hasAccess = false;
    
    // Check if user is the business owner
    if (businessOwnerId === userId) {
      hasAccess = true;
      console.log('✅ User is the business owner');
    } else if (req.user.userType === 'employee') {
      // For employees, check if they are a team member with manage_applications permission
      const teamMember = await TeamMember.findOne({
        user: userId,
        business: application.job.business,
        active: true
      });
      
      if (teamMember) {
        // Check if team member has manage_applications permission
        const permissions = teamMember.permissions || [];
        const rolePermissions = require('../../shared/middlewares/permissionMiddleware'); // We'll validate differently
        
        // For now, allow manager/supervisor/admin roles
        if (['admin', 'manager', 'supervisor'].includes(teamMember.role)) {
          hasAccess = true;
          console.log(`✅ Employee is a team member with role: ${teamMember.role}`);
        } else if (permissions.includes('manage_applications')) {
          hasAccess = true;
          console.log('✅ Employee has manage_applications permission');
        }
      }
    }
    
    if (!hasAccess) {
      console.error('❌ User does not have access to this business');
      return next(new AppError('You can only manage applications for jobs you own or have team access to', 403));
    }

    if (!['pending', 'hired', 'rejected'].includes(req.body.status)) {
      return next(new AppError('Invalid status', 400));
    }
    
    const previousStatus = application.status;
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

    // SEND NOTIFICATIONS based on status change
    try {
      const populatedApp = await Application.findById(application._id)
        .populate('job', 'title business')
        .populate('job.business', 'name')
        .populate('worker', '_id');

      if (previousStatus !== 'hired' && req.body.status === 'hired') {
        // Send jobAccepted notification
        await notificationUtils.sendTemplatedNotification(
          populatedApp.worker._id.toString(),
          "jobAccepted",
          [populatedApp.job.title, populatedApp.job.business.name],
          {
            data: {
              jobId: populatedApp.job._id.toString(),
              applicationId: application._id.toString()
            }
          }
        );
      } else if (previousStatus !== 'rejected' && req.body.status === 'rejected') {
        // Send jobRejected notification
        await notificationUtils.sendTemplatedNotification(
          populatedApp.worker._id.toString(),
          "jobRejected",
          [populatedApp.job.title, populatedApp.job.business.name],
          {
            data: {
              jobId: populatedApp.job._id.toString(),
              applicationId: application._id.toString()
            }
          }
        );
      }
    } catch (error) {
      console.error("Notification error:", error.message);
    }
    
    return res.status(200).json({ status: 'success', data: application });
  }
  return next(new AppError('Not authorized to update application', 403));
});

const normalizeIdValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') {
    return value.toString();
  }
  return null;
};

exports.listApplications = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.workerId) {
    filter.worker = req.query.workerId;
  }
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }

  const includeApplicantDetails = parseBoolean(
    req.query.includeApplicantDetails,
    true
  );
  const includePortfolioMedia = includeApplicantDetails
    ? parseBoolean(req.query.includePortfolioMedia, false)
    : false;
  const includeCompanyLogos = parseBoolean(
    req.query.includeCompanyLogos,
    false
  );

  if (req.user.userType === 'employer') {
    const accessibleBusinessIds = await getAccessibleBusinessIds(req.user);
    if (!accessibleBusinessIds.size) {
      return res
        .status(200)
        .json({ status: 'success', results: 0, data: [] });
    }

    if (filter.business) {
      const requestedBusinessId = normalizeIdValue(filter.business);
      if (!requestedBusinessId || !accessibleBusinessIds.has(requestedBusinessId)) {
        return next(
          new AppError('You do not have access to this business', 403)
        );
      }
      filter.business = requestedBusinessId;
    } else {
      filter.business = { $in: Array.from(accessibleBusinessIds) };
    }
  }

  const limit = Math.min(parsePositiveInt(req.query.limit, 25), 100);
  const page = parsePositiveInt(req.query.page, 1);
  const skip = (page - 1) * limit;

  const applicationQuery = Application.find(filter)
    .populate({
      path: 'job',
      populate: {
        path: 'business',
        select: 'name description logo logoSmall logoMedium logoUrl location'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (includeApplicantDetails) {
    applicationQuery.populate({
      path: 'worker',
      select: '_id firstName lastName email phone userType'
    });
  }

  applicationQuery.lean();

  const [applications, total] = await Promise.all([
    applicationQuery,
    Application.countDocuments(filter)
  ]);

  const workerIds = new Set();
  if (includeApplicantDetails) {
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
  }

  const workerProfileFields = [
    'user',
    'bio',
    'experience',
    'skills',
    'languages',
    'rating',
    'completedJobs',
    'totalEarnings',
    'availability',
    'profilePicture'
  ];

  if (includePortfolioMedia) {
    workerProfileFields.push('portfolioImages');
  }

  const profiles = includeApplicantDetails && workerIds.size
    ? await WorkerProfile.find({ user: { $in: Array.from(workerIds) } })
        .select(workerProfileFields.join(' '))
        .lean()
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
    const workerProfile =
      includeApplicantDetails && workerId ? profileMap.get(workerId) || null : null;
    return buildApplicationPresenter(application, {
      workerProfile,
      includeApplicantDetails,
      includeCompanyLogos
    });
  });

  res.status(200).json({
    status: 'success',
    results: data.length,
    data,
    meta: {
      total,
      page,
      limit,
      hasMore: skip + data.length < total
    }
  });
});
