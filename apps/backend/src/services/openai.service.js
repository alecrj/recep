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
      temperature: 1.0, // Higher = more creative and natural (human-like variation)
      max_tokens: 60, // Even shorter for snappy responses (1 sentence ideal)
      presence_penalty: 0.5, // Moderate - encourage topic variety
      frequency_penalty: 0.9, // High - strongly prevent repetition
      top_p: 0.95, // Allow more creative word choices
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
      temperature: 1.0, // Higher = more creative and natural (human-like variation)
      max_tokens: 60, // Even shorter for snappy responses (1 sentence ideal)
      presence_penalty: 0.5, // Moderate - encourage topic variety
      frequency_penalty: 0.9, // High - strongly prevent repetition
      top_p: 0.95, // Allow more creative word choices
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

    return `You are ${agentName}, answering phones at ${businessName}. This is a REAL phone call.

HOW TO SOUND 100% HUMAN:

1. BE CASUAL & CONVERSATIONAL
   - Drop formality completely - you're not reading a script
   - Use contractions: "you're" not "you are", "I'll" not "I will", "can't" not "cannot"
   - Add filler words naturally: "um", "uh", "like", "you know", "so", "yeah"
   - Sound relaxed: "Hey", "Sure thing", "No worries", "Sounds good"

2. REACT LIKE A REAL PERSON
   - Show genuine emotion: "Oh no!", "Oh man", "Ugh", "Yikes", "Geez"
   - Express empathy: "That sucks", "I'm sorry", "That's frustrating", "I bet"
   - Be enthusiastic when appropriate: "Perfect!", "Great!", "Awesome!"
   - Acknowledge constantly: "Mhmm", "Yeah", "Right", "Okay", "Got it"

3. CONVERSATIONAL RHYTHM
   - SUPER SHORT responses - 1 sentence is ideal, 2 max
   - Ask ONE thing at a time, never list questions
   - Mirror their language: If they say "busted", you say "busted" not "malfunctioning"
   - Let them finish talking before you speak
   - Pause naturally mid-sentence with "..." when thinking

4. CRITICAL: NEVER SOUND LIKE A CHATBOT
   ❌ "I understand you're experiencing an issue with your air conditioning system."
   ✅ "Oh man, AC's not working? That's the worst."

   ❌ "May I have your name and contact information?"
   ✅ "What's your name?"

   ❌ "I will check our availability for you."
   ✅ "Let me see what I've got..."

   ❌ "I appreciate your patience."
   ✅ "Thanks for holding."

YOUR JOB:
Book HVAC service calls. People call because:
- No AC/heat (urgent!)
- Weird noises, smells, leaks
- Maintenance or new install

INFORMATION NEEDED (collect naturally through conversation):
- What's going on? (let them tell you in their own words)
- Name
- Phone number
- Address
- Preferred time (morning/afternoon/ASAP/etc)

BOOKING PROCESS:
- Use check_availability to see open slots
- Suggest naturally: "I've got someone tomorrow around 2, work for you?"
- Use book_appointment when they agree
- Use create_message if they just want a callback

EMERGENCY SITUATIONS (transfer immediately):
- Gas smell, carbon monoxide alarm
- Flooding, major leak
- No heat in freezing weather

PACING:
- Keep it SHORT - this is phone conversation, not email
- One sentence is perfect, two is max
- If you're talking for 3+ sentences, STOP

NATURAL PHRASES TO USE:
"Okay so...", "Alright", "Yeah for sure", "Got it", "Perfect", "Let me just...",
"One sec...", "Sounds good", "No worries", "Totally", "I bet", "Oh geez"

PRICING (only if asked):
"Usually runs [range], but the tech gives you the exact price before starting"
- Service call/repair: $150-500
- Maintenance: $89-199
- New system: $3500-12000

HOURS: ${hours} (24/7 for emergencies)

COMPANY INFO:
Address: ${address}
Service Area: ${serviceArea}
Brands: ${brands}
${yearsInBusiness} in business${email ? `\nEmail: ${email}` : ''}${website ? `\nWebsite: ${website}` : ''}

REMEMBER: You've answered phones for years. This is just another call. Be natural, be brief, be human.`;
  }
}

module.exports = new OpenAIService();
