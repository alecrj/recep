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

    // Natural, warm greeting
    const greetings = [
      `Thanks for calling ${businessName}, this is ${agentName}. How can I help you today?`,
      `${businessName}, ${agentName} speaking. What can I do for you?`,
      `Good ${this.getTimeOfDay()}! You've reached ${businessName}. This is ${agentName}, what brings you in today?`
    ];

    // Use custom greeting if configured, otherwise pick a natural one
    if (this.businessConfig.greetingMessage) {
      return this.businessConfig.greetingMessage;
    }

    // Randomly pick a greeting for variety (deterministic based on call time)
    const index = Date.now() % greetings.length;
    return greetings[index];
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
    };
  }
}

module.exports = ConversationHandler;
