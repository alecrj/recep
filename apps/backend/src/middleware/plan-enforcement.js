const { prisma } = require('@ai-receptionist/database');
const { canPerformAction } = require('../config/plans');
const logger = require('../utils/logger');

/**
 * Plan Enforcement Middleware
 *
 * Checks if business can perform action based on their subscription plan
 */

/**
 * Check if business can add phone number
 */
async function canAddPhoneNumber(req, res, next) {
  try {
    const businessId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true }
    });

    const currentCount = await prisma.phoneNumber.count({
      where: {
        businessId: businessId,
        status: 'ASSIGNED'
      }
    });

    const check = canPerformAction(business.plan, 'phoneNumbers', currentCount);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Plan limit reached',
        message: check.reason,
        upgrade: {
          required: true,
          message: 'Upgrade your plan to add more phone numbers'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking phone number limit', { error: error.message });
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
}

/**
 * Check if business can add team member
 */
async function canAddTeamMember(req, res, next) {
  try {
    const businessId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true }
    });

    // TODO: Implement team members table
    const currentCount = 1; // Placeholder

    const check = canPerformAction(business.plan, 'teamMembers', currentCount);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Plan limit reached',
        message: check.reason,
        upgrade: {
          required: true,
          message: 'Upgrade to add more team members'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking team member limit', { error: error.message });
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
}

/**
 * Check if business has API access
 */
async function requireApiAccess(req, res, next) {
  try {
    const businessId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true }
    });

    const check = canPerformAction(business.plan, 'apiAccess', 0);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'API access not available',
        message: 'API access requires Professional or Enterprise plan',
        upgrade: {
          required: true,
          message: 'Upgrade to Professional or Enterprise for API access'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking API access', { error: error.message });
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
}

/**
 * Check if business has custom AI training
 */
async function requireCustomAiTraining(req, res, next) {
  try {
    const businessId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true }
    });

    const check = canPerformAction(business.plan, 'customAiTraining', 0);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Custom AI training not available',
        message: 'Custom AI training requires Enterprise plan',
        upgrade: {
          required: true,
          message: 'Upgrade to Enterprise for custom AI voice training'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking custom AI training', { error: error.message });
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
}

/**
 * Check if business account is active (not suspended for non-payment)
 */
async function requireActiveSubscription(req, res, next) {
  try {
    const businessId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { status: true }
    });

    if (business.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended due to payment issues',
        action: {
          required: true,
          message: 'Please update your payment method to reactivate your account'
        }
      });
    }

    if (business.status === 'CANCELLED') {
      return res.status(403).json({
        error: 'Account cancelled',
        message: 'Your account has been cancelled',
        action: {
          required: true,
          message: 'Please contact support to reactivate your account'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking subscription status', { error: error.message });
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
}

/**
 * Get current usage stats for a business
 */
async function getCurrentUsage(businessId) {
  try {
    const [phoneNumbers, appointments, customers, calls] = await Promise.all([
      prisma.phoneNumber.count({
        where: { businessId: businessId, status: 'ASSIGNED' }
      }),
      prisma.appointment.count({
        where: {
          businessId: businessId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.customer.count({
        where: { businessId: businessId }
      }),
      prisma.call.count({
        where: {
          businessId: businessId,
          startedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      phoneNumbers,
      appointments,
      customers,
      calls
    };
  } catch (error) {
    logger.error('Error getting current usage', {
      businessId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  canAddPhoneNumber,
  canAddTeamMember,
  requireApiAccess,
  requireCustomAiTraining,
  requireActiveSubscription,
  getCurrentUsage
};
