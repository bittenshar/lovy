/**
 * Admin Static Token Manager
 * Creates and manages static tokens for admin users that don't expire
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const ADMIN_TOKENS_FILE = path.join(__dirname, '../../.admin-tokens.json');

/**
 * Generate a static admin token
 * Token has no expiration and special admin flag
 */
exports.generateStaticAdminToken = (userId, email) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  // Create token with no expiration (expiresIn: null)
  const token = jwt.sign(
    {
      id: userId,
      email: email,
      isAdmin: true,
      isStatic: true,
      createdAt: new Date().toISOString()
    },
    secret
    // No expiresIn = token never expires
  );

  return token;
};

/**
 * Save admin token to file for reference
 */
exports.saveAdminTokenToFile = (token, userId, email) => {
  try {
    let tokens = [];
    
    if (fs.existsSync(ADMIN_TOKENS_FILE)) {
      const content = fs.readFileSync(ADMIN_TOKENS_FILE, 'utf8');
      tokens = JSON.parse(content);
    }

    tokens.push({
      token,
      userId,
      email,
      createdAt: new Date().toISOString(),
      expiresAt: 'NEVER'
    });

    fs.writeFileSync(ADMIN_TOKENS_FILE, JSON.stringify(tokens, null, 2));
    console.log(`✅ Admin token saved for ${email}`);
  } catch (error) {
    console.error('Error saving admin token:', error);
  }
};

/**
 * List all static admin tokens
 */
exports.listAdminTokens = () => {
  try {
    if (!fs.existsSync(ADMIN_TOKENS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(ADMIN_TOKENS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading admin tokens:', error);
    return [];
  }
};

/**
 * Revoke an admin token
 */
exports.revokeAdminToken = (token) => {
  try {
    if (!fs.existsSync(ADMIN_TOKENS_FILE)) {
      return false;
    }

    let tokens = JSON.parse(fs.readFileSync(ADMIN_TOKENS_FILE, 'utf8'));
    const filtered = tokens.filter(t => t.token !== token);
    
    if (filtered.length < tokens.length) {
      fs.writeFileSync(ADMIN_TOKENS_FILE, JSON.stringify(filtered, null, 2));
      console.log(`✅ Admin token revoked`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error revoking admin token:', error);
    return false;
  }
};
