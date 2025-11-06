# Location Schema Simplification Documentation

## Overview
This document outlines the changes made to simplify the location data structure across the backend while maintaining detailed location information only for businesses.

## Changes Summary

### 1. Created Simple Location Schema
Created a new reusable schema at `/src/shared/schemas/simpleLocation.schema.js`:
```javascript
const simpleLocationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    formattedAddress: { type: String, required: true },
    allowedRadius: { type: Number, default: 150 }
  },
  { _id: false }
);
```

### 2. Model Updates

#### 2.1 Job Model (`/src/modules/jobs/job.model.js`)
- Replaced complex location schema with simpleLocationSchema
- Added businessAddress field to store full business address
- Updated pre-save middleware to:
  - Extract only essential location fields from business
  - Store business address separately
  - Handle location validation

Changes:
```javascript
location: { type: simpleLocationSchema, required: true },
businessAddress: { type: String }
```

#### 2.2 Application Model (`/src/modules/applications/application.model.js`)
- Replaced location schema with simpleLocationSchema
- Maintains only essential location information

Changes:
```javascript
location: simpleLocationSchema
```

#### 2.3 Attendance Model (`/src/modules/attendance/attendance.model.js`)
- Updated all location-related fields to use simpleLocationSchema:
  - jobLocation
  - clockInLocation
  - clockOutLocation
- Maintained existing location validation methods

Changes:
```javascript
jobLocation: simpleLocationSchema,
clockInLocation: simpleLocationSchema,
clockOutLocation: simpleLocationSchema
```

#### 2.4 Business Model (Unchanged)
- Retained detailed location schema
- Keeps all address components:
  - line1
  - address
  - city
  - state
  - postalCode
  - country
  - latitude
  - longitude
  - formattedAddress

## Data Structure Comparison

### Before:
All models used complex location schema with fields:
```javascript
{
  line1: String,
  address: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  latitude: Number,
  longitude: Number,
  formattedAddress: String,
  // ... other fields
}
```

### After:
- **Business Model**: Keeps full location schema
- **All Other Models**: Use simplified schema
```javascript
{
  latitude: Number,
  longitude: Number,
  formattedAddress: String,
  allowedRadius: Number
}
```

## Benefits
1. **Reduced Data Redundancy**: Only businesses store complete address information
2. **Simplified Location Tracking**: Jobs, applications, and attendance use minimal required fields
3. **Consistent Location Structure**: All non-business models use the same simple schema
4. **Maintained Business Context**: Full address information still available through business reference
5. **Improved Performance**: Smaller document sizes for jobs, applications, and attendance records
6. **Better Maintainability**: Simplified schema means less complexity in location-related operations

## Migration Notes
- Existing jobs will automatically adapt to new schema through pre-save middleware
- Business addresses are preserved and accessible
- Location validation and geofencing functionality remains intact

## Testing Considerations
1. Verify business location propagation to jobs
2. Ensure attendance location tracking works with simplified schema
3. Validate geofencing calculations with new schema
4. Check application location handling
5. Verify business address accessibility in job context