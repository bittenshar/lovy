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
      if (!fcmTokens || fcmTokens.length === 0) {
        console.warn('⚠️ [FCM] No FCM tokens provided');
        return { success: false, successCount: 0, failureCount: 0, message: 'No tokens provided' };
      }

      const messages = fcmTokens.map((token) => ({
        notification: {
          title,
          body,
        },
        data,
        token,
      }));

      const response = await this.messaging.sendAll(messages);
      console.log(`✅ [FCM] Batch notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
      
      // If there are failures, log them and potentially clean up invalid tokens
      if (response.failureCount > 0 && response.responses) {
        const failures = response.responses
          .map((resp, idx) => ({ idx, error: resp.error }))
          .filter(item => item.error);
        
        console.warn(`⚠️ [FCM] ${failures.length} notification(s) failed:`);
        failures.forEach(fail => {
          const token = fcmTokens[fail.idx];
          const errorCode = fail.error?.code;
          console.warn(`   - Token: ${token?.substring(0, 30)}... - Error: ${errorCode}`);
          
          // Mark token as inactive if it's invalid
          if (errorCode && (errorCode.includes('not-registered') || errorCode.includes('invalid'))) {
            // Async cleanup - don't wait for it
            this._markTokenAsInactive(token).catch(err => 
              console.warn(`⚠️ [FCM] Could not mark token as inactive: ${err.message}`)
            );
          }
        });
      }
      
      return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    } catch (error) {
      console.error('❌ [FCM] Error sending batch notifications:', error.message);
      throw error;
    }
  }

  /**
   * Mark a token as inactive in the database
   */
  async _markTokenAsInactive(fcmToken) {
    try {
      const FCMToken = require('../models/fcmToken');
      await FCMToken.updateOne(
        { fcmToken },
        { isActive: false, lastUsed: new Date() }
      );
      console.log(`✅ [FCM] Marked token as inactive: ${fcmToken?.substring(0, 30)}...`);
    } catch (error) {
      console.warn(`⚠️ [FCM] Could not mark token as inactive: ${error.message}`);
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
