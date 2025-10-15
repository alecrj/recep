const openaiService = require('../services/openai.service');

/**
 * PromptBuilder - Builds prompts and function definitions for OpenAI
 */
class PromptBuilder {
  constructor(businessConfig, conversation) {
    this.businessConfig = businessConfig;
    this.conversation = conversation;
  }

  buildMessages(userInput) {
    const messages = [];

    // System prompt with business context
    messages.push({
      role: 'system',
      content: openaiService.buildSystemPrompt(this.businessConfig),
    });

    // Conversation history (last 10 turns)
    const recentHistory = this.conversation.conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Current user input
    messages.push({
      role: 'user',
      content: userInput,
    });

    return messages;
  }

  getFunctionDefinitions() {
    return [
      {
        name: 'book_appointment',
        description: 'Book an appointment for the caller. Always check availability first before booking.',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Customer full name' },
            customerPhone: { type: 'string', description: 'Customer phone number' },
            customerAddress: { type: 'string', description: 'Service address (street, city, zip)' },
            customerEmail: { type: 'string', description: 'Customer email (optional)' },
            serviceType: { type: 'string', description: 'Type of service: AC Repair, Heating Repair, Maintenance, Installation, Emergency Service, Thermostat Service, or Duct Cleaning' },
            preferredDate: { type: 'string', description: 'Preferred date (YYYY-MM-DD format). Use tomorrow if they say "tomorrow", calculate date if they say day of week.' },
            preferredTime: { type: 'string', description: 'Preferred time slot: morning (09:00), afternoon (14:00), or evening (17:00). Default to afternoon if not specified.' },
            notes: { type: 'string', description: 'Problem description and additional notes' },
          },
          required: ['customerName', 'customerPhone', 'customerAddress', 'serviceType', 'preferredDate'],
        },
      },
      {
        name: 'transfer_call',
        description: 'Transfer call to business owner (for emergencies or complex issues)',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Reason for transfer' },
            isEmergency: { type: 'boolean', description: 'Is this an emergency?' },
          },
          required: ['reason'],
        },
      },
      {
        name: 'create_message',
        description: 'Create a message for the business owner to follow up',
        parameters: {
          type: 'object',
          properties: {
            fromName: { type: 'string', description: 'Caller name' },
            fromPhone: { type: 'string', description: 'Caller phone' },
            message: { type: 'string', description: 'Message content' },
            urgent: { type: 'boolean', description: 'Is this urgent?' },
          },
          required: ['fromName', 'fromPhone', 'message'],
        },
      },
      {
        name: 'check_availability',
        description: 'Check if a time slot is available',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
            timeRange: { type: 'string', description: 'Time range (morning/afternoon/evening)' },
          },
          required: ['date'],
        },
      },
    ];
  }
}

module.exports = PromptBuilder;
