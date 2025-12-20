# 🔴 FCM Messaging Debug Guide

## Overview
This guide helps you debug FCM (Firebase Cloud Messaging) issues in the messaging system. All debug logs are prefixed with `🔴 [DEBUG-*]` for easy filtering.

---

## Debug Log Locations

### Backend (Node.js)

#### 1. **Conversation Controller** (`src/modules/conversations/conversation.controller.js`)
- **Prefix**: `🔴 [DEBUG-FCM]`
- **Location**: `sendMessage()` function (line ~240)
- **What it logs**:
  - Recipient ID and type
  - Notification parameters
  - FCM result status
  - Success/failure count
  - Error details

```bash
# Example log output:
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
🔴 [DEBUG-FCM] Recipient ID: <user_id>
🔴 [DEBUG-FCM] Notification Params:
  - Template: "messageReceived"
  - Sender Name: John Doe
  - Message Preview: Hello there!
🔴 [DEBUG-FCM] FCM Result: { success: true, sent: 1, failed: 0 }
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION END =====
```

#### 2. **Notification Utils** (`src/modules/notification/notification.utils.js`)
- **Prefix**: `🔴 [DEBUG-UTIL]` and `🔴 [DEBUG-TEMPLATE]`
- **Key Functions**:

##### sendToUser()
- **Location**: Line ~20
- **What it logs**:
  - User ID
  - Firebase initialization status ⚠️ **CRITICAL**
  - Number of tokens found
  - Token details (first 30 chars + ...)
  - Device types (iOS, Android, Web)
  - Active token status
  - Message details for each token
  - Send success/failure count

```bash
🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] User ID: <user_id>
🔴 [DEBUG-UTIL] Firebase Initialized: true ← MUST BE TRUE!
🔴 [DEBUG-UTIL] Found 2 FCM tokens
🔴 [DEBUG-UTIL] Token Details:
  [0] Token: abc123def456ghi789...
  [0] Device Type: android
  [0] Active: true
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 2
  - Successfully sent: 2
  - Failed: 0
🔴 [DEBUG-UTIL] ===== sendToUser END =====
```

##### sendTemplatedNotification()
- **Location**: Line ~215
- **What it logs**:
  - Template name being used
  - Template arguments
  - Available templates (if template not found)
  - Template result
  - Final notification data

```bash
🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
🔴 [DEBUG-TEMPLATE] Template Name: messageReceived
🔴 [DEBUG-TEMPLATE] ✅ Template found, calling with args...
🔴 [DEBUG-TEMPLATE] Template result: { title: "...", body: "..." }
```

### Flutter (Dart)

#### 1. **API Messaging Service** (`lib/features/messaging/services/api_messaging_service.dart`)
- **Prefix**: `🔴 [DEBUG-FLUTTER]`
- **Location**: `fetchConversations()` and `sendMessage()` functions
- **What it logs**:
  - Auth token presence
  - Request/Response status codes
  - Request headers and body
  - Response body length
  - Parse success/failure

```bash
🔴 [DEBUG-FLUTTER] ===== sendMessage START =====
🔴 [DEBUG-FLUTTER] Conversation ID: <conv_id>
🔴 [DEBUG-FLUTTER] Auth Token Present: true
🔴 [DEBUG-FLUTTER] Response Status: 201
✅ [DEBUG-FLUTTER] Message sent successfully
```

---

## 🔍 Common Debug Scenarios

### Scenario 1: No FCM Tokens Found

**Problem**: 
```
🔴 [DEBUG-UTIL] ⚠️  No tokens found for user: <user_id>
```

**Causes**:
1. User hasn't registered their FCM token
2. Token was deleted (invalid/expired)
3. Wrong user ID being passed

**Fix**:
1. Check if user has called `registerFcmToken()` on Flutter app
2. Verify token exists in `UserFcmToken` collection in MongoDB:
   ```bash
   db.UserFcmToken.find({ userId: "<user_id>" })
   ```
3. Check if token is marked as active: `isActive: true`

---

### Scenario 2: Firebase Not Initialized

**Problem**:
```
🔴 [DEBUG-UTIL] Firebase Initialized: false
```

**Causes**:
1. Firebase credentials file missing
2. Credentials file not loaded properly
3. Firebase config error

**Fix**:
1. Ensure `firebase-service-account.json` exists in `/src/modules/notification/`
2. Check `.env` has `FIREBASE_PROJECT_ID`
3. Restart server and check logs

---

### Scenario 3: FCM Send Fails with Error

**Problem**:
```
🔴 [DEBUG-UTIL] FCM error code: messaging/invalid-registration-token
🔴 [DEBUG-UTIL] FCM error message: Invalid registration token provided
```

**Causes**:
1. Token is expired/invalid
2. Token was revoked
3. Different Firebase project

**Common Error Codes**:
| Code | Meaning | Action |
|------|---------|--------|
| `invalid-registration-token` | Token is invalid | Delete and re-register |
| `registration-token-not-registered` | Token doesn't exist in FCM | Delete from DB |
| `mismatched-credential` | Wrong Firebase project | Check `google-services.json` in Flutter |
| `message-rate-exceeded` | Sending too many messages | Wait and retry |

---

### Scenario 4: Message Sent But No Notification Received

**Problem**:
```
✅ [DEBUG-UTIL] FCM send successful. Response ID: <msg_id>
```
But user doesn't receive notification.

**Debug Steps**:
1. Check Flutter is properly set up for FCM handling:
   ```dart
   // In main.dart or Firebase setup
   FirebaseMessaging.onMessage.listen((message) {
     print('🟢 [RECEIVED] Foreground notification: ${message.data}');
   });
   ```

2. Check if notification handling is implemented:
   - Look for `onMessageOpenedApp` listener
   - Look for `getInitialMessage()` call
   - Check notification permission granted on device

3. Check device logs:
   ```bash
   # iOS
   Console.app → Search for app name
   
   # Android
   adb logcat | grep firebase
   ```

---

## 🚀 How to Use Debug Logs

### Filter Backend Logs
```bash
# Terminal 1: Run backend
npm start 2>&1 | grep "🔴"

# Terminal 2: In another tab
# Send a message via API
curl -X POST ... # Your message API call
```

### Filter Flutter Logs
```bash
# Terminal: Run Flutter
flutter run --verbose 2>&1 | grep "🔴"

# Or in VS Code Debug Console
# Just look for lines starting with 🔴
```

### Real-Time Monitoring Stack
```bash
# Monitor all FCM flow end-to-end
# Terminal 1: Backend
npm start 2>&1 | grep -E "🔴|✅|❌"

# Terminal 2: Flutter (in separate window)
flutter run 2>&1 | grep -E "🔴|✅|❌"

# Terminal 3: Check MongoDB
watch 'db.UserFcmToken.find({ userId: "<your_id>" }).pretty()'
```

---

## 🔐 Security Checks

### Checklist Before Testing
- [ ] Firebase credentials file exists
- [ ] Firebase project ID in `.env`
- [ ] User has active FCM token in `UserFcmToken` collection
- [ ] Auth token is valid and not expired
- [ ] Conversation participants are correct
- [ ] Message body is not empty
- [ ] Recipient user ID exists

---

## 📊 Complete Message Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUTTER (Sender)                         │
│ sendMessage() → API call to /conversations/:id/messages      │
└─────────────────┬───────────────────────────────────────────┘
                  │ (POST with message body)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Receiver Logic)                        │
│ conversation.controller.js → sendMessage()                   │
│ 📨 [MSG] ===== SEND MESSAGE START =====                     │
│ ✅ [MSG] Message created successfully                        │
│                                                              │
│ 🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====          │
│ → for each recipient:                                        │
│   → notificationUtils.sendTemplatedNotification()            │
│     🔴 [DEBUG-TEMPLATE] sendTemplatedNotification START     │
│     → Get template: "messageReceived"                        │
│     → Call sendToUser()                                      │
│       🔴 [DEBUG-UTIL] sendToUser START                      │
│       → Find tokens for recipient                            │
│       → For each token: admin.messaging().send()             │
│       → ✅ [DEBUG-UTIL] FCM send successful                 │
│       🔴 [DEBUG-UTIL] sendToUser END                        │
│     🔴 [DEBUG-TEMPLATE] sendTemplatedNotification END       │
│ 🔴 [DEBUG-FCM] ===== FCM NOTIFICATION END =====            │
│ 📨 [MSG] ===== SEND MESSAGE END =====                       │
└─────────────────┬───────────────────────────────────────────┘
                  │ (Response: 201 with message data)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                  FLUTTER (Receiver)                          │
│ Firebase receives FCM notification                           │
│ 🟢 [RECEIVED] Firebase message handler triggered             │
│ → Update UI with new message                                 │
│ → Show push notification                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Testing Checklist

- [ ] **Backend FCM Setup**
  - [ ] Firebase credentials loaded
  - [ ] Tokens exist in DB
  - [ ] `sendToUser()` logs show tokens found

- [ ] **Message Flow**
  - [ ] Message created successfully
  - [ ] Recipients array has recipient IDs
  - [ ] `sendTemplatedNotification()` called

- [ ] **Token Validation**
  - [ ] Tokens are marked as active
  - [ ] Tokens are for correct user
  - [ ] Device type is set

- [ ] **Flutter Notification Handling**
  - [ ] Firebase message handlers registered
  - [ ] Notification permission granted
  - [ ] Device logs show message received

---

## 📝 Quick Command Reference

```bash
# Backend: Check Firebase config
cat src/modules/notification/config/firebase.js | grep -E "initialized|admin"

# MongoDB: Find tokens for user
db.UserFcmToken.find({ userId: "<user_id>" }).pretty()

# MongoDB: Check active tokens count
db.UserFcmToken.countDocuments({ isActive: true })

# Server Logs: Filter FCM only
npm start 2>&1 | grep "DEBUG-FCM"

# Flutter: Filter FCM only
flutter run 2>&1 | grep "DEBUG-FLUTTER"
```

---

## 🐛 Debug Example: Full Flow

**Step 1: Send message from Flutter**
```dart
// Flutter code
await messagingService.sendMessage(
  conversationId: 'conv123',
  senderId: 'user456',
  content: 'Hello World'
);
```

**Backend logs should show:**
```
🔴 [DEBUG-FLUTTER] ===== sendMessage START =====
🔴 [DEBUG-FLUTTER] Conversation ID: conv123
🔴 [DEBUG-FLUTTER] Auth Token Present: true
🔴 [DEBUG-FLUTTER] Response Status: 201
✅ [DEBUG-FLUTTER] Message sent successfully

📨 [MSG] ===== SEND MESSAGE START =====
✅ [MSG] Message created successfully: msgid
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
🔴 [DEBUG-FCM] Recipient ID: user789
🔴 [DEBUG-FCM] Notification Params...
🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] Found 1 FCM tokens
🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
✅ [DEBUG-UTIL] FCM send successful. Response ID: <id>
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 1
  - Failed: 0
✅ [DEBUG-FCM] FCM notification sent successfully to: user789
```

If you see `✅` for FCM send but no notification on device → **Flutter notification handler issue**

---

## Need Help?

1. **Check all `🔴` logs** in the flow above
2. **Look for `❌` errors** - indicates where it failed
3. **Verify `✅` checkmarks** - shows what worked
4. **Match error codes** with the table in Scenario 3
5. **Run the testing checklist** to isolate the issue

