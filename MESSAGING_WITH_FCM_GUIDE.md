# Real-Time Messaging with FCM Notifications

## 📱 System Overview

This document describes the complete real-time messaging system with Firebase Cloud Messaging (FCM) notifications for the WorkConnect app.

### Architecture

```
Flutter App (User A)
    ↓ sends message
Backend API (/api/messages/send)
    ↓ creates Message + Conversation
Messaging Service (messagingService.js)
    ↓ retrieves receiver's FCM tokens
Firebase Notification Service
    ↓ sends FCM to all receiver's devices
Flutter App (User B)
    ↓ receives notification
flutter_local_notifications
    ↓ displays visual notification
User taps notification → Routing to chat screen
```

---

## 📊 Database Models

### Message Model
```javascript
{
  conversationId: ObjectId,      // Reference to conversation
  senderId: ObjectId,            // Who sent the message
  senderName: String,            // Cached sender name for quick display
  senderImage: String,           // Cached sender avatar
  receiverId: ObjectId,          // Who receives the message
  text: String,                  // Message content
  image: String,                 // Optional image URL
  file: {                        // Optional file attachment
    filename: String,
    url: String,
    type: String
  },
  isRead: Boolean,               // Message read status
  readAt: Date,                  // When message was read
  notificationSent: Boolean,     // Track if FCM sent
  notificationSentAt: Date,      // When FCM was sent
  deletedFor: [ObjectId],        // Soft delete tracking
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model
```javascript
{
  participants: [ObjectId],      // Both users in conversation
  lastMessage: ObjectId,         // Reference to latest message
  lastMessageText: String,       // Cached for quick preview
  lastMessageSenderId: ObjectId, // Who sent last message
  lastMessageTime: Date,         // When last message sent
  unreadCount: Map,              // Per-user unread counts
  isActive: Boolean,             // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### FCMToken Model
```javascript
{
  userId: ObjectId,              // User reference
  fcmToken: String,              // Firebase token
  platform: String,              // android/ios/web
  deviceId: String,              // Unique device identifier
  deviceName: String,            // e.g., "My iPhone"
  isActive: Boolean,             // Track active devices
  lastUsed: Date,                // Last activity
  topics: [String],              // Subscribed topics
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Backend API Endpoints

### Send Message (Triggers FCM)
**Endpoint:** `POST /api/messages/send`

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "conversationId": "65abc123...",
  "receiverId": "65abc456...",
  "text": "Hello! How are you?",
  "image": null,
  "file": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "65abc789...",
    "text": "Hello! How are you?",
    "createdAt": "2025-12-09T10:30:00Z",
    "sender": {
      "_id": "65abc123...",
      "name": "John",
      "image": "https://..."
    }
  }
}
```

**What happens:**
1. Message created in DB
2. Conversation updated with latest message
3. **FCM notification sent to receiver's all active devices**
4. Notification contains: sender name, message text, conversation ID

---

### Get Conversation Messages
**Endpoint:** `GET /api/messages/conversation/:conversationId?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "senderId": "...",
      "senderName": "John",
      "text": "Hello!",
      "isRead": true,
      "createdAt": "2025-12-09T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Note:** Automatically marks all receiver's messages as read

---

### Get All Conversations
**Endpoint:** `GET /api/messages/conversations?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "conv_id",
      "otherUser": {
        "_id": "user_id",
        "firstName": "Jane",
        "lastName": "Doe",
        "image": "https://..."
      },
      "lastMessage": {...},
      "lastMessageText": "See you tomorrow!",
      "unreadCount": 3,
      "updatedAt": "2025-12-09T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### Start Conversation
**Endpoint:** `POST /api/messages/start-conversation`

**Request Body:**
```json
{
  "recipientId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation created",
  "data": {
    "conversationId": "65abc789...",
    "otherUser": {...}
  }
}
```

---

### Delete Message (Soft Delete)
**Endpoint:** `DELETE /api/messages/message/:messageId`

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### Search Messages
**Endpoint:** `GET /api/messages/search?query=hello&conversationId=optional`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "senderId": "...",
      "senderName": "John",
      "text": "hello there!",
      "conversationId": "...",
      "createdAt": "2025-12-09T10:30:00Z"
    }
  ]
}
```

---

## 📱 Flutter Implementation

### 1. Send Message with FCM Notification
```dart
final messagingService = MessagingApiService();

try {
  final messageData = await messagingService.sendMessage(
    conversationId: 'conv_id',
    receiverId: 'user_id',
    text: 'Hello, how are you?',
    image: null, // Optional
  );
  
  print('✅ Message sent! FCM notification triggered for receiver.');
  // Message automatically displayed in chat UI
} catch (e) {
  print('❌ Error: $e');
  // Show error to user
}
```

### 2. Listen for Incoming Messages
The app automatically receives FCM notifications when:
- User A sends a message
- Backend triggers FCM to User B's devices
- User B's app receives notification and displays it
- User can tap notification to open chat

### 3. Load Conversation
```dart
final messagingService = MessagingApiService();

try {
  final messages = await messagingService.getConversationMessages(
    conversationId: 'conv_id',
    page: 1,
    limit: 20,
  );
  
  // Messages automatically marked as read on backend
  // Update UI with messages
} catch (e) {
  print('❌ Error loading messages: $e');
}
```

### 4. Start New Conversation
```dart
final messagingService = MessagingApiService();

try {
  final data = await messagingService.startConversation(
    recipientId: 'user_id_to_chat_with',
  );
  
  final conversationId = data['conversationId'];
  // Navigate to chat screen with this conversation
} catch (e) {
  print('❌ Error: $e');
}
```

---

## 🔔 FCM Notification Flow

### Message Sent Notification

**When:** User sends a message

**Notification Payload:**
```json
{
  "notification": {
    "title": "John Doe",
    "body": "Hello! How are you?"
  },
  "data": {
    "conversationId": "65abc789...",
    "senderId": "65abc123...",
    "receiverId": "65abc456...",
    "messageType": "text_message",
    "action": "open_chat"
  }
}
```

**What Happens on Receiver's Device:**
1. FCM notification received
2. `flutter_local_notifications` displays visual notification
3. User sees: "John Doe: Hello! How are you?"
4. User taps notification → App routes to chat screen
5. Messages automatically marked as read

### Read Receipt Notification (Optional)

**When:** Receiver opens chat and messages are read

**Notification Payload:**
```json
{
  "notification": {
    "title": "Message Read",
    "body": "Your message has been read"
  },
  "data": {
    "conversationId": "65abc789...",
    "messageId": "msg_id",
    "messageType": "read_receipt",
    "action": "message_read"
  }
}
```

### Typing Indicator (Optional)

**When:** User is typing a message

**Notification Payload (Silent):**
```json
{
  "data": {
    "conversationId": "65abc789...",
    "senderId": "65abc123...",
    "messageType": "typing_indicator",
    "isTyping": "true"
  }
}
```

---

## 🔐 Security Features

1. **Authentication Required**
   - All endpoints require valid JWT token
   - Only authenticated users can send/receive messages

2. **Recipient Validation**
   - Messages only sent to registered users
   - Conversation participants verified

3. **Soft Delete**
   - Messages not permanently deleted
   - Users can't see deleted messages
   - Audit trail maintained

4. **FCM Token Management**
   - Tokens registered per device
   - Inactive devices excluded from notifications
   - Automatic cleanup of old tokens

---

## 📊 Data Flow Diagram

```
User A (iPhone)              Backend              User B (Android + iPad)
    │                           │                         │
    ├─ Text Message ─────────> │                         │
    │                           │                         │
    │                    Create Message                   │
    │                    Create/Update Conversation       │
    │                           │                         │
    │                    Find User B's FCM Tokens         │
    │                    [android_token, ios_token]       │
    │                           │                         │
    │                    Send FCM to Both Devices ──────> │ Android
    │                           │                         ├─> iPad
    │                           │                    Display Notification
    │                           │                    Display Notification
    │                           │                         │
    │                           │                    User Taps Notification
    │                           │                         │
    │                           │                    App Routes to Chat
    │                           │                    Marks Messages as Read
    │                           │                         │
    │                           │ <─ Mark Read API ──────┤
    │                           │                         │
```

---

## ✅ Testing Workflow

### 1. Test Setup
- Device 1: User A (Sender)
- Device 2: User B (Receiver)
- Backend: Running or Vercel deployed

### 2. Test Message Sending
```bash
# User A sends message via Flutter app
→ App calls: POST /api/messages/send
→ Backend creates message
→ Backend sends FCM to User B's devices
→ Device 2 receives notification
→ Device 2 displays: "User A: Hello!"
```

### 3. Test Notification Tap
```
→ User taps notification on Device 2
→ App opens chat screen
→ Messages loaded from backend
→ User can reply (sends FCM back to User A)
```

### 4. Test Multiple Devices
```
→ User B has iPhone + Android
→ User A sends message
→ **Both devices receive notification**
→ FCM sends to both tokens registered for User B
```

---

## 🛠️ Troubleshooting

### No Notification Received
1. ✅ Check FCM token is registered: `GET /api/notifications/tokens`
2. ✅ Verify receiver has active devices: Check `isActive: true`
3. ✅ Check app notifications enabled on device
4. ✅ Check device is not in DND mode
5. ✅ Review backend logs for FCM errors

### Message Sent but Receiver Doesn't See It
1. ✅ Check conversation exists
2. ✅ Check message created in DB
3. ✅ Check `GET /api/messages/conversations` shows it
4. ✅ Check backend FCM logs

### Notifications Marked as Read Incorrectly
1. ✅ Check `readAt` timestamp in message
2. ✅ Verify `isRead: true` flag is set
3. ✅ Check database consistency

---

## 📈 Monitoring & Logging

**Backend Logging:**
- ✅ `[MSG]` - Message operations
- ✅ `[FCM]` - FCM notifications
- ✅ `[API]` - API responses

**Frontend Logging:**
- ✅ `📨 [FCM]` - Message receipt
- ✅ `✅ [MSG]` - Success
- ✅ `❌ [MSG]` - Errors

---

## 🔗 Integration Checklist

### Backend Setup
- [ ] Message model created
- [ ] Conversation model created
- [ ] FCMToken model created
- [ ] messagingService.js implemented
- [ ] messaging.routes.js created
- [ ] Routes registered in app.js: `app.use('/api/messages', messagingRoutes)`
- [ ] Firebase Admin SDK initialized
- [ ] Notification routes tested

### Flutter Setup
- [ ] MessagingApiService created
- [ ] Firebase messaging initialized
- [ ] flutter_local_notifications configured
- [ ] FCM token stored in SharedPreferences
- [ ] FCM token registered after login
- [ ] Message notification listeners setup
- [ ] Notification tap routing implemented

### Testing
- [ ] Send message from Device A
- [ ] Device B receives notification
- [ ] Notification displays on device
- [ ] Tap notification opens chat
- [ ] Messages load correctly
- [ ] Reply message triggers notification on Device A
- [ ] Test with multiple devices

---

## 📚 API Summary Table

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/messages/send` | POST | ✅ | Send message + trigger FCM |
| `/messages/conversation/:id` | GET | ✅ | Load messages from chat |
| `/messages/conversations` | GET | ✅ | List all chats |
| `/messages/start-conversation` | POST | ✅ | Start new chat with user |
| `/messages/message/:id` | DELETE | ✅ | Delete/hide message |
| `/messages/search` | GET | ✅ | Search messages |
| `/notifications/register-token` | POST | ✅ | Register FCM token |
| `/notifications/tokens` | GET | ✅ | Get user's FCM tokens |
| `/notifications/health` | GET | ❌ | Check Firebase status |

---

## 🎯 Next Steps

1. **Deploy Backend**
   - Push messaging routes to Vercel
   - Verify Firebase Admin SDK working
   - Test all endpoints

2. **Update Flutter App**
   - Integrate MessagingApiService in chat screens
   - Implement UI for messages
   - Add notification tap routing

3. **Test End-to-End**
   - Send message between two devices
   - Verify FCM notification received
   - Verify message delivery and read status

4. **Monitor & Optimize**
   - Watch backend logs
   - Monitor FCM delivery rates
   - Optimize notification payload size
