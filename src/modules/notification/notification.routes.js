const express = require("express");
const {
  sendNotification,
  sendBatch,
  registerToken,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} = require("./notification.controller");
const { protect } = require("../../shared/middlewares/auth.middleware");

const router = express.Router();

// All notification endpoints require authentication
router.use(protect);

// GET notifications
router.get("/", getNotifications);

// POST endpoints
router.post("/send", sendNotification);
router.post("/send-batch", sendBatch);
router.post("/register-token", registerToken);

// PATCH endpoints
router.patch("/:notificationId/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);

// DELETE endpoints
router.delete("/:notificationId", deleteNotification);

module.exports = router;
