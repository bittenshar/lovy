/**
 * Notification Routes
 * Handles all notification-related endpoints
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../shared/middlewares/auth.middleware');

/**
 * Health check (PUBLIC - no auth required)
 * GET /api/notifications/health
 */
router.get('/health', notificationController.healthCheck);

/**
 * Protect all other notification endpoints
 */
router.use(protect);

/**
 * Send notification to single device
 * POST /api/notifications/send
 */
router.post('/send', notificationController.sendNotification);

/**
 * Send notification to multiple devices
 * POST /api/notifications/send-batch
 */
router.post('/send-batch', notificationController.sendBatchNotification);

/**
 * Send notification to topic
 * POST /api/notifications/send-topic
 */
router.post('/send-topic', notificationController.sendTopicNotification);

/**
 * Subscribe device to topic
 * POST /api/notifications/subscribe
 */
router.post('/subscribe', notificationController.subscribeToTopic);

/**
 * Unsubscribe device from topic
 * POST /api/notifications/unsubscribe
 */
router.post('/unsubscribe', notificationController.unsubscribeFromTopic);

/**
 * Register FCM token for user device
 * POST /api/notifications/register-token
 */
router.post('/register-token', notificationController.registerFCMToken);

/**
 * Get registered tokens for user
 * GET /api/notifications/tokens
 */
router.get('/tokens', notificationController.getUserTokens);

/**
 * Remove FCM token
 * DELETE /api/notifications/register-token
 */
router.delete('/register-token', notificationController.unregisterFCMToken);

module.exports = router;
