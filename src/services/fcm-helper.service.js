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
  console.log('\n🔔 [FCM] ===== SEND NOTIFICATION START =====');
  console.log(`🔔 [FCM] User ID: ${userId}`);
  console.log(`🔔 [FCM] Title: ${title}`);
  console.log(`🔔 [FCM] Body: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
  console.log(`🔔 [FCM] Data keys: ${Object.keys(data).join(', ')}`);
  
  if (!isFirebaseReady()) {
    console.log('❌ [FCM] Firebase not initialized - skipping push notification');
    console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');
    return { successCount: 0, failureCount: 0, skipped: true };
  }

  try {
    // Fetch user and their FCM tokens
    console.log(`🔔 [FCM] Fetching user ${userId} and their FCM tokens...`);
    const user = await User.findById(userId).select('fcmToken platform');

    if (!user) {
      console.log(`❌ [FCM] User not found: ${userId}`);
      console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');
      return { successCount: 0, failureCount: 0, userNotFound: true };
    }

    console.log(`🔔 [FCM] User found: ${user._id}`);
    console.log(`🔔 [FCM] FCM token exists: ${!!user.fcmToken}`);
    
    if (!user.fcmToken) {
      console.log(`⚠️  [FCM] No FCM token found for user ${userId}`);
      console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');
      return { successCount: 0, failureCount: 0, noToken: true };
    }

    const tokens = Array.isArray(user.fcmToken) 
      ? user.fcmToken.filter(token => token && typeof token === 'string' && token.trim().length > 0)
      : [user.fcmToken];

    console.log(`🔔 [FCM] Valid FCM tokens count: ${tokens.length}`);
    if (tokens.length > 0) {
      console.log(`🔔 [FCM] First token (truncated): ${tokens[0].substring(0, 20)}...`);
    }

    if (tokens.length === 0) {
      console.log(`⚠️  [FCM] No valid FCM tokens for user ${userId}`);
      console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');
      return { successCount: 0, failureCount: 0, noToken: true };
    }

    // Create individual message objects for each token (Firebase requirement)
    console.log(`🔔 [FCM] Creating Firebase messages for ${tokens.length} token(s)...`);
    const messages = tokens.map((token, index) => {
      console.log(`🔔 [FCM] Message ${index + 1}: token=${token.substring(0, 20)}..., title=${title}`);
      return {
        notification: { title, body },
        data: {
          ...data,
          userId: userId.toString(),
          timestamp: new Date().toISOString(),
        },
        token,
      };
    });

    console.log(`🔔 [FCM] Sending ${messages.length} Firebase messages...`);
    const response = await admin.messaging().sendAll(messages);

    console.log(`✅ [FCM] Firebase response received`);
    console.log(`🔔 [FCM] Success count: ${response.successCount}`);
    console.log(`🔔 [FCM] Failure count: ${response.failureCount}`);
    
    if (response.responses && response.responses.length > 0) {
      response.responses.forEach((resp, index) => {
        if (resp.success) {
          console.log(`✅ [FCM] Message ${index + 1}: SUCCESS - ${resp.messageId}`);
        } else {
          console.log(`❌ [FCM] Message ${index + 1}: FAILED - ${resp.error?.message}`);
        }
      });
    }

    console.log(`✅ [FCM] FCM notification sent: ${response.successCount} success, ${response.failureCount} failed`);
    console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error('❌ [FCM] Error sending FCM notification:', error.message);
    console.error('❌ [FCM] Error code:', error.code);
    console.error('❌ [FCM] Stack trace:', error.stack);

    // Handle credential mismatch gracefully
    if (error.message.includes('mismatched-credential')) {
      console.error('❌ [FCM] Firebase project mismatch - verify FCM tokens match Firebase project');
    }

    console.log('🔔 [FCM] ===== SEND NOTIFICATION END =====\n');

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
        allTokens.push(...tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0));
      }
    });

    if (allTokens.length === 0) {
      console.log(`⚠️ No valid FCM tokens found for ${userIds.length} users`);
      return { totalSent: 0, totalFailed: 0, noTokens: true };
    }

    // Create individual message objects for each token (Firebase requirement)
    const messages = allTokens.map(token => ({
      notification: { title, body },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token,
    }));

    const response = await admin.messaging().sendAll(messages);

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
