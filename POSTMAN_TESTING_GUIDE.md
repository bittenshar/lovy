# 🧪 OneSignal Postman Testing Guide

Complete guide to test all OneSignal API endpoints using Postman with automated test scripts.

## 📥 Import Collection

1. **Open Postman**
2. **Click "Import"** (top-left corner)
3. **Select "postman/OneSignal-Complete-Testing.postman_collection.json"**
4. ✅ Collection imported successfully!

## 🔧 Setup Variables

Before running tests, configure your environment:

### Option 1: Manual Setup
1. Click **"Variables"** tab (top-right)
2. Set the following variables:

| Variable | Value | Example |
|----------|-------|---------|
| `baseUrl` | Your API base URL | `http://localhost:3000` |
| `auth_token` | Leave empty (auto-filled by login) | - |
| `employer_token` | Leave empty (auto-filled by login) | - |
| `user_id` | Leave empty (auto-filled by login) | - |

### Option 2: Use Environment File
1. Create new environment
2. Import provided variables
3. Save and select environment

## ✅ Testing Workflow

### Phase 1: Authentication (5 minutes)

**Step 1: Login as Worker**
```
📍 Folder: 🔐 Authentication
🔗 Request: Login - Worker
```
- Click **"Send"**
- ✅ Status should be 200
- ✅ `auth_token` auto-saved to variables
- ✅ `user_id` auto-saved to variables

**Step 2: Login as Employer** (Optional)
```
📍 Folder: 🔐 Authentication
🔗 Request: Login - Employer
```
- Saves `employer_token` for broadcast notifications

### Phase 2: Device Registration (10 minutes)

**Step 3: Register iOS Device**
```
📍 Folder: 📱 Device Registration
🔗 Request: Register OneSignal ID (iOS)
```
- Click **"Send"**
- ✅ Status: 200
- ✅ `onesignal_id` auto-saved
- ✅ Platform: iOS

**Step 4: Check Registration Status**
```
📍 Folder: 📱 Device Registration
🔗 Request: Get OneSignal Status
```
- Verifies device is registered
- Shows registration timestamp
- Displays device platform

### Phase 3: Send Notifications (10 minutes)

**Step 5: Send Test Notification**
```
📍 Folder: 📨 Send Notifications
🔗 Request: Test Notification
```
- Quickest way to test
- Should receive notification on device
- Returns notification ID

**Step 6: Send to Specific Users**
```
📍 Folder: 📨 Send Notifications
🔗 Request: Send to Specific Users
```
Pre-configured with:
- Title: 🎯 New Job Opportunity
- Message: Senior Developer role at TechCorp
- Custom data: jobId, jobTitle, salary, location
- Image URL support
- High priority

**Step 7: Broadcast to All Workers**
```
📍 Folder: 📨 Send Notifications
🔗 Request: Send to All Workers
```
- Sends to all registered workers
- Perfect for announcements
- Tracks delivery metrics

**Step 8: Broadcast to All Employers**
```
📍 Folder: 📨 Send Notifications
🔗 Request: Send to All Employers
```
- Targets all employers
- Use for feature announcements
- Admin notifications

### Phase 4: Advanced Features (Optional)

**Step 9: Schedule Notification**
```
📍 Folder: ⏰ Advanced Features
🔗 Request: Schedule Notification
```
- Schedule for future time
- Pre-set to Dec 15, 2024 10:00 AM
- Modify `scheduledTime` as needed

**Step 10: Check Notification Status**
```
📍 Folder: ⏰ Advanced Features
🔗 Request: Get Notification Status
```
- Uses last sent notification ID
- Shows: recipients, failed, converted
- Displays delivery analytics

## 🎯 Quick Test Scenarios

### Scenario 1: Complete Flow (15 minutes)
```
1. Login Worker (🔐)
   ↓
2. Register Device (📱)
   ↓
3. Check Status (📱)
   ↓
4. Send Test (📨)
   ↓
5. Verify Reception (Check device)
```

**Expected Results:**
- ✅ All requests: 200 status
- ✅ Device registered with OneSignal
- ✅ Test notification received
- ✅ Notification appears on device

### Scenario 2: Broadcast Campaign (10 minutes)
```
1. Login Employer (🔐)
   ↓
2. Send to Workers (📨)
   ↓
3. Send to Employers (📨)
   ↓
4. Check Status (⏰)
```

### Scenario 3: Scheduled Notifications (5 minutes)
```
1. Schedule Notification (⏰)
   ↓
2. Save notification ID
   ↓
3. Check Status Later (⏰)
```

## 📊 Test Script Features

All requests include automatic test scripts that verify:

✅ **Response Status**
- HTTP 200 status code
- Success response format

✅ **Data Validation**
- Required fields present
- Correct data types
- Expected values

✅ **Auto-Capture**
- Tokens saved to variables
- Device IDs saved
- Notification IDs saved

✅ **Console Logging**
- Readable output
- Emoji indicators
- Helpful messages

## 🔍 View Test Results

After each request:

1. **Tests Tab**
   - Green ✅ = Passed
   - Red ❌ = Failed
   - Shows assertion details

2. **Console Output**
   - Click **"Console"** (bottom-left)
   - See detailed logs
   - Track variable changes

3. **Response Body**
   - Review actual API response
   - Check returned data
   - Verify structure

## ⚙️ Customize Requests

### Change Notification Title
```json
{
  "title": "Your Custom Title 📢",
  "message": "Your message here"
}
```

### Target Specific Users
```json
{
  "users": ["user-id-1", "user-id-2", "user-id-3"]
}
```

### Add Custom Data
```json
{
  "data": {
    "customKey1": "value1",
    "customKey2": "value2",
    "jobId": "job-123"
  }
}
```

### Schedule for Different Time
```json
{
  "scheduledTime": "2024-12-20T15:30:00Z"
}
```

### Add Rich Media
```json
{
  "imageUrl": "https://your-image-url.com/banner.png",
  "largeIcon": "https://your-icon-url.com/icon.png"
}
```

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:**
1. Run login request first
2. Wait for token to auto-save
3. Ensure `auth_token` is in headers

### Issue: 400 Bad Request
**Solution:**
1. Check request body format (valid JSON)
2. Verify required fields present
3. Ensure environment variables set

### Issue: Notification Not Received
**Solution:**
1. Verify device registered (Check Status)
2. Ensure app has notification permissions
3. Check OneSignal dashboard for errors
4. Verify app is installed from correct bundle

### Issue: 500 Server Error
**Solution:**
1. Restart server: `npm run dev`
2. Check .env has credentials
3. Verify MongoDB connection
4. Check server logs

## 📈 Running Full Test Suite

### Option 1: Run Folder
1. Right-click on folder name
2. Select **"Run"**
3. Postman runner opens
4. Displays all test results

### Option 2: Run Collection
1. Click **"Run"** in top-left
2. Select collection
3. Choose environment
4. Start tests

### Option 3: Set Delays Between Requests
1. Click **"..."** menu
2. Select **"Settings"**
3. Add delay (e.g., 1000ms)
4. Run again

## 📝 Test Scenarios Included

### 1. **Register + Send + Check**
- Login worker
- Register device
- Send notification
- Check status

### 2. **Multi-User Campaign**
- Login employer
- Broadcast to workers
- Show delivery metrics

### 3. **Custom Notifications**
- Send with custom data
- Include images
- Set priorities

## 🚀 Performance Testing

### Load Test Notifications
1. Run "Send to All Workers" multiple times
2. Monitor response times
3. Check success rates

### Stress Test
1. Create multiple requests
2. Run with small delays
3. Monitor server stability

## 📚 Environment Variables Reference

```env
# Auto-populated by login
auth_token         - Worker JWT token
employer_token     - Employer JWT token
user_id           - Current user's MongoDB ID
employer_id       - Employer's MongoDB ID

# Auto-populated by registration
onesignal_id      - Registered device OneSignal ID
android_onesignal_id - Android device ID
last_notification_id - Last sent notification ID

# Manual setup
baseUrl           - API base URL (http://localhost:3000)
```

## ✨ Tips & Tricks

1. **Auto-Run Tests**: Tests run automatically after each request
2. **Save Responses**: Postman saves recent responses
3. **Duplicate Requests**: Right-click → Duplicate to make variations
4. **Pre-request Scripts**: Modify request before sending
5. **Environment Switching**: Switch environments without re-entering values

## 🔗 Useful Links

- **OneSignal Dashboard**: https://dashboard.onesignal.com
- **Postman Docs**: https://learning.postman.com
- **API Reference**: ONESIGNAL_INTEGRATION.md

## 📋 Checklist Before Testing

- [ ] Postman installed
- [ ] Collection imported
- [ ] Environment configured
- [ ] Server running (`npm run dev`)
- [ ] Valid test user accounts exist
- [ ] OneSignal credentials in .env
- [ ] Mobile device/emulator ready
- [ ] Notification permissions enabled on device

## 🎯 Expected Test Flow Duration

| Phase | Time | Steps |
|-------|------|-------|
| Authentication | 2 min | 1-2 |
| Registration | 3 min | 3-4 |
| Basic Sending | 5 min | 5-8 |
| Advanced | 5 min | 9-10 |
| **Total** | **~15 min** | **10 requests** |

## ✅ Success Indicators

✅ All test scripts show green checkmarks  
✅ Response status 200 for all requests  
✅ Notifications received on device  
✅ Environment variables auto-populated  
✅ Console shows no errors  
✅ API response data properly formatted  

---

**Happy Testing! 🚀**

For detailed API documentation, see: `ONESIGNAL_INTEGRATION.md`
