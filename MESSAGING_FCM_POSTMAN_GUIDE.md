# Messaging API with FCM - Postman Testing Guide

## 📚 Overview
This guide shows how to test the complete Messaging API with FCM token management using Postman.

## 🚀 Quick Start

### 1. Import the Collection
1. Open Postman
2. Click **Import** → Select file → Choose `Messaging_FCM_API.postman_collection.json`
3. The collection will be imported with all endpoints

### 2. Set Variables
In Postman, go to the collection's **Variables** tab and update:
- `authToken` - From login response
- `userId` - User ID from login response
- `fcmToken` - Firebase Cloud Messaging token
- `conversationId` - From start conversation response
- `receiverId` - ID of recipient user
- `messageId` - From message response

## 📋 Testing Workflow

### Phase 1: Authentication & Setup

#### 1.1 Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "w@gmail.com",
  "password": "password"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "69307854e324845ecb080759",
      "email": "w@gmail.com",
      "firstName": "we",
      "lastName": "we"
    }
  }
}
```

**Save:**
- Copy `token` → Set as `{{authToken}}`
- Copy `user._id` → Set as `{{userId}}`

---

### Phase 2: FCM Token Management

#### 2.1 Register FCM Token
**Endpoint:** `POST /api/notifications/register-token`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "eIqr1CxXlbA:APA91bG3sZ5pK4q2rX9mN...",
  "platform": "android",
  "deviceId": "device-123",
  "deviceName": "My Android Device"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "token": "registered_token_object"
}
```

**Save:**
- Copy `token` → Set as `{{fcmToken}}`

**What Happens:**
- ✅ Token saved to `User.fcmToken`
- ✅ Token document created in `FCMToken` collection
- ✅ Token marked as active

---

#### 2.2 Get User Tokens
**Endpoint:** `GET /api/notifications/tokens`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "fcmToken": "token_string...",
      "platform": "android",
      "isActive": true,
      "lastUsed": "2025-12-09T17:20:00.000Z"
    }
  ]
}
```

**Use Case:** View all registered tokens for current user

---

#### 2.3 Debug User Tokens
**Endpoint:** `GET /api/notifications/debug/user-tokens/{{userId}}`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "69307854e324845ecb080759",
    "userEmail": "w@gmail.com",
    "userCollection": {
      "fcmToken": "token_string_or_null",
      "platform": "android"
    },
    "fcmTokenCollection": [
      {
        "fcmToken": "token_string",
        "platform": "android",
        "isActive": true,
        "lastUsed": "2025-12-09T17:20:00.000Z"
      }
    ]
  }
}
```

**Use Case:** Comprehensive token status for debugging

---

#### 2.4 Health Check
**Endpoint:** `GET /api/notifications/health`

**No Auth Required**

**Expected Response (200):**
```json
{
  "success": true,
  "message": "FCM service is healthy",
  "status": "operational"
}
```

**Use Case:** Verify FCM service is running

---

### Phase 3: FCM Notifications

#### 3.1 Send Direct Notification
**Endpoint:** `POST /api/notifications/send`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Test Message",
  "body": "This is a test FCM notification",
  "data": {
    "screen": "messages",
    "conversationId": "123"
  }
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "sentCount": 1,
  "failureCount": 0
}
```

**What Happens:**
- ✅ Notification sent to user's registered FCM tokens
- ⚠️ If user has no tokens: Returns success but no notification sent

---

#### 3.2 Send Batch Notification
**Endpoint:** `POST /api/notifications/send-batch`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "tokens": ["token1", "token2", "token3"],
  "title": "Batch Notification",
  "body": "This notification goes to multiple devices",
  "data": {
    "type": "batch"
  }
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "sentCount": 2,
  "failureCount": 1,
  "message": "Batch notification sent"
}
```

**What Happens:**
- ✅ Sends to multiple tokens
- ⚠️ Handles partial failures gracefully

---

#### 3.3 Send Topic Notification
**Endpoint:** `POST /api/notifications/send-to-topic`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "topic": "announcements",
  "title": "Important Announcement",
  "body": "This is sent to all subscribed users",
  "data": {
    "type": "announcement"
  }
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Topic notification sent"
}
```

**What Happens:**
- ✅ Sends to all devices subscribed to topic
- ✅ Topic must exist first

---

#### 3.4 Test Notification
**Endpoint:** `POST /api/notifications/test`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test to verify FCM is working"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Test notification sent"
}
```

**Use Case:** Quickly verify FCM is working

---

### Phase 4: Topic Management

#### 4.1 Subscribe to Topic
**Endpoint:** `POST /api/notifications/subscribe`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "topic": "announcements",
  "tokens": ["{{fcmToken}}"]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Subscribed to topic",
  "topic": "announcements"
}
```

---

#### 4.2 Unsubscribe from Topic
**Endpoint:** `POST /api/notifications/unsubscribe`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "topic": "announcements",
  "tokens": ["{{fcmToken}}"]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Unsubscribed from topic"
}
```

---

### Phase 5: Messaging API

#### 5.1 Start Conversation
**Endpoint:** `POST /api/messages/start-conversation`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "participantId": "other-user-id",
  "participantName": "John Doe"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "conversation": {
    "_id": "conv-123",
    "participants": ["user1", "user2"],
    "createdAt": "2025-12-09T17:20:00.000Z"
  }
}
```

**Save:**
- Copy `conversation._id` → Set as `{{conversationId}}`

---

#### 5.2 Send Message
**Endpoint:** `POST /api/messages/send`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "conversationId": "{{conversationId}}",
  "receiverId": "{{receiverId}}",
  "text": "Hello! This is a test message.",
  "image": null,
  "file": null
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": {
    "_id": "msg-123",
    "conversationId": "conv-123",
    "senderId": "user1",
    "receiverId": "user2",
    "text": "Hello! This is a test message.",
    "createdAt": "2025-12-09T17:20:00.000Z"
  }
}
```

**What Happens:**
- ✅ Message stored in database
- ✅ FCM notification sent to receiver (if tokens registered)
- ⚠️ If receiver has no tokens: Message still saved, FCM skipped

---

#### 5.3 Get Conversations
**Endpoint:** `GET /api/messages/conversations`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "conv-123",
      "participants": ["user1", "user2"],
      "lastMessage": "Hello!",
      "updatedAt": "2025-12-09T17:20:00.000Z"
    }
  ]
}
```

---

#### 5.4 Get Conversation Messages
**Endpoint:** `GET /api/messages/conversation/{{conversationId}}`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "msg-123",
      "text": "Hello!",
      "senderName": "John Doe",
      "isRead": false,
      "createdAt": "2025-12-09T17:20:00.000Z"
    }
  ]
}
```

---

#### 5.5 Mark Message as Read
**Endpoint:** `PUT /api/messages/{{messageId}}/read`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

---

#### 5.6 Delete Message
**Endpoint:** `DELETE /api/messages/{{messageId}}`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### Phase 6: Logout & Cleanup

#### 6.1 Logout (Deactivate FCM Tokens)
**Endpoint:** `POST /api/notifications/logout`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Expected Response (200):**
```json
{
  "success": true,
  "deactivatedCount": 1,
  "message": "All FCM tokens deactivated"
}
```

**What Happens:**
- ✅ All user's FCM tokens marked as inactive
- ✅ User collection token cleared
- ✅ No notifications will be sent after this

---

## 🧪 Complete Test Scenario

### Test Flow
1. **Login** → Get authToken and userId
2. **Register FCM Token** → Get fcmToken
3. **Verify Token** → Check tokens via Get User Tokens
4. **Send Test Notification** → Verify FCM works
5. **Start Conversation** → Get conversationId
6. **Send Message** → Message triggers FCM notification
7. **Verify Message** → Get conversation messages
8. **Mark as Read** → Update message status
9. **Logout** → Deactivate tokens
10. **Verify Cleanup** → Check tokens deactivated

### Expected Results
| Step | Endpoint | Expected | Status |
|------|----------|----------|--------|
| 1 | Login | 200 OK | ✓ |
| 2 | Register Token | 200 OK | ✓ |
| 3 | Get Tokens | 1 token | ✓ |
| 4 | Send Test | 200 OK | ✓ |
| 5 | Start Conv | 201 Created | ✓ |
| 6 | Send Message | 201 Created | ✓ |
| 7 | Get Messages | 200 OK | ✓ |
| 8 | Mark Read | 200 OK | ✓ |
| 9 | Logout | 200 OK, tokens=0 active | ✓ |
| 10 | Debug Tokens | 0 active | ✓ |

---

## 🔧 Troubleshooting

### Issue: "No FCM tokens found"
**Cause:** User hasn't registered FCM token
**Solution:** Call Register FCM Token endpoint first

### Issue: Notification not received
**Cause:** Device not subscribed or token invalid
**Solution:** 
- Verify token via Debug Tokens endpoint
- Check Firebase Console for errors
- Ensure device is online

### Issue: "Authorization failed"
**Cause:** Invalid or expired authToken
**Solution:** Login again and update {{authToken}} variable

### Issue: Message created but no FCM sent
**Expected Behavior:** This is normal if receiver has no active tokens
**Verification:** Check FCM service logs

---

## 📊 Response Status Codes

| Code | Meaning | Common Reason |
|------|---------|---------------|
| 200 | Success | Operation completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid/expired token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Check logs |

---

## 💡 Tips

1. **Use Collections:** Import entire collection for quick testing
2. **Save Variables:** Always copy IDs from responses to variables
3. **Check Logs:** Server logs show FCM activity with `[MSG]` prefix
4. **Test Sequence:** Login → Register Token → Test
5. **Verify Cleanup:** After logout, tokens should be deactivated

---

## Summary

✅ Complete Messaging API with FCM  
✅ Token registration and management  
✅ Direct, batch, and topic notifications  
✅ Full messaging system  
✅ Secure logout with token deactivation  

**System Status: READY FOR TESTING** 🚀
