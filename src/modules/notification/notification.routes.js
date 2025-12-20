const express = require("express");
const {
  sendNotification,
  sendBatch,
} = require("./notification.controller");
const { protect } = require("../../shared/middlewares/auth.middleware");

const router = express.Router();

// All notification endpoints require authentication
router.use(protect);

router.post("/send", sendNotification);
router.post("/send-batch", sendBatch);

module.exports = router;
