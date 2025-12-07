const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check if we should use Cloudinary (for serverless environments like Vercel)
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

// Use memory storage for intermediate processing
const memoryStorage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
  }
};

// Business logo upload middleware (single file, max 5MB)
const uploadBusinessLogo = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Worker profile image upload middleware (single file, max 10MB)
const uploadWorkerProfile = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Middleware to upload to Cloudinary if configured, otherwise save locally
const uploadToCloudinary = (folder) => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    if (useCloudinary) {
      try {
        // Upload file buffer to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folder,
              resource_type: 'auto',
              allowed_formats: ['jpeg', 'png', 'gif', 'webp'],
              public_id: `${folder}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
              fetch_format: 'auto',
              quality: 'auto',
              width: folder === 'business-logos' ? 1000 : 500,
              height: folder === 'business-logos' ? 1000 : 500,
              crop: folder === 'business-logos' ? 'fill' : 'thumb',
              gravity: folder === 'business-logos' ? 'auto' : 'face'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end(req.file.buffer);
        });

        // Store the Cloudinary URL in req.file.path for consistency
        req.file.path = result.secure_url;
        req.file.filename = result.public_id;
        console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
        next();
      } catch (error) {
        console.error('❌ Cloudinary upload error:', error.message);
        // Fall back to local storage
        saveToLocalStorage(req, folder);
        next();
      }
    } else {
      // Save to local storage
      saveToLocalStorage(req, folder);
      next();
    }
  };
};

// Helper function to save file locally
function saveToLocalStorage(req, folder) {
  const uploadDir = path.join(__dirname, '../../..', 'public', 'images', folder);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(req.file.originalname);
  const filename = `${folder.split('-')[0]}-${uniqueSuffix}${ext}`;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, req.file.buffer);
  
  req.file.path = `/images/${folder}/${filename}`;
  req.file.filename = filename;
  
  console.log(`✅ Uploaded to local storage: ${req.file.path}`);
}

if (useCloudinary) {
  console.log('✅ Using Cloudinary for file uploads');
} else {
  console.log('✅ Using local storage for file uploads');
}

module.exports = {
  uploadBusinessLogo: uploadBusinessLogo.single('logo'),
  uploadWorkerProfile: uploadWorkerProfile.single('profileImage'),
  uploadToCloudinary,
  cloudinary
};