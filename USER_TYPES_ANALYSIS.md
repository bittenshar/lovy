# User Types Analysis: Worker vs Employer vs Employee

## Summary
**EMPLOYEE and EMPLOYER are DIFFERENT concepts, and both are DIFFERENT from WORKER.**

However, in the current backend:
- Only **WORKER** and **EMPLOYER** user types exist
- **EMPLOYEE** was mistakenly used in some parts but has been removed
- EMPLOYEE was likely a confusion/legacy term - it was never a proper user type

---

## 1. WORKER User Type

### Definition
A **WORKER** is an individual who:
- Seeks job opportunities
- Applies for jobs posted by employers
- Works shifts/jobs
- Tracks attendance
- Provides services for payment

### Database Structure
```javascript
// User Model
{
  userType: "worker",
  email: String,
  firstName: String,
  lastName: String,
  phone: String,
  fcmTokens: [String],
  selectedBusiness: ObjectId (optional)
}

// Associated WorkerProfile
{
  user: ObjectId (ref to User),
  bio: String,
  skills: [String],
  experience: String,
  languages: [String],
  profilePicture: String,
  portfolioImages: [String],
  rating: Number,
  completedJobs: Number,
  totalEarnings: Number,
  availability: [String]
}
```

### Permissions & Routes
- Can view job listings
- Can apply for jobs
- Can manage own applications (`/applications/me`)
- Can view shifts (`/workers/me/shifts`)
- Can check attendance (`/workers/me/attendance/schedule`)
- Can view own dashboard (`/workers/me/dashboard`)
- CANNOT post jobs
- CANNOT manage businesses
- CANNOT hire other workers

### Key Models Referenced
- **WorkerProfile** - Skill set, experience, portfolio
- **Application** - Job applications submitted
- **AttendanceRecord** - Clock in/out tracking
- **Shift** - Assigned work periods
- **WorkerFeedback** - Ratings from employers

---

## 2. EMPLOYER User Type

### Definition
An **EMPLOYER** is an individual/business owner who:
- Posts job opportunities
- Manages business(es)
- Hires workers
- Reviews applications
- Manages shifts and attendance for their business
- Creates and oversees teams/businesses

### Database Structure
```javascript
// User Model
{
  userType: "employer",
  email: String,
  firstName: String,
  lastName: String,
  phone: String,
  fcmTokens: [String],
  selectedBusiness: ObjectId (optional)
}

// Associated EmployerProfile
{
  user: ObjectId (ref to User),
  companyName: String,
  description: String,
  phone: String,
  profilePicture: String,
  companyLogo: String,
  rating: Number,
  totalJobsPosted: Number,
  totalHires: Number,
  defaultBusiness: ObjectId (ref to Business)
}

// Business (can have multiple per employer)
{
  owner: ObjectId (ref to User - must be employer),
  name: String,
  description: String,
  phone: String,
  email: String,
  isActive: Boolean,
  location: { latitude, longitude, address },
  logo: String
}
```

### Permissions & Routes
- Can post jobs (`/jobs`)
- Can view applications for their jobs (`/applications`)
- Can update application status (`/applications/:id/status`)
- Can manage multiple businesses (`/businesses`)
- Can create and manage teams/team members
- Can manage shifts and attendance
- Can view analytics and reports
- CANNOT apply for jobs
- CANNOT work shifts (must hire workers for that)

### Key Models Referenced
- **EmployerProfile** - Company information
- **Business** - Multiple business locations
- **Job** - Posted opportunities
- **Application** - Received from workers
- **Shift** - Created for workers
- **TeamMember** - Business team management

---

## 3. EMPLOYEE (Legacy/Removed)

### What Was EMPLOYEE?
**EMPLOYEE was a confusion/hybrid term that was removed.** It was:
- Not a primary user type in the enum
- Used in some conditional checks as if it were equal to EMPLOYER
- Representing a team member within a business (NOT a main user type)

### Where It Was Used (Now Removed)
```javascript
// BEFORE (WRONG):
if (req.user.userType === 'employer' || req.user.userType === 'employee') {
  // This allowed both employers and "employees" to manage applications
}

// AFTER (CORRECT):
if (req.user.userType === 'employer') {
  // Only employers can manage applications
}
```

### The Correct Concept
The confusion came from trying to represent team members within a business. The correct approach is:

```javascript
// TeamMember Model - represents business team members
{
  business: ObjectId,
  user: ObjectId, // Could be any user type
  role: String, // 'owner', 'admin', 'manager', 'supervisor', 'staff'
  permissions: [String], // Granular permissions
  active: Boolean
}

// BusinessEmployee Model - invited team members
{
  business: ObjectId,
  email: String,
  name: String,
  role: String, // 'manager', 'recruiter', 'attendance_officer', 'viewer'
  permissions: { /* detailed perms */ },
  status: String // 'invited', 'active', 'suspended'
}
```

---

## 4. Key Differences Table

| Aspect | Worker | Employer | Employee (Removed) |
|--------|--------|----------|-------------------|
| **Primary Role** | Job seeker | Business owner/manager | N/A - Legacy term |
| **Applies for jobs** | ✅ YES | ❌ NO | N/A |
| **Posts jobs** | ❌ NO | ✅ YES | N/A |
| **Manages business** | ❌ NO | ✅ YES | N/A |
| **Profile type** | WorkerProfile | EmployerProfile | N/A |
| **Can own business** | ❌ NO | ✅ YES | N/A |
| **Team management** | ❌ NO (member only) | ✅ YES (owner/manager) | N/A |
| **User type enum** | ✅ Valid | ✅ Valid | ❌ Invalid |
| **Routes** | `/workers/*` | `/employers/*` | N/A |

---

## 5. Authorization Flow

### Worker Flow
```
Signup (userType='worker')
  ↓
Create WorkerProfile
  ↓
Browse jobs → Apply → Get hired → Work shifts → Track attendance
  ↓
Receive feedback & ratings
```

### Employer Flow
```
Signup (userType='employer')
  ↓
Create EmployerProfile
  ↓
Create Business (optional multiple)
  ↓
Post Jobs → Review Applications → Hire Workers
  ↓
Manage Shifts → Track Attendance → Rate Workers
```

---

## 6. Code Example: Authentication

### Signup Validation
```javascript
// From auth.service.js
exports.signup = async (payload) => {
  const { userType, email } = payload;
  
  // Only two valid types:
  if (!userType || !['worker', 'employer'].includes(userType)) {
    throw new AppError('Invalid user type', 400);
  }
  
  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password: payload.password,
    userType, // ← Either 'worker' or 'employer'
    firstName: payload.firstName || '',
    lastName: payload.lastName || ''
  });

  // Create appropriate profile based on userType
  if (userType === 'worker') {
    await WorkerProfile.create({
      user: user._id,
      skills: payload.skills || [],
      // ... other worker fields
    });
  } else { // userType === 'employer'
    await EmployerProfile.create({
      user: user._id,
      companyName: payload.companyName || '',
      // ... other employer fields
    });
  }
};
```

### Route Protection
```javascript
// Worker routes - only workers allowed
router.use(protect, restrictTo('worker'));

// Employer routes - only employers allowed
router.use(protect, restrictTo('employer'));

// Public routes
router.use(protect); // Any authenticated user
```

---

## 7. Flutter Implementation Expectation

In Flutter, the implementation should:

### For Workers
```dart
class WorkerUser {
  String userType = 'worker'; // Fixed value
  String email;
  String firstName;
  String lastName;
  WorkerProfile? workerProfile;
  
  // Features available:
  // - Browse jobs
  // - Apply for jobs
  // - View shifts
  // - Track attendance
  // - View ratings
}
```

### For Employers
```dart
class EmployerUser {
  String userType = 'employer'; // Fixed value
  String email;
  String firstName;
  String lastName;
  EmployerProfile? employerProfile;
  List<Business>? businesses;
  
  // Features available:
  // - Post jobs
  // - Review applications
  // - Manage team
  // - Manage shifts
  // - View analytics
}
```

---

## 8. Summary

| Question | Answer |
|----------|--------|
| Are WORKER and EMPLOYER same? | **NO** - They are completely different roles with different capabilities |
| Is EMPLOYEE same as EMPLOYER? | **NO** - EMPLOYEE is a removed legacy term; team members are now handled via TeamMember/BusinessEmployee models |
| Is EMPLOYEE same as WORKER? | **NO** - EMPLOYEE was never a proper concept; WORKER is the job seeker |
| How many valid user types? | **2**: `worker` and `employer` |
| Should I use "employee" in Flutter? | **NO** - Only use `worker` or `employer` |
| For team members (HR, managers)? | Use **TeamMember** or **BusinessEmployee** models with roles and permissions, not a separate userType |

---

## 9. Files Modified (Removal of Employee)

The following files had "employee" references removed:
- `src/modules/applications/application.routes.js`
- `src/modules/applications/application.controller.js`
- `src/modules/employers/employer.routes.js`
- `src/modules/employers/employer.controller.js`
- `src/modules/conversations/conversation.controller.js`
- `create-real-messages.js`
- `test-message-fcm-flow.js`
