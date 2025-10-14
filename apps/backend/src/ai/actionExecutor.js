const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');
const twilioService = require('../services/twilio.service');
const calendarService = require('../services/calendar.service');

/**
 * ActionExecutor - Executes actions based on AI decisions
 *
 * Takes function calls from OpenAI and performs actual operations:
 * - Book appointments
 * - Check availability
 * - Transfer calls
 * - Take messages
 * - Flag emergencies
 */

class ActionExecutor {
  constructor() {
    this.actions = {
      detect_intent: this.detectIntent.bind(this),
      collect_information: this.collectInformation.bind(this),
      check_availability: this.checkAvailability.bind(this),
      book_appointment: this.bookAppointment.bind(this),
      take_message: this.takeMessage.bind(this),
      flag_emergency: this.flagEmergency.bind(this),
      transfer_call: this.transferCall.bind(this),
    };
  }

  /**
   * Execute an action from AI function call
   */
  async execute(functionCall, context) {
    const { name, arguments: args } = functionCall;

    logger.info('Executing action', {
      action: name,
      args,
      businessId: context.businessId,
      callSid: context.callSid,
    });

    const actionHandler = this.actions[name];

    if (!actionHandler) {
      logger.error('Unknown action', { action: name });
      return {
        success: false,
        error: `Unknown action: ${name}`,
      };
    }

    try {
      const result = await actionHandler(args, context);

      logger.info('Action executed successfully', {
        action: name,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Action execution failed', {
        action: name,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect and store caller intent
   */
  async detectIntent(args, context) {
    const { intent, confidence } = args;

    context.conversation.setIntent(intent);

    // Update conversation state based on intent
    switch (intent) {
      case 'schedule_appointment':
        context.conversation.setState('collecting_info');
        break;
      case 'ask_question':
        context.conversation.setState('answering_question');
        break;
      case 'emergency':
        context.conversation.setState('handling_emergency');
        break;
      case 'speak_to_human':
        context.conversation.setState('transferring');
        break;
      case 'leave_message':
        context.conversation.setState('taking_message');
        break;
      default:
        context.conversation.setState('understanding_intent');
    }

    logger.info('Intent detected', {
      intent,
      confidence,
      callSid: context.callSid,
    });

    return {
      success: true,
      intent,
      confidence,
      message: `Intent detected: ${intent}`,
    };
  }

  /**
   * Store collected information
   */
  async collectInformation(args, context) {
    const { field, value } = args;

    context.conversation.collectInfo(field, value);

    logger.info('Information collected', {
      field,
      value: typeof value === 'string' ? value.substring(0, 50) : value,
      callSid: context.callSid,
    });

    return {
      success: true,
      field,
      value,
      message: `Collected ${field}`,
    };
  }

  /**
   * Check calendar availability
   */
  async checkAvailability(args, context) {
    const { date, serviceType } = args;

    context.conversation.setState('checking_availability');

    logger.info('Checking availability', {
      date,
      serviceType,
      businessId: context.businessId,
    });

    try {
      // Create date range for the requested day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Check availability using calendar service
      const availableSlots = await calendarService.checkAvailability(
        context.businessId,
        startDate,
        endDate,
        serviceType
      );

      return {
        success: true,
        slots: availableSlots,
        message: `Found ${availableSlots.length} available slots on ${date}`,
      };
    } catch (error) {
      logger.error('Failed to check availability', {
        error: error.message,
        date,
        businessId: context.businessId,
      });

      return {
        success: false,
        error: error.message,
        message: 'Unable to check availability at this time',
      };
    }
  }

  /**
   * Book an appointment
   */
  async bookAppointment(args, context) {
    const { customerName, customerPhone, serviceType, scheduledTime, notes } = args;

    try {
      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: {
          businessId: context.businessId,
          phone: customerPhone,
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            businessId: context.businessId,
            name: customerName,
            phone: customerPhone,
            notes: notes || '',
          },
        });
        logger.info('New customer created', { customerId: customer.id });
      }

      // Create appointment in Google Calendar first
      const calendarResult = await calendarService.bookAppointment(context.businessId, {
        customerName,
        customerEmail: customer.email,
        customerPhone,
        scheduledTime,
        durationMinutes: 60, // Default 1 hour
        serviceType,
        notes: notes || '',
      });

      // Create appointment in our database
      const appointment = await prisma.appointment.create({
        data: {
          businessId: context.businessId,
          customerId: customer.id,
          scheduledTime: new Date(scheduledTime),
          durationMinutes: 60, // Default 1 hour
          serviceType,
          status: 'SCHEDULED',
          customerName,
          customerPhone,
          notes: notes || '',
          createdBy: 'ai',
          calendarEventId: calendarResult.calendarEventId, // Store Google Calendar event ID
        },
      });

      // Update call record with outcome
      await prisma.call.update({
        where: { callSid: context.callSid },
        data: {
          outcome: 'APPOINTMENT_BOOKED',
          customerId: customer.id,
        },
      });

      // Send confirmation SMS
      const business = await prisma.business.findUnique({
        where: { id: context.businessId },
        select: { name: true },
      });

      await twilioService.sendAppointmentConfirmation(customerPhone, {
        date: new Date(scheduledTime).toLocaleDateString(),
        time: new Date(scheduledTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        service: serviceType,
        businessName: business.name,
      });

      context.conversation.setState('confirming_booking');

      logger.info('Appointment booked successfully', {
        appointmentId: appointment.id,
        customerId: customer.id,
        scheduledTime,
      });

      return {
        success: true,
        appointmentId: appointment.id,
        customerId: customer.id,
        message: `Appointment booked for ${customerName} on ${scheduledTime}`,
      };
    } catch (error) {
      logger.error('Failed to book appointment', {
        error: error.message,
        args,
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to book appointment',
      };
    }
  }

  /**
   * Take a message for callback
   */
  async takeMessage(args, context) {
    const { name, phone, message, urgent } = args;

    try {
      const messageRecord = await prisma.message.create({
        data: {
          businessId: context.businessId,
          callId: context.callId,
          fromName: name,
          fromPhone: phone,
          message,
          urgent: urgent || false,
          status: 'NEW',
        },
      });

      // Update call record
      await prisma.call.update({
        where: { callSid: context.callSid },
        data: {
          outcome: 'MESSAGE_TAKEN',
        },
      });

      // Alert business owner
      const business = await prisma.business.findUnique({
        where: { id: context.businessId },
        select: { ownerPhone: true },
      });

      if (business.ownerPhone) {
        await twilioService.sendMessageAlert(business.ownerPhone, {
          name,
          phone,
          message,
          urgent: urgent || false,
        });
      }

      context.conversation.setState('taking_message');

      logger.info('Message taken', {
        messageId: messageRecord.id,
        urgent: urgent || false,
      });

      return {
        success: true,
        messageId: messageRecord.id,
        message: `Message recorded from ${name}`,
      };
    } catch (error) {
      logger.error('Failed to take message', {
        error: error.message,
        args,
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to record message',
      };
    }
  }

  /**
   * Flag emergency and alert owner
   */
  async flagEmergency(args, context) {
    const { name, phone, address, description } = args;

    try {
      // Create urgent message
      const messageRecord = await prisma.message.create({
        data: {
          businessId: context.businessId,
          callId: context.callId,
          fromName: name || 'Unknown',
          fromPhone: phone || context.callerPhone,
          message: `EMERGENCY: ${description}${address ? ` at ${address}` : ''}`,
          urgent: true,
          status: 'NEW',
        },
      });

      // Update call record
      await prisma.call.update({
        where: { callSid: context.callSid },
        data: {
          outcome: 'EMERGENCY_FLAGGED',
          intent: 'EMERGENCY',
        },
      });

      // Send URGENT alert to owner
      const business = await prisma.business.findUnique({
        where: { id: context.businessId },
        select: { ownerPhone: true },
      });

      if (business.ownerPhone) {
        await twilioService.sendEmergencyAlert(business.ownerPhone, {
          name: name || 'Unknown',
          phone: phone || context.callerPhone,
          description,
          address,
        });
      }

      context.conversation.setState('handling_emergency');

      logger.warn('EMERGENCY FLAGGED', {
        messageId: messageRecord.id,
        description,
        businessId: context.businessId,
      });

      return {
        success: true,
        messageId: messageRecord.id,
        message: 'Emergency flagged and owner alerted',
      };
    } catch (error) {
      logger.error('Failed to flag emergency', {
        error: error.message,
        args,
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to flag emergency',
      };
    }
  }

  /**
   * Transfer call to business owner
   */
  async transferCall(args, context) {
    const { reason } = args;

    try {
      const business = await prisma.business.findUnique({
        where: { id: context.businessId },
        include: { config: true },
      });

      const transferNumber = business.config?.transferNumber;

      if (!transferNumber) {
        logger.warn('No transfer number configured', {
          businessId: context.businessId,
        });

        return {
          success: false,
          error: 'No transfer number configured',
          message: 'Cannot transfer - no number configured',
        };
      }

      // Update call record
      await prisma.call.update({
        where: { callSid: context.callSid },
        data: {
          outcome: 'TRANSFERRED',
        },
      });

      context.conversation.setState('transferring');

      logger.info('Call transfer requested', {
        reason,
        transferNumber,
        businessId: context.businessId,
      });

      return {
        success: true,
        transferNumber,
        reason,
        message: `Transferring call to ${transferNumber}`,
      };
    } catch (error) {
      logger.error('Failed to transfer call', {
        error: error.message,
        args,
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to transfer call',
      };
    }
  }
}

module.exports = new ActionExecutor();
