/**
 * ============================================================================
 * NOTIFICATION SYSTEM IMPLEMENTATION GUIDE
 * ============================================================================
 * 
 * This guide explains how to use the centralized notification system
 * to send notifications throughout your API without hardcoding messages.
 * 
 * ============================================================================
 */

/**
 * ============================================================================
 * 1. SIMPLE NOTIFICATION (Direct Method)
 * ============================================================================
 * 
 * Use this when you need to send a custom notification that doesn't fit
 * any template or for one-off messages.
 * 
 * PARAMETERS:
 * - userId (string, required): The user ID to send notification to
 * - notificationData (object, required):
 *     - title (string, required): Notification title
 *     - body (string, required): Notification body
 *     - imageUrl (string, optional): URL to notification image
 *     - data (object, optional): Custom data object
 * 
 * RETURNS: Promise resolving to result object with success status
 */

// EXAMPLE: Simple direct notification
const notificationUtils = require('./notification.utils');

// Method 1: Direct usage
await notificationUtils.sendToUser(userId, {
  title: "Custom Title",
  body: "Custom message body",
  imageUrl: "https://example.com/image.jpg",
  data: {
    type: "custom_event",
    action: "open_app",
    customField: "value"
  }
});

/**
 * RESPONSE FORMAT (Simple Notification):
 * {
 *   success: true,
 *   sent: 1,
 *   failed: 0,
 *   responses: [{ token: "xxx", status: "sent", response: "..." }],
 *   errors: undefined
 * }
 */

// ============================================================================
// ============================================================================
// 2. TEMPLATED NOTIFICATION (Recommended Method)
// ============================================================================
// 
// Use templates for consistency, reusability, and frontend integration.
// Templates are centralized in src/modules/notification/constant/templetes.js
//
// PARAMETERS:
// - userId (string, required): The user ID
// - templateName (string, required): Name of template from templates object
// - templateArgs (array, optional): Arguments passed to template function
// - additionalData (object, optional): Override/add additional data
//
// RETURNS: Promise resolving to result object with success status
// ============================================================================

/**
 * TEMPLATE STRUCTURE (from templetes.js):
 * Each template returns an object with:
 * {
 *   title: "string",
 *   body: "string",
 *   data: {
 *     type: "event_type",      // For frontend routing
 *     action: "action_type",   // For frontend action handling
 *     ...other fields
 *   }
 * }
 */

// ============================================================================
// ============================================================================
// 3. COMMON USE CASE EXAMPLES
// ============================================================================

/**
 * USE CASE 1: Job Application Notification
 * Scenario: User applied for a job
 */

// In your application controller:
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user._id;

    // ... Application logic ...
    // const job = await Job.findById(jobId);
    // const application = await Application.create({ ...});

    // SEND NOTIFICATION using template
    const jobTitle = "Senior Developer";        // Get from database
    const employerId = "employer123";           // Job owner

    // Send to employer (job owner)
    await notificationUtils.sendTemplatedNotification(
      employerId,
      "jobApplied",
      [jobTitle, "Company Name"]  // Template arguments
    );

    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 2: Payment Success Notification
 * Scenario: Payment processed successfully
 */

exports.processPayment = async (req, res) => {
  try {
    const { userId, amount, currency = "USD" } = req.body;

    // ... Payment processing logic ...
    // const payment = await Payment.create({...});

    // SEND NOTIFICATION using template
    await notificationUtils.sendTemplatedNotification(
      userId,
      "paymentProcessed",
      [amount, currency]  // Arguments: amount, currency
    );

    res.json({ success: true, message: "Payment processed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 3: Message Received Notification
 * Scenario: User received a message in conversation
 */

exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, senderName, messagePreview } = req.body;

    // ... Message creation logic ...
    // const message = await Message.create({...});

    // SEND NOTIFICATION using template
    await notificationUtils.sendTemplatedNotification(
      recipientId,
      "messageReceived",
      [senderName, messagePreview]  // Arguments
    );

    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 4: Forced Logout Notification
 * Scenario: Admin force-logs out a user
 */

exports.forceLogoutUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    // ... Logout logic ...

    // SEND NOTIFICATION using template
    await notificationUtils.sendTemplatedNotification(
      userId,
      "forcedLogout",
      [reason || ""]  // Optional reason
    );

    res.json({ success: true, message: "User logged out" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 5: Job Accepted Notification
 * Scenario: Application approved by employer
 */

exports.acceptApplication = async (req, res) => {
  try {
    const { applicationId, jobTitle, companyName } = req.body;
    const applicantId = "applicant123";

    // ... Approval logic ...

    // SEND NOTIFICATION using template with additional data
    await notificationUtils.sendTemplatedNotification(
      applicantId,
      "jobAccepted",
      [jobTitle, companyName],  // Template arguments
      {                          // Additional/override data
        // data will be merged with template's data object
        jobId: "job123",
        applicationId: applicationId,
        customField: "custom_value"
      }
    );

    res.json({ success: true, message: "Application accepted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 6: Attendance Reminder
 * Scenario: Send shift reminders before shift starts
 */

exports.sendShiftReminders = async (req, res) => {
  try {
    const { shiftId } = req.body;

    // ... Get shift details ...
    // const shift = await Shift.findById(shiftId).populate('worker', 'jobTitle');
    // const worker = shift.worker;
    // const startTime = shift.startTime;
    // const jobTitle = shift.jobTitle;

    const workerId = "worker123";
    const startTime = "09:00 AM";
    const jobTitle = "Delivery Driver";

    await notificationUtils.sendTemplatedNotification(
      workerId,
      "attendanceReminder",
      [startTime, jobTitle],
      {
        shiftId: shiftId,
        reminderType: "pre_shift"
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * USE CASE 7: Multiple Users Notification (Broadcast)
 * Scenario: Send same notification to multiple users
 */

exports.sendAnnouncementToWorkers = async (req, res) => {
  try {
    const { workerIds, title, message } = req.body;

    // Send to multiple users
    const result = await notificationUtils.sendToMultipleUsers(
      workerIds,
      {
        title: title,
        body: message,
        data: {
          type: "announcement",
          action: "view_more"
        }
      }
    );

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ============================================================================
 * 4. COMPLETE EXPRESS CONTROLLER EXAMPLE
 * ============================================================================
 */

// File: src/modules/jobs/job.controller.js

const notificationUtils = require('../notification/notification.utils');

/**
 * CREATE JOB POSTING
 * POST /api/jobs
 * 
 * BUSINESS LOGIC:
 * 1. Validate input
 * 2. Create job in database
 * 3. Send notification to workers (optional, broadcast)
 * 4. Return response
 */
exports.createJob = async (req, res) => {
  try {
    const { title, description, businessId } = req.body;
    const employerId = req.user._id;

    // Validation
    if (!title || !description) {
      return res.status(400).json({ 
        error: "Title and description are required" 
      });
    }

    // Create job
    const job = await Job.create({
      title,
      description,
      business: businessId,
      postedBy: employerId,
      status: "active"
    });

    // Get business name for notification
    const business = await Business.findById(businessId).select('name');

    // SEND NOTIFICATION - Workers will receive this on app/web
    // Don't hardcode message! Use templates
    await notificationUtils.sendBroadcast({
      title: "📢 New Job Posted",
      body: `${business.name} posted a new job: ${job.title}`,
      data: {
        type: "job_posted",
        action: "view_job",
        jobId: job._id,
        businessId: businessId
      }
    });

    res.status(201).json({
      success: true,
      job,
      message: "Job created and workers notified"
    });
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * ACCEPT APPLICATION
 * PATCH /api/applications/:applicationId/accept
 * 
 * BUSINESS LOGIC:
 * 1. Find and validate application
 * 2. Update status to accepted
 * 3. Send templated notification to applicant
 * 4. Return response
 */
exports.acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Find and validate
    const application = await Application.findById(applicationId)
      .populate('job', 'title')
      .populate('applicant', '_id')
      .populate('job.business', 'name');

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Update status
    application.status = "accepted";
    await application.save();

    // SEND TEMPLATED NOTIFICATION
    // This sends pre-defined message without hardcoding
    const result = await notificationUtils.sendTemplatedNotification(
      application.applicant._id.toString(),
      "jobAccepted",  // Template name
      [               // Template arguments
        application.job.title,
        application.job.business.name
      ],
      {               // Additional data for frontend routing
        applicationId: application._id.toString(),
        jobId: application.job._id.toString()
      }
    );

    res.json({
      success: true,
      application,
      notificationSent: result.success,
      notificationDetails: result
    });
  } catch (error) {
    console.error("Accept application error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * SEND MESSAGE
 * POST /api/messages
 * 
 * BUSINESS LOGIC:
 * 1. Validate recipient exists
 * 2. Create message record
 * 3. Send notification to recipient
 * 4. Update last message timestamp
 * 5. Return response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const senderId = req.user._id;

    // Validation
    if (!recipientId || !message) {
      return res.status(400).json({ 
        error: "RecipientId and message are required" 
      });
    }

    // Check recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Create message
    const messageDoc = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content: message
    });

    // Get sender info for notification
    const sender = await User.findById(senderId).select('firstName');
    
    // Preview (first 50 chars of message)
    const messagePreview = message.substring(0, 50) + 
                          (message.length > 50 ? "..." : "");

    // SEND TEMPLATED NOTIFICATION
    await notificationUtils.sendTemplatedNotification(
      recipientId,
      "messageReceived",
      [sender.firstName, messagePreview],
      {
        conversationId: messageDoc._id.toString(),
        senderId: senderId.toString()
      }
    );

    res.json({
      success: true,
      message: messageDoc,
      notificationSent: true
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * ============================================================================
 * 5. BEST PRACTICES & GUIDELINES
 * ============================================================================
 */

/**
 * BEST PRACTICE #1: ALWAYS USE TEMPLATES
 * 
 * ❌ WRONG - Hardcoded messages everywhere
 * await notificationUtils.sendToUser(userId, {
 *   title: "Payment Received",
 *   body: `Payment of $${amount} received`
 * });
 * 
 * ✅ RIGHT - Use centralized templates
 * await notificationUtils.sendTemplatedNotification(
 *   userId,
 *   "paymentProcessed",
 *   [amount]
 * );
 * 
 * WHY:
 * - Single source of truth for all messages
 * - Easy to update messages globally
 * - Consistent branding/tone
 * - Better for translations/localization
 */

/**
 * BEST PRACTICE #2: FRONTEND RELIES ON data.type
 * 
 * Template response includes data object:
 * {
 *   title: "...",
 *   body: "...",
 *   data: {
 *     type: "job_applied",      ← Frontend uses this
 *     action: "view_job",        ← For routing
 *     jobId: "..."               ← Additional context
 *   }
 * }
 * 
 * Frontend handler:
 * const handleNotification = (notification) => {
 *   const { type, action, ...data } = notification.data;
 *   
 *   switch(type) {
 *     case 'job_applied':
 *       navigate('/applications', data);
 *       break;
 *     case 'payment_processed':
 *       navigate('/payments', data);
 *       break;
 *     default:
 *       showGenericNotification(notification);
 *   }
 * };
 */

/**
 * BEST PRACTICE #3: AVOID HARDCODING
 * 
 * ❌ DON'T DO THIS IN MULTIPLE CONTROLLERS:
 * 
 * // In job.controller.js
 * title: "New Job",
 * body: "Check out this job"
 * 
 * // In application.controller.js
 * title: "Job Accepted",
 * body: "Congratulations, you got the job!"
 * 
 * // In payment.controller.js
 * title: "Payment Done",
 * body: "Your payment was successful"
 * 
 * ✅ DO THIS INSTEAD:
 * All messages in one place (templetes.js), referenced everywhere
 * 
 * export jobPosted: () => ({...})
 * export jobAccepted: () => ({...})
 * export paymentProcessed: () => ({...})
 * 
 * Advantages:
 * - No message duplication
 * - Consistent across entire backend
 * - Easy product team updates
 * - Better for QA testing
 * - Supports A/B testing different messages
 */

/**
 * BEST PRACTICE #4: STRUCTURE TEMPLATE ARGUMENTS
 * 
 * Good template argument ordering:
 * 
 * // User information first
 * messageReceived: (senderName, messagePreview) => (...)
 * 
 * // Job info first, then company
 * jobAccepted: (jobTitle, companyName) => (...)
 * 
 * // Amount and currency
 * paymentProcessed: (amount, currency) => (...)
 * 
 * This makes templates intuitive and self-documenting.
 */

/**
 * BEST PRACTICE #5: INCLUDE RICH DATA IN data OBJECT
 * 
 * ✅ Good - Frontend can deeply route
 * data: {
 *   type: "job_applied",
 *   action: "view_job",
 *   jobId: "job123",        ← Frontend navigates to /jobs/job123
 *   applicationId: "app456", ← Additional context
 *   companyName: "..."      ← Display in details
 * }
 * 
 * This enables:
 * - Deep linking to specific resources
 * - Offline action queueing
 * - Advanced analytics
 * - Smart routing decisions
 */

/**
 * BEST PRACTICE #6: HANDLE TEMPLATE NOT FOUND GRACEFULLY
 * 
 * The sendTemplatedNotification checks if template exists.
 * Always verify template exists before deployment.
 * 
 * // Verify template exists
 * const templates = notificationUtils.getTemplates();
 * console.log(Object.keys(templates));
 */

/**
 * BEST PRACTICE #7: LOG NOTIFICATION ERRORS
 * 
 * ✅ Good practice
 * const result = await notificationUtils.sendTemplatedNotification(...);
 * if (!result.success) {
 *   console.error("Notification failed:", result.error);
 *   // Still return success to user, notification failure shouldn't break request
 * }
 */

/**
 * BEST PRACTICE #8: ADD IMAGE URLs FOR RICH NOTIFICATIONS
 * 
 * ✅ Include company/job images
 * await notificationUtils.sendTemplatedNotification(
 *   userId,
 *   "jobAccepted",
 *   [jobTitle, companyName],
 *   {
 *     imageUrl: job.company.logoUrl,  ← Rich notification
 *     jobId: job._id
 *   }
 * );
 */

/**
 * ============================================================================
 * 6. IMPLEMENTATION CHECKLIST
 * ============================================================================
 * 
 * When adding notifications to a controller:
 * 
 * ☐ Check if template exists in constant/templetes.js
 * ☐ If not, add new template with proper data object
 * ☐ Use sendTemplatedNotification (never hardcode)
 * ☐ Pass correct number of template arguments
 * ☐ Add additional data for frontend routing
 * ☐ Log errors but don't break user request
 * ☐ Test notification with actual user ID
 * ☐ Update frontend to handle data.type
 * ☐ Document new template in templetes.js comments
 * ☐ Add unit test for notification trigger
 * 
 */

/**
 * ============================================================================
 * 7. SUMMARY - THREE WAYS TO SEND NOTIFICATIONS
 * ============================================================================
 */

// METHOD 1: Send to one user with custom data
await notificationUtils.sendToUser(userId, {
  title: "...",
  body: "...",
  data: {...}
});

// METHOD 2: Send template to one user (RECOMMENDED)
await notificationUtils.sendTemplatedNotification(
  userId,
  "templateName",
  [arg1, arg2],
  { additionalData }
);

// METHOD 3: Send to multiple users or all users
await notificationUtils.sendToMultipleUsers(userIds, {...});
await notificationUtils.sendBroadcast({...});

/**
 * ============================================================================
 * THAT'S IT! Follow these patterns and you'll have a maintainable,
 * scalable notification system without any hardcoded messages.
 * ============================================================================
 */
