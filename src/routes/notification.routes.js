/**
 * Notification Routes
 * Handles all notification-related endpoints
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

/**
 * Health check
 * GET /api/notifications/health
 */
router.get('/health', notificationController.healthCheck);

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

module.exports = router;
