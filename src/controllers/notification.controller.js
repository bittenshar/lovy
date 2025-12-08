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
