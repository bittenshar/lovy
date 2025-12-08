/**
 * Notification Triggers Service
 * Helper functions to send notifications for specific application events
 */

const { createNotification, sendBulkPushNotification } = require('../modules/notifications/notification.service');
const firebaseService = require('./firebase-notification.service');
const User = require('../modules/users/user.model');

/**
 * Helper function to send Firebase push notification to a user
 * @param {Object} user - User object with fcmToken
 * @param {Object} payload - Notification payload {title, body, data}
 */
const sendFirebasePush = async (user, payload) => {
  try {
    if (user && user.fcmToken) {
      // Ensure all data values are strings for Firebase
      const firebaseData = {};
      if (payload.data) {
        Object.keys(payload.data).forEach(key => {
          const value = payload.data[key];
          if (value !== null && value !== undefined) {
            firebaseData[key] = typeof value === 'object' ? JSON.stringify(value) : value.toString();
          }
        });
      }
      
      await firebaseService.sendToDevice(user.fcmToken, {
        title: payload.title,
        body: payload.body,
        data: firebaseData
      });
    }
  } catch (error) {
    console.error(`Failed to send Firebase notification to user ${user._id}:`, error.message);
  }
};

/**
 * Send notification when a new job is posted
 * @param {Object} job - Job object
 * @param {Object} employer - Employer user object
 * @param {Array} targetWorkerIds - Worker IDs to notify (optional, for targeted notifications)
 */
const notifyNewJobPosted = async (job, employer, targetWorkerIds = []) => {
  try {
    const message = `New job: ${job.title} - $${job.hourlyRate}/hr`;
    
    // Create in-app notification
    if (targetWorkerIds && targetWorkerIds.length > 0) {
      // Send to specific workers
      for (const workerId of targetWorkerIds) {
        await createNotification({
          recipientId: workerId,
          senderId: employer._id,
          type: 'job_posted',
          priority: 'high',
          title: '🎯 New Job Available',
          message,
          actionUrl: `/jobs/${job._id}`,
          metadata: {
            jobId: job._id.toString(),
            jobTitle: job.title,
            hourlyRate: job.hourlyRate,
            location: job.location
          }
        });
      }
    }
    
    // Broadcast to all workers (create notification in DB + send Firebase bulk push)
    const allWorkers = await User.find({ userType: 'worker' }).select('_id fcmToken');
    if (allWorkers.length > 0) {
      // Send in-app notifications for all workers
      for (const worker of allWorkers) {
        createNotification({
          recipientId: worker._id,
          senderId: employer._id,
          type: 'job_posted',
          priority: 'high',
          title: '🎯 New Job Available',
          message,
          actionUrl: `/jobs/${job._id}`,
          metadata: {
            jobId: job._id.toString(),
            jobTitle: job.title,
            hourlyRate: job.hourlyRate,
            location: job.location
          }
        }).catch(err => console.error('Failed to create in-app notification:', err));
      }

      // Send Firebase push notifications
      await sendBulkPushNotification(
        allWorkers.map(w => w._id),
        {
          title: '🎯 New Job Available',
          message,
          type: 'job_posted',
          priority: 'high',
          actionUrl: `/jobs/${job._id}`,
          data: {
            jobId: job._id.toString(),
            jobTitle: job.title,
            hourlyRate: job.hourlyRate,
            location: job.location
          }
        }
      );
    }
    
    console.log(`✅ Job posted notification sent for job: ${job.title}`);
  } catch (error) {
    console.error('Error notifying new job posted:', error.message);
  }
};

/**
 * Send notification when an application is received
 * @param {Object} application - Application object
 * @param {Object} job - Job object
 * @param {Object} worker - Worker user object
 * @param {Object} employer - Employer user object
 */
const notifyApplicationReceived = async (application, job, worker, employer) => {
  try {
    const message = `New application from ${worker.firstName || 'a worker'} for ${job.title}`;
    
    // Create in-app notification for employer
    await createNotification({
      recipientId: employer._id,
      senderId: worker._id,
      type: 'application_received',
      priority: 'high',
      title: '📄 New Application',
      message,
      actionUrl: `/applications/${application._id}`,
      metadata: {
        applicationId: application._id.toString(),
        jobId: job._id.toString(),
        workerId: worker._id.toString(),
        workerName: `${worker.firstName} ${worker.lastName}`.trim()
      }
    });

    // Send Firebase push notification to employer
    const employerData = await User.findById(employer._id);
    await sendFirebasePush(employerData, {
      title: '📄 New Application',
      body: message,
      data: {
        type: 'application_received',
        priority: 'high',
        applicationId: application._id.toString(),
        jobId: job._id.toString(),
        workerId: worker._id.toString(),
        actionUrl: `/applications/${application._id}`
      }
    });
    
    console.log(`✅ Application received notification sent to employer ${employer._id}`);
  } catch (error) {
    console.error('Error notifying application received:', error.message);
  }
};

/**
 * Send notification when application status changes
 * @param {Object} application - Application object
 * @param {string} status - New status
 * @param {Object} worker - Worker user object
 * @param {Object} job - Job object
 */
const notifyApplicationStatusChanged = async (application, status, worker, job) => {
  try {
    const statusMessages = {
      approved: '✅ Application Approved! You got the job!',
      rejected: '❌ Application Rejected',
      shortlisted: '⭐ You\'ve been shortlisted!',
      completed: '✔️ Job Completed'
    };
    
    const message = statusMessages[status] || `Application status updated to ${status}`;
    
    // Create in-app notification for worker
    await createNotification({
      recipientId: worker._id,
      type: `application_${status}`,
      priority: status === 'approved' ? 'high' : 'medium',
      title: 'Application Update',
      message,
      actionUrl: `/applications/${application._id}`,
      metadata: {
        applicationId: application._id.toString(),
        jobId: job._id.toString(),
        status,
        jobTitle: job.title
      }
    });

    // Send Firebase push notification to worker
    const workerData = await User.findById(worker._id);
    await sendFirebasePush(workerData, {
      title: 'Application Update',
      body: message,
      data: {
        type: `application_${status}`,
        priority: status === 'approved' ? 'high' : 'medium',
        applicationId: application._id.toString(),
        jobId: job._id.toString(),
        status,
        actionUrl: `/applications/${application._id}`
      }
    });
    
    console.log(`✅ Application status notification sent to worker ${worker._id}: ${status}`);
  } catch (error) {
    console.error('Error notifying application status changed:', error.message);
  }
};

/**
 * Send shift/attendance reminder notification
 * @param {Object} worker - Worker user object
 * @param {Object} shift - Shift object
 * @param {string} type - 'reminder' | 'start' | 'end'
 */
const notifyShiftReminder = async (worker, shift, type = 'reminder') => {
  try {
    const reminderMessages = {
      reminder: `📌 Reminder: Your shift starts at ${shift.startTime}`,
      start: '🎬 Your shift is starting now!',
      end: '🏁 Your shift has ended. Remember to mark attendance.'
    };
    
    const message = reminderMessages[type] || reminderMessages.reminder;
    
    // Create in-app notification
    await createNotification({
      recipientId: worker._id,
      type: `shift_${type}`,
      priority: 'high',
      title: 'Shift Notification',
      message,
      actionUrl: '/my-shifts',
      metadata: {
        shiftId: shift._id?.toString() || '',
        type,
        startTime: shift.startTime,
        endTime: shift.endTime
      }
    });

    // Send Firebase push notification
    const workerData = await User.findById(worker._id);
    await sendFirebasePush(workerData, {
      title: 'Shift Notification',
      body: message,
      data: {
        type: `shift_${type}`,
        shiftId: shift._id?.toString() || '',
        startTime: shift.startTime,
        endTime: shift.endTime,
        actionUrl: '/my-shifts'
      }
    });
    
    console.log(`✅ Shift ${type} notification sent to worker ${worker._id}`);
  } catch (error) {
    console.error(`Error notifying shift ${type}:`, error.message);
  }
};

/**
 * Send payment/payment notification
 * @param {Object} user - User object
 * @param {Object} payment - Payment object
 * @param {string} type - 'received' | 'pending' | 'completed'
 */
const notifyPaymentUpdate = async (user, payment, type = 'received') => {
  try {
    const paymentMessages = {
      received: `💰 Payment received: $${payment.amount}`,
      pending: `⏳ Payment pending: $${payment.amount}`,
      completed: `✅ Payment completed: $${payment.amount}`
    };
    
    const message = paymentMessages[type] || paymentMessages.received;
    
    // Create in-app notification
    await createNotification({
      recipientId: user._id,
      type: `payment_${type}`,
      priority: 'high',
      title: 'Payment Update',
      message,
      actionUrl: '/payments',
      metadata: {
        paymentId: payment._id?.toString() || '',
        amount: payment.amount,
        type,
        date: payment.date || new Date()
      }
    });

    // Send Firebase push notification
    const userData = await User.findById(user._id);
    await sendFirebasePush(userData, {
      title: 'Payment Update',
      body: message,
      data: {
        type: `payment_${type}`,
        amount: payment.amount.toString(),
        paymentId: payment._id?.toString() || '',
        actionUrl: '/payments'
      }
    });
    
    console.log(`✅ Payment ${type} notification sent to user ${user._id}`);
  } catch (error) {
    console.error(`Error notifying payment ${type}:`, error.message);
  }
};

/**
 * Send message notification
 * @param {Object} recipient - Recipient user object
 * @param {Object} sender - Sender user object
 * @param {string} message - Message preview
 */
const notifyNewMessage = async (recipient, sender, message) => {
  try {
    const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;
    const title = `💬 ${sender.firstName || 'Someone'} sent you a message`;
    
    // Create in-app notification
    await createNotification({
      recipientId: recipient._id,
      senderId: sender._id,
      type: 'new_message',
      priority: 'medium',
      title,
      message: preview,
      actionUrl: `/messages/${sender._id}`,
      metadata: {
        senderId: sender._id.toString(),
        senderName: `${sender.firstName} ${sender.lastName}`.trim()
      }
    });

    // Send Firebase push notification
    const recipientData = await User.findById(recipient._id);
    await sendFirebasePush(recipientData, {
      title,
      body: preview,
      data: {
        type: 'new_message',
        senderId: sender._id.toString(),
        senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        actionUrl: `/messages/${sender._id}`
      }
    });
    
    console.log(`✅ New message notification sent to user ${recipient._id}`);
  } catch (error) {
    console.error('Error notifying new message:', error.message);
  }
};

/**
 * Send general system notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} options - {title, message, priority, actionUrl, metadata}
 */
const notifyMultipleUsers = async (userIds = [], options = {}) => {
  try {
    if (!userIds.length) {
      console.warn('No users provided for notification');
      return;
    }

    // Create notifications in DB
    const notifications = await Promise.all(
      userIds.map(userId =>
        createNotification({
          recipientId: userId,
          type: options.type || 'system',
          priority: options.priority || 'medium',
          title: options.title || 'Notification',
          message: options.message || 'You have a new notification',
          actionUrl: options.actionUrl,
          metadata: options.metadata || {}
        }).catch(err => {
          console.error(`Failed to create notification for user ${userId}:`, err.message);
          return null;
        })
      )
    );

    // Send Firebase bulk push notifications
    await sendBulkPushNotification(userIds, {
      title: options.title || 'Notification',
      message: options.message || 'You have a new notification',
      type: options.type || 'system',
      priority: options.priority || 'medium',
      actionUrl: options.actionUrl || '',
      data: options.data || {}
    });

    console.log(`✅ Notification sent to ${userIds.length} users`);
  } catch (error) {
    console.error('Error notifying multiple users:', error.message);
  }
};

module.exports = {
  notifyNewJobPosted,
  notifyApplicationReceived,
  notifyApplicationStatusChanged,
  notifyShiftReminder,
  notifyPaymentUpdate,
  notifyNewMessage,
  notifyMultipleUsers
};
