const express = require('express');
const controller = require('./auth.controller');
const fcmTokenController = require('./fcm-token.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.me);
router.get('/permissions', protect, controller.getUserPermissions);
router.get('/team-member', protect, controller.getUserTeamMemberInfo);
router.post('/refresh-token', controller.refreshToken);

// FCM Token management routes
router.post('/save-fcm-token', protect, fcmTokenController.saveFcmToken);
router.get('/fcm-token', protect, fcmTokenController.getFcmToken);
router.post('/delete-fcm-token', protect, fcmTokenController.deleteFcmToken);

module.exports = router;
