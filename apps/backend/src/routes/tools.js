const express = require('express');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');
const calendarService = require('../services/calendar.service');
const twilioService = require('../services/twilio.service');

const router = express.Router();

/**
 * Tool Webhooks for ElevenLabs Agent
 *
 * These endpoints are called by the ElevenLabs agent during conversations
 * to perform actions like checking calendar availability, booking appointments, and taking messages
 */

/**
 * Check calendar availability for appointments
 */
router.post('/check-availability', async (req, res) => {
  try {
    const { date, business_id } = req.body;

    logger.info('Tool called: check_availability', { date, business_id });

    if (!date || !business_id) {
      return res.status(400).json({
        error: 'Missing required parameters: date and business_id'
      });
    }

    // Load business config
    const business = await prisma.business.findUnique({
      where: { id: business_id },
      include: { config: true }
    });

    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    // Parse the date and get start/end of day
    const requestedDate = new Date(date);
    const startDate = new Date(requestedDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(requestedDate);
    endDate.setHours(23, 59, 59, 999);

    // Check availability using calendar service
    const availableSlots = await calendarService.checkAvailability(
      business_id,
      startDate,
      endDate
    );

    // Format slots for AI response (convert to readable times)
    const formattedSlots = availableSlots.slice(0, 8).map(slot => {
      const time = new Date(slot.start);
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    });

    logger.info('Available slots returned', {
      business_id,
      date,
      count: formattedSlots.length,
      hasGoogleCalendar: !!business.config?.googleCalendarAccessToken
    });

    if (formattedSlots.length === 0) {
      return res.json({
        success: true,
        date: date,
        available_slots: [],
        message: `I'm sorry, we're fully booked on ${date}. Would you like to check another day?`
      });
    }

    return res.json({
      success: true,
      date: date,
      available_slots: formattedSlots,
      message: `We have availability on ${date} at: ${formattedSlots.join(', ')}`
    });

  } catch (error) {
    logger.error('Error in check_availability tool', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Sorry, I had trouble checking the calendar. Let me take your information and have someone call you back.'
    });
  }
});

/**
 * Book an appointment
 */
router.post('/book-appointment', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      date,
      time,
      service_type,
      business_id
    } = req.body;

    logger.info('Tool called: book_appointment', {
      customer_name,
      customer_phone,
      date,
      time,
      service_type,
      business_id,
      dateType: typeof date,
      timeType: typeof time,
      combinedString: `${date}T${time}`
    });

    // Validate required fields
    if (!customer_name || !customer_phone || !date || !time || !service_type || !business_id) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'I need your name, phone number, preferred date and time to book the appointment.'
      });
    }

    // Load business
    const business = await prisma.business.findUnique({
      where: { id: business_id },
      include: { config: true }
    });

    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    // Create or update customer record
    const customer = await prisma.customer.upsert({
      where: {
        businessId_phone: {
          businessId: business_id,
          phone: customer_phone
        }
      },
      update: {
        name: customer_name,
        lastContact: new Date()
      },
      create: {
        name: customer_name,
        phone: customer_phone,
        businessId: business_id
      }
    });

    // Parse date and time into scheduledTime datetime
    const scheduledTime = new Date(`${date}T${time}`);
    const durationMinutes = business.config?.appointmentDuration || 60;

    // Book appointment in Google Calendar (or database if not connected)
    let calendarEventId = null;
    try {
      const calendarResult = await calendarService.bookAppointment(business_id, {
        customerName: customer_name,
        customerEmail: null, // Could be collected by AI
        customerPhone: customer_phone,
        scheduledTime: scheduledTime,
        durationMinutes: durationMinutes,
        serviceType: service_type,
        notes: 'Booked via AI receptionist'
      });
      calendarEventId = calendarResult.calendarEventId;
      logger.info('Appointment added to calendar', { calendarEventId, business_id });
    } catch (calendarError) {
      logger.error('Failed to add to calendar, proceeding with DB only', {
        error: calendarError.message,
        business_id
      });
    }

    // Create appointment in database
    const appointment = await prisma.appointment.create({
      data: {
        businessId: business_id,
        customerId: customer.id,
        scheduledTime: scheduledTime,
        durationMinutes: durationMinutes,
        serviceType: service_type,
        customerName: customer_name,
        customerPhone: customer_phone,
        status: 'SCHEDULED',
        notes: 'Booked via AI receptionist',
        googleCalendarEventId: calendarEventId, // Fixed: use googleCalendarEventId
      }
    });

    logger.info('Appointment booked successfully', {
      appointmentId: appointment.id,
      customer_name,
      date,
      time,
      service_type,
      hasCalendarEvent: !!calendarEventId
    });

    // Send SMS confirmation
    try {
      await twilioService.sendAppointmentConfirmation(
        customer_phone,
        {
          businessName: business.name,
          date: new Date(scheduledTime).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }),
          time: new Date(scheduledTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          service: service_type
        },
        business.twilioNumber // Send FROM the business's Twilio number
      );
      logger.info('SMS confirmation sent', {
        customer_phone,
        appointmentId: appointment.id,
        from: business.twilioNumber
      });
    } catch (smsError) {
      logger.error('Failed to send SMS confirmation', {
        error: smsError.message,
        stack: smsError.stack,
        appointmentId: appointment.id,
        from: business.twilioNumber
      });
      // Don't fail the booking if SMS fails
    }

    return res.json({
      success: true,
      appointment_id: appointment.id,
      message: `Perfect! I've got you scheduled for ${service_type} on ${date} at ${time}. You'll receive a text confirmation shortly.`
    });

  } catch (error) {
    logger.error('Error in book_appointment tool', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'I had trouble booking that appointment. Let me take your information and someone will call you right back to confirm.'
    });
  }
});

/**
 * Take a message for the business owner
 */
router.post('/take-message', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      message,
      business_id
    } = req.body;

    logger.info('Tool called: take_message', {
      customer_name,
      customer_phone,
      message,
      business_id
    });

    // Validate required fields
    if (!customer_name || !customer_phone || !message || !business_id) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'I need your name, phone number, and a brief message.'
      });
    }

    // Load business
    const business = await prisma.business.findUnique({
      where: { id: business_id }
    });

    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    // Create or update customer record
    const customer = await prisma.customer.upsert({
      where: {
        businessId_phone: {
          businessId: business_id,
          phone: customer_phone
        }
      },
      update: {
        name: customer_name,
        lastContact: new Date()
      },
      create: {
        name: customer_name,
        phone: customer_phone,
        businessId: business_id
      }
    });

    // Create message record (using notes field in Customer for now)
    // TODO: Create proper Message model in schema
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        notes: `[${new Date().toISOString()}] ${message}`
      }
    });

    logger.info('Message recorded successfully', {
      customer_name,
      customer_phone,
      business_id
    });

    // TODO: Send SMS notification to business owner

    return res.json({
      success: true,
      message: `Got it! I've recorded your message and ${business.ownerName || 'the owner'} will call you back at ${customer_phone} shortly.`
    });

  } catch (error) {
    logger.error('Error in take_message tool', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'I had trouble recording that message, but I have your number and someone will call you back.'
    });
  }
});

/**
 * Initiate emergency transfer for a call
 * This is called by the ElevenLabs agent to transfer calls to the business's emergency number
 */
router.post('/emergency-transfer', async (req, res) => {
  try {
    const { business_id, call_sid } = req.body;

    logger.info('Tool called: emergency_transfer', { business_id, call_sid });

    if (!business_id) {
      return res.status(400).json({
        error: 'Missing required parameter: business_id'
      });
    }

    // Load business to get emergency phone number
    const business = await prisma.business.findUnique({
      where: { id: business_id },
      include: { config: true }
    });

    if (!business) {
      return res.status(404).json({
        error: 'Business not found',
        message: 'I apologize, I had trouble connecting you. Let me take your information and have someone call you back immediately.'
      });
    }

    // Get emergency phone number
    const emergencyPhone = business.config?.emergencyContactPhone || business.ownerPhone;

    if (!emergencyPhone) {
      logger.error('No emergency phone configured', { business_id });
      return res.status(400).json({
        error: 'No emergency phone configured',
        message: 'Let me take your information and have someone call you back right away.'
      });
    }

    logger.info('Emergency transfer initiated', {
      business_id,
      emergencyPhone: emergencyPhone.substring(0, 5) + '***' // Log masked number
    });

    // NOTE: Actual Twilio transfer implementation will be added
    // For now, return success with instructions
    return res.json({
      success: true,
      message: 'Transferring you to our emergency line now. Please hold.',
      emergency_phone: emergencyPhone,
      transfer_initiated: true
    });

  } catch (error) {
    logger.error('Error in emergency_transfer tool', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'I had trouble with that transfer. Let me take your information and have someone call you back immediately.'
    });
  }
});

module.exports = { router };
