const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');
const AppError = require('../../shared/utils/appError');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Application management routes
// For workers: redirect to /me to view their own applications
// For employers: allow viewing all applications for their jobs
router.get('/', (req, res, next) => {
  if (req.user.userType === 'worker') {
    console.log('✅ [APP-ROUTE] Worker redirecting to /me');
    return controller.listMyApplications(req, res, next);
  } else if (req.user.userType === 'employer') {
    console.log('✅ [APP-ROUTE] Employer accessing all applications');
    return controller.listMyApplications(req, res, next);
  }
  return next(new AppError('Access denied - invalid user type', 403));
});

// Employer-specific applications route
router.get('/employer', (req, res, next) => {
  if (req.user.userType !== 'employer') {
    console.log('❌ [APP-ROUTE] /employer access denied for user type:', req.user.userType);
    return next(new AppError('Access denied - only employers can view job applications', 403));
  }
  console.log('✅ [APP-ROUTE] /employer access granted for user type:', req.user.userType);
  return controller.listApplications(req, res, next);
});

// Workers can see and manage their own applications
router.get('/me', (req, res, next) => {
  // Allow workers and employers to view applications
  // - Workers: view their own job applications
  // - Employers: this endpoint will show their applications by permission middleware
  if (req.user.userType !== 'worker' && req.user.userType !== 'employer') {
    console.log('❌ [APP-ROUTE] Access denied to /applications/me');
    console.log('   User type:', req.user.userType);
    return next(new AppError(`Access denied - invalid user type: ${req.user.userType}. Only workers and employers can view applications`, 403));
  }
  console.log('✅ [APP-ROUTE] Access granted to /applications/me for', req.user.userType);
  return controller.listMyApplications(req, res, next);
});

router.get('/worker/:workerId', requirePermissions('view_applications', { requireBusinessId: false }), controller.getWorkerApplications);

// Allow workers to withdraw their own applications (MORE SPECIFIC - comes before generic :applicationId)
router.patch('/me/:applicationId', (req, res, next) => {
  // Allow workers to manage their applications
  if (req.user.userType !== 'worker') {
    return next(new AppError('Access denied - only workers can update their own applications', 403));
  }
  return controller.updateApplication(req, res, next);
});

// Allow employers to update application status (generic endpoint)
// Check permissions inside controller to handle business context properly
router.patch('/:applicationId/status', controller.updateApplication);
router.patch('/:applicationId', controller.updateApplication);

module.exports = router;
