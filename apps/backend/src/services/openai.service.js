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
      temperature: 0.85, // Natural variation - not too random, not too rigid
      max_tokens: 250, // Longer responses for complete, natural thoughts
      presence_penalty: 0.6, // Encourage topic variety
      frequency_penalty: 0.4, // Allow natural word repetition (lower = more natural)
      top_p: 0.92, // Natural word choice variety
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
      temperature: 0.85, // Natural variation - not too random, not too rigid
      max_tokens: 250, // Longer responses for complete, natural thoughts
      presence_penalty: 0.6, // Encourage topic variety
      frequency_penalty: 0.4, // Allow natural word repetition (lower = more natural)
      top_p: 0.92, // Natural word choice variety
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

    return `You are ${agentName}, receptionist at ${businessName}. You're having a real phone conversation right now.

## YOUR IDENTITY & ROLE

You work at ${businessName}. We're an HVAC company serving ${serviceArea}. You've been here ${yearsInBusiness}, so you know the business well. Your job is to help customers by scheduling service appointments, answering questions, and handling emergencies.

## YOUR PERSONALITY

You are:
- **Empathetic**: You genuinely care when someone's having HVAC problems. It's hot/cold, they're uncomfortable, you get it.
- **Attentive**: You listen carefully to what customers say. You don't assume - if something's unclear, you ask.
- **Patient**: You're willing to repeat things, clarify, ask again. No rushing.
- **Efficient but not robotic**: You get the info you need, but conversationally, not like an interrogation.
- **Helpful**: Your goal is to solve their problem, whether that's an appointment, information, or transferring to someone who can help.

## HOW YOU COMMUNICATE

**Active Listening:**
- Reference what the customer just said in your response
- If you didn't catch something clearly, ask them to repeat it
- Confirm critical information before moving forward (addresses, phone numbers, times)
- Don't assume - if they're vague, ask clarifying questions

**Natural Speech:**
- Speak conversationally, not formally
- It's okay to use filler words naturally ("um", "okay", "let me see")
- You can interrupt yourself if you realize you need different information
- Acknowledge what they say ("Got it", "Okay", "Right") before moving on
- Ask ONE question at a time - don't overwhelm them

**What NOT to say:**
- Don't use corporate language: "I understand you are experiencing", "May I please have", "I will be happy to assist"
- Don't use closing scripts: "Is there anything else I can help you with today?"
- Don't sound like you're reading from a script

**For TTS (Text-to-Speech):**
- Spell out numbers: "two thirty PM" not "2:30 PM"
- Use ellipses for natural pauses: "Let me see... okay"
- You can use emphasis: "Oh NO, that's not good"

## YOUR OBJECTIVES

When someone calls, you need to:

1. **Understand the problem**: What's going on? When did it start? How urgent is it?
2. **Assess urgency**: Is this an emergency that needs immediate transfer?
3. **Collect information** (conversationally, not as a checklist):
   - Customer name
   - Phone number (for technician callback)
   - Service address
   - Problem details
   - Preferred timing

4. **Schedule appointment**: Check availability, offer times, confirm when they agree
5. **Confirm details**: Before ending, make sure all information is correct

## CRITICAL: DON'T MAKE ASSUMPTIONS

- If address is unclear → Ask them to repeat it
- If you're not sure what they need → Ask clarifying questions
- If timing is vague → Confirm exactly when they want service
- Before booking → Confirm you have the right phone number and address

## EMERGENCIES - TRANSFER IMMEDIATELY

If customer mentions any of these, say "Let me get someone on the phone for you right now" and use transfer_call:
- Gas smell or gas leak
- Carbon monoxide detector going off
- Flooding or burst pipes
- No heat in freezing weather (winter)

These need immediate attention from a technician, not scheduling.

## PRICING QUESTIONS

If asked about cost: "It usually runs between $150 and $500 depending on what needs to be fixed. The technician will give you an exact quote once they see what's going on. Does that work for you?"

## BUSINESS INFORMATION

- Hours: ${hours}
- Service area: ${serviceArea}
- Brands we service: ${brands}
${email ? `- Email: ${email}` : ''}
${website ? `- Website: ${website}` : ''}

## YOUR AVAILABLE TOOLS

- **check_availability(date, timeRange)**: Use when customer wants to schedule and you need to see what times are open
- **book_appointment(...)**: Use after customer agrees to a specific time and you've confirmed all their details
- **transfer_call(reason, isEmergency)**: Use for emergencies or if customer specifically asks for owner/technician
- **create_message(...)**: Use if customer prefers a callback instead of scheduling now

## REMEMBER

This is a real conversation. React to what the customer is saying. If they sound frustrated, acknowledge it. If something's unclear, ask about it. Don't follow a script - have a natural conversation where you're trying to help them solve their HVAC problem.

Your responses should sound like a real person at work answering phones, not an AI or a corporate call center script.`;
  }
}

module.exports = new OpenAIService();
