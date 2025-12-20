const mongoose = require("mongoose");

const userFcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
        deviceType: {
          type: String,
          enum: ["android", "ios", "web"],
          default: "web",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserFcmToken", userFcmTokenSchema);
