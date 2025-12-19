/**
 * ============================================================================
 * NOTIFICATION SYSTEM - QUICK REFERENCE CHECKLIST
 * ============================================================================
 * Use this checklist to implement notifications in every API endpoint
 */

// ============================================================================
// QUICK START - 3 SIMPLE STEPS
// ============================================================================

/**
 * STEP 1: Add import to controller file
 */
const notificationUtils = require('../notification/notification.utils');

/**
 * STEP 2: After successful action, send notification
 */
await notificationUtils.sendTemplatedNotification(
  userId,
  "templateName",
  [arg1, arg2],
  { additionalData }
);

/**
 * STEP 3: That's it! No hardcoding needed.
 */

// ============================================================================
// COMPLETE CHECKLIST BY CONTROLLER
// ============================================================================

/**
 * APPLICATION CONTROLLER
 * ============================================================================
 * File: src/modules/applications/application.controller.js
 * 
 * ☐ createApplication → jobApplied (notify employer)
 * ☐ acceptApplication → jobAccepted (notify worker)
 * ☐ rejectApplication → jobRejected (notify worker)
 * ☐ shortlistApplication → (use generic template)
 * ☐ withdrawApplication → (use generic template)
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  application.worker._id.toString(),
  "jobAccepted",
  [job.title, business.name]
);

/**
 * JOB CONTROLLER
 * ============================================================================
 * File: src/modules/jobs/job.controller.js
 * 
 * ☐ createJob → sendBroadcast (notify all workers)
 * ☐ updateJob → (update only if description changed significantly)
 * ☐ deleteJob → notify applicants
 * ☐ publishJob → (broadcast if newly published)
 * ☐ jobExpiringSoon (cron job) → jobExpiringSoon
 */

// EXAMPLE:
await notificationUtils.sendBroadcast({
  title: "📢 New Job Posted",
  body: `${business.name} posted: ${job.title}`,
  data: {
    type: "job_posted",
    jobId: job._id.toString()
  }
});

/**
 * PAYMENT CONTROLLER
 * ============================================================================
 * File: src/modules/payments/payment.controller.js
 * 
 * ☐ initializePayment → paymentPending (show loading state)
 * ☐ verifyPayment (success) → paymentProcessed
 * ☐ verifyPayment (failure) → paymentFailed
 * ☐ refundPayment → (use generic template)
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  req.user._id.toString(),
  "paymentProcessed",
  [amount, "INR"],
  { paymentId: payment._id.toString() }
);

/**
 * ATTENDANCE CONTROLLER
 * ============================================================================
 * File: src/modules/attendance/attendance.controller.js
 * 
 * ☐ markCheckIn → attendanceCheckIn
 * ☐ markCheckOut → attendanceCheckOut
 * ☐ markAbsent → attendanceMissed
 * ☐ markPresent → attendanceConfirmed
 * ☐ sendReminder (cron) → attendanceReminder
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  workerId.toString(),
  "attendanceReminder",
  [startTime, jobTitle],
  { shiftId }
);

/**
 * SHIFT CONTROLLER
 * ============================================================================
 * File: src/modules/shifts/shift.controller.js
 * 
 * ☐ requestSwap → shiftSwapRequested
 * ☐ approveSwap → shiftSwapApproved
 * ☐ rejectSwap → shiftSwapRejected
 * ☐ createShift → (broadcast to relevant workers)
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  targetWorker._id.toString(),
  "shiftSwapRequested",
  [requesterName, shiftDate],
  { swapRequestId }
);

/**
 * CONVERSATION/MESSAGE CONTROLLER
 * ============================================================================
 * File: src/modules/conversations/conversation.controller.js
 * 
 * ☐ sendMessage → messageReceived
 * ☐ startConversation → conversationStarted
 * ☐ endConversation → conversationEnded
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  recipient._id.toString(),
  "messageReceived",
  [senderName, messagePreview],
  { conversationId, messageId }
);

/**
 * BUSINESS CONTROLLER
 * ============================================================================
 * File: src/modules/businesses/business.controller.js
 * 
 * ☐ createBusiness → businessCreated
 * ☐ updateBusiness → businessUpdated
 * ☐ deleteBusiness → (use generic)
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  owner._id.toString(),
  "businessCreated",
  [businessName],
  { businessId }
);

/**
 * TEAM CONTROLLER
 * ============================================================================
 * File: src/modules/team/team.controller.js
 * 
 * ☐ addTeamMember → teamMemberAdded
 * ☐ removeTeamMember → teamMemberRemoved
 * ☐ updateRole → roleAssigned
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  userId,
  "teamMemberAdded",
  [memberName, teamName],
  { teamId, role }
);

/**
 * USER CONTROLLER
 * ============================================================================
 * File: src/modules/users/user.controller.js
 * 
 * ☐ updateProfile → (use generic if needed)
 * ☐ changePassword → passwordChanged
 * ☐ accountLocked (after failed attempts) → accountLocked
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  userId.toString(),
  "passwordChanged",
  [],
  { timestamp: new Date() }
);

/**
 * AUTH CONTROLLER
 * ============================================================================
 * File: src/modules/auth/auth.controller.js
 * 
 * ☐ logout → logout (optional)
 * ☐ forceLogout → forcedLogout
 */

// EXAMPLE:
await notificationUtils.sendTemplatedNotification(
  userId.toString(),
  "forcedLogout",
  [reason],
  { timestamp: new Date() }
);

/**
 * SUBSCRIPTION/PREMIUM CONTROLLER
 * ============================================================================
 * File: src/modules/subscriptions/subscription.controller.js
 * 
 * ☐ upgradePremium → (use generic "Premium Activated")
 * ☐ renewSubscription → (use generic)
 * ☐ cancelSubscription → (use generic)
 */

/**
 * EMPLOYER/WORKER PROFILE CONTROLLER
 * ============================================================================
 * File: src/modules/employers/employer.controller.js
 *       src/modules/workers/worker.controller.js
 * 
 * ☐ updateProfile → (use generic if major changes)
 */

// ============================================================================
// TEMPLATE REFERENCE - What templates are available?
// ============================================================================

/**
 * AVAILABLE TEMPLATES IN constant/templetes.js:
 * 
 * JOB NOTIFICATIONS:
 * - jobApplied(jobTitle, companyName)
 * - jobAccepted(jobTitle, companyName)
 * - jobRejected(jobTitle, companyName)
 * - jobPosted(jobTitle, businessName)
 * - jobExpiringSoon(jobTitle, daysLeft)
 * 
 * ATTENDANCE:
 * - attendanceReminder(startTime, jobTitle)
 * - attendanceConfirmed(date)
 * - attendanceMissed(jobTitle, date)
 * - attendanceCheckIn(workerName, time)
 * - attendanceCheckOut(workerName, time)
 * 
 * CONVERSATION:
 * - messageReceived(senderName, preview)
 * - conversationStarted(initiatorName)
 * - conversationEnded(userName)
 * 
 * PAYMENT:
 * - paymentProcessed(amount, currency)
 * - paymentFailed(amount, currency)
 * - paymentPending(amount, currency)
 * - invoiceReady(invoiceNumber)
 * 
 * SHIFT:
 * - shiftSwapRequested(requesterName, shiftDate)
 * - shiftSwapApproved(approverName, shiftDate)
 * - shiftSwapRejected(rejecterName, shiftDate)
 * 
 * TEAM:
 * - teamMemberAdded(memberName, teamName)
 * - teamMemberRemoved(memberName, teamName)
 * - roleAssigned(roleName, teamName)
 * 
 * BUSINESS:
 * - businessCreated(businessName)
 * - businessUpdated(businessName)
 * 
 * AUTH:
 * - logout()
 * - forcedLogout(reason)
 * - accountLocked()
 * - passwordChanged()
 * 
 * APPROVAL:
 * - approvalPending(itemType, itemName)
 * - approvalApproved(itemType, itemName)
 * - approvalRejected(itemType, itemName, reason)
 * 
 * GENERAL:
 * - generic(title, body)
 * - alert(title, message)
 * - announcement(title, message)
 * - systemMaintenance(startTime, endTime)
 * - reminder(title, message)
 * - pendingAction(actionType, deadline)
 */

// ============================================================================
// NOTIFICATION METHODS - When to use each?
// ============================================================================

/**
 * 1. sendTemplatedNotification() - MOST COMMON
 *    When: You have a template for the event
 *    Why: Reusable, consistent, no hardcoding
 *    
 *    Usage:
 *    await notificationUtils.sendTemplatedNotification(
 *      userId,
 *      "templateName",
 *      [arg1, arg2],
 *      { additionalData }
 *    );
 */

/**
 * 2. sendToUser() - Custom messages
 *    When: No template exists for the event
 *    Why: Full control over message
 *    
 *    Usage:
 *    await notificationUtils.sendToUser(userId, {
 *      title: "Custom Title",
 *      body: "Custom message",
 *      data: { type: "custom" }
 *    });
 */

/**
 * 3. sendToMultipleUsers() - Send to multiple
 *    When: Same notification to several users
 *    Why: Efficient batch sending
 *    
 *    Usage:
 *    await notificationUtils.sendToMultipleUsers(
 *      [userId1, userId2, userId3],
 *      { title, body, data }
 *    );
 */

/**
 * 4. sendBroadcast() - Send to ALL users
 *    When: System-wide announcements or new job postings
 *    Why: Reaches entire user base
 *    
 *    Usage:
 *    await notificationUtils.sendBroadcast({
 *      title: "Announcement",
 *      body: "Message for everyone"
 *    });
 */

// ============================================================================
// ERROR HANDLING - ALWAYS DO THIS
// ============================================================================

/**
 * ✅ GOOD - Catch errors but don't break the request
 */
try {
  await notificationUtils.sendTemplatedNotification(
    userId,
    "templateName",
    [args]
  );
} catch (error) {
  console.error("Notification failed:", error);
  // Don't return error - user action succeeded, just notification failed
}

/**
 * ✅ ALSO GOOD - Check response status
 */
const result = await notificationUtils.sendTemplatedNotification(
  userId,
  "templateName",
  [args]
);

if (!result.success) {
  console.error("Notification failed:", result.error);
  // Still return success to user
}

// ============================================================================
// FRONTEND INTEGRATION - data.type usage
// ============================================================================

/**
 * All templates include data object with:
 * - type: Event type (e.g., "job_applied", "payment_processed")
 * - action: Action to perform (e.g., "view_job", "view_payment")
 * 
 * Frontend should:
 * 
 * notification.data.type → Determine app behavior
 * notification.data.action → Route user to correct screen
 * notification.data.* → Pass context (jobId, userId, etc.)
 * 
 * Example frontend handler:
 * 
 * const handleNotification = (notification) => {
 *   const { type, action, jobId, userId } = notification.data;
 *   
 *   switch(type) {
 *     case 'job_posted':
 *       navigateTo('/jobs/' + jobId);
 *       break;
 *     case 'payment_processed':
 *       navigateTo('/payments', { highlight: true });
 *       break;
 *     case 'message_received':
 *       openChat(userId);
 *       break;
 *     // ... more types
 *   }
 * };
 */

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/**
 * ☐ Register FCM token for test user
 * ☐ Call API endpoint that triggers notification
 * ☐ Check notification received on device/web
 * ☐ Verify notification data.type is correct
 * ☐ Verify title and body display correctly
 * ☐ Test error scenarios (user not found, etc.)
 * ☐ Verify database logs for sent notifications
 * ☐ Check frontend handles notification properly
 */

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * TO ADD NOTIFICATIONS TO ANY API:
 * 
 * 1. Import notification utils
 * 2. Identify the template for the event
 * 3. After successful operation, call sendTemplatedNotification
 * 4. Pass userId, template name, template args, additional data
 * 5. Wrap in try-catch but don't break the main request
 * 6. That's it! No hardcoding needed.
 * 
 * Follow the CONTROLLER_IMPLEMENTATION_EXAMPLES.js file for real examples.
 */
