const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');
const AppError = require('../../shared/utils/appError');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Application management routes with permission protection
router.get('/', requirePermissions('view_applications'), controller.listApplications);

// Workers can see and manage their own applications
router.get('/me', (req, res, next) => {
  if (req.user.userType !== 'worker') {
    return next(new AppError('Access denied', 403));
  }
  return controller.listMyApplications(req, res, next);
}); 
router.get('/worker/:workerId', requirePermissions('view_applications'), controller.getWorkerApplications);

// Application status management
router.patch('/:applicationId', requirePermissions('manage_applications'), controller.updateApplication);

module.exports = router;
