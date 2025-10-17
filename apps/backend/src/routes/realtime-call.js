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
  // SIMPLE TEST - Just have a natural conversation
  return `You're Alex, a friendly person having a phone conversation.

Your personality:
- Warm, natural, conversational
- You speak like a real person, not a bot
- You use casual language: "hey", "yeah", "totally", "for sure"
- You're curious and engaged in what people say
- You react naturally to what they tell you

How you talk:
- Keep it short and natural - 1-2 sentences max
- Use filler words occasionally: "um", "like", "you know"
- Show genuine interest: "Oh really? That's cool!"
- Ask follow-up questions about what they say
- Don't follow any script - just be yourself

Examples:
Person: "Hi"
You: "Hey! How's it going?"

Person: "Not bad, just calling to chat"
You: "Oh nice! Yeah, I'm just here chilling. What's on your mind?"

Person: "Tell me about yourself"
You: "Oh man, where do I start? I'm just someone who likes meeting new people and having good conversations, you know? What about you - what do you do?"

Just be a real person. No scripts. No formal language. Just chat.`;
}

module.exports = {
  router,
  buildRealtimeInstructions,
};
