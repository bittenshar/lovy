/**
 * Admin Token Controller
 * Generates and manages static admin tokens
 */

const adminTokenService = require('../services/admin-token.service');
const User = require('../modules/users/user.model');

/**
 * Generate a static admin token (never expires)
 * POST /api/admin/generate-static-token
 * Body: {
 *   adminEmail: string (email of admin user)
 * }
 * Note: Only accessible by super admin or system
 */
exports.generateStaticAdminToken = async (req, res) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({
        status: 'fail',
        message: 'Admin email is required'
      });
    }

    // Find admin user
    const admin = await User.findOne({ 
      email: adminEmail.toLowerCase(),
      userType: 'admin'
    });

    if (!admin) {
      return res.status(404).json({
        status: 'fail',
        message: 'Admin user not found'
      });
    }

    // Generate static token (no expiration)
    const token = adminTokenService.generateStaticAdminToken(admin._id, admin.email);

    // Save to file for reference
    adminTokenService.saveAdminTokenToFile(token, admin._id, admin.email);

    console.log(`✅ Static admin token generated for ${adminEmail}`);

    return res.json({
      status: 'success',
      message: 'Static admin token generated successfully',
      data: {
        token: token,
        adminId: admin._id,
        email: admin.email,
        expiresAt: 'NEVER',
        note: 'This token never expires. Keep it safe!'
      }
    });
  } catch (error) {
    console.error('Error generating static admin token:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to generate admin token',
      error: error.message
    });
  }
};

/**
 * List all static admin tokens
 * GET /api/admin/tokens
 * Auth: Admin only
 */
exports.listAdminTokens = async (req, res) => {
  try {
    const tokens = adminTokenService.listAdminTokens();

    return res.json({
      status: 'success',
      data: {
        totalTokens: tokens.length,
        tokens: tokens.map(t => ({
          email: t.email,
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
          tokenPreview: t.token.substring(0, 20) + '...'
        }))
      }
    });
  } catch (error) {
    console.error('Error listing admin tokens:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to list admin tokens'
    });
  }
};

/**
 * Revoke a static admin token
 * POST /api/admin/revoke-token
 * Body: {
 *   token: string
 * }
 */
exports.revokeAdminToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is required'
      });
    }

    const revoked = adminTokenService.revokeAdminToken(token);

    if (!revoked) {
      return res.status(404).json({
        status: 'fail',
        message: 'Token not found or already revoked'
      });
    }

    return res.json({
      status: 'success',
      message: 'Admin token revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking admin token:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to revoke token'
    });
  }
};

/**
 * Create admin user (for initial setup)
 * POST /api/admin/create
 * Body: {
 *   email: string,
 *   password: string,
 *   name: string
 * }
 */
exports.createAdminUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email, password, and name are required'
      });
    }

    // Check if admin already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        status: 'fail',
        message: 'User already exists with this email'
      });
    }

    // Create admin user
    const admin = await User.create({
      email: email.toLowerCase(),
      password: password,
      firstName: name || 'Admin',
      lastName: '',
      userType: 'admin',
      premium: false
    });

    console.log(`✅ Admin user created: ${email}`);

    return res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        userType: admin.userType
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};
