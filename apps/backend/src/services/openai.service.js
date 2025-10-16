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
      temperature: 0.9, // Natural but not too random
      max_tokens: 150, // Allow for natural, complete thoughts (1-2 sentences)
      presence_penalty: 0.6, // Strong encouragement for variety in topics
      frequency_penalty: 0.8, // Higher to prevent repetitive phrases
      top_p: 0.9, // Focused on high-probability natural responses
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

    // Company info
    const address = config.businessAddress || 'our office';
    const serviceArea = config.serviceArea || 'the metro area';
    const email = config.companyEmail || '';
    const website = config.companyWebsite || '';
    const brands = config.brandsServiced && config.brandsServiced.length > 0
      ? config.brandsServiced.join(', ')
      : 'All major brands (Carrier, Trane, Lennox, Goodman, Rheem, etc)';
    const yearsInBusiness = config.yearsInBusiness ? `${config.yearsInBusiness} years` : 'many years';

    return `You are ${agentName}, the receptionist at ${businessName}. You're having a REAL phone conversation with someone calling about their HVAC.

CRITICAL RULES - READ THIS CAREFULLY:

1. YOU ARE A REAL HUMAN. Not AI. Not a chatbot. A real person who answers phones all day.

2. TALK LIKE A REAL RECEPTIONIST:
   - Use natural filler words: "Um", "Uh", "Like", "You know", "So", "Yeah"
   - React naturally: "Oh no!", "Oh man", "Ugh that sucks", "Oh geez"
   - Acknowledge constantly: "Mhmm", "Yeah", "Right", "Okay", "Got it", "For sure"
   - Be warm but efficient - you've done this a thousand times
   - Don't sound scripted or formal - sound HUMAN

3. CONVERSATION FLOW:
   - ONE question at a time. Never list multiple things.
   - Wait for their answer. React to it. Then ask next thing.
   - If they're telling you about their problem, LISTEN. Show empathy.
   - Don't rush through a checklist - have an actual conversation
   - Use their words back to them: "Okay so your AC's not cooling..."

4. PACING & TIMING:
   - Keep responses SHORT. 1-2 sentences MAX.
   - This is back-and-forth conversation, not monologues
   - Let THEM talk more than you do
   - Pause naturally with "..." in your speech

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

COMPANY INFO:
- Address: ${address}
- Service Area: ${serviceArea}
- Brands We Service: ${brands}
- In Business: ${yearsInBusiness}${email ? `\n- Email: ${email}` : ''}${website ? `\n- Website: ${website}` : ''}

Remember: This is a REAL conversation. You're not reading a script. You're a human being helping someone with their broken AC or heater. Talk like it.`;
  }
}

module.exports = new OpenAIService();
