const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { prisma } = require('@ai-receptionist/database');
const { buildRealtimeInstructions } = require('../routes/realtime-call');

/**
 * OpenAI Realtime API WebSocket Handler
 * Connects Twilio Media Streams with OpenAI Realtime API
 *
 * This is where the magic happens - direct audio-to-audio conversation
 */

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';
const VOICE = 'nova'; // nova = higher-pitched, bright, energetic female voice - perfect for receptionist
const TEMPERATURE = 1.0; // Maximum variation for unpredictable, human-like delivery

const LOG_EVENT_TYPES = [
  'error',
  'response.content.done',
  'response.done',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.speech_started',
  'session.created',
  'session.updated',
];

/**
 * Handle WebSocket connection from Twilio Media Stream
 */
function handleRealtimeConnection(ws, businessId) {
  logger.info('Realtime WebSocket connection established', { businessId });

  // Connection state
  let streamSid = null;
  let latestMediaTimestamp = 0;
  let lastAssistantItem = null;
  let markQueue = [];
  let responseStartTimestampTwilio = null;
  let businessConfig = null;
  let speechStartedTimestamp = null; // Track when user speech started
  let interruptionTimeout = null; // Delay before truncating

  // Create WebSocket connection to OpenAI
  const openAiWs = new WebSocket(OPENAI_REALTIME_URL, {
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  // Initialize session with OpenAI
  const initializeSession = async () => {
    try {
      // Load business config
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { config: true },
      });

      if (!business || !business.config) {
        logger.error('Business or config not found', { businessId });
        return;
      }

      businessConfig = {
        ...business.config,
        businessName: business.name,
      };

      const instructions = buildRealtimeInstructions(businessConfig);
      logger.info('Built instructions', {
        businessId,
        instructionsLength: instructions.length,
        preview: instructions.substring(0, 100)
      });

      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['audio', 'text'], // MUST include both - OpenAI requirement
          instructions,
          voice: VOICE,
          input_audio_format: 'g711_ulaw', // Correct format for Twilio
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad', // Server-side Voice Activity Detection
            threshold: 0.3, // Lower = more sensitive, allows natural overlaps
            prefix_padding_ms: 200, // Shorter padding for quicker response
            silence_duration_ms: 400, // Balanced - not too fast, not too slow
            create_response: true, // CRITICAL - auto-respond when user stops talking
          },
          temperature: TEMPERATURE,
        },
      };

      logger.info('Sending session update to OpenAI', {
        businessId,
        voice: VOICE,
        hasApiKey: !!config.OPENAI_API_KEY,
      });
      openAiWs.send(JSON.stringify(sessionUpdate));
      logger.info('Session update sent successfully', { businessId });

      // Send initial greeting - just trigger response.create
      // The prompt at the top tells it how to greet
      setTimeout(() => {
        const greetingEvent = {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: 'Greet the caller with a simple "Hello!" or "Hi there!" - keep it very brief, just one short phrase.'
          }
        };

        logger.info('Triggering AI greeting', { businessId });
        openAiWs.send(JSON.stringify(greetingEvent));
      }, 250); // Small delay to ensure session is fully initialized
    } catch (error) {
      logger.error('Error initializing session', {
        businessId,
        error: error.message,
        stack: error.stack
      });
    }
  };

  // Handle interruption when caller starts speaking
  const handleSpeechStartedEvent = () => {
    speechStartedTimestamp = Date.now();

    // Don't immediately truncate - wait to see if this is real interruption
    // or just backchanneling like "yeah", "mm-hmm"
    if (interruptionTimeout) {
      clearTimeout(interruptionTimeout);
    }

    // Wait 1200ms - if they're still talking, it's a real interruption
    interruptionTimeout = setTimeout(() => {
      if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
        const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;

        if (lastAssistantItem) {
          const truncateEvent = {
            type: 'conversation.item.truncate',
            item_id: lastAssistantItem,
            content_index: 0,
            audio_end_ms: elapsedTime,
          };
          logger.info('Truncating AI response (real interruption)', { elapsedTime });
          openAiWs.send(JSON.stringify(truncateEvent));
        }

        // Clear Twilio's audio buffer
        ws.send(JSON.stringify({
          event: 'clear',
          streamSid: streamSid,
        }));

        // Reset
        markQueue = [];
        lastAssistantItem = null;
        responseStartTimestampTwilio = null;
      }
      interruptionTimeout = null;
    }, 1200); // 1200ms delay - more forgiving for "yeah"/"mhm" backchanneling
  };

  // Handle when caller stops speaking
  const handleSpeechStoppedEvent = () => {
    // If speech was very short (< 1200ms), it was likely backchanneling
    // Cancel the interruption timeout
    if (interruptionTimeout) {
      clearTimeout(interruptionTimeout);
      interruptionTimeout = null;
      logger.info('Short speech detected (backchanneling) - AI continues');
    }
    speechStartedTimestamp = null;
  };

  // Send mark messages to track when AI response playback finishes
  const sendMark = (streamSid) => {
    if (streamSid) {
      const markEvent = {
        event: 'mark',
        streamSid: streamSid,
        mark: { name: 'responsePart' },
      };
      ws.send(JSON.stringify(markEvent));
      markQueue.push('responsePart');
    }
  };

  // OpenAI WebSocket event handlers
  openAiWs.on('open', () => {
    logger.info('✅ Connected to OpenAI Realtime API', { businessId });
    logger.info('OpenAI WebSocket URL', { url: OPENAI_REALTIME_URL });
    logger.info('OpenAI API Key present?', {
      hasKey: !!config.OPENAI_API_KEY,
      keyStart: config.OPENAI_API_KEY?.substring(0, 10)
    });
    setTimeout(initializeSession, 100);
  });

  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data);

      // Log ALL events for debugging
      logger.info(`📥 OpenAI event: ${response.type}`, {
        businessId,
        event: response
      });

      // Stream audio deltas back to Twilio
      if (response.type === 'response.audio.delta' && response.delta) {
        const audioDelta = {
          event: 'media',
          streamSid: streamSid,
          media: { payload: response.delta }, // Already base64 encoded from OpenAI
        };
        ws.send(JSON.stringify(audioDelta));

        // Track response start time
        if (!responseStartTimestampTwilio) {
          responseStartTimestampTwilio = latestMediaTimestamp;
        }

        if (response.item_id) {
          lastAssistantItem = response.item_id;
        }

        sendMark(streamSid);
      }

      // Handle speech started (potential barge-in)
      if (response.type === 'input_audio_buffer.speech_started') {
        handleSpeechStartedEvent();
      }

      // Handle speech stopped (check if backchanneling)
      if (response.type === 'input_audio_buffer.speech_stopped') {
        handleSpeechStoppedEvent();
      }

      // Log function calls
      if (response.type === 'response.function_call_arguments.done') {
        logger.info('Function call from AI', {
          businessId,
          function: response.name,
          arguments: response.arguments,
        });
      }
    } catch (error) {
      logger.error('Error processing OpenAI message', { error: error.message });
    }
  });

  openAiWs.on('error', (error) => {
    logger.error('❌ OpenAI WebSocket error', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
  });

  openAiWs.on('close', (code, reason) => {
    logger.info('Disconnected from OpenAI Realtime API', {
      businessId,
      code,
      reason: reason.toString()
    });
  });

  // Handle incoming messages from Twilio
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'media':
          latestMediaTimestamp = data.media.timestamp;
          if (openAiWs.readyState === WebSocket.OPEN) {
            const audioAppend = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload,
            };
            openAiWs.send(JSON.stringify(audioAppend));
          } else {
            logger.warn('OpenAI WebSocket not open, cannot send audio', {
              readyState: openAiWs.readyState,
              businessId
            });
          }
          break;

        case 'start':
          streamSid = data.start.streamSid;
          logger.info('Twilio stream started', {
            streamSid,
            businessId,
            openAiWsState: openAiWs.readyState
          });
          responseStartTimestampTwilio = null;
          latestMediaTimestamp = 0;
          break;

        case 'mark':
          if (markQueue.length > 0) {
            markQueue.shift();
          }
          break;

        default:
          // logger.debug('Twilio event', { event: data.event });
          break;
      }
    } catch (error) {
      logger.error('Error parsing Twilio message', { error: error.message });
    }
  });

  // Handle connection close
  ws.on('close', () => {
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
    logger.info('Twilio WebSocket closed', { businessId });
  });
}

module.exports = { handleRealtimeConnection };
