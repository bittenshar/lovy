/**
 * Multer Error Handler Middleware
 * Handles file upload errors gracefully
 */

const multerErrorHandler = (err, req, res, next) => {
  // Check if error is from Multer
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size is too large. Maximum file size allowed is 5MB for business logos and 10MB for worker profiles.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Only one file is allowed per upload.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `Upload error: ${err.message}`
    });
  }

  // Check if error is from image validation
  if (err && err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }

  // Pass other errors to the next middleware
  next(err);
};

module.exports = multerErrorHandler;