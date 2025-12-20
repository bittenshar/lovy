const express = require('express');
const controller = require('./conversation.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// FCM Health Check endpoint - must be before /:conversationId to avoid pattern matching
router.get('/fcm-check/:userId', controller.fcmHealthCheck);

router.get('/', controller.listConversations);
router.post('/', controller.createConversation);
router.get('/:conversationId/messages', controller.listMessages);
router.post('/:conversationId/messages', controller.sendMessage);
router.patch('/:conversationId/read', controller.markConversationRead);

module.exports = router;
