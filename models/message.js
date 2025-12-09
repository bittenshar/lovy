const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: String,
    senderImage: String,
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    image: String,
    file: {
      filename: String,
      url: String,
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: Date,
    deletedFor: [mongoose.Schema.Types.ObjectId], // Users who deleted this message
  },
  { timestamps: true }
);

// Index for fast queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);
