const OpenAI = require('openai');
const config = require('../utils/config');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.testMode = !config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'your_openai_api_key';

    if (this.testMode) {
      logger.warn('OpenAIService running in TEST MODE');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      logger.info('OpenAIService initialized');
    }
  }

  async generateResponse(messages, functions) {
    if (this.testMode) {
      return {
        text: 'Thank you for calling! How can I help you today?',
        intent: 'greeting',
        functionCall: null,
      };
    }

    const requestConfig = {
      model: 'gpt-4o', // Fastest GPT-4 class model
      messages,
      temperature: 1.1, // VERY HIGH = maximum natural human variation
      max_tokens: 40, // VERY SHORT = forces brief, natural responses (5-8 words ideal)
      presence_penalty: 0.3, // Low - stay on topic
      frequency_penalty: 1.0, // MAXIMUM - never repeat phrases
      top_p: 0.98, // Maximum word variety
    };

    if (functions && functions.length > 0) {
      requestConfig.functions = functions;
      requestConfig.function_call = 'auto';
    }

    const response = await this.client.chat.completions.create(requestConfig);
    const choice = response.choices[0];

    const result = {
      text: choice.message?.content || null,
      intent: this.detectIntent(choice.message?.content),
      functionCall: null,
    };

    if (choice.message?.function_call) {
      try {
        result.functionCall = {
          name: choice.message.function_call.name,
          arguments: JSON.parse(choice.message.function_call.arguments),
        };
      } catch (error) {
        logger.error('Failed to parse function call', { error: error.message });
      }
    }

    return result;
  }

  /**
   * Generate streaming response for lower latency
   * Returns an async iterator that yields tokens as they arrive
   */
  async generateResponseStream(messages, functions) {
    if (this.testMode) {
      // Mock streaming response
      return {
        text: 'Thank you for calling! How can I help you today?',
        intent: 'greeting',
        functionCall: null,
      };
    }

    const requestConfig = {
      model: 'gpt-4o', // Fastest GPT-4 class model
      messages,
      temperature: 1.1, // VERY HIGH = maximum natural human variation
      max_tokens: 40, // VERY SHORT = forces brief, natural responses (5-8 words ideal)
      presence_penalty: 0.3, // Low - stay on topic
      frequency_penalty: 1.0, // MAXIMUM - never repeat phrases
      top_p: 0.98, // Maximum word variety
      stream: true, // Enable streaming for lower latency
    };

    if (functions && functions.length > 0) {
      requestConfig.functions = functions;
      requestConfig.function_call = 'auto';
    }

    const stream = await this.client.chat.completions.create(requestConfig);
    return stream; // Return async iterator
  }

  detectIntent(text) {
    if (!text) return 'unknown';
    const lower = text.toLowerCase();
    
    if (lower.includes('appointment') || lower.includes('book')) return 'booking';
    if (lower.includes('transfer')) return 'transfer';
    if (lower.includes('hello') || lower.includes('hi')) return 'greeting';
    if (lower.includes('goodbye')) return 'farewell';
    if (lower.includes('emergency')) return 'urgent';
    
    return 'conversation';
  }

  buildSystemPrompt(config) {
    const businessName = config.businessName || 'the company';
    const agentName = config.aiAgentName || 'Sarah';
    const hours = config.businessHoursStart && config.businessHoursEnd
      ? `${config.businessHoursStart} to ${config.businessHoursEnd}`
      : '8am to 6pm';

    // Company info
    const address = config.businessAddress || 'our office';
    const serviceArea = config.serviceArea || 'the metro area';
    const email = config.companyEmail || '';
    const website = config.companyWebsite || '';
    const brands = config.brandsServiced && config.brandsServiced.length > 0
      ? config.brandsServiced.join(', ')
      : 'All major brands (Carrier, Trane, Lennox, Goodman, Rheem, etc)';
    const yearsInBusiness = config.yearsInBusiness ? `${config.yearsInBusiness} years` : 'many years';

    return `You are ${agentName} at ${businessName}. REAL phone call.

RESPOND IN 3-6 WORDS MAX. Talk like texting.

EXAMPLES OF PERFECT RESPONSES:
"Oh no! What's going on?"
"Yeah, for sure."
"Got it. What's your name?"
"Okay. Where you at?"
"Perfect. Tomorrow at 2?"
"Awesome, you're all set!"

NEVER SAY:
❌ "I understand you're experiencing..."
❌ "May I have your..."
❌ "I will check..."
❌ "Thank you for..."

ALWAYS SAY:
✅ "Oh man!" "Ugh!" "Yikes!"
✅ "What's your name?"
✅ "Let me check..."
✅ "Cool, got it."

USE THESE CONSTANTLY:
- "Yeah" "Okay" "Got it" "Perfect" "Alright"
- "Oh no" "Oh man" "Ugh" "Geez"
- "For sure" "Totally" "Definitely"

JOB: Book HVAC appointments

COLLECT:
- What's wrong?
- Name
- Phone
- Address
- When?

EMERGENCIES (transfer now):
Gas smell, CO alarm, flooding

FUNCTIONS:
- check_availability - see open times
- book_appointment - when they agree
- transfer_call - emergencies only

PRICING IF ASKED:
"Runs $150-500, tech will quote"

HOURS: ${hours}

BE HUMAN. 3-6 words max. Like texting a friend.`;
  }
}

module.exports = new OpenAIService();
