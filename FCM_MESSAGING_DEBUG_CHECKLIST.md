# 🔍 FCM Messaging Debug Checklist & Setup

## Quick Start

### 1. Backend Setup & Logs
```bash
# Terminal 1: Start backend with debug filter
cd dhruvbackend
npm start 2>&1 | grep -E "🔴|✅|❌"
```

### 2. Send Test Message
- Use the `FCM-Messaging-Debug.postman_collection.json` 
- Run request: **"4️⃣ Send Message (FCM TEST)"**
- Watch Terminal 1 for debug logs

### 3. What You Should See

**✅ SUCCESS** - All these logs should appear:
```
📨 [MSG] ===== SEND MESSAGE START =====
✅ [MSG] Message created successfully
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
🔴 [DEBUG-FCM] Recipient ID: <user_id>
🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] Firebase Initialized: true ← CRITICAL
🔴 [DEBUG-UTIL] Found 1 FCM tokens
🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
✅ [DEBUG-UTIL] FCM send successful. Response ID: <msg_id>
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 1
  - Failed: 0
✅ [DEBUG-FCM] FCM notification sent successfully
📨 [MSG] ===== SEND MESSAGE END =====
```

---

## 📋 Debug Checklist

### Phase 1: Prerequisites
- [ ] Backend running (`npm start`)
- [ ] Firebase credentials file exists: `src/modules/notification/firebase-service-account.json`
- [ ] `.env` has Firebase project ID
- [ ] MongoDB is running
- [ ] Two users exist in system
- [ ] User 2 has at least 1 active FCM token in `UserFcmToken` collection

### Phase 2: Check Firebase Setup
```bash
# Check Firebase config loads
npm start 2>&1 | head -20 | grep -i firebase

# Should show Firebase initialized message
```

- [ ] No Firebase initialization errors
- [ ] `firebase-service-account.json` is valid JSON
- [ ] Project ID matches `.env` file

### Phase 3: Check FCM Tokens in MongoDB
```bash
# Terminal with mongosh
db.UserFcmToken.find({ isActive: true }).pretty()
```

**For each user, check:**
- [ ] `userId`: Valid ObjectId
- [ ] `token`: Long string (FCM token format)
- [ ] `deviceType`: "android", "ios", or "web"
- [ ] `isActive`: `true`
- [ ] `createdAt`: Recent timestamp

**If no tokens:**
- [ ] Run Flutter app on device/emulator
- [ ] Ensure Firebase permissions granted
- [ ] Check `registerFcmToken()` is being called

### Phase 4: Create Test Conversation
**Using Postman: "2️⃣ Create Conversation"**

```bash
# Response should show:
{
  "status": "success",
  "data": {
    "_id": "conv123...",
    "participants": ["user1_id", "user2_id"],
    "createdAt": "2024-12-20T..."
  }
}
```

- [ ] Response status is 201
- [ ] Conversation ID returned
- [ ] Both users in participants
- [ ] Check backend logs for:
  ```
  🔴 [DEBUG-FCM] Conversation started notification...
  ```

### Phase 5: Send Test Message (THE CRITICAL TEST)
**Using Postman: "4️⃣ Send Message (FCM TEST)"**

**Backend Log Analysis:**

1. **Message Creation**
   ```
   📨 [MSG] Message created successfully: <msg_id>
   ```
   - [ ] Message ID is ObjectId
   - [ ] Timestamp is current

2. **FCM Notification Start**
   ```
   🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
   🔴 [DEBUG-FCM] Recipient ID: <user_2_id>
   ```
   - [ ] Recipient ID is User 2's ID
   - [ ] Is correct format

3. **Template Processing**
   ```
   🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
   🔴 [DEBUG-TEMPLATE] Template Name: messageReceived
   🔴 [DEBUG-TEMPLATE] ✅ Template found, calling with args...
   ```
   - [ ] Template "messageReceived" found
   - [ ] No "Template not found" error

4. **Token Lookup** (CRITICAL)
   ```
   🔴 [DEBUG-UTIL] ===== sendToUser START =====
   🔴 [DEBUG-UTIL] Firebase Initialized: true
   🔴 [DEBUG-UTIL] Found 1 FCM tokens
   🔴 [DEBUG-UTIL] Token Details:
     [0] Token: abc123def456...
     [0] Device Type: android
     [0] Active: true
   ```
   - [ ] Firebase Initialized is **TRUE** (if false → Firebase not loaded)
   - [ ] Number of tokens > 0 (if 0 → no tokens for user)
   - [ ] Token is marked as active
   - [ ] Device type is set

5. **FCM Send Attempt**
   ```
   🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
   ✅ [DEBUG-UTIL] FCM send successful. Response ID: <msg_id>
   ```
   - [ ] No error between "Calling" and "successful"
   - [ ] Response ID returned

6. **Summary**
   ```
   🔴 [DEBUG-UTIL] FCM Batch Summary:
     - Total tokens: 1
     - Successfully sent: 1
     - Failed: 0
   ```
   - [ ] Successfully sent > 0
   - [ ] Failed = 0

---

## ❌ Troubleshooting by Error

### Error: "No tokens found for user"
```
🔴 [DEBUG-UTIL] ⚠️  No tokens found for user: <user_id>
```

**Causes & Fixes:**
1. **User hasn't registered token**
   - [ ] Run Flutter app
   - [ ] Check Firebase setup in Flutter
   - [ ] Monitor Flutter logs for FCM registration

2. **Token exists but not active**
   ```bash
   db.UserFcmToken.updateOne(
     { userId: ObjectId("<user_id>") },
     { $set: { isActive: true } }
   )
   ```

3. **Wrong user ID being passed**
   - [ ] Verify recipient ID in conversation
   - [ ] Check ObjectId format
   - [ ] Ensure it's the receiving user, not sender

---

### Error: "Firebase not initialized"
```
🔴 [DEBUG-UTIL] Firebase Initialized: false
```

**Causes & Fixes:**
1. **Firebase credentials missing**
   - [ ] Create `src/modules/notification/firebase-service-account.json`
   - [ ] Download from Firebase Console → Project Settings → Service Accounts
   - [ ] Paste entire JSON (starts with `{` and ends with `}`)

2. **Firebase config loading failed**
   - [ ] Check `src/modules/notification/config/firebase.js` 
   - [ ] Ensure file read permissions
   - [ ] Restart backend: `npm start`

3. **Environment variable missing**
   - [ ] Check `.env` has `FIREBASE_PROJECT_ID=<your_project_id>`
   - [ ] Restart backend

---

### Error: "Invalid registration token"
```
🔴 [DEBUG-UTIL] FCM error code: messaging/invalid-registration-token
```

**Causes & Fixes:**
1. **Token expired**
   - [ ] Old token, user needs to re-register
   - [ ] Delete from DB: `db.UserFcmToken.deleteOne({ token: "<old_token>" })`
   - [ ] Run Flutter app again to register new token

2. **Wrong Firebase project**
   - [ ] Check `google-services.json` in Flutter matches Firebase project
   - [ ] Download fresh from Firebase Console
   - [ ] Rebuild Flutter app

3. **Token corrupted**
   - [ ] Delete token: `db.UserFcmToken.deleteOne({ token: "<token>" })`
   - [ ] Re-register on device

---

### Error: "Message received but no notification on device"
```
✅ [DEBUG-UTIL] FCM send successful
// But user doesn't see notification
```

**Causes & Fixes:**

1. **Firebase message handler not set up in Flutter**
   ```dart
   // Check in main.dart or firebase_setup.dart
   FirebaseMessaging.onMessage.listen((message) {
     print('Foreground notification received');
     // Handle notification
   });
   ```
   - [ ] Handler exists
   - [ ] Handler is registered early (before hot reload)

2. **Notification permission not granted**
   - [ ] Check Settings → App → Permissions → Notifications
   - [ ] Grant permission on device
   - [ ] Restart app

3. **App killed or notifications disabled**
   - [ ] Check Settings → Notifications → App Notifications
   - [ ] Enable for your app
   - [ ] Check "Allow notifications" toggle

4. **Firebase messaging not initialized**
   ```dart
   await FirebaseMessaging.instance.getToken();
   ```
   - [ ] This should return a token
   - [ ] Token should be in database

---

## 🧪 Advanced Testing

### Test with Different Users
```bash
# Terminal 1: Set as User A
AUTH_TOKEN=<user_a_token>

# Terminal 2: Set as User B  
AUTH_TOKEN=<user_b_token>

# Use Postman to:
# 1. User A creates conversation with User B
# 2. User A sends message
# 3. Watch backend logs
# 4. Check User B receives notification
```

### Test with Multiple Tokens
```bash
# Register same user from different devices
# Device 1: Run Flutter app, register token → Should see in DB
# Device 2: Run Flutter app, register token → Should see 2 tokens now

# Send message and verify:
# 🔴 [DEBUG-UTIL] Found 2 FCM tokens
# Both should receive notifications
```

### Stress Test
```bash
# Send 10 messages rapidly
# Watch for rate limiting errors:
# 🔴 [DEBUG-UTIL] FCM error code: messaging/message-rate-exceeded

# If happens, add delay:
# for (const msg of messages) {
#   await sendMessage(msg);
#   await delay(100); // 100ms between messages
# }
```

---

## 📊 Database Queries for Debugging

```bash
# Check all FCM tokens
db.UserFcmToken.find({}).pretty()

# Check tokens for specific user
db.UserFcmToken.find({ userId: ObjectId("<user_id>") }).pretty()

# Check active tokens only
db.UserFcmToken.find({ isActive: true }).pretty()

# Count tokens by device type
db.UserFcmToken.aggregate([
  { $group: { _id: "$deviceType", count: { $sum: 1 } } }
])

# Find expired tokens (older than 30 days)
db.UserFcmToken.find({
  createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
}).pretty()

# Delete invalid tokens
db.UserFcmToken.deleteMany({ token: { $regex: "^invalid" } })
```

---

## 🎬 Video of Complete Flow

**What happens when you send a message:**

1. **Flutter sends**: `POST /api/conversations/{id}/messages`
   - Logs: `🔴 [DEBUG-FLUTTER] Response Status: 201`

2. **Backend receives**: Message saved to DB
   - Logs: `✅ [MSG] Message created successfully`

3. **Backend triggers FCM**: For each recipient
   - Logs: `🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====`

4. **Find recipient's tokens**: Query `UserFcmToken` collection
   - Logs: `🔴 [DEBUG-UTIL] Found X FCM tokens`

5. **Send via Firebase**: `admin.messaging().send(message)`
   - Logs: `✅ [DEBUG-UTIL] FCM send successful`

6. **Firebase delivers**: To recipient's device
   - Device receives notification (if app handling it correctly)

7. **Flutter handles**: Shows notification or updates UI
   - Logs: `🟢 [RECEIVED] Foreground notification`

---

## 📞 Still Having Issues?

**Collect this info:**

1. Backend startup logs (first 50 lines)
2. Log output from sending a test message (all 🔴 logs)
3. MongoDB query result: `db.UserFcmToken.find({}).count()`
4. Flutter console logs when message sent
5. Device notification settings (check app permissions)
6. Firebase project ID and region

Then check:
- [ ] All logs in "What You Should See" section appear
- [ ] No ❌ errors in the flow
- [ ] Firebase Initialized = true
- [ ] Found N FCM tokens (N > 0)
- [ ] Successfully sent = Total tokens

