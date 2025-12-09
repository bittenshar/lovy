// ADMIN STATIC TOKEN & ERROR NOTIFICATION SETUP GUIDE
// ==================================================

// PART 1: CREATE ADMIN USER & GENERATE STATIC TOKEN
// ==================================================

// Step 1: Create Admin User (One-time setup)
// Endpoint: POST http://localhost:3000/api/admin/create
// No auth required

POST http://localhost:3000/api/admin/create
Content-Type: application/json

{
  "email": "admin@workconnect.com",
  "password": "secure_password_here",
  "name": "System Administrator"
}

// Response:
{
  "status": "success",
  "message": "Admin user created successfully",
  "data": {
    "id": "67a4b1c2d3e4f5g6h7i8j9k0",
    "email": "admin@workconnect.com",
    "name": "System Administrator",
    "userType": "admin"
  }
}

// ============================================

// Step 2: Generate Static Admin Token (Never expires)
// Endpoint: POST http://localhost:3000/api/admin/generate-static-token
// No auth required

POST http://localhost:3000/api/admin/generate-static-token
Content-Type: application/json

{
  "adminEmail": "admin@workconnect.com"
}

// Response:
{
  "status": "success",
  "message": "Static admin token generated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YTRiMWMyZDNlNGY1ZzZoN2k4ajlrMCIsImVtYWlsIjoiYWRtaW5Ad29ya2Nvbm5lY3QuY29tIiwiaXNBZG1pbiI6dHJ1ZSwiaXNTdGF0aWMiOnRydWUsImNyZWF0ZWRBdCI6IjIwMjUtMTItMDlUMTM6MDA6MDBaIn0.signature",
    "adminId": "67a4b1c2d3e4f5g6h7i8j9k0",
    "email": "admin@workconnect.com",
    "expiresAt": "NEVER",
    "note": "This token never expires. Keep it safe!"
  }
}

// SAVE THIS TOKEN! It never expires and you'll use it for all admin operations.

// ============================================

// PART 2: USE STATIC TOKEN FOR NOTIFICATIONS
// ============================================

// Use the static admin token in your Authorization header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// ============================================

// PART 3: ERROR NOTIFICATIONS
// ============================================

// The error notification service automatically sends error alerts to:
// 1. All admins
// 2. Business owners
// 3. Specific users
// 4. Team members

// How to use in your code:

const errorNotification = require('./src/services/error-notification.service');

// Example 1: Notify all admins about a critical error
try {
  // Some operation fails
  throw new Error('Database connection lost');
} catch (error) {
  await errorNotification.notifyAdmins(
    'Database Connection Error',
    'Failed to connect to MongoDB. System is down.',
    {
      severity: 'critical',
      component: 'database',
      timestamp: new Date()
    }
  );
}

// Example 2: Notify business owner about error
await errorNotification.notifyBusinessOwner(
  businessId,
  'Payment Processing Failed',
  'Unable to process payment for job posting',
  {
    severity: 'high',
    jobId: 'job_123',
    action: 'retry_payment'
  }
);

// Example 3: Notify specific user
await errorNotification.notifyUser(
  userId,
  'Application Submission Error',
  'Failed to submit your job application. Please try again.',
  {
    severity: 'medium',
    jobId: 'job_456'
  }
);

// Example 4: Notify all team members
await errorNotification.notifyTeamMembers(
  businessId,
  'Attendance System Maintenance',
  'Attendance system will be down for 30 minutes',
  {
    severity: 'low',
    type: 'maintenance',
    endTime: new Date(Date.now() + 30 * 60 * 1000)
  }
);

// ============================================

// PART 4: PRE-BUILT ERROR SCENARIOS
// ============================================

// Use built-in error scenarios for common situations:

const scenarios = errorNotification.errorScenarios;

// Available scenarios:
{
  "ATTENDANCE_SYNC_FAILED": {
    "title": "Attendance Sync Failed",
    "body": "Failed to sync attendance data. Please try again.",
    "severity": "high"
  },
  "PAYMENT_FAILED": {
    "title": "Payment Processing Error",
    "body": "Payment processing failed. Please contact support.",
    "severity": "critical"
  },
  "JOB_POSTING_FAILED": {
    "title": "Job Posting Error",
    "body": "Failed to post job. Please try again.",
    "severity": "medium"
  },
  "APPLICATION_ERROR": {
    "title": "Application Processing Error",
    "body": "Failed to process application. Please try again.",
    "severity": "medium"
  },
  "DATABASE_ERROR": {
    "title": "Database Error",
    "body": "System is experiencing issues. Please try again later.",
    "severity": "critical"
  },
  "FIREBASE_ERROR": {
    "title": "Firebase Service Error",
    "body": "Notification service is temporarily unavailable.",
    "severity": "high"
  },
  "AUTHENTICATION_ERROR": {
    "title": "Authentication Error",
    "body": "Session expired. Please log in again.",
    "severity": "medium"
  },
  "AUTHORIZATION_ERROR": {
    "title": "Authorization Error",
    "body": "You do not have permission to perform this action.",
    "severity": "low"
  }
}

// Usage:
const scenario = errorNotification.errorScenarios.PAYMENT_FAILED;
await errorNotification.notifyAdmins(
  scenario.title,
  scenario.body,
  { severity: scenario.severity }
);

// ============================================

// PART 5: API ENDPOINTS FOR ADMIN TOKEN MANAGEMENT
// ============================================

// 1. CREATE ADMIN USER
POST http://localhost:3000/api/admin/create
Content-Type: application/json

{
  "email": "admin@workconnect.com",
  "password": "secure_password",
  "name": "Admin Name"
}

// Response: 201 Created

// ============================================

// 2. GENERATE STATIC TOKEN
POST http://localhost:3000/api/admin/generate-static-token
Content-Type: application/json

{
  "adminEmail": "admin@workconnect.com"
}

// Response: 200 OK
// Returns: { token, expiresAt: "NEVER", ... }

// ============================================

// 3. LIST ALL ADMIN TOKENS
GET http://localhost:3000/api/admin/tokens

// Response: 200 OK
// Returns: List of all generated admin tokens with preview

// ============================================

// 4. REVOKE ADMIN TOKEN
POST http://localhost:3000/api/admin/revoke-token
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response: 200 OK

// ============================================

// PART 6: INTEGRATION EXAMPLES
// ============================================

// Example: Add error notification to job posting endpoint

const jobController = {
  createJob: async (req, res) => {
    try {
      const job = await Job.create(req.body);
      res.json({ success: true, data: job });
    } catch (error) {
      // Notify admins about the error
      const errorNotification = require('./src/services/error-notification.service');
      await errorNotification.notifyAdmins(
        'Job Posting Creation Failed',
        `Failed to create job: ${error.message}`,
        {
          severity: 'high',
          userId: req.user._id,
          error: error.message
        }
      );
      
      res.status(500).json({
        status: 'fail',
        message: 'Failed to create job. Admins have been notified.'
      });
    }
  }
};

// ============================================

// PART 7: POSTMAN SETUP
// ============================================

// Add to Postman Environment Variables:

{
  "ADMIN_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ADMIN_EMAIL": "admin@workconnect.com"
}

// Then use in requests:
Authorization: Bearer {{ADMIN_TOKEN}}

// ============================================

// PART 8: TESTING ERROR NOTIFICATIONS
// ============================================

// Curl command to test admin token:
curl -X GET http://localhost:3000/api/admin/tokens

// Curl command to create admin user:
curl -X POST http://localhost:3000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Test Admin"
  }'

// Curl command to generate static token:
curl -X POST http://localhost:3000/api/admin/generate-static-token \
  -H "Content-Type: application/json" \
  -d '{
    "adminEmail": "admin@test.com"
  }'

// ============================================

// PART 9: FILES CREATED
// ============================================

/*
1. /src/services/admin-token.service.js
   - generateStaticAdminToken()
   - saveAdminTokenToFile()
   - listAdminTokens()
   - revokeAdminToken()

2. /src/services/error-notification.service.js
   - notifyAdmins()
   - notifyBusinessOwner()
   - notifyUser()
   - notifyTeamMembers()
   - errorScenarios (pre-built messages)

3. /src/controllers/admin-token.controller.js
   - generateStaticAdminToken()
   - listAdminTokens()
   - revokeAdminToken()
   - createAdminUser()

4. /src/routes/admin-token.routes.js
   - Routes for all admin endpoints

5. .admin-tokens.json (auto-created)
   - Stores all generated admin tokens for reference
*/

// ============================================

// PART 10: SECURITY NOTES
// ============================================

/*
✅ DO:
- Store ADMIN_TOKEN in a secure location (1Password, vault, etc)
- Rotate tokens periodically
- Revoke tokens when admin leaves
- Use HTTPS in production
- Log all admin token usage

❌ DON'T:
- Commit admin tokens to Git
- Share tokens in chat or email
- Use same token for multiple services
- Store tokens in plain text
- Leave static tokens expiring in code

BEST PRACTICES:
- Store token in environment variable: ADMIN_TOKEN=eyJ...
- Use for backend-to-backend communication only
- Monitor token usage in logs
- Revoke immediately if compromised
*/

// ============================================
