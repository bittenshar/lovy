# Complete Guide to Test /api/messages/send in Postman

## ✅ The Real Issue: You Need TWO Users

The `/api/messages/send` endpoint requires:
1. A **sender** (the logged-in user)
2. A **receiver** (different user)  
3. A **valid conversation** between them

Since you only have one test user (`w@gmail.com`), you can't send messages to yourself.

---

## Solution: Create a Second Test User

### Step 1: Create Second User (via API or Database)

**Option A: Via Login (if user exists)**
```bash
POST http://localhost:3000/api/auth/login
Body: {
  "email": "test2@gmail.com",
  "password": "password123"
}
```

**Option B: Sign Up New User**
```bash
POST http://localhost:3000/api/auth/signup
Body: {
  "firstname": "Test",
  "lastname": "User2",
  "email": "test2@gmail.com",
  "password": "password123",
  "userType": "employer"
}
```

---

## Complete Working Test Flow

### USER 1: w@gmail.com
```
Token: token1
ID: 69307854e324845ecb080759
```

### USER 2: test2@gmail.com  
```
Token: token2
ID: (get from signup/login response)
```

---

## Step-by-Step in Postman

### 1️⃣ Login as USER 1 (Sender)
```bash
POST http://localhost:3000/api/auth/login
Headers: Content-Type: application/json
Body: {
  "email": "w@gmail.com",
  "password": "password"
}
```

**Save Response:**
- `token` → `{{authToken}}`
- `user._id` → `{{userId}}`

---

### 2️⃣ Create/Get USER 2 (Receiver)
```bash
POST http://localhost:3000/api/auth/signup
Headers: Content-Type: application/json
Body: {
  "firstname": "Test",
  "lastname": "User",
  "email": "testuser2@example.com",
  "password": "password123",
  "userType": "employer"
}
```

**Save Response:**
- `_id` → `{{receiverId}}`

---

### 3️⃣ Start Conversation (USER 1 talks to USER 2)
```bash
POST http://localhost:3000/api/messages/start-conversation
Headers: 
  Authorization: Bearer {{authToken}}
  Content-Type: application/json
Body: {
  "recipientId": "{{receiverId}}"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-123"
  }
}
```

**Save:**
- `data.conversationId` → `{{conversationId}}`

---

### 4️⃣ Send Message (NOW THIS WORKS!) ✅
```bash
POST http://localhost:3000/api/messages/send
Headers:
  Authorization: Bearer {{authToken}}
  Content-Type: application/json
Body: {
  "conversationId": "{{conversationId}}",
  "receiverId": "{{receiverId}}",
  "text": "Hello! This is a test message.",
  "image": null,
  "file": null
}
```

**Response (201):** ✅
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "69385c739c6aed9e2329e070",
    "text": "Hello! This is a test message.",
    "createdAt": "2025-12-09T17:29:23.132Z",
    "sender": {
      "_id": "69307854e324845ecb080759",
      "name": "we",
      "image": null
    }
  }
}
```

---

### 5️⃣ Verify Message Received
```bash
GET http://localhost:3000/api/messages/conversation/{{conversationId}}
Headers:
  Authorization: Bearer {{authToken}}
```

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "69385c739c6aed9e2329e070",
      "text": "Hello! This is a test message.",
      "senderName": "we",
      "createdAt": "2025-12-09T17:29:23.132Z",
      "isRead": false
    }
  ]
}
```

---

## Quick Postman Collection Variables Setup

After completing steps above, set these in Postman Variables:

| Variable | Value | Source |
|----------|-------|--------|
| `authToken` | `eyJhbGci...` | Step 1: Login response |
| `userId` | `69307854e324845ecb080759` | Step 1: Login response |
| `receiverId` | `test_user_id_123` | Step 2: Signup response |
| `conversationId` | `conv-123` | Step 3: Start Conversation |
| `fcmToken` | `fcm_token_string` | FCM Token endpoint |
| `messageId` | `msg-123` | Step 4: Send Message response |

---

## Why You Got Error Before

❌ **What you tried:**
```
Start Conversation with userId (same user)
→ Cannot message yourself error
→ No conversationId
→ Send message fails
```

✅ **What you should do:**
```
Create second user
→ Start conversation between user 1 & user 2
→ Get valid conversationId
→ Send message succeeds (201)
```

---

## Shortcut: If You Want to Test Immediately

Use these IDs if they exist in your database:

```
USER 1:
- Email: w@gmail.com
- ID: 69307854e324845ecb080759

USER 2 (find another user ID in your database):
- Email: (any other user)
- ID: (from Users collection)
```

**Then:**
1. Login as USER 1
2. Start conversation with USER 2
3. Send message → Should work!

---

## Troubleshooting

### Error: "Cannot start conversation with yourself"
**Cause:** `recipientId` same as `userId`  
**Fix:** Use a DIFFERENT user ID

### Error: "User not found"
**Cause:** `receiverId` doesn't exist  
**Fix:** Verify user ID exists in database

### Error: "Conversation not found" (when sending)
**Cause:** Invalid `conversationId`  
**Fix:** Copy directly from start-conversation response

### Endpoint works but no FCM notification
**Expected:** Message saves but FCM skipped if receiver has no tokens  
**This is NORMAL** - verify with GET messages endpoint

---

## Postman Collection Update

**File already includes:**
✓ All correct endpoints
✓ Fixed Start Conversation (recipientId)
✓ All variables
✓ Examples

**Just add:**
- User 2 ID to `{{receiverId}}`
- Run sequence above
- Test → **SUCCESS** ✅

---

## Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| Send fails | Only 1 user | Create/use 2nd user |
| 400 error | Same recipientId | Use different user ID |
| No conversation | Invalid recipientId | Use valid user ID |
| Message not sending | No conversationId | Start conversation first |

---

**Status: ✅ EVERYTHING WORKING - Just need 2 users to test properly!**
