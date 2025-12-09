/**
 * Error Notification Service
 * Sends error notifications to admins and relevant users
 */

const { sendNotificationToUser, sendBulkNotifications } = require('./fcm-helper.service');
const User = require('../modules/users/user.model');
const Business = require('../modules/businesses/business.model');

/**
 * Send error notification to all admins
 */
exports.notifyAdmins = async (errorTitle, errorDetails, errorData = {}) => {
  try {
    console.log(`📢 [ERROR NOTIFICATION] Notifying admins: ${errorTitle}`);

    // Find all admin users
    const admins = await User.find({ userType: 'admin' }).select('_id fcmToken email');
    
    if (!admins || admins.length === 0) {
      console.warn('⚠️  No admin users found to notify');
      return { sent: 0, failed: 0 };
    }

    const adminIds = admins
      .filter(admin => admin.fcmToken)
      .map(admin => admin._id.toString());

    if (adminIds.length === 0) {
      console.warn('⚠️  No admin tokens available');
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = {
      title: `⚠️ ${errorTitle}`,
      body: errorDetails,
      data: {
        type: 'error_alert',
        screen: 'admin_dashboard',
        severity: errorData.severity || 'high',
        timestamp: new Date().toISOString(),
        ...errorData
      }
    };

    const result = await sendBulkNotifications(adminIds, notificationPayload.title, notificationPayload.body, notificationPayload.data);
    
    console.log(`✅ [ERROR NOTIFICATION] Sent to ${result.successCount} admins, ${result.failureCount} failed`);
    return result;
  } catch (error) {
    console.error('❌ [ERROR NOTIFICATION] Failed to notify admins:', error.message);
    return { sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Send error notification to business owner
 */
exports.notifyBusinessOwner = async (businessId, errorTitle, errorDetails, errorData = {}) => {
  try {
    console.log(`📢 [ERROR NOTIFICATION] Notifying business owner for ${businessId}`);

    const business = await Business.findById(businessId).populate('owner');
    
    if (!business || !business.owner) {
      console.warn('⚠️  Business or owner not found');
      return { sent: 0, failed: 0 };
    }

    const owner = business.owner;
    
    if (!owner.fcmToken) {
      console.warn('⚠️  Owner has no FCM token');
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = {
      title: `⚠️ ${errorTitle}`,
      body: errorDetails,
      data: {
        type: 'business_error',
        businessId: businessId,
        screen: 'business_dashboard',
        severity: errorData.severity || 'medium',
        timestamp: new Date().toISOString(),
        ...errorData
      }
    };

    await sendNotificationToUser(owner._id, notificationPayload.title, notificationPayload.body, notificationPayload.data);
    
    console.log(`✅ [ERROR NOTIFICATION] Sent to business owner ${owner.email}`);
    return { sent: 1, failed: 0 };
  } catch (error) {
    console.error('❌ [ERROR NOTIFICATION] Failed to notify business owner:', error.message);
    return { sent: 0, failed: 1, error: error.message };
  }
};

/**
 * Send error notification to specific user
 */
exports.notifyUser = async (userId, errorTitle, errorDetails, errorData = {}) => {
  try {
    console.log(`📢 [ERROR NOTIFICATION] Notifying user ${userId}`);

    const user = await User.findById(userId);
    
    if (!user) {
      console.warn('⚠️  User not found');
      return { sent: 0, failed: 0 };
    }

    if (!user.fcmToken) {
      console.warn('⚠️  User has no FCM token');
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = {
      title: `⚠️ ${errorTitle}`,
      body: errorDetails,
      data: {
        type: 'user_error',
        userId: userId,
        severity: errorData.severity || 'medium',
        timestamp: new Date().toISOString(),
        ...errorData
      }
    };

    await sendNotificationToUser(userId, notificationPayload.title, notificationPayload.body, notificationPayload.data);
    
    console.log(`✅ [ERROR NOTIFICATION] Sent to user ${user.email}`);
    return { sent: 1, failed: 0 };
  } catch (error) {
    console.error('❌ [ERROR NOTIFICATION] Failed to notify user:', error.message);
    return { sent: 0, failed: 1, error: error.message };
  }
};

/**
 * Send error notification to team members of a business
 */
exports.notifyTeamMembers = async (businessId, errorTitle, errorDetails, errorData = {}) => {
  try {
    console.log(`📢 [ERROR NOTIFICATION] Notifying team members for ${businessId}`);

    const business = await Business.findById(businessId).populate('teamMembers');
    
    if (!business || !business.teamMembers || business.teamMembers.length === 0) {
      console.warn('⚠️  No team members found');
      return { sent: 0, failed: 0 };
    }

    const memberIds = business.teamMembers
      .filter(member => member.fcmToken)
      .map(member => member._id.toString());

    if (memberIds.length === 0) {
      console.warn('⚠️  No team member tokens available');
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = {
      title: `⚠️ ${errorTitle}`,
      body: errorDetails,
      data: {
        type: 'team_error',
        businessId: businessId,
        screen: 'team_dashboard',
        severity: errorData.severity || 'medium',
        timestamp: new Date().toISOString(),
        ...errorData
      }
    };

    const result = await sendBulkNotifications(memberIds, notificationPayload.title, notificationPayload.body, notificationPayload.data);
    
    console.log(`✅ [ERROR NOTIFICATION] Sent to ${result.successCount} team members, ${result.failureCount} failed`);
    return result;
  } catch (error) {
    console.error('❌ [ERROR NOTIFICATION] Failed to notify team members:', error.message);
    return { sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Common error scenarios with pre-built messages
 */
exports.errorScenarios = {
  ATTENDANCE_SYNC_FAILED: {
    title: 'Attendance Sync Failed',
    body: 'Failed to sync attendance data. Please try again.',
    severity: 'high'
  },
  PAYMENT_FAILED: {
    title: 'Payment Processing Error',
    body: 'Payment processing failed. Please contact support.',
    severity: 'critical'
  },
  JOB_POSTING_FAILED: {
    title: 'Job Posting Error',
    body: 'Failed to post job. Please try again.',
    severity: 'medium'
  },
  APPLICATION_ERROR: {
    title: 'Application Processing Error',
    body: 'Failed to process application. Please try again.',
    severity: 'medium'
  },
  DATABASE_ERROR: {
    title: 'Database Error',
    body: 'System is experiencing issues. Please try again later.',
    severity: 'critical'
  },
  FIREBASE_ERROR: {
    title: 'Firebase Service Error',
    body: 'Notification service is temporarily unavailable.',
    severity: 'high'
  },
  AUTHENTICATION_ERROR: {
    title: 'Authentication Error',
    body: 'Session expired. Please log in again.',
    severity: 'medium'
  },
  AUTHORIZATION_ERROR: {
    title: 'Authorization Error',
    body: 'You do not have permission to perform this action.',
    severity: 'low'
  }
};
