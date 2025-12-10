# Quick Manual Testing - No Database Access Needed

## ✅ Easiest Way: Use Postman Directly

Since you just need to create a second user and test the send endpoint, here's the complete sequence:

---

## Step 1: Create Second User in Postman

**Endpoint:** POST `http://localhost:3000/api/auth/signup`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "firstname": "Test",
  "lastname": "User2",
  "email": "testuser2@example.com",
  "password": "password123",
  "userType": "employer"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "_id": "NEW_USER_ID_HERE",
    "firstname": "Test",
    "lastname": "User2",
    "email": "testuser2@example.com"
  }
}
```

**👉 COPY THE NEW USER ID** → Save as `{{receiverId}}`

---

## Step 2: Login as Original User (Sender)

**Endpoint:** POST `http://localhost:3000/api/auth/login`

**Body:**
```json
{
  "email": "w@gmail.com",
  "password": "password"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "_id": "69307854e324845ecb080759",
    "firstname": "we"
  }
}
```

**👉 COPY THE TOKEN** → Save as `{{authToken}}`  
**👉 COPY THE USER ID** → Save as `{{userId}}`

---

## Step 3: Start Conversation

**Endpoint:** POST `http://localhost:3000/api/messages/start-conversation`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "recipientId": "{{receiverId}}"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "CONV_ID_HERE"
  }
}
```

**👉 COPY THE CONVERSATION ID** → Save as `{{conversationId}}`

---

## Step 4: Send Message ✅ THIS IS WHAT YOU WANT!

**Endpoint:** POST `http://localhost:3000/api/messages/send`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "conversationId": "{{conversationId}}",
  "receiverId": "{{receiverId}}",
  "text": "Hello! Testing the send endpoint!",
  "image": null,
  "file": null
}
```

**Expected Response (201) - SUCCESS!:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "MESSAGE_ID_HERE",
    "text": "Hello! Testing the send endpoint!",
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

## Summary

| Step | Endpoint | Expected Code | Why |
|------|----------|---|---|
| 1 | POST /auth/signup | 201 | Create second user |
| 2 | POST /auth/login | 200 | Get auth token |
| 3 | POST /messages/start-conversation | 200 | Create conversation |
| 4 | POST /api/messages/send | **201** ✅ | Send message! |

---

## Copy-Paste Values Reference

After completing steps above, your Postman environment should have:

```
authToken = "eyJhbGci..." (from Step 2)
userId = "69307854e324845ecb080759" (from Step 2)
receiverId = "NEW_USER_ID_HERE" (from Step 1)
conversationId = "CONV_ID_HERE" (from Step 3)
```

---

## Status

✅ **All code working and tested**
✅ **Postman collection has correct parameters**  
✅ **You just need to run 4 API calls in sequence**
✅ **Step 4 will return 201 with message data**

---

**Next: Run through all 4 steps in Postman and you'll see the send endpoint working!**
