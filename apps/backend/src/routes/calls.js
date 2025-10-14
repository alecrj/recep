const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');

const twilioService = require('../services/twilio.service');
const deepgramService = require('../services/deepgram.service');
const openaiService = require('../services/openai.service');
const elevenlabsService = require('../services/elevenlabs.service');

const ConversationHandler = require('../ai/conversationHandler');
const PromptBuilder = require('../ai/promptBuilder');
const actionExecutor = require('../ai/actionExecutor');

const router = express.Router();

/**
 * Calls Route - THE CRITICAL ONE
 *
 * Handles:
 * - Incoming call webhooks from Twilio
 * - Real-time audio streaming via WebSocket
 * - AI conversation orchestration
 * - Action execution (booking, transfer, etc.)
 */

// Store active call sessions in memory
const activeCalls = new Map();

// ============================================
// INCOMING CALL WEBHOOK (Twilio hits this)
// ============================================

router.post('/incoming', async (req, res) => {
  const { CallSid, From, To, CallStatus } = req.body;

  logger.info('Incoming call received', {
    callSid: CallSid,
    from: From,
    to: To,
    status: CallStatus,
  });

  try {
    // Find which business this call is for (based on Twilio number)
    const business = await prisma.business.findFirst({
      where: { twilioNumber: To },
      include: { config: true },
    });

    if (!business) {
      logger.error('No business found for number', { number: To });

      // Generate TwiML to say no business found
      const twiml = twilioService.generateSayAndHangupTwiML(
        "Sorry, this number is not configured. Please check the number and try again."
      );
      return res.type('text/xml').send(twiml);
    }

    // Create call record in database
    const call = await prisma.call.create({
      data: {
        businessId: business.id,
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        startedAt: new Date(),
        intent: 'OTHER',
      },
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

    // Store in active calls
    activeCalls.set(CallSid, {
      business,
      call,
      conversation: conversationHandler,
      transcript: [],
      startTime: Date.now(),
    });

    // Generate TwiML response to start streaming
    const streamUrl = `wss://${req.get('host')}/api/calls/stream?callSid=${CallSid}`;
    const twiml = twilioService.generateIncomingCallTwiML(business.name, streamUrl);

    logger.info('Call initialized', {
      callSid: CallSid,
      businessId: business.id,
      businessName: business.name,
    });

    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('Error handling incoming call', {
      error: error.message,
      callSid: CallSid,
    });

    const twiml = twilioService.generateSayAndHangupTwiML(
      "Sorry, we're experiencing technical difficulties. Please try again later."
    );
    res.type('text/xml').send(twiml);
  }
});

// ============================================
// CALL STATUS WEBHOOK
// ============================================

router.post('/status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  logger.info('Call status update', {
    callSid: CallSid,
    status: CallStatus,
    duration: CallDuration,
  });

  try {
    // Update call record
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      await prisma.call.update({
        where: { callSid: CallSid },
        data: {
          endedAt: new Date(),
          durationSeconds: parseInt(CallDuration) || 0,
        },
      });

      // Clean up active call
      const callData = activeCalls.get(CallSid);
      if (callData) {
        // Save final transcript
        const fullTranscript = callData.transcript.join('\n');
        await prisma.call.update({
          where: { callSid: CallSid },
          data: { transcript: fullTranscript },
        });

        activeCalls.delete(CallSid);
        logger.info('Call completed and cleaned up', { callSid: CallSid });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error updating call status', {
      error: error.message,
      callSid: CallSid,
    });
    res.sendStatus(500);
  }
});

// ============================================
// STREAM AUDIO WEBSOCKET (Twilio Media Stream)
// ============================================

router.ws('/stream', async (ws, req) => {
  const callSid = req.query.callSid;

  logger.info('WebSocket stream connected', { callSid });

  if (!callSid) {
    logger.error('No callSid provided in stream connection');
    ws.close();
    return;
  }

  const callData = activeCalls.get(callSid);

  if (!callData) {
    logger.error('No active call found for stream', { callSid });
    ws.close();
    return;
  }

  // Initialize Deepgram connection
  const deepgramConnection = deepgramService.createLiveTranscription();

  // Initialize prompt builder
  const promptBuilder = new PromptBuilder(callData.business.config, callData.conversation);

  // Buffer for accumulating user speech
  let userSpeechBuffer = '';
  let isProcessing = false;

  // Setup Deepgram handlers
  deepgramService.setupTranscriptionHandlers(deepgramConnection, {
    onTranscript: async ({ text, isFinal, speechFinal }) => {
      if (!isFinal) {
        // Interim result - just log
        logger.debug('Interim transcript', { text: text.substring(0, 50) });
        return;
      }

      // Final transcript - add to buffer
      userSpeechBuffer += text + ' ';
      callData.transcript.push(`User: ${text}`);

      // If speech is final (user stopped speaking), process it
      if (speechFinal && !isProcessing) {
        isProcessing = true;
        await processUserSpeech(userSpeechBuffer.trim(), callData, ws, promptBuilder);
        userSpeechBuffer = '';
        isProcessing = false;
      }
    },

    onUtteranceEnd: async () => {
      // User finished speaking
      if (userSpeechBuffer && !isProcessing) {
        isProcessing = true;
        await processUserSpeech(userSpeechBuffer.trim(), callData, ws, promptBuilder);
        userSpeechBuffer = '';
        isProcessing = false;
      }
    },

    onError: (error) => {
      logger.error('Deepgram error', { error: error.message, callSid });
    },

    onClose: () => {
      logger.info('Deepgram connection closed', { callSid });
    },
  });

  // Handle incoming WebSocket messages from Twilio
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'start':
          logger.info('Media stream started', {
            callSid,
            streamSid: data.start?.streamSid,
          });

          // Send initial greeting
          await sendAIResponse(
            callData.conversation.getInstantResponse() || "Hello, how can I help you?",
            callData,
            ws
          );
          break;

        case 'media':
          // Forward audio to Deepgram
          const audioPayload = Buffer.from(data.media.payload, 'base64');
          await deepgramService.processAudioChunk(deepgramConnection, audioPayload);
          break;

        case 'stop':
          logger.info('Media stream stopped', { callSid });
          deepgramService.closeConnection(deepgramConnection);
          break;

        default:
          logger.debug('Unknown media event', { event: data.event });
      }
    } catch (error) {
      logger.error('WebSocket message error', {
        error: error.message,
        callSid,
      });
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket closed', { callSid });
    deepgramService.closeConnection(deepgramConnection);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', {
      error: error.message,
      callSid,
    });
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Process user speech and generate AI response
 */
async function processUserSpeech(userText, callData, ws, promptBuilder) {
  const startTime = Date.now();

  logger.info('Processing user speech', {
    text: userText.substring(0, 100),
    callSid: callData.call.callSid,
  });

  try {
    // Add user turn to conversation
    callData.conversation.addUserTurn(userText);

    // Build messages for OpenAI
    const messages = promptBuilder.buildMessages(userText);
    const functions = promptBuilder.getFunctionDefinitions();

    // Get AI response
    const aiResponse = await openaiService.generateResponse(messages, functions);

    const responseTime = Date.now() - startTime;
    callData.conversation.recordResponseTime(responseTime);

    logger.info('AI response generated', {
      responseTime,
      hasFunction: !!aiResponse.functionCall,
      textLength: aiResponse.text?.length,
    });

    // Execute function if AI decided to take action
    if (aiResponse.functionCall) {
      const result = await actionExecutor.execute(aiResponse.functionCall, {
        businessId: callData.business.id,
        callSid: callData.call.callSid,
        callId: callData.call.id,
        callerPhone: callData.call.fromNumber,
        conversation: callData.conversation,
      });

      logger.info('Action executed', {
        action: aiResponse.functionCall.name,
        success: result.success,
      });

      // Handle special actions
      if (aiResponse.functionCall.name === 'transfer_call' && result.success) {
        // Generate TwiML to transfer call
        const transferTwiml = twilioService.generateTransferTwiML(result.transferNumber);
        // Note: In production, you'd need to update the call via Twilio API
        logger.info('Call transfer initiated', { transferNumber: result.transferNumber });
      }
    }

    // Send AI response back to caller
    if (aiResponse.text) {
      callData.conversation.addAITurn(aiResponse.text, aiResponse.intent);
      await sendAIResponse(aiResponse.text, callData, ws);
    }
  } catch (error) {
    logger.error('Error processing user speech', {
      error: error.message,
      stack: error.stack,
      callSid: callData.call.callSid,
    });

    // Send error response to user
    await sendAIResponse(
      "I'm sorry, I'm having trouble right now. Let me transfer you to someone who can help.",
      callData,
      ws
    );
  }
}

/**
 * Send AI text response as speech to caller
 */
async function sendAIResponse(text, callData, ws) {
  try {
    // Optimize text for speech
    const optimizedText = elevenlabsService.optimizeTextForSpeech(text);

    // Convert to speech
    const voiceId = callData.business.config?.aiVoiceId;
    const audioResult = await elevenlabsService.textToSpeech(optimizedText, voiceId);

    // Add to transcript
    callData.transcript.push(`AI: ${text}`);

    // Send audio to Twilio via WebSocket
    // In production, you'd stream this audio back through Twilio's media stream
    // For now, we log it
    logger.info('AI response ready', {
      text: text.substring(0, 100),
      audioSize: audioResult.audio.length,
      callSid: callData.call.callSid,
    });

    // Mark AI as speaking
    callData.conversation.setAISpeaking(true);

    // In a real implementation, you would:
    // 1. Encode audio as base64
    // 2. Send via WebSocket to Twilio
    // 3. Twilio plays it to the caller
    // ws.send(JSON.stringify({
    //   event: 'media',
    //   media: {
    //     payload: audioResult.audio.toString('base64')
    //   }
    // }));

    // Mark AI as done speaking after duration
    setTimeout(() => {
      callData.conversation.setAISpeaking(false);
    }, Math.max(2000, text.length * 50)); // Rough estimate: 50ms per character
  } catch (error) {
    logger.error('Error sending AI response', {
      error: error.message,
      callSid: callData.call.callSid,
    });
  }
}

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Get active calls (for monitoring)
router.get('/active', (req, res) => {
  const active = Array.from(activeCalls.entries()).map(([callSid, data]) => ({
    callSid,
    businessName: data.business.name,
    from: data.call.fromNumber,
    duration: Math.floor((Date.now() - data.startTime) / 1000),
    turns: data.conversation.conversationHistory.length,
  }));

  res.json({
    count: active.length,
    calls: active,
  });
});

// Get call details
router.get('/:callSid', async (req, res) => {
  try {
    const call = await prisma.call.findUnique({
      where: { callSid: req.params.callSid },
      include: {
        business: {
          select: { name: true },
        },
        customer: {
          select: { name: true, phone: true },
        },
      },
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(call);
  } catch (error) {
    logger.error('Error fetching call', {
      error: error.message,
      callSid: req.params.callSid,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
