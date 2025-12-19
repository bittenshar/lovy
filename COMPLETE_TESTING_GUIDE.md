# 🧪 Complete Notification Testing Guide

## All 18 Notification Points - Testing Procedures

This guide covers testing every notification implementation across all 8 modules.

---

## 📋 Testing Checklist Overview

| Module | Feature | Template | Status | Test? |
|--------|---------|----------|--------|-------|
| **Applications** | Job Applied | jobApplied | ✅ | [ ] |
| **Applications** | Job Accepted | jobAccepted | ✅ | [ ] |
| **Applications** | Job Rejected | jobRejected | ✅ | [ ] |
| **Jobs** | Job Posted | jobPosted | ✅ | [ ] |
| **Attendance** | Check In | attendanceCheckIn | ✅ | [ ] |
| **Attendance** | Check Out | attendanceCheckOut | ✅ | [ ] |
| **Business** | Business Created | businessCreated | ✅ | [ ] |
| **Business** | Business Updated | businessUpdated | ✅ | [ ] |
| **Business** | Team Member Added | teamMemberAdded | ✅ | [ ] |
| **Business** | Team Member Removed | teamMemberRemoved | ✅ | [ ] |
| **Shifts** | Swap Requested | shiftSwapRequested | ✅ | [ ] |
| **Shifts** | Swap Approved | shiftSwapApproved | ✅ | [ ] |
| **Shifts** | Swap Rejected | shiftSwapRejected | ✅ | [ ] |
| **Conversations** | Message Received | messageReceived | ✅ | [ ] |
| **Conversations** | Conversation Started | conversationStarted | ✅ | [ ] |
| **Payments** | Payment Processed | paymentProcessed | ✅ | [ ] |
| **Payments** | Payment Failed | paymentFailed | ✅ | [ ] |
| **Auth** | User Logout | logout | ✅ | [ ] |

---

## 🔧 Setup Before Testing

### Prerequisites:
```bash
✅ Backend running (http://localhost:3000)
✅ Firebase configured with FCM tokens
✅ At least 2 test users created
✅ Postman or cURL ready
✅ Firebase Console open in browser
✅ Backend logs visible in terminal
```

### Create Test Users:
```bash
# User 1 (Employer)
POST http://localhost:3000/api/auth/signup
{
  "email": "employer@test.com",
  "password": "Test@123",
  "firstName": "John",
  "lastName": "Employer",
  "userType": "employer"
}

# User 2 (Worker)
POST http://localhost:3000/api/auth/signup
{
  "email": "worker@test.com",
  "password": "Test@123",
  "firstName": "Jane",
  "lastName": "Worker",
  "userType": "worker"
}

# User 3 (Another Employer/Team Member)
POST http://localhost:3000/api/auth/signup
{
  "email": "user3@test.com",
  "password": "Test@123",
  "firstName": "Bob",
  "lastName": "User",
  "userType": "employer"
}
```

### Register FCM Tokens for Each User:
```bash
# For User 1
POST http://localhost:3000/api/users/fcm-token
Authorization: Bearer EMPLOYER_TOKEN
{
  "fcmToken": "test_fcm_token_employer_1",
  "platform": "web"
}

# For User 2
POST http://localhost:3000/api/users/fcm-token
Authorization: Bearer WORKER_TOKEN
{
  "fcmToken": "test_fcm_token_worker_1",
  "platform": "web"
}

# For User 3
POST http://localhost:3000/api/users/fcm-token
Authorization: Bearer USER3_TOKEN
{
  "fcmToken": "test_fcm_token_user3_1",
  "platform": "web"
}
```

---

## 🧪 Test Group 1: Applications Module (3 Tests)

### Test 1.1: Job Applied Notification ✅

**What happens:** When worker applies for a job, employer gets notification

**Step 1: Employer creates a job**
```bash
POST http://localhost:3000/api/jobs
Authorization: Bearer EMPLOYER_TOKEN
{
  "title": "Senior Developer",
  "description": "Looking for a senior developer",
  "businessId": "BUSINESS_ID",
  "postedBy": "EMPLOYER_ID",
  "employer": "EMPLOYER_ID",
  "shouldAutoPublish": true,
  "canSwap": true
}

# Response:
{
  "status": "success",
  "data": {
    "_id": "JOB_ID",
    "title": "Senior Developer",
    ...
  }
}
```

**Step 2: Worker applies for job**
```bash
POST http://localhost:3000/api/applications
Authorization: Bearer WORKER_TOKEN
{
  "jobId": "JOB_ID",
  "worker": "WORKER_ID",
  "message": "I'm interested in this position"
}
```

**Expected Result:**
- ✅ Application created
- ✅ Employer receives notification: "Job Applied"
- ✅ Log shows: "✅ [CONV] Conversation started notification sent to: EMPLOYER_ID"

**Verify in logs:**
```
📋 Application created
✅ Notification sent to jobApplied template
```

**Verify in Firebase Console:**
- Go to Cloud Messaging > Messages
- Look for messageReceived type: "job_applied"

---

### Test 1.2: Job Accepted Notification ✅

**What happens:** When employer accepts application, worker gets notification

**Step 1: Employer accepts application**
```bash
PUT http://localhost:3000/api/applications/APPLICATION_ID
Authorization: Bearer EMPLOYER_TOKEN
{
  "status": "hired"
}
```

**Expected Result:**
- ✅ Application status changed to "hired"
- ✅ Worker receives notification: "Job Accepted"
- ✅ Notification shows: "Congratulations! You got the job!"

**Verify in logs:**
```
✅ Application status updated
✅ Notification sent with template: jobAccepted
```

---

### Test 1.3: Job Rejected Notification ✅

**What happens:** When employer rejects application, worker gets notification

**Step 1: Employer rejects application**
```bash
PUT http://localhost:3000/api/applications/APPLICATION_ID
Authorization: Bearer EMPLOYER_TOKEN
{
  "status": "rejected"
}
```

**Expected Result:**
- ✅ Application status changed to "rejected"
- ✅ Worker receives notification: "Application Rejected"
- ✅ Notification shows rejection message

**Verify:**
- Check Firebase Console for delivery
- Check backend logs

---

## 🧪 Test Group 2: Jobs Module (1 Test)

### Test 2.1: Job Posted Notification (Broadcast) ✅

**What happens:** When new job is posted, all workers get broadcast notification

**Step 1: Create and publish job**
```bash
POST http://localhost:3000/api/jobs
Authorization: Bearer EMPLOYER_TOKEN
{
  "title": "Marketing Manager",
  "description": "We need a great marketer",
  "businessId": "BUSINESS_ID",
  "shouldAutoPublish": true
}
```

**Expected Result:**
- ✅ Job published
- ✅ **ALL** workers with FCM tokens receive notification
- ✅ Notification type: "job_posted"
- ✅ Shows: "New Job Posted: Marketing Manager"

**Verify in logs:**
```
✅ sendBroadcast called
Broadcasting to all users with FCM tokens
```

**Verify in Firebase Console:**
- Messages tab should show broadcast message
- Multiple device deliveries

---

## 🧪 Test Group 3: Attendance Module (2 Tests)

### Test 3.1: Check-In Notification ✅

**What happens:** Worker clocks in, gets check-in confirmation

**Step 1: Worker clocks in**
```bash
POST http://localhost:3000/api/attendance/clock-in
Authorization: Bearer WORKER_TOKEN
{
  "shiftId": "SHIFT_ID",
  "businessId": "BUSINESS_ID"
}
```

**Expected Result:**
- ✅ Attendance record created
- ✅ Worker receives notification: "Check-in Confirmed"
- ✅ Shows: "Jane checked in at 09:30"

**Verify:**
```
✅ attendanceCheckIn notification sent
Worker receives: "Check-in Confirmed at HH:mm"
```

---

### Test 3.2: Check-Out Notification ✅

**What happens:** Worker clocks out, gets summary notification

**Step 1: Worker clocks out**
```bash
POST http://localhost:3000/api/attendance/clock-out
Authorization: Bearer WORKER_TOKEN
{
  "recordId": "ATTENDANCE_RECORD_ID"
}
```

**Expected Result:**
- ✅ Attendance record updated
- ✅ Worker receives notification: "Check-out Confirmed"
- ✅ Shows: "Jane checked out at HH:mm"
- ✅ Includes hours worked and earnings

**Verify:**
```
✅ attendanceCheckOut notification sent
Worker receives: "Check-out Confirmed with hours and earnings"
```

---

## 🧪 Test Group 4: Business Module (4 Tests)

### Test 4.1: Business Created Notification ✅

**What happens:** When employer creates business, they get confirmation

**Step 1: Create business**
```bash
POST http://localhost:3000/api/businesses
Authorization: Bearer EMPLOYER_TOKEN
{
  "name": "Tech Company Inc",
  "location": "New York, NY",
  "industry": "Technology"
}
```

**Expected Result:**
- ✅ Business created
- ✅ Employer receives notification: "Business Created"
- ✅ Shows: "Tech Company Inc created successfully"

**Verify in logs:**
```
✅ businessCreated notification sent to employer
```

---

### Test 4.2: Business Updated Notification ✅

**What happens:** When business is updated, employer gets notification

**Step 1: Update business**
```bash
PUT http://localhost:3000/api/businesses/BUSINESS_ID
Authorization: Bearer EMPLOYER_TOKEN
{
  "name": "Tech Company Inc Updated",
  "location": "San Francisco, CA"
}
```

**Expected Result:**
- ✅ Business updated
- ✅ Employer receives notification: "Business Updated"
- ✅ Shows updated business name

---

### Test 4.3: Team Member Added Notification ✅

**What happens:** When new member added to team, they get notification

**Step 1: Add team member**
```bash
POST http://localhost:3000/api/businesses/BUSINESS_ID/team-members
Authorization: Bearer EMPLOYER_TOKEN
{
  "email": "newmember@test.com",
  "name": "New Member",
  "role": "manager"
}
```

**Expected Result:**
- ✅ Team member created
- ✅ New member receives notification: "Team Member Added"
- ✅ Shows: "You've been added to Tech Company Inc as manager"

**Verify:**
```
✅ teamMemberAdded notification sent
New member receives: "Added to team at business"
```

---

### Test 4.4: Team Member Removed Notification ✅

**What happens:** When member removed from team, they get notification

**Step 1: Remove team member**
```bash
DELETE http://localhost:3000/api/businesses/BUSINESS_ID/team-members/MEMBER_ID
Authorization: Bearer EMPLOYER_TOKEN
```

**Expected Result:**
- ✅ Team member removed
- ✅ Removed member receives notification: "Team Member Removed"
- ✅ Shows: "You've been removed from Tech Company Inc"

---

## 🧪 Test Group 5: Shifts Module (3 Tests)

### Test 5.1: Shift Swap Requested Notification ✅

**What happens:** When worker requests swap, target worker gets notification

**Step 1: Create shifts**
```bash
POST http://localhost:3000/api/shifts
Authorization: Bearer EMPLOYER_TOKEN
{
  "worker": "WORKER_ID",
  "businessId": "BUSINESS_ID",
  "scheduledStart": "2024-12-20T09:00:00Z",
  "scheduledEnd": "2024-12-20T17:00:00Z",
  "status": "assigned",
  "canSwap": true
}
```

**Step 2: Request swap**
```bash
POST http://localhost:3000/api/shifts/swap/request
Authorization: Bearer WORKER_TOKEN
{
  "shiftId": "SHIFT_ID",
  "toWorkerId": "OTHER_WORKER_ID",
  "message": "Can you cover my shift?"
}
```

**Expected Result:**
- ✅ Swap request created
- ✅ Target worker receives notification: "Shift Swap Requested"
- ✅ Shows: "John requested to swap shift on Dec 20"

---

### Test 5.2: Shift Swap Approved Notification ✅

**Step 1: Target worker approves swap**
```bash
PUT http://localhost:3000/api/shifts/swap/SWAP_ID
Authorization: Bearer OTHER_WORKER_TOKEN
{
  "status": "approved"
}
```

**Expected Result:**
- ✅ Swap approved
- ✅ Requesting worker receives notification: "Shift Swap Approved"
- ✅ Shows: "Your shift swap has been approved"

---

### Test 5.3: Shift Swap Rejected Notification ✅

**Step 1: Target worker rejects swap**
```bash
PUT http://localhost:3000/api/shifts/swap/SWAP_ID
Authorization: Bearer OTHER_WORKER_TOKEN
{
  "status": "rejected",
  "message": "Cannot cover that shift"
}
```

**Expected Result:**
- ✅ Swap rejected
- ✅ Requesting worker receives notification: "Shift Swap Rejected"
- ✅ Shows: "Your shift swap request was declined"

---

## 🧪 Test Group 6: Conversations Module (2 Tests)

### Test 6.1: Message Received Notification ✅

**What happens:** When message sent in conversation, recipient gets notification

**Step 1: Create conversation**
```bash
POST http://localhost:3000/api/conversations
Authorization: Bearer USER1_TOKEN
{
  "participants": ["USER2_ID"]
}

# Response: { "_id": "CONV_ID" }
```

**Step 2: Send message**
```bash
POST http://localhost:3000/api/conversations/CONV_ID/messages
Authorization: Bearer USER1_TOKEN
{
  "body": "Hello! This is a test message for FCM notification"
}
```

**Expected Result:**
- ✅ Message created
- ✅ User 2 receives notification: "New Message"
- ✅ Shows: "User 1: Hello! This is a test message..."
- ✅ Includes full message in payload (150 chars)

**Verify in logs:**
```
✅ [MSG] FCM notification sent successfully to: USER2_ID
Message payload includes:
  - senderName: "John"
  - messagePreview: "Hello! This is a test..."
  - messageFull: "Hello! This is a test message for FCM notification"
  - timestamp: "2024-12-19T..."
```

---

### Test 6.2: Conversation Started Notification ✅

**What happens:** When new conversation created, other party gets notification

**Step 1: User 1 starts conversation with User 2**
```bash
POST http://localhost:3000/api/conversations
Authorization: Bearer USER1_TOKEN
{
  "participants": ["USER2_ID"]
}
```

**Expected Result:**
- ✅ Conversation created
- ✅ User 2 receives notification: "New Conversation"
- ✅ Shows: "John started a conversation with you"

**Verify:**
```
✅ conversationStarted notification sent
User 2 receives: "New Conversation - John initiated"
```

---

## 🧪 Test Group 7: Payments Module (2 Tests)

### Test 7.1: Payment Processed Notification ✅

**What happens:** When payment succeeds, user gets confirmation

**Step 1: Create payment order**
```bash
POST http://localhost:3000/api/payments/razorpay/order
Authorization: Bearer EMPLOYER_TOKEN
{
  "amount": 29900,
  "currency": "INR",
  "description": "Job posting purchase",
  "intent": "job_posting"
}

# Response: { "paymentId": "PAYMENT_ID", "order": { "id": "ORDER_ID" } }
```

**Step 2: Verify payment**
```bash
POST http://localhost:3000/api/payments/razorpay/verify
Authorization: Bearer EMPLOYER_TOKEN
{
  "orderId": "ORDER_ID",
  "paymentId": "RAZORPAY_PAYMENT_ID",
  "signature": "RAZORPAY_SIGNATURE",
  "status": "succeeded"
}
```

**Expected Result:**
- ✅ Payment verified
- ✅ Employer receives notification: "Payment Processed"
- ✅ Shows: "INR 299.00 payment successful"

---

### Test 7.2: Payment Failed Notification ✅

**Step 1: Verify failed payment**
```bash
POST http://localhost:3000/api/payments/razorpay/verify
Authorization: Bearer EMPLOYER_TOKEN
{
  "orderId": "ORDER_ID",
  "paymentId": "RAZORPAY_PAYMENT_ID",
  "signature": "RAZORPAY_SIGNATURE",
  "status": "failed"
}
```

**Expected Result:**
- ✅ Payment marked as failed
- ✅ User receives notification: "Payment Failed"
- ✅ Shows: "Payment of INR 299.00 failed"

---

## 🧪 Test Group 8: Auth Module (1 Test)

### Test 8.1: Logout Notification ✅

**What happens:** When user logs out, they get confirmation notification

**Step 1: User logs out**
```bash
POST http://localhost:3000/api/auth/logout
Authorization: Bearer USER_TOKEN
```

**Expected Result:**
- ✅ User logged out
- ✅ User receives notification: "Logged Out"
- ✅ Shows: "You have logged out"

**Verify:**
```
✅ logout notification sent
User receives: "Logout confirmed"
```

---

## 📊 Log Monitoring Guide

### What to Look For in Terminal Logs:

**Success Pattern:**
```
✅ [MODULE] Action completed
✅ Notification sent successfully to: USER_ID
[Type and action]: notification_type sent
```

**Example Success Logs:**
```
📋 Application created
✅ [APP] Notification sent to jobApplied template
✅ [CONV] Conversation started notification sent to: 63f7d1...

📱 [MSG] FCM notification sent successfully to: 63f7d1...
Message: "New Message from John Doe"

💼 [BUSINESS] businessCreated notification sent
```

**Error Pattern (Still OK):**
```
⚠️ Failed to send notification
⚠️ Error: [error details]
```
**Note:** Errors are OK - request still succeeds!

---

## 🔍 Firebase Console Verification

### Step-by-Step:

1. **Go to Firebase Console**
   - firebase.google.com
   - Select your project

2. **Navigate to Cloud Messaging**
   - Left sidebar → Cloud Messaging

3. **Check Messages Tab**
   - Sort by "Date sent" (newest first)
   - Look for your recent tests
   - Check "Status" column:
     - ✅ Success
     - ❌ Failed (if FCM unavailable)

4. **Click Message to See Details:**
   - Recipient count
   - Device delivery status
   - Data payload sent
   - Timestamp

### Expected Entries:
```
Message Type | Status | Recipients | Time
job_applied | Success | 1 | 10:30 AM
new_message | Success | 1 | 10:31 AM
```

---

## ✅ Quick Test Checklist

Use this to mark off each test:

```
GROUP 1: APPLICATIONS
[ ] Test 1.1 - Job Applied
[ ] Test 1.2 - Job Accepted  
[ ] Test 1.3 - Job Rejected

GROUP 2: JOBS
[ ] Test 2.1 - Job Posted (Broadcast)

GROUP 3: ATTENDANCE
[ ] Test 3.1 - Check-In
[ ] Test 3.2 - Check-Out

GROUP 4: BUSINESS
[ ] Test 4.1 - Business Created
[ ] Test 4.2 - Business Updated
[ ] Test 4.3 - Team Member Added
[ ] Test 4.4 - Team Member Removed

GROUP 5: SHIFTS
[ ] Test 5.1 - Swap Requested
[ ] Test 5.2 - Swap Approved
[ ] Test 5.3 - Swap Rejected

GROUP 6: CONVERSATIONS
[ ] Test 6.1 - Message Received
[ ] Test 6.2 - Conversation Started

GROUP 7: PAYMENTS
[ ] Test 7.1 - Payment Processed
[ ] Test 7.2 - Payment Failed

GROUP 8: AUTH
[ ] Test 8.1 - Logout
```

---

## 🐛 Troubleshooting

### No Notifications Received?

**Check 1: FCM Token Registered**
```bash
# In MongoDB
db.users.findOne({ email: "user@test.com" })
# Should show: fcmTokens: ["token_string"]
```

**Check 2: Check Backend Logs**
- Look for: `✅ Notification sent`
- Or: `⚠️ Failed to send notification`

**Check 3: Firebase Console**
- Check if messages appear in Cloud Messaging
- Check delivery status

**Check 4: Firebase Credentials**
- Verify firebase config is loaded
- Check credentials in `config/firebase.js`

---

## 📈 Success Indicators

When a notification test succeeds, you should see:

✅ **In Terminal:**
- `✅ Notification sent successfully to: USER_ID`
- Or specific template name logged

✅ **In Firebase Console:**
- Message appears in Cloud Messaging
- Status shows "Success"
- Recipient count shows 1+

✅ **In Code:**
- No error in try-catch block
- Request completes with 200/201 status

---

## 🎯 Expected Results Summary

| Test | Expected Behavior |
|------|-------------------|
| Job Applied | Employer gets notification |
| Job Accepted | Worker gets notification |
| Job Rejected | Worker gets notification |
| Job Posted | All workers get broadcast |
| Check-In | Worker gets notification |
| Check-Out | Worker gets notification |
| Business Created | Employer gets notification |
| Business Updated | Employer gets notification |
| Team Added | New member gets notification |
| Team Removed | Removed member gets notification |
| Swap Requested | Target worker gets notification |
| Swap Approved | Requesting worker gets notification |
| Swap Rejected | Requesting worker gets notification |
| Message | Recipients get notification |
| Conversation Started | Other party gets notification |
| Payment Processed | Payer gets notification |
| Payment Failed | Payer gets notification |
| Logout | User gets notification |

---

## 🚀 Ready to Test!

All 18 notifications are implemented and ready. Follow the tests above to verify each one. Good luck! 🧪
