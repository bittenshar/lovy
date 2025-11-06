const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');
const AppError = require('../../shared/utils/appError');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Application management routes with permission protection
router.get('/', requirePermissions('view_applications'), controller.listApplications);

// Worker routes
router.get('/me', controller.listWorkerApplications); // Workers view their applications

// Employer routes
router.get('/business/:businessId', requirePermissions('view_applications'), controller.listBusinessApplications); // Employers view applications for their business
router.patch('/:applicationId/status', requirePermissions('manage_applications'), controller.updateApplicationStatus); // Employers update application status (hire/reject)
router.get('/worker/:workerId', requirePermissions('view_applications'), controller.getWorkerApplications);

// Application status management
router.patch('/:applicationId', requirePermissions('manage_applications'), controller.updateApplication);

module.exports = router;
