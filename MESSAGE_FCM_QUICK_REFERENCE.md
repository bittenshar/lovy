# Quick Reference: Message → FCM Notification Flow

## 🎯 What Happens When User A Sends Message to User B?

### Phase 1: Message Creation & Storage
```
User A API Call
  ↓
POST /api/v1/conversations/{conversationId}/messages
  ↓
sendMessage() controller
  ↓
1. Validate user is conversation participant ✓
2. Create Message document in DB ✓
3. Update Conversation (lastMessage, unreadCount) ✓
4. Create Notification record ✓
```

### Phase 2: FCM Notification (Async - Non-blocking)
```
Immediately AFTER response sent:
  ↓
Get Receiver ID from conversation participants
  ↓
Call: conversationFcmUtils.notifyNewMessage(receiverId, ...)
  ↓
Call: notificationUtils.sendTemplatedNotification(receiverId, ...)
  ↓
Call: notificationUtils.sendToUser(receiverId, notificationData)
  ↓
QUERY DATABASE:
  UserFcmToken.findOne({ userId: receiverId })
  ↓
  Result: { userId, tokens: [ { token, deviceType, isActive }, ... ] }
  ↓
Filter to active tokens only
  ↓
For EACH active token:
  - Build Firebase message with title, body, data
  - Send via Firebase Admin SDK
  - Handle success/error
  ↓
Return: { success: true, sent: count, failed: count }
  ↓
User B receives notification on all active devices ✓
```

## 📊 Database Tables Involved

### 1. messages
```javascript
{
  _id: ObjectId,
  conversation: ObjectId,      // Links to conversation
  sender: ObjectId,             // User who sent
  body: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. conversations
```javascript
{
  _id: ObjectId,
  participants: [ObjectId],     // User IDs
  lastMessage: ObjectId,
  lastMessageText: String,
  lastMessageSenderId: ObjectId,
  lastMessageTime: Date,
  unreadCount: Map {
    "userId1": 0,
    "userId2": 3              // Receiver has 3 unread
  },
  title: [
    { role: "employee", name: "John" },
    { role: "worker", name: "Jane" }
  ],
  updatedAt: Date
}
```

### 3. notifications
```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // Receiver ID
  title: String,                // Sender name
  body: String,                 // Message preview
  type: "message",
  data: {
    conversationId: String,
    messageId: String,
    senderId: String,
    senderName: String,
    messagePreview: String,
    messageFull: String
  },
  relatedId: ObjectId,
  read: Boolean,
  createdAt: Date
}
```

### 4. userfcmtokens ⭐ (CRITICAL FOR FCM)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // User who owns tokens
  tokens: [
    {
      token: String,            // FCM token from Firebase SDK
      deviceType: String,       // "android", "ios", "web"
      isActive: Boolean,        // true = send notifications
      createdAt: Date,
      updatedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔍 Data Flow Example

### User IDs
- Sender: `611a4b5f6d4e8a001f5e8a01`
- Receiver: `622b5c6f7e5f9b002g6f9b02`

### Step-by-Step Example

**1. User A sends message:**
```javascript
POST /api/v1/conversations/630c6d7g8f6g0c003h7g0c03/messages
Headers: { Authorization: "Bearer sender_token" }
Body: { body: "Hello User B!" }
```

**2. Message created in DB:**
```javascript
messages collection:
{
  _id: ObjectId("640d7e8h9g7h1d004i8h1d04"),
  conversation: ObjectId("630c6d7g8f6g0c003h7g0c03"),
  sender: ObjectId("611a4b5f6d4e8a001f5e8a01"),  // User A
  body: "Hello User B!",
  createdAt: 2025-12-22T15:30:00Z
}
```

**3. Conversation updated:**
```javascript
conversations collection - FIND: 630c6d7g8f6g0c003h7g0c03
UPDATES:
  lastMessage: ObjectId("640d7e8h9g7h1d004i8h1d04")
  lastMessageText: "Hello User B!"
  lastMessageSenderId: ObjectId("611a4b5f6d4e8a001f5e8a01")
  lastMessageTime: 2025-12-22T15:30:00Z
  
  unreadCount = Map {
    "611a4b5f6d4e8a001f5e8a01": 0,      // Sender's count = 0
    "622b5c6f7e5f9b002g6f9b02": 5       // Receiver's count = 5
  }
```

**4. Notification record created:**
```javascript
notifications collection:
{
  userId: ObjectId("622b5c6f7e5f9b002g6f9b02"),  // Receiver
  title: "John Doe",                              // Sender name
  body: "Hello User B!",                          // Message preview
  type: "message",
  data: {
    conversationId: "630c6d7g8f6g0c003h7g0c03",
    messageId: "640d7e8h9g7h1d004i8h1d04",
    senderId: "611a4b5f6d4e8a001f5e8a01",
    senderName: "John Doe"
  },
  read: false
}
```

**5. Query receiver's FCM tokens:**
```javascript
// Query database
db.userfcmtokens.findOne({ 
  userId: "622b5c6f7e5f9b002g6f9b02" 
})

// Result:
{
  _id: ObjectId("650e9g0i0h8i2e005j9i2e05"),
  userId: "622b5c6f7e5f9b002g6f9b02",  // Receiver ID
  tokens: [
    {
      token: "cfkDjSEsHlU:APA91bGy2mH...",  // Android phone
      deviceType: "android",
      isActive: true
    },
    {
      token: "e5_TlsGn_-Y:APA91bJx3qK...",  // Web browser
      deviceType: "web",
      isActive: true
    },
    {
      token: "fGlEmTfGo_Z:APA91bKz4rL...",  // iOS (logged out)
      deviceType: "ios",
      isActive: false
    }
  ]
}
```

**6. Filter active tokens (isActive = true):**
```javascript
Active tokens = [
  { token: "cfkDjSEsHlU:APA91bGy...", deviceType: "android", isActive: true },
  { token: "e5_TlsGn_-Y:APA91bJx3...", deviceType: "web", isActive: true }
]
// Total: 2 active tokens to send to
```

**7. Send Firebase message to each token:**

**Token 1 (Android):**
```javascript
{
  token: "cfkDjSEsHlU:APA91bGy2mH...",
  notification: {
    title: "John Doe",
    body: "Hello User B!"
  },
  data: {
    type: "new_message",
    action: "open_conversation",
    conversationId: "630c6d7g8f6g0c003h7g0c03",
    messageId: "640d7e8h9g7h1d004i8h1d04",
    senderId: "611a4b5f6d4e8a001f5e8a01",
    senderName: "John Doe",
    messagePreview: "Hello User B!"
  },
  android: {
    notification: {
      title: "John Doe",
      body: "Hello User B!",
      imageUrl: "..."
    }
  }
}
```
→ Firebase sends to User B's Android phone ✓

**Token 2 (Web):**
```javascript
{
  token: "e5_TlsGn_-Y:APA91bJx3qK...",
  notification: {
    title: "John Doe",
    body: "Hello User B!"
  },
  data: { ... same as above ... },
  webpush: {
    notification: {
      title: "John Doe",
      body: "Hello User B!",
      icon: "...",
      image: "..."
    }
  }
}
```
→ Firebase sends to User B's web browser ✓

**Token 3 (iOS - Skipped):**
```javascript
// NOT SENT because isActive = false
```

**8. Result:**
```javascript
{
  success: true,
  sent: 2,        // Sent to 2 tokens
  failed: 0,
  responses: [
    { token: "cfkDjSEsHlU:...", status: "sent", response: "1234567890" },
    { token: "e5_TlsGn_-Y:...", status: "sent", response: "0987654321" }
  ]
}
```

**Result: User B receives notifications on Android phone AND web browser! ✅**

## 🐛 Troubleshooting

### Receiver not receiving messages?

| Problem | Check | Solution |
|---------|-------|----------|
| No FCM tokens found | Query: `db.userfcmtokens.findOne({ userId: receiverId })` | Receiver must login and register FCM token |
| Tokens found but not active | Check `isActive` field | Mark tokens as active or re-register |
| Firebase not initialized | Check server logs for `Firebase Initialized: false` | Verify `firebase-service-account.json` exists |
| Invalid token error | Check Firebase error logs | Tokens may be expired, will auto-delete |
| No notification record | Check notifications collection | Database write may have failed |

## ✅ Verification Checklist

- [ ] Receiver has logged in on a device (mobile/web)
- [ ] Receiver's FCM token is in `userfcmtokens` collection
- [ ] Token has `isActive: true`
- [ ] Firebase service account JSON is valid
- [ ] Message sent successfully (HTTP 201)
- [ ] Notification record created in DB
- [ ] Check server logs for `[CONV-FCM]` messages
- [ ] Device receives notification within 1-5 seconds

## 📝 Key Code Locations

| File | Function | Purpose |
|------|----------|---------|
| `conversation.controller.js` | `sendMessage()` | Handles message creation & initiates FCM |
| `fcm.conversation.utils.js` | `notifyNewMessage()` | Prepares notification data |
| `notification.utils.js` | `sendToUser()` | **Queries userfcmtokens, sends to each token** |
| `notification.utils.js` | `sendTemplatedNotification()` | Uses templates & calls sendToUser |
| `UserFcmToken.model.js` | Schema | Stores tokens for each user |

## 🚀 Testing

```bash
# Run complete flow test
node test-message-fcm-flow.js

# Check health of user's FCM setup
curl http://localhost:3000/api/v1/conversations/fcm-health-check/{userId}

# Manual database check
mongo
use dhruv
db.userfcmtokens.findOne({ userId: ObjectId("...") })
```
