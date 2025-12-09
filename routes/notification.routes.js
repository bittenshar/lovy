const express = require('express');
const router = express.Router();
const FCMToken = require('../models/fcmToken');
const firebaseNotificationService = require('../services/firebaseNotificationService');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Health Check - Verify Firebase is initialized
 */
router.get('/health', (req, res) => {
  try {
    const isInitialized = firebaseNotificationService.isInitialized();
    res.status(200).json({
      success: true,
      message: isInitialized ? 'Firebase is initialized and ready' : 'Firebase not initialized',
      firebaseInitialized: isInitialized,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking Firebase status',
      error: error.message,
    });
  }
});

/**
 * Register/Save FCM Token
 */
router.post('/register-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, platform = 'android', deviceId, deviceName } = req.body;
    const userId = req.user.id;

    if (!fcmToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken and deviceId are required',
      });
    }

    // Upsert FCM token
    const fcmTokenDoc = await FCMToken.findOneAndUpdate(
      { userId, fcmToken, deviceId },
      {
        userId,
        fcmToken,
        platform,
        deviceId,
        deviceName,
        isActive: true,
        lastUsed: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        tokenId: fcmTokenDoc._id,
        fcmToken: fcmTokenDoc.fcmToken,
        platform: fcmTokenDoc.platform,
        deviceId: fcmTokenDoc.deviceId,
      },
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering FCM token',
      error: error.message,
    });
  }
});

/**
 * Get all FCM tokens for user
 */
router.get('/tokens', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const tokens = await FCMToken.find({
      userId,
      isActive: true,
    }).select('fcmToken platform deviceId deviceName lastUsed topics');

    res.status(200).json({
      success: true,
      message: `Found ${tokens.length} active tokens`,
      data: tokens,
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tokens',
      error: error.message,
    });
  }
});

/**
 * Send notification to single device
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, title, body, data = {} } = req.body;

    if (!fcmToken || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken, title, and body are required',
      });
    }

    const result = await firebaseNotificationService.sendToDevice(fcmToken, title, body, data);

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message,
    });
  }
});

/**
 * Send batch notifications to multiple devices
 */
router.post('/send-batch', authMiddleware, async (req, res) => {
  try {
    const { fcmTokens, title, body, data = {} } = req.body;

    if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'fcmTokens (array), title, and body are required',
      });
    }

    const result = await firebaseNotificationService.sendToMultipleDevices(fcmTokens, title, body, data);

    res.status(200).json({
      success: true,
      message: 'Batch notifications sent',
      data: result,
    });
  } catch (error) {
    console.error('Error sending batch notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending batch notifications',
      error: error.message,
    });
  }
});

/**
 * Send notification by User ID (backend fetches token from DB)
 */
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { userId, title, body, data = {} } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and body are required',
      });
    }

    // Get user's active FCM tokens
    const fcmTokens = await FCMToken.find({
      userId,
      isActive: true,
    }).select('fcmToken');

    if (!fcmTokens || fcmTokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active FCM tokens found for this user',
      });
    }

    // Send to all user's devices
    const tokenArray = fcmTokens.map((t) => t.fcmToken);
    const result = await firebaseNotificationService.sendToMultipleDevices(tokenArray, title, body, data);

    res.status(200).json({
      success: true,
      message: `Notification sent to ${tokenArray.length} device(s)`,
      data: result,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: error.message,
    });
  }
});

/**
 * Send notification to topic
 */
router.post('/send-to-topic', authMiddleware, async (req, res) => {
  try {
    const { topic, title, body, data = {} } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'topic, title, and body are required',
      });
    }

    const result = await firebaseNotificationService.sendToTopic(topic, title, body, data);

    res.status(200).json({
      success: true,
      message: 'Topic notification sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error sending to topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending to topic',
      error: error.message,
    });
  }
});

/**
 * Subscribe to topic
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken and topic are required',
      });
    }

    const result = await firebaseNotificationService.subscribeToTopic(fcmToken, topic);

    // Update token document to track subscribed topics
    await FCMToken.updateOne({ fcmToken }, { $addToSet: { topics: topic } });

    res.status(200).json({
      success: true,
      message: `Successfully subscribed to topic: ${topic}`,
      data: result,
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to topic',
      error: error.message,
    });
  }
});

/**
 * Unsubscribe from topic
 */
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken and topic are required',
      });
    }

    const result = await firebaseNotificationService.unsubscribeFromTopic(fcmToken, topic);

    // Update token document to remove topic
    await FCMToken.updateOne({ fcmToken }, { $pull: { topics: topic } });

    res.status(200).json({
      success: true,
      message: `Successfully unsubscribed from topic: ${topic}`,
      data: result,
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from topic',
      error: error.message,
    });
  }
});

module.exports = router;
