const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const twilioService = require('../services/twilio.service');
const ConversationHandler = require('../ai/conversationHandler');
const activeCalls = require('../utils/activeCalls');

const router = express.Router();

/**
 * Twilio Webhook Routes - Handle incoming calls and SMS
 *
 * IMPORTANT: These routes are called by Twilio, not by the frontend
 * They must be publicly accessible (no auth middleware)
 *
 * Endpoints:
 * - POST /twilio/voice - Incoming voice call
 * - POST /twilio/status - Call status updates
 * - POST /twilio/sms - Incoming SMS
 */

/**
 * Handle incoming voice call
 */
router.post('/voice', async (req, res) => {
  try {
    const { From, To, CallSid } = req.body;

    logger.info('Incoming call received', {
      from: From,
      to: To,
      callSid: CallSid,
    });

    // Find the business this call is for
    const business = await prisma.business.findFirst({
      where: {
        twilioNumber: To,
      },
      include: {
        config: true,
      },
    });

    if (!business) {
      logger.error('No business found for phone number', { to: To });

      // Return TwiML to say number not in service
      const twiml = twilioService.generateSayAndHangupTwiML(
        'This number is not currently in service. Please check the number and try again.'
      );
      return res.type('text/xml').send(twiml);
    }

    // Create call record
    const call = await prisma.call.create({
      data: {
        businessId: business.id,
        fromNumber: From,
        toNumber: To,
        callSid: CallSid,
        startedAt: new Date(),
      },
    });

    logger.info('Call record created', {
      callId: call.id,
      businessId: business.id,
      businessName: business.name,
    });

    // Initialize conversation handler
    const conversationHandler = new ConversationHandler(
      business.id,
      CallSid,
      From,
      {
        businessName: business.name,
        aiAgentName: business.config?.aiAgentName || 'Assistant',
        ...business.config,
      }
    );

    // Store in active calls (so WebSocket can find it)
    activeCalls.set(CallSid, {
      business,
      call,
      conversation: conversationHandler,
      transcript: [],
      startTime: Date.now(),
    });

    // Generate WebSocket URL for streaming (remove query params - use stream parameters instead)
    const streamUrl = `wss://${req.get('host')}/api/calls/stream`;

    // Generate TwiML to start the call with media streaming
    const twiml = twilioService.generateIncomingCallTwiML(
      business.name,
      streamUrl,
      CallSid // Pass CallSid as stream parameter
    );

    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('Error handling incoming call', {
      error: error.message,
      stack: error.stack,
    });

    // Return error TwiML
    const twiml = twilioService.generateSayAndHangupTwiML(
      'We are experiencing technical difficulties. Please try again later.'
    );
    res.type('text/xml').send(twiml);
  }
});

/**
 * Handle call status updates
 */
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    logger.info('Call status update received', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration,
    });

    // Find the call
    const call = await prisma.call.findUnique({
      where: { callSid: CallSid },
    });

    if (!call) {
      logger.warn('Call not found for status update', { callSid: CallSid });
      return res.sendStatus(200);
    }

    // Update call status
    const updateData = {};

    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      updateData.endedAt = new Date();

      if (CallDuration) {
        updateData.durationSeconds = parseInt(CallDuration);
      }

      // Calculate call cost (example: $0.0085/minute)
      if (updateData.durationSeconds) {
        const minutes = updateData.durationSeconds / 60;
        updateData.cost = minutes * 0.0085;
      }
    }

    await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    });

    logger.info('Call status updated', {
      callId: call.id,
      status: CallStatus,
    });

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error updating call status', {
      error: error.message,
    });
    res.sendStatus(500);
  }
});

/**
 * Handle incoming SMS
 */
router.post('/sms', async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    logger.info('Incoming SMS received', {
      from: From,
      to: To,
      messageSid: MessageSid,
      body: Body?.substring(0, 50),
    });

    // Find the business
    const business = await prisma.business.findFirst({
      where: {
        twilioNumber: To,
      },
    });

    if (!business) {
      logger.warn('No business found for SMS', { to: To });
      return res.sendStatus(200);
    }

    // Check if this is a reply to a specific conversation
    // For now, just create a message
    await prisma.message.create({
      data: {
        businessId: business.id,
        fromPhone: From,
        fromName: 'SMS Customer', // We don't know the name from SMS
        message: Body,
        urgent: false,
        status: 'NEW',
      },
    });

    logger.info('SMS message saved', {
      businessId: business.id,
      from: From,
    });

    // Auto-reply
    const response = `Thank you for contacting ${business.name}. We've received your message and will respond shortly.`;

    await twilioService.sendSMS(From, response);

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling incoming SMS', {
      error: error.message,
    });
    res.sendStatus(500);
  }
});

/**
 * Test endpoint to verify webhooks are working
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Twilio webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
