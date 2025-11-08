const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const AppError = require('./shared/utils/appError');
const globalErrorHandler = require('./shared/middlewares/globalErrorHandler');
const requestTimeout = require('./shared/middlewares/requestTimeout');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

// CORS Configuration for development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow localhost with any port
  if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-user-id, x-business-id, Authorization, Content-Type, Accept, Origin, X-Requested-With , x-user-id, x-business-id');
  
  // Handle preflightu
  if (req.method === 'OPTIONS') {
    // Set max age to cache preflight results
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }
  
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Add request timeout middleware only when running on dedicated servers
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 0);
if (!isServerless && REQUEST_TIMEOUT_MS > 0) {
  app.use(requestTimeout(REQUEST_TIMEOUT_MS));
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WorkConnect API is healthy - Premium payments enabled',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);


app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});


app.use(globalErrorHandler);

module.exports = app;
