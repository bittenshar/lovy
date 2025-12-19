/**
 * ============================================================================
 * NOTIFICATION INTEGRATION ACROSS ALL APIS
 * ============================================================================
 * 
 * This file shows the implementation pattern for all controllers.
 * Copy this pattern to add notifications to any API endpoint.
 */

// ============================================================================
// 1. APPLICATION CONTROLLER - src/modules/applications/application.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: createApplication endpoint
exports.createApplication = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can apply to jobs', 403));
  }

  const job = await Job.findById(req.params.jobId)
    .populate('business', 'name owner')
    .populate('postedBy', '_id');

  if (!job || job.status !== 'active') {
    return next(new AppError('Job is not available for applications', 400));
  }

  // ... existing validation code ...

  const application = await Application.create({
    job: job._id,
    worker: req.user._id,
    applicantName: req.user.firstName,
    // ... other fields
  });

  // SEND NOTIFICATION TO JOB OWNER (Employer)
  await notificationUtils.sendTemplatedNotification(
    job.postedBy._id.toString(),
    "jobApplied",
    [job.title, job.business.name],
    {
      jobId: job._id.toString(),
      applicationId: application._id.toString(),
      applicantName: req.user.firstName
    }
  );

  res.status(201).json({
    success: true,
    application
  });
});

// UPDATE: acceptApplication endpoint
exports.acceptApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('job', 'title business')
    .populate('worker', '_id email firstName')
    .populate('job.business', 'name');

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  application.status = 'accepted';
  await application.save();

  // SEND NOTIFICATION TO WORKER
  await notificationUtils.sendTemplatedNotification(
    application.worker._id.toString(),
    "jobAccepted",
    [application.job.title, application.job.business.name],
    {
      jobId: application.job._id.toString(),
      applicationId: application._id.toString()
    }
  );

  res.json({
    success: true,
    application
  });
});

// UPDATE: rejectApplication endpoint
exports.rejectApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('job', 'title business')
    .populate('worker', '_id firstName')
    .populate('job.business', 'name');

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  application.status = 'rejected';
  await application.save();

  // SEND NOTIFICATION TO WORKER
  await notificationUtils.sendTemplatedNotification(
    application.worker._id.toString(),
    "jobRejected",
    [application.job.title, application.job.business.name],
    {
      jobId: application.job._id.toString(),
      applicationId: application._id.toString()
    }
  );

  res.json({
    success: true,
    application
  });
});

// ============================================================================
// 2. JOB CONTROLLER - src/modules/jobs/job.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: createJob endpoint
exports.createJob = catchAsync(async (req, res, next) => {
  // ... existing validation and creation logic ...

  const job = await Job.create({
    title: req.body.title,
    description: req.body.description,
    business: req.body.businessId,
    postedBy: req.user._id,
    // ... other fields
  });

  const populatedJob = await job.populate('business', 'name');

  // SEND BROADCAST NOTIFICATION - New job posted
  await notificationUtils.sendBroadcast({
    title: "📢 New Job Posted",
    body: `${populatedJob.business.name} posted: ${job.title}`,
    data: {
      type: "job_posted",
      action: "view_job",
      jobId: job._id.toString(),
      businessId: req.body.businessId
    }
  });

  res.status(201).json({
    success: true,
    job
  });
});

// UPDATE: updateJob endpoint
exports.updateJob = catchAsync(async (req, res, next) => {
  // ... existing update logic ...

  const job = await Job.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    job
  });
});

// UPDATE: deleteJob endpoint (optional: notify applicants)
exports.deleteJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  // Optional: Get all applicants and notify them
  const applicants = await Application.find({ job: job._id }).select('worker');
  
  // Notify all applicants that job was closed
  for (const applicant of applicants) {
    await notificationUtils.sendTemplatedNotification(
      applicant.worker.toString(),
      "generic",
      ["Job Closed", `The job "${job.title}" has been closed`],
      {
        type: "job_closed",
        jobId: job._id.toString()
      }
    );
  }

  await Job.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Job deleted successfully"
  });
});

// ============================================================================
// 3. PAYMENT CONTROLLER - src/modules/payments/payment.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: verifyPayment endpoint
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // ... existing verification logic ...

  if (paymentVerified) {
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { 
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id
      },
      { new: true }
    );

    // SEND NOTIFICATION - Payment successful
    const amount = (payment.amount / 100).toFixed(2); // Convert paise to rupees
    
    await notificationUtils.sendTemplatedNotification(
      req.user._id.toString(),
      "paymentProcessed",
      [amount, "INR"],
      {
        paymentId: payment._id.toString(),
        orderId: razorpay_order_id,
        planType: payment.planType
      }
    );

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment
    });
  } else {
    // SEND NOTIFICATION - Payment failed
    await notificationUtils.sendTemplatedNotification(
      req.user._id.toString(),
      "paymentFailed",
      [(payment.amount / 100).toFixed(2), "INR"],
      {
        paymentId: payment._id.toString(),
        orderId: razorpay_order_id
      }
    );

    return next(new AppError('Payment verification failed', 400));
  }
});

// ============================================================================
// 4. ATTENDANCE CONTROLLER - src/modules/attendance/attendance.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: markAttendance endpoint
exports.markAttendance = catchAsync(async (req, res, next) => {
  const { shiftId, status, checkInTime, checkOutTime } = req.body;
  const workerId = req.user._id;

  // ... existing logic ...

  const attendance = await Attendance.create({
    shift: shiftId,
    worker: workerId,
    status: status,
    checkInTime,
    checkOutTime
  });

  const formattedTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // SEND NOTIFICATION - Attendance confirmed
  if (status === 'present') {
    await notificationUtils.sendTemplatedNotification(
      workerId.toString(),
      "attendanceCheckIn",
      [req.user.firstName, formattedTime],
      {
        shiftId: shiftId,
        attendanceId: attendance._id.toString()
      }
    );
  } else if (status === 'absent') {
    // Get shift and job details for notification
    const shift = await Shift.findById(shiftId).populate('job', 'title');
    
    const date = new Date(shift.startTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    await notificationUtils.sendTemplatedNotification(
      workerId.toString(),
      "attendanceMissed",
      [shift.job.title, date],
      {
        shiftId: shiftId,
        attendanceId: attendance._id.toString()
      }
    );
  }

  res.status(201).json({
    success: true,
    attendance
  });
});

// ============================================================================
// 5. SHIFT CONTROLLER - src/modules/shifts/shift.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: requestSwap endpoint
exports.requestSwap = catchAsync(async (req, res, next) => {
  const { targetShiftId, targetWorkerId } = req.body;
  const requesterId = req.user._id;

  // ... existing validation ...

  const swapRequest = await ShiftSwap.create({
    requesterShift: req.params.shiftId,
    targetShift: targetShiftId,
    requester: requesterId,
    target: targetWorkerId
  });

  const requester = await User.findById(requesterId).select('firstName');
  const targetShift = await Shift.findById(targetShiftId);
  
  const shiftDate = new Date(targetShift.startTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // SEND NOTIFICATION - Shift swap requested
  await notificationUtils.sendTemplatedNotification(
    targetWorkerId,
    "shiftSwapRequested",
    [requester.firstName, shiftDate],
    {
      swapRequestId: swapRequest._id.toString(),
      shiftId: targetShiftId
    }
  );

  res.status(201).json({
    success: true,
    swapRequest
  });
});

// UPDATE: updateSwap endpoint (approve/reject)
exports.updateSwap = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const swapId = req.params.swapId;

  const swap = await ShiftSwap.findById(swapId)
    .populate('requester', 'firstName')
    .populate('targetShift', 'startTime');

  if (!swap) {
    return next(new AppError('Swap request not found', 404));
  }

  swap.status = status;
  await swap.save();

  const shiftDate = new Date(swap.targetShift.startTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (status === 'approved') {
    // SEND NOTIFICATION - Shift swap approved
    await notificationUtils.sendTemplatedNotification(
      swap.requester._id.toString(),
      "shiftSwapApproved",
      [req.user.firstName, shiftDate],
      {
        swapRequestId: swap._id.toString()
      }
    );
  } else if (status === 'rejected') {
    // SEND NOTIFICATION - Shift swap rejected
    await notificationUtils.sendTemplatedNotification(
      swap.requester._id.toString(),
      "shiftSwapRejected",
      [req.user.firstName, shiftDate],
      {
        swapRequestId: swap._id.toString()
      }
    );
  }

  res.json({
    success: true,
    swap
  });
});

// ============================================================================
// 6. CONVERSATION CONTROLLER - src/modules/conversations/conversation.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: sendMessage endpoint
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { conversationId, message } = req.body;
  const senderId = req.user._id;

  // ... existing validation ...

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', '_id');

  // Find recipient (other participant)
  const recipient = conversation.participants.find(
    p => p._id.toString() !== senderId.toString()
  );

  if (!recipient) {
    return next(new AppError('Recipient not found', 400));
  }

  const messageDoc = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content: message
  });

  const sender = await User.findById(senderId).select('firstName');
  const messagePreview = message.substring(0, 50) + 
                        (message.length > 50 ? "..." : "");

  // SEND NOTIFICATION - Message received
  await notificationUtils.sendTemplatedNotification(
    recipient._id.toString(),
    "messageReceived",
    [sender.firstName, messagePreview],
    {
      conversationId: conversationId,
      messageId: messageDoc._id.toString(),
      senderId: senderId.toString()
    }
  );

  res.status(201).json({
    success: true,
    message: messageDoc
  });
});

// ============================================================================
// 7. BUSINESS CONTROLLER - src/modules/businesses/business.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: createBusiness endpoint
exports.createBusiness = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const ownerId = req.user._id;

  // ... existing validation ...

  const business = await Business.create({
    name,
    description,
    owner: ownerId
  });

  // SEND NOTIFICATION - Business created
  await notificationUtils.sendTemplatedNotification(
    ownerId.toString(),
    "businessCreated",
    [name],
    {
      businessId: business._id.toString()
    }
  );

  res.status(201).json({
    success: true,
    business
  });
});

// UPDATE: updateBusiness endpoint
exports.updateBusiness = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const business = await Business.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!business) {
    return next(new AppError('Business not found', 404));
  }

  // SEND NOTIFICATION - Business updated
  await notificationUtils.sendTemplatedNotification(
    business.owner.toString(),
    "businessUpdated",
    [business.name],
    {
      businessId: business._id.toString()
    }
  );

  res.json({
    success: true,
    business
  });
});

// ============================================================================
// 8. TEAM CONTROLLER - src/modules/team/team.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: addTeamMember endpoint
exports.addTeamMember = catchAsync(async (req, res, next) => {
  const { userId, teamName, role } = req.body;

  // ... existing validation ...

  const teamMember = await TeamMember.create({
    user: userId,
    business: req.body.businessId,
    role: role
  });

  const user = await User.findById(userId).select('firstName');

  // SEND NOTIFICATION - Team member added
  await notificationUtils.sendTemplatedNotification(
    userId,
    "teamMemberAdded",
    [user.firstName, teamName],
    {
      teamId: req.body.businessId,
      role: role
    }
  );

  res.status(201).json({
    success: true,
    teamMember
  });
});

// UPDATE: removeTeamMember endpoint
exports.removeTeamMember = catchAsync(async (req, res, next) => {
  const { memberId } = req.params;

  const member = await TeamMember.findById(memberId);

  if (!member) {
    return next(new AppError('Team member not found', 404));
  }

  // Get team/business name for notification
  const business = await Business.findById(member.business).select('name');
  const user = await User.findById(member.user).select('firstName');

  // SEND NOTIFICATION - Team member removed
  await notificationUtils.sendTemplatedNotification(
    member.user.toString(),
    "teamMemberRemoved",
    [user.firstName, business.name],
    {
      teamId: member.business.toString()
    }
  );

  await TeamMember.findByIdAndDelete(memberId);

  res.json({
    success: true,
    message: "Team member removed successfully"
  });
});

// ============================================================================
// 9. AUTH CONTROLLER - src/modules/auth/auth.controller.js
// ============================================================================

// ADD TO TOP OF FILE:
const notificationUtils = require('../notification/notification.utils');

// UPDATE: logout endpoint (if you want to notify device)
exports.logout = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // ... existing logout logic ...

  // OPTIONAL: Send logout notification
  // await notificationUtils.sendTemplatedNotification(
  //   userId.toString(),
  //   "logout",
  //   [],
  //   { timestamp: new Date() }
  // );

  res.json({
    success: true,
    message: "Logged out successfully"
  });
});

// ============================================================================
// 10. IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * ✅ For each controller:
 * 1. Add import at top: const notificationUtils = require('../notification/notification.utils');
 * 2. Find key action points (create, accept, reject, update, delete)
 * 3. After successful operation, call sendTemplatedNotification
 * 4. Pass: userId, templateName, templateArgs, additionalData
 * 5. Never hardcode messages - use templates only
 * 6. Test with real user IDs
 * 7. Verify template exists in constant/templetes.js
 */

/**
 * ============================================================================
 * PATTERN TO FOLLOW IN ALL CONTROLLERS
 * ============================================================================
 * 
 * // 1. Add import
 * const notificationUtils = require('../notification/notification.utils');
 * 
 * // 2. In controller method:
 * exports.actionMethod = catchAsync(async (req, res, next) => {
 *   // ... existing logic ...
 *   
 *   // 3. After successful operation:
 *   await notificationUtils.sendTemplatedNotification(
 *     userId,              // string ID
 *     "templateName",      // from templetes.js
 *     [arg1, arg2],        // template arguments
 *     {                    // additional data
 *       type: "event_type",
 *       relatedId: "..."
 *     }
 *   );
 *   
 *   res.json({ success: true, data });
 * });
 */
