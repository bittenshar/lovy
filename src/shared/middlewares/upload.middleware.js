const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const businessLogosDir = path.join(__dirname, '../../..', 'public', 'images', 'business-logos');
const workerProfilesDir = path.join(__dirname, '../../..', 'public', 'images', 'worker-profiles');

[businessLogosDir, workerProfilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Business Logo Storage
const businessLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, businessLogosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `business-logo-${uniqueSuffix}${ext}`);
  }
});

// Worker Profile Image Storage
const workerProfileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, workerProfilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `worker-profile-${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
  }
};

// Business logo upload middleware (single file, max 5MB)
const uploadBusinessLogo = multer({
  storage: businessLogoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Worker profile image upload middleware (single file, max 10MB)
const uploadWorkerProfile = multer({
  storage: workerProfileStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  uploadBusinessLogo: uploadBusinessLogo.single('logo'),
  uploadWorkerProfile: uploadWorkerProfile.single('profileImage'),
  businessLogosDir,
  workerProfilesDir
};