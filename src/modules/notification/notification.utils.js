const firebaseConfig = require("./config/firebase");
const UserFcmToken = require("./UserFcmToken.model");
const templates = require("./constant/templetes");

// Extract admin and initialization status
const admin = firebaseConfig.admin;
const firebaseInitialized = firebaseConfig.isInitialized;

/**
 * Store FCM token for user (called on login)
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} deviceType - Device type ('android', 'ios', 'web')
 * @returns {Promise<object>} - Stored token data
 */
exports.storeFcmToken = async (userId, token, deviceType = 'web') => {
  try {
    if (!userId || !token) {
      throw new Error('UserId and token are required');
    }

    // Check if token already exists for this user
    const existingToken = await UserFcmToken.findOne({
      userId,
      'tokens.token': token
    });

    if (existingToken) {
      // Update existing token
      const result = await UserFcmToken.findOneAndUpdate(
        { userId, 'tokens.token': token },
        {
          $set: {
            'tokens.$.isActive': true,
            'tokens.$.deviceType': deviceType
          }
        },
        { new: true }
      );
      console.log(`✅ FCM token updated for user ${userId}`);
      return { success: true, message: 'Token updated', data: result };
    }

    // Create or update user FCM token record
    const result = await UserFcmToken.findOneAndUpdate(
      { userId },
      {
        $push: {
          tokens: {
            token,
            deviceType,
            isActive: true
          }
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ FCM token stored for user ${userId}`);
    return { success: true, message: 'Token stored', data: result };
  } catch (error) {
    console.error('❌ Error storing FCM token:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete FCM token for user (called on logout)
 * @param {string} userId - User ID
 * @param {string} token - FCM token (optional, deletes all if not provided)
 * @returns {Promise<object>} - Result of deletion
 */
exports.deleteFcmToken = async (userId, token = null) => {
  try {
    if (!userId) {
      throw new Error('UserId is required');
    }

    if (token) {
      // Delete specific token
      const result = await UserFcmToken.findOneAndUpdate(
        { userId },
        {
          $pull: {
            tokens: { token }
          }
        },
        { new: true }
      );
      console.log(`✅ FCM token deleted for user ${userId}`);
      return { success: true, message: 'Token deleted', data: result };
    } else {
      // Delete all tokens for user on logout
      const result = await UserFcmToken.updateOne(
        { userId },
        {
          $set: { tokens: [] }
        }
      );
      console.log(`✅ All FCM tokens deleted for user ${userId}`);
      return { success: true, message: 'All tokens deleted', data: result };
    }
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to a specific user
 * @param {string} userId - User ID
 * @param {object} notificationData - Notification details
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {object} notificationData.data - Additional data (optional)
 * @param {string} notificationData.imageUrl - Image URL (optional)
 * @returns {Promise<object>} - Response with sent count and details
 */
exports.sendToUser = async (userId, notificationData) => {
  try {
    console.error('\n🔴 [DEBUG-UTIL] ===== sendToUser START =====');
    console.error('🔴 [DEBUG-UTIL] User ID:', userId);
    console.error('🔴 [DEBUG-UTIL] Firebase Initialized:', firebaseInitialized);
    console.error('🔴 [DEBUG-UTIL] Notification Data:', JSON.stringify(notificationData, null, 2));
    
    // Skip if Firebase is not initialized
    if (!firebaseInitialized) {
      console.error(`🔴 [DEBUG-UTIL] ⚠️  Firebase not initialized. Notification for user ${userId} will be skipped.`);
      return {
        success: false,
        sent: 0,
        message: "Firebase not initialized"
      };
    }

    if (!userId) {
      throw new Error("UserId is required");
    }

    if (!notificationData.title || !notificationData.body) {
      throw new Error("Title and body are required");
    }

    console.error('🔴 [DEBUG-UTIL] Querying FCM tokens for user:', userId);
    const userFcmData = await UserFcmToken.findOne({ userId });
    console.error('🔴 [DEBUG-UTIL] User FCM Data Found:', !!userFcmData);
    
    // Extract active tokens from the tokens array
    const tokens = userFcmData && userFcmData.tokens ? userFcmData.tokens.filter(t => t.isActive) : [];
    console.error('🔴 [DEBUG-UTIL] Found', tokens.length, 'active FCM tokens');
    
    if (tokens.length > 0) {
      console.error('🔴 [DEBUG-UTIL] Token Details:');
      tokens.forEach((t, idx) => {
        console.error(`  [${idx}] Token: ${t.token.substring(0, 30)}...`);
        console.error(`  [${idx}] Device Type: ${t.deviceType}`);
        console.error(`  [${idx}] Active: ${t.isActive}`);
      });
    }

    if (!tokens.length) {
      console.error('🔴 [DEBUG-UTIL] ⚠️  No tokens found for user:', userId);
      return {
        success: false,
        sent: 0,
        message: "No tokens found for user"
      };
    }

    const responses = [];
    const errors = [];

    for (const t of tokens) {
      try {
        console.error('\n🔴 [DEBUG-UTIL] Sending to token:', t.token.substring(0, 30) + '...');
        const notification = {
          title: notificationData.title,
          body: notificationData.body
        };

        if (notificationData.imageUrl) {
          notification.imageUrl = notificationData.imageUrl;
        }

        const message = {
          token: t.token,
          notification,
          data: notificationData.data || {},
        };

        console.error('🔴 [DEBUG-UTIL] Message to send:', JSON.stringify({
          token: t.token.substring(0, 30) + '...',
          notification,
          dataKeys: Object.keys(message.data || {})
        }, null, 2));

        // Platform-specific configurations
        if (t.deviceType === "web" && notificationData.imageUrl) {
          message.webpush = {
            notification: {
              title: notificationData.title,
              body: notificationData.body,
              icon: notificationData.imageUrl,
              image: notificationData.imageUrl,
            },
            data: notificationData.data || {},
          };
        }

        if (t.deviceType === "android" && notificationData.imageUrl) {
          message.android = {
            notification: {
              title: notificationData.title,
              body: notificationData.body,
              imageUrl: notificationData.imageUrl,
            },
            data: notificationData.data || {},
          };
        }

        if (t.deviceType === "ios" && notificationData.imageUrl) {
          message.apns = {
            payload: {
              aps: {
                alert: {
                  title: notificationData.title,
                  body: notificationData.body,
                },
              },
            },
            fcmOptions: {
              image: notificationData.imageUrl,
            },
          };
        }

        console.error('🔴 [DEBUG-UTIL] Calling admin.messaging().send()...');
        const response = await admin.messaging().send(message);
        console.error('✅ [DEBUG-UTIL] FCM send successful. Response ID:', response);
        responses.push({ token: t.token, status: "sent", response });
      } catch (error) {
        console.error("🔴 [DEBUG-UTIL] FCM error code:", error.code);
        console.error("🔴 [DEBUG-UTIL] FCM error message:", error.message);
        console.error("🔴 [DEBUG-UTIL] FCM error:", error);

        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          console.error('🔴 [DEBUG-UTIL] Deleting invalid token:', t.token.substring(0, 30) + '...');
          await UserFcmToken.deleteOne({ token: t.token });
        }

        errors.push({ token: t.token, error: error.message });
      }
    }

    console.error('🔴 [DEBUG-UTIL] FCM Batch Summary:');
    console.error('  - Total tokens:', tokens.length);
    console.error('  - Successfully sent:', responses.length);
    console.error('  - Failed:', errors.length);
    console.error('🔴 [DEBUG-UTIL] ===== sendToUser END =====\n');

    return {
      success: true,
      sent: responses.length,
      failed: errors.length,
      responses,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("🔴 [DEBUG-UTIL] Send notification error:", error);
    console.error("🔴 [DEBUG-UTIL] Error stack:", error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send notification to multiple users
 * @param {array} userIds - Array of User IDs
 * @param {object} notificationData - Notification details
 * @returns {Promise<object>} - Response with sent count and details
 */
exports.sendToMultipleUsers = async (userIds, notificationData) => {
  try {
    if (!Array.isArray(userIds) || !userIds.length) {
      throw new Error("UserIds array is required");
    }

    const results = [];

    for (const userId of userIds) {
      const result = await exports.sendToUser(userId, notificationData);
      results.push({ userId, ...result });
    }

    return {
      success: true,
      totalUsers: userIds.length,
      results
    };
  } catch (error) {
    console.error("Send to multiple users error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send templated notification
 * @param {string} userId - User ID
 * @param {string} templateName - Template name from templates object
 * @param {array} templateArgs - Arguments for template function
 * @param {object} additionalData - Additional notification data
 * @returns {Promise<object>} - Response
 */
exports.sendTemplatedNotification = async (userId, templateName, templateArgs = [], additionalData = {}) => {
  try {
    console.error('\n🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====');
    console.error('🔴 [DEBUG-TEMPLATE] User ID:', userId);
    console.error('🔴 [DEBUG-TEMPLATE] Template Name:', templateName);
    console.error('🔴 [DEBUG-TEMPLATE] Template Args:', templateArgs);
    console.error('🔴 [DEBUG-TEMPLATE] Additional Data Keys:', Object.keys(additionalData));
    
    const template = templates[templateName];

    if (!template || typeof template !== "function") {
      console.error('🔴 [DEBUG-TEMPLATE] ❌ Template not found:', templateName);
      console.error('🔴 [DEBUG-TEMPLATE] Available templates:', Object.keys(templates));
      throw new Error(`Template '${templateName}' not found`);
    }

    console.error('🔴 [DEBUG-TEMPLATE] ✅ Template found, calling with args...');
    const templateResult = template(...templateArgs);
    console.error('🔴 [DEBUG-TEMPLATE] Template result:', JSON.stringify(templateResult, null, 2));

    const notificationData = {
      ...templateResult,
      ...additionalData
    };
    
    console.error('🔴 [DEBUG-TEMPLATE] Final notification data:', JSON.stringify(notificationData, null, 2));
    console.error('🔴 [DEBUG-TEMPLATE] Calling sendToUser...');

    const result = await exports.sendToUser(userId, notificationData);
    console.error('🔴 [DEBUG-TEMPLATE] sendToUser result:', JSON.stringify(result, null, 2));
    console.error('🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification END =====\n');
    
    return result;
  } catch (error) {
    console.error("🔴 [DEBUG-TEMPLATE] Send templated notification error:", error);
    console.error("🔴 [DEBUG-TEMPLATE] Error stack:", error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all available templates
 * @returns {object} - All notification templates
 */
exports.getTemplates = () => templates;

/**
 * Send broadcast notification to all users
 * @param {object} notificationData - Notification details
 * @returns {Promise<object>} - Response
 */
exports.sendBroadcast = async (notificationData) => {
  try {
    if (!notificationData.title || !notificationData.body) {
      throw new Error("Title and body are required");
    }

    const allUserFcmData = await UserFcmToken.find();
    
    // Collect all active tokens from all users
    const allTokens = [];
    allUserFcmData.forEach(userFcmData => {
      if (userFcmData.tokens && Array.isArray(userFcmData.tokens)) {
        userFcmData.tokens.forEach(t => {
          if (t.isActive) {
            allTokens.push(t);
          }
        });
      }
    });
    
    if (!allTokens.length) {
      return {
        success: false,
        sent: 0,
        message: "No tokens found"
      };
    }

    const responses = [];
    const errors = [];

    for (const t of allTokens) {
      try {
        const notification = {
          title: notificationData.title,
          body: notificationData.body
        };

        if (notificationData.imageUrl) {
          notification.imageUrl = notificationData.imageUrl;
        }

        const message = {
          token: t.token,
          notification,
          data: notificationData.data || {},
        };

        const response = await admin.messaging().send(message);
        responses.push({ token: t.token, status: "sent" });
      } catch (error) {
        console.error("FCM error:", error.code);

        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          await UserFcmToken.deleteOne({ token: t.token });
        }

        errors.push({ token: t.token, error: error.message });
      }
    }

    return {
      success: true,
      sent: responses.length,
      failed: errors.length,
      totalTokens: allTokens.length
    };
  } catch (error) {
    console.error("Send broadcast error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
