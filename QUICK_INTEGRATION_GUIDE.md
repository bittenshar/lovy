# 🚀 Quick Integration Checklist

Use this to add notifications to any new or existing API endpoint.

---

## Step 1: Add Import (Top of Controller File)

```javascript
const notificationUtils = require('../notification/notification.utils');
```

---

## Step 2: After Database Operation, Add Notification

After your database `create()`, `update()`, or `delete()` operation succeeds, add:

```javascript
// SEND NOTIFICATION - [Description]
try {
  await notificationUtils.sendTemplatedNotification(
    recipientUserId.toString(),
    "templateName",
    [arg1, arg2, arg3],
    {
      data: {
        entityId: resource._id.toString(),
        otherField: value
      }
    }
  );
} catch (error) {
  console.error("Notification error:", error.message);
}
```

---

## Step 3: Choose Template

Pick from `src/shared/constants/templetes.js`:

### **Job Templates**
- `jobApplied` - When worker applies
- `jobAccepted` - When worker hired
- `jobRejected` - When application rejected
- `jobPosted` - When job published
- `jobExpiringSoon` - Job expiring in 24h

### **Attendance Templates**
- `attendanceCheckIn` - Worker clocks in
- `attendanceCheckOut` - Worker clocks out
- `attendanceReminder` - Before shift starts
- `attendanceConfirmed` - Shift attendance confirmed
- `attendanceMissed` - Worker missed shift

### **Conversation Templates**
- `messageReceived` - New message in chat
- `conversationStarted` - New conversation
- `conversationEnded` - Conversation ended

### **Payment Templates**
- `paymentProcessed` - Payment successful
- `paymentFailed` - Payment failed
- `paymentPending` - Payment processing
- `invoiceReady` - Invoice ready

### **Shift Templates**
- `shiftSwapRequested` - Swap request received
- `shiftSwapApproved` - Swap approved
- `shiftSwapRejected` - Swap rejected

### **Team Templates**
- `teamMemberAdded` - Added to team
- `teamMemberRemoved` - Removed from team
- `roleAssigned` - Role changed

### **Business Templates**
- `businessCreated` - New business created
- `businessUpdated` - Business updated

### **Auth Templates**
- `logout` - User logged out
- `forcedLogout` - Admin forced logout
- `accountLocked` - Account locked
- `passwordChanged` - Password changed

### **Approval Templates**
- `approvalPending` - Awaiting approval
- `approvalApproved` - Approved
- `approvalRejected` - Rejected

### **General Templates**
- `generic` - Generic notification
- `alert` - Alert message
- `announcement` - System announcement
- `systemMaintenance` - Maintenance notice
- `reminder` - Generic reminder
- `pendingAction` - Action needed

---

## Step 4: Prepare Arguments

Each template expects specific arguments. Check the template file for the exact order:

```javascript
// Example 1: Job template
["Frontend Developer", "Google"]  // [jobTitle, companyName]

// Example 2: Attendance template
["John", "09:00"]  // [workerName, formattedTime]

// Example 3: Message template
["Alice", "Thanks for..."]  // [senderName, messagePreview]
```

---

## Step 5: Add Data Object

Include context for the frontend to route/navigate:

```javascript
{
  data: {
    type: "event_type",     // For routing
    action: "view_item",    // What to do
    itemId: id.toString(),  // Which item
    relatedId: otherId      // Additional context
  }
}
```

---

## Real-World Examples

### ✅ Example 1: Creating a Resource

```javascript
exports.createJob = catchAsync(async (req, res) => {
  const job = await Job.create(req.body);
  
  // SEND NOTIFICATION - Job Created
  try {
    await notificationUtils.sendTemplatedNotification(
      req.user._id.toString(),
      "jobPosted",
      [job.title, job.businessName],
      {
        data: {
          type: "job_created",
          action: "view_job",
          jobId: job._id.toString()
        }
      }
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }
  
  res.status(201).json({ status: 'success', data: job });
});
```

### ✅ Example 2: Updating a Status

```javascript
exports.updateStatus = catchAsync(async (req, res) => {
  let item = await Item.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  
  // SEND NOTIFICATION - Status Changed
  try {
    const templateName = item.status === 'approved' ? 'approvalApproved' : 'approvalRejected';
    
    await notificationUtils.sendTemplatedNotification(
      item.userId.toString(),
      templateName,
      [item.title],
      {
        data: {
          itemId: item._id.toString(),
          newStatus: item.status
        }
      }
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }
  
  res.status(200).json({ status: 'success', data: item });
});
```

### ✅ Example 3: Broadcast to Multiple Users

```javascript
exports.sendAnnouncement = catchAsync(async (req, res) => {
  // Send to multiple users
  try {
    await notificationUtils.sendToMultipleUsers(
      userIds,  // Array of user IDs
      {
        title: "System Announcement",
        message: req.body.message,
        data: { type: "announcement", action: "read" }
      }
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }
  
  res.status(200).json({ status: 'success' });
});
```

### ✅ Example 4: Broadcast to All Users

```javascript
exports.sendBroadcast = catchAsync(async (req, res) => {
  // Send to ALL users with FCM tokens
  try {
    await notificationUtils.sendBroadcast({
      title: "System Maintenance",
      message: "Server will be down for 2 hours",
      data: { type: "system", action: "acknowledge" }
    });
  } catch (error) {
    console.error("Notification error:", error.message);
  }
  
  res.status(200).json({ status: 'success' });
});
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T: Use hardcoded messages
```javascript
// ❌ WRONG - Message is hardcoded!
await sendNotification(userId, "Your job was approved!");
```

### ✅ DO: Use templates
```javascript
// ✅ RIGHT - Uses centralized template
await notificationUtils.sendTemplatedNotification(
  userId.toString(),
  "jobAccepted",
  [jobTitle],
  { data: { jobId } }
);
```

---

### ❌ DON'T: Skip error handling
```javascript
// ❌ WRONG - Will break if notification fails
const result = await notificationUtils.sendTemplatedNotification(...);
```

### ✅ DO: Wrap in try-catch
```javascript
// ✅ RIGHT - Errors don't break the request
try {
  await notificationUtils.sendTemplatedNotification(...);
} catch (error) {
  console.error("Notification error:", error.message);
}
```

---

### ❌ DON'T: Convert userId if already string
```javascript
// ❌ WRONG - Double conversion
userId.toString().toString()
```

### ✅ DO: Convert once
```javascript
// ✅ RIGHT - Single conversion
userId.toString()
```

---

### ❌ DON'T: Mix raw IDs in data
```javascript
// ❌ WRONG - IDs not stringified
data: { jobId: job._id }
```

### ✅ DO: Stringify all IDs in data
```javascript
// ✅ RIGHT - All IDs are strings
data: { jobId: job._id.toString() }
```

---

## 🔍 Testing Your Implementation

### 1. Verify Import Works
```bash
grep "notificationUtils" src/modules/yourmodule/yourcontroller.js
```

### 2. Check Template Exists
```bash
grep "yourTemplateName" src/shared/constants/templetes.js
```

### 3. Test in Development
```javascript
// Create test resource and check console for:
// - "Notification sent to user: xxx"
// - No error messages
// - Request completes successfully
```

### 4. Verify FCM Tokens
```bash
# Check if users have FCM tokens in database
db.users.findOne({ _id: userId }).fcmTokens
```

---

## 📋 Implementation Checklist

When adding a notification to an endpoint:

- [ ] Added `const notificationUtils = require(...)` at top
- [ ] Chose correct template name from `templetes.js`
- [ ] Prepared correct number of arguments for template
- [ ] Wrapped in `try-catch` block
- [ ] Converted userId to string with `.toString()`
- [ ] Added data object with context
- [ ] Stringified all IDs in data object
- [ ] Tested in development environment
- [ ] Verified template arguments match template format
- [ ] Error handling logs but doesn't break request

---

## 📞 Support

**Question:** How do I find the right template?
**Answer:** Open `src/shared/constants/templetes.js` and search for your scenario.

**Question:** My notification isn't sending?
**Answer:** Check:
1. Is the template name spelled correctly?
2. Does the recipient have an FCM token?
3. Are you in try-catch?
4. Is userId a string?

**Question:** Can I create a custom template?
**Answer:** Yes! Add it to `templetes.js` following the existing pattern.

---

## 🎯 Next Steps

1. Choose your endpoint
2. Follow the 5-step process above
3. Test locally
4. Verify in `templetes.js` that the template exists
5. Done! ✅

---

**Remember:** All templates are in `src/shared/constants/templetes.js`. Never hardcode messages! 🚀
