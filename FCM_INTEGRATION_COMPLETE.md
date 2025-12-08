# 🚀 Firebase Cloud Messaging (FCM) Integration - Complete

## ✅ What's Been Implemented

### Backend (Node.js/Express)
- ✅ Firebase Admin SDK integrated
- ✅ FCM notification service with single/batch/topic notifications
- ✅ Notification module updated to use FCM instead of OneSignal
- ✅ FCM token management endpoints
- ✅ Notification triggers for different events
- ✅ 6 API endpoints for notifications

### Flutter App (Android)
- ✅ Firebase Messaging configured
- ✅ FCM token generation and management
- ✅ Token saved to SharedPreferences
- ✅ Token automatically sent to backend
- ✅ Foreground/background message handling
- ✅ Token refresh listeners

## 📋 Files Created/Modified

### Backend Files
```
✅ src/services/firebase-notification.service.js      - FCM service
✅ src/controllers/notification.controller.js         - FCM API controllers
✅ src/routes/notification.routes.js                  - FCM API routes  
✅ src/services/notification-triggers.service.js      - Event notification helpers
✅ src/modules/auth/fcm-token.controller.js          - Token management
✅ src/modules/notifications/notification.service.js - Updated to FCM
✅ src/modules/auth/auth.routes.js                   - Added token routes
✅ package.json                                       - Added firebase-admin
✅ src/routes/index.js                               - Added FCM routes
```

### Flutter Files
```
✅ lib/firebase_msg.dart                             - FCM initialization & token sync
✅ lib/main.dart                                      - Firebase setup
✅ android/app/build.gradle.kts                      - minSdk 23
✅ android/app/src/main/AndroidManifest.xml         - Permissions
✅ android/app/src/main/kotlin/.../MainActivity.kt  - Firebase ready
```

## 🔧 Setup Instructions

### Step 1: Backend Firebase Setup

1. **Download Service Account**
   - Firebase Console → Project Settings → Service Accounts
   - Generate New Private Key
   - Save as `/dhruvbackend/firebase-service-account.json`

2. **Install Dependencies**
   ```bash
   cd /Users/mrmad/Dhruv/dhruvbackend
   npm install firebase-admin
   ```

3. **Start Backend**
   ```bash
   npm start
   ```
   Look for: `✅ Firebase Admin SDK initialized successfully`

### Step 2: Flutter App Configuration

The app is already configured! Just run:
```bash
cd /Users/mrmad/Dhruv/dhruvflutter
flutter run
```

When user logs in, FCM token will be automatically sent to backend.

## 📱 API Endpoints

### FCM/Notification Endpoints

#### 1. Save FCM Token (Auto-called by app)
```
POST /api/auth/save-fcm-token
Authorization: Bearer {token}
Body: {
  "fcmToken": "...",
  "platform": "android"
}
```

#### 2. Get FCM Token
```
GET /api/auth/fcm-token
Authorization: Bearer {token}
```

#### 3. Delete FCM Token (Logout)
```
POST /api/auth/delete-fcm-token
Authorization: Bearer {token}
```

#### 4. Send Notification
```
POST /api/fcm/send
Body: {
  "fcmToken": "...",
  "title": "Test",
  "body": "Message"
}
```

#### 5. Send Batch Notifications
```
POST /api/fcm/send-batch
Body: {
  "fcmTokens": ["...", "..."],
  "title": "Test",
  "body": "Message"
}
```

## 🎯 Using Notification Triggers

The `notification-triggers.service.js` provides helper functions for different events:

### Job Posted Event
```javascript
const notificationTriggers = require('../../services/notification-triggers.service');

// When job is posted
await notificationTriggers.notifyNewJobPosted(job, employer, targetWorkerIds);
```

### Application Received
```javascript
await notificationTriggers.notifyApplicationReceived(application, job, worker, employer);
```

### Application Status Changed
```javascript
await notificationTriggers.notifyApplicationStatusChanged(
  application, 
  'approved', // status
  worker, 
  job
);
```

### Shift Reminder
```javascript
await notificationTriggers.notifyShiftReminder(worker, shift, 'reminder');
// Types: 'reminder', 'start', 'end'
```

### Payment Update
```javascript
await notificationTriggers.notifyPaymentUpdate(user, payment, 'received');
// Types: 'received', 'pending', 'completed'
```

### New Message
```javascript
await notificationTriggers.notifyNewMessage(recipient, sender, messageText);
```

### Multiple Users
```javascript
await notificationTriggers.notifyMultipleUsers(userIds, {
  title: 'Important Update',
  message: 'Check your app for details',
  priority: 'high'
});
```

## 📍 Integration Examples

### In Job Controller (When Job Posted)
```javascript
const notificationTriggers = require('../../services/notification-triggers.service');

// After job is created
const job = await Job.create(jobData);
const employer = await User.findById(jobData.employer);

// Notify workers
await notificationTriggers.notifyNewJobPosted(job, employer);

res.json({ success: true, job });
```

### In Application Controller (When Application Received)
```javascript
// After application is created
const application = await Application.create(appData);
const job = await Job.findById(appData.job);
const worker = await User.findById(appData.worker);
const employer = await User.findById(job.employer);

// Notify employer
await notificationTriggers.notifyApplicationReceived(
  application, 
  job, 
  worker, 
  employer
);
```

### In Application Controller (Status Update)
```javascript
// When application status is updated
application.status = 'approved';
await application.save();

const worker = await User.findById(application.worker);
const job = await Job.findById(application.job);

// Notify worker
await notificationTriggers.notifyApplicationStatusChanged(
  application,
  'approved',
  worker,
  job
);
```

## 📊 Testing

### 1. Test Direct FCM Send
```bash
curl -X POST http://localhost:5000/api/fcm/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN",
    "title": "Test",
    "body": "Testing FCM"
  }'
```

### 2. Get FCM Token from Device
1. Run Flutter app: `flutter run`
2. Login with your account
3. Check console for: `✅ FCM Token: ...`
4. Token automatically sent to backend

### 3. Send Via Backend API
```bash
# Get user's current token
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  http://localhost:5000/api/auth/fcm-token

# Use returned token to send notification
curl -X POST http://localhost:5000/api/fcm/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "TOKEN_FROM_USER",
    "title": "App Test",
    "body": "Notification from your app!"
  }'
```

## 🎊 How It Works

### User Flow
1. User installs/runs app
2. App requests notification permissions
3. App gets FCM token from Firebase
4. **Token automatically sent to backend via API**
5. When user logs in, token is saved in user database
6. When event occurs, notification is sent to saved token

### Notification Flow
1. Event occurs (job posted, application received, etc.)
2. Backend calls notification trigger function
3. Trigger function:
   - Creates notification in database (in-app)
   - Sends push notification via FCM to user's token
4. User receives push notification
5. User can tap to open specific screen in app

## ✨ Features Enabled

✅ **Single User Notifications** - Send to one user
✅ **Batch Notifications** - Send to multiple users
✅ **Topic Notifications** - Broadcast to subscribed users
✅ **High Priority** - Important notifications with sound/alert
✅ **Custom Data** - Pass action URLs and metadata
✅ **Token Management** - Auto-sync, refresh, delete
✅ **Database Backup** - Notifications saved in DB even if push fails
✅ **Logging** - Detailed console logs for debugging

## 📚 Documentation Files Created

- `/dhruvbackend/QUICK_START_FCM.md` - Quick start guide
- `/dhruvbackend/FCM_SETUP_GUIDE.md` - Detailed setup
- `/dhruvbackend/FCM_COMPLETE_SETUP.md` - Complete overview
- `/dhruvflutter/FCM_TESTING_GUIDE.md` - Flutter testing

## 🔒 Security Notes

1. **Never commit** `firebase-service-account.json` to git
2. Add to `.gitignore`:
   ```
   firebase-service-account.json
   ```
3. Use environment variables in production
4. FCM tokens are device-specific and secure
5. All API endpoints should require authentication

## 🚀 Next Steps

### Immediate
1. ✅ Place `firebase-service-account.json` in backend
2. ✅ Run `npm install firebase-admin`
3. ✅ Start backend: `npm start`
4. ✅ Test FCM send with curl command above

### Integration
1. Add notification triggers to your controllers
2. Test with real events (job posting, applications, etc.)
3. Customize notification messages
4. Add notification sounds (optional)

### Optional Enhancements
1. Add notification categories (by type)
2. Add notification preferences (users can opt out)
3. Add notification analytics
4. Add scheduled notifications
5. Add rich notification UI (images, buttons)

## 🐛 Troubleshooting

### Backend Issues
- **"Firebase not initialized"** → Place service account JSON file
- **"Module not found"** → Run `npm install firebase-admin`
- **Port in use** → Change port in `npm start`

### Flutter Issues  
- **Token not saving** → Check auth token exists in SharedPreferences
- **Notifications not appearing** → Check device notification settings
- **Invalid token error** → Token may be from different Firebase project

### Firebase Issues
- **Messages not delivered** → Check device has Google Play Services
- **Token invalid** → Token expires after app uninstall/clear data
- **Rate limiting** → Too many messages too fast (implement backoff)

## 📞 Support

All notification infrastructure is now in place. Just integrate the trigger functions into your existing controllers and you're ready to send notifications for all app events!

Questions? Review:
- `src/services/notification-triggers.service.js` - Example implementations
- `src/modules/notifications/notification.service.js` - Core notification logic
- `src/services/firebase-notification.service.js` - Low-level FCM implementation

Happy notifying! 🎉
