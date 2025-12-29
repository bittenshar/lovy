/**
 * Permission-based middleware for API route protection
 * Validates user permissions before allowing access to specific endpoints
 */

const AppError = require('../utils/appError');
const User = require('../../modules/users/user.model');
const Business = require('../../modules/businesses/business.model');
const TeamMember = require('../../modules/businesses/teamMember.model');

// All available permissions in the system
const ALL_PERMISSIONS = {
  
};

// Role-based default permissions
const ROLE_PERMISSIONS = {
  'owner': Object.keys(ALL_PERMISSIONS), // Owners get all permissions
  'admin': Object.keys(ALL_PERMISSIONS), // Admins get all permissions
 
};

// API endpoint to permission mapping
const ENDPOINT_PERMISSIONS = {
  // Business endpoints
  'POST:/api/businesses': ['create_business'],
  'PUT:/api/businesses': ['edit_business'],
  'PATCH:/api/businesses': ['edit_business'],
  'DELETE:/api/businesses': ['delete_business'],
  'GET:/api/businesses/analytics': ['view_business_analytics'],
  
  // Job endpoints
  'POST:/api/jobs': ['create_jobs'],
  'PUT:/api/jobs': ['edit_jobs'],
  'PATCH:/api/jobs': ['edit_jobs'],
  'DELETE:/api/jobs': ['delete_jobs'],
  'GET:/api/jobs': ['view_jobs'],
  'POST:/api/jobs/publish': ['post_jobs'],
  
  // Application endpoints
  'GET:/api/applications': ['view_applications'],
  'PUT:/api/applications': ['manage_applications'],
  'PATCH:/api/applications': ['manage_applications'],
  'POST:/api/applications/approve': ['approve_applications'],
  'POST:/api/applications/reject': ['reject_applications'],
  
  // Attendance endpoints
  'GET:/api/attendance': ['view_attendance'],
  'PUT:/api/attendance': ['manage_attendance'],
  'PATCH:/api/attendance': ['manage_attendance'],
  'POST:/api/attendance/approve': ['approve_attendance'],
  
  // Schedule endpoints
  'POST:/api/schedules': ['create_schedules'],
  'PUT:/api/schedules': ['edit_schedules'],
  'PATCH:/api/schedules': ['edit_schedules'],
  'DELETE:/api/schedules': ['delete_schedules'],
  'GET:/api/schedules': ['manage_schedules'],
  
  // Team endpoints
  'POST:/api/team/invite': ['invite_team_members'],
  'PUT:/api/team': ['edit_team_members'],
  'PATCH:/api/team': ['edit_team_members'],
  'DELETE:/api/team': ['remove_team_members'],
  'PUT:/api/team/permissions': ['manage_permissions'],
  
  // Payment endpoints
  'GET:/api/payments': ['view_payments'],
  'PUT:/api/payments': ['manage_payments'],
  'PATCH:/api/payments': ['manage_payments'],
  'POST:/api/payments/process': ['process_payments'],
  'GET:/api/reports/financial': ['view_financial_reports'],
  
  // Analytics endpoints
  'GET:/api/analytics': ['view_analytics'],
  'GET:/api/reports': ['view_reports'],
  'POST:/api/export': ['export_data'],
};

/**
 * Get user's permissions based on their role and team membership
 */
async function getUserPermissions(userId, businessId) {
  try {
    console.log(`Getting permissions for user ${userId} and business ${businessId}`);
    
    // First check if user is the business owner
    const business = await Business.findById(businessId);
    if (business && business.owner && business.owner.toString() === userId.toString()) {
      console.log(`User ${userId} is owner of business ${businessId} - granting all permissions`);
      return Object.keys(ALL_PERMISSIONS); // Owner gets all permissions
    }

    // Check if user is a team member of this business
    const teamMember = await TeamMember.findOne({
      user: userId,
      business: businessId,
      active: true
    });

    if (teamMember) {
      console.log(`Found team member with role ${teamMember.role} for user ${userId}`);
      
      // If user is admin, return all permissions
      if (teamMember.role === 'admin') {
        return Object.keys(ALL_PERMISSIONS);
      }
      
      // If user has specific permissions assigned, use those
      if (teamMember.permissions && teamMember.permissions.length > 0) {
        console.log(`Using custom permissions for user ${userId}:`, teamMember.permissions);
        return teamMember.permissions;
      }
      
      // Fall back to role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[teamMember.role] || [];
      console.log(`Using role-based permissions for ${teamMember.role}:`, rolePermissions);
      return rolePermissions;
    }

    console.log(`No permissions found for user ${userId} in business ${businessId}`);
    // If not a team member and not owner, return empty permissions
    return [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 */
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(userPermissions, requiredPermissions) {
  // full_access grants all permissions
  if (userPermissions.includes('full_access')) {
    return true;
  }
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Check if user has all of the required permissions
 */
function hasAllPermissions(userPermissions, requiredPermissions) {
  // full_access grants all permissions
  if (userPermissions.includes('full_access')) {
    return true;
  }
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Get business ID from request context
 */
async function getBusinessIdFromRequest(req) {
  try {
    // 1. Check URL parameters first
    if (req.params.businessId) {
      return req.params.businessId;
    }

    // 2. Check if employerId parameter maps to a business
    if (req.params.employerId) {
      const business = await Business.findOne({ owner: req.params.employerId });
      if (business) {
        return business._id.toString();
      }
    }

    // 3. Check body and query parameters
    if (req.body.businessId) {
      return req.body.businessId;
    }
    
    if (req.query.businessId) {
      return req.query.businessId;
    }

    // 4. Check headers
    if (req.headers['x-business-id']) {
      return req.headers['x-business-id'];
    }

    // 5. Use user's selected business
    if (req.user && req.user.selectedBusiness) {
      return req.user.selectedBusiness.toString();
    }

    // 6. If user is an employer, find their primary business
    if (req.user && req.user.userType === 'employer') {
      const business = await Business.findOne({ owner: req.user.id || req.user._id });
      if (business) {
        return business._id.toString();
      }
    }

    // 7. For /me endpoints, try to find business by user ID
    if (req.path.includes('/me') && req.user) {
      const business = await Business.findOne({ owner: req.user.id || req.user._id });
      if (business) {
        return business._id.toString();
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting business ID from request:', error);
    return null;
  }
}

/**
 * Middleware to check if user has required permissions for an endpoint
 */
function requirePermissions(permissions, options = {}) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return next(new AppError('Authentication required', 401));
      }

      // Skip business ID check for business creation endpoint
      if (req.method === 'POST' && req.path === '/businesses') {
        // For business creation, only check if user is employer
        if (req.user.userType !== 'employer') {
          return next(new AppError('Only employers can create businesses', 403));
        }
        return next();
      }

      // Get business ID from request
      const businessId = await getBusinessIdFromRequest(req);

      if (!businessId && options.requireBusinessId !== false) {
        return next(new AppError('Business ID required', 400));
      }

      // Get user permissions
      const userPermissions = await getUserPermissions(req.user.id, businessId);

      // Check permissions
      let hasAccess = false;
      if (Array.isArray(permissions)) {
        // Multiple permissions - check based on options
        hasAccess = options.requireAll 
          ? hasAllPermissions(userPermissions, permissions)
          : hasAnyPermission(userPermissions, permissions);
      } else {
        // Single permission
        hasAccess = hasPermission(userPermissions, permissions);
      }

      if (!hasAccess) {
        return next(new AppError(
          `Insufficient permissions. Required: ${Array.isArray(permissions) ? permissions.join(', ') : permissions}`,
          403
        ));
      }

      // Add permissions and business ID to request for use in controllers
      req.userPermissions = userPermissions;
      req.businessId = businessId;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      next(new AppError('Permission check failed', 500));
    }
  };
}

/**
 * Middleware to automatically check permissions based on endpoint
 */
function autoCheckPermissions(options = {}) {
  return async (req, res, next) => {
    try {
      const method = req.method;
      const path = req.route?.path || req.path;
      const key = `${method}:${path}`;
      
      // Get required permissions for this endpoint
      const requiredPermissions = ENDPOINT_PERMISSIONS[key];
      
      if (!requiredPermissions) {
        // No specific permissions required for this endpoint
        return next();
      }

      // Use the requirePermissions middleware
      const permissionMiddleware = requirePermissions(requiredPermissions, options);
      return permissionMiddleware(req, res, next);
    } catch (error) {
      console.error('Auto permission check error:', error);
      next(new AppError('Permission check failed', 500));
    }
  };
}

/**
 * Helper function to check permissions in controllers
 */
async function checkUserPermission(userId, businessId, permission) {
  try {
    const userPermissions = await getUserPermissions(userId, businessId);
    return hasPermission(userPermissions, permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Helper function to get all permissions for a role
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validate that permissions are valid
 */
function validatePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.every(permission => 
    Object.keys(ALL_PERMISSIONS).includes(permission)
  );
}

module.exports = {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  ENDPOINT_PERMISSIONS,
  getUserPermissions,
  getBusinessIdFromRequest,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermissions,
  autoCheckPermissions,
  checkUserPermission,
  getRolePermissions,
  validatePermissions,
};