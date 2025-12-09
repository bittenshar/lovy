const express = require('express');
const controller = require('./notification.controller');
const pushController = require('./notification.push.controller');
const fcmController = require('../../controllers/notification.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Health check - NO AUTH required
router.get('/health', fcmController.healthCheck);

// All other routes require authentication
router.use(protect);

// FCM notification endpoints
router.post('/send', fcmController.sendNotification);
router.post('/send-batch', fcmController.sendBatchNotification);
router.post('/register-token', fcmController.registerFCMToken);
router.get('/tokens', fcmController.getUserTokens);
router.post('/test', fcmController.testNotification);
router.post('/send-to-topic', fcmController.sendTopicNotification);
router.post('/subscribe', fcmController.subscribeToTopic);
router.post('/unsubscribe', fcmController.unsubscribeFromTopic);

// Notification management
router.get('/', controller.listNotifications);
router.post('/', requirePermissions(['send_notifications']), controller.createNotification);
router.patch('/:notificationId/read', controller.markRead);

// FCM token management
router.post('/register-fcm-token', pushController.registerFcmToken);
router.get('/fcm-token', pushController.getFcmTokenInfo);

// Test endpoint
router.post('/test-send', pushController.testSendNotification);

module.exports = router;

