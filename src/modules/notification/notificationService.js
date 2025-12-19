/**
 * Notification Service - Utility for sending notifications across all modules
 * Handles automatic notification pushing to users for various events
 */

const admin = require('./config/firebase');
const UserFcmToken = require('./UserFcmToken.model');

/**
 * Notification Types
 */
const NOTIFICATION_TYPES = {
  // Job notifications
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  JOB_PUBLISHED: 'job_published',
  JOB_CLOSED: 'job_closed',

  // Application notifications
  APPLICATION_CREATED: 'application_created',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_REJECTED: 'application_rejected',
  APPLICATION_SHORTLISTED: 'application_shortlisted',

  // Attendance notifications
  ATTENDANCE_SCHEDULED: 'attendance_scheduled',
  ATTENDANCE_CLOCK_IN: 'attendance_clock_in',
  ATTENDANCE_CLOCK_OUT: 'attendance_clock_out',
  ATTENDANCE_MARKED_COMPLETE: 'attendance_marked_complete',

  // Team notifications
  TEAM_MEMBER_ADDED: 'team_member_added',
  TEAM_MEMBER_REMOVED: 'team_member_removed',
  TEAM_ROLE_UPDATED: 'team_role_updated',

  // General notifications
  MESSAGE_RECEIVED: 'message_received',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
};

/**
 * Send notification to a single user
 * @param {string} userId - User ID to send notification to
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} options.type - Notification type (from NOTIFICATION_TYPES)
 * @param {Object} options.data - Additional data to include
 * @param {string} options.imageUrl - Optional image URL
 * @returns {Promise<Object>} Response with results
 */
async function sendToUser(userId, options) {
  try {
    const { title, body, type, data = {}, imageUrl } = options;

    if (!userId || !title || !body) {
      console.warn('Invalid notification parameters:', { userId, title, body });
      return { success: false, error: 'Invalid parameters' };
    }

    const tokens = await UserFcmToken.find({ userId, isActive: true }).select(
      'token deviceType'
    );

    if (!tokens.length) {
      console.log(`No active tokens found for user ${userId}`);
      return { success: false, error: 'No tokens found', tokensCount: 0 };
    }

    const responses = [];
    const defaultData = {
      notificationType: type || 'general',
      timestamp: new Date().toISOString(),
      ...data,
    };

    for (const t of tokens) {
      try {
        const notification = { title, body };
        if (imageUrl) {
          notification.imageUrl = imageUrl;
        }

        const message = {
          token: t.token,
          notification,
          data: Object.entries(defaultData).reduce((acc, [key, val]) => {
            acc[key] = String(val);
            return acc;
          }, {}),
        };

        // Platform-specific configurations
        if (imageUrl) {
          if (t.deviceType === 'web') {
            message.webpush = {
              notification: {
                title,
                body,
                icon: imageUrl,
                image: imageUrl,
              },
              data: message.data,
            };
          } else if (t.deviceType === 'android') {
            message.android = {
              notification: {
                title,
                body,
                imageUrl,
              },
              data: message.data,
            };
          } else if (t.deviceType === 'ios') {
            message.apns = {
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                },
              },
              fcmOptions: {
                image: imageUrl,
              },
            };
          }
        }

        const response = await admin.messaging().send(message);
        responses.push({ success: true, token: t.token, response });
      } catch (error) {
        console.error('FCM error for token:', error.code);

        // Remove invalid tokens
        if (
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token'
        ) {
          await UserFcmToken.deleteOne({ token: t.token });
        }

        responses.push({
          success: false,
          token: t.token,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      userId,
      tokensCount: tokens.length,
      responses,
    };
  } catch (error) {
    console.error('Error in sendToUser:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} options - Notification options (same as sendToUser)
 * @returns {Promise<Object>} Response with results for each user
 */
async function sendToUsers(userIds, options) {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'Invalid user IDs' };
    }

    const results = [];
    for (const userId of userIds) {
      const result = await sendToUser(userId, options);
      results.push(result);
    }

    return {
      success: true,
      totalUsers: userIds.length,
      results,
    };
  } catch (error) {
    console.error('Error in sendToUsers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to all users (broadcast)
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Response with results
 */
async function sendToAll(options) {
  try {
    const { title, body, type, data = {}, imageUrl } = options;

    if (!title || !body) {
      return { success: false, error: 'Title and body are required' };
    }

    const tokens = await UserFcmToken.find({ isActive: true }).select(
      'token deviceType userId'
    );

    if (!tokens.length) {
      return { success: false, error: 'No active tokens found' };
    }

    const responses = [];
    const defaultData = {
      notificationType: type || 'general',
      timestamp: new Date().toISOString(),
      ...data,
    };

    for (const t of tokens) {
      try {
        const notification = { title, body };
        if (imageUrl) {
          notification.imageUrl = imageUrl;
        }

        const message = {
          token: t.token,
          notification,
          data: Object.entries(defaultData).reduce((acc, [key, val]) => {
            acc[key] = String(val);
            return acc;
          }, {}),
        };

        // Platform-specific configurations
        if (imageUrl) {
          if (t.deviceType === 'web') {
            message.webpush = {
              notification: {
                title,
                body,
                icon: imageUrl,
                image: imageUrl,
              },
              data: message.data,
            };
          } else if (t.deviceType === 'android') {
            message.android = {
              notification: {
                title,
                body,
                imageUrl,
              },
              data: message.data,
            };
          } else if (t.deviceType === 'ios') {
            message.apns = {
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                },
              },
              fcmOptions: {
                image: imageUrl,
              },
            };
          }
        }

        const response = await admin.messaging().send(message);
        responses.push({ success: true, response });
      } catch (error) {
        console.error('FCM error:', error.code);

        // Remove invalid tokens
        if (
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token'
        ) {
          await UserFcmToken.deleteOne({ token: t.token });
        }
      }
    }

    return {
      success: true,
      totalTokens: tokens.length,
      sentCount: responses.filter((r) => r.success).length,
      responses,
    };
  } catch (error) {
    console.error('Error in sendToAll:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Job Notifications
 */

async function notifyJobCreated(jobData, businessEmployerIds) {
  try {
    const { _id: jobId, title, businessName, businessId } = jobData;

    const notificationData = {
      title: `New Job Posted: ${title}`,
      body: `A new job has been posted by ${businessName}`,
      type: NOTIFICATION_TYPES.JOB_CREATED,
      data: {
        jobId: jobId.toString(),
        businessId: businessId.toString(),
        action: 'view_job',
        screen: 'job_details',
      },
    };

    // Send to employer's team
    if (businessEmployerIds && businessEmployerIds.length > 0) {
      return await sendToUsers(businessEmployerIds, notificationData);
    }
  } catch (error) {
    console.error('Error in notifyJobCreated:', error);
  }
}

async function notifyJobPublished(jobData, workerIds) {
  try {
    const { _id: jobId, title, businessName, location } = jobData;

    const notificationData = {
      title: `Job Available: ${title}`,
      body: `${businessName} is hiring near ${location?.address || 'your area'}`,
      type: NOTIFICATION_TYPES.JOB_PUBLISHED,
      data: {
        jobId: jobId.toString(),
        action: 'view_job',
        screen: 'job_details',
      },
    };

    if (workerIds && workerIds.length > 0) {
      return await sendToUsers(workerIds, notificationData);
    }
  } catch (error) {
    console.error('Error in notifyJobPublished:', error);
  }
}

async function notifyJobClosed(jobData, applicantIds) {
  try {
    const { _id: jobId, title, businessName } = jobData;

    const notificationData = {
      title: `Job Closed: ${title}`,
      body: `${businessName} has closed the job opening`,
      type: NOTIFICATION_TYPES.JOB_CLOSED,
      data: {
        jobId: jobId.toString(),
        action: 'view_job',
      },
    };

    if (applicantIds && applicantIds.length > 0) {
      return await sendToUsers(applicantIds, notificationData);
    }
  } catch (error) {
    console.error('Error in notifyJobClosed:', error);
  }
}

/**
 * Application Notifications
 */

async function notifyApplicationCreated(applicationData, businessEmployerId) {
  try {
    const { _id: appId, workerName, jobTitle } = applicationData;

    const notificationData = {
      title: `New Application: ${jobTitle}`,
      body: `${workerName} has applied for your job`,
      type: NOTIFICATION_TYPES.APPLICATION_CREATED,
      data: {
        applicationId: appId.toString(),
        action: 'view_application',
        screen: 'application_details',
      },
    };

    return await sendToUser(businessEmployerId, notificationData);
  } catch (error) {
    console.error('Error in notifyApplicationCreated:', error);
  }
}

async function notifyApplicationAccepted(applicationData, workerId) {
  try {
    const { _id: appId, jobTitle, businessName } = applicationData;

    const notificationData = {
      title: `Application Accepted: ${jobTitle}`,
      body: `${businessName} has accepted your application!`,
      type: NOTIFICATION_TYPES.APPLICATION_ACCEPTED,
      data: {
        applicationId: appId.toString(),
        action: 'view_application',
        screen: 'application_details',
      },
    };

    return await sendToUser(workerId, notificationData);
  } catch (error) {
    console.error('Error in notifyApplicationAccepted:', error);
  }
}

async function notifyApplicationRejected(applicationData, workerId) {
  try {
    const { _id: appId, jobTitle, businessName } = applicationData;

    const notificationData = {
      title: `Application Update: ${jobTitle}`,
      body: `${businessName} has updated your application status`,
      type: NOTIFICATION_TYPES.APPLICATION_REJECTED,
      data: {
        applicationId: appId.toString(),
        action: 'view_application',
      },
    };

    return await sendToUser(workerId, notificationData);
  } catch (error) {
    console.error('Error in notifyApplicationRejected:', error);
  }
}

async function notifyApplicationShortlisted(applicationData, workerId) {
  try {
    const { _id: appId, jobTitle, businessName } = applicationData;

    const notificationData = {
      title: `You're Shortlisted: ${jobTitle}`,
      body: `${businessName} has shortlisted you for ${jobTitle}`,
      type: NOTIFICATION_TYPES.APPLICATION_SHORTLISTED,
      data: {
        applicationId: appId.toString(),
        action: 'view_application',
        screen: 'application_details',
      },
    };

    return await sendToUser(workerId, notificationData);
  } catch (error) {
    console.error('Error in notifyApplicationShortlisted:', error);
  }
}

/**
 * Attendance Notifications
 */

async function notifyAttendanceScheduled(attendanceData, workerId) {
  try {
    const { _id: recordId, jobTitle, businessName, clockInTime } = attendanceData;

    const notificationData = {
      title: `Shift Scheduled: ${jobTitle}`,
      body: `You have a shift scheduled for ${businessName}`,
      type: NOTIFICATION_TYPES.ATTENDANCE_SCHEDULED,
      data: {
        recordId: recordId.toString(),
        action: 'view_attendance',
        screen: 'attendance_details',
      },
    };

    return await sendToUser(workerId, notificationData);
  } catch (error) {
    console.error('Error in notifyAttendanceScheduled:', error);
  }
}

async function notifyClockIn(attendanceData, businessEmployerId) {
  try {
    const { _id: recordId, workerName, jobTitle } = attendanceData;

    const notificationData = {
      title: `Clock In: ${jobTitle}`,
      body: `${workerName} has clocked in`,
      type: NOTIFICATION_TYPES.ATTENDANCE_CLOCK_IN,
      data: {
        recordId: recordId.toString(),
        action: 'view_attendance',
      },
    };

    return await sendToUser(businessEmployerId, notificationData);
  } catch (error) {
    console.error('Error in notifyClockIn:', error);
  }
}

async function notifyClockOut(attendanceData, businessEmployerId) {
  try {
    const { _id: recordId, workerName, jobTitle, hoursWorked } = attendanceData;

    const notificationData = {
      title: `Clock Out: ${jobTitle}`,
      body: `${workerName} has clocked out after ${hoursWorked} hours`,
      type: NOTIFICATION_TYPES.ATTENDANCE_CLOCK_OUT,
      data: {
        recordId: recordId.toString(),
        action: 'view_attendance',
      },
    };

    return await sendToUser(businessEmployerId, notificationData);
  } catch (error) {
    console.error('Error in notifyClockOut:', error);
  }
}

async function notifyAttendanceMarkedComplete(attendanceData, workerId) {
  try {
    const { _id: recordId, jobTitle, businessName, hoursWorked } = attendanceData;

    const notificationData = {
      title: `Shift Completed: ${jobTitle}`,
      body: `Your shift at ${businessName} has been marked complete`,
      type: NOTIFICATION_TYPES.ATTENDANCE_MARKED_COMPLETE,
      data: {
        recordId: recordId.toString(),
        action: 'view_attendance',
      },
    };

    return await sendToUser(workerId, notificationData);
  } catch (error) {
    console.error('Error in notifyAttendanceMarkedComplete:', error);
  }
}

/**
 * Team Notifications
 */

async function notifyTeamMemberAdded(teamMemberData, userId) {
  try {
    const { _id: memberId, userName, role, businessName } = teamMemberData;

    const notificationData = {
      title: `Team Member Added`,
      body: `${userName} has been added to your team as ${role}`,
      type: NOTIFICATION_TYPES.TEAM_MEMBER_ADDED,
      data: {
        memberId: memberId.toString(),
        action: 'view_team',
        screen: 'team_members',
      },
    };

    return await sendToUser(userId, notificationData);
  } catch (error) {
    console.error('Error in notifyTeamMemberAdded:', error);
  }
}

async function notifyTeamMemberRemoved(teamMemberData, userId) {
  try {
    const { userName, businessName } = teamMemberData;

    const notificationData = {
      title: `Team Member Removed`,
      body: `${userName} has been removed from your team`,
      type: NOTIFICATION_TYPES.TEAM_MEMBER_REMOVED,
      data: {
        action: 'view_team',
      },
    };

    return await sendToUser(userId, notificationData);
  } catch (error) {
    console.error('Error in notifyTeamMemberRemoved:', error);
  }
}

async function notifyTeamRoleUpdated(teamMemberData, userId) {
  try {
    const { userName, role } = teamMemberData;

    const notificationData = {
      title: `Role Updated`,
      body: `${userName}'s role has been updated to ${role}`,
      type: NOTIFICATION_TYPES.TEAM_ROLE_UPDATED,
      data: {
        action: 'view_team',
      },
    };

    return await sendToUser(userId, notificationData);
  } catch (error) {
    console.error('Error in notifyTeamRoleUpdated:', error);
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  // General methods
  sendToUser,
  sendToUsers,
  sendToAll,
  // Job notifications
  notifyJobCreated,
  notifyJobPublished,
  notifyJobClosed,
  // Application notifications
  notifyApplicationCreated,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyApplicationShortlisted,
  // Attendance notifications
  notifyAttendanceScheduled,
  notifyClockIn,
  notifyClockOut,
  notifyAttendanceMarkedComplete,
  // Team notifications
  notifyTeamMemberAdded,
  notifyTeamMemberRemoved,
  notifyTeamRoleUpdated,
};
