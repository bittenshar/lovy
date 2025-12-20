const express = require('express');
const controller = require('./conversation.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', controller.listConversations);
router.post('/', controller.createConversation);
router.get('/:conversationId/messages', controller.listMessages);
router.post('/:conversationId/messages', controller.sendMessage);
router.patch('/:conversationId/read', controller.markConversationRead);

// FCM Health Check endpoint
router.get('/fcm-check/:userId', controller.fcmHealthCheck);

module.exports = router;
