const User = require('./user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.getMe = (req, res) => {
  res.status(200).json({ status: 'success', data: req.user });
};

exports.updateMe = catchAsync(async (req, res, next) => {
  const updates = ['firstName', 'lastName', 'phone'];
  updates.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();
  res.status(200).json({ status: 'success', data: req.user });
});

exports.listUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.userType) {
    filter.userType = req.query.userType;
  }
  const users = await User.find(filter).select('-password');
  res.status(200).json({ status: 'success', data: users });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId).select('-password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  res.status(200).json({ status: 'success', data: user });
});

exports.addFcmToken = catchAsync(async (req, res, next) => {
  const { fcmToken, platform } = req.body;

  if (!fcmToken) {
    return next(new AppError('FCM token is required', 400));
  }

  const user = req.user;

  // Initialize fcmTokens array if it doesn't exist
  if (!user.fcmTokens) {
    user.fcmTokens = [];
  }

  // Convert to array if it's a string (backward compatibility)
  if (!Array.isArray(user.fcmTokens)) {
    user.fcmTokens = [user.fcmTokens];
  }

  // Add new token if not already present
  if (!user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
    console.log(`✅ FCM token added for user ${user._id}`);
  } else {
    console.log(`ℹ️ FCM token already registered for user ${user._id}`);
  }

  res.status(200).json({
    status: 'success',
    message: 'FCM token registered successfully',
    data: {
      userId: user._id,
      fcmTokenCount: user.fcmTokens.length,
      platform: platform || 'web'
    }
  });
});

exports.removeFcmToken = catchAsync(async (req, res, next) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return next(new AppError('FCM token is required', 400));
  }

  const user = req.user;

  if (!user.fcmTokens || !Array.isArray(user.fcmTokens)) {
    return next(new AppError('No FCM tokens registered', 404));
  }

  const index = user.fcmTokens.indexOf(fcmToken);
  if (index > -1) {
    user.fcmTokens.splice(index, 1);
    await user.save();
    console.log(`✅ FCM token removed for user ${user._id}`);
  }

  res.status(200).json({
    status: 'success',
    message: 'FCM token removed successfully',
    data: {
      userId: user._id,
      fcmTokenCount: user.fcmTokens.length
    }
  });
});
