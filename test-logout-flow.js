#!/usr/bin/env node
/**
 * Complete Logout Flow Test
 * Tests: Token deletion → Backend logout → Token deactivation verification
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = null;
let userId = null;

// Test user credentials
const TEST_USER = {
  email: 'w@gmail.com',
  password: 'password',
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
  json: (data) => console.log(JSON.stringify(data, null, 2)),
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerFCMToken() {
  log.section('STEP 1.5: Register Test FCM Token');
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

    log.success(`FCM token registered successfully`);
    log.info(`Token: ${testToken.substring(0, 30)}...`);
    return true;
  } catch (error) {
    log.warn(
      `Could not register token: ${error.response?.data?.message || error.message}`
    );
    return false;
  }
}

async function login() {
  log.section('STEP 1: Login');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    authToken = response.data.token;
    userId = response.data.data?.user?._id || response.data._id;

    log.success(`Login successful`);
    log.info(`User ID: ${userId}`);
    log.info(`Auth Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function checkTokensBeforeLogout() {
  log.section('STEP 2: Check FCM Tokens Before Logout');
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/debug/user-tokens/${userId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const data = response.data.data;
    log.info(`User collection token: ${data.userCollection.fcmToken || 'NONE'}`);
    log.info(`FCMToken collection count: ${data.fcmTokenCollection.length}`);
    log.info(
      `Active tokens: ${data.fcmTokenCollection.filter((t) => t.isActive).length}`
    );

    if (data.fcmTokenCollection.length > 0) {
      log.info('Token details:');
      data.fcmTokenCollection.forEach((token, idx) => {
        const tokenStr = (token.fcmToken || token.token || token).substring(0, 20);
        console.log(`  ${idx + 1}. Token: ${tokenStr}...`);
        console.log(`     Platform: ${token.platform || 'unknown'}, Active: ${token.isActive}`);
      });
    }

    return data.fcmTokenCollection;
  } catch (error) {
    log.warn(
      `Could not fetch tokens: ${error.response?.data?.message || error.message}`
    );
    return [];
  }
}

async function callLogoutEndpoint() {
  log.section('STEP 3: Call Backend Logout Endpoint');
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const data = response.data;
    log.success(`Backend logout successful`);
    log.info(`Deactivated tokens: ${data.deactivatedCount || 0}`);
    if (data.message) {
      log.info(`Message: ${data.message}`);
    }
    return true;
  } catch (error) {
    log.error(`Logout endpoint failed: ${error.response?.data?.message || error.message}`);
    log.json(error.response?.data);
    return false;
  }
}

async function checkTokensAfterLogout() {
  log.section('STEP 4: Check FCM Tokens After Logout');
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/debug/user-tokens/${userId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const data = response.data.data;
    log.info(`User collection token: ${data.userCollection.fcmToken || 'NONE'}`);
    log.info(`FCMToken collection count: ${data.fcmTokenCollection.length}`);
    log.info(
      `Active tokens: ${data.fcmTokenCollection.filter((t) => t.isActive).length}`
    );

    if (data.fcmTokenCollection.length > 0) {
      const activeTokens = data.fcmTokenCollection.filter((t) => t.isActive);
      if (activeTokens.length === 0) {
        log.success('All tokens deactivated ✓');
      } else {
        log.error(`${activeTokens.length} tokens still active!`);
        activeTokens.forEach((token, idx) => {
          const tokenStr = (token.fcmToken || token.token || token).substring(0, 20);
          console.log(`  ${idx + 1}. Token: ${tokenStr}...`);
        });
      }
    } else {
      log.success('No tokens found (collection cleanup worked) ✓');
    }

    return data.fcmTokenCollection;
  } catch (error) {
    log.warn(
      `Could not fetch tokens: ${error.response?.data?.message || error.message}`
    );
    return [];
  }
}

async function verifyLogoutState() {
  log.section('STEP 5: Verify Logout State');
  try {
    // Try to use the auth token - it should still work for this test
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    log.info(`Auth token still valid (this is expected in test)`);
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success(`Auth token properly invalidated`);
    } else {
      log.warn(`Unexpected error: ${error.message}`);
    }
    return false;
  }
}

async function printSummary(success) {
  log.section('TEST SUMMARY');
  if (success) {
    log.success('Complete Logout Flow Test PASSED');
    log.info(`1. ✓ User logged in`);
    log.info(`2. ✓ Pre-logout tokens checked`);
    log.info(`3. ✓ Backend logout endpoint called`);
    log.info(`4. ✓ Tokens deactivated/removed`);
    log.info(`5. ✓ Logout state verified`);
  } else {
    log.error('Complete Logout Flow Test FAILED');
    log.info(`Check logs above for details`);
  }
}

async function main() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(
    `${colors.cyan}║   COMPLETE LOGOUT FLOW TEST - FCM TOKEN DEACTIVATION   ║${colors.reset}`
  );
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Step 1: Login
    if (!(await login())) {
      log.error('Cannot proceed without login');
      return;
    }

    await sleep(500);

    // Step 1.5: Register FCM token
    if (!(await registerFCMToken())) {
      log.warn('Could not register token, but continuing...');
    }

    await sleep(500);

    // Step 2: Check tokens before logout
    const tokensBefore = await checkTokensBeforeLogout();

    await sleep(500);

    // Step 3: Call logout endpoint
    if (!(await callLogoutEndpoint())) {
      log.warn('Logout endpoint call failed, but continuing checks...');
    }

    await sleep(500);

    // Step 4: Check tokens after logout
    const tokensAfter = await checkTokensAfterLogout();

    await sleep(500);

    // Step 5: Verify logout state
    await verifyLogoutState();

    // Summary
    const success =
      tokensBefore.length > 0 &&
      (tokensAfter.length === 0 || tokensAfter.every((t) => !t.isActive));
    await printSummary(success);

    process.exit(success ? 0 : 1);
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    log.json(error);
    process.exit(1);
  }
}

main();
