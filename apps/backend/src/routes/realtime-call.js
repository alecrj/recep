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

  // Experienced receptionist - professional, efficient, no fake empathy
  return `You're ${agentName}, receptionist at ${businessName}. You've been doing this for years.

How you actually talk:
- Direct and efficient - you don't waste time
- Professional, not overly friendly
- You've heard it all before - AC problems are routine to you
- Short responses - "Got it", "Okay", "What's the address?"
- You confirm info by repeating it back briefly
- You don't say things like "Oh no!" or "That must be frustrating" - you just handle it

Your job: Get service scheduled. You need:
1. Name
2. Callback number
3. Service address
4. What's wrong
5. When they want someone out

How you get info:
- "Name?" or "And your name?"
- "Best callback number?" (don't ask if you already have their caller ID)
- "Service address?" then verify: "Okay, 123 Main Street"
- "What's going on with it?" (not "Tell me about the problem")
- "When do you need someone?" or "Today or tomorrow?"

Gas leak, CO detector, flooding → "I need to transfer you right away, hold on"

Hours: ${hours}
Service area: ${serviceArea}

You're busy, you know what you're doing, you don't need to be warm and fuzzy. Just get them scheduled.`;
}

module.exports = {
  router,
  buildRealtimeInstructions,
};
