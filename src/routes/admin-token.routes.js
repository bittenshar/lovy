/**
 * Admin Token Routes
 * Generate and manage static admin tokens
 */

const express = require('express');
const controller = require('../controllers/admin-token.controller');

const router = express.Router();

/**
 * Public endpoint - Generate static admin token
 * POST /api/admin/generate-static-token
 * Body: { adminEmail: "admin@example.com" }
 * Response: { token: "eyJ...", expiresAt: "NEVER" }
 */
router.post('/generate-static-token', controller.generateStaticAdminToken);

/**
 * Public endpoint - Create admin user
 * POST /api/admin/create
 * Body: { email, password, name }
 */
router.post('/create', controller.createAdminUser);

/**
 * List all admin tokens (public for reference)
 * GET /api/admin/tokens
 */
router.get('/tokens', controller.listAdminTokens);

/**
 * Revoke admin token
 * POST /api/admin/revoke-token
 * Body: { token: "eyJ..." }
 */
router.post('/revoke-token', controller.revokeAdminToken);

module.exports = router;
