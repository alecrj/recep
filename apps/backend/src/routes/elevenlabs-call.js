const express = require('express');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');

const router = express.Router();

/**
 * ElevenLabs Conversational AI Call Handler
 *
 * THE BEST architecture for human-like voice:
 * Twilio → ElevenLabs Conversational AI → Natural human voice
 */

/**
 * Incoming call webhook - Returns TwiML to connect to ElevenLabs WebSocket
 */
router.post('/elevenlabs/incoming', async (req, res) => {
  try {
    const { To, From, CallSid } = req.body;

    logger.info('ElevenLabs incoming call', { from: From, to: To, callSid: CallSid });

    // Find which business this number belongs to
    const business = await prisma.business.findFirst({
      where: { twilioNumber: To },
      include: { config: true },
    });

    if (!business) {
      logger.error('No business found for number', { number: To });
      return res.status(404).send('Business not found');
    }

    // Create call record (or update if duplicate CallSid from Twilio retry)
    await prisma.call.upsert({
      where: { callSid: CallSid },
      update: {
        startedAt: new Date(),
      },
      create: {
        businessId: business.id,
        fromNumber: From,
        toNumber: To,
        callSid: CallSid,
        startedAt: new Date(),
      },
    });

    // Return TwiML with WebSocket connection to ElevenLabs handler
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="${wsProtocol}://${host}/elevenlabs-stream/${business.id}" />
        </Connect>
      </Response>`;

    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('Error handling ElevenLabs incoming call', { error: error.message });
    res.status(500).send('Internal server error');
  }
});

module.exports = { router };
