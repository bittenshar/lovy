const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    type: {
      type: String,
      enum: ['message', 'order', 'alert', 'update', 'other'],
      default: 'other'
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    relatedId: {
      type: String,
      default: null
    },
    imageUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
