const express = require("express");
const {
  registerToken,
  sendNotification,
  sendBatch,
  deleteToken,
} = require("./notification.controller");

const router = express.Router();

router.post("/register-token", registerToken);

router.post("/send", sendNotification);
router.post("/send-batch", sendBatch);
router.delete("/delete-token",  deleteToken);

module.exports = router;
