## 🔐 ADMIN TOKEN & ERROR NOTIFICATIONS - QUICK START

### ⚡ 30-Second Setup

**Step 1: Create Admin User**
```bash
curl -X POST http://localhost:3000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@workconnect.com",
    "password": "secure_password_123",
    "name": "System Admin"
  }'
```

**Step 2: Generate Static Token (never expires)**
```bash
curl -X POST http://localhost:3000/api/admin/generate-static-token \
  -H "Content-Type: application/json" \
  -d '{
    "adminEmail": "admin@workconnect.com"
  }'
```

**Copy the `token` from the response. This is your admin token that NEVER expires!**

---

### 📲 Send Error Notifications

**Method 1: Notify All Admins**
```javascript
const errorNotification = require('./src/services/error-notification.service');

await errorNotification.notifyAdmins(
  'Payment Processing Failed',
  'Failed to charge user for job posting',
  { severity: 'critical' }
);
```

**Method 2: Notify Business Owner**
```javascript
await errorNotification.notifyBusinessOwner(
  businessId,
  'Attendance Sync Error',
  'Failed to sync attendance data',
  { severity: 'high' }
);
```

**Method 3: Notify Specific User**
```javascript
await errorNotification.notifyUser(
  userId,
  'Application Error',
  'Your job application could not be submitted',
  { severity: 'medium' }
);
```

**Method 4: Notify Team Members**
```javascript
await errorNotification.notifyTeamMembers(
  businessId,
  'System Maintenance',
  'System will be down for 30 minutes',
  { severity: 'low' }
);
```

---

### 🎯 Pre-built Error Scenarios

Use built-in error messages:
```javascript
const scenario = errorNotification.errorScenarios.PAYMENT_FAILED;
// { title: "Payment Processing Error", body: "...", severity: "critical" }

await errorNotification.notifyAdmins(scenario.title, scenario.body, { severity: scenario.severity });
```

Available scenarios:
- `ATTENDANCE_SYNC_FAILED`
- `PAYMENT_FAILED`
- `JOB_POSTING_FAILED`
- `APPLICATION_ERROR`
- `DATABASE_ERROR`
- `FIREBASE_ERROR`
- `AUTHENTICATION_ERROR`
- `AUTHORIZATION_ERROR`

---

### 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/create` | Create admin user |
| POST | `/api/admin/generate-static-token` | Generate non-expiring token |
| GET | `/api/admin/tokens` | List all admin tokens |
| POST | `/api/admin/revoke-token` | Revoke a token |

---

### 📦 Files Created

```
src/services/
├── admin-token.service.js           # Token generation & management
└── error-notification.service.js    # Error notification service

src/controllers/
└── admin-token.controller.js        # API endpoint handlers

src/routes/
└── admin-token.routes.js            # Routes for admin endpoints

ADMIN_TOKEN_SETUP_GUIDE.md           # Complete setup guide
Admin-Token-Management.postman_collection.json  # Postman collection
```

---

### 🛡️ Security

✅ **Static tokens never expire** - Great for backend services  
✅ **No auth required** to generate (change if needed for production)  
✅ **Revocable** - Can disable any token  
✅ **Stored in file** - `.admin-tokens.json` for reference  

**IMPORTANT:** 
- Save your token in `.env` as `ADMIN_TOKEN=eyJ...`
- Use it for admin-only operations
- Rotate tokens periodically
- Revoke if compromised

---

### 🧪 Test It

1. **Create admin user** (Step 1 above)
2. **Generate token** (Step 2 above)
3. **Use token in Postman:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. **Test notification endpoint** with token in Authorization header

---

### 📋 Integration Example

Add to any endpoint that might fail:

```javascript
const errorNotification = require('./src/services/error-notification.service');

exports.createJob = async (req, res) => {
  try {
    const job = await Job.create(req.body);
    res.json({ success: true, data: job });
  } catch (error) {
    // Auto-notify admins on error
    await errorNotification.notifyAdmins(
      'Job Creation Failed',
      error.message,
      { userId: req.user._id, severity: 'high' }
    );
    
    res.status(500).json({
      status: 'fail',
      message: 'Failed to create job. Admins notified.',
      error: error.message
    });
  }
};
```

---

### ❓ FAQ

**Q: Does the static token ever expire?**  
A: No, never. It has no expiration date.

**Q: How do I revoke a token?**  
A: Use `POST /api/admin/revoke-token` with the token in the body.

**Q: Can I have multiple static tokens?**  
A: Yes, you can generate multiple tokens for different admins.

**Q: Where are tokens stored?**  
A: In `.admin-tokens.json` file in project root (for reference).

**Q: What happens if I lose my static token?**  
A: Generate a new one using the admin email.

---

### 🚀 Next Steps

1. ✅ Create admin user
2. ✅ Generate static token
3. ✅ Save token in `.env` as `ADMIN_TOKEN`
4. ✅ Import Postman collection: `Admin-Token-Management.postman_collection.json`
5. ✅ Add error notification to endpoints
6. ✅ Test with Postman

**Done! Your admin token system is ready.** 🎉
