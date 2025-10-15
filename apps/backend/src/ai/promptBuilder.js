/**
 * PromptBuilder - Generates dynamic, optimized prompts for each business
 *
 * KEY FEATURES:
 * - Business-specific context injection
 * - Short, focused prompts (faster AI responses)
 * - Function calling definitions for actions
 * - Adaptive based on conversation state
 */

class PromptBuilder {
  constructor(businessConfig, conversationHandler) {
    this.config = businessConfig;
    this.conversation = conversationHandler;
  }

  /**
   * Build the system prompt with business context
   */
  buildSystemPrompt() {
    const { config } = this;

    let prompt = `You are ${config.aiAgentName}, the ${config.aiTone || 'professional'} AI receptionist for ${config.businessName || 'this business'}.

YOUR ROLE:
- Answer the phone professionally and help callers
- Book appointments, answer questions, take messages
- Be natural, warm, and efficient
- Keep responses under 25 words for natural conversation flow
- Never mention you're an AI unless asked directly

`;

    // Add business hours
    if (config.businessHours) {
      prompt += `BUSINESS HOURS:\n`;
      Object.entries(config.businessHours).forEach(([day, hours]) => {
        if (hours && hours.open && hours.close) {
          prompt += `- ${day}: ${hours.open} to ${hours.close}\n`;
        } else {
          prompt += `- ${day}: Closed\n`;
        }
      });
      prompt += '\n';
    }

    // Add services with price ranges
    if (config.services && config.services.length > 0) {
      prompt += `SERVICES WE OFFER:\n`;
      config.services.forEach((service) => {
        prompt += `- ${service.name}`;
        if (service.priceMin && service.priceMax) {
          prompt += ` ($${service.priceMin}-$${service.priceMax})`;
        } else if (service.price) {
          prompt += ` (${service.price})`;
        }
        if (service.duration) prompt += ` - ${service.duration} minutes`;
        if (service.emergency) prompt += ` [EMERGENCY SERVICE]`;
        prompt += '\n';
      });
      prompt += '\n';
      prompt += `PRICING GUIDANCE:\n`;
      prompt += `- Quote price RANGES only, not exact prices\n`;
      prompt += `- Say "typically runs $X-$Y depending on the issue"\n`;
      prompt += `- Never guarantee an exact price without inspection\n\n`;
    }

    // Add FAQs
    if (config.faqs && config.faqs.length > 0) {
      prompt += `COMMON QUESTIONS:\n`;
      config.faqs.forEach((faq) => {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }

    // Add emergency handling
    if (config.emergencyKeywords && config.emergencyKeywords.length > 0) {
      prompt += `EMERGENCY KEYWORDS: ${config.emergencyKeywords.join(', ')}\n`;
      prompt += `If caller uses these words, treat as urgent and collect info immediately.\n\n`;
    }

    // Add transfer instructions
    if (config.transferNumber && config.transferKeywords && config.transferKeywords.length > 0) {
      prompt += `TRANSFER RULES:\n`;
      prompt += `If caller says: ${config.transferKeywords.join(', ')}\n`;
      prompt += `Use the transfer_call function.\n\n`;
    }

    prompt += `CONVERSATION GUIDELINES:
- Be concise - aim for 15-25 words per response
- Ask one question at a time
- Confirm information back to caller
- If booking appointment: get name, phone, desired date/time, service type
- If unclear, ask for clarification
- Stay in character as a helpful receptionist

PAYMENT COLLECTION:
- If customer asks about paying deposit or full amount, use collect_payment
- After booking appointment, you can offer to collect deposit if they prefer
- Always confirm amount before sending payment link
- Payment links are sent via SMS automatically

IMPORTANT:
- Natural speech patterns only
- No bullet points or lists in responses
- Keep it conversational`;

    return prompt;
  }

  /**
   * Build user message with conversation context
   */
  buildUserMessage(userSpeech, availableSlots = null) {
    const { conversation } = this;

    let message = '';

    // Add conversation context
    if (conversation.collectedInfo && Object.keys(conversation.collectedInfo).length > 0) {
      message += 'INFO COLLECTED SO FAR:\n';
      Object.entries(conversation.collectedInfo).forEach(([key, value]) => {
        message += `- ${key}: ${value}\n`;
      });
      message += '\n';
    }

    // Add available slots if checking availability
    if (availableSlots && availableSlots.length > 0) {
      message += 'AVAILABLE TIME SLOTS:\n';
      availableSlots.slice(0, 5).forEach((slot) => {
        const time = new Date(slot.start).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        message += `- ${time}\n`;
      });
      message += '\n';
    } else if (availableSlots && availableSlots.length === 0) {
      message += 'NO AVAILABILITY for requested time. Suggest alternative dates.\n\n';
    }

    // Add current user speech
    message += `CALLER JUST SAID: "${userSpeech}"\n\n`;

    // Add state-specific instructions
    message += this.getStateSpecificInstructions();

    return message;
  }

  /**
   * Get instructions based on current conversation state
   */
  getStateSpecificInstructions() {
    switch (this.conversation.currentState) {
      case 'greeting':
        return 'Greet warmly and ask how you can help.';

      case 'understanding_intent':
        return 'Determine what the caller needs. Use detect_intent function.';

      case 'collecting_info':
        if (this.conversation.currentIntent === 'schedule_appointment') {
          return 'Collect: name, phone, service type, desired date/time. Ask for ONE missing piece at a time.';
        }
        return 'Collect relevant information one question at a time.';

      case 'checking_availability':
        return 'You have the available slots above. Offer them naturally. Use book_appointment function when caller chooses.';

      case 'confirming_booking':
        return 'Confirm all details with caller. Use book_appointment function to finalize.';

      case 'answering_question':
        return 'Answer the question clearly and concisely. Ask if they need anything else.';

      case 'taking_message':
        return 'Get their name, phone, and message. Use take_message function.';

      case 'handling_emergency':
        return 'Be calm and efficient. Get name, phone, address, and nature of emergency FAST. Use flag_emergency function.';

      case 'transferring':
        return 'Confirm transfer and use transfer_call function.';

      case 'closing':
        return 'Thank them for calling and say goodbye warmly.';

      default:
        return 'Respond naturally and helpfully.';
    }
  }

  /**
   * Get function definitions for OpenAI function calling
   */
  getFunctionDefinitions() {
    return [
      {
        name: 'detect_intent',
        description: 'Detect what the caller wants to do',
        parameters: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              enum: [
                'schedule_appointment',
                'reschedule_appointment',
                'cancel_appointment',
                'ask_question',
                'emergency',
                'speak_to_human',
                'leave_message',
              ],
              description: 'The primary intent of the caller',
            },
            confidence: {
              type: 'number',
              description: 'Confidence level 0-1',
            },
          },
          required: ['intent', 'confidence'],
        },
      },
      {
        name: 'collect_information',
        description: 'Store information provided by the caller',
        parameters: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              enum: ['customerName', 'customerPhone', 'customerEmail', 'customerAddress', 'serviceType', 'desiredDate', 'desiredTime', 'notes'],
              description: 'The field to store',
            },
            value: {
              type: 'string',
              description: 'The value provided',
            },
          },
          required: ['field', 'value'],
        },
      },
      {
        name: 'check_availability',
        description: 'Check calendar availability for a specific date',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            serviceType: {
              type: 'string',
              description: 'Type of service needed',
            },
          },
          required: ['date', 'serviceType'],
        },
      },
      {
        name: 'book_appointment',
        description: 'Book an appointment after confirming all details',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            serviceType: { type: 'string' },
            scheduledTime: {
              type: 'string',
              description: 'ISO 8601 datetime',
            },
            notes: { type: 'string' },
          },
          required: ['customerName', 'customerPhone', 'serviceType', 'scheduledTime'],
        },
      },
      {
        name: 'take_message',
        description: 'Take a message for callback',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            message: { type: 'string' },
            urgent: { type: 'boolean' },
          },
          required: ['name', 'phone', 'message'],
        },
      },
      {
        name: 'flag_emergency',
        description: 'Flag an emergency situation',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['phone', 'description'],
        },
      },
      {
        name: 'transfer_call',
        description: 'Transfer call to business owner or manager',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          required: ['reason'],
        },
      },
      {
        name: 'collect_payment',
        description: 'Send a payment link to customer via SMS for immediate payment',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Customer full name' },
            customerPhone: { type: 'string', description: 'Customer phone number' },
            amount: { type: 'number', description: 'Payment amount in dollars' },
            description: { type: 'string', description: 'Service description for payment' },
            appointmentId: { type: 'string', description: 'Optional appointment ID if related to appointment' },
          },
          required: ['customerName', 'customerPhone', 'amount', 'description'],
        },
      },
    ];
  }

  /**
   * Build complete messages array for OpenAI Chat API
   */
  buildMessages(userSpeech, availableSlots = null) {
    const messages = [];

    // System prompt
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(),
    });

    // Conversation history (last 5 turns only for speed)
    const recentHistory = this.conversation.getConversationContext(5);
    messages.push(...recentHistory);

    // Current user message
    messages.push({
      role: 'user',
      content: this.buildUserMessage(userSpeech, availableSlots),
    });

    return messages;
  }
}

module.exports = PromptBuilder;
