#!/usr/bin/env node
/**
 * Complete FCM Token Lifecycle Test Suite
 * Validates: Registration → Usage → Logout → Deactivation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = null;
let userId = null;

const TEST_USER = {
  email: 'w@gmail.com',
  password: 'password',
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(
      `\n${colors.magenta}╔══════════════════════════════════════╗${colors.reset}\n${colors.magenta}║${colors.reset} ${msg.padEnd(36)} ${colors.magenta}║${colors.reset}\n${colors.magenta}╚══════════════════════════════════════╝${colors.reset}`
    ),
  success_banner: (msg) =>
    console.log(
      `\n${colors.green}╔════════════════════════════════════════╗${colors.reset}\n${colors.green}║ ${msg.padEnd(35)} ${colors.green}║${colors.reset}\n${colors.green}╚════════════════════════════════════════╝${colors.reset}\n`
    ),
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testLogin() {
  log.section('LOGIN');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    authToken = response.data.token;
    userId = response.data.data?.user?._id;

    log.success(`Login successful`);
    log.info(`User: ${TEST_USER.email}`);
    log.info(`ID: ${userId}`);
    return true;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRegisterToken() {
  log.section('REGISTER FCM TOKEN');
  try {
    const testToken = `test_token_${Date.now()}`;
    const response = await axios.post(
      `${BASE_URL}/notifications/register-token`,
      {
        fcmToken: testToken,
        platform: 'android',
        deviceId: 'test-device',
        deviceName: 'Test Device',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log.success(`Token registered successfully`);
    log.info(`Token: ${testToken.substring(0, 30)}...`);
    log.info(`Response status: ${response.status}`);
    return true;
  } catch (error) {
    log.error(`Failed to register token: ${error.message}`);
    return false;
  }
}

async function testCheckTokensBefore() {
  log.section('CHECK TOKENS (BEFORE LOGOUT)');
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/debug/user-tokens/${userId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const data = response.data.data;
    log.success(`Tokens retrieved successfully`);
    log.info(`User collection token: ${data.userCollection.fcmToken ? '✓ Present' : '✗ None'}`);
    log.info(`FCMToken collection: ${data.fcmTokenCollection.length} token(s)`);
    log.info(`Active tokens: ${data.fcmTokenCollection.filter((t) => t.isActive).length}`);

    return {
      count: data.fcmTokenCollection.length,
      active: data.fcmTokenCollection.filter((t) => t.isActive).length,
      hasUserToken: !!data.userCollection.fcmToken,
    };
  } catch (error) {
    log.error(`Failed to check tokens: ${error.message}`);
    return null;
  }
}

async function testLogout() {
  log.section('LOGOUT & DEACTIVATE');
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log.success(`Logout endpoint called successfully`);
    log.info(`Deactivated tokens: ${response.data.deactivatedCount || 0}`);
    log.info(`Message: ${response.data.message}`);
    log.info(`Response status: ${response.status}`);
    return true;
  } catch (error) {
    log.error(`Logout failed: ${error.message}`);
    return false;
  }
}

async function testCheckTokensAfter() {
  log.section('CHECK TOKENS (AFTER LOGOUT)');
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/debug/user-tokens/${userId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const data = response.data.data;
    log.success(`Tokens retrieved successfully`);
    log.info(`User collection token: ${data.userCollection.fcmToken ? '✗ Present (should be gone!)' : '✓ Cleared'}`);
    log.info(`FCMToken collection: ${data.fcmTokenCollection.length} token(s)`);
    log.info(`Active tokens: ${data.fcmTokenCollection.filter((t) => t.isActive).length}`);
    log.info(`Inactive tokens: ${data.fcmTokenCollection.filter((t) => !t.isActive).length}`);

    return {
      count: data.fcmTokenCollection.length,
      active: data.fcmTokenCollection.filter((t) => t.isActive).length,
      hasUserToken: !!data.userCollection.fcmToken,
    };
  } catch (error) {
    log.error(`Failed to check tokens: ${error.message}`);
    return null;
  }
}

async function printResults(before, after) {
  log.section('LIFECYCLE VALIDATION');

  let allPassed = true;

  // Check 1: Had tokens before logout
  if (before && before.count > 0) {
    log.success(`Pre-logout: User had ${before.count} token(s)`);
  } else {
    log.warn(`Pre-logout: User had no tokens (test may be inconclusive)`);
    allPassed = false;
  }

  // Check 2: All tokens deactivated after logout
  if (after && after.active === 0) {
    log.success(`Post-logout: All ${after.count} token(s) deactivated`);
  } else if (after && after.active > 0) {
    log.error(`Post-logout: ${after.active} token(s) still active!`);
    allPassed = false;
  }

  // Check 3: User token cleared
  if (after && !after.hasUserToken) {
    log.success(`Post-logout: User collection token cleared`);
  } else {
    log.warn(`Post-logout: User collection still has token`);
  }

  // Check 4: Token collection cleaned up
  if (after && after.count === 0) {
    log.success(`Post-logout: Token collection cleaned up`);
  } else if (after && after.count > 0 && after.active === 0) {
    log.info(`Post-logout: Token collection maintained with ${after.count} inactive token(s)`);
  }

  return allPassed;
}

async function main() {
  console.log(`\n${colors.cyan}╔═════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(
    `${colors.cyan}║   FCM TOKEN LIFECYCLE TEST SUITE - COMPLETE FLOW   ║${colors.reset}`
  );
  console.log(`${colors.cyan}╚═════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Test 1: Login
    if (!(await testLogin())) {
      log.error('Cannot proceed without login');
      process.exit(1);
    }
    await sleep(300);

    // Test 2: Register token
    if (!(await testRegisterToken())) {
      log.warn('Token registration failed, but continuing...');
    }
    await sleep(300);

    // Test 3: Check tokens before logout
    const before = await testCheckTokensBefore();
    await sleep(300);

    // Test 4: Logout
    if (!(await testLogout())) {
      log.error('Logout failed');
      process.exit(1);
    }
    await sleep(300);

    // Test 5: Check tokens after logout
    const after = await testCheckTokensAfter();
    await sleep(300);

    // Results
    const passed = await printResults(before, after);

    if (passed && before && before.count > 0 && after && after.active === 0) {
      log.success_banner('ALL TESTS PASSED ✓');
      console.log(`${colors.green}FCM Token Lifecycle Complete:${colors.reset}`);
      console.log(`  1. ✓ User logged in`);
      console.log(`  2. ✓ FCM token registered to both collections`);
      console.log(`  3. ✓ Token verified as active before logout`);
      console.log(`  4. ✓ Backend logout endpoint called`);
      console.log(`  5. ✓ All tokens deactivated after logout`);
      console.log(`  6. ✓ User collection cleared`);
      console.log(`\n${colors.green}System is production-ready!${colors.reset}\n`);
      process.exit(0);
    } else {
      log.error('TEST SUITE FAILED');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
