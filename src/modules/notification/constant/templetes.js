/**
 * Notification Templates
 * Centralized templates for all notification types
 */

const templates = {
  /**
   * ========== JOB NOTIFICATIONS ==========
   */
  jobApplied: (jobTitle, companyName) => ({
    title: "Application Sent",
    body: `You applied for ${jobTitle} at ${companyName}`,
    data: {
      type: "job_applied",
      action: "view_job"
    }
  }),

  jobAccepted: (jobTitle, companyName) => ({
    title: "🎉 Congratulations!",
    body: `Your application for ${jobTitle} at ${companyName} has been accepted!`,
    data: {
      type: "job_accepted",
      action: "view_application"
    }
  }),

  jobRejected: (jobTitle, companyName) => ({
    title: "Application Update",
    body: `Your application for ${jobTitle} at ${companyName} was not selected.`,
    data: {
      type: "job_rejected",
      action: "browse_jobs"
    }
  }),

  jobPosted: (jobTitle, businessName) => ({
    title: "📢 New Job Posted",
    body: `${businessName} posted a new job: ${jobTitle}`,
    data: {
      type: "job_posted",
      action: "view_job"
    }
  }),

  jobExpiringSoon: (jobTitle, daysLeft) => ({
    title: "Job Expiring Soon",
    body: `The job posting "${jobTitle}" expires in ${daysLeft} days`,
    data: {
      type: "job_expiring",
      action: "view_job"
    }
  }),

  /**
   * ========== ATTENDANCE NOTIFICATIONS ==========
   */
  attendanceReminder: (startTime, jobTitle) => ({
    title: "⏰ Shift Reminder",
    body: `Your shift for ${jobTitle} starts at ${startTime}`,
    data: {
      type: "attendance_reminder",
      action: "view_shift"
    }
  }),

  attendanceConfirmed: (date) => ({
    title: "✅ Attendance Marked",
    body: `Your attendance for ${date} has been confirmed`,
    data: {
      type: "attendance_confirmed",
      action: "view_attendance"
    }
  }),

  attendanceMissed: (jobTitle, date) => ({
    title: "⚠️ Attendance Marked Absent",
    body: `You were marked absent for ${jobTitle} on ${date}`,
    data: {
      type: "attendance_missed",
      action: "view_attendance"
    }
  }),

  attendanceCheckIn: (workerName, time) => ({
    title: "Check-in Confirmed",
    body: `${workerName} checked in at ${time}`,
    data: {
      type: "attendance_checkin",
      action: "view_attendance"
    }
  }),

  attendanceCheckOut: (workerName, time) => ({
    title: "Check-out Confirmed",
    body: `${workerName} checked out at ${time}`,
    data: {
      type: "attendance_checkout",
      action: "view_attendance"
    }
  }),

  /**
   * ========== CONVERSATION NOTIFICATIONS ==========
   */
  messageReceived: (senderName, preview) => ({
    title: "💬 New Message",
    body: `${senderName}: ${preview}`,
    data: {
      type: "message_received",
      action: "open_chat"
    }
  }),

  conversationStarted: (initiatorName) => ({
    title: "👋 New Conversation",
    body: `${initiatorName} started a conversation with you`,
    data: {
      type: "conversation_started",
      action: "open_chat"
    }
  }),

  conversationEnded: (userName) => ({
    title: "Conversation Ended",
    body: `Your conversation with ${userName} has been closed`,
    data: {
      type: "conversation_ended",
      action: "view_conversations"
    }
  }),

  /**
   * ========== PAYMENT NOTIFICATIONS ==========
   */
  paymentProcessed: (amount, currency = "USD") => ({
    title: "💳 Payment Successful",
    body: `Payment of ${currency} ${amount} has been processed successfully`,
    data: {
      type: "payment_processed",
      action: "view_payment"
    }
  }),

  paymentFailed: (amount, currency = "USD") => ({
    title: "❌ Payment Failed",
    body: `Payment of ${currency} ${amount} could not be processed. Please try again.`,
    data: {
      type: "payment_failed",
      action: "retry_payment"
    }
  }),

  paymentPending: (amount, currency = "USD") => ({
    title: "⏳ Payment Pending",
    body: `Payment of ${currency} ${amount} is being processed`,
    data: {
      type: "payment_pending",
      action: "view_payment"
    }
  }),

  invoiceReady: (invoiceNumber) => ({
    title: "📄 Invoice Generated",
    body: `Your invoice #${invoiceNumber} is ready to download`,
    data: {
      type: "invoice_ready",
      action: "view_invoice"
    }
  }),

  /**
   * ========== SHIFT NOTIFICATIONS ==========
   */
  shiftSwapRequested: (requesterName, shiftDate) => ({
    title: "🔄 Shift Swap Request",
    body: `${requesterName} requested to swap your shift on ${shiftDate}`,
    data: {
      type: "shift_swap_requested",
      action: "view_swap_request"
    }
  }),

  shiftSwapApproved: (approverName, shiftDate) => ({
    title: "✅ Shift Swap Approved",
    body: `${approverName} approved your shift swap for ${shiftDate}`,
    data: {
      type: "shift_swap_approved",
      action: "view_shifts"
    }
  }),

  shiftSwapRejected: (rejecterName, shiftDate) => ({
    title: "❌ Shift Swap Rejected",
    body: `${rejecterName} rejected your shift swap request for ${shiftDate}`,
    data: {
      type: "shift_swap_rejected",
      action: "view_shifts"
    }
  }),

  /**
   * ========== TEAM NOTIFICATIONS ==========
   */
  teamMemberAdded: (memberName, teamName) => ({
    title: "👥 Team Member Added",
    body: `${memberName} has been added to ${teamName}`,
    data: {
      type: "team_member_added",
      action: "view_team"
    }
  }),

  teamMemberRemoved: (memberName, teamName) => ({
    title: "👥 Team Member Removed",
    body: `${memberName} has been removed from ${teamName}`,
    data: {
      type: "team_member_removed",
      action: "view_team"
    }
  }),

  roleAssigned: (roleName, teamName) => ({
    title: "🎖️ Role Assigned",
    body: `You have been assigned as ${roleName} in ${teamName}`,
    data: {
      type: "role_assigned",
      action: "view_profile"
    }
  }),

  /**
   * ========== BUSINESS NOTIFICATIONS ==========
   */
  businessCreated: (businessName) => ({
    title: "🏢 Business Created",
    body: `Your business "${businessName}" has been successfully created`,
    data: {
      type: "business_created",
      action: "view_business"
    }
  }),

  businessUpdated: (businessName) => ({
    title: "🏢 Business Updated",
    body: `${businessName} information has been updated`,
    data: {
      type: "business_updated",
      action: "view_business"
    }
  }),

  /**
   * ========== AUTHENTICATION NOTIFICATIONS ==========
   */
  logout: () => ({
    title: "👋 Logout",
    body: "You have been logged out",
    data: {
      type: "logout",
      action: "login"
    }
  }),

  forcedLogout: (reason = "") => ({
    title: "🔐 Session Terminated",
    body: reason || "Your session has been terminated for security reasons",
    data: {
      type: "forced_logout",
      action: "login"
    }
  }),

  accountLocked: () => ({
    title: "🔒 Account Locked",
    body: "Your account has been locked. Contact support for assistance.",
    data: {
      type: "account_locked",
      action: "contact_support"
    }
  }),

  passwordChanged: () => ({
    title: "🔑 Password Changed",
    body: "Your password has been successfully changed",
    data: {
      type: "password_changed",
      action: "view_security"
    }
  }),

  /**
   * ========== APPROVAL NOTIFICATIONS ==========
   */
  approvalPending: (itemType, itemName) => ({
    title: "⏳ Approval Pending",
    body: `${itemType} "${itemName}" is pending approval`,
    data: {
      type: "approval_pending",
      action: "view_approvals"
    }
  }),

  approvalApproved: (itemType, itemName) => ({
    title: "✅ Approved",
    body: `${itemType} "${itemName}" has been approved`,
    data: {
      type: "approval_approved",
      action: "view_item"
    }
  }),

  approvalRejected: (itemType, itemName, reason = "") => ({
    title: "❌ Rejected",
    body: `${itemType} "${itemName}" was rejected. ${reason}`,
    data: {
      type: "approval_rejected",
      action: "view_item"
    }
  }),

  /**
   * ========== GENERAL NOTIFICATIONS ==========
   */
  generic: (title, body) => ({
    title,
    body,
    data: {
      type: "generic"
    }
  }),

  alert: (title, message) => ({
    title,
    body: message,
    data: {
      type: "alert",
      action: "acknowledge"
    }
  }),

  announcement: (title, message) => ({
    title,
    body: message,
    data: {
      type: "announcement",
      action: "view_more"
    }
  }),

  systemMaintenance: (startTime, endTime) => ({
    title: "🔧 System Maintenance",
    body: `System maintenance from ${startTime} to ${endTime}. Service may be unavailable.`,
    data: {
      type: "system_maintenance"
    }
  }),

  /**
   * ========== REMINDER NOTIFICATIONS ==========
   */
  reminder: (title, message) => ({
    title: "🔔 Reminder",
    body: `${title}: ${message}`,
    data: {
      type: "reminder"
    }
  }),

  pendingAction: (actionType, deadline) => ({
    title: "⚠️ Action Required",
    body: `Please ${actionType} before ${deadline}`,
    data: {
      type: "pending_action"
    }
  }),
};

module.exports = templates;
