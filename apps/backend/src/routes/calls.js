const express = require('express');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');

const twilioService = require('../services/twilio.service');
const deepgramService = require('../services/deepgram.service');
const openaiService = require('../services/openai.service');
const elevenlabsService = require('../services/elevenlabs.service');
const audioService = require('../services/audio.service');

const ConversationHandler = require('../ai/conversationHandler');
const PromptBuilder = require('../ai/promptBuilder');
const actionExecutor = require('../ai/actionExecutor');
const activeCalls = require('../utils/activeCalls');

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

    // Generate TwiML response to start streaming (no query params needed)
    const streamUrl = `wss://${req.get('host')}/api/calls/stream`;
    const twiml = twilioService.generateIncomingCallTwiML(business.name, streamUrl, CallSid);

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
  let callSid = null;
  let callData = null;
  let promptBuilder = null;
  let deepgramConnection = null;
  let streamSid = null;
  let userSpeechBuffer = '';
  let isProcessing = false;

  // BARGE-IN: Track if AI is speaking and if caller interrupts
  let aiSpeakingSignal = { interrupted: false };
  let isAISpeaking = false;

  logger.info('WebSocket stream connected');

  // Handle incoming WebSocket messages from Twilio
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'start':
          // Extract callSid from custom parameters
          callSid = data.start?.customParameters?.callSid;
          streamSid = data.start?.streamSid;

          logger.info('Media stream started', {
            callSid,
            streamSid,
          });

          if (!callSid) {
            logger.error('No callSid in stream start event');
            ws.close();
            return;
          }

          // Get call data from active calls
          callData = activeCalls.get(callSid);

          if (!callData) {
            logger.error('No active call found for stream', { callSid });
            ws.close();
            return;
          }

          // Initialize Deepgram connection
          deepgramConnection = deepgramService.createLiveTranscription();

          // Initialize prompt builder
          promptBuilder = new PromptBuilder(callData.business.config, callData.conversation);

          // Setup Deepgram handlers
          deepgramService.setupTranscriptionHandlers(deepgramConnection, {
            onTranscript: async ({ text, isFinal, speechFinal }) => {
              // BARGE-IN: Detect caller speaking while AI is talking
              if (!isFinal && isAISpeaking && text.trim().length > 0) {
                logger.info('BARGE-IN DETECTED: Caller speaking while AI is talking', {
                  interimText: text.substring(0, 30),
                  callSid
                });
                // Signal to stop AI audio immediately
                aiSpeakingSignal.interrupted = true;
                isAISpeaking = false;
                return;
              }

              if (!isFinal) {
                logger.debug('Interim transcript', { text: text.substring(0, 50) });
                return;
              }

              userSpeechBuffer += text + ' ';
              callData.transcript.push(`User: ${text}`);

              if (speechFinal && !isProcessing) {
                isProcessing = true;
                await processUserSpeech(userSpeechBuffer.trim(), callData, ws, promptBuilder, streamSid, aiSpeakingSignal);
                userSpeechBuffer = '';
                isProcessing = false;
                // Reset interrupt signal for next AI response
                aiSpeakingSignal = { interrupted: false };
              }
            },

            onUtteranceEnd: async () => {
              if (userSpeechBuffer && !isProcessing) {
                isProcessing = true;
                await processUserSpeech(userSpeechBuffer.trim(), callData, ws, promptBuilder, streamSid, aiSpeakingSignal);
                userSpeechBuffer = '';
                isProcessing = false;
                // Reset interrupt signal for next AI response
                aiSpeakingSignal = { interrupted: false };
              }
            },

            onError: (error) => {
              logger.error('Deepgram error', { error: error.message, callSid });
            },

            onClose: () => {
              logger.info('Deepgram connection closed', { callSid });
            },
          });

          // Send initial greeting
          try {
            const greeting = callData.conversation.getInstantResponse() || "Hello, how can I help you?";
            logger.info('Sending initial greeting', {
              greeting: greeting.substring(0, 50),
              hasStreamSid: !!streamSid,
              callSid
            });
            isAISpeaking = true;
            await sendAIResponse(greeting, callData, ws, streamSid, aiSpeakingSignal);
            isAISpeaking = false;
            logger.info('Initial greeting sent successfully', { callSid });
          } catch (greetingError) {
            logger.error('CRITICAL: Failed to send initial greeting', {
              error: greetingError.message,
              stack: greetingError.stack,
              callSid,
              streamSid
            });
            isAISpeaking = false;
          }
          break;

        case 'media':
          if (deepgramConnection) {
            const audioPayload = Buffer.from(data.media.payload, 'base64');
            await deepgramService.processAudioChunk(deepgramConnection, audioPayload);
          }
          break;

        case 'stop':
          logger.info('Media stream stopped', { callSid });
          if (deepgramConnection) {
            deepgramService.closeConnection(deepgramConnection);
          }
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
 * Process user speech and generate AI response with STREAMING
 * This dramatically reduces latency by starting TTS as soon as we have a complete sentence
 */
async function processUserSpeech(userText, callData, ws, promptBuilder, streamSid) {
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

    // STREAMING RESPONSE - Start TTS as soon as we have complete sentences
    const stream = await openaiService.generateResponseStream(messages, functions);

    let fullText = '';
    let sentenceBuffer = '';
    let functionCall = null;
    let hasStartedSpeaking = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle function calls
      if (delta?.function_call) {
        if (!functionCall) {
          functionCall = { name: delta.function_call.name, arguments: '' };
        }
        if (delta.function_call.arguments) {
          functionCall.arguments += delta.function_call.arguments;
        }
        continue;
      }

      // Handle text content
      const token = delta?.content || '';
      if (!token) continue;

      fullText += token;
      sentenceBuffer += token;

      // Check if we have a complete sentence (ends with . ! ? or has 2+ sentences worth of tokens)
      const sentenceEnders = /[.!?]\s*$/;
      const hasEnoughTokens = sentenceBuffer.length > 50; // ~10-15 words

      if (sentenceEnders.test(sentenceBuffer) || (hasEnoughTokens && token.includes(' '))) {
        // Send this sentence immediately for TTS
        const textToSpeak = sentenceBuffer.trim();
        if (textToSpeak.length > 5) { // Don't send tiny fragments
          logger.info('Streaming sentence to TTS', {
            text: textToSpeak.substring(0, 50),
            hasStartedSpeaking,
            callSid: callData.call.callSid
          });

          if (!hasStartedSpeaking) {
            const firstTokenTime = Date.now() - startTime;
            logger.info('Time to first audio', { latency: firstTokenTime, callSid: callData.call.callSid });
            hasStartedSpeaking = true;
          }

          await sendAIResponse(textToSpeak, callData, ws, streamSid);
          sentenceBuffer = ''; // Reset buffer
        }
      }
    }

    // Send any remaining text
    if (sentenceBuffer.trim().length > 0) {
      await sendAIResponse(sentenceBuffer.trim(), callData, ws, streamSid);
    }

    const responseTime = Date.now() - startTime;
    callData.conversation.recordResponseTime(responseTime);

    logger.info('AI streaming response complete', {
      responseTime,
      hasFunction: !!functionCall,
      textLength: fullText.length,
      callSid: callData.call.callSid,
    });

    // Parse function call if present
    let aiResponse = {
      text: fullText.trim(),
      intent: openaiService.detectIntent(fullText),
      functionCall: null,
    };

    if (functionCall) {
      try {
        aiResponse.functionCall = {
          name: functionCall.name,
          arguments: JSON.parse(functionCall.arguments),
        };
      } catch (error) {
        logger.error('Failed to parse function call', { error: error.message });
      }
    }

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

      // If there's no text response but a function was called, generate one
      if (!aiResponse.text && result.message) {
        // Use the function result message as the response
        aiResponse.text = result.message;
        logger.info('Using function result message as response', { message: result.message });
      } else if (!aiResponse.text) {
        // If still no text, make another call to OpenAI with the function result
        logger.info('No text response after function call, calling OpenAI again with result');

        // Add function result to conversation
        const functionResultMessage = {
          role: 'function',
          name: aiResponse.functionCall.name,
          content: JSON.stringify(result),
        };

        const followUpMessages = [...messages, {
          role: 'assistant',
          content: null,
          function_call: {
            name: aiResponse.functionCall.name,
            arguments: JSON.stringify(aiResponse.functionCall.arguments),
          },
        }, functionResultMessage];

        // Get follow-up response from OpenAI
        const followUpResponse = await openaiService.generateResponse(followUpMessages, []);

        if (followUpResponse.text) {
          aiResponse.text = followUpResponse.text;
          logger.info('Got follow-up response from OpenAI', { text: followUpResponse.text });
        }
      }
    }

    // Add AI turn to conversation history (already sent via streaming above)
    if (aiResponse.text) {
      callData.conversation.addAITurn(aiResponse.text, aiResponse.intent);
      // NOTE: We already sent the audio via streaming above, don't send again!
    } else {
      // Last resort fallback (only if streaming didn't produce any text)
      logger.warn('No response text available after all attempts');
      const fallbackText = "Let me check on that for you. One moment...";
      callData.conversation.addAITurn(fallbackText, aiResponse.intent);
      await sendAIResponse(fallbackText, callData, ws, streamSid);
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
      ws,
      streamSid
    );
  }
}

/**
 * Send AI text response as speech to caller
 * Uses STREAMING for dramatically reduced latency (~200ms to first audio)
 */
async function sendAIResponse(text, callData, ws, streamSid) {
  try {
    // Check if we have streamSid (needed to send audio back)
    if (!streamSid) {
      logger.warn('No streamSid available - cannot send audio', {
        callSid: callData.call.callSid,
      });
      return;
    }

    const startTime = Date.now();

    // Optimize text for speech
    const optimizedText = elevenlabsService.optimizeTextForSpeech(text);

    // Add to transcript
    callData.transcript.push(`AI: ${text}`);

    // Mark AI as speaking
    callData.conversation.setAISpeaking(true);

    // Get voice ID from config
    const voiceId = callData.business.config?.aiVoiceId;

    logger.info('Starting streaming TTS', {
      text: text.substring(0, 100),
      optimizedText: optimizedText.substring(0, 100),
      voiceId,
      callSid: callData.call.callSid,
    });

    // STREAMING PIPELINE with GPT streaming (sub-500ms latency):
    // Using MP3 format (proven to work)
    logger.info('Starting ElevenLabs streaming TTS', { callSid: callData.call.callSid });
    const mp3Stream = await elevenlabsService.textToSpeechStream(optimizedText, voiceId);
    logger.info('Got MP3 stream from ElevenLabs', { callSid: callData.call.callSid });

    // Convert MP3 → μ-law in real-time
    logger.info('Converting MP3 to μ-law', { callSid: callData.call.callSid });
    const mulawStream = audioService.convertMP3StreamToMulaw(mp3Stream);
    logger.info('Got μ-law stream', { callSid: callData.call.callSid });

    // Stream to Twilio
    logger.info('Streaming audio to Twilio', { callSid: callData.call.callSid });
    await audioService.sendStreamingAudioToTwilio(ws, mulawStream, streamSid);
    logger.info('Streaming complete', { callSid: callData.call.callSid });

    const totalTime = Date.now() - startTime;

    logger.info('Streaming AI response complete', {
      text: text.substring(0, 100),
      totalTime,
      callSid: callData.call.callSid,
    });

    // Mark AI as done speaking
    callData.conversation.setAISpeaking(false);
  } catch (error) {
    logger.error('Error sending AI response', {
      error: error.message,
      stack: error.stack,
      callSid: callData.call.callSid,
    });

    // Mark AI as done speaking even on error
    callData.conversation.setAISpeaking(false);

    // Re-throw to propagate error
    throw error;
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
