const express = require('express');
const controller = require('./employer.controller');
const applicationController = require('../applications/application.controller');
const jobController = require('../jobs/job.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect, restrictTo('employer'));

// Debug logging for employer routes
router.use((req, res, next) => {
  console.log('📍 Employer Route Hit:', req.method, req.path);
  console.log('   User:', req.user?._id, 'Type:', req.user?.userType);
  next();
});

router.get('/me/applications', controller.listEmployerApplications);
router.patch('/me/applications/:applicationId', (req, res, next) => {
  console.log('🔄 PATCH /me/applications/:applicationId hit');
  console.log('   applicationId:', req.params.applicationId);
  console.log('   User type:', req.user?.userType);
  console.log('   body:', req.body);
  applicationController.updateApplication(req, res, next);
});
router.post('/me/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/me', controller.getEmployerProfile);
router.patch('/me', controller.updateEmployerProfile);
router.get('/me/dashboard', controller.getDashboard);
router.get('/me/analytics', controller.getAnalytics);

router.get('/:employerId/applications', controller.listEmployerApplications);
router.patch('/:employerId/applications/:applicationId', applicationController.updateApplication);
router.post('/:employerId/applications/:applicationId/hire', jobController.hireApplicant);

router.get('/:employerId', controller.getEmployerProfile);
router.patch('/:employerId', controller.updateEmployerProfile);
router.get('/:employerId/dashboard', controller.getDashboard);
router.get('/:employerId/analytics', controller.getAnalytics);

module.exports = router;
