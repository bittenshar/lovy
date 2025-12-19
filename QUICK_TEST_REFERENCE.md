# ⚡ Quick Testing Reference Card

## 🚀 Fast Testing Commands

### Setup (Do Once)
```bash
# Create test users
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employer@test.com",
    "password": "Test@123",
    "firstName": "John",
    "userType": "employer"
  }'

curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "Test@123",
    "firstName": "Jane",
    "userType": "worker"
  }'

# Register FCM tokens
curl -X POST http://localhost:3000/api/users/fcm-token \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test_token_employer",
    "platform": "web"
  }'

curl -X POST http://localhost:3000/api/users/fcm-token \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test_token_worker",
    "platform": "web"
  }'
```

---

## 🧪 All 18 Tests - One Command Each

### 1️⃣ Job Applied
```bash
# Step 1: Create job
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Dev Job", "description": "Test", "shouldAutoPublish": true}'

# Step 2: Apply
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JOB_ID", "message": "Interested"}'

# ✅ Expected: Employer gets notification
```

### 2️⃣ Job Accepted
```bash
curl -X PUT http://localhost:3000/api/applications/APP_ID \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "hired"}'

# ✅ Expected: Worker gets "Congratulations" notification
```

### 3️⃣ Job Rejected
```bash
curl -X PUT http://localhost:3000/api/applications/APP_ID \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'

# ✅ Expected: Worker gets rejection notification
```

### 4️⃣ Job Posted (Broadcast)
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Position",
    "description": "Great opportunity",
    "shouldAutoPublish": true
  }'

# ✅ Expected: ALL workers get notification
```

### 5️⃣ Check In
```bash
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessId": "BIZ_ID"}'

# ✅ Expected: Worker gets "Checked in at HH:MM"
```

### 6️⃣ Check Out
```bash
curl -X POST http://localhost:3000/api/attendance/clock-out \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recordId": "RECORD_ID"}'

# ✅ Expected: Worker gets "Checked out at HH:MM"
```

### 7️⃣ Business Created
```bash
curl -X POST http://localhost:3000/api/businesses \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "location": "New York"
  }'

# ✅ Expected: Employer gets "Business Created" notification
```

### 8️⃣ Business Updated
```bash
curl -X PUT http://localhost:3000/api/businesses/BIZ_ID \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Company Name"}'

# ✅ Expected: Employer gets "Business Updated" notification
```

### 9️⃣ Team Member Added
```bash
curl -X POST http://localhost:3000/api/businesses/BIZ_ID/team-members \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@test.com",
    "name": "New Member",
    "role": "manager"
  }'

# ✅ Expected: New member gets "Added to team" notification
```

### 🔟 Team Member Removed
```bash
curl -X DELETE http://localhost:3000/api/businesses/BIZ_ID/team-members/MEMBER_ID \
  -H "Authorization: Bearer EMPLOYER_TOKEN"

# ✅ Expected: Removed member gets notification
```

### 1️⃣1️⃣ Shift Swap Requested
```bash
curl -X POST http://localhost:3000/api/shifts/swap/request \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shiftId": "SHIFT_ID",
    "toWorkerId": "OTHER_WORKER_ID"
  }'

# ✅ Expected: Target worker gets swap request notification
```

### 1️⃣2️⃣ Shift Swap Approved
```bash
curl -X PUT http://localhost:3000/api/shifts/swap/SWAP_ID \
  -H "Authorization: Bearer OTHER_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# ✅ Expected: Requesting worker gets "Approved" notification
```

### 1️⃣3️⃣ Shift Swap Rejected
```bash
curl -X PUT http://localhost:3000/api/shifts/swap/SWAP_ID \
  -H "Authorization: Bearer OTHER_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'

# ✅ Expected: Requesting worker gets "Rejected" notification
```

### 1️⃣4️⃣ Message Received
```bash
# Step 1: Create conversation
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"participants": ["USER2_ID"]}'

# Step 2: Send message
curl -X POST http://localhost:3000/api/conversations/CONV_ID/messages \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "Hello from FCM test!"}'

# ✅ Expected: User2 gets message notification
```

### 1️⃣5️⃣ Conversation Started
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"participants": ["USER2_ID"]}'

# ✅ Expected: User2 gets "New Conversation" notification
```

### 1️⃣6️⃣ Payment Processed
```bash
# Step 1: Create order
curl -X POST http://localhost:3000/api/payments/razorpay/order \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 29900,
    "currency": "INR",
    "intent": "job_posting"
  }'

# Step 2: Verify success
curl -X POST http://localhost:3000/api/payments/razorpay/verify \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "paymentId": "PAY_ID",
    "status": "succeeded"
  }'

# ✅ Expected: Employer gets "Payment Successful" notification
```

### 1️⃣7️⃣ Payment Failed
```bash
curl -X POST http://localhost:3000/api/payments/razorpay/verify \
  -H "Authorization: Bearer EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "paymentId": "PAY_ID",
    "status": "failed"
  }'

# ✅ Expected: Employer gets "Payment Failed" notification
```

### 1️⃣8️⃣ Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer USER_TOKEN"

# ✅ Expected: User gets logout confirmation notification
```

---

## 🔍 How to Check Results

### Option 1: Backend Logs
```bash
# Watch terminal where Node is running
# Look for lines like:
✅ Notification sent successfully to: USER_ID
⚠️ Failed to send notification
```

### Option 2: Firebase Console
```
1. Go to firebase.google.com
2. Select your project
3. Cloud Messaging tab
4. Messages tab
5. Sort by newest
6. Look for your test messages
```

### Option 3: Test with Postman
```
1. Import collection
2. Run each test endpoint
3. Check response status: 200/201
4. Check Firebase Console after
```

---

## 🎯 Success Criteria

For EACH test, verify:

- [ ] API returns success (200/201)
- [ ] Backend shows "✅ Notification sent"
- [ ] Firebase Console shows message
- [ ] No errors in logs

---

## ⚡ Testing Speed Tips

1. **Keep tokens in editor** - copy/paste instead of re-logging in
2. **Use Postman collection** - save all endpoints
3. **Test in groups** - do all Application tests together
4. **Watch logs** - terminal will show results immediately
5. **Check Firebase** - verify delivery after each group

---

## 📊 Test Status Template

Copy this for each test:

```
TEST: [Name]
Status: [ ] PASS / [ ] FAIL
Backend Log: [What you saw]
Firebase: [Message visible: YES/NO]
Notes: [Any issues]
```

---

## 🚀 Start Testing!

Run these tests in order:
1. Job tests (1, 2, 3, 4)
2. Attendance tests (5, 6)
3. Business tests (7, 8, 9, 10)
4. Shift tests (11, 12, 13)
5. Conversation tests (14, 15)
6. Payment tests (16, 17)
7. Auth tests (18)

**Total Time:** ~1-2 hours for all 18 tests

Good luck! 🧪✨
