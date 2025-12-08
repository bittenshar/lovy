const express = require('express');
const controller = require('./notification.controller');
const pushController = require('./notification.push.controller');
const onesignalController = require('./notification.onesignal.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listNotifications);
router.post('/', requirePermissions(['send_notifications']), controller.createNotification);
router.patch('/:notificationId/read', controller.markRead);

// Push notification endpoints (FCM)
router.post('/register-token', pushController.registerFCMToken);
router.delete('/register-token', pushController.unregisterFCMToken);
router.post('/test', pushController.sendTestNotification);

// OneSignal endpoints
router.post('/onesignal/register', onesignalController.registerOneSignalId);
router.delete('/onesignal/unregister', onesignalController.unregisterOneSignalId);
router.get('/onesignal/status', onesignalController.getUserOneSignalStatus);
router.post('/onesignal/send-user', onesignalController.sendPushNotificationToUsers);
router.post('/onesignal/send', requirePermissions(['send_notifications']), onesignalController.sendPushNotification);
router.post('/onesignal/send-to-workers', requirePermissions(['send_notifications']), onesignalController.sendToAllWorkers);
router.post('/onesignal/send-to-employers', requirePermissions(['send_notifications']), onesignalController.sendToAllEmployers);
router.post('/onesignal/test', onesignalController.sendTestPushNotification);
router.post('/onesignal/schedule', requirePermissions(['send_notifications']), onesignalController.scheduleNotification);
router.get('/onesignal/:notificationId/status', onesignalController.getNotificationStatus);

module.exports = router;
