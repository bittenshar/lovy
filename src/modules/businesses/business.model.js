const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    line1: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    address: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    city: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    state: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    postalCode: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    country: { 
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    latitude: { 
      type: Number,
      required: function() { return this.parent().location !== undefined; },
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Latitude must be between -90 and 90 degrees'
      }
    },
    longitude: { 
      type: Number,
      required: function() { return this.parent().location !== undefined; },
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Longitude must be between -180 and 180 degrees'
      }
    },
    allowedRadius: {
      type: Number,
      default: 150
    },
    formattedAddress: {
      type: String,
      required: function() { return this.parent().location !== undefined; }
    },
    notes: String,
    timezone: String,
    isActive: { type: Boolean, default: true },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    setAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    location: {
      type: locationSchema,
      validate: {
        validator: function(v) {
          // Allow null/undefined location
          if (!v) return true;
          
          // If location is provided, ensure all required fields are present
          const requiredFields = ['line1', 'address', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
          return requiredFields.every(field => v[field] != null);
        },
        message: 'If location is provided, all fields (line1, address, city, state, postalCode, country, latitude, longitude) are required'
      }
    },
    logo: { type: String, trim: true }, // Full logo URL stored here
    logoSmall: { type: String, trim: true }, // Cached small variant for fast responses
    logoMedium: { type: String, trim: true }, // Cached medium variant
    logoSignature: { type: String, trim: true }, // Hash of current logo source to detect changes
    logoOptimizedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    stats: {
      jobsPosted: { type: Number, default: 0 },
      hires: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Add pre-save middleware to format address
businessSchema.pre('save', function(next) {
  if (this.location) {
    // Always ensure formattedAddress is set when location exists
    const parts = [
      this.location.line1,
      this.location.city,
      this.location.state,
      this.location.postalCode,
      this.location.country
    ].filter(Boolean);
    
    this.location.formattedAddress = parts.join(', ');
    
    // Ensure address is set as well
    if (!this.location.address) {
      this.location.address = this.location.line1;
    }
  }
  next();
});

// Handle logo modifications
businessSchema.pre('save', function (next) {
  if (this.isModified('logo') || this.isModified('logoUrl')) {
    this.logoSmall = undefined;
    this.logoMedium = undefined;
    this.logoSignature = undefined;
    this.logoOptimizedAt = undefined;
  }
  next();
});

module.exports = mongoose.model('Business', businessSchema);
  



businessSchema.pre('save', function (next) {
  if (this.isModified('logo') || this.isModified('logoUrl')) {
    this.logoSmall = undefined;
    this.logoMedium = undefined;
    this.logoSignature = undefined;
    this.logoOptimizedAt = undefined;
  }
  next();
});

module.exports = mongoose.model('Business', businessSchema);
