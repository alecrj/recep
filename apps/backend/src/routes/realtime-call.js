const express = require('express');
const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { prisma } = require('@ai-receptionist/database');

const router = express.Router();

/**
 * OpenAI Realtime API Call Handler
 * Voice-to-voice conversation - preserves emotion, tone, natural flow
 *
 * This is a COMPLETE replacement for the old Deepgram → GPT → ElevenLabs pipeline
 */

/**
 * Incoming call webhook - Returns TwiML to connect to WebSocket
 */
router.post('/realtime/incoming', async (req, res) => {
  try {
    const { To, From, CallSid } = req.body;

    logger.info('Realtime incoming call', { from: From, to: To, callSid: CallSid });

    // Find which business this number belongs to
    const business = await prisma.business.findFirst({
      where: { twilioNumber: To },
      include: { config: true },
    });

    if (!business) {
      logger.error('No business found for number', { number: To });
      return res.status(404).send('Business not found');
    }

    // Create call record
    await prisma.call.create({
      data: {
        businessId: business.id,
        fromNumber: From,
        toNumber: To,
        callSid: CallSid,
        startedAt: new Date(),
      },
    });

    // Return TwiML with WebSocket connection
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="${wsProtocol}://${host}/media-stream/${business.id}" />
        </Connect>
      </Response>`;

    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('Error handling realtime incoming call', { error: error.message });
    res.status(500).send('Internal server error');
  }
});

/**
 * Build system instructions for OpenAI Realtime based on business config
 */
function buildRealtimeInstructions(businessConfig) {
  const businessName = businessConfig.businessName || 'the company';
  const agentName = businessConfig.aiAgentName || 'Sarah';
  const hours = businessConfig.businessHoursStart && businessConfig.businessHoursEnd
    ? `${businessConfig.businessHoursStart} to ${businessConfig.businessHoursEnd}`
    : '8am to 6pm';
  const serviceArea = businessConfig.serviceArea || 'the metro area';

  // MUCH simpler instructions - Realtime API handles natural conversation automatically
  return `You are ${agentName}, receptionist at ${businessName}. You're having a real phone conversation.

Your personality:
- Warm and friendly
- Empathetic when people have problems
- Patient and helpful
- Professional but conversational

Your job: Help customers schedule HVAC service appointments.

Be natural in conversation:
- Listen and react to what they say
- Ask clarifying questions if you're not sure
- Confirm important details before booking
- If they sound frustrated, acknowledge it

What you need to know:
- Customer name
- Phone number for callback
- Service address
- What's wrong
- When they want service

EMERGENCIES - Transfer immediately if mentioned:
- Gas leak or smell
- Carbon monoxide detector going off
- Flooding or burst pipes

Business info:
- Hours: ${hours}
- Service area: ${serviceArea}

Just be yourself and have a real conversation to help them.`;
}

module.exports = {
  router,
  buildRealtimeInstructions,
};
