const express = require('express');
const debugLogger = require('../shared/utils/debugLogger');
const router = express.Router();

// Debug endpoint to test request data
router.post('/debug-request', async (req, res) => {
  const logData = await debugLogger.logRequest(req, 'debug-');
  res.status(200).json({
    status: 'success',
    message: 'Debug data logged',
    data: logData
  });
});

// Debug endpoint to test error handling
router.post('/debug-error', async (req, res) => {
  try {
    // Simulate different types of errors based on query parameter
    const errorType = req.query.type || 'validation';
    
    switch (errorType) {
      case 'validation':
        throw new Error('Validation Error: Missing required fields');
      case 'auth':
        const err = new Error('Authentication Error: Invalid token');
        err.status = 401;
        throw err;
      case 'db':
        throw new Error('Database Error: Connection failed');
      default:
        throw new Error('Generic Error');
    }
  } catch (error) {
    await debugLogger.logError(error, req);
    res.status(error.status || 500).json({
      status: 'error',
      message: error.message,
      errorId: new Date().toISOString()
    });
  }
});

module.exports = router;