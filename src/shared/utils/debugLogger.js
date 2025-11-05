const fs = require('fs').promises;
const path = require('path');

class DebugLogger {
  constructor() {
    this.logPath = path.join(process.cwd(), 'debug-logs');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Error creating debug log directory:', error);
    }
  }

  async logRequest(req, prefix = '') {
    try {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        userId: req.user?._id
      };

      const fileName = `${prefix}${timestamp.replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(this.logPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(logData, null, 2));
      console.log(`Debug log written to ${filePath}`);

      return logData;
    } catch (error) {
      console.error('Error writing debug log:', error);
      return null;
    }
  }

  async logError(error, req = null) {
    try {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          status: error.status
        },
        request: req ? {
          url: req.originalUrl,
          method: req.method,
          headers: req.headers,
          body: req.body,
          query: req.query,
          params: req.params,
          userId: req.user?._id
        } : null
      };

      const fileName = `error-${timestamp.replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(this.logPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(logData, null, 2));
      console.log(`Error log written to ${filePath}`);

      return logData;
    } catch (error) {
      console.error('Error writing error log:', error);
      return null;
    }
  }
}

module.exports = new DebugLogger();