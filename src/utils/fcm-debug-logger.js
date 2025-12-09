/**
 * FCM Debug Logger Service
 * Provides structured logging for Firebase Cloud Messaging
 */

class FCMDebugLogger {
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  /**
   * Log initialization event
   */
  static logInit(service) {
    console.log(`
${FCMDebugLogger.colors.cyan}╔════════════════════════════════════════════════════════════╗${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}║  🔥 FIREBASE INITIALIZATION START                          ║${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}║  ${new Date().toISOString().padEnd(58)}║${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}╚════════════════════════════════════════════════════════════╝${FCMDebugLogger.colors.reset}
`);
    console.log(`${FCMDebugLogger.colors.blue}Service: ${service}${FCMDebugLogger.colors.reset}`);
  }

  /**
   * Log initialization complete
   */
  static logInitComplete() {
    console.log(`
${FCMDebugLogger.colors.green}✅ ===== FIREBASE INITIALIZATION COMPLETE =====${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.green}   All systems operational${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log token registration
   */
  static logTokenRegistration(userId, token, platform, deviceId) {
    console.log(`
${FCMDebugLogger.colors.cyan}🔔 [FCM] TOKEN REGISTRATION${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}   ${new Date().toISOString()}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   👤 User: ${userId}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   📱 Platform: ${platform}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   📲 Device ID: ${deviceId || 'not provided'}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   🔑 Token: ${token.substring(0, 40)}...${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   🔗 Token length: ${token.length}${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log successful token registration
   */
  static logTokenRegSuccess(userId, tokenCount) {
    console.log(
      `${FCMDebugLogger.colors.green}✅ Token registered successfully for ${userId}${FCMDebugLogger.colors.reset}`
    );
    console.log(
      `${FCMDebugLogger.colors.green}   📊 Total devices: ${tokenCount}${FCMDebugLogger.colors.reset}\n`
    );
  }

  /**
   * Log notification send attempt
   */
  static logNotificationSend(title, body, deviceCount, tokens) {
    console.log(`
${FCMDebugLogger.colors.magenta}📤 ===== SENDING NOTIFICATION =====${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.magenta}   ⏱️  Time: ${new Date().toISOString()}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.magenta}   📄 Title: ${title}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.magenta}   📝 Body: ${body}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.magenta}   📱 Devices: ${deviceCount}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.magenta}   🔑 First token: ${tokens?.[0]?.substring(0, 40)}...${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log notification send success
   */
  static logNotificationSuccess(messageId, successCount, failureCount) {
    const total = successCount + failureCount;
    const successRate = Math.round((successCount / total) * 100);

    console.log(
      `${FCMDebugLogger.colors.green}✅ Notifications sent successfully${FCMDebugLogger.colors.reset}`
    );
    console.log(`${FCMDebugLogger.colors.green}   📊 Message ID: ${messageId}${FCMDebugLogger.colors.reset}`);
    console.log(
      `${FCMDebugLogger.colors.green}   ✔️  Success: ${successCount}/${total} (${successRate}%)${FCMDebugLogger.colors.reset}`
    );
    if (failureCount > 0) {
      console.log(
        `${FCMDebugLogger.colors.yellow}   ⚠️  Failed: ${failureCount}/${total}${FCMDebugLogger.colors.reset}`
      );
    }
    console.log();
  }

  /**
   * Log notification send error
   */
  static logNotificationError(error, fcmToken) {
    console.log(`
${FCMDebugLogger.colors.red}❌ ===== NOTIFICATION SEND FAILED =====${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Error: ${error.message}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Code: ${error.code}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Token: ${fcmToken?.substring(0, 40)}...${FCMDebugLogger.colors.reset}
`);

    // Provide error-specific guidance
    if (error.code === 'messaging/invalid-registration-token') {
      console.log(
        `${FCMDebugLogger.colors.yellow}   💡 Token is invalid or expired - device should re-register${FCMDebugLogger.colors.reset}`
      );
    } else if (error.code === 'messaging/mismatched-credential') {
      console.log(
        `${FCMDebugLogger.colors.yellow}   💡 Firebase credentials mismatch - check service account${FCMDebugLogger.colors.reset}`
      );
    } else if (error.message.includes('not initialized')) {
      console.log(
        `${FCMDebugLogger.colors.yellow}   💡 Firebase not initialized - check firebase-service-account.json${FCMDebugLogger.colors.reset}`
      );
    }
    console.log();
  }

  /**
   * Log device list
   */
  static logDeviceList(userId, tokens) {
    console.log(`
${FCMDebugLogger.colors.blue}📱 ===== REGISTERED DEVICES FOR ${userId} =====${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   Total: ${tokens.length}${FCMDebugLogger.colors.reset}
`);

    tokens.forEach((token, index) => {
      console.log(
        `${FCMDebugLogger.colors.cyan}   ${index + 1}. ${token.substring(0, 40)}...${token.substring(token.length - 10)}${FCMDebugLogger.colors.reset}`
      );
    });

    console.log();
  }

  /**
   * Log token validation
   */
  static logTokenValidation(token, isValid) {
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    const color = isValid ? FCMDebugLogger.colors.green : FCMDebugLogger.colors.red;

    console.log(`
${color}🔍 TOKEN VALIDATION${FCMDebugLogger.colors.reset}
${color}   Status: ${status}${FCMDebugLogger.colors.reset}
${color}   Token: ${token.substring(0, 40)}...${FCMDebugLogger.colors.reset}
${color}   Length: ${token.length}${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log health check
   */
  static logHealthCheck(isInitialized, appCount) {
    const status = isInitialized ? '🟢 HEALTHY' : '🔴 NOT INITIALIZED';
    const color = isInitialized ? FCMDebugLogger.colors.green : FCMDebugLogger.colors.red;

    console.log(`
${color}🏥 ===== FIREBASE HEALTH CHECK =====${FCMDebugLogger.colors.reset}
${color}   Status: ${status}${FCMDebugLogger.colors.reset}
${color}   Apps initialized: ${appCount}${FCMDebugLogger.colors.reset}
${color}   Timestamp: ${new Date().toISOString()}${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log error with full context
   */
  static logError(context, error, additionalInfo = {}) {
    console.log(`
${FCMDebugLogger.colors.red}❌ ERROR IN ${context.toUpperCase()}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Message: ${error.message}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Code: ${error.code || 'N/A'}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.red}   Stack: ${error.stack?.split('\n')[0] || 'N/A'}${FCMDebugLogger.colors.reset}
`);

    if (Object.keys(additionalInfo).length > 0) {
      console.log(`${FCMDebugLogger.colors.yellow}   Additional Info:${FCMDebugLogger.colors.reset}`);
      Object.entries(additionalInfo).forEach(([key, value]) => {
        console.log(`${FCMDebugLogger.colors.yellow}     • ${key}: ${value}${FCMDebugLogger.colors.reset}`);
      });
    }
    console.log();
  }

  /**
   * Log API request
   */
  static logApiRequest(method, endpoint, userId) {
    console.log(`
${FCMDebugLogger.colors.blue}🔗 API REQUEST${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   ${method} ${endpoint}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   User: ${userId}${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.blue}   Time: ${new Date().toISOString()}${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Log API response
   */
  static logApiResponse(statusCode, data) {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const color = isSuccess ? FCMDebugLogger.colors.green : FCMDebugLogger.colors.yellow;

    console.log(`
${color}📨 API RESPONSE${FCMDebugLogger.colors.reset}
${color}   Status: ${statusCode}${FCMDebugLogger.colors.reset}
${color}   Success: ${isSuccess ? 'YES' : 'NO'}${FCMDebugLogger.colors.reset}
${color}   Data: ${JSON.stringify(data).substring(0, 100)}...${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Print a colored section header
   */
  static printHeader(title) {
    const width = 60;
    const padding = Math.max(0, width - title.length - 2);
    const leftPad = Math.floor(padding / 2);
    const rightPad = Math.ceil(padding / 2);

    console.log(`
${FCMDebugLogger.colors.cyan}╔${'═'.repeat(width)}╗${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}║${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}║${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}╚${'═'.repeat(width)}╝${FCMDebugLogger.colors.reset}
`);
  }

  /**
   * Print diagnostic report
   */
  static printDiagnosticReport(data) {
    console.log(`
${FCMDebugLogger.colors.cyan}╔════════════════════════════════════════════════════════════╗${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}║        📊 FCM DIAGNOSTIC REPORT                            ║${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}║        ${new Date().toISOString().padEnd(56)}║${FCMDebugLogger.colors.reset}
${FCMDebugLogger.colors.cyan}╚════════════════════════════════════════════════════════════╝${FCMDebugLogger.colors.reset}
`);

    Object.entries(data).forEach(([key, value]) => {
      console.log(`${FCMDebugLogger.colors.blue}${key}:${FCMDebugLogger.colors.reset}`);
      if (typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => {
          console.log(`  ${FCMDebugLogger.colors.cyan}${k}: ${v}${FCMDebugLogger.colors.reset}`);
        });
      } else {
        console.log(`  ${FCMDebugLogger.colors.cyan}${value}${FCMDebugLogger.colors.reset}`);
      }
    });

    console.log(`
${FCMDebugLogger.colors.green}✅ Report generated at ${new Date().toISOString()}${FCMDebugLogger.colors.reset}
`);
  }
}

module.exports = FCMDebugLogger;
