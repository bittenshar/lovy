const mongoose = require('mongoose');


// Job location schema with geofencing radius
const simpleLocationSchema = require('../../shared/schemas/simpleLocation.schema');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    clockInAt: Date,
    clockOutAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'clocked-in', 'completed', 'missed'],
      default: 'scheduled'
    },
    totalHours: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    hourlyRate: Number,
    isLate: { type: Boolean, default: false },
    notes: String,
    workerNameSnapshot: String,
    jobTitleSnapshot: String,
    locationSnapshot: String,
    
    // Location tracking fields
    jobLocation: simpleLocationSchema, // The designated job location with geofencing
    clockInLocation: simpleLocationSchema, // Where the worker clocked in
    clockOutLocation: simpleLocationSchema, // Where the worker clocked out
    locationValidated: { type: Boolean }, // Whether location validation passed
    locationValidationMessage: String, // Validation result message
    clockInDistance: Number, // Distance from job location when clocking in (meters)
    clockOutDistance: Number // Distance from job location when clocking out (meters)
  },
  { timestamps: true }
);

attendanceSchema.index({ worker: 1, scheduledStart: -1 });
attendanceSchema.index({ business: 1, scheduledStart: -1 });
attendanceSchema.index({ 'jobLocation.latitude': 1, 'jobLocation.longitude': 1 });

// Validation: scheduledEnd must be after scheduledStart
attendanceSchema.pre('save', function(next) {
  if (this.scheduledEnd && this.scheduledStart) {
    if (this.scheduledEnd <= this.scheduledStart) {
      return next(new Error('scheduledEnd must be after scheduledStart'));
    }
  }
  next();
});

// Helper method to calculate distance between two coordinates using Haversine formula
attendanceSchema.statics.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

// Instance method to validate if a location is within the allowed radius
attendanceSchema.methods.isLocationValid = function(workerLat, workerLon) {
  if (!this.jobLocation || !this.jobLocation.isActive) {
    return { isValid: true, distance: null, message: 'No location validation required' };
  }

  const distance = this.constructor.calculateDistance(
    this.jobLocation.latitude,
    this.jobLocation.longitude,
    workerLat,
    workerLon
  );

  const isValid = distance <= this.jobLocation.allowedRadius;
  
  return {
    isValid,
    distance,
    allowedRadius: this.jobLocation.allowedRadius,
    message: isValid 
      ? 'Location is valid for attendance'
      : `Worker is ${distance.toFixed(1)}m away from job location (max allowed: ${this.jobLocation.allowedRadius}m)`
  };
};

module.exports = mongoose.model('AttendanceRecord', attendanceSchema);
