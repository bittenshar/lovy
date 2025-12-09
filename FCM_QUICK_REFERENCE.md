# 🔥 Firebase FCM Quick Reference Card
**Copy-Paste Implementation Guide**

---

## 📱 Flutter: Integration into Auth Provider

**File:** `lib/core/state/auth_provider.dart`

Add this import at the top:
```dart
import 'package:talent/services/fcm_service.dart';
```

Add this to your login method:
```dart
Future<bool> login(String email, String password) async {
  try {
    print('🔐 [AUTH] Attempting login...');
    
    // Your existing auth logic
    await authService.login(email: email, password: password);
    
    print('✅ [AUTH] Login successful');
    
    // ===== NEW: Initialize FCM after successful login =====
    try {
      print('🔥 [AUTH] Initializing FCM after successful login...');
      
      // Get user ID and token from your auth service
      final userId = authService.user?.id ?? '';
      final authToken = await getAuthToken(); // Your token retrieval method
      
      // Determine backend URL based on environment
      const String backendUrl = 'http://10.0.2.2:3000/api'; // Android emulator
      // OR for real device: 'http://192.168.1.X:3000/api'
      
      // Initialize FCM with these details
      await FCMService().initFCM(
        userId: userId,
        authToken: authToken,
        backendUrl: backendUrl,
      );
      
      print('✅ [AUTH] FCM initialization queued');
    } catch (fcmError) {
      print('⚠️  [AUTH] FCM initialization warning (non-critical): $fcmError');
      // FCM failure shouldn't block login
    }
    
    return true;
    
  } catch (e) {
    print('❌ [AUTH] Login failed: $e');
    return false;
  }
}
```

---

## 🌐 Node.js: Express Route Setup

**File:** `src/routes/notification.routes.js` (create if doesn't exist)

```javascript
const express = require('express');
const notificationController = require('../modules/notifications/notification-debug.controller');
const authMiddleware = require('../middleware/auth'); // Your auth middleware

const router = express.Router();

// All routes need authentication
router.use(authMiddleware);

// Register FCM token (called by Flutter app after login)
router.post('/register-token', notificationController.registerFCMToken);

// Delete FCM token (called by Flutter app on logout)
router.delete('/token', notificationController.deleteFCMToken);

// Send test notification (for manual testing)
router.post('/test', notificationController.sendTestNotification);

// Get user's token (for debugging)
router.get('/token/:userId', notificationController.getUserToken);

// Firebase health check
router.get('/health', notificationController.healthCheck);

module.exports = router;
```

**File:** `src/app.js` (or your main Express app)

```javascript
// Add this route to your app
const notificationRoutes = require('./routes/notification.routes');
app.use('/api/notifications', notificationRoutes);
```

---

## 📤 Backend: Send Notification Function

**Usage in any backend function:**

```javascript
const notificationService = require('../services/notification.service');

// Example: After job is created
async function handleJobCreated(job) {
  console.log('📍 [EVENT] New job created, sending notifications...');
  
  // Send to relevant employers/workers
  const result = await notificationService.sendNotificationToUser(
    job.createdBy, // User ID
    'New Job Posted',
    `${job.title} - $${job.salary}/hour`,
    {
      jobId: job._id.toString(),
      screen: 'job_details',
      action: 'view_job',
    }
  );
  
  console.log('📊 Notification result:', result);
}
```

---

## 🧪 Testing: Curl Commands

### Register Test Token

```bash
# Get a JWT token first by logging in
export JWT_TOKEN="eyJhbGc..." # Your JWT token

# Register token
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "fcmToken": "dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1MXpLt7jKqB9xYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhI",
    "userId": "USER_ID_HERE",
    "platform": "android"
  }'
```

### Send Test Notification

```bash
# Send test notification
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userId": "USER_ID_HERE"
  }'

# Expected response:
# {"status":"success","message":"Test notification sent successfully",...}
```

### Check User's Token

```bash
# Get stored token for user
curl http://localhost:3000/api/notifications/token/USER_ID_HERE \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Firebase Health Check

```bash
# Check if Firebase is initialized
curl http://localhost:3000/api/notifications/health

# Expected response:
# {"status":"ok","message":"Firebase ready to send notifications",...}
```

---

## 📊 Debug Output Checklist

### ✅ Flutter: What to look for

After login, you should see these exact logs:

```
🔐 [AUTH] User attempting to login...
✅ [AUTH] Login successful
🔥 [AUTH] Initializing FCM post-login...
🔥 [FCM] INITIALIZATION START
📋 [FCM] STEP 1: Requesting notification permissions...
✅ [FCM] STEP 1 COMPLETE: Permissions granted
🎟️  [FCM] STEP 2: Getting FCM token from Firebase...
✅ [FCM] STEP 2 COMPLETE: FCM Token obtained
   Token length: 152 characters
💾 [FCM] STEP 3: Saving token to local storage...
✅ [FCM] STEP 3 COMPLETE: Token saved
📤 [FCM] STEP 4: Registering token with backend...
✅ [FCM] STEP 4 COMPLETE: Token registered successfully
👂 [FCM] STEP 5: Setting up message listeners...
✅ [FCM] STEP 5 COMPLETE: Message listeners configured
✅ [FCM] INITIALIZATION COMPLETE - READY FOR NOTIFICATIONS
```

### ✅ Backend: What to look for

When app registers token:

```
📝 [REGISTER TOKEN ENDPOINT] Incoming request
🔍 [VALIDATE] Validating inputs
✅ [VALIDATE] All inputs present
✅ [TOKEN] Token format validation passed
🔍 [DATABASE] Looking up user
✅ [DATABASE] User found
💾 [UPDATE] Updating user FCM token...
✅ [UPDATE] User saved successfully
✅ [SUCCESS] Token registered successfully
```

When sending notification:

```
📤 [SEND NOTIFICATION] Starting
🔍 [VALIDATE] Validating inputs
🎟️  [TOKEN] Token Details
🚀 [FIREBASE] Sending via Firebase Admin SDK
✅ [SUCCESS] Notification sent successfully
   Message ID: 0:1701234567890123%abcd1234
```

---

## 🐛 Common Issues & Quick Fixes

| Issue | Symptoms | Fix |
|-------|----------|-----|
| Firebase not initialized | `❌ [FIREBASE] Service account file NOT found` | Download `firebase-service-account.json` from Firebase Console. Place in backend root. Restart server. |
| Token is null | `❌ [FCM] STEP 2 FAILED: Token is null` | Run `flutter clean && flutter pub get && flutter run`. Check `google-services.json` exists and has correct package name. |
| 401 Unauthorized | `Response status: 401` | Verify JWT token is being sent in Authorization header. Token must be valid and not expired. |
| Token not registering | No database update | Check backend logs. Look for validation errors. Verify userId is correct. |
| Notification not received | Firebase returns success but no notification on device | Check device notification settings. For foreground, check if app is listening with `onMessage` listener. For background, check if handler is set. |

---

## 📋 One-Time Setup Checklist

- [ ] **Firebase Console**
  - [ ] Project created (work-connect-nodejs)
  - [ ] Android app registered
  - [ ] google-services.json downloaded
  - [ ] Service account key downloaded

- [ ] **Backend**
  - [ ] firebase-service-account.json in root
  - [ ] Added to .gitignore
  - [ ] npm install firebase-admin done
  - [ ] Routes configured
  - [ ] Database User model has fcmToken field

- [ ] **Flutter**
  - [ ] pubspec.yaml has firebase_core, firebase_messaging
  - [ ] google-services.json in android/app/
  - [ ] android/build.gradle has Google services plugin
  - [ ] android/app/build.gradle applies plugin
  - [ ] AndroidManifest.xml has POST_NOTIFICATIONS permission
  - [ ] FCMService.dart created with full implementation
  - [ ] main.dart calls Firebase.initializeApp()
  - [ ] auth_provider.dart calls FCMService.initFCM() after login

---

## 🚀 Complete Data Flow

```
1. User Opens App
   ↓ (main.dart: Firebase.initializeApp())
   
2. User Logs In
   ↓ (auth_provider.dart: FCMService.initFCM())
   
3. FCM Requests Permissions
   ↓ (Android: Shows permission dialog)
   
4. Firebase Returns FCM Token
   ↓ (Token: 150+ characters with : and _)
   
5. App Sends Token to Backend
   → POST /api/notifications/register-token
   → Header: Authorization: Bearer JWT
   → Body: { fcmToken, userId, platform }
   
6. Backend Stores in MongoDB
   → User.fcmToken = token
   → User.platform = "android"
   → User.fcmTokenUpdatedAt = now
   
7. Response 200 OK
   ← Backend confirms token saved
   
8. App Sets up Listeners
   ← onMessage (foreground)
   ← onMessageOpenedApp (click)
   ← onBackgroundMessage (background)
   
✅ TOKEN REGISTRATION COMPLETE

---

9. Backend Event Happens (job posted, application received)
   → notificationService.sendNotificationToUser(userId, ...)
   
10. Backend Retrieves User's FCM Token
    → User.findById(userId).fcmToken
    
11. Firebase Admin SDK Sends Message
    → admin.messaging().send({ notification, data, token })
    
12. Firebase Infrastructure Delivers
    → Routes to correct device
    → Validates token
    
13. Device Receives Notification
    → System notification (if background/closed)
    → App callback (if foreground)
    
14. User Sees Notification
    ✅ NOTIFICATION DELIVERED
    
15. User Taps Notification
    ← onMessageOpenedApp triggers
    → App navigates to relevant screen
    
✅ FULL FLOW COMPLETE
```

---

## 📚 File Structure Summary

```
dhruvbackend/
├── firebase-service-account.json          ← Download from Firebase Console
├── src/
│   ├── routes/
│   │   └── notification.routes.js         ← NEW: API routes
│   ├── modules/notifications/
│   │   └── notification-debug.controller.js ← NEW: Endpoint handlers
│   └── services/
│       └── firebase-notification-debug.service.js ← NEW: FCM sender

dhruvflutter/
├── android/app/
│   ├── google-services.json               ← Download from Firebase Console
│   └── build.gradle                       ← Already has Google services
├── lib/
│   ├── main.dart                          ← Has Firebase.initializeApp()
│   ├── services/
│   │   └── fcm_service.dart               ← NEW: Complete FCM implementation
│   └── core/state/
│       └── auth_provider.dart             ← Has FCMService.initFCM() after login
```

---

## 🎯 Testing Sequence

```
1. ✅ Verify Firebase service account exists
   → ls firebase-service-account.json

2. ✅ Start backend
   → npm start
   → Look for: ✅ [FIREBASE] INITIALIZATION COMPLETE

3. ✅ Build and run Flutter app
   → flutter run --debug
   → Look for: ✅ [MAIN] Firebase initialized successfully

4. ✅ Login to app
   → Enter test credentials
   → Look for: ✅ [FCM] INITIALIZATION COMPLETE

5. ✅ Check database
   → db.users.findOne({_id: ObjectId("...")})
   → Verify: fcmToken is set

6. ✅ Send test notification
   → curl -X POST http://localhost:3000/api/notifications/test
   → Look for: ✅ [SUCCESS] Notification sent successfully

7. ✅ Check device/emulator
   → Notification should appear
   → If foreground: Check app logs for: 📬 [FOREGROUND MESSAGE]
   → If background: Check system notification tray

8. ✅ Tap notification
   → App should respond
   → Look for: 🔗 [NOTIFICATION CLICKED]
```

---

**Status: ✅ Ready for Production**

When you see all the ✅ markers in your logs, your FCM implementation is **fully working end-to-end**!

For detailed information, refer to:
- `FCM_COMPLETE_IMPLEMENTATION.md` - Full technical guide
- `FCM_TESTING_AND_DEBUGGING_GUIDE.md` - Complete testing workflow
