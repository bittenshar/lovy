const express = require('express');
const controller = require('./worker.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { uploadWorkerProfile } = require('../../shared/middlewares/upload.middleware');

const router = express.Router();

router.use(protect);

// Worker's own profile and data routes
router.get('/me', restrictTo('worker'), controller.getWorkerProfile);
router.patch('/me', restrictTo('worker'), uploadWorkerProfile, controller.updateWorkerProfile);
router.get('/me/shifts', restrictTo('worker'), controller.getWorkerShifts);
router.get('/me/dashboard', restrictTo('worker'), controller.getWorkerDashboard);
router.get('/me/employment/history', restrictTo('worker'), controller.getEmploymentHistory);
router.get('/me/feedback', restrictTo('worker'), controller.getWorkerFeedback);
router.get(
  '/me/attendance/schedule',
  restrictTo('worker'),
  (req, res, next) => {
    req.params.workerId = req.user._id.toString();
    return controller.getWorkerAttendanceSchedule(req, res, next);
  }
);

// Routes for accessing other workers' data (with appropriate permissions)
router.get('/:workerId', controller.getWorkerProfile);
router.patch('/:workerId', restrictTo('worker'), controller.updateWorkerProfile);
router.get('/:workerId/applications', controller.getWorkerApplications);
router.get('/:workerId/attendance/schedule', controller.getWorkerAttendanceSchedule);
router.get('/:workerId/attendance', controller.getWorkerAttendance);
router.get('/:workerId/shifts', controller.getWorkerShifts);

module.exports = router;
