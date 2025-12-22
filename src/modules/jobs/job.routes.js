// job.routes.js
const express = require('express');
const controller = require('./job.controller');
const applicationController = require('../applications/application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

// Workers can list publicly published jobs without extra perms;
// Employers/team must have view_jobs to read employer views
const ensureViewJobs = (req, res, next) => {
  if (req.user?.userType === 'worker') return next();
  return requirePermissions('view_jobs')(req, res, next);
};

// Worker view - with proper cache control
router.get('/worker', protect, (req, res, next) => {
  // Ensure user has a userType (for backwards compatibility with old accounts)
  if (!req.user?.userType) {
    console.log('⚠️  [JOBS-WORKER] User missing userType, defaulting to "worker"');
    console.log('   User ID:', req.user?._id);
    console.log('   User email:', req.user?.email);
    // Default to worker for backwards compatibility
    req.user.userType = 'worker';
  }
  
  // Allow workers and employers to view worker jobs
  if (req.user.userType !== 'worker' && req.user.userType !== 'employer') {
    console.log('❌ [JOBS-WORKER] Access denied - invalid user type:', req.user.userType);
    return res.status(403).json({
      status: 'fail',
      message: `Access denied. Your userType: ${req.user.userType}`
    });
  }
  
  console.log('✅ [JOBS-WORKER] Access granted to user (${req.user.userType})');
  // Disable caching for worker job list to ensure fresh data
  res.set('Cache-Control', 'no-store');
  controller.listJobsForWorker(req, res, next);
});

// Employer view with cache control
// Don't require view_jobs permission here - controller will filter accessible businesses
router.get('/employer', protect, (req, res, next) => {
  // Set proper cache control for employer view
  res.set('Cache-Control', 'no-cache, must-revalidate');
  return controller.listJobsForEmployer(req, res, next);
});

// CRUD
router.get('/', protect, controller.listJobsForEmployer); // optional: default employer list
router.post('/', protect, controller.createJob);

const idRe = '[0-9a-fA-F]{24}';
router.get(`/:jobId(${idRe})`, protect, ensureViewJobs, controller.getJob);
router.patch(`/:jobId(${idRe})`, protect, requirePermissions('edit_jobs'), controller.updateJob);

// Applications (keep just the essentials you need)
router.post(`/:jobId(${idRe})/applications`, protect, applicationController.createApplication);



// Application hire route (specific enough to not conflict)
router.post('/applications/:applicationId/hire', protect, requirePermissions('hire_workers'), controller.hireApplicant);


module.exports = router;
