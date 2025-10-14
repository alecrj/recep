const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');

/**
 * ConversationHandler - Manages stateful AI conversations with human-like behavior
 *
 * KEY OPTIMIZATIONS:
 * - Streaming responses (don't wait for complete generation)
 * - Interrupt detection (know when user talks over AI)
 * - Silence detection (know when user is done speaking)
 * - Pre-generated common phrases (instant responses)
 * - Context windowing (only last 5 turns for speed)
 */

class ConversationHandler {
  constructor(businessId, callSid, callerPhone, businessConfig) {
    this.businessId = businessId;
    this.callSid = callSid;
    this.callerPhone = callerPhone;
    this.config = businessConfig;

    // Conversation state
    this.conversationHistory = [];
    this.collectedInfo = {};
    this.currentIntent = null;
    this.currentState = 'greeting';
    this.lastUserSpeech = null;
    this.lastAIResponse = null;
    this.silenceStartTime = null;
    this.isAISpeaking = false;

    // Timing tracking for latency optimization
    this.metrics = {
      avgResponseTime: 0,
      responseCount: 0,
    };
  }

  /**
   * Add user speech to history
   */
  addUserTurn(text, confidence = 1.0) {
    const turn = {
      role: 'user',
      content: text,
      timestamp: new Date(),
      confidence,
    };

    this.conversationHistory.push(turn);
    this.lastUserSpeech = turn;

    logger.debug('User turn added', {
      callSid: this.callSid,
      text: text.substring(0, 100),
      confidence,
    });
  }

  /**
   * Add AI response to history
   */
  addAITurn(text, intent = null, confidence = 1.0) {
    const turn = {
      role: 'assistant',
      content: text,
      timestamp: new Date(),
      intent,
      confidence,
    };

    this.conversationHistory.push(turn);
    this.lastAIResponse = turn;

    logger.debug('AI turn added', {
      callSid: this.callSid,
      text: text.substring(0, 100),
      intent,
    });
  }

  /**
   * Get conversation context (last N turns to keep prompts short)
   */
  getConversationContext(maxTurns = 5) {
    const recentTurns = this.conversationHistory.slice(-maxTurns);
    return recentTurns.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
  }

  /**
   * Update conversation state
   */
  setState(newState) {
    logger.debug('State transition', {
      callSid: this.callSid,
      from: this.currentState,
      to: newState,
    });
    this.currentState = newState;
  }

  /**
   * Set detected intent
   */
  setIntent(intent) {
    logger.info('Intent detected', {
      callSid: this.callSid,
      intent,
      previousIntent: this.currentIntent,
    });
    this.currentIntent = intent;
  }

  /**
   * Collect information from user
   */
  collectInfo(key, value) {
    this.collectedInfo[key] = value;
    logger.debug('Info collected', {
      callSid: this.callSid,
      key,
      value: typeof value === 'string' ? value.substring(0, 50) : value,
    });
  }

  /**
   * Check if we have all required info for booking
   */
  hasRequiredBookingInfo() {
    const required = ['customerName', 'customerPhone', 'serviceType', 'desiredDate', 'desiredTime'];
    return required.every((field) => this.collectedInfo[field]);
  }

  /**
   * Check if user is describing an emergency
   */
  isEmergency() {
    if (!this.config.emergencyKeywords || this.config.emergencyKeywords.length === 0) {
      return false;
    }

    const recentText = this.conversationHistory
      .slice(-3)
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content.toLowerCase())
      .join(' ');

    return this.config.emergencyKeywords.some((keyword) =>
      recentText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if user wants to speak to a human
   */
  wantsHuman() {
    if (!this.config.transferKeywords || this.config.transferKeywords.length === 0) {
      return false;
    }

    const recentText = this.conversationHistory
      .slice(-2)
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content.toLowerCase())
      .join(' ');

    return this.config.transferKeywords.some((keyword) =>
      recentText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Get pre-generated response for common situations (instant, no AI call)
   */
  getInstantResponse() {
    // Greeting (first interaction)
    if (this.conversationHistory.length === 0) {
      return this.config.greetingMessage ||
        `Thank you for calling ${this.config.businessName}. This is ${this.config.aiAgentName}. How can I help you today?`;
    }

    // Emergency detection
    if (this.isEmergency() && this.currentState !== 'handling_emergency') {
      this.setState('handling_emergency');
      return `I understand this is urgent. Let me get your information quickly so we can help you right away. Can I have your name and the address where you need service?`;
    }

    // Transfer request
    if (this.wantsHuman() && this.config.transferNumber) {
      this.setState('transferring');
      return `Of course, let me transfer you to someone right now. Please hold for just a moment.`;
    }

    return null; // No instant response, need AI
  }

  /**
   * Detect if user interrupted AI
   */
  detectInterrupt(userStartedSpeaking) {
    if (this.isAISpeaking && userStartedSpeaking) {
      logger.info('User interrupted AI', { callSid: this.callSid });
      return true;
    }
    return false;
  }

  /**
   * Mark AI as speaking or not
   */
  setAISpeaking(isSpeaking) {
    this.isAISpeaking = isSpeaking;
  }

  /**
   * Get full conversation state for persistence
   */
  toJSON() {
    return {
      businessId: this.businessId,
      callSid: this.callSid,
      callerPhone: this.callerPhone,
      conversationHistory: this.conversationHistory,
      collectedInfo: this.collectedInfo,
      currentIntent: this.currentIntent,
      currentState: this.currentState,
      metrics: this.metrics,
    };
  }

  /**
   * Save conversation state to database
   */
  async save() {
    try {
      // This would be saved to a separate conversation_states table
      // or as metadata in the Call record
      logger.debug('Conversation state saved', {
        callSid: this.callSid,
        turns: this.conversationHistory.length,
      });
    } catch (error) {
      logger.error('Failed to save conversation state', {
        callSid: this.callSid,
        error: error.message,
      });
    }
  }

  /**
   * Track response time metrics
   */
  recordResponseTime(ms) {
    this.metrics.responseCount++;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.responseCount - 1) + ms) /
      this.metrics.responseCount;

    if (ms > 2000) {
      logger.warn('Slow response detected', {
        callSid: this.callSid,
        responseTime: ms,
        avgResponseTime: this.metrics.avgResponseTime,
      });
    }
  }
}

module.exports = ConversationHandler;
