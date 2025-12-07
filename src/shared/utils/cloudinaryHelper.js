const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Get optimized Cloudinary URL for business logo
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @param {object} options - Additional options (width, height, quality, etc.)
 * @returns {string} - Optimized Cloudinary URL
 */
const getOptimizedLogoUrl = (publicId, options = {}) => {
  const defaults = {
    fetch_format: 'auto',
    quality: 'auto',
    width: options.width || 500,
    height: options.height || 500,
    crop: options.crop || 'fill',
    gravity: options.gravity || 'auto'
  };

  return cloudinary.url(publicId, { ...defaults, ...options });
};

/**
 * Get optimized Cloudinary URL for worker profile picture
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @param {object} options - Additional options (width, height, quality, etc.)
 * @returns {string} - Optimized Cloudinary URL for profile
 */
const getOptimizedProfileUrl = (publicId, options = {}) => {
  const defaults = {
    fetch_format: 'auto',
    quality: 'auto',
    width: options.width || 300,
    height: options.height || 300,
    crop: 'thumb',
    gravity: options.gravity || 'face' // Focus on face
  };

  return cloudinary.url(publicId, { ...defaults, ...options });
};

/**
 * Get thumbnail URL for responsive images
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @param {string} size - 'small' (60x60), 'medium' (200x200), 'large' (500x500)
 * @returns {string} - Optimized thumbnail URL
 */
const getThumbnailUrl = (publicId, size = 'small') => {
  const sizes = {
    small: { width: 60, height: 60 },
    medium: { width: 200, height: 200 },
    large: { width: 500, height: 500 }
  };

  const selectedSize = sizes[size] || sizes.small;

  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    width: selectedSize.width,
    height: selectedSize.height,
    crop: 'fill',
    gravity: 'auto'
  });
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Full Cloudinary URL
 * @returns {string} - Public ID
 */
const extractPublicId = (url) => {
  // URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/public-id.ext
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart.split('.')[0]; // Remove extension
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @returns {Promise} - Result of deletion
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  getOptimizedLogoUrl,
  getOptimizedProfileUrl,
  getThumbnailUrl,
  extractPublicId,
  deleteImage
};
