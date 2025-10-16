const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');

/**
 * ActionExecutor - Executes function calls from OpenAI
 */
class ActionExecutor {
  async execute(functionCall, context) {
    const { name, arguments: args } = functionCall;
    logger.info('Executing action', { function: name, args });

    switch (name) {
      case 'book_appointment':
        return await this.bookAppointment(args, context);

      case 'transfer_call':
        return await this.transferCall(args, context);

      case 'create_message':
        return await this.createMessage(args, context);

      case 'check_availability':
        return await this.checkAvailability(args, context);

      default:
        logger.warn('Unknown function call', { name });
        return { success: false, error: 'Unknown function' };
    }
  }

  async bookAppointment(args, context) {
    try {
      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: {
          businessId: context.businessId,
          phone: args.customerPhone,
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            businessId: context.businessId,
            name: args.customerName,
            phone: args.customerPhone,
            email: args.customerEmail,
          },
        });
      }

      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          businessId: context.businessId,
          customerId: customer.id,
          serviceType: args.serviceType,
          scheduledTime: new Date(`${args.preferredDate}T${args.preferredTime || '09:00'}:00`),
          durationMinutes: 60,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          customerAddress: args.customerAddress || null,
          status: 'SCHEDULED',
          notes: args.notes,
        },
      });

      // Update call intent
      await prisma.call.update({
        where: { id: context.callId },
        data: { intent: 'SCHEDULE' },
      });

      logger.info('Appointment booked', {
        appointmentId: appointment.id,
        customer: args.customerName,
      });

      return {
        success: true,
        appointmentId: appointment.id,
        message: `Great! I've scheduled your ${args.serviceType} appointment for ${args.preferredDate}. You'll receive a confirmation shortly.`,
      };
    } catch (error) {
      logger.error('Failed to book appointment', { error: error.message });
      return {
        success: false,
        error: error.message,
        message: 'I had trouble booking that appointment. Let me take your information and have someone call you back.',
      };
    }
  }

  async transferCall(args, context) {
    try {
      // Get business config for emergency contact
      const business = await prisma.business.findUnique({
        where: { id: context.businessId },
        include: { config: true },
      });

      // Determine transfer number based on urgency
      let transferNumber = business.ownerPhone;
      let transferTo = 'our team';

      if (args.isEmergency && business.config?.emergencyContactPhone) {
        transferNumber = business.config.emergencyContactPhone;
        transferTo = business.config.emergencyContactName || 'our emergency technician';
      } else if (business.config?.afterHoursPhone) {
        transferNumber = business.config.afterHoursPhone;
      }

      // Update call status
      await prisma.call.update({
        where: { id: context.callId },
        data: {
          intent: args.isEmergency ? 'EMERGENCY' : 'QUESTION',
        },
      });

      logger.info('Transferring call', {
        reason: args.reason,
        isEmergency: args.isEmergency,
        transferTo,
      });

      return {
        success: true,
        transferNumber,
        message: `Let me connect you with ${transferTo} right away.`,
      };
    } catch (error) {
      logger.error('Failed to transfer call', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createMessage(args, context) {
    try {
      const message = await prisma.message.create({
        data: {
          businessId: context.businessId,
          fromName: args.fromName,
          fromPhone: args.fromPhone,
          message: args.message,
          urgent: args.urgent || false,
          status: 'NEW',
          callId: context.callId,
        },
      });

      logger.info('Message created', { messageId: message.id });

      return {
        success: true,
        messageId: message.id,
        message: `I've taken your message. ${args.fromName}, someone will get back to you shortly at ${args.fromPhone}.`,
      };
    } catch (error) {
      logger.error('Failed to create message', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkAvailability(args, context) {
    try {
      // Check for existing appointments on that date
      const date = new Date(args.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const existingAppointments = await prisma.appointment.count({
        where: {
          businessId: context.businessId,
          scheduledTime: {
            gte: date,
            lt: nextDay,
          },
          status: { not: 'CANCELLED' },
        },
      });

      // Simple logic: assume 8 slots per day
      const available = existingAppointments < 8;

      logger.info('Checked availability', {
        date: args.date,
        available,
        existing: existingAppointments,
      });

      return {
        success: true,
        available,
        message: available
          ? `Yes, we have availability on ${args.date}. What time works best for you?`
          : `That date is fully booked. Would you like to try another day?`,
      };
    } catch (error) {
      logger.error('Failed to check availability', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new ActionExecutor();
