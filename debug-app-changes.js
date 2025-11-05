// Add this near the top of your app.js file
const debugRoutes = require('./routes/debug.routes');

// Add this in your middleware section
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
}

// Add this error handling middleware at the end of your middleware chain
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const debugLogger = require('./shared/utils/debugLogger');
  debugLogger.logError(err, req);

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    errorId: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});