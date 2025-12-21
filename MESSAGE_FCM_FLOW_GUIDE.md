# Message FCM Notification Flow - Complete Guide

## Overview
When a user sends a message to another person, the system automatically sends an FCM notification to the receiver's registered devices using tokens from the `userfcmtokens` table.

## Complete Flow Diagram

```
User A sends message
        ↓
[conversation.controller.js] sendMessage()
        ↓
Message created in DB
        ↓
Conversation updated (unread count, lastMessage, etc)
        ↓
Notification record created in notifications table
        ↓
Get receiver ID (other participant)
        ↓
conversationFcmUtils.notifyNewMessage(receiverId, ...)
        ↓
notificationUtils.sendTemplatedNotification(receiverId, ...)
        ↓
Query UserFcmToken collection: findOne({ userId: receiverId })
        ↓
Extract active tokens from tokens array
        ↓
For EACH active token:
  - Build Firebase message
  - Send via admin.messaging().send()
  - Handle success/failure
        ↓
Return results (sent count, failed count)
        ↓
User B receives FCM notification on their device(s)
```

## Database Schema

### userfcmtokens Collection
```javascript
{
  _id: ObjectId,
  userId: String (indexed),
  tokens: [
    {
      token: String,           // FCM token from client
      deviceType: String,      // "android", "ios", or "web"
      isActive: Boolean,       // true/false
      createdAt: Date,
      updatedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```javascript
{
  _id: ObjectId("..."),
  userId: "507f1f77bcf86cd799439011",
  tokens: [
    {
      token: "cfkDjSEsHlU:APA91bGy2mH...",
      deviceType: "android",
      isActive: true,
      createdAt: 2025-12-22T10:30:00.000Z,
      updatedAt: 2025-12-22T10:30:00.000Z
    },
    {
      token: "e5_TlsGn_-Y:APA91bJx3qK...",
      deviceType: "web",
      isActive: true,
      createdAt: 2025-12-22T11:15:00.000Z,
      updatedAt: 2025-12-22T11:15:00.000Z
    }
  ],
  createdAt: 2025-12-22T10:30:00.000Z,
  updatedAt: 2025-12-22T11:15:00.000Z
}
```

## Code Flow - Step by Step

### 1. Sending a Message
**File:** `conversation.controller.js` - `sendMessage` function

```javascript
exports.sendMessage = catchAsync(async (req, res, next) => {
  // 1. Validate conversation and user participation
  const conversation = await Conversation.findById(req.params.conversationId);
  
  // 2. Find receiver ID (the other participant)
  const receiverId = conversation.participants.find(
    p => p.toString() !== req.user._id.toString()
  );
  
  // 3. Create message in database
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    body: req.body.body
  });
  
  // 4. Update conversation metadata
  conversation.lastMessage = message._id;
  conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
  await conversation.save();
  
  // 5. Create notification record in notifications collection
  await Notification.create({
    userId: receiverId,
    title: senderDisplayName,
    body: messagePreview,
    type: 'message',
    data: { conversationId, messageId, senderId },
    read: false
  });
  
  // 6. Send FCM notification ASYNCHRONOUSLY (non-blocking)
  (async () => {
    await conversationFcmUtils.notifyNewMessage(
      receiverId.toString(),
      senderDisplayName,
      messagePreview,
      conversation._id.toString(),
      message._id.toString(),
      messageFull
    );
  })().catch(err => console.error(err));
  
  res.status(201).json({ status: 'success', data: message });
});
```

### 2. Sending FCM Notification
**File:** `fcm.conversation.utils.js` - `notifyNewMessage` function

```javascript
exports.notifyNewMessage = async (
  recipientId,
  senderName,
  messagePreview,
  conversationId,
  messageId,
  messageFull
) => {
  const result = await notificationUtils.sendTemplatedNotification(
    recipientId.toString(),
    "messageReceived",
    [senderName, messagePreview],
    {
      data: {
        type: "new_message",
        action: "open_conversation",
        conversationId,
        messageId,
        senderId,
        senderName,
        messagePreview,
        messageFull,
        timestamp: new Date().toISOString()
      }
    }
  );
  
  return result; // { success, sent, failed, responses, errors }
};
```

### 3. Building and Sending Notification
**File:** `notification.utils.js` - `sendTemplatedNotification` function

```javascript
exports.sendTemplatedNotification = async (
  userId,
  templateName,
  templateArgs,
  additionalData
) => {
  // 1. Get template (e.g., "messageReceived")
  const template = templates[templateName];
  const templateResult = template(...templateArgs);
  
  // 2. Merge with additional data
  const notificationData = {
    ...templateResult,
    ...additionalData
  };
  
  // 3. Send to user using sendToUser()
  const result = await exports.sendToUser(userId, notificationData);
  
  return result;
};
```

### 4. Fetching Tokens and Sending to Firebase
**File:** `notification.utils.js` - `sendToUser` function

```javascript
exports.sendToUser = async (userId, notificationData) => {
  // 1. Query userfcmtokens table for this user
  const userFcmData = await UserFcmToken.findOne({ userId });
  
  // 2. Extract active tokens from tokens array
  const tokens = userFcmData && userFcmData.tokens 
    ? userFcmData.tokens.filter(t => t.isActive) 
    : [];
  
  // 3. Check if tokens found
  if (!tokens.length) {
    return { success: false, sent: 0, message: "No tokens found" };
  }
  
  // 4. Send to each token
  const responses = [];
  const errors = [];
  
  for (const t of tokens) {
    try {
      const message = {
        token: t.token,
        notification: {
          title: notificationData.title,
          body: notificationData.body
        },
        data: notificationData.data || {}
      };
      
      // Platform-specific configurations
      if (t.deviceType === "android") {
        message.android = { ... };
      } else if (t.deviceType === "ios") {
        message.apns = { ... };
      } else if (t.deviceType === "web") {
        message.webpush = { ... };
      }
      
      // Send via Firebase Admin SDK
      const response = await admin.messaging().send(message);
      responses.push({ token: t.token, status: "sent", response });
      
    } catch (error) {
      // Handle invalid tokens
      if (error.code === "messaging/invalid-registration-token") {
        await UserFcmToken.deleteOne({ 'tokens.token': t.token });
      }
      errors.push({ token: t.token, error: error.message });
    }
  }
  
  return {
    success: true,
    sent: responses.length,
    failed: errors.length,
    responses,
    errors: errors.length > 0 ? errors : undefined
  };
};
```

## How It Works - Simple Summary

1. **User A sends message** → Request reaches `sendMessage()` controller
2. **Message saved** → Message created in `messages` collection
3. **Conversation updated** → Unread count incremented for receiver
4. **Notification record created** → Entry added to `notifications` collection
5. **Get receiver info** → Find receiver ID from conversation participants
6. **Query userfcmtokens** → Look up receiver's registered FCM tokens:
   ```javascript
   UserFcmToken.findOne({ userId: receiverId })
   // Returns: { userId, tokens: [...] }
   ```
7. **Filter active tokens** → Only send to active tokens where `isActive === true`
8. **Build Firebase messages** → Create message for each token with:
   - Title (sender name)
   - Body (message preview)
   - Data (conversation info, message ID, etc.)
   - Device-specific formatting (Android/iOS/Web)
9. **Send via Firebase Admin SDK** → `admin.messaging().send(message)` for each token
10. **Handle responses** → Track success/failure for each token
11. **User B receives** → Notification appears on their device(s)

## Debugging Checklist

### Receiver not receiving messages?

1. **Check if receiver has FCM tokens registered:**
   ```bash
   # Query MongoDB
   db.userfcmtokens.findOne({ userId: "receiver_user_id" })
   ```
   - If empty, receiver needs to login on a mobile/web client
   - Client must call registration endpoint with FCM token

2. **Verify tokens are marked active:**
   ```javascript
   tokens: [
     { token: "...", isActive: true },  // ✓ Will receive
     { token: "...", isActive: false }  // ✗ Won't receive
   ]
   ```

3. **Check Firebase initialization:**
   - Verify `firebase-service-account.json` exists and is valid
   - Check server logs for Firebase initialization errors

4. **Review console logs:**
   - Look for `[DEBUG-UTIL]` logs to trace token fetching
   - Look for `[CONV-FCM]` logs to trace notification sending

5. **Test manually:**
   ```bash
   node test-message-fcm-flow.js
   ```

## API Endpoints

### Register FCM Token (Client-side)
```javascript
POST /api/v1/auth/register-fcm-token
Body: {
  token: "fcm_token_from_client",
  deviceType: "android" | "ios" | "web"
}
// Creates or updates userfcmtokens entry
```

### Send Message
```javascript
POST /api/v1/conversations/:conversationId/messages
Body: {
  body: "Message text"
}
// Automatically sends FCM to receiver's tokens
```

### List FCM Health Check
```javascript
GET /api/v1/conversations/fcm-health-check/:userId
// Returns: Firebase status, token count, token details
```

## Key Files Modified

1. **notification.utils.js** - Fixed UserFcmToken query to properly fetch nested tokens array
2. **conversation.controller.js** - Already correctly implemented to send FCM

## Files to Check

- `/src/modules/conversations/conversation.controller.js` - Message sending logic
- `/src/modules/conversations/fcm.conversation.utils.js` - FCM notification utilities
- `/src/modules/notification/notification.utils.js` - Core notification sending (FIXED)
- `/src/modules/notification/UserFcmToken.model.js` - Token storage schema
- `/src/modules/notification/config/firebase.js` - Firebase configuration

## Testing

Run the comprehensive test:
```bash
node test-message-fcm-flow.js
```

This test will:
- Get two test users
- Check receiver's FCM tokens in userfcmtokens table
- Create a conversation between them
- Send a test message
- Verify FCM notification is sent to all receiver's tokens
- Display complete flow results
