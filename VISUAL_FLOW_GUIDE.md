# Visual Guide - Message to FCM Notification Flow

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER A (Sender)                              │
│                  Sends Message                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │   API Request                         │
        │  POST /conversations/{id}/messages   │
        │  Body: { body: "Hello!" }            │
        └──────────────────────┬───────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────┐
        │  conversation.controller.js           │
        │  sendMessage() Function              │
        └──────────────────────┬───────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
   ┌─────────────────┐                      ┌──────────────────┐
   │ 1. Validate     │                      │ 2. Create Message│
   │    User in      │                      │    in messages   │
   │    conversation │                      │    collection    │
   └────────┬────────┘                      └────────┬─────────┘
            │                                        │
            └───────────────┬──────────────────────┬─┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ 3. Update          │
                   │    Conversation:   │
                   │    - lastMessage   │
                   │    - unreadCount++ │
                   │    - lastMessageSenderId
                   │    - updatedAt     │
                   └────────┬───────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ 4. Create          │
                   │    Notification    │
                   │    record          │
                   │    in notifications│
                   │    collection      │
                   └────────┬───────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Send HTTP Response (201)    │
              │ Return message object       │
              └────────┬────────────────────┘
                       │
       ┌───────────────┘
       │
       │ ⏲️  Non-blocking (Async)
       │
       ▼
  ┌──────────────────────────────────────┐
  │ 5. Get receiver ID from participants │
  │    receiverId = OTHER participant    │
  └──────────────────┬───────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────┐
  │ 6. Call FCM Utilities                │
  │ conversationFcmUtils.notifyNewMessage│
  │   (receiverId, senderName, ...)      │
  └──────────────────┬───────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────┐
  │ 7. Send Templated Notification       │
  │ notificationUtils.sendTemplated...() │
  │   (receiverId, "messageReceived", ...)
  └──────────────────┬───────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────┐
  │ 8. Core Send Function                │
  │ notificationUtils.sendToUser()       │
  │   (receiverId, notificationData)     │
  └──────────────────┬───────────────────┘
                     │
                     ▼
  ┌────────────────────────────────────────────┐
  │ 9. QUERY userfcmtokens Collection          │
  │    ✅ FIXED: findOne() + filter()          │
  │                                             │
  │    Query:                                  │
  │    UserFcmToken.findOne({                 │
  │      userId: receiverId                   │
  │    })                                      │
  │                                             │
  │    Returns:                                │
  │    {                                       │
  │      userId: "622b5c...",                │
  │      tokens: [                            │
  │        {                                  │
  │          token: "cfkDj...",              │
  │          deviceType: "android",          │
  │          isActive: true                 │
  │        },                                │
  │        {                                  │
  │          token: "e5_Tl...",              │
  │          deviceType: "web",              │
  │          isActive: true                 │
  │        },                                │
  │        {                                  │
  │          token: "fGlEm...",              │
  │          deviceType: "ios",              │
  │          isActive: false  ← SKIP         │
  │        }                                  │
  │      ]                                    │
  │    }                                       │
  └────────────────┬─────────────────────────┘
                   │
                   ▼
  ┌────────────────────────────────────────┐
  │ 10. Filter Active Tokens Only          │
  │     tokens.filter(t => t.isActive)     │
  │                                         │
  │     Result: [token1, token2]           │
  │     (token3 with isActive=false skipped)
  └────────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────────┐      ┌─────────────┐
   │ Token 1     │      │ Token 2     │
   │ Android     │      │ Web         │
   │ isActive    │      │ isActive    │
   └──────┬──────┘      └──────┬──────┘
          │                     │
          ▼                     ▼
  ┌──────────────────────────────────────┐
  │ 11. Build Firebase Message           │
  │     (device-specific formatting)     │
  │                                       │
  │ For Android:                         │
  │ {                                    │
  │   token: "cfkDj...",                │
  │   notification: {                   │
  │     title: "John Doe",              │
  │     body: "Hello!"                  │
  │   },                                │
  │   data: {                           │
  │     type: "new_message",            │
  │     conversationId: "...",          │
  │     messageId: "...",               │
  │     senderName: "John Doe",         │
  │     messagePreview: "Hello!"        │
  │   },                                │
  │   android: { ... }                  │
  │ }                                    │
  │                                       │
  │ For Web:                            │
  │ {                                    │
  │   token: "e5_Tl...",                │
  │   notification: { ... },            │
  │   data: { ... },                    │
  │   webpush: { ... }                  │
  │ }                                    │
  └────────────────┬─────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  ┌──────────────────────────────────────┐
  │ 12. Send via Firebase Admin SDK      │
  │     admin.messaging().send(message)  │
  │                                       │
  │     Response: "123456789"            │
  │     (Firebase message ID)            │
  └────────────────┬─────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌──────────┐           ┌──────────┐
   │  ✅ Sent │           │  ✅ Sent │
   │ Android  │           │   Web    │
   │ Phone    │           │ Browser  │
   └──────────┘           └──────────┘
        │                     │
        ▼                     ▼
┌─────────────────────────────────────────┐
│  🔔 User B Receives Notification!       │
│     - Android phone pings               │
│     - Web browser shows notification    │
│     - Both devices marked "sent"        │
└─────────────────────────────────────────┘
```

## Detailed Execution Timeline

### Phase 1: Message Creation (Synchronous - Blocking)
```
T+0ms:    POST request arrives
T+5ms:    Validate user is participant
T+10ms:   Create message in DB
T+20ms:   Update conversation metadata
T+30ms:   Create notification record
T+40ms:   Return 201 response to client
          ↓
          User A sees: "Message sent ✓"
```

### Phase 2: FCM Sending (Asynchronous - Non-blocking)
```
T+40ms:   Start async FCM notification block
T+45ms:   Get receiver ID from conversation
T+50ms:   Call notifyNewMessage()
T+55ms:   Call sendTemplatedNotification()
T+60ms:   Call sendToUser()
T+65ms:   Query userfcmtokens collection
T+70ms:   MongoDB returns: { userId, tokens: [...] }
T+75ms:   Filter active tokens
T+80ms:   For each token: build Firebase message
T+90ms:   For token 1: admin.messaging().send()
T+100ms:  Firebase returns message ID
T+110ms:  For token 2: admin.messaging().send()
T+120ms:  Firebase returns message ID
T+130ms:  Return results: { success: true, sent: 2, failed: 0 }
T+140ms:  Log completion
          ↓
          User B's devices receive notification
```

## Database Changes During Flow

### Before Any Action
```
conversations collection:
{
  _id: conv123,
  participants: [userId_A, userId_B],
  lastMessage: null,
  unreadCount: { userId_A: 0, userId_B: 0 }
}

messages collection:
{ empty }

notifications collection:
{ empty }

userfcmtokens collection:
{
  userId: userId_B,
  tokens: [
    { token: "cfk...", deviceType: "android", isActive: true },
    { token: "e5_...", deviceType: "web", isActive: true }
  ]
}
```

### After User A Sends Message
```
conversations collection:
{
  _id: conv123,
  participants: [userId_A, userId_B],
  lastMessage: msg456,                    ← UPDATED
  lastMessageText: "Hello!",              ← UPDATED
  lastMessageSenderId: userId_A,          ← UPDATED
  lastMessageTime: 2025-12-22T15:30:00Z,  ← UPDATED
  unreadCount: { 
    userId_A: 0,                          ← reset
    userId_B: 1                           ← INCREMENTED
  }
}

messages collection:
{
  _id: msg456,                            ← NEW
  conversation: conv123,
  sender: userId_A,
  body: "Hello!",
  createdAt: 2025-12-22T15:30:00Z
}

notifications collection:
{
  _id: notif789,                          ← NEW
  userId: userId_B,
  title: "John Doe",
  body: "Hello!",
  type: "message",
  data: { conversationId, messageId, ... },
  read: false
}

userfcmtokens collection:
{ unchanged }  ← (used for sending, not modified)
```

## Success Criteria

✅ **Message Successfully Sent When:**
1. HTTP 201 response returned immediately
2. Message document exists in messages collection
3. Conversation lastMessage and unreadCount updated
4. Notification record created in notifications collection
5. FCM notification sent to all receiver's active tokens

✅ **FCM Notification Successfully Sent When:**
1. `sendToUser()` returns `{ success: true }`
2. `sent` count > 0 (at least one token received it)
3. Device receives notification within 1-5 seconds
4. Server logs show: `[CONV-FCM] Result - Success: true, Sent: X`

❌ **Failure Indicators:**
- `sent: 0` - No tokens found or all failed
- `isActive: false` on all tokens - User logged out of all devices
- Firebase initialization error - Invalid credentials
- `[FCM-CHECK] Firebase not initialized` - Service account issue
- Notification doesn't appear - Network/app issue on receiver side

## Key Query Points in Code

### Query 1: Get Receiver
```javascript
const receiverId = conversation.participants.find(
  p => p.toString() !== req.user._id.toString()
);
// Returns: ObjectId of the other participant
```

### Query 2: Fetch FCM Tokens ⭐ (FIXED)
```javascript
const userFcmData = await UserFcmToken.findOne({ 
  userId: receiverId 
});

const tokens = userFcmData && userFcmData.tokens 
  ? userFcmData.tokens.filter(t => t.isActive) 
  : [];
// Returns: Array of active token objects
```

### Query 3: Send to Firebase
```javascript
for (const t of tokens) {
  const response = await admin.messaging().send({
    token: t.token,
    notification: { title, body },
    data: { ... }
  });
  // Response: Message ID from Firebase
}
```

## Monitoring/Debugging

### Check Server Logs
```bash
# Look for these log patterns:

# Message creation
"📨 [MSG] Message created successfully:"

# Notification start
"📱 [CONV-FCM] ===== STARTING ASYNC FCM NOTIFICATIONS ====="

# Token query (FIXED)
"🔴 [DEBUG-UTIL] Found X active FCM tokens"

# Firebase send
"✅ [DEBUG-UTIL] FCM send successful. Response ID: ..."

# Completion
"📱 [CONV-FCM] ===== ASYNC FCM NOTIFICATIONS COMPLETE ====="
```

### Query Database
```javascript
// Check if receiver has tokens
db.userfcmtokens.findOne({ userId: ObjectId("...") })

// Check notifications created
db.notifications.findOne({ userId: ObjectId("...") }).sort({ createdAt: -1 })

// Check messages sent
db.messages.findOne({ sender: ObjectId("...") }).sort({ createdAt: -1 })

// Check conversation state
db.conversations.findOne({ _id: ObjectId("...") })
```

## Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| `sent: 0` | No FCM tokens found | Receiver hasn't logged in/registered |
| Invalid token error | Token expired | Auto-deleted, receiver needs to re-login |
| `Firebase not initialized` | Bad credentials | Check firebase-service-account.json |
| Message sent but no notification | isActive: false | Mark tokens as active or re-register |
| Notification in DB but not on device | Client app issue | Check client Firebase setup |
| Broadcast sends to nobody | No users have tokens | Multiple users need to register first |
