/**
 * Firebase Cloud Messaging (FCM) Helper Service
 * Handles sending push notifications to user devices
 */

const { admin, isFirebaseReady } = require('./firebase-admin');
const User = require('../modules/users/user.model');

/**
 * Send notification to a single user's registered FCM tokens
 * @param {string} userId - MongoDB user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {object} data - Additional data to send with notification (optional)
 * @returns {object} - { successCount, failureCount, error }
 */
async function sendNotificationToUser(userId, title, body, data = {}) {
  if (!isFirebaseReady()) {
    console.log('❌ Firebase not initialized - skipping push notification');
    return { successCount: 0, failureCount: 0, skipped: true };
  }

  try {
    // Fetch user and their FCM tokens
    const user = await User.findById(userId).select('fcmToken platform');

    if (!user || !user.fcmToken) {
      console.log(`⚠️ No FCM token found for user ${userId}`);
      return { successCount: 0, failureCount: 0, noToken: true };
    }

    const tokens = Array.isArray(user.fcmToken) 
      ? user.fcmToken.filter(token => token && token.length > 50) // Filter valid tokens
      : [user.fcmToken];

    if (tokens.length === 0) {
      console.log(`⚠️ No valid FCM tokens for user ${userId}`);
      return { successCount: 0, failureCount: 0, noToken: true };
    }

    const message = {
      notification: { title, body },
      data: {
        ...data,
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
      },
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);

    console.log(`✅ FCM notification sent: ${response.successCount} success, ${response.failureCount} failed`);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error.message);

    // Handle credential mismatch gracefully
    if (error.message.includes('mismatched-credential')) {
      console.error('Firebase project mismatch - verify FCM tokens match Firebase project');
    }

    return {
      successCount: 0,
      failureCount: 1,
      error: error.message,
    };
  }
}

/**
 * Send notification to multiple users at once
 * @param {string[]} userIds - Array of MongoDB user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {object} data - Additional data to send (optional)
 * @returns {object} - Aggregated results
 */
async function sendBulkNotifications(userIds, title, body, data = {}) {
  if (!isFirebaseReady()) {
    return { totalSent: 0, totalFailed: 0, skipped: true };
  }

  try {
    // Fetch all users and their tokens
    const users = await User.find({ _id: { $in: userIds } }).select('_id fcmToken platform');

    // Flatten all tokens
    const allTokens = [];
    users.forEach(user => {
      if (user.fcmToken) {
        const tokens = Array.isArray(user.fcmToken) ? user.fcmToken : [user.fcmToken];
        allTokens.push(...tokens.filter(t => t && t.length > 50));
      }
    });

    if (allTokens.length === 0) {
      console.log(`⚠️ No valid FCM tokens found for ${userIds.length} users`);
      return { totalSent: 0, totalFailed: 0, noTokens: true };
    }

    const message = {
      notification: { title, body },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await admin.messaging().sendMulticast({
      ...message,
      tokens: allTokens,
    });

    console.log(`✅ Bulk FCM sent: ${response.successCount}/${allTokens.length} successful`);

    return {
      totalSent: response.successCount,
      totalFailed: response.failureCount,
    };
  } catch (error) {
    console.error('❌ Error sending bulk FCM notifications:', error.message);
    return {
      totalSent: 0,
      totalFailed: userIds.length,
      error: error.message,
    };
  }
}

module.exports = {
  sendNotificationToUser,
  sendBulkNotifications,
};
