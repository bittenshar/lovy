// job.model.js
const mongoose = require('mongoose');
const Business = require('../businesses/business.model');
const {
  normalizeString,
  deriveBusinessLocation,
  buildLocationAddressString,
} = require('../../shared/utils/location');

const scheduleSchema = new mongoose.Schema(
  {
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    recurrence: String,         // 'one-time' | 'weekly' | 'monthly' | 'custom'
    workDays: { type: [String], default: [] },
    customDates: { type: [Date], default: [] },
  },
  { _id: false }
);

const overtimeSchema = new mongoose.Schema(
  {
    allowed: { type: Boolean, default: false },
    rateMultiplier: { type: Number, default: 1.5 },
  },
  { _id: false }
);

const simpleLocationSchema = require('../../shared/schemas/simpleLocation.schema');


const jobSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    hourlyRate: { type: Number, required: true },

    overtime: overtimeSchema,
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    tags: { type: [String], default: [] },

    schedule: scheduleSchema,
    location: { type: simpleLocationSchema, required: true },
    businessAddress: { type: String },
    
    verificationRequired: { type: Boolean, default: false },
    premiumRequired: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['draft', 'active', 'filled', 'closed'],
      default: 'active',
    },

    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    applicantsCount: { type: Number, default: 0 },
    hiredWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    metrics: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

jobSchema.pre('save', async function(next) {
  try {
    if (!this.business) {
      throw new Error('Business ID is required');
    }

    // If no location is provided, get it from the business
    if (!this.location) {
      const business = await Business.findById(this.business).lean();
      if (!business || !business.location) {
        throw new Error('Job location is required. Either provide location in the job or set a location for the business.');
      }

      // Extract only the required fields from business location
      this.location = {
        latitude: business.location.latitude,
        longitude: business.location.longitude,
        formattedAddress: business.location.formattedAddress,
        allowedRadius: business.location.allowedRadius || 150
      };
      
      // Store the business address separately
      this.businessAddress = business.location.formattedAddress;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Job', jobSchema);
