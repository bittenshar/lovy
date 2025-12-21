# Worker Jobs Retrieval Fix - Diagnostic & Solutions

## Problem Summary
Workers cannot retrieve jobs when calling `/jobs/worker` endpoint.

## Root Causes Identified & Fixed

### 1. **Missing userType Field in Database** (MOST LIKELY)
Users registered before userType validation may have NULL/undefined userType in their database records.

**Symptoms:**
- GET /api/jobs/worker returns 403 Forbidden
- Error message indicates userType is missing

**Solution:**
Run the fix script to identify and correct all users:
```bash
cd dhruvbackend
node fix-missing-usertypes.js
```

### 2. **userType Not Being Selected in Auth Middleware**  
The auth middleware wasn't explicitly selecting the userType field when loading users.

**Fixed in:** `src/shared/middlewares/auth.middleware.js`
- Changed: `.select('+passwordChangedAt')`  
- To: `.select('+passwordChangedAt +userType')`

### 3. **Improved Error Logging**
Added detailed logging to `/jobs/worker` endpoint to help diagnose future issues:

**Fixed in:** `src/modules/jobs/job.routes.js`
- Now logs user ID, userType, and available fields when access is denied
- Error response includes actual userType value for debugging

## Testing the Fix

### 1. Check Logs
After the fix, restart your backend and check for logs:
```
❌ Access denied to /jobs/worker:
   User ID: 62a0f...
   User type: worker
   ✅ Access should now be granted
```

### 2. Test the Endpoint
With a valid worker token:
```bash
curl -H "Authorization: Bearer <worker_token>" \
  http://localhost:3000/api/jobs/worker
```

Expected response:
```json
{
  "status": "success",
  "results": 5,
  "data": [...]
}
```

### 3. Verify Flutter App
- Restart Flutter app
- Navigate to worker jobs screen
- Jobs should now load successfully

## Changes Made

### File: `src/shared/middlewares/auth.middleware.js`
- **Line 55:** Explicitly select userType field
- **Lines 61-68:** Added warning log if userType is missing

### File: `src/modules/jobs/job.routes.js`
- **Lines 20-30:** Added detailed error logging
- **Line 32:** Error response now includes actual userType value

### New File: `fix-missing-usertypes.js`
- Utility script to fix all users without userType
- Infers userType from WorkerProfile/EmployerProfile
- Defaults to 'worker' if profiles don't exist

## Next Steps if Issue Persists

1. **Run the fix script:**
   ```bash
   node dhruvbackend/fix-missing-usertypes.js
   ```

2. **Check backend logs:**
   - Look for the "❌ Access denied to /jobs/worker" log
   - This will show the actual userType value being rejected

3. **Force re-login in Flutter:**
   - Clear app cache
   - Log out and log back in
   - This ensures a fresh token is created

4. **Verify database:**
   ```javascript
   // Run in MongoDB shell
   db.users.find({ userType: { $exists: false } }).count()
   ```

## Files Changed

1. ✅ `src/shared/middlewares/auth.middleware.js` - Better userType selection
2. ✅ `src/modules/jobs/job.routes.js` - Enhanced error logging
3. ✅ `fix-missing-usertypes.js` - New utility script
