const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth.middleware');
const calendarService = require('../services/calendar.service');
const twilioService = require('../services/twilio.service');
const { getAvailableIndustries, applyIndustryTemplate } = require('../config/industry-templates');

const router = express.Router();

/**
 * Business Owner API Routes - Manage their own business
 *
 * All routes require business owner authentication
 *
 * Endpoints:
 * - GET /business/dashboard - Dashboard stats for this business
 * - GET /business/profile - Get business profile
 * - PUT /business/profile - Update business profile
 * - GET /business/config - Get AI configuration
 * - PUT /business/config - Update AI configuration
 * - GET /business/calls - Get calls for this business
 * - GET /business/calls/:id - Get call details
 * - GET /business/customers - Get customers
 * - GET /business/customers/:id - Get customer details
 * - GET /business/appointments - Get appointments
 * - POST /business/appointments - Create appointment manually
 * - PUT /business/appointments/:id - Update appointment
 * - DELETE /business/appointments/:id - Cancel appointment
 * - GET /business/messages - Get messages
 * - PUT /business/messages/:id - Update message status
 * - GET /business/analytics - Get business analytics
 * - POST /business/calendar/connect - Connect Google Calendar
 * - GET /business/calendar/oauth-callback - OAuth callback
 * - POST /business/test-ai - Test AI receptionist
 */

// Apply business auth middleware to all routes
router.use(authMiddleware.requireBusiness);

// ============================================
// DASHBOARD & PROFILE
// ============================================

/**
 * Get Business Dashboard Stats
 */
router.get('/dashboard', async (req, res) => {
  try {
    const businessId = req.user.id;

    // Get stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalCalls,
      totalAppointments,
      totalCustomers,
      callsLast30Days,
      appointmentsToday,
      upcomingAppointments,
      unreadMessages,
      recentCalls,
    ] = await Promise.all([
      prisma.call.count({ where: { businessId } }),
      prisma.appointment.count({ where: { businessId } }),
      prisma.customer.count({ where: { businessId } }),
      prisma.call.count({
        where: {
          businessId,
          startedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.appointment.count({
        where: {
          businessId,
          scheduledTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.appointment.count({
        where: {
          businessId,
          scheduledTime: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.message.count({
        where: {
          businessId,
          status: 'NEW',
        },
      }),
      prisma.call.findMany({
        where: { businessId },
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          customer: {
            select: { name: true, phone: true },
          },
        },
      }),
    ]);

    // Get call outcomes breakdown
    const callsByOutcome = await prisma.call.groupBy({
      by: ['outcome'],
      where: { businessId },
      _count: true,
    });

    logger.info('Business dashboard accessed', {
      businessId,
      businessName: req.user.name,
    });

    res.json({
      success: true,
      stats: {
        totalCalls,
        totalAppointments,
        totalCustomers,
        callsLast30Days,
        appointmentsToday,
        upcomingAppointments,
        unreadMessages,
      },
      callsByOutcome,
      recentCalls,
    });
  } catch (error) {
    logger.error('Business dashboard error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * Get Business Profile
 */
router.get('/profile', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.id },
      include: { config: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Remove sensitive data
    const { password, ...businessData } = business;

    res.json({
      success: true,
      business: businessData,
    });
  } catch (error) {
    logger.error('Get profile error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/**
 * Update Business Profile
 */
router.put('/profile', async (req, res) => {
  try {
    const { name, industry, ownerName, ownerPhone, phoneNumber } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (industry) updateData.industry = industry;
    if (ownerName) updateData.ownerName = ownerName;
    if (ownerPhone) updateData.ownerPhone = ownerPhone;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    const business = await prisma.business.update({
      where: { id: req.user.id },
      data: updateData,
    });

    logger.info('Business profile updated', {
      businessId: req.user.id,
      fields: Object.keys(updateData),
    });

    res.json({
      success: true,
      business,
    });
  } catch (error) {
    logger.error('Update profile error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// AI CONFIGURATION
// ============================================

/**
 * Get AI Configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await prisma.businessConfig.findUnique({
      where: { businessId: req.user.id },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    logger.error('Get config error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

/**
 * Update AI Configuration
 */
router.put('/config', async (req, res) => {
  try {
    const {
      aiAgentName,
      aiVoiceId,
      aiTone,
      greetingMessage,
      businessHours,
      services,
      faqs,
      emergencyKeywords,
      transferNumber,
      transferKeywords,
      bookingEnabled,
      paymentEnabled,
      reminderEnabled,
    } = req.body;

    const updateData = {};
    if (aiAgentName) updateData.aiAgentName = aiAgentName;
    if (aiVoiceId) updateData.aiVoiceId = aiVoiceId;
    if (aiTone) updateData.aiTone = aiTone;
    if (greetingMessage) updateData.greetingMessage = greetingMessage;
    if (businessHours !== undefined) updateData.businessHours = businessHours;
    if (services !== undefined) updateData.services = services;
    if (faqs !== undefined) updateData.faqs = faqs;
    if (emergencyKeywords !== undefined) updateData.emergencyKeywords = emergencyKeywords;
    if (transferNumber !== undefined) updateData.transferNumber = transferNumber;
    if (transferKeywords !== undefined) updateData.transferKeywords = transferKeywords;
    if (bookingEnabled !== undefined) updateData.bookingEnabled = bookingEnabled;
    if (paymentEnabled !== undefined) updateData.paymentEnabled = paymentEnabled;
    if (reminderEnabled !== undefined) updateData.reminderEnabled = reminderEnabled;

    const config = await prisma.businessConfig.update({
      where: { businessId: req.user.id },
      data: updateData,
    });

    logger.info('AI configuration updated', {
      businessId: req.user.id,
      fields: Object.keys(updateData),
    });

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    logger.error('Update config error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * Get Available Industry Templates
 */
router.get('/industries', async (req, res) => {
  try {
    const industries = getAvailableIndustries();

    res.json({
      success: true,
      industries,
    });
  } catch (error) {
    logger.error('Get industries error', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to load industries' });
  }
});

/**
 * Apply Industry Template to Business Config
 */
router.post('/config/apply-template', async (req, res) => {
  try {
    const { industry } = req.body;

    if (!industry) {
      return res.status(400).json({ error: 'Industry is required' });
    }

    // Get business info
    const business = await prisma.business.findUnique({
      where: { id: req.user.id },
      select: { name: true },
    });

    // Apply industry template
    const templateConfig = applyIndustryTemplate(industry, business.name);

    // Update business config with template
    const config = await prisma.businessConfig.update({
      where: { businessId: req.user.id },
      data: {
        industry: templateConfig.industry,
        greetingMessage: templateConfig.greetingMessage,
        services: templateConfig.services,
        emergencyKeywords: templateConfig.emergencyKeywords,
        faqs: templateConfig.faqs,
        businessHoursStart: templateConfig.businessHoursStart,
        businessHoursEnd: templateConfig.businessHoursEnd,
        appointmentDuration: templateConfig.appointmentDuration,
      },
    });

    // Also update industry on business record
    await prisma.business.update({
      where: { id: req.user.id },
      data: { industry: templateConfig.industry },
    });

    logger.info('Industry template applied', {
      businessId: req.user.id,
      industry: templateConfig.industry,
    });

    res.json({
      success: true,
      config,
      message: `${industry.toUpperCase()} template applied successfully`,
    });
  } catch (error) {
    logger.error('Apply template error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// ============================================
// CALLS
// ============================================

/**
 * Get Calls
 */
router.get('/calls', async (req, res) => {
  try {
    const { page = 1, limit = 20, outcome, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.user.id };
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
    logger.error('Get calls error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load calls' });
  }
});

/**
 * Get Call Details
 */
router.get('/calls/:id', async (req, res) => {
  try {
    const call = await prisma.call.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.id, // Ensure they own this call
      },
      include: {
        customer: true,
        messages: true,
      },
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    logger.error('Get call details error', {
      error: error.message,
      callId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to load call details' });
  }
});

// ============================================
// CUSTOMERS
// ============================================

/**
 * Get Customers
 */
router.get('/customers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.user.id };
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
    logger.error('Get customers error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

/**
 * Get Customer Details
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.id,
      },
      include: {
        appointments: {
          orderBy: { scheduledTime: 'desc' },
          take: 10,
        },
        calls: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    logger.error('Get customer details error', {
      error: error.message,
      customerId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to load customer details' });
  }
});

// ============================================
// APPOINTMENTS
// ============================================

/**
 * Get Appointments
 */
router.get('/appointments', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.user.id };
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
            select: { name: true, phone: true, email: true },
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
    logger.error('Get appointments error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

/**
 * Create Appointment Manually
 */
router.post('/appointments', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      scheduledTime,
      durationMinutes = 60,
      serviceType,
      notes,
    } = req.body;

    if (!customerName || !customerPhone || !scheduledTime) {
      return res.status(400).json({
        error: 'Customer name, phone, and scheduled time are required',
      });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        businessId: req.user.id,
        phone: customerPhone,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: req.user.id,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
      });
    }

    // Create appointment in Google Calendar
    const calendarResult = await calendarService.bookAppointment(req.user.id, {
      customerName,
      customerEmail,
      customerPhone,
      scheduledTime,
      durationMinutes,
      serviceType,
      notes,
    });

    // Create appointment in database
    const appointment = await prisma.appointment.create({
      data: {
        businessId: req.user.id,
        customerId: customer.id,
        scheduledTime: new Date(scheduledTime),
        durationMinutes,
        serviceType: serviceType || 'Appointment',
        status: 'SCHEDULED',
        customerName,
        customerPhone,
        notes: notes || '',
        createdBy: 'owner',
        calendarEventId: calendarResult.calendarEventId,
      },
    });

    // Send confirmation SMS
    await twilioService.sendAppointmentConfirmation(customerPhone, {
      date: new Date(scheduledTime).toLocaleDateString(),
      time: new Date(scheduledTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      service: serviceType || 'Appointment',
      businessName: req.user.name,
    });

    logger.info('Appointment created manually', {
      businessId: req.user.id,
      appointmentId: appointment.id,
    });

    res.status(201).json({
      success: true,
      appointment,
    });
  } catch (error) {
    logger.error('Create appointment error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/**
 * Update Appointment
 */
router.put('/appointments/:id', async (req, res) => {
  try {
    const { status, scheduledTime, notes } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.id,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (scheduledTime) updateData.scheduledTime = new Date(scheduledTime);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: updateData,
    });

    logger.info('Appointment updated', {
      businessId: req.user.id,
      appointmentId: req.params.id,
    });

    res.json({
      success: true,
      appointment: updated,
    });
  } catch (error) {
    logger.error('Update appointment error', {
      error: error.message,
      appointmentId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

/**
 * Cancel Appointment
 */
router.delete('/appointments/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.id,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Cancel in Google Calendar if exists
    if (appointment.calendarEventId) {
      await calendarService.cancelAppointment(
        req.user.id,
        appointment.calendarEventId
      );
    }

    // Update status to cancelled
    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    logger.info('Appointment cancelled', {
      businessId: req.user.id,
      appointmentId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel appointment error', {
      error: error.message,
      appointmentId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// ============================================
// MESSAGES
// ============================================

/**
 * Get Messages
 */
router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, urgent } = req.query;
    const skip = (page - 1) * limit;

    const where = { businessId: req.user.id };
    if (status) where.status = status;
    if (urgent !== undefined) where.urgent = urgent === 'true';

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          call: {
            select: { callSid: true, startedAt: true },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get messages error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

/**
 * Update Message Status
 */
router.put('/messages/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['NEW', 'READ', 'ACTED_ON', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { status },
    });

    logger.info('Message status updated', {
      businessId: req.user.id,
      messageId: req.params.id,
      status,
    });

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    logger.error('Update message error', {
      error: error.message,
      messageId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// ============================================
// ANALYTICS
// ============================================

/**
 * Get Business Analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const where = {
      businessId: req.user.id,
      startedAt: {
        gte: start,
        lte: end,
      },
    };

    // Get call statistics
    const [totalCalls, callsByOutcome, callsByDay] = await Promise.all([
      prisma.call.count({ where }),
      prisma.call.groupBy({
        by: ['outcome'],
        where,
        _count: true,
      }),
      prisma.call.groupBy({
        by: ['startedAt'],
        where,
        _count: true,
      }),
    ]);

    // Get appointment statistics
    const appointmentStats = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        businessId: req.user.id,
        scheduledTime: { gte: start, lte: end },
      },
      _count: true,
    });

    // Calculate ROI metrics
    const appointmentsBooked = callsByOutcome.find(c => c.outcome === 'APPOINTMENT_BOOKED')?._count || 0;
    const conversionRate = totalCalls > 0 ? (appointmentsBooked / totalCalls * 100).toFixed(1) : 0;

    // Get business config to calculate estimated revenue
    const config = await prisma.businessConfig.findUnique({
      where: { businessId: req.user.id },
    });

    let estimatedRevenue = 0;
    let avgServicePrice = 0;

    if (config && config.services) {
      const services = JSON.parse(JSON.stringify(config.services));
      // Calculate average price across all services
      const pricesSum = services.reduce((sum, s) => sum + ((s.priceMin + s.priceMax) / 2), 0);
      avgServicePrice = services.length > 0 ? Math.round(pricesSum / services.length) : 250;
      estimatedRevenue = appointmentsBooked * avgServicePrice;
    } else {
      // Default estimate if no services configured
      avgServicePrice = 250;
      estimatedRevenue = appointmentsBooked * 250;
    }

    // Message/emergency stats
    const messagesCount = callsByOutcome.find(c => c.outcome === 'MESSAGE_TAKEN')?._count || 0;
    const emergenciesCount = callsByOutcome.find(c => c.outcome === 'EMERGENCY_FLAGGED')?._count || 0;

    // Calculate calls by hour for peak times
    const callsByHour = {};
    const callsWithTime = await prisma.call.findMany({
      where,
      select: { startedAt: true },
    });

    callsWithTime.forEach(call => {
      const hour = new Date(call.startedAt).getHours();
      callsByHour[hour] = (callsByHour[hour] || 0) + 1;
    });

    const peakHour = Object.entries(callsByHour).sort((a, b) => b[1] - a[1])[0];

    res.json({
      success: true,
      analytics: {
        // Call stats
        totalCalls,
        callsByOutcome,
        callsByDay,
        callsByHour,
        peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',

        // Appointment stats
        appointmentsBooked,
        appointmentStats,

        // Messages & emergencies
        messagesCount,
        emergenciesCount,

        // ROI metrics
        conversionRate: `${conversionRate}%`,
        avgServicePrice,
        estimatedRevenue,
        roi: {
          appointmentsBooked,
          estimatedRevenue,
          aiCost: 1500, // Monthly cost
          receptionistCost: 3500, // Average receptionist cost
          netSavings: 2000, // 3500 - 1500
        },

        // Date range
        dateRange: { start, end },
      },
    });
  } catch (error) {
    logger.error('Get analytics error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

/**
 * Get Calendar Authorization URL
 */
router.post('/calendar/connect', async (req, res) => {
  try {
    const authUrl = calendarService.getAuthorizationUrl(req.user.id);

    logger.info('Calendar authorization URL generated', {
      businessId: req.user.id,
    });

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    logger.error('Calendar connect error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle OAuth Callback
 */
router.get('/calendar/oauth-callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    // state contains the businessId
    await calendarService.handleOAuthCallback(code, state);

    logger.info('Calendar connected successfully', {
      businessId: state,
    });

    res.json({
      success: true,
      message: 'Calendar connected successfully',
    });
  } catch (error) {
    logger.error('OAuth callback error', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
});

// ============================================
// PHONE NUMBER MANAGEMENT
// ============================================

/**
 * Search for Available Phone Numbers
 */
router.get('/phone-numbers/search', async (req, res) => {
  try {
    const { areaCode, region = 'US' } = req.query;

    if (!areaCode) {
      return res.status(400).json({ error: 'Area code is required' });
    }

    // Search for available numbers using Twilio
    const availableNumbers = await twilioService.searchAvailableNumbers(areaCode, region);

    if (!availableNumbers || availableNumbers.length === 0) {
      return res.json({
        success: true,
        numbers: [],
        message: 'No numbers available in this area code'
      });
    }

    logger.info('Phone number search completed', {
      businessId: req.user.id,
      areaCode,
      resultsCount: availableNumbers.length
    });

    res.json({
      success: true,
      numbers: availableNumbers
    });
  } catch (error) {
    logger.error('Phone number search error', {
      error: error.message,
      businessId: req.user.id
    });
    res.status(500).json({ error: error.message || 'Failed to search for phone numbers' });
  }
});

/**
 * Purchase Phone Number
 */
router.post('/phone-numbers/purchase', async (req, res) => {
  try {
    const { phoneNumber, friendlyName } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if business already has this number
    const existing = await prisma.phoneNumber.findUnique({
      where: { phoneNumber }
    });

    if (existing) {
      return res.status(400).json({ error: 'This number is already in use' });
    }

    // Purchase the number from Twilio
    const purchasedNumber = await twilioService.purchasePhoneNumber(phoneNumber);

    // Configure webhooks for this number
    await twilioService.configureNumberWebhooks(
      purchasedNumber.sid,
      req.user.id
    );

    // Add number to database
    const number = await prisma.phoneNumber.create({
      data: {
        phoneNumber: purchasedNumber.phoneNumber,
        twilioSid: purchasedNumber.sid,
        friendlyName: friendlyName || phoneNumber,
        businessId: req.user.id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        capabilities: purchasedNumber.capabilities,
        region: 'US'
      }
    });

    // Update business with this number
    await prisma.business.update({
      where: { id: req.user.id },
      data: { twilioNumber: purchasedNumber.phoneNumber }
    });

    logger.info('Phone number purchased', {
      businessId: req.user.id,
      phoneNumber: purchasedNumber.phoneNumber,
      cost: 5.00 // $5/month
    });

    res.status(201).json({
      success: true,
      number,
      message: 'Phone number purchased successfully!'
    });
  } catch (error) {
    logger.error('Phone number purchase error', {
      error: error.message,
      businessId: req.user.id
    });
    res.status(500).json({ error: error.message || 'Failed to purchase phone number' });
  }
});

// ============================================
// TESTING
// ============================================

/**
 * Test AI Receptionist
 */
router.post('/test-ai', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.id },
      include: { config: true },
    });

    const testResult = {
      configured: true,
      aiAgentName: business.config?.aiAgentName,
      greetingMessage: business.config?.greetingMessage,
      servicesCount: business.config?.services ? JSON.parse(JSON.stringify(business.config.services)).length : 0,
      faqsCount: business.config?.faqs ? JSON.parse(JSON.stringify(business.config.faqs)).length : 0,
      bookingEnabled: business.config?.bookingEnabled,
      calendarConnected: !!business.config?.googleCalendarAccessToken,
      twilioNumber: business.twilioNumber,
    };

    logger.info('AI test performed', {
      businessId: req.user.id,
    });

    res.json({
      success: true,
      testResult,
      message: 'AI configuration test completed',
    });
  } catch (error) {
    logger.error('Test AI error', {
      error: error.message,
      businessId: req.user.id,
    });
    res.status(500).json({ error: 'Test failed' });
  }
});

module.exports = router;
