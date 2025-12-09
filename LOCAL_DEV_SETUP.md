# 🚀 Local Development Setup - FCM Token Registration

## Problem Solved ✅

Your Flutter app was sending FCM tokens to the **production server** (`https://lovy-dusky.vercel.app`) instead of your **local backend** (`http://localhost:3000`).

## What I Fixed

✅ Updated `firebase_msg.dart` to use local backend:
- Changed from: `https://lovy-dusky.vercel.app/api`
- Changed to: `http://10.0.2.2:3000/api` (Android emulator)

## 📱 Running the App - Step by Step

### Step 1: Start Your Backend Server

```bash
cd /Users/mrmad/Dhruv/dhruvbackend
npm start
```

**Verify it's running:**
```bash
curl http://localhost:3000/api/fcm/health
```

Should return:
```json
{
  "success": true,
  "firebase": {
    "initialized": true,
    "status": "Ready"
  }
}
```

### Step 2: Run the Flutter App

```bash
cd /Users/mrmad/Dhruv/dhruvflutter
flutter run --debug
```

### Step 3: Monitor the Logs

**Frontend (Flutter) should show:**
```
📤 Registering FCM token with backend...
URL: http://10.0.2.2:3000/api/notifications/register-token
Auth Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
✅ FCM token registered with backend successfully
```

**Backend (Node.js) should show:**
```
📱 FCM token registered for user email@example.com
   Token length: 152
   Token preview: eF-8XM_Sv:APA91...o_2BVxZp
   Platform: android
```

### Step 4: Test Notification

Now send a test notification:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🧪 Test Notification",
    "message": "Testing FCM with local backend"
  }'
```

**Backend should show:**
```
📤 Attempting to send FCM notification to user xxxxx
   Token preview: eF-8XM_Sv:APA91...o_2BVxZp
✅ FCM push notification sent to user xxxxx: Test Notification
```

**Phone should receive the notification!** 📲

---

## 🔧 URL Reference

| Environment | URL | Use Case |
|-------------|-----|----------|
| Android Emulator | `http://10.0.2.2:3000/api` | Testing on emulator |
| Physical Device (same network) | `http://192.168.1.X:3000/api` | Testing on real phone |
| Production | `https://lovy-dusky.vercel.app/api` | Production deployment |

---

## 📝 Files Modified

1. **`lib/firebase_msg.dart`** - Updated `apiBaseUrl` to use local backend

---

## 🧪 Full Testing Flow

1. ✅ Backend running
2. ✅ App rebuilt with local backend URL
3. ✅ App generates valid FCM token
4. ✅ Token automatically registered to `/api/notifications/register-token`
5. ✅ Test notification sent
6. ✅ Notification appears on device

---

## ⚠️ Important Notes

- **10.0.2.2** is the Android emulator's way of accessing localhost
- **Physical devices** on the same network can use `192.168.1.X:3000` (replace X with your machine's IP)
- If backend is on a different machine, use that machine's IP address
- Make sure your firewall allows connections on port 3000

---

## Quick Command Reference

```bash
# Start backend
cd /Users/mrmad/Dhruv/dhruvbackend && npm start

# Start app (in another terminal)
cd /Users/mrmad/Dhruv/dhruvflutter && flutter run --debug

# Check Firebase setup
node check-firebase-setup.js

# Check registered tokens
node check-fcm-tokens.js

# Verify backend health
curl http://localhost:3000/api/fcm/health
```

---

**Status:** Ready to test! The app should now properly register tokens with your local backend.
