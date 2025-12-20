# Conversation Notifications Fix & Debug Guide

## Problem Identified & Fixed ✅

**Issue**: Firebase was not initializing, preventing FCM notifications from being sent to users in conversations.

### Root Cause
The Firebase configuration file loader was using an incorrect path resolution strategy that failed in serverless environments (Vercel). The `require()` method was also problematic for JSON files.

### Solution Applied
1. **Fixed Firebase Initialization** (`src/modules/notification/config/firebase.js`):
   - Changed from using `require()` to `fs.readFileSync()` for JSON parsing (more reliable)
   - Added multiple path resolution strategies:
     - Relative to the config file itself
     - Relative to `process.cwd()` (project root)
     - Absolute path for serverless environments
   - Added detailed logging for troubleshooting

2. **Updated UserFcmToken Model** (`src/modules/notification/UserFcmToken.model.js`):
   - Added missing `isActive` field (Boolean, default: true)
   - Added `index` for better query performance
   - Added default `deviceType`

## How Conversation Notifications Work

### Flow Diagram
```
User sends message in conversation
    ↓
Message saved to database
    ↓
Conversation metadata updated (lastMessage, timestamp, etc.)
    ↓
For each recipient: Send FCM notification async
    ├─ Fetch recipient's FCM tokens from UserFcmToken collection
    ├─ Build notification from template (messageReceived)
    ├─ Call admin.messaging().send() for each token
    └─ Handle errors (delete invalid tokens, etc.)
```

### Key Components

#### 1. Message Creation (`src/modules/conversations/conversation.controller.js`)
- When `POST /conversations/:conversationId/messages` is called
- Message is created with: `conversation`, `sender`, `body`
- Notification triggered in async block (doesn't block response)

#### 2. FCM Notification Utils (`src/modules/conversations/fcm.conversation.utils.js`)
- `notifyNewMessage()`: Sends template-based notification
- `notifyConversationStarted()`: Sends when conversation created
- Uses `notificationUtils.sendTemplatedNotification()`

#### 3. Notification Utils (`src/modules/notification/notification.utils.js`)
- `sendTemplatedNotification()`: Loads template + calls `sendToUser()`
- `sendToUser()`: Actual FCM sending logic
  - Checks if Firebase is initialized
  - Queries FCM tokens for user
  - Sends to each token
  - Handles platform-specific configs (web, android, ios)
  - Deletes invalid tokens automatically

#### 4. FCM Token Registration (`src/modules/notification/notification.controller.js`)
- `POST /notifications/register-token` endpoint
- Accepts: `token`, `userId`, `deviceId`, `deviceType`
- Uses upsert to handle token updates

## Testing the Complete Flow

### Step 1: Verify Firebase Initialization
```bash
curl -X GET "https://lovy-dusky.vercel.app/api/conversations/fcm-check/{userId}" \
  -H "Authorization: Bearer {token}"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "firebaseInitialized": true,      // ✅ This should be TRUE now
    "tokensFound": 1,                 // Should be > 0 if token registered
    "recommendation": "✅ 1 active token(s) - FCM should work"
  }
}
```

### Step 2: Register FCM Token
**Endpoint**: `POST /notifications/register-token`

**Request**:
```json
{
  "token": "YOUR_FCM_TOKEN",
  "userId": "690bcb90264fa29974e8e184",
  "deviceId": "device-123",
  "deviceType": "web"  // or "android", "ios"
}
```

**Response**:
```json
{
  "success": true,
  "message": "FCM token registered"
}
```

### Step 3: Send a Message in Conversation
**Endpoint**: `POST /conversations/{conversationId}/messages`

**Request**:
```json
{
  "body": "Hello, this is a test message!"
}
```

**Expected Behavior**:
1. Message is saved to database immediately
2. Response returns with the created message
3. In the background, FCM notification is sent to recipient(s)
4. Server logs show notification flow:
   ```
   📱 [CONV-FCM] ===== STARTING ASYNC FCM NOTIFICATIONS =====
   📱 [CONV-FCM] Notifying recipient: {recipientId}
   📱 [CONV-FCM] About to call notifyNewMessage
   🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
   🔴 [DEBUG-UTIL] ===== sendToUser START =====
   ✅ [DEBUG-UTIL] FCM send successful
   📱 [CONV-FCM] ===== ASYNC FCM NOTIFICATIONS COMPLETE =====
   ```

## Debug Checklist

### ❌ No Tokens Found
- **Issue**: User hasn't registered an FCM token
- **Fix**: Call `POST /notifications/register-token` first
- **Check**: Verify token is saved in `UserFcmToken` collection

### ❌ Firebase not initialized
- **Issue**: Service account credentials missing/invalid
- **Fix**: Ensure `firebase-service-account.json` exists in project root
- **Check**: Run: `node -e "const fc = require('./src/modules/notification/config/firebase'); console.log('Firebase:', fc.isInitialized)"`

### ❌ Tokens Found but Notifications Not Received
- **Possible Causes**:
  1. Token is expired/invalid → auto-deleted
  2. App not properly listening for FCM messages
  3. Browser notification permissions denied
- **Fix**: 
  - Re-register token: `POST /notifications/register-token`
  - Check browser console for FCM service worker errors
  - Allow notifications when prompted

### ❌ Error: "Template not found"
- **Issue**: Template name doesn't match available templates
- **Available Templates**: Check `src/modules/notification/constant/templates.js`
- **Current Templates**: `messageReceived`, `conversationStarted`

## Code Changes Summary

### File 1: `src/modules/notification/config/firebase.js`
- ✅ Fixed path resolution (multiple strategies)
- ✅ Changed from `require()` to `fs.readFileSync()`
- ✅ Added comprehensive logging
- ✅ Better error handling

### File 2: `src/modules/notification/UserFcmToken.model.js`
- ✅ Added `isActive` field
- ✅ Added `index` for performance
- ✅ Added default `deviceType`

## Related Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/notifications/register-token` | Register/update FCM token |
| GET | `/conversations/fcm-check/:userId` | Check Firebase & tokens |
| POST | `/conversations` | Create conversation |
| POST | `/conversations/:conversationId/messages` | Send message (triggers notification) |
| GET | `/conversations/:conversationId/messages` | Get conversation messages |

## Monitoring & Logs

### Server Logs to Watch
- `[FIREBASE-INIT]`: Firebase initialization status
- `[CONV-FCM]`: Conversation FCM flow
- `[DEBUG-TEMPLATE]`: Template loading
- `[DEBUG-UTIL]`: FCM send details
- `❌`: Error indicators

### Database Collections
- `userfcmtokens`: Stores user FCM tokens
- `conversations`: Conversation metadata
- `messages`: Actual message content

## Next Steps

1. ✅ Firebase is now properly initialized
2. ⏭️ Test with actual FCM tokens from mobile apps
3. ⏭️ Monitor server logs during message sends
4. ⏭️ Track notification delivery rates
5. ⏭️ Implement notification analytics if needed

## Support

If notifications still don't work:
1. Check `fcm-check` endpoint shows `firebaseInitialized: true`
2. Verify `tokensFound > 0`
3. Check server logs during message send
4. Verify template exists in `notification/constant/templates.js`
5. Check Firebase credentials are valid
