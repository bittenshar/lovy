/**
 * Notification Controller
 * Handles notification-related API endpoints
 */

const firebaseService = require('../services/firebase-notification.service');

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
 * In-memory storage for FCM tokens (use MongoDB in production)
 */
const userTokens = new Map(); // Map<userId, Set<token>>

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
    const userId = req.user?.id || req.user?._id || 'guest';

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

    // Store token in memory (production: save to MongoDB)
    if (!userTokens.has(userId)) {
      userTokens.set(userId, new Set());
    }
    userTokens.get(userId).add(fcmToken);

    console.log(`✅ [FCM] Token registered for user ${userId}`);
    console.log(`   📊 Total devices for user: ${userTokens.get(userId).size}`);

    return res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        userId,
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
    const userId = req.user?.id || req.user?._id || 'guest';

    console.log(`🔍 [FCM] Fetching tokens for user: ${userId}`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const tokens = userTokens.get(userId);
    const tokenArray = tokens ? Array.from(tokens) : [];

    console.log(`✅ [FCM] Found ${tokenArray.length} token(s) for user ${userId}`);

    return res.json({
      success: true,
      data: {
        userId,
        tokenCount: tokenArray.length,
        tokens: tokenArray.map((token, idx) => ({
          index: idx + 1,
          token: `${token.substring(0, 40)}...${token.substring(token.length - 10)}`,
          fullToken: token,
        })),
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
    const userId = req.user?.id || req.user?._id || 'guest';

    console.log(`🗑️  [FCM] Unregister Token Request`);
    console.log(`   👤 User ID: ${userId}`);
    console.log(`   🔑 Token: ${fcmToken ? fcmToken.substring(0, 40) + '...' : 'all tokens'}`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const userTokenSet = userTokens.get(userId);

    if (!userTokenSet || userTokenSet.size === 0) {
      console.warn(`⚠️  [FCM] No tokens found for user ${userId}`);
      return res.json({
        success: true,
        message: 'No tokens to remove',
        data: { tokensRemoved: 0 },
      });
    }

    if (fcmToken) {
      // Remove specific token
      const removed = userTokenSet.delete(fcmToken);
      if (removed) {
        console.log(`✅ [FCM] Token removed for user ${userId}`);
        console.log(`   📊 Remaining devices: ${userTokenSet.size}`);
      } else {
        console.warn(`⚠️  [FCM] Token not found for user ${userId}`);
      }

      return res.json({
        success: true,
        message: 'Token removed successfully',
        data: { tokensRemoved: removed ? 1 : 0 },
      });
    } else {
      // Remove all tokens
      const count = userTokenSet.size;
      userTokenSet.clear();
      console.log(`✅ [FCM] All ${count} token(s) removed for user ${userId}`);

      return res.json({
        success: true,
        message: 'All tokens removed successfully',
        data: { tokensRemoved: count },
      });
    }
  } catch (error) {
    console.error('❌ [FCM] Error unregistering token:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to unregister FCM token',
    });
  }
};
