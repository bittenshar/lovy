/**
 * Notification Controller
 * Handles notification-related API endpoints
 */

const firebaseService = require('../services/firebase-notification.service');
const { sendNotificationToUser, sendBulkNotifications } = require('../services/fcm-helper.service');
const User = require('../modules/users/user.model');

/**
 * Send notification to a single device
 * POST /api/notifications/send
 * Body: {
 *   fcmToken: string,
 *   title: string,
 *   body: string,
 *   data?: object
 * }
 */
exports.sendNotification = async (req, res) => {
  try {
    const { fcmToken, title, body, data } = req.body;

    // Validation
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required',
      });
    }

    const payload = {
      title,
      body,
      data: data || {},
    };

    const response = await firebaseService.sendToDevice(fcmToken, payload);

    return res.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: response,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send notification',
    });
  }
};

/**
 * Send notification to multiple devices
 * POST /api/notifications/send-batch
 * Body: {
 *   fcmTokens: string[],
 *   title: string,
 *   body: string,
 *   data?: object
 * }
 */
exports.sendBatchNotification = async (req, res) => {
  try {
    const { fcmTokens, title, body, data } = req.body;

    // Validation
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'FCM tokens array is required and must not be empty',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required',
      });
    }

    const payload = {
      title,
      body,
      data: data || {},
    };

    const response = await firebaseService.sendToDevices(fcmTokens, payload);

    return res.json({
      success: true,
      message: `Sent to ${response.successCount} devices, ${response.failureCount} failed`,
      response,
    });
  } catch (error) {
    console.error('Error sending batch notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send batch notifications',
    });
  }
};

/**
 * Send notification to topic
 * POST /api/notifications/send-topic
 * Body: {
 *   topic: string,
 *   title: string,
 *   body: string,
 *   data?: object
 * }
 */
exports.sendTopicNotification = async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    // Validation
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required',
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required',
      });
    }

    const payload = {
      title,
      body,
      data: data || {},
    };

    const response = await firebaseService.sendToTopic(topic, payload);

    return res.json({
      success: true,
      message: 'Topic notification sent successfully',
      messageId: response,
    });
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send topic notification',
    });
  }
};

/**
 * Subscribe device to topic
 * POST /api/notifications/subscribe
 * Body: {
 *   fcmToken: string,
 *   topic: string
 * }
 */
exports.subscribeToTopic = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'FCM token and topic are required',
      });
    }

    await firebaseService.subscribeToTopic(fcmToken, topic);

    return res.json({
      success: true,
      message: `Successfully subscribed to topic: ${topic}`,
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to subscribe to topic',
    });
  }
};

/**
 * Unsubscribe device from topic
 * POST /api/notifications/unsubscribe
 * Body: {
 *   fcmToken: string,
 *   topic: string
 * }
 */
exports.unsubscribeFromTopic = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'FCM token and topic are required',
      });
    }

    await firebaseService.unsubscribeFromTopic(fcmToken, topic);

    return res.json({
      success: true,
      message: `Successfully unsubscribed from topic: ${topic}`,
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to unsubscribe from topic',
    });
  }
};

/**
 * Health check endpoint to verify Firebase is initialized
 * GET /api/notifications/health
 */
exports.healthCheck = async (req, res) => {
  try {
    const initialized = firebaseService.initialized;

    return res.json({
      success: true,
      firebase: {
        initialized,
        status: initialized ? 'Ready' : 'Not initialized',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Test sending notification to a user
 * POST /api/notifications/test
 * Body: {
 *   userId: string,
 *   title?: string,
 *   body?: string
 * }
 */
exports.testNotification = async (req, res) => {
  try {
    const { userId, title = 'Test Notification', body = 'This is a test notification from the backend' } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    console.log(`🧪 [TEST] Sending test notification to user ${userId}`);

    const result = await sendNotificationToUser(userId, title, body, {
      test: 'true',
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Test notification sent',
      data: result,
    });
  } catch (error) {
    console.error('❌ Error sending test notification:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test notification',
    });
  }
};

/**
 * Register FCM token for user device
 * POST /api/notifications/register-token
 * Body: {
 *   fcmToken: string,
 *   platform: 'ios' | 'android',
 *   deviceId?: string
 * }
 * Headers: Authorization: Bearer <token>
 */
exports.registerFCMToken = async (req, res) => {
  try {
    const { fcmToken, platform, deviceId } = req.body;
    const userId = req.user?.id || req.user?._id;

    console.log('🔔 [FCM] Register Token Request');
    console.log(`   📱 Platform: ${platform}`);
    console.log(`   👤 User ID: ${userId}`);
    console.log(`   🔑 Token: ${fcmToken?.substring(0, 40)}...`);
    console.log(`   📲 Device ID: ${deviceId || 'not provided'}`);

    // Validation
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
      console.warn('⚠️  [FCM] Invalid FCM token provided');
      return res.status(400).json({
        success: false,
        message: 'Valid FCM token is required',
      });
    }

    if (!userId) {
      console.warn('⚠️  [FCM] User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    // Get existing user first
    const user = await User.findById(userId);
    if (!user) {
      console.warn('⚠️  [FCM] User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if this token already exists
    const tokenString = fcmToken.trim();
    const existingTokenIndex = user.fcmTokens.findIndex(t => t.token === tokenString);

    if (existingTokenIndex !== -1) {
      // Update existing token
      console.log('🔔 [FCM] Token already exists, updating...');
      user.fcmTokens[existingTokenIndex] = {
        token: tokenString,
        platform: platform || 'android',
        active: true,
        updatedAt: new Date()
      };
    } else {
      // Add new token
      console.log('🔔 [FCM] Adding new token to user');
      user.fcmTokens.push({
        token: tokenString,
        platform: platform || 'android',
        active: true,
        updatedAt: new Date()
      });
    }

    // Save updated user
    await user.save();
    console.log(`✅ [FCM] Token registered for user ${userId}`);
    console.log(`   📊 User: ${user.email}`);
    console.log(`   ⏰ Updated at: ${new Date().toISOString()}`);
    console.log(`   📍 Total tokens for user: ${user.fcmTokens.length}`);

    return res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        userId,
        email: user.email,
        platform,
        deviceId,
        tokenRegistered: true,
      },
    });
  } catch (error) {
    console.error('❌ [FCM] Error registering token:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register FCM token',
    });
  }
};

/**
 * Get registered tokens for user
 * GET /api/notifications/tokens
 * Headers: Authorization: Bearer <token>
 */
exports.getUserTokens = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    console.log(`🔍 [FCM] Fetching tokens for user: ${userId}`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const user = await User.findById(userId).select('email fcmTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(`✅ [FCM] Found ${user.fcmTokens?.length || 0} token(s) for user ${userId}`);

    const tokens = (user.fcmTokens || []).map(t => ({
      token: t.token ? `${t.token.substring(0, 40)}...${t.token.substring(t.token.length - 10)}` : null,
      platform: t.platform || 'unknown',
      active: t.active !== false,
      updatedAt: t.updatedAt
    }));

    return res.json({
      success: true,
      data: {
        userId,
        email: user.email,
        tokenCount: tokens.length,
        tokens: tokens,
      },
    });
  } catch (error) {
    console.error('❌ [FCM] Error fetching tokens:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch tokens',
    });
  }
};

/**
 * Unregister FCM token (logout/remove device)
 * DELETE /api/notifications/register-token
 * Body: {
 *   fcmToken?: string (if not provided, removes all tokens for user)
 * }
 * Headers: Authorization: Bearer <token>
 */
exports.unregisterFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user?.id || req.user?._id;

    console.log(`🗑️  [FCM] Unregister Token Request`);
    console.log(`   👤 User ID: ${userId}`);
    console.log(`   🔑 Token: ${fcmToken ? fcmToken.substring(0, 40) + '...' : 'removing all'}`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let tokensRemoved = 0;

    if (fcmToken) {
      // Remove specific token
      const tokenString = fcmToken.trim();
      const initialLength = user.fcmTokens?.length || 0;
      user.fcmTokens = (user.fcmTokens || []).filter(t => t.token !== tokenString);
      tokensRemoved = initialLength - (user.fcmTokens?.length || 0);
      console.log(`🗑️  [FCM] Removed ${tokensRemoved} specific token(s)`);
    } else {
      // Remove all tokens
      tokensRemoved = user.fcmTokens?.length || 0;
      user.fcmTokens = [];
      console.log(`🗑️  [FCM] Removed all ${tokensRemoved} token(s)`);
    }

    if (tokensRemoved === 0) {
      console.warn(`⚠️  [FCM] No matching token found for user ${userId}`);
      return res.json({
        success: true,
        message: 'No matching token to remove',
        data: { tokensRemoved: 0 },
      });
    }

    await user.save();
    console.log(`✅ [FCM] ${tokensRemoved} token(s) removed for user ${userId}`);

    return res.json({
      success: true,
      message: `${tokensRemoved} token(s) removed successfully`,
      data: { tokensRemoved },
    });
  } catch (error) {
    console.error('❌ [FCM] Error unregistering token:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to unregister FCM token',
    });
  }
};
