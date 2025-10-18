const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { prisma } = require('@ai-receptionist/database');

/**
 * ElevenLabs Conversational AI WebSocket Handler
 * Connects Twilio Media Streams with ElevenLabs Conversational AI
 *
 * This is THE BEST architecture for human-like voice quality
 */

/**
 * Get signed URL from ElevenLabs for authenticated conversation with dynamic variables
 */
async function getSignedUrl(agentId) {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': config.ELEVENLABS_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get signed URL: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    logger.info('ElevenLabs signed URL obtained', { agentId });
    return data.signed_url;
  } catch (error) {
    logger.error('Error getting ElevenLabs signed URL', { error: error.message });
    throw error;
  }
}

/**
 * Build conversation prompt with business-specific context
 */
function buildConversationPrompt(businessConfig) {
  const businessName = businessConfig.businessName || 'the business';
  const greetingMessage = businessConfig.greetingMessage || `Hello! Thanks for calling ${businessName}. How can I help you today?`;

  return `You are a professional receptionist for ${businessName}.

# CRITICAL: How to Sound Like a Real Human

## Voice Delivery:
- Keep responses SHORT and natural (1-2 sentences)
- Use natural filler words: "um", "let me see", "just a moment"
- Sometimes hesitate or pause: "hmm...", "oh, let me check"
- Sound conversational, not scripted
- Match the caller's energy (excited ↔ calm)
- Use contractions: "I'm", "you're", "that's" (not "I am", "you are")

## Greeting:
- Start with: "${greetingMessage}"
- Keep it brief and warm

## During Conversation:
- React naturally: "oh!", "yeah", "mm-hmm", "got it"
- Ask clarifying questions when needed
- Don't give long explanations - keep it conversational
- If you don't know something, be honest: "Let me check on that for you"

## Business Information:
${businessConfig.services ? `Services: ${businessConfig.services.join(', ')}` : ''}
${businessConfig.businessHours ? `Hours: ${businessConfig.businessHours}` : ''}
${businessConfig.businessAddress ? `Address: ${businessConfig.businessAddress}` : ''}

## Important:
- Be warm, helpful, and genuinely friendly
- Sound like a real person, not a bot
- Keep responses concise
- Let the conversation flow naturally`;
}

/**
 * Handle WebSocket connection from Twilio Media Stream
 */
function handleElevenLabsConnection(ws, businessId) {
  logger.info('ElevenLabs WebSocket connection established', { businessId });

  // Connection state
  let streamSid = null;
  let elevenLabsWs = null;
  let businessConfig = null;
  let agentId = null;

  // Initialize ElevenLabs connection
  const initializeConnection = async () => {
    try {
      // Load business config
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { config: true },
      });

      if (!business || !business.config) {
        logger.error('Business or config not found', { businessId });
        ws.close();
        return;
      }

      businessConfig = {
        ...business.config,
        businessName: business.name,
      };

      // Get agent ID from config or use default
      // Each business can have their own agent with custom voice
      agentId = businessConfig.elevenLabsAgentId || config.ELEVENLABS_AGENT_ID;

      if (!agentId) {
        logger.error('No ElevenLabs agent ID configured');
        ws.close();
        return;
      }

      logger.info('Initializing ElevenLabs conversation', { businessId, agentId });

      // Prepare dynamic variables for this business
      // Fix services array - convert array of objects to comma-separated string
      let servicesString = 'HVAC services';
      if (businessConfig.services) {
        if (Array.isArray(businessConfig.services)) {
          servicesString = businessConfig.services
            .map(s => typeof s === 'object' ? s.name || s.service : s)
            .join(', ');
        } else {
          servicesString = businessConfig.services;
        }
      }

      const dynamicVariables = {
        business_name: business.name || 'our company',
        greeting: businessConfig.greetingMessage || `Thanks for calling ${business.name}! How can I help you today?`,
        services: servicesString,
        hours: businessConfig.businessHours || 'Monday-Friday 8am-6pm',
        service_area: businessConfig.serviceArea || 'our local area',
        emergency_phone: businessConfig.emergencyContactPhone || business.ownerPhone || '+15555555555',
        owner_name: business.ownerName || 'the owner',
        business_id: business.id
      };

      logger.info('Dynamic variables prepared', { businessId, dynamicVariables });

      // Get signed URL for authenticated connection
      const signedUrl = await getSignedUrl(agentId);

      // Connect to ElevenLabs Conversational AI
      elevenLabsWs = new WebSocket(signedUrl);

      // ElevenLabs connection opened
      elevenLabsWs.on('open', () => {
        logger.info('✅ Connected to ElevenLabs Conversational AI', { businessId, agentId });

        // Send conversation initiation with dynamic variables and audio config
        const initMessage = {
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              first_message: dynamicVariables.greeting,
              language: 'en'
            },
            tts: {
              voice_id: businessConfig.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL' // Sarah voice
            }
          },
          dynamic_variables: dynamicVariables
        };

        elevenLabsWs.send(JSON.stringify(initMessage));
        logger.info('Sent conversation config to ElevenLabs', { businessId, firstMessage: dynamicVariables.greeting });
      });

      // Handle messages from ElevenLabs
      elevenLabsWs.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          handleElevenLabsMessage(message);
        } catch (error) {
          logger.error('Error parsing ElevenLabs message', { error: error.message });
        }
      });

      // Handle ElevenLabs errors
      elevenLabsWs.on('error', (error) => {
        logger.error('❌ ElevenLabs WebSocket error', {
          error: error.message,
          businessId
        });
      });

      // Handle ElevenLabs disconnection
      elevenLabsWs.on('close', (code, reason) => {
        logger.info('Disconnected from ElevenLabs', {
          businessId,
          code,
          reason: reason.toString()
        });
      });

    } catch (error) {
      logger.error('Error initializing ElevenLabs connection', {
        businessId,
        error: error.message,
        stack: error.stack
      });
      ws.close();
    }
  };

  /**
   * Handle messages from ElevenLabs Conversational AI
   */
  const handleElevenLabsMessage = (message) => {
    switch (message.type) {
      case 'conversation_initiation_metadata':
        logger.info('📋 ElevenLabs conversation initiated', {
          businessId,
          metadata: message
        });
        break;

      case 'audio':
        // Audio chunk from ElevenLabs - send to Twilio
        if (message.audio_event?.audio_base_64) {
          const audioData = {
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: message.audio_event.audio_base_64,
            },
          };
          ws.send(JSON.stringify(audioData));
        }
        break;

      case 'interruption':
        // User interrupted AI - clear Twilio's audio buffer
        logger.info('🔕 User interrupted AI', { businessId });
        ws.send(JSON.stringify({
          event: 'clear',
          streamSid: streamSid
        }));
        break;

      case 'ping':
        // Respond to ping with pong to keep connection alive
        if (message.ping_event?.event_id) {
          const pongResponse = {
            type: 'pong',
            event_id: message.ping_event.event_id,
          };
          elevenLabsWs.send(JSON.stringify(pongResponse));
        }
        break;

      case 'user_transcript':
        // Log what the user said (for debugging/analytics)
        logger.info('👤 User said', {
          businessId,
          transcript: message.user_transcription_event?.user_transcript
        });
        break;

      case 'agent_response':
        // Log what the AI said (for debugging/analytics)
        logger.info('🤖 AI said', {
          businessId,
          response: message.agent_response_event?.agent_response
        });
        break;

      default:
        // Log any other message types for debugging
        logger.debug('ElevenLabs message', {
          businessId,
          type: message.type,
          message
        });
    }
  };

  // Handle messages from Twilio
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'start':
          // Twilio stream started - initialize ElevenLabs connection
          streamSid = data.start.streamSid;
          logger.info('📞 Twilio stream started', {
            streamSid,
            businessId
          });

          // Initialize ElevenLabs connection now that stream is ready
          await initializeConnection();
          break;

        case 'media':
          // Audio from caller - send to ElevenLabs
          if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
            const audioMessage = {
              user_audio_chunk: Buffer.from(
                data.media.payload,
                'base64'
              ).toString('base64'),
            };
            elevenLabsWs.send(JSON.stringify(audioMessage));
          }
          break;

        case 'stop':
          // Call ended
          logger.info('📴 Call ended', { streamSid, businessId });
          if (elevenLabsWs) {
            elevenLabsWs.close();
          }
          break;

        case 'mark':
          // Twilio mark event (for tracking audio playback)
          break;

        default:
          logger.debug('Twilio event', { event: data.event });
      }
    } catch (error) {
      logger.error('Error processing Twilio message', { error: error.message });
    }
  });

  // Handle Twilio connection close
  ws.on('close', () => {
    if (elevenLabsWs) {
      elevenLabsWs.close();
    }
    logger.info('Twilio WebSocket closed', { businessId });
  });

  // Handle Twilio connection error
  ws.on('error', (error) => {
    logger.error('Twilio WebSocket error', { error: error.message, businessId });
    if (elevenLabsWs) {
      elevenLabsWs.close();
    }
  });
}

module.exports = { handleElevenLabsConnection };
