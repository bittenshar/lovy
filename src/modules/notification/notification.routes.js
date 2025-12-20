const express = require("express");
const {
  registerToken,
  sendNotification,
  sendBatch,
  deleteToken,
} = require("./notification.controller");
const { protect } = require("../../shared/middlewares/auth.middleware");

const router = express.Router();

// All notification endpoints require authentication
router.use(protect);

router.post("/register-token", registerToken);
router.post("/send", sendNotification);
router.post("/send-batch", sendBatch);
router.delete("/delete-token", deleteToken);

module.exports = router;
