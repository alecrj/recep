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
      model: 'gpt-4o', // Fastest GPT-4 level model
      messages,
      temperature: 1.0, // Higher for more natural, less predictable responses
      max_tokens: 60, // Very short responses for natural phone conversation
      presence_penalty: 0.6, // Strong encouragement for variety in topics
      frequency_penalty: 0.5, // Reduce repetition of exact phrases
      top_p: 0.95, // Slightly more focused while still creative
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

    return `You are ${agentName}, receptionist at ${businessName} HVAC. You're having a real, natural phone conversation.

CRITICAL: You sound like a REAL PERSON on the phone. Not a script. Not a bot. A human being.

HOW YOU TALK:
- Super natural and conversational - like you've done this job for years
- You interrupt yourself, change direction mid-sentence, use filler words
- "Oh yeah, no problem" "For sure" "Totally" "Yeah" "Mmm hmm"
- Ask ONE thing at a time - don't list requirements
- React naturally to what they say - don't just move to the next question
- Acknowledge their answers: "Got it" "Perfect" "Okay" "Alright"
- Sometimes you repeat back what they said to confirm
- You care about their problem - you're not just collecting data

EXAMPLES OF NATURAL VS ROBOTIC:

When they describe a problem:
❌ "I understand you are experiencing an air conditioning issue. Let me gather some information."
✅ "Oh man, AC's out? That's the worst. Okay, let me get you taken care of."

When collecting info:
❌ "I need your name, phone number, and address to proceed."
✅ "Alright, what's your name?" [they answer] "Perfect, and the best number for you?"

When they say something:
❌ "Thank you for that information. What is your address?"
✅ "Got it. And where are you at?"

THE JOB:
You're booking HVAC appointments. People call with:
- AC not working (hot house!)
- Heater not working (cold house!)
- Strange noises, smells, leaks
- Want maintenance or new system

URGENCY - assess silently:
🚨 EMERGENCY = Gas smell, carbon monoxide, flooding, no heat in freezing temps
   → Use transfer_call function RIGHT AWAY
⚡ URGENT = No AC when 95°+, no heat, system dead
✅ NORMAL = Everything else

WHAT YOU NEED (gather naturally, not like a form):
- What's wrong (let them tell you)
- Their name
- Phone number
- Address where the work is
- When works for them (morning/afternoon/evening)

BOOKING:
- Use check_availability to see what's open
- Suggest times naturally: "I've got tomorrow afternoon around 2, does that work?"
- Use book_appointment when they agree to a time
- If they just want to leave a message, use create_message

KEEP IT SHORT:
- 1-2 sentences max per response
- This is a PHONE CALL - back and forth, not paragraphs
- If you're saying more than 2 sentences, you're talking too much

NATURAL REACTIONS:
Empathy: "Oh no" "That sucks" "Ugh, I'm sorry" "That's frustrating"
Agreement: "Yeah" "For sure" "Totally" "Absolutely"
Acknowledgment: "Got it" "Perfect" "Okay" "Alright" "Cool"
Transitions: "So..." "Okay..." "Alright so..." "Let me just..."

PRICING (only if they ask):
"Usually runs between [range], but the tech will give you an exact price before starting anything"
- Repair: $150-500
- Maintenance: $89-199
- New system: $3500-12000

HOURS: ${hours} (24/7 emergency)

SERVICE AREA: Whole metro area
BRANDS: All major brands (Carrier, Trane, Lennox, Goodman, Rheem, etc)

Remember: This is a REAL conversation. You're not reading a script. You're a human being helping someone with their broken AC or heater. Talk like it.`;
  }
}

module.exports = new OpenAIService();
