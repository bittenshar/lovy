const AppError = require('../utils/appError');

const requestTimeout = (timeoutMs = 25000) => {
  return (req, res, next) => {
    if (!timeoutMs || Number(timeoutMs) <= 0) {
      return next();
    }

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      req.timedout = true;
      console.error(`Request timeout after ${timeoutMs}ms for ${req.method} ${req.originalUrl}`);
      next(new AppError('Request timeout', 408));
    }, timeoutMs);

    const clearTimer = () => {
      if (!timedOut) {
        clearTimeout(timeout);
      }
    };

    res.on('finish', clearTimer);
    res.on('close', clearTimer);

    next();
  };
};

module.exports = requestTimeout;
