const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 */

/**
 * Verify JWT token and attach user to request
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token', { error: error.message });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Verify business owner token
 */
function verifyBusinessToken(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.type !== 'business') {
      return res.status(403).json({ error: 'Business access required' });
    }
    next();
  });
}

/**
 * Verify admin token
 */
function verifyAdminToken(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Verify super admin token
 */
function verifySuperAdminToken(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.type !== 'admin' || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
  });
}

module.exports = {
  verifyToken,
  verifyBusinessToken,
  verifyAdminToken,
  verifySuperAdminToken
};
