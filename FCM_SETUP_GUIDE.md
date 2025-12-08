# 🔥 Firebase Cloud Messaging (FCM) Setup Guide

## Overview
Your backend and Flutter app are now fully configured to send and receive push notifications via Firebase Cloud Messaging (FCM).

## ✅ What's Been Set Up

### Backend (`dhruvbackend`)
- ✅ Firebase Admin SDK integrated
- ✅ FCM notification service (`src/services/firebase-notification.service.js`)
- ✅ Notification controller (`src/controllers/notification.controller.js`)
- ✅ API routes (`src/routes/notification.routes.js`)
- ✅ Routes registered at `/api/fcm`

### Flutter App (`dhruvflutter`)
- ✅ Firebase Messaging configured
- ✅ FCM listeners for foreground/background messages
- ✅ Token management and persistence
- ✅ minSdk updated to 23 (required for firebase_messaging)

## 🚀 Setup Steps

### Step 1: Get Firebase Service Account
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **work connect** (or your project name)
3. Go to **Project Settings** (⚙️ icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase-service-account.json` in your backend root directory

```
dhruvbackend/
├── firebase-service-account.json  ← Place it here
├── src/
├── package.json
└── ...
```

### Step 2: Install Dependencies
```bash
cd /Users/mrmad/Dhruv/dhruvbackend
npm install
```

This will install `firebase-admin@^12.0.0`

### Step 3: Environment Variables
Add to your `.env` file (optional, for custom path):
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### Step 4: Start Backend
```bash
npm start
# or
npm run dev
```

Watch for this log message:
```
✅ Firebase Admin SDK initialized successfully
```

## 📱 API Endpoints

### 1. Health Check
```bash
curl http://localhost:5000/api/fcm/health
```

Response:
```json
{
  "success": true,
  "firebase": {
    "initialized": true,
    "status": "Ready"
  }
}
```

### 2. Send Notification to Single Device
```bash
curl -X POST http://localhost:5000/api/fcm/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN_HERE",
    "title": "Test Notification",
    "body": "Hello from your backend!",
    "data": {
      "action": "open_job",
      "jobId": "123"
    }
  }'
```

**Replace** `YOUR_FCM_TOKEN_HERE` with your actual FCM token from the Flutter app console.

### 3. Send to Multiple Devices
```bash
curl -X POST http://localhost:5000/api/fcm/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "fcmTokens": [
      "token1_here",
      "token2_here",
      "token3_here"
    ],
    "title": "Notification",
    "body": "Message to multiple users",
    "data": {
      "type": "job_alert"
    }
  }'
```

### 4. Subscribe to Topic
```bash
curl -X POST http://localhost:5000/api/fcm/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN_HERE",
    "topic": "job_alerts"
  }'
```

### 5. Send to Topic
```bash
curl -X POST http://localhost:5000/api/fcm/send-topic \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "job_alerts",
    "title": "New Job Available",
    "body": "A new job matching your skills is available",
    "data": {
      "jobId": "456"
    }
  }'
```

### 6. Unsubscribe from Topic
```bash
curl -X POST http://localhost:5000/api/fcm/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN_HERE",
    "topic": "job_alerts"
  }'
```

## 🧪 Testing Workflow

### Step 1: Get Your FCM Token
1. Run the Flutter app: `flutter run`
2. Check console for: `✅ FCM Token: ...`
3. Copy the full token

### Step 2: Test with Backend API
```bash
# From another terminal
curl -X POST http://localhost:5000/api/fcm/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "paste_your_token_here",
    "title": "Test",
    "body": "This is from your backend"
  }'
```

### Step 3: Check Device
You should see:
1. **In Flutter console**:
   ```
   📬 ===== FOREGROUND MESSAGE RECEIVED =====
     Title: Test
     Body: This is from your backend
   ```

2. **On device**: Notification appears as banner/toast

## 📋 Integration Examples

### Save User FCM Token
```javascript
// In your user model or controller
await User.findByIdAndUpdate(userId, {
  fcmToken: token
});
```

### Send Notification When Job is Posted
```javascript
// In job creation controller
const firebaseService = require('../services/firebase-notification.service');

// After creating job
const workers = await Worker.find({ skills: job.skills });
const fcmTokens = workers.map(w => w.fcmToken).filter(Boolean);

if (fcmTokens.length > 0) {
  await firebaseService.sendToDevices(fcmTokens, {
    title: 'New Job Available',
    body: `${job.title} - ${job.hourlyRate}/hr`,
    data: {
      jobId: job._id.toString(),
      action: 'open_job'
    }
  });
}
```

### Send Notification When Application Status Changes
```javascript
// In application controller
const applicant = await User.findById(application.workerId);

if (applicant?.fcmToken) {
  await firebaseService.sendToDevice(applicant.fcmToken, {
    title: 'Application Update',
    body: `Your application status: ${application.status}`,
    data: {
      applicationId: application._id.toString(),
      status: application.status
    }
  });
}
```

## 🔍 Troubleshooting

### Firebase Not Initialized
**Error**: `Firebase not initialized. Check your service account configuration.`

**Solution**:
1. Download `firebase-service-account.json` from Firebase Console
2. Place it in backend root directory
3. Restart backend: `npm start`
4. Check logs for: `✅ Firebase Admin SDK initialized successfully`

### Token Not Found
**Error**: `FCM token is required`

**Solution**:
1. Make sure app is running on device
2. Check Flutter console for FCM token
3. Use exact token from console

### Invalid Token
**Error**: `Malformed registration token` or `Registration token is not a valid Firebase registration token`

**Solution**:
- Token is incorrect or from different Firebase project
- Verify token matches your Firebase project
- Regenerate token: `flutter run` again

### Messages Not Appearing
1. Ensure device has Google Play Services
2. Check device notification settings
3. Verify internet connectivity
4. Check Firebase Console → Reporting for delivery stats

## 📊 Monitoring

### View Message Delivery
1. Firebase Console → Cloud Messaging
2. Click on your campaign
3. View **Sends**, **Impressions**, **Opens**

### Enable Detailed Logging
Add to backend `.env`:
```env
DEBUG=firebase:*
```

## 🔐 Security Notes

1. **Never commit** `firebase-service-account.json` to git
2. Add to `.gitignore`:
   ```
   firebase-service-account.json
   ```

3. Use environment variables for production:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=/secure/path/to/account.json
   ```

4. Implement authentication/authorization on FCM endpoints if needed

## 📚 Next Steps

1. ✅ Set up Firebase service account
2. ✅ Install npm dependencies
3. ✅ Get FCM token from Flutter app
4. ✅ Test API endpoints
5. ✅ Integrate notifications into your app features
6. ✅ Monitor delivery in Firebase Console

## 📞 Support

If notifications aren't working:
1. Check backend logs: `✅ Firebase Admin SDK initialized successfully`
2. Verify FCM token is valid and from correct project
3. Check device notification settings
4. View Firebase Console reporting for delivery status
5. Check device has Google Play Services installed

Happy notifying! 🚀
