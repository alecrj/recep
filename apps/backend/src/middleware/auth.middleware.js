const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');

/**
 * Verify JWT token for admin users
 */
async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Load admin from database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = admin;
    req.admin = admin;
    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify JWT token for business owners
 */
async function authenticateBusiness(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (decoded.type !== 'business') {
      return res.status(403).json({ error: 'Business access required' });
    }

    // Load business from database
    const business = await prisma.business.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        status: true,
        ownerEmail: true,
      },
    });

    if (!business) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (business.status !== 'ACTIVE' && business.status !== 'TRIAL') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = business;
    req.business = business;
    req.businessId = business.id; // Convenience
    next();
  } catch (error) {
    logger.error('Business authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify Twilio webhook signature
 */
function verifyTwilioSignature(req, res, next) {
  const twilio = require('twilio');
  const signature = req.headers['x-twilio-signature'];
  const url = `${config.BACKEND_URL}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    config.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    logger.warn('Invalid Twilio signature', { url, signature });
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
}

module.exports = {
  authenticateAdmin,
  authenticateBusiness,
  verifyTwilioSignature,
  // Aliases for cleaner code
  requireAdmin: authenticateAdmin,
  requireBusiness: authenticateBusiness,
};
