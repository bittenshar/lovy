/**
 * Backend Notification Templates
 * Use these templates when creating notifications for different app events
 * 
 * Key Points:
 * 1. Always include 'type' field in metadata/data
 * 2. Include relevant IDs (conversationId, jobId, applicationId, teamId)
 * 3. Use notificationService.sendSafeNotification() for async non-blocking sends
 * 4. Include comprehensive logging with emoji prefixes
 */

// ============================================================================
// 1. NEW MESSAGE / CHAT NOTIFICATION
// ============================================================================
// Location: src/modules/conversations/conversation.controller.js
// Trigger: When user sends a message

const messageNotificationPayload = {
  recipient: recipientUserId,                    // Required
  type: 'new_message',                           // Required enum value
  priority: 'high',                              // or 'medium', 'low'
  title: `New message from ${senderName}`,       // Displayed in notification
  message: messageBody.slice(0, 100),            // Preview of message
  metadata: {
    type: 'chat',                                // For app routing
    conversationId: conversationId.toString(),
    messageId: message._id.toString(),
    senderId: senderId.toString(),
    senderName: senderName,
    messagePreview: messageBody.slice(0, 50)
  },
  senderUserId: senderId
};

// Usage:
await notificationService.sendSafeNotification(messageNotificationPayload);

// Expected FCM Data:
// {
//   "type": "new_message",
//   "conversationId": "...",
//   "messageId": "...",
//   "senderId": "...",
//   "senderName": "John Doe",
//   "messagePreview": "Hello, how are you?"
// }


// ============================================================================
// 2. JOB CREATED NOTIFICATION
// ============================================================================
// Location: src/modules/jobs/job.controller.js
// Trigger: When a new job is posted

const jobCreatedNotificationPayload = {
  recipient: employerId,                         // Job creator (for confirmation)
  type: 'job_created',                           // Required enum value
  priority: 'medium',
  title: '💼 Your Job Posted Successfully',
  message: jobTitle,
  metadata: {
    type: 'job_created',                         // For app routing
    jobId: job._id.toString(),
    jobTitle: jobTitle,
    budget: jobBudget
  },
  senderUserId: employerId
};

// Send to all workers who match criteria:
const allWorkers = await User.find({ userType: 'worker' });
for (const worker of allWorkers) {
  const workerNotification = {
    ...jobCreatedNotificationPayload,
    recipient: worker._id,
    title: `💼 New Job: ${jobTitle}`,
    metadata: {
      ...jobCreatedNotificationPayload.metadata,
      type: 'job'
    }
  };
  await notificationService.sendSafeNotification(workerNotification);
}

// Expected FCM Data:
// {
//   "type": "job_created",
//   "jobId": "...",
//   "jobTitle": "Senior Developer",
//   "budget": "5000-7000"
// }


// ============================================================================
// 3. JOB APPLICATION NOTIFICATION
// ============================================================================
// Location: src/modules/applications/application.controller.js
// Trigger: When a worker applies for a job OR application status changes

// 3A. New Application Received (to employer)
const applicationReceivedPayload = {
  recipient: employerId,                         // Job employer
  type: 'job_application',                       // Required enum value
  priority: 'high',
  title: `📋 New Application Received`,
  message: `${workerName} applied for your job`,
  metadata: {
    type: 'application',                         // For app routing
    applicationId: application._id.toString(),
    jobId: jobId.toString(),
    workerId: workerId.toString(),
    workerName: workerName,
    jobTitle: jobTitle
  },
  senderUserId: workerId
};

// 3B. Application Status Update (to worker)
const applicationStatusUpdatePayload = {
  recipient: workerId,                           // Job applicant
  type: 'job_application',                       // Required enum value
  priority: 'high',
  title: `📋 Application Status Update`,
  message: `Your application for "${jobTitle}" is now ${status}`,
  metadata: {
    type: 'application',                         // For app routing
    applicationId: application._id.toString(),
    jobId: jobId.toString(),
    status: status,  // 'accepted', 'rejected', 'under_review'
    jobTitle: jobTitle
  },
  senderUserId: employerId
};

// Usage:
await notificationService.sendSafeNotification(applicationReceivedPayload);
await notificationService.sendSafeNotification(applicationStatusUpdatePayload);

// Expected FCM Data (for employer):
// {
//   "type": "job_application",
//   "applicationId": "...",
//   "jobId": "...",
//   "workerName": "Jane Doe",
//   "jobTitle": "Senior Developer"
// }

// Expected FCM Data (for worker):
// {
//   "type": "job_application",
//   "applicationId": "...",
//   "jobId": "...",
//   "status": "accepted",
//   "jobTitle": "Senior Developer"
// }


// ============================================================================
// 4. TEAM UPDATE / INVITATION NOTIFICATION
// ============================================================================
// Location: src/modules/team/team.controller.js
// Trigger: Team member added, invitation sent, team updated

// 4A. Team Invitation (to invited user)
const teamInvitationPayload = {
  recipient: invitedUserId,                      // User being invited
  type: 'team_invitation',                       // Required enum value
  priority: 'medium',
  title: `👥 Team Invitation`,
  message: `You've been invited to join ${teamName}`,
  metadata: {
    type: 'team_invitation',                     // For app routing
    teamId: team._id.toString(),
    teamName: teamName,
    invitedBy: inviterName
  },
  senderUserId: inviterId
};

// 4B. New Member Joined (to team members)
const teamMemberJoinedPayload = {
  recipient: teamMemberId,                       // Existing team members
  type: 'team_update',                           // Required enum value
  priority: 'low',
  title: `👥 Team Update`,
  message: `${newMemberName} joined ${teamName}`,
  metadata: {
    type: 'team_update',                         // For app routing
    teamId: team._id.toString(),
    teamName: teamName,
    action: 'member_joined',
    newMemberName: newMemberName
  },
  senderUserId: newMemberId
};

// Usage:
await notificationService.sendSafeNotification(teamInvitationPayload);
for (const member of existingMembers) {
  await notificationService.sendSafeNotification({
    ...teamMemberJoinedPayload,
    recipient: member._id
  });
}

// Expected FCM Data (for invitation):
// {
//   "type": "team_invitation",
//   "teamId": "...",
//   "teamName": "Development Team",
//   "invitedBy": "John Manager"
// }

// Expected FCM Data (for member joined):
// {
//   "type": "team_update",
//   "teamId": "...",
//   "teamName": "Development Team",
//   "action": "member_joined",
//   "newMemberName": "Jane Developer"
// }


// ============================================================================
// LOGGING TEMPLATE
// ============================================================================
// Use these log patterns for consistency:

console.log('\n📨 [MSG] ===== SEND MESSAGE START =====');
console.log('📨 [MSG] Sending message');
console.log('📨 [MSG] Conversation ID:', conversationId);
console.log('📨 [MSG] Recipient ID:', recipientId);

console.log('\n🔔 [NOTIF] Creating notification in database...');
console.log(`✅ [NOTIF] Notification created in DB: ${notification._id}`);
console.log(`🔔 [NOTIF] Notification type: ${payload.type}, priority: ${payload.priority}`);

console.log(`🔔 [FCM] ===== SEND NOTIFICATION START =====`);
console.log(`🔔 [FCM] User ID: ${userId}`);
console.log(`✅ [FCM] FCM notification sent: ${response.successCount} success, ${response.failureCount} failed`);
console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');


// ============================================================================
// ENUM VALUES FOR 'type' FIELD
// ============================================================================
// Valid values for notification.type in MongoDB schema:
// - 'new_message'
// - 'job_created'
// - 'job_application'
// - 'application_status'
// - 'team_update'
// - 'team_invitation'
// - 'system'

// Custom metadata 'type' values (for routing):
// - 'chat' or 'new_message'
// - 'job' or 'job_created'
// - 'application' or 'job_application'
// - 'team_update' or 'team_invitation'

