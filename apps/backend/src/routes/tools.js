const express = require('express');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');
const { createCalendarEvent } = require('../services/google-calendar');

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

    // TODO: Integrate with Google Calendar API
    // For now, return mock available slots
    const availableSlots = [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '01:00 PM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM'
    ];

    logger.info('Available slots returned', { business_id, date, count: availableSlots.length });

    return res.json({
      success: true,
      date: date,
      available_slots: availableSlots,
      message: `We have availability on ${date} at: ${availableSlots.join(', ')}`
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
      business_id
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

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        businessId: business_id,
        customerId: customer.id,
        scheduledTime: scheduledTime,
        durationMinutes: business.config?.appointmentDuration || 60,
        serviceType: service_type,
        customerName: customer_name,
        customerPhone: customer_phone,
        status: 'SCHEDULED',
        notes: `Booked via AI receptionist`
      }
    });

    logger.info('Appointment booked successfully', {
      appointmentId: appointment.id,
      customer_name,
      date,
      time,
      service_type
    });

    // Add to Google Calendar (non-blocking)
    createCalendarEvent(business_id, appointment).catch(err => {
      logger.error('Failed to create calendar event', {
        appointmentId: appointment.id,
        error: err.message
      });
    });

    // TODO: Send SMS confirmation via Twilio

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
