const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');
const AppError = require('../../shared/utils/appError');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Application management routes with permission protection
router.get('/', requirePermissions('view_applications', { requireBusinessId: false }), controller.listApplications);

// Employer-specific applications route
router.get('/employer', (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Access denied - only employers can view job applications', 403));
  }
  return controller.listApplications(req, res, next);
});

// Workers can see and manage their own applications
router.get('/me', (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError(`Access denied - only workers can view their applications. Current user type: ${req.user.userType}`, 403));
  }
  return controller.listMyApplications(req, res, next);
}); 
router.get('/worker/:workerId', requirePermissions('view_applications', { requireBusinessId: false }), controller.getWorkerApplications);

// Application status management
router.patch('/:applicationId', requirePermissions('manage_applications'), controller.updateApplication);

module.exports = router;
