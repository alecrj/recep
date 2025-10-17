/**
 * ConversationHandler - Manages state for a single call conversation
 */
class ConversationHandler {
  constructor(businessId, callSid, callerPhone, businessConfig) {
    this.businessId = businessId;
    this.callSid = callSid;
    this.callerPhone = callerPhone;
    this.businessConfig = businessConfig;

    this.conversationHistory = [];
    this.callerInfo = { phone: callerPhone };
    this.currentIntent = null;
    this.bookingContext = {};
    this.isSpeaking = false;
    this.responseTimes = [];
    this.startTime = Date.now();

    // Conversation state tracking - what we know vs what we need
    this.conversationState = {
      hasName: false,
      hasPhone: true, // We always have caller's phone from Twilio
      hasAddress: false,
      understandsProblem: false,
      hasPreferredTime: false,
      readyToBook: false,
      needsClarification: [],  // Track what needs clarification
    };

    // Track uncertain information for confirmation
    this.uncertainInfo = {
      address: null,
      phone: null,
      name: null,
      time: null,
    };
  }

  addUserTurn(text) {
    this.conversationHistory.push({
      role: 'user',
      content: text,
      timestamp: new Date(),
    });
  }

  addAITurn(text, intent) {
    this.conversationHistory.push({
      role: 'assistant',
      content: text,
      timestamp: new Date(),
    });
    this.currentIntent = intent;
  }

  getInstantResponse() {
    const businessName = this.businessConfig.businessName || 'the company';
    const agentName = this.businessConfig.aiAgentName || 'Sarah';

    // Use custom greeting if configured
    if (this.businessConfig.greetingMessage) {
      return this.businessConfig.greetingMessage;
    }

    // How real receptionists actually answer - casual and natural
    const greetings = [
      `${businessName}, this is ${agentName}. What's going on?`,
      `Thanks for calling ${businessName}, this is ${agentName}. How can I help you?`,
      `${businessName}, ${agentName} speaking. What can I do for you?`,
      `Hey, ${businessName}. This is ${agentName}. What's up?`,
      `${businessName}, ${agentName} here. What do you need?`,
    ];

    // Return a random greeting for variety
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  setAISpeaking(speaking) {
    this.isSpeaking = speaking;
  }

  recordResponseTime(ms) {
    this.responseTimes.push(ms);
  }

  getAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  getCallDuration() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  extractCallerInfo(text) {
    const nameMatch = text.match(/(?:my name is|i'm|this is)\s+([a-z]+(?:\s+[a-z]+)?)/i);
    if (nameMatch) {
      this.callerInfo.name = nameMatch[1];
    }

    const emailMatch = text.match(/([a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
    if (emailMatch) {
      this.callerInfo.email = emailMatch[1];
    }
  }

  setBookingContext(key, value) {
    this.bookingContext[key] = value;
  }

  getBookingContext() {
    return this.bookingContext;
  }

  getConversationSummary() {
    return {
      turns: this.conversationHistory.length,
      duration: this.getCallDuration(),
      intent: this.currentIntent,
      avgResponseTime: this.getAverageResponseTime(),
      callerInfo: this.callerInfo,
      conversationState: this.conversationState,
    };
  }

  // Update conversation state based on collected information
  updateConversationState(info) {
    if (info.name) {
      this.conversationState.hasName = true;
      this.callerInfo.name = info.name;
    }
    if (info.phone) {
      this.conversationState.hasPhone = true;
      this.callerInfo.phone = info.phone;
    }
    if (info.address) {
      this.conversationState.hasAddress = true;
      this.callerInfo.address = info.address;
    }
    if (info.problem) {
      this.conversationState.understandsProblem = true;
    }
    if (info.preferredTime) {
      this.conversationState.hasPreferredTime = true;
    }

    // Check if ready to book
    this.conversationState.readyToBook =
      this.conversationState.hasName &&
      this.conversationState.hasPhone &&
      this.conversationState.hasAddress &&
      this.conversationState.understandsProblem &&
      this.conversationState.hasPreferredTime;
  }

  // Get what information is still needed
  getMissingInformation() {
    const missing = [];
    if (!this.conversationState.hasName) missing.push('customer name');
    if (!this.conversationState.hasPhone) missing.push('phone number');
    if (!this.conversationState.hasAddress) missing.push('service address');
    if (!this.conversationState.understandsProblem) missing.push('problem description');
    if (!this.conversationState.hasPreferredTime) missing.push('preferred time');
    return missing;
  }

  // Track information that needs confirmation
  markForConfirmation(field, value, confidence = 1.0) {
    if (confidence < 0.8) {
      this.uncertainInfo[field] = value;
      if (!this.conversationState.needsClarification.includes(field)) {
        this.conversationState.needsClarification.push(field);
      }
    }
  }

  // Check if we need to confirm anything before proceeding
  needsConfirmation() {
    return this.conversationState.needsClarification.length > 0;
  }
}

module.exports = ConversationHandler;
