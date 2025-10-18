const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth.middleware');
const bcrypt = require('bcrypt');
const twilioService = require('../services/twilio.service');
const calendarService = require('../services/calendar.service');
const costCalculator = require('../services/cost-calculator');

const router = express.Router();

/**
 * Admin API Routes - Manage the entire platform
 *
 * All routes require admin authentication
 *
 * Endpoints:
 * - GET /admin/dashboard - Dashboard stats
 * - GET /admin/businesses - List all businesses
 * - POST /admin/businesses - Create new business
 * - GET /admin/businesses/:id - Get business details
 * - PUT /admin/businesses/:id - Update business
 * - DELETE /admin/businesses/:id - Delete business
 * - GET /admin/businesses/:id/calls - Get business calls
 * - GET /admin/businesses/:id/customers - Get business customers
 * - GET /admin/businesses/:id/appointments - Get business appointments
 * - POST /admin/businesses/:id/test-call - Test AI receptionist for a business
 * - GET /admin/system - System health and stats
 */

// Apply admin auth middleware to all routes
router.use(authMiddleware.requireAdmin);

// ============================================
// DASHBOARD & STATS
// ============================================

/**
 * Get Dashboard Stats
 */
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get overall platform stats
    const [
      totalBusinesses,
      activeBusinesses,
      totalCalls,
      callsThisMonth,
      totalAppointments,
      totalRevenue,
      activePhoneNumbers,
      recentBusinesses,
      recentCalls,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: 'ACTIVE' } }),
      prisma.call.count(),
      prisma.call.count({
        where: {
          startedAt: { gte: startOfMonth },
        },
      }),
      prisma.appointment.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.phoneNumber.count({ where: { status: 'ASSIGNED' } }),
      prisma.business.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          ownerEmail: true,
          createdAt: true,
        },
      }),
      prisma.call.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          fromNumber: true,
          startedAt: true,
          outcome: true,
          business: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Calculate MRR based on actual plans
    const businessPlans = await prisma.business.groupBy({
      by: ['plan', 'status'],
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] }
      },
      _count: true
    });

    const PLAN_PRICES = {
      STARTER: 299,
      PROFESSIONAL: 799,
      ENTERPRISE: 1499
    };

    let mrr = 0;
    businessPlans.forEach(group => {
      // Only count ACTIVE subscriptions for MRR (not trials)
      if (group.status === 'ACTIVE') {
        mrr += (PLAN_PRICES[group.plan] || 0) * group._count;
      }
    });

    const arr = mrr * 12;

    // Calculate total call minutes for cost analysis
    const callStats = await prisma.call.aggregate({
      where: {
        endedAt: { not: null }
      },
      _sum: {
        durationSeconds: true
      },
      _count: true
    });

    const totalCallMinutes = callStats._sum.durationSeconds
      ? parseFloat((callStats._sum.durationSeconds / 60).toFixed(2))
      : 0;

    // Calculate platform costs
    const platformCosts = costCalculator.calculatePlatformCosts({
      totalCallMinutes,
      totalCalls,
      activePhoneNumbers,
      revenue: mrr,
      totalBusinesses,
      daysInPeriod: 30
    });

    // Calculate success rate
    const completedCalls = await prisma.call.count({
      where: {
        outcome: {
          in: ['APPOINTMENT_BOOKED', 'MESSAGE_TAKEN', 'QUESTION_ANSWERED'],
        },
      },
    });
    const avgSuccessRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

    logger.info('Admin dashboard accessed', {
      adminId: req.user.id,
      adminEmail: req.user.email,
    });

    res.json({
      success: true,
      stats: {
        totalBusinesses,
        activeBusinesses,
        totalCalls,
        callsThisMonth,
        totalAppointments,
        avgSuccessRate,
        mrr,
        arr,
        growthRate: 0, // TODO: Calculate based on historical data
      },
      costs: platformCosts.costs,
      profit: platformCosts.profit,
      metrics: platformCosts.metrics,
      recentBusinesses,
      recentCalls: recentCalls.map(call => ({
        ...call,
        callerPhone: call.fromNumber,
        status: call.outcome ? 'COMPLETED' : 'IN_PROGRESS',
      })),
      activePhoneNumbers,
    });
  } catch (error) {
    logger.error('Dashboard error', {
      error: error.message,
      adminId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ============================================
// BUSINESS MANAGEMENT
// ============================================

/**
 * List All Businesses
 */
router.get('/businesses', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      plan,
      search,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build filter
    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ownerEmail: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          config: {
            select: {
              aiAgentName: true,
              bookingEnabled: true,
              paymentEnabled: true,
            },
          },
          _count: {
            select: {
              calls: true,
              appointments: true,
              customers: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      success: true,
      businesses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List businesses error', { error: error.message });
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});

/**
 * Create New Business
 */
router.post('/businesses', async (req, res) => {
  try {
    const {
      name,
      industry,
      ownerEmail,
      ownerName,
      ownerPhone,
      plan = 'STARTER',
      status = 'TRIAL',
      password,
    } = req.body;

    // Validate required fields
    if (!name || !ownerEmail) {
      return res.status(400).json({ error: 'Name and owner email are required' });
    }

    // Check if business already exists
    const existing = await prisma.business.findFirst({
      where: { ownerEmail: ownerEmail.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Business with this email already exists' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create business with default config
    const business = await prisma.business.create({
      data: {
        name,
        industry,
        ownerEmail: ownerEmail.toLowerCase(),
        ownerName,
        ownerPhone,
        plan,
        status,
        password: hashedPassword,
        config: {
          create: {
            aiAgentName: 'Sarah',
            aiTone: 'professional',
            greetingMessage: `Thank you for calling ${name}. How can I help you today?`,
            bookingEnabled: true,
            paymentEnabled: false,
            reminderEnabled: true,
            emergencyKeywords: ['emergency', 'urgent'],
            transferKeywords: ['manager', 'owner', 'human'],
          },
        },
      },
      include: { config: true },
    });

    logger.info('Business created by admin', {
      businessId: business.id,
      businessName: business.name,
      adminId: req.user.id,
    });

    res.status(201).json({
      success: true,
      business,
    });
  } catch (error) {
    logger.error('Create business error', { error: error.message });
    res.status(500).json({ error: 'Failed to create business' });
  }
});

/**
 * Get Business Details
 */
router.get('/businesses/:id', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        config: true,
        _count: {
          select: {
            calls: true,
            appointments: true,
            customers: true,
            payments: true,
            messages: true,
          },
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get recent activity
    const [recentCalls, recentAppointments] = await Promise.all([
      prisma.call.findMany({
        where: { businessId: req.params.id },
        take: 10,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.appointment.findMany({
        where: { businessId: req.params.id },
        take: 10,
        orderBy: { scheduledTime: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      business,
      recentActivity: {
        calls: recentCalls,
        appointments: recentAppointments,
      },
    });
  } catch (error) {
    logger.error('Get business error', { error: error.message });
    res.status(500).json({ error: 'Failed to load business' });
  }
});

/**
 * Update Business
 */
router.put('/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      status,
      plan,
      ownerEmail,
      ownerName,
      ownerPhone,
      twilioNumber,
      config,
    } = req.body;

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (plan) updateData.plan = plan;
    if (ownerEmail) updateData.ownerEmail = ownerEmail.toLowerCase();
    if (ownerName) updateData.ownerName = ownerName;
    if (ownerPhone) updateData.ownerPhone = ownerPhone;
    if (twilioNumber !== undefined) updateData.twilioNumber = twilioNumber;

    // Update business
    const business = await prisma.business.update({
      where: { id },
      data: updateData,
      include: { config: true },
    });

    // Update config if provided
    if (config && business.config) {
      await prisma.businessConfig.update({
        where: { businessId: id },
        data: config,
      });
    }

    logger.info('Business updated by admin', {
      businessId: id,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      business,
    });
  } catch (error) {
    logger.error('Update business error', { error: error.message });
    res.status(500).json({ error: 'Failed to update business' });
  }
});

/**
 * Delete Business
 */
router.delete('/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.business.delete({
      where: { id },
    });

    logger.warn('Business deleted by admin', {
      businessId: id,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error) {
    logger.error('Delete business error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

// ============================================
// BUSINESS DATA
// ============================================

/**
 * Get Business Calls
 */
router.get('/businesses/:id/calls', async (req, res) => {
  try {
    const { page = 1, limit = 20, outcome, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.params.id };
    if (outcome) where.outcome = outcome;
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate);
      if (endDate) where.startedAt.lte = new Date(endDate);
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { startedAt: 'desc' },
        include: {
          customer: {
            select: { name: true, phone: true },
          },
        },
      }),
      prisma.call.count({ where }),
    ]);

    res.json({
      success: true,
      calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get business calls error', { error: error.message });
    res.status(500).json({ error: 'Failed to load calls' });
  }
});

/**
 * Get Business Customers
 */
router.get('/businesses/:id/customers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.params.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { lastContact: 'desc' },
        include: {
          _count: {
            select: {
              appointments: true,
              calls: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get business customers error', { error: error.message });
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

/**
 * Get Business Appointments
 */
router.get('/businesses/:id/appointments', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.params.id };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = new Date(startDate);
      if (endDate) where.scheduledTime.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { scheduledTime: 'desc' },
        include: {
          customer: {
            select: { name: true, phone: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get business appointments error', { error: error.message });
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// ============================================
// TESTING & UTILITIES
// ============================================

/**
 * Test AI Receptionist for a Business
 */
router.post('/businesses/:id/test-call', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: { config: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Generate test call data
    const testResult = {
      businessName: business.name,
      aiAgentName: business.config?.aiAgentName,
      greeting: business.config?.greetingMessage,
      servicesConfigured: business.config?.services ? JSON.parse(JSON.stringify(business.config.services)).length : 0,
      bookingEnabled: business.config?.bookingEnabled,
      calendarConnected: !!business.config?.googleCalendarAccessToken,
      twilioConnected: !!business.twilioNumber,
    };

    logger.info('Test call executed by admin', {
      businessId: business.id,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      testResult,
      message: 'Test completed successfully',
    });
  } catch (error) {
    logger.error('Test call error', { error: error.message });
    res.status(500).json({ error: 'Test failed' });
  }
});

/**
 * Get System Health
 */
router.get('/system', async (req, res) => {
  try {
    const [callsToday, appointmentsToday, activeCalls] = await Promise.all([
      prisma.call.count({
        where: {
          startedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.appointment.count({
        where: {
          scheduledTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.call.count({
        where: {
          endedAt: null,
        },
      }),
    ]);

    res.json({
      success: true,
      system: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        callsToday,
        appointmentsToday,
        activeCalls,
      },
    });
  } catch (error) {
    logger.error('System health error', { error: error.message });
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

// ============================================
// USAGE ANALYTICS & COST TRACKING
// ============================================

/**
 * Get Real-Time Usage Analytics
 */
router.get('/usage-analytics', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get usage by time period
    const [todayStats, weekStats, monthStats] = await Promise.all([
      prisma.call.aggregate({
        where: {
          startedAt: { gte: startOfToday },
          endedAt: { not: null }
        },
        _sum: { durationSeconds: true, cost: true },
        _count: true
      }),
      prisma.call.aggregate({
        where: {
          startedAt: { gte: startOfWeek },
          endedAt: { not: null }
        },
        _sum: { durationSeconds: true, cost: true },
        _count: true
      }),
      prisma.call.aggregate({
        where: {
          startedAt: { gte: startOfMonth },
          endedAt: { not: null }
        },
        _sum: { durationSeconds: true, cost: true },
        _count: true
      })
    ]);

    // Calculate costs per minute (AI + Twilio)
    const costPerMinute = 0.06 + 0.24 + 0.0048 + 0.013; // OpenAI in/out + Deepgram + Twilio

    const todayMinutes = (todayStats._sum.durationSeconds || 0) / 60;
    const weekMinutes = (weekStats._sum.durationSeconds || 0) / 60;
    const monthMinutes = (monthStats._sum.durationSeconds || 0) / 60;

    const todayCost = todayMinutes * costPerMinute;
    const weekCost = weekMinutes * costPerMinute;
    const monthCost = monthMinutes * costPerMinute;

    // Get daily trends (last 7 days)
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayStats = await prisma.call.aggregate({
        where: {
          startedAt: { gte: dayStart, lte: dayEnd },
          endedAt: { not: null }
        },
        _sum: { durationSeconds: true }
      });

      const dayMinutes = (dayStats._sum.durationSeconds || 0) / 60;
      const dayCost = dayMinutes * costPerMinute;

      dailyTrends.push({
        date: dayStart.toISOString(),
        minutes: parseFloat(dayMinutes.toFixed(2)),
        cost: parseFloat(dayCost.toFixed(2))
      });
    }

    // Calculate infrastructure costs (prorated daily)
    const infrastructureDailyCost = 46 / 30; // $46/month ÷ 30 days
    const phoneNumberCount = await prisma.phoneNumber.count({
      where: { status: 'ASSIGNED' }
    });
    const phoneNumberDailyCost = (phoneNumberCount * 1.00) / 30; // $1/month per number ÷ 30 days

    const dailyBurnRate = (monthCost / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) +
                          infrastructureDailyCost +
                          phoneNumberDailyCost;

    // Cost breakdown
    const aiCost = monthMinutes * (0.06 + 0.24 + 0.0048); // OpenAI + Deepgram
    const phoneCost = monthMinutes * 0.013 + (phoneNumberCount * 1.00); // Twilio voice + numbers
    const infrastructureCost = 46;
    const otherCost = 0; // SMS + Stripe (add when we have data)

    const totalCost = aiCost + phoneCost + infrastructureCost + otherCost;

    // Top cost businesses this month
    const businessCosts = await prisma.call.groupBy({
      by: ['businessId'],
      where: {
        startedAt: { gte: startOfMonth },
        endedAt: { not: null }
      },
      _sum: {
        durationSeconds: true,
        cost: true
      },
      _count: true
    });

    // Get business details and calculate revenue
    const topBusinesses = await Promise.all(
      businessCosts
        .sort((a, b) => (b._sum.durationSeconds || 0) - (a._sum.durationSeconds || 0))
        .slice(0, 10)
        .map(async (bc) => {
          const business = await prisma.business.findUnique({
            where: { id: bc.businessId },
            select: { name: true, plan: true }
          });

          const PLAN_PRICES = {
            STARTER: 299,
            PROFESSIONAL: 799,
            ENTERPRISE: 1499
          };

          const minutes = (bc._sum.durationSeconds || 0) / 60;
          const cost = minutes * costPerMinute;
          const revenue = PLAN_PRICES[business?.plan] || 0;
          const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

          return {
            id: bc.businessId,
            name: business?.name || 'Unknown',
            plan: business?.plan || 'N/A',
            calls: bc._count,
            minutes: parseFloat(minutes.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
            revenue,
            margin: parseFloat(margin.toFixed(2))
          };
        })
    );

    res.json({
      success: true,
      usage: {
        today: {
          minutes: parseFloat(todayMinutes.toFixed(2)),
          cost: parseFloat(todayCost.toFixed(2)),
          calls: todayStats._count
        },
        week: {
          minutes: parseFloat(weekMinutes.toFixed(2)),
          cost: parseFloat(weekCost.toFixed(2)),
          calls: weekStats._count
        },
        month: {
          minutes: parseFloat(monthMinutes.toFixed(2)),
          cost: parseFloat(monthCost.toFixed(2)),
          calls: monthStats._count
        }
      },
      costs: {
        dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
        total: parseFloat(totalCost.toFixed(2)),
        breakdown: {
          ai: parseFloat(aiCost.toFixed(2)),
          phone: parseFloat(phoneCost.toFixed(2)),
          infrastructure: parseFloat(infrastructureCost.toFixed(2)),
          other: parseFloat(otherCost.toFixed(2))
        }
      },
      trends: {
        daily: dailyTrends
      },
      topBusinesses
    });
  } catch (error) {
    logger.error('Usage analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to load usage analytics' });
  }
});

// ============================================
// CALLS MANAGEMENT
// ============================================

/**
 * Get All Calls Across Platform
 */
router.get('/calls', async (req, res) => {
  try {
    const { page = 1, limit = 50, outcome, businessId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (outcome) where.outcome = outcome;
    if (businessId) where.businessId = businessId;
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate);
      if (endDate) where.startedAt.lte = new Date(endDate);
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { startedAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true },
          },
          customer: {
            select: { name: true, phone: true },
          },
        },
      }),
      prisma.call.count({ where }),
    ]);

    res.json({
      success: true,
      calls: calls.map(call => ({
        ...call,
        callerPhone: call.fromNumber,
        intent: call.intent || call.outcome,
        duration: call.durationSeconds,
        status: call.endedAt ? 'COMPLETED' : 'IN_PROGRESS',
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get all calls error', { error: error.message });
    res.status(500).json({ error: 'Failed to load calls' });
  }
});

// ============================================
// PHONE NUMBER MANAGEMENT
// ============================================

/**
 * List All Phone Numbers
 */
router.get('/phone-numbers', async (req, res) => {
  try {
    const { status, region, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (region) where.region = region;

    const [phoneNumbers, total] = await Promise.all([
      prisma.phoneNumber.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.phoneNumber.count({ where }),
    ]);

    // Get counts by status
    const statusCounts = await prisma.phoneNumber.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      success: true,
      phoneNumbers,
      stats: {
        total,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List phone numbers error', { error: error.message });
    res.status(500).json({ error: 'Failed to load phone numbers' });
  }
});

/**
 * Add Phone Number to Pool
 */
router.post('/phone-numbers', async (req, res) => {
  try {
    const { phoneNumber, twilioSid, friendlyName, region, capabilities } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if number already exists
    const existing = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return res.status(400).json({ error: 'Phone number already exists in pool' });
    }

    const number = await prisma.phoneNumber.create({
      data: {
        phoneNumber,
        twilioSid,
        friendlyName,
        region,
        capabilities: capabilities || { voice: true, sms: true, mms: false },
        status: 'AVAILABLE',
      },
    });

    logger.info('Phone number added to pool', {
      phoneNumberId: number.id,
      phoneNumber: number.phoneNumber,
      adminId: req.user.id,
    });

    res.status(201).json({
      success: true,
      phoneNumber: number,
    });
  } catch (error) {
    logger.error('Add phone number error', { error: error.message });
    res.status(500).json({ error: 'Failed to add phone number' });
  }
});

/**
 * Assign Phone Number to Business
 */
router.post('/phone-numbers/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Check if phone number exists and is available
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    if (phoneNumber.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Phone number is not available' });
    }

    // Check if business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Assign the number
    const [updatedNumber, updatedBusiness] = await Promise.all([
      prisma.phoneNumber.update({
        where: { id },
        data: {
          businessId,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        },
      }),
      prisma.business.update({
        where: { id: businessId },
        data: {
          twilioNumber: phoneNumber.phoneNumber,
        },
      }),
    ]);

    logger.info('Phone number assigned to business', {
      phoneNumberId: id,
      businessId,
      phoneNumber: phoneNumber.phoneNumber,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      phoneNumber: updatedNumber,
      business: updatedBusiness,
      message: 'Phone number assigned successfully',
    });
  } catch (error) {
    logger.error('Assign phone number error', { error: error.message });
    res.status(500).json({ error: 'Failed to assign phone number' });
  }
});

/**
 * Unassign Phone Number from Business
 */
router.post('/phone-numbers/:id/unassign', async (req, res) => {
  try {
    const { id } = req.params;

    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    if (phoneNumber.status !== 'ASSIGNED') {
      return res.status(400).json({ error: 'Phone number is not assigned' });
    }

    // Unassign the number
    const [updatedNumber] = await Promise.all([
      prisma.phoneNumber.update({
        where: { id },
        data: {
          businessId: null,
          assignedAt: null,
          status: 'AVAILABLE',
        },
      }),
      phoneNumber.businessId ? prisma.business.update({
        where: { id: phoneNumber.businessId },
        data: {
          twilioNumber: null,
        },
      }) : Promise.resolve(null),
    ]);

    logger.info('Phone number unassigned from business', {
      phoneNumberId: id,
      businessId: phoneNumber.businessId,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      phoneNumber: updatedNumber,
      message: 'Phone number unassigned successfully',
    });
  } catch (error) {
    logger.error('Unassign phone number error', { error: error.message });
    res.status(500).json({ error: 'Failed to unassign phone number' });
  }
});

/**
 * Delete Phone Number from Pool
 */
router.delete('/phone-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    if (phoneNumber.status === 'ASSIGNED') {
      return res.status(400).json({
        error: 'Cannot delete assigned phone number. Unassign it first.'
      });
    }

    await prisma.phoneNumber.delete({
      where: { id },
    });

    logger.warn('Phone number deleted from pool', {
      phoneNumberId: id,
      phoneNumber: phoneNumber.phoneNumber,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  } catch (error) {
    logger.error('Delete phone number error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete phone number' });
  }
});

/**
 * Purchase Phone Number from Twilio
 */
router.post('/phone-numbers/purchase', async (req, res) => {
  try {
    const { areaCode, region } = req.body;

    // Search for available numbers
    const availableNumbers = await twilioService.searchAvailableNumbers(areaCode, region);

    if (!availableNumbers || availableNumbers.length === 0) {
      return res.status(404).json({ error: 'No available numbers found in this area' });
    }

    // Purchase the first available number
    const purchasedNumber = await twilioService.purchasePhoneNumber(availableNumbers[0]);

    // Add to database pool
    const phoneNumber = await prisma.phoneNumber.create({
      data: {
        phoneNumber: purchasedNumber.phoneNumber,
        twilioSid: purchasedNumber.sid,
        friendlyName: `${region || 'US'} Number`,
        region: region || 'US',
        capabilities: purchasedNumber.capabilities,
        status: 'AVAILABLE',
      },
    });

    logger.info('Phone number purchased from Twilio', {
      phoneNumberId: phoneNumber.id,
      phoneNumber: phoneNumber.phoneNumber,
      adminId: req.user.id,
    });

    res.status(201).json({
      success: true,
      phoneNumber,
      message: 'Phone number purchased successfully',
    });
  } catch (error) {
    logger.error('Purchase phone number error', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to purchase phone number' });
  }
});

module.exports = router;
