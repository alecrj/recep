const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth.middleware');
const bcrypt = require('bcrypt');
const twilioService = require('../services/twilio.service');
const calendarService = require('../services/calendar.service');

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
    // Get overall platform stats
    const [
      totalBusinesses,
      activeBusinesses,
      totalCalls,
      totalAppointments,
      totalRevenue,
      recentCalls,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: 'ACTIVE' } }),
      prisma.call.count(),
      prisma.appointment.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.call.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          business: { select: { name: true } },
        },
      }),
    ]);

    // Get calls by status
    const callsByOutcome = await prisma.call.groupBy({
      by: ['outcome'],
      _count: true,
    });

    // Get businesses by plan
    const businessesByPlan = await prisma.business.groupBy({
      by: ['plan'],
      _count: true,
    });

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
        totalAppointments,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      callsByOutcome,
      businessesByPlan,
      recentCalls,
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

module.exports = router;
