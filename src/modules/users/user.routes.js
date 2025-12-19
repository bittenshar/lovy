const express = require('express');
const controller = require('./user.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listUsers);
router.get('/me', controller.getMe);
router.patch('/me', controller.updateMe);
router.post('/fcm-token', controller.addFcmToken);
router.delete('/fcm-token', controller.removeFcmToken);
router.get('/:userId', controller.getUser);

module.exports = router;
