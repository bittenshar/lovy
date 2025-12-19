const admin = require("./config/firebase");
const UserFcmToken = require("./UserFcmToken.model");
const templates = require("./constant/templetes");

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
    if (!userId) {
      throw new Error("UserId is required");
    }

    if (!notificationData.title || !notificationData.body) {
      throw new Error("Title and body are required");
    }

    const tokens = await UserFcmToken.find({ userId });

    if (!tokens.length) {
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

        const response = await admin.messaging().send(message);
        responses.push({ token: t.token, status: "sent", response });
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
      responses,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error("Send notification error:", error);
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
    const template = templates[templateName];

    if (!template || typeof template !== "function") {
      throw new Error(`Template '${templateName}' not found`);
    }

    const notificationData = {
      ...template(...templateArgs),
      ...additionalData
    };

    return await exports.sendToUser(userId, notificationData);
  } catch (error) {
    console.error("Send templated notification error:", error);
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

    const tokens = await UserFcmToken.find().select("token deviceType");

    if (!tokens.length) {
      return {
        success: false,
        sent: 0,
        message: "No tokens found"
      };
    }

    const responses = [];
    const errors = [];

    for (const t of tokens) {
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
      totalTokens: tokens.length
    };
  } catch (error) {
    console.error("Send broadcast error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
