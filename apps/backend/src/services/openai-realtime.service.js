const { RealtimeClient } = require('@openai/realtime-api-beta');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * OpenAI Realtime API Service
 * Voice-to-voice conversation - NO text conversion
 * This preserves emotion, tone, prosody, and conversational flow
 */
class OpenAIRealtimeService {
  constructor() {
    this.testMode = !config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'your_openai_api_key';

    if (this.testMode) {
      logger.warn('OpenAI Realtime running in TEST MODE');
    } else {
      logger.info('OpenAI Realtime Service initialized');
    }
  }

  /**
   * Create a new Realtime client for a call session
   */
  createClient() {
    if (this.testMode) {
      return null;
    }

    const client = new RealtimeClient({
      apiKey: config.OPENAI_API_KEY,
      dangerouslyAllowAPIKeyInBrowser: false,
    });

    return client;
  }

  /**
   * Configure session for natural receptionist conversation
   */
  async configureSession(client, businessConfig) {
    const businessName = businessConfig.businessName || 'the company';
    const agentName = businessConfig.aiAgentName || 'Sarah';
    const hours = businessConfig.businessHoursStart && businessConfig.businessHoursEnd
      ? `${businessConfig.businessHoursStart} to ${businessConfig.businessHoursEnd}`
      : '8am to 6pm';
    const serviceArea = businessConfig.serviceArea || 'the metro area';

    // Session configuration
    await client.updateSession({
      modalities: ['audio', 'text'], // Support both audio and text
      instructions: this.buildRealtimeInstructions(businessConfig),
      voice: 'alloy', // Options: alloy, echo, shimmer
      input_audio_format: 'pcm16', // For Twilio compatibility
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1',
      },
      turn_detection: {
        type: 'server_vad', // Server-side Voice Activity Detection
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      temperature: 0.8, // Natural variation
      max_response_output_tokens: 'inf', // No artificial limit
    });

    logger.info('Realtime session configured', {
      business: businessName,
      voice: 'alloy',
    });
  }

  /**
   * Build instructions for Realtime API
   * MUCH simpler than text GPT - the model handles conversational flow naturally
   */
  buildRealtimeInstructions(config) {
    const businessName = config.businessName || 'the company';
    const agentName = config.aiAgentName || 'Sarah';
    const hours = config.businessHoursStart && config.businessHoursEnd
      ? `${config.businessHoursStart} to ${config.businessHoursEnd}`
      : '8am to 6pm';
    const serviceArea = config.serviceArea || 'the metro area';

    return `You are ${agentName}, receptionist at ${businessName}, an HVAC company.

Your personality: Warm, friendly, helpful. You're a real person having a real conversation.

Your job: Help customers schedule HVAC service appointments.

What you need to find out (conversationally, not like a checklist):
- Customer name
- Phone number for callback
- Service address
- What's wrong with their HVAC system
- When they want service

Be natural:
- React to what they say with genuine empathy
- Ask clarifying questions if something's unclear
- Confirm important details (address, phone) before booking
- If they interrupt you, stop and listen
- Sound like a real person, not a script

Emergencies (transfer immediately if mentioned):
- Gas leak or gas smell
- Carbon monoxide detector going off
- Flooding or burst pipes
- No heat in freezing winter

Business info:
- Hours: ${hours}
- Service area: ${serviceArea}

Just be yourself and help them. Have a real conversation.`;
  }

  /**
   * Add function tools for booking appointments
   */
  getRealtimeFunctions() {
    return [
      {
        name: 'check_availability',
        description: 'Check if a time slot is available for service appointment',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            timeRange: {
              type: 'string',
              description: 'Time range: morning, afternoon, or evening',
              enum: ['morning', 'afternoon', 'evening'],
            },
          },
          required: ['date'],
        },
      },
      {
        name: 'book_appointment',
        description: 'Book a service appointment after customer confirms all details',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            customerAddress: { type: 'string' },
            serviceType: { type: 'string' },
            preferredDate: { type: 'string' },
            preferredTime: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['customerName', 'customerPhone', 'customerAddress', 'serviceType', 'preferredDate'],
        },
      },
      {
        name: 'transfer_call',
        description: 'Transfer call to owner for emergencies or special requests',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
            isEmergency: { type: 'boolean' },
          },
          required: ['reason'],
        },
      },
    ];
  }
}

module.exports = new OpenAIRealtimeService();
