/**
 * Firebase Cloud Messaging Service
 * Handles sending push notifications to users via FCM
 */

const admin = require('firebase-admin');
const path = require('path');
const FCMDebugLogger = require('../utils/fcm-debug-logger');

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
      FCMDebugLogger.logInit('Firebase Admin SDK');

      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        console.log('✅ Firebase Admin SDK already initialized');
        FCMDebugLogger.logInitComplete();
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
      FCMDebugLogger.logInitComplete();
    } catch (error) {
      FCMDebugLogger.logError('firebase-init', error, {
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'default'
      });
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
      // Validate FCM token format
      if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
        console.warn('⚠️ Invalid or empty FCM token provided');
        throw new Error('Invalid FCM token');
      }

      FCMDebugLogger.logTokenValidation(fcmToken, true);

      // Ensure all data values are strings (Firebase requirement)
      const cleanData = {};
      if (payload.data && typeof payload.data === 'object') {
        Object.keys(payload.data).forEach(key => {
          const value = payload.data[key];
          if (value === null || value === undefined) {
            cleanData[key] = '';
          } else {
            cleanData[key] = String(value);
          }
        });
      }

      const message = {
        notification: {
          title: String(payload.title || 'Notification'),
          body: String(payload.body || ''),
        },
        data: cleanData,
        token: fcmToken.trim(),
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
                title: String(payload.title || 'Notification'),
                body: String(payload.body || ''),
              },
              sound: 'default',
              'mutable-content': true,
            },
          },
        },
      };

      // Log the message structure for debugging
      FCMDebugLogger.logNotificationSend(
        payload.title,
        payload.body,
        1,
        [fcmToken]
      );

      const response = await admin.messaging().send(message);
      FCMDebugLogger.logNotificationSuccess(response, 1, 0);
      return response;
    } catch (error) {
      FCMDebugLogger.logNotificationError(error, fcmToken);
      
      // Categorize the error
      if (error.code === 'messaging/mismatched-credential') {
        console.warn('⚠️  Firebase token mismatch (likely from different Firebase project)');
      } else if (error.code === 'messaging/invalid-registration-token' || 
                 error.message.includes('Requested entity was not found')) {
        console.warn('⚠️  Invalid or expired FCM token - token should be cleared and regenerated');
      } else if (error.message.includes('not initialized')) {
        console.error('🔴 CRITICAL: Firebase Admin SDK not initialized - check firebase-service-account.json');
      }
      
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
      // Ensure all data values are strings (Firebase requirement)
      const cleanData = {};
      if (payload.data && typeof payload.data === 'object') {
        Object.keys(payload.data).forEach(key => {
          const value = payload.data[key];
          if (value === null || value === undefined) {
            cleanData[key] = '';
          } else {
            cleanData[key] = String(value);
          }
        });
      }

      const messages = fcmTokens.map(token => ({
        notification: {
          title: String(payload.title || 'Notification'),
          body: String(payload.body || ''),
        },
        data: cleanData,
        token,
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
                title: String(payload.title || 'Notification'),
                body: String(payload.body || ''),
              },
              sound: 'default',
              'mutable-content': true,
            },
          },
        },
      }));

      const response = await admin.messaging().sendAll(messages);
      console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
      return response;
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
