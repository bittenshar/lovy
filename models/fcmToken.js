const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fcmToken: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    deviceId: {
      type: String,
      required: true,
    },
    deviceName: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    topics: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Ensure unique combination of userId, fcmToken, and deviceId
fcmTokenSchema.index({ userId: 1, fcmToken: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('FCMToken', fcmTokenSchema);
