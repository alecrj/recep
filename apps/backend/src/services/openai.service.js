const OpenAI = require('openai');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * OpenAIService - AI conversation and intelligence
 *
 * Features:
 * - GPT-4 conversation with streaming
 * - Function calling for actions
 * - Context management
 * - Test mode with mock responses
 */

class OpenAIService {
  constructor() {
    this.testMode = !config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'your_openai_api_key';

    if (this.testMode) {
      logger.warn('OpenAIService running in TEST MODE - using mock AI responses');
      this.client = null;
    } else {
      this.client = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });
      logger.info('OpenAIService initialized with real OpenAI API');
    }

    // Mock conversation state for testing
    this.mockConversationCount = 0;
  }

  /**
   * Generate AI response with function calling
   */
  async generateResponse(messages, functions, options = {}) {
    if (this.testMode) {
      return this.generateMockResponse(messages, functions);
    }

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4o-mini', // Fast and cheap for development
        messages,
        functions,
        function_call: 'auto',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 150, // Keep responses short
        stream: false,
      });

      const responseTime = Date.now() - startTime;

      const message = response.choices[0].message;
      const functionCall = message.function_call;

      logger.info('OpenAI response generated', {
        responseTime,
        hasFunction: !!functionCall,
        functionName: functionCall?.name,
      });

      return {
        text: message.content,
        functionCall: functionCall ? {
          name: functionCall.name,
          arguments: JSON.parse(functionCall.arguments),
        } : null,
        usage: response.usage,
        responseTime,
      };
    } catch (error) {
      logger.error('OpenAI API error', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate mock AI response for testing
   */
  generateMockResponse(messages, functions) {
    this.mockConversationCount++;

    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // Simulate intelligent responses based on keywords
    if (lastMessage.includes('appointment') || lastMessage.includes('schedule') || lastMessage.includes('book')) {
      return {
        text: "I'd be happy to help you schedule an appointment. What service do you need, and what date works best for you?",
        functionCall: {
          name: 'detect_intent',
          arguments: {
            intent: 'schedule_appointment',
            confidence: 0.95,
          },
        },
        usage: { total_tokens: 50 },
        responseTime: 250,
        testMode: true,
      };
    }

    if (lastMessage.includes('hours') || lastMessage.includes('open')) {
      return {
        text: "We're open Monday through Friday, 8 AM to 5 PM, and Saturday 9 AM to 2 PM. We're closed on Sundays.",
        functionCall: null,
        usage: { total_tokens: 40 },
        responseTime: 200,
        testMode: true,
      };
    }

    if (lastMessage.includes('cost') || lastMessage.includes('price') || lastMessage.includes('much')) {
      return {
        text: "Our standard service call is $150, which includes diagnosis and up to one hour of work. Would you like to schedule an appointment?",
        functionCall: null,
        usage: { total_tokens: 45 },
        responseTime: 220,
        testMode: true,
      };
    }

    if (lastMessage.includes('emergency') || lastMessage.includes('urgent')) {
      return {
        text: "I understand this is urgent. Let me get your information quickly so we can help you right away. What's your name and address?",
        functionCall: {
          name: 'flag_emergency',
          arguments: {
            description: 'Urgent service needed',
          },
        },
        usage: { total_tokens: 50 },
        responseTime: 230,
        testMode: true,
      };
    }

    // Default greeting or general response
    if (this.mockConversationCount === 1) {
      return {
        text: "Thank you for calling! How can I help you today?",
        functionCall: null,
        usage: { total_tokens: 30 },
        responseTime: 180,
        testMode: true,
      };
    }

    return {
      text: "I understand. Let me help you with that. Could you provide more details?",
      functionCall: null,
      usage: { total_tokens: 35 },
      responseTime: 190,
      testMode: true,
    };
  }

  /**
   * Generate streaming response (for real-time conversation)
   */
  async generateStreamingResponse(messages, functions, onChunk, options = {}) {
    if (this.testMode) {
      return this.generateMockStreamingResponse(messages, onChunk);
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        messages,
        functions,
        function_call: 'auto',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 150,
        stream: true,
      });

      let fullText = '';
      let functionCall = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullText += delta.content;
          onChunk({
            type: 'text',
            content: delta.content,
          });
        }

        if (delta?.function_call) {
          if (!functionCall) {
            functionCall = {
              name: delta.function_call.name || '',
              arguments: '',
            };
          }
          if (delta.function_call.arguments) {
            functionCall.arguments += delta.function_call.arguments;
          }
        }
      }

      if (functionCall && functionCall.arguments) {
        functionCall.arguments = JSON.parse(functionCall.arguments);
        onChunk({
          type: 'function',
          function: functionCall,
        });
      }

      logger.info('Streaming response completed', {
        textLength: fullText.length,
        hasFunction: !!functionCall,
      });

      return {
        text: fullText,
        functionCall,
      };
    } catch (error) {
      logger.error('Streaming error', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate mock streaming response
   */
  async generateMockStreamingResponse(messages, onChunk) {
    const response = this.generateMockResponse(messages, []);
    const words = response.text.split(' ');

    // Simulate streaming word by word
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      onChunk({
        type: 'text',
        content: word + ' ',
      });
    }

    if (response.functionCall) {
      onChunk({
        type: 'function',
        function: response.functionCall,
      });
    }

    return response;
  }

  /**
   * Extract entities from text (names, dates, phone numbers)
   */
  async extractEntities(text) {
    if (this.testMode) {
      // Simple regex-based extraction for test mode
      const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
      const emailRegex = /\S+@\S+\.\S+/;

      const phone = text.match(phoneRegex)?.[0];
      const email = text.match(emailRegex)?.[0];

      return {
        phone: phone || null,
        email: email || null,
        testMode: true,
      };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract structured information from user input. Return JSON with: name, phone, email, date, time, address.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 100,
      });

      const extracted = JSON.parse(response.choices[0].message.content);

      logger.info('Entities extracted', { extracted });
      return extracted;
    } catch (error) {
      logger.error('Entity extraction failed', {
        error: error.message,
      });
      return {};
    }
  }

  /**
   * Classify urgency of a message
   */
  async classifyUrgency(text) {
    const urgentKeywords = [
      'emergency',
      'urgent',
      'asap',
      'immediately',
      'flooding',
      'fire',
      'smoke',
      'gas leak',
      'no heat',
      'no ac',
      'broken',
    ];

    const lowerText = text.toLowerCase();
    const hasUrgentKeyword = urgentKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    return {
      isUrgent: hasUrgentKeyword,
      confidence: hasUrgentKeyword ? 0.9 : 0.5,
    };
  }
}

// Export singleton instance
module.exports = new OpenAIService();
