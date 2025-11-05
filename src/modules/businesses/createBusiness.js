const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const Business = require('./business.model');
const User = require('../users/user.model');
const TeamMember = require('./teamMember.model');
const { scheduleLogoOptimization } = require('./business.controller');

exports.createBusiness = catchAsync(async (req, res, next) => {
  try {
    // Set the owner to the current user from the token
    const businessData = {
      ...req.body,
      owner: req.user._id,  // This comes from the auth middleware
    };

    // Validate location if provided
    if (businessData.location) {
      const { location } = businessData;
      
      // Required location fields
      const requiredFields = ['line1', 'address', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'];
      const missingFields = requiredFields.filter(field => !location[field]);
      
      if (missingFields.length > 0) {
        return next(new AppError(`Missing required location fields: ${missingFields.join(', ')}`, 400));
      }

      // Format and set the address fields
      const formattedAddress = [
        location.line1,
        location.city,
        location.state,
        location.postalCode,
        location.country
      ].filter(Boolean).join(', ');

      // Set both formattedAddress and address fields
      location.formattedAddress = formattedAddress;
      location.address = location.address || formattedAddress; // Use existing address or formatted one
    }

    // Create the business
    const business = await Business.create(businessData);

    // Set this as the user's selected business
    await User.findByIdAndUpdate(req.user._id, {
      $set: { selectedBusiness: business._id }
    });

    // Create initial team member record for the owner
    await TeamMember.create({
      business: business._id,
      user: req.user._id,
      email: req.user.email,
      name: `${req.user.firstName} ${req.user.lastName}`.trim(),
      role: 'owner'
    });

    // Schedule logo optimization if logo is provided
    if (business.logo || business.logoUrl) {
      scheduleLogoOptimization([business._id]);
    }

    res.status(201).json({
      status: 'success',
      data: {
        business
      }
    });

  } catch (error) {
    console.error('Error creating business:', error);
    return next(new AppError(error.message || 'Error creating business', 400));
  }
});