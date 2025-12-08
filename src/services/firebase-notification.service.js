/**
 * Firebase Cloud Messaging Service
 * Handles sending push notifications to users via FCM
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseNotificationService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  init() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        console.log('✅ Firebase Admin SDK already initialized');
        return;
      }

      // Try to initialize with service account
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, '../../firebase-service-account.json');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      console.log('⚠️  Firebase notifications will be unavailable. Make sure to:');
      console.log('   1. Download firebase-service-account.json from Firebase Console');
      console.log('   2. Place it in the project root directory');
      console.log('   3. Or set FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
    }
  }

  /**
   * Send notification to a single device
   * @param {string} fcmToken - Device FCM token
   * @param {Object} payload - Notification payload
   * @returns {Promise<string>} Message ID on success
   */
  async sendToDevice(fcmToken, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      const message = {
        notification: {
          title: payload.title || 'Notification',
          body: payload.body || '',
        },
        data: payload.data || {},
        token: fcmToken,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              'mutable-content': true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   * @param {string[]} fcmTokens - Array of device FCM tokens
   * @param {Object} payload - Notification payload
   * @returns {Promise<Object>} Batch response
   */
  async sendToDevices(fcmTokens, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      // Send to each device individually to handle errors gracefully
      let successCount = 0;
      let failureCount = 0;
      
      for (const token of fcmTokens) {
        try {
          await this.sendToDevice(token, payload);
          successCount++;
        } catch (error) {
          failureCount++;
          console.warn(`⚠️ Failed to send to token ${token.substring(0, 20)}...: ${error.message}`);
        }
      }
      
      console.log(`✅ Sent ${successCount} notifications, ${failureCount} failed`);
      return { successCount, failureCount, failureMessages: [] };
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to a topic (not used in current implementation)
   * @param {string} topic - Topic name
   * @param {Object} payload - Notification payload
   * @returns {Promise<string>} Message ID
   */
  async sendToTopic(topic, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        topic,
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Topic notification sent:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending topic notification:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe device to topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   */
  async subscribeToTopic(fcmToken, topic) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized.');
    }

    try {
      await admin.messaging().subscribeToTopic(fcmToken, topic);
      console.log(`✅ Subscribed device to topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Error subscribing to topic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe device from topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   */
  async unsubscribeFromTopic(fcmToken, topic) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized.');
    }

    try {
      await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
      console.log(`✅ Unsubscribed device from topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from topic: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new FirebaseNotificationService();
