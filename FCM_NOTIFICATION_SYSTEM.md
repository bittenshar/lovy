# FCM Notification System Setup - Complete Guide

## 🎯 System Overview

This document describes the Firebase Cloud Messaging (FCM) notification system for the WorkConnect app.

### Components Created:

1. **Backend Files** (Node.js/Express on Vercel)
   - `routes/notification.routes.js` - API endpoints for FCM operations
   - `models/fcmToken.js` - MongoDB schema for storing FCM tokens
   - `services/firebaseNotificationService.js` - Firebase notification service

2. **Flutter Files** (Mobile App)
   - `lib/core/services/notification_api_service.dart` - API client for backend
   - `lib/firebase_msg.dart` - FCM initialization and message handling
   - `lib/core/state/auth_provider.dart` - Updated to register token after login

3. **Testing**
   - `fcm-notifications.postman_collection.json` - Postman collection with all API endpoints

---

## 📱 Flow Diagram

```
Firebase Cloud Console
        ↓
Firebase Cloud Messaging (FCM)
        ↓
App Receives Message → Handles with flutter_local_notifications
        ↓
Visual Notification appears on Device
        ↓
User taps notification (can trigger routing logic)
```

---

## 🚀 Setup Instructions

### Step 1: Backend Setup (Node.js)

Make sure your backend has:

1. **Firebase Admin SDK initialized** in your app.js:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
```

2. **Notification routes registered** in app.js:
```javascript
const notificationRoutes = require('./routes/notification.routes');
app.use('/api/notifications', notificationRoutes);
```

3. **MongoDB Model** - The FCMToken model is automatically created by Mongoose

### Step 2: Flutter App Setup

The following are already completed:

1. ✅ Firebase packages installed: `firebase_core`, `firebase_messaging`
2. ✅ Local notifications package: `flutter_local_notifications`
3. ✅ Firebase configured with: `flutterfire configure --project=workconnect2-1313`
4. ✅ Firebase initialized in `main.dart`
5. ✅ FCM message handlers set up in `firebase_msg.dart`
6. ✅ Token auto-registration after login in `auth_provider.dart`

### Step 3: Testing with Postman

1. **Import the collection:**
   - Open Postman
   - Click "Import" and select `fcm-notifications.postman_collection.json`
   - The collection will be imported with all endpoints

2. **Set environment variables:**
   - `baseUrl`: `lovy-dusky.vercel.app` (for production) or `localhost:3000` (for local)
   - `jwtToken`: Get from login response (in Authorization header)
   - `fcmToken`: Get from Flutter app logs (search for "🔔 [FCM] Device Token:")
   - `userId`: Get from login response or user profile
   - `deviceId`: Can be any unique identifier (e.g., "flutter-device-1")

3. **Test endpoints in order:**
   - **Health Check** - Verify Firebase is initialized
   - **Register FCM Token** - Save your device's token to database
   - **Get User Tokens** - Retrieve all your registered tokens
   - **Send to Single Device** - Send a test notification to your device
   - **Send Test Notification by UserId** - Backend fetches token and sends
   - **Send to Topic** - Send to all devices subscribed to a topic
   - **Subscribe to Topic** - Subscribe your device to a topic
   - **Send Batch** - Send to multiple devices at once
   - **Unsubscribe from Topic** - Unsubscribe from a topic

---

## 📊 API Endpoints Reference

### Health Check
- **Method:** GET
- **URL:** `/api/notifications/health`
- **Auth:** None
- **Response:** Firebase initialization status

### Register FCM Token
- **Method:** POST
- **URL:** `/api/notifications/register-token`
- **Auth:** Required (JWT Bearer token)
- **Body:**
```json
{
  "fcmToken": "your-fcm-token",
  "platform": "android",
  "deviceId": "flutter-device-1",
  "deviceName": "My Phone"
}
```

### Get User Tokens
- **Method:** GET
- **URL:** `/api/notifications/tokens`
- **Auth:** Required
- **Response:** List of active FCM tokens for user

### Send to Single Device
- **Method:** POST
- **URL:** `/api/notifications/send`
- **Auth:** Required
- **Body:**
```json
{
  "fcmToken": "device-token",
  "title": "Notification Title",
  "body": "Notification Body",
  "data": {
    "screen": "jobs",
    "actionId": "123"
  }
}
```

### Send Batch Notifications
- **Method:** POST
- **URL:** `/api/notifications/send-batch`
- **Auth:** Required
- **Body:**
```json
{
  "fcmTokens": ["token1", "token2", "token3"],
  "title": "Batch Title",
  "body": "Batch Body",
  "data": {}
}
```

### Send by User ID
- **Method:** POST
- **URL:** `/api/notifications/test`
- **Auth:** Required
- **Body:**
```json
{
  "userId": "user-mongodb-id",
  "title": "Title",
  "body": "Body",
  "data": {}
}
```

### Send to Topic
- **Method:** POST
- **URL:** `/api/notifications/send-to-topic`
- **Auth:** Required
- **Body:**
```json
{
  "topic": "announcements",
  "title": "Title",
  "body": "Body",
  "data": {}
}
```

### Subscribe to Topic
- **Method:** POST
- **URL:** `/api/notifications/subscribe`
- **Auth:** Required
- **Body:**
```json
{
  "fcmToken": "device-token",
  "topic": "announcements"
}
```

### Unsubscribe from Topic
- **Method:** POST
- **URL:** `/api/notifications/unsubscribe`
- **Auth:** Required
- **Body:**
```json
{
  "fcmToken": "device-token",
  "topic": "announcements"
}
```

---

## 🔍 Getting FCM Token from Flutter App

1. Run the app on your device
2. Look at the terminal output for:
   ```
   🔔 [FCM] Device Token: <YOUR_FCM_TOKEN_HERE>
   ```
3. Copy this token and paste it in Postman's `fcmToken` variable

---

## 📋 How It Works

### App Launch
```
App starts → main.dart
  ↓
Firebase.initializeApp()
  ↓
FirebaseMsg().initFCM()
  ↓
Request notification permissions
  ↓
Get FCM token from Firebase
  ↓
Store token in SharedPreferences
  ↓
Listen for incoming messages
```

### User Login
```
User enters credentials
  ↓
AuthProvider.login()
  ↓
Authenticate with backend
  ↓
Retrieve FCM token from SharedPreferences
  ↓
Call: NotificationApiService.registerFcmToken()
  ↓
POST to /api/notifications/register-token
  ↓
Backend saves token to MongoDB
  ↓
Token now associated with user
```

### Receiving Notification
```
Firebase sends notification
  ↓
App receives via FirebaseMessaging.onMessage
  ↓
handleNotificationWithDisplay() is called
  ↓
flutter_local_notifications.show()
  ↓
Visual notification appears on device
  ↓
User can tap and see details
```

---

## 🛠️ Troubleshooting

### Token not appearing in logs
- Check if Firebase is properly initialized
- Verify `firebase_core` package is installed
- Check Firebase project ID in `firebase_options.dart`

### Notifications not appearing on device
- Verify `flutter_local_notifications` package is installed
- Check device notification settings (not silent/DND mode)
- Ensure app has notification permissions granted
- Check app logs for error messages (search for ❌)

### Backend returns 401 Unauthorized
- Ensure you're passing valid JWT token in Authorization header
- Token format: `Bearer <your_jwt_token>`
- Token must not be expired

### Backend returns 404 for FCM token
- Register token first before trying to send
- Use the correct endpoint path
- Verify `baseUrl` is correct (localhost:3000 or vercel domain)

### Device doesn't receive message
- Verify FCM token is correctly registered with backend
- Check backend logs for errors
- Ensure device has active internet connection
- Check if app is in background (might be delayed)
- Verify notification data format is correct

---

## 🔐 Security Notes

1. **Always use JWT authentication** for notification endpoints
2. **Validate FCM tokens** on backend before sending
3. **Don't expose FCM tokens** in client-side code or logs in production
4. **Use HTTPS** for all API calls
5. **Implement rate limiting** on notification endpoints
6. **Log all notification sends** for audit trail

---

## 📈 Monitoring and Logging

The system logs important events:
- ✅ Success messages (green checkmark)
- ⚠️ Warnings (yellow warning sign)
- ❌ Errors (red X mark)
- 🔔 FCM-specific events
- 📱 API-specific events

Look for these patterns in console:
- `[FCM]` - Firebase Cloud Messaging events
- `[API]` - API call events
- `[AUTH]` - Authentication events

---

## 📞 Testing Commands (Backend)

```bash
# Health check
curl https://lovy-dusky.vercel.app/api/notifications/health

# Register token (with auth header)
curl -X POST https://lovy-dusky.vercel.app/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN",
    "platform": "android",
    "deviceId": "test-device"
  }'
```

---

## 📚 References

- Firebase Documentation: https://firebase.google.com/docs/cloud-messaging
- Flutter Firebase Plugin: https://pub.dev/packages/firebase_messaging
- Flutter Local Notifications: https://pub.dev/packages/flutter_local_notifications
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

---

## ✅ Checklist for Production

- [ ] Firebase project created and configured
- [ ] Backend deployed to Vercel (or your server)
- [ ] MongoDB database connected
- [ ] All environment variables set on backend
- [ ] Flutter app has all required packages
- [ ] Firebase initialized in main.dart
- [ ] Notification permissions requested on app startup
- [ ] FCM token registered after user login
- [ ] Test notification sent and received successfully
- [ ] Error handling implemented for all API calls
- [ ] Logging implemented for monitoring
- [ ] Security: JWT tokens validated on backend
- [ ] Security: Rate limiting implemented
- [ ] Documentation updated for team
