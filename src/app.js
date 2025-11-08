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

const corsOptions = {
  origin: true, // Allow any origin with credentials
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Business-Id',
    'X-User-Id',
    'x-user-id',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Access-Control-Allow-Origin',
    'Content-Length'
  ],
  exposedHeaders: [
    'Set-Cookie',
    'Authorization',
    'X-Auth-Token',
    'X-User-Id',
    'x-user-id'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Enable CORS with the configuration
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

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
