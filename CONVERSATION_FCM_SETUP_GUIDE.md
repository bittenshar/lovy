# 📱 Conversation FCM Notifications - Integration Guide

## ✅ Implementation Complete

Your conversation module now has **dedicated FCM notification utilities** to automatically send push notifications when users send messages.

---

## 🎯 How It Works

### 1. **New Message Notification**
When User A sends a message to User B in a conversation:

```
User A sends message
    ↓
Message saved to DB
    ↓
Conversation updated
    ↓
conversationFcmUtils.notifyNewMessage() called
    ↓
FCM sends push to User B's device(s)
    ↓
"💬 New Message: User A: {message preview}"
```

### 2. **Conversation Started Notification**
When a new conversation is created:

```
User A creates conversation with User B
    ↓
Conversation saved to DB
    ↓
conversationFcmUtils.notifyConversationStarted() called
    ↓
FCM sends push to User B
    ↓
"👋 New Conversation: User A started a conversation with you"
```

---

## 📁 Files Created/Modified

### New Files:
- **`src/modules/conversations/fcm.conversation.utils.js`** - Dedicated FCM utilities for conversations

### Modified Files:
- **`src/modules/conversations/conversation.controller.js`** - Updated to use new FCM utility

### Existing Utilities (Already in place):
- **`src/modules/notification/notification.utils.js`** - Core FCM sending logic
- **`src/modules/notification/constant/templetes.js`** - Message templates

---

## 🔧 Available Functions

### `notifyNewMessage(recipientId, senderName, messagePreview, conversationId, messageId, messageFull)`

Sends a new message notification to a recipient.

**Parameters:**
- `recipientId` (string): User ID of the recipient
- `senderName` (string): Display name of the sender
- `messagePreview` (string): First 50 characters of the message
- `conversationId` (string): ID of the conversation
- `messageId` (string): ID of the message
- `messageFull` (string): Full message (up to 150 chars)

**Returns:** 
```javascript
{
  success: true,
  sent: 1,      // Number of notifications sent
  failed: 0,
  responses: [...]
}
```

### `notifyConversationStarted(recipientId, initiatorName, conversationId)`

Sends a conversation started notification.

**Parameters:**
- `recipientId` (string): User ID of the recipient
- `initiatorName` (string): Display name of the conversation initiator
- `conversationId` (string): ID of the conversation

**Returns:** Same as `notifyNewMessage()`

### `notifyMultipleNewMessages(recipientIds, senderName, messagePreview, conversationId, messageId, messageFull)`

Batch notification for multiple recipients.

**Parameters:** Same as `notifyNewMessage()` but `recipientIds` is an array

**Returns:** Array of results for each recipient

---

## 🚀 Usage Examples

### In Conversation Controller (Already Implemented):

```javascript
const conversationFcmUtils = require('./fcm.conversation.utils');

// When message is sent:
const fcmResult = await conversationFcmUtils.notifyNewMessage(
  recipientId.toString(),
  senderDisplayName,
  messagePreview,
  conversation._id.toString(),
  message._id.toString(),
  messageFull
);

if (fcmResult.success && fcmResult.sent > 0) {
  console.error('✅ [CONV-FCM] FCM notification sent to:', recipientId);
}
```

---

## 🔐 Requirements

### Firebase Configuration
Ensure Firebase is configured with:
- `firebase-service-account.json` in root directory, OR
- Environment variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_PRIVATE_KEY_ID`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_CLIENT_ID`
  - `FIREBASE_CLIENT_X509_CERT_URL`

### FCM Token Registration
Users must register FCM tokens before notifications can be sent:

```javascript
POST /api/notification/register-token
{
  "token": "device_fcm_token",
  "userId": "user_id",
  "deviceId": "device_id",
  "deviceType": "ios|android|web"
}
```

---

## 🧪 Testing

### Manual Test Steps:

1. **Register FCM tokens for both users:**
```bash
curl -X POST http://localhost:5000/api/notification/register-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "valid_fcm_token",
    "userId": "user_a_id",
    "deviceType": "ios"
  }'
```

2. **Create a conversation:**
```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Authorization: Bearer user_a_token" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["user_b_id"]
  }'
```

3. **Send a message:**
```bash
curl -X POST http://localhost:5000/api/conversations/:conversationId/messages \
  -H "Authorization: Bearer user_a_token" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Hello! This is a test message."
  }'
```

4. **Check server logs:**
```
✅ [CONV-FCM] FCM notification sent to: user_b_id
```

---

## 📊 Notification Payload

When a message is sent, the FCM payload includes:

```javascript
{
  notification: {
    title: "💬 New Message",
    body: "John: Hello, how are you?"
  },
  data: {
    type: "new_message",
    action: "open_conversation",
    conversationId: "conv_123",
    messageId: "msg_456",
    senderId: "user_a",
    senderName: "John Doe",
    messagePreview: "Hello, how are you?",
    messageFull: "Hello, how are you? I hope you're doing well...",
    timestamp: "2025-12-20T10:30:00Z"
  }
}
```

---

## ⚠️ Troubleshooting

### No notifications received?

1. **Check Firebase initialization:**
   ```javascript
   const firebaseConfig = require('./src/modules/notification/config/firebase');
   console.log('Firebase initialized:', firebaseConfig.isInitialized);
   ```

2. **Verify FCM tokens exist:**
   ```javascript
   const UserFcmToken = require('./models/fcmToken');
   const tokens = await UserFcmToken.find({ userId: 'user_id' });
   console.log('User has', tokens.length, 'FCM tokens');
   ```

3. **Check server logs** for `[CONV-FCM]` messages during message send

4. **Verify token validity** - invalid/expired tokens are automatically deleted

5. **Check internet connection** - both server and client need connectivity

---

## 📝 Next Steps

1. ✅ **Verify Firebase credentials** are configured
2. ✅ **Register FCM tokens** for test users
3. ✅ **Test message sending** between two users
4. ✅ **Monitor logs** for `[CONV-FCM]` messages
5. **Optional:** Customize notification title/body in `src/modules/notification/constant/templetes.js`

---

## 🤝 Support

For debugging, enable detailed logging by checking server console for:
- `[CONV-FCM]` - Conversation FCM utility messages
- `[DEBUG-UTIL]` - Core FCM utility debug info
- `[DEBUG-TEMPLATE]` - Template processing debug info

All debug logs are sent to `stderr` for easy filtering:
```bash
npm start 2>&1 | grep "CONV-FCM"
```

---

**Status:** ✅ Ready for testing
