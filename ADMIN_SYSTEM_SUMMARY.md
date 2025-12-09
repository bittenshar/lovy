# ADMIN STATIC TOKEN & ERROR NOTIFICATION SYSTEM

## 📋 Summary

You now have a complete system for:
1. **Static Admin Tokens** - Tokens that never expire for admin operations
2. **Error Notifications** - Automatic alerts sent to admins/employees when errors occur

---

## 🎯 What Was Created

### Services (Business Logic)
1. **`src/services/admin-token.service.js`**
   - Generate static tokens (no expiration)
   - Save/list/revoke tokens
   - Token management utilities

2. **`src/services/error-notification.service.js`**
   - Send errors to admins
   - Send errors to business owners
   - Send errors to specific users
   - Send errors to team members
   - Pre-built error scenarios

### Controllers (API Handlers)
3. **`src/controllers/admin-token.controller.js`**
   - API endpoints for token operations
   - Create admin users
   - Generate/list/revoke tokens

### Routes (API Endpoints)
4. **`src/routes/admin-token.routes.js`**
   - Mounts all admin endpoints
   - Available at `/api/admin/*`

### Documentation
5. **`ADMIN_TOKEN_QUICK_START.md`** - 30-second setup guide
6. **`ADMIN_TOKEN_SETUP_GUIDE.md`** - Comprehensive setup guide
7. **`Admin-Token-Management.postman_collection.json`** - Postman collection

---

## ⚙️ How It Works

### Static Admin Token Flow
```
1. Create Admin User
   POST /api/admin/create
   ├─ Input: email, password, name
   └─ Output: User created, user ID returned

2. Generate Static Token
   POST /api/admin/generate-static-token
   ├─ Input: adminEmail
   ├─ Generates JWT with NO expiration
   └─ Output: Token (NEVER expires!)

3. Use Token
   Authorization: Bearer <token>
   └─ Valid forever until revoked

4. Revoke Token (optional)
   POST /api/admin/revoke-token
   └─ Disables the token permanently
```

### Error Notification Flow
```
1. Error Occurs in Your Code
   └─ Job creation fails, payment error, etc.

2. Call Error Notification Service
   await errorNotification.notifyAdmins(...)
   └─ Passes error details

3. Service Fetches Relevant Users
   └─ Finds all admins, owners, or team members with FCM tokens

4. Sends Notifications
   └─ Via Firebase to their devices

5. Alert Displayed
   └─ User sees notification on device with error details
```

---

## 🔌 Integration Points

### In Your Endpoints

```javascript
// 1. Import the service
const errorNotification = require('../services/error-notification.service');

// 2. Wrap in try-catch
exports.createJob = async (req, res) => {
  try {
    const job = await Job.create(req.body);
    res.json({ success: true, data: job });
  } catch (error) {
    // 3. Send error notification
    await errorNotification.notifyAdmins(
      'Job Creation Failed',
      error.message,
      { severity: 'high' }
    );
    
    res.status(500).json({ status: 'fail', message: 'Failed to create job' });
  }
};
```

### Where to Add

Add error notifications to critical endpoints:
- ✅ Payment processing
- ✅ Job posting
- ✅ Application processing
- ✅ Attendance sync
- ✅ Database operations
- ✅ File uploads
- ✅ User registration

---

## 🧪 Testing

### Test with Postman
1. Import `Admin-Token-Management.postman_collection.json`
2. Create admin user
3. Generate static token
4. Test endpoints with the token

### Test with cURL
```bash
# Create admin
curl -X POST http://localhost:3000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"pass","name":"Admin"}'

# Generate token
curl -X POST http://localhost:3000/api/admin/generate-static-token \
  -H "Content-Type: application/json" \
  -d '{"adminEmail":"admin@test.com"}'

# List tokens
curl http://localhost:3000/api/admin/tokens
```

---

## 📱 Error Notification Types

| Type | Recipients | When Used |
|------|------------|-----------|
| `notifyAdmins()` | All admins | Critical system errors |
| `notifyBusinessOwner()` | Business owner | Business-specific errors |
| `notifyUser()` | Specific user | User action failures |
| `notifyTeamMembers()` | Team members | Team-level errors |

---

## 🎨 Error Scenarios

Pre-built messages for common errors:

```javascript
errorNotification.errorScenarios = {
  ATTENDANCE_SYNC_FAILED,      // Attendance system down
  PAYMENT_FAILED,              // Payment processing error
  JOB_POSTING_FAILED,          // Job posting error
  APPLICATION_ERROR,           // Application submission error
  DATABASE_ERROR,              // Database connection error
  FIREBASE_ERROR,              // Firebase/notification error
  AUTHENTICATION_ERROR,        // Auth/session error
  AUTHORIZATION_ERROR          // Permission/access error
}
```

Use like:
```javascript
const scenario = errorNotification.errorScenarios.PAYMENT_FAILED;
await errorNotification.notifyAdmins(scenario.title, scenario.body, { severity: scenario.severity });
```

---

## 🔒 Security Features

✅ **Token Never Expires** - No need to refresh  
✅ **Can Be Revoked** - Disable immediately if compromised  
✅ **Stored in File** - `.admin-tokens.json` (git-ignored)  
✅ **JWT Signed** - With your JWT_SECRET  
✅ **Admin Flag** - Marked as special admin token  

### Best Practices

1. **Store in Environment**
   ```bash
   ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Don't Commit to Git**
   ```bash
   # Add to .gitignore
   .admin-tokens.json
   ```

3. **Rotate Periodically**
   - Revoke old tokens
   - Generate new ones

4. **Monitor Usage**
   - Check backend logs
   - Track who's using what tokens

5. **Secure Storage**
   - Use 1Password, Vault, etc.
   - Not plain text
   - Not in Slack/Email

---

## 📊 API Response Examples

### Generate Token Response
```json
{
  "status": "success",
  "message": "Static admin token generated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "adminId": "67a4b1c2d3e4f5g6h7i8j9k0",
    "email": "admin@workconnect.com",
    "expiresAt": "NEVER",
    "note": "This token never expires. Keep it safe!"
  }
}
```

### Error Notification Response
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "recipientCount": 3,
    "failureCount": 0,
    "adminEmails": ["admin1@test.com", "admin2@test.com"]
  }
}
```

---

## 🚀 Production Checklist

- [ ] Create admin user with strong password
- [ ] Generate static admin token
- [ ] Store token in environment variable
- [ ] Add `.admin-tokens.json` to `.gitignore`
- [ ] Add error notifications to critical endpoints
- [ ] Test error notifications work
- [ ] Set up Firebase tokens for admin users
- [ ] Monitor notification delivery
- [ ] Document token location securely
- [ ] Set up token rotation schedule

---

## 📞 Support

### Common Issues

**Q: Token expired error?**  
A: Static tokens never expire. If error persists, regenerate a new token.

**Q: Notifications not arriving?**  
A: Check that admin users have FCM tokens registered in their User documents.

**Q: How to check token validity?**  
A: Use `GET /api/admin/tokens` to list all active tokens.

**Q: Lost the token?**  
A: Generate a new one with `POST /api/admin/generate-static-token`

---

## 📁 File Structure

```
dhruvbackend/
├── src/
│   ├── services/
│   │   ├── admin-token.service.js          [NEW]
│   │   └── error-notification.service.js   [NEW]
│   ├── controllers/
│   │   └── admin-token.controller.js       [NEW]
│   ├── routes/
│   │   ├── admin-token.routes.js           [NEW]
│   │   └── index.js                        [UPDATED - added admin routes]
│   └── ...
├── .admin-tokens.json                      [CREATED ON FIRST TOKEN]
├── ADMIN_TOKEN_QUICK_START.md              [NEW]
├── ADMIN_TOKEN_SETUP_GUIDE.md              [NEW]
├── Admin-Token-Management.postman_collection.json  [NEW]
└── ...
```

---

## ✨ Key Features

| Feature | Benefit |
|---------|---------|
| **Never Expires** | No token refresh needed |
| **Revocable** | Can disable immediately |
| **Multiple Tokens** | One per admin/service |
| **Auto Notifications** | Errors sent automatically |
| **Pre-built Scenarios** | Quick integration |
| **Firebase Integration** | Works with existing FCM |
| **Audit Trail** | All tokens logged |

---

## 🎯 Next Steps

1. **Create your first admin token**
   ```bash
   # Step 1: Create admin user
   curl -X POST http://localhost:3000/api/admin/create ...
   
   # Step 2: Generate token
   curl -X POST http://localhost:3000/api/admin/generate-static-token ...
   ```

2. **Add error notifications to endpoints**
   ```javascript
   const errorNotification = require('./src/services/error-notification.service');
   await errorNotification.notifyAdmins('Error Title', 'Error Message');
   ```

3. **Test with Postman**
   - Import: `Admin-Token-Management.postman_collection.json`
   - Use your generated token

4. **Deploy to production**
   - Add `ADMIN_TOKEN` to environment
   - Update `.gitignore` to exclude token file

---

## 🎉 You're All Set!

Your admin token and error notification system is ready to use. 

**Start by creating your first admin token, then add error notifications to critical endpoints.**

For detailed setup, see: `ADMIN_TOKEN_SETUP_GUIDE.md`  
For quick reference, see: `ADMIN_TOKEN_QUICK_START.md`
