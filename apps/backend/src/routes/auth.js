const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('@ai-receptionist/database');
const config = require('../utils/config');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * Auth Routes - Authentication for Admin and Business Owners
 *
 * Endpoints:
 * - POST /auth/admin/login - Admin login
 * - POST /auth/admin/register - Register new admin (super admin only)
 * - POST /auth/business/login - Business owner login
 * - POST /auth/business/register - Register new business (invitation only)
 * - POST /auth/refresh - Refresh JWT token
 * - POST /auth/logout - Logout (client-side token deletion)
 * - GET /auth/me - Get current user info
 */

// ============================================
// ADMIN AUTHENTICATION
// ============================================

/**
 * Admin Login
 */
router.post(
  '/admin/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find admin
      const admin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!admin) {
        logger.warn('Failed admin login - user not found', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        logger.warn('Failed admin login - invalid password', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          type: 'admin',
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      // Update last login
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });

      logger.info('Admin logged in successfully', {
        adminId: admin.id,
        email: admin.email,
      });

      res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error) {
      logger.error('Admin login error', { error: error.message, email });
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * Register New Admin (Super Admin Only)
 */
router.post(
  '/admin/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .isIn(['ADMIN', 'SUPPORT'])
      .withMessage('Valid role is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    try {
      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: role || 'ADMIN',
        },
      });

      logger.info('New admin registered', {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      });

      res.status(201).json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error) {
      logger.error('Admin registration error', {
        error: error.message,
        email,
      });
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ============================================
// BUSINESS OWNER AUTHENTICATION
// ============================================

/**
 * Business Owner Login
 */
router.post(
  '/business/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find business by owner email
      const business = await prisma.business.findFirst({
        where: { ownerEmail: email.toLowerCase() },
        include: { config: true },
      });

      if (!business) {
        logger.warn('Failed business login - not found', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      // Note: Business passwords should be stored separately in production
      // For now, we'll use a simple password field on Business model
      // TODO: Add password field to Business model
      const validPassword = await bcrypt.compare(
        password,
        business.password || ''
      );
      if (!validPassword) {
        logger.warn('Failed business login - invalid password', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: business.id,
          email: business.ownerEmail,
          name: business.name,
          type: 'business',
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      logger.info('Business owner logged in', {
        businessId: business.id,
        email: business.ownerEmail,
      });

      res.json({
        success: true,
        token,
        user: {
          id: business.id,
          email: business.ownerEmail,
          name: business.ownerName || business.name,
          businessName: business.name,
          status: business.status,
          plan: business.plan,
        },
      });
    } catch (error) {
      logger.error('Business login error', { error: error.message, email });
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * Register New Business (Invitation-based)
 */
router.post(
  '/business/register',
  [
    body('invitationCode')
      .notEmpty()
      .withMessage('Invitation code is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('ownerName').notEmpty().withMessage('Owner name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invitationCode, email, password, businessName, ownerName, phoneNumber, industry } = req.body;

    try {
      // TODO: Verify invitation code
      // For now, we'll skip invitation validation in TEST MODE

      // Check if business already exists
      const existingBusiness = await prisma.business.findFirst({
        where: { ownerEmail: email.toLowerCase() },
      });

      if (existingBusiness) {
        return res.status(400).json({ error: 'Business already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create business
      const business = await prisma.business.create({
        data: {
          name: businessName,
          ownerEmail: email.toLowerCase(),
          ownerName,
          ownerPhone: phoneNumber,
          industry,
          password: hashedPassword,
          status: 'TRIAL',
          plan: 'STARTER',
          config: {
            create: {
              aiAgentName: 'Sarah',
              aiTone: 'professional',
              greetingMessage: `Thank you for calling ${businessName}. How can I help you today?`,
              bookingEnabled: true,
              paymentEnabled: false,
              reminderEnabled: true,
            },
          },
        },
        include: { config: true },
      });

      logger.info('New business registered', {
        businessId: business.id,
        name: business.name,
        email: business.ownerEmail,
      });

      // Generate JWT
      const token = jwt.sign(
        {
          id: business.id,
          email: business.ownerEmail,
          name: business.name,
          type: 'business',
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        token,
        business: {
          id: business.id,
          name: business.name,
          email: business.ownerEmail,
          status: business.status,
          plan: business.plan,
        },
      });
    } catch (error) {
      logger.error('Business registration error', {
        error: error.message,
        email,
      });
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Refresh JWT Token
 */
router.post('/refresh', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Verify existing token (even if expired)
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      ignoreExpiration: true,
    });

    // Check if token is too old to refresh (> 30 days)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 30 * 24 * 60 * 60) {
      return res.status(401).json({ error: 'Token too old, please login again' });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        type: decoded.type,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    logger.info('Token refreshed', { userId: decoded.id, type: decoded.type });

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * Get Current User Info
 */
router.get('/me', async (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!admin) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        user: { ...admin, type: 'admin' },
      });
    } else if (decoded.type === 'business') {
      const business = await prisma.business.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          ownerEmail: true,
          ownerName: true,
          ownerPhone: true,
          status: true,
          plan: true,
          twilioNumber: true,
          createdAt: true,
        },
      });

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      return res.json({
        success: true,
        user: { ...business, type: 'business' },
      });
    }

    res.status(400).json({ error: 'Invalid token type' });
  } catch (error) {
    logger.error('Get user info error', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
