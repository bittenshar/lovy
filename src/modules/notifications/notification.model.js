const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      enum: [
        'application',
        'application_update',
        'application_received',
        'application_approved',
        'application_rejected',
        'application_shortlisted',
        'application_completed',
        'application_hired',
        'hire',
        'payment',
        'payment_received',
        'payment_pending',
        'payment_completed',
        'schedule',
        'shift_reminder',
        'shift_start',
        'shift_end',
        'message',
        'new_message',
        'system',
        'team_invite',
        'team_update',
        'attendance',
        'job_posted',
        'job_update'
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String },
    metadata: { type: Object, default: () => ({}) },
    readAt: Date
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

notificationSchema.virtual('isRead').get(function () {
  return Boolean(this.readAt);
});

notificationSchema.virtual('body')
  .get(function () {
    return this.message;
  })
  .set(function (value) {
    this.message = value;
  });

module.exports = mongoose.model('Notification', notificationSchema);
