const express = require('express');
const { getAllPlans, getPlan, formatPrice } = require('../config/plans');
const { getCurrentUsage } = require('../middleware/plan-enforcement');
const { verifyBusinessToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Plans & Pricing Routes
 */

/**
 * Get all available plans (public)
 */
router.get('/plans', (req, res) => {
  const plans = getAllPlans().map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    priceFormatted: formatPrice(plan.price),
    interval: plan.interval,
    features: plan.features,
    popular: plan.popular,
    badge: plan.badge,
    color: plan.color
  }));

  res.json({ plans });
});

/**
 * Get current business plan details (authenticated)
 */
router.get('/plans/current', verifyBusinessToken, async (req, res) => {
  try {
    const { prisma } = require('@ai-receptionist/database');

    const business = await prisma.business.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        status: true,
        createdAt: true
      }
    });

    const planConfig = getPlan(business.plan);
    const usage = await getCurrentUsage(req.user.id);

    res.json({
      current: {
        plan: planConfig.name,
        planId: planConfig.id,
        price: formatPrice(planConfig.price),
        status: business.status,
        features: planConfig.features,
        limits: planConfig.limits
      },
      usage: {
        phoneNumbers: {
          current: usage.phoneNumbers,
          limit: planConfig.limits.phoneNumbers,
          unlimited: planConfig.limits.phoneNumbers === null
        },
        callsThisMonth: usage.calls,
        appointmentsThisMonth: usage.appointments,
        totalCustomers: usage.customers
      },
      memberSince: business.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plan details' });
  }
});

/**
 * Compare plans
 */
router.get('/plans/compare', (req, res) => {
  const plans = getAllPlans();

  const comparison = {
    features: [
      {
        category: 'Phone Numbers',
        items: [
          {
            name: 'AI Phone Numbers',
            starter: '1',
            professional: '3',
            enterprise: 'Unlimited'
          },
          {
            name: 'Business Locations',
            starter: '1',
            professional: '3',
            enterprise: 'Unlimited'
          }
        ]
      },
      {
        category: 'Core Features',
        items: [
          {
            name: 'Incoming Calls',
            starter: 'Unlimited',
            professional: 'Unlimited',
            enterprise: 'Unlimited'
          },
          {
            name: 'Appointment Booking',
            starter: true,
            professional: true,
            enterprise: true
          },
          {
            name: 'Message Taking',
            starter: true,
            professional: true,
            enterprise: true
          },
          {
            name: 'Call Transcripts',
            starter: true,
            professional: true,
            enterprise: true
          },
          {
            name: 'Google Calendar Sync',
            starter: true,
            professional: true,
            enterprise: true
          }
        ]
      },
      {
        category: 'Advanced Features',
        items: [
          {
            name: 'SMS Reminders',
            starter: false,
            professional: true,
            enterprise: true
          },
          {
            name: 'Advanced Analytics',
            starter: false,
            professional: true,
            enterprise: true
          },
          {
            name: 'CRM Integration',
            starter: false,
            professional: true,
            enterprise: true
          },
          {
            name: 'API Access',
            starter: false,
            professional: 'Basic',
            enterprise: 'Full'
          },
          {
            name: 'Custom AI Training',
            starter: false,
            professional: false,
            enterprise: true
          },
          {
            name: 'White Label',
            starter: false,
            professional: false,
            enterprise: true
          }
        ]
      },
      {
        category: 'Support',
        items: [
          {
            name: 'Support Type',
            starter: 'Email',
            professional: 'Priority Email',
            enterprise: 'Phone + Email (24/7)'
          },
          {
            name: 'Account Manager',
            starter: false,
            professional: false,
            enterprise: 'Dedicated'
          }
        ]
      }
    ],
    plans: plans.map(p => ({
      id: p.id,
      name: p.name,
      price: formatPrice(p.price),
      popular: p.popular
    }))
  };

  res.json(comparison);
});

module.exports = { router };
