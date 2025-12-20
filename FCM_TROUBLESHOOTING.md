# 🔴 FCM Notification Not Working - Troubleshooting Guide

## 🎯 Quick Diagnosis

When you send a message, look for these logs in the server console:

```
📱 [CONV-FCM] Starting FCM notifications for X recipient(s)
📱 [CONV-FCM] Notifying recipient: xxx
🔴 [DEBUG-UTIL] ===== sendToUser START =====
✅ [CONV-FCM] FCM notification sent to: xxx
```

**If you DON'T see these logs**, follow the troubleshooting steps below.

---

## ❌ Problem 1: Firebase Not Initialized

**Symptom:** Server starts without Firebase warning, but no `[DEBUG-UTIL]` logs appear

### Check Firebase Status

1. **Look for startup message:**
   ```
   ⚠️  Firebase service account not configured. Push notifications will be disabled.
   ```

2. **If you see this, Firebase credentials are missing.**

### Fix Firebase

**Option A: Local Development (Recommended)**
```bash
# Download your Firebase service account JSON from:
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key

# Place the file in your root directory:
cp /path/to/firebase-service-account.json ./firebase-service-account.json
```

**Option B: Production/Deployment**
Set these environment variables:
```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_email@appspot.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
```

**Verify it worked:**
- Restart the server
- You should NOT see the Firebase warning
- When sending messages, you'll see `[DEBUG-UTIL]` logs

---

## ❌ Problem 2: No FCM Tokens Registered

**Symptom:** You see `[CONV-FCM]` logs but then `⚠️ No tokens found for user`

### Check if Tokens Are Registered

```javascript
// Check MongoDB for FCM tokens:
// Collections → UserFcmToken
// Should have documents with: userId, token, deviceType

// From your client app, make sure you call:
POST /api/notification/register-token
{
  "token": "the_fcm_token_from_firebase",
  "userId": "user_id",
  "deviceType": "ios"  // or "android" or "web"
}
```

### Register FCM Tokens for Testing

**Via cURL:**
```bash
curl -X POST http://localhost:5000/api/notification/register-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "sample_fcm_token_12345",
    "userId": "690bcb90264fa29974e8e184",
    "deviceType": "ios"
  }'
```

**Then verify:**
- Check MongoDB UserFcmToken collection
- You should see a new document
- When sending messages, FCM notification should be sent

---

## ✅ Full Working Setup Checklist

- [ ] **Firebase Credentials Configured**
  - [x] Service account JSON in root, OR
  - [x] Environment variables set
  
- [ ] **FCM Tokens Registered**
  - [x] User A has FCM token registered
  - [x] User B has FCM token registered
  
- [ ] **Test Message Send**
  - [x] User A sends message to User B
  - [x] Check server logs for `[CONV-FCM]` messages
  - [x] Should see: "✅ [CONV-FCM] FCM notification sent to: ..."

---

## 📊 Expected Server Logs

### Successful Message with Notification

```
📨 [MSG] Receiver ID: 690bcb90264fa29974e8e184
✅ [MSG] Conversation saved successfully
📱 [CONV-FCM] Starting FCM notifications for 1 recipient(s)
📱 [CONV-FCM] Notifying recipient: 690bcb90264fa29974e8e184
📱 [CONV-FCM] Sender: John Doe Preview: Hello, how are you?

🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] User ID: 690bcb90264fa29974e8e184
🔴 [DEBUG-UTIL] Firebase Initialized: true
🔴 [DEBUG-UTIL] Querying FCM tokens for user: 690bcb90264fa29974e8e184
🔴 [DEBUG-UTIL] Found 1 FCM tokens
🔴 [DEBUG-UTIL] Sending to token: xxx...
✅ [DEBUG-UTIL] FCM send successful. Response ID: abc123
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 1
  - Failed: 0
🔴 [DEBUG-UTIL] ===== sendToUser END =====

📱 [CONV-FCM] Result: {"success":true,"sent":1,"failed":0,"responses":[...]}
✅ [CONV-FCM] FCM notification sent to: 690bcb90264fa29974e8e184
```

---

## 🧪 Debug Steps

### Step 1: Check Firebase Initialization
```javascript
// In server console or terminal:
const firebaseConfig = require('./src/modules/notification/config/firebase');
console.log('Firebase initialized:', firebaseConfig.isInitialized);
```

**Expected:** `Firebase initialized: true`

### Step 2: Check FCM Tokens in Database
```javascript
// In MongoDB shell:
db.userfcmtokens.find()

// Should return documents like:
{
  "_id": ObjectId(...),
  "userId": "690bcb90264fa29974e8e184",
  "token": "xxx_long_fcm_token_xxx",
  "deviceType": "ios",
  "createdAt": ISODate(...),
  "updatedAt": ISODate(...)
}
```

### Step 3: Manually Send a Notification
```bash
curl -X POST http://localhost:5000/api/notification/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "690bcb90264fa29974e8e184",
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

**Expected:** `{"success":true,"sent":1,"responses":[...]}`

---

## 🔍 Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "Firebase not initialized" | Missing credentials | Add firebase-service-account.json |
| "No tokens found for user" | User hasn't registered FCM token | Call `/api/notification/register-token` |
| "messaging/invalid-registration-token" | Token is invalid/expired | Re-register the token |
| "messaging/authentication-error" | Firebase credentials invalid | Check service account JSON |

---

## 📱 Verify on Client Side

### iOS/Flutter Example
```dart
// Get FCM token
String? token = await FirebaseMessaging.instance.getToken();

// Register with backend
POST /api/notification/register-token
{
  "token": token,
  "userId": current_user_id,
  "deviceType": "ios"
}

// Listen for messages
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Got notification: ${message.notification?.title}');
});
```

---

## ✅ After Fixing

1. **Restart the server** to reload Firebase config
2. **Re-register FCM tokens** with new setup
3. **Send a test message** and check logs
4. **Look for:** `✅ [CONV-FCM] FCM notification sent to:`

If you see this message, notifications are working! 🎉

---

**Need more help?**
- Check full logs with: `npm start 2>&1 | grep "CONV-FCM"`
- Verify Firebase: Check [Firebase Console](https://console.firebase.google.com)
- Test endpoint: POST `/api/notification/send` manually
