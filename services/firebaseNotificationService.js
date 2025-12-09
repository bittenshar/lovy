const admin = require('firebase-admin');

class FirebaseNotificationService {
  constructor() {
    this.messaging = admin.messaging();
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(fcmToken, title, body, data = {}) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        token: fcmToken,
      };

      const response = await this.messaging.send(message);
      console.log('✅ [FCM] Notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ [FCM] Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple devices
   */
  async sendToMultipleDevices(fcmTokens, title, body, data = {}) {
    try {
      const messages = fcmTokens.map((token) => ({
        notification: {
          title,
          body,
        },
        data,
        token,
      }));

      const response = await this.messaging.sendAll(messages);
      console.log('✅ [FCM] Batch notifications sent:', response);
      return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    } catch (error) {
      console.error('❌ [FCM] Error sending batch notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(topic, title, body, data = {}) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        topic,
      };

      const response = await this.messaging.send(message);
      console.log('✅ [FCM] Topic notification sent:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ [FCM] Error sending to topic:', error);
      throw error;
    }
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(fcmToken, topic) {
    try {
      const response = await this.messaging.subscribeToTopic([fcmToken], topic);
      console.log('✅ [FCM] Subscribed to topic:', topic);
      return { success: true, response };
    } catch (error) {
      console.error('❌ [FCM] Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(fcmToken, topic) {
    try {
      const response = await this.messaging.unsubscribeFromTopic([fcmToken], topic);
      console.log('✅ [FCM] Unsubscribed from topic:', topic);
      return { success: true, response };
    } catch (error) {
      console.error('❌ [FCM] Error unsubscribing from topic:', error);
      throw error;
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized() {
    try {
      return admin.apps.length > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new FirebaseNotificationService();
