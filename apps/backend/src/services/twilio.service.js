const twilio = require('twilio');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * TwilioService - Handles all Twilio phone and SMS operations
 *
 * Features:
 * - Make and receive calls
 * - Send SMS messages
 * - Generate TwiML responses
 * - Test mode for development
 */

class TwilioService {
  constructor() {
    this.testMode = !config.TWILIO_ACCOUNT_SID || config.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid';

    if (this.testMode) {
      logger.warn('TwilioService running in TEST MODE - no real calls will be made');
      this.client = null;
    } else {
      this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      logger.info('TwilioService initialized with real Twilio credentials');
    }
  }

  /**
   * Generate TwiML response for incoming call
   */
  generateIncomingCallTwiML(businessName, streamUrl) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Start the call with a brief greeting while we set up streaming
    response.say({
      voice: 'Polly.Joanna'
    }, `Hello, connecting you now.`);

    // Start bidirectional media stream
    const start = response.start();
    start.stream({
      url: streamUrl,
      track: 'both_tracks' // Send and receive audio
    });

    // Pause to keep the call alive while streaming
    response.pause({ length: 60 });

    return response.toString();
  }

  /**
   * Generate TwiML to transfer call
   */
  generateTransferTwiML(phoneNumber) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    response.say({
      voice: 'Polly.Joanna'
    }, 'Transferring you now, please hold.');

    response.dial(phoneNumber);

    return response.toString();
  }

  /**
   * Generate TwiML to say something and hang up
   */
  generateSayAndHangupTwiML(message) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    response.say({
      voice: 'Polly.Joanna'
    }, message);

    response.hangup();

    return response.toString();
  }

  /**
   * Send SMS message
   */
  async sendSMS(to, message) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would send SMS', {
        to,
        message: message.substring(0, 50) + '...',
      });
      return {
        sid: 'TEST_SMS_' + Date.now(),
        status: 'sent',
        testMode: true,
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: to,
      });

      logger.info('SMS sent successfully', {
        sid: result.sid,
        to: to,
      });

      return {
        sid: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error('Failed to send SMS', {
        error: error.message,
        to,
      });
      throw error;
    }
  }

  /**
   * Make outbound call
   */
  async makeCall(to, twimlUrl) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would make call', {
        to,
        twimlUrl,
      });
      return {
        sid: 'TEST_CALL_' + Date.now(),
        status: 'initiated',
        testMode: true,
      };
    }

    try {
      const call = await this.client.calls.create({
        url: twimlUrl,
        to: to,
        from: config.TWILIO_PHONE_NUMBER,
      });

      logger.info('Outbound call initiated', {
        sid: call.sid,
        to: to,
      });

      return {
        sid: call.sid,
        status: call.status,
      };
    } catch (error) {
      logger.error('Failed to make call', {
        error: error.message,
        to,
      });
      throw error;
    }
  }

  /**
   * Update call in progress
   */
  async updateCall(callSid, updates) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would update call', {
        callSid,
        updates,
      });
      return { testMode: true };
    }

    try {
      const call = await this.client.calls(callSid).update(updates);

      logger.info('Call updated', {
        sid: callSid,
        status: call.status,
      });

      return call;
    } catch (error) {
      logger.error('Failed to update call', {
        error: error.message,
        callSid,
      });
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCall(callSid) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would fetch call details', { callSid });
      return {
        sid: callSid,
        status: 'completed',
        duration: 120,
        testMode: true,
      };
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error) {
      logger.error('Failed to fetch call', {
        error: error.message,
        callSid,
      });
      throw error;
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  validateSignature(signature, url, params) {
    if (this.testMode) {
      return true; // Always valid in test mode
    }

    return twilio.validateRequest(
      config.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  }

  /**
   * Send appointment confirmation SMS
   */
  async sendAppointmentConfirmation(phone, appointmentDetails) {
    const message = `✅ Appointment Confirmed!

Date: ${appointmentDetails.date}
Time: ${appointmentDetails.time}
Service: ${appointmentDetails.service}

${appointmentDetails.businessName}
${appointmentDetails.address || ''}

Reply CANCEL to cancel.`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send appointment reminder SMS (24 hours before)
   */
  async sendAppointmentReminder(phone, appointmentDetails) {
    const message = `⏰ Reminder: You have an appointment tomorrow!

Date: ${appointmentDetails.date}
Time: ${appointmentDetails.time}
Service: ${appointmentDetails.service}

${appointmentDetails.businessName}

See you then!`;

    return this.sendSMS(phone, message);
  }

  /**
   * Send emergency alert to business owner
   */
  async sendEmergencyAlert(ownerPhone, callerInfo) {
    const message = `🚨 URGENT: Emergency call received!

From: ${callerInfo.name || 'Unknown'}
Phone: ${callerInfo.phone}
Issue: ${callerInfo.description}

Call them back immediately.`;

    return this.sendSMS(ownerPhone, message);
  }

  /**
   * Send new message alert to business owner
   */
  async sendMessageAlert(ownerPhone, messageInfo) {
    const message = `📞 New message from ${messageInfo.name}

Phone: ${messageInfo.phone}
Message: ${messageInfo.message}

${messageInfo.urgent ? '⚠️ Marked as URGENT' : ''}

Reply via your dashboard.`;

    return this.sendSMS(ownerPhone, message);
  }

  /**
   * Send payment link to customer
   */
  async sendPaymentLink(phone, paymentDetails) {
    const message = `💳 Payment Request - ${paymentDetails.businessName}

Amount: $${paymentDetails.amount}
Service: ${paymentDetails.service}

Secure payment link:
${paymentDetails.paymentUrl}

This link expires in 24 hours.`;

    return this.sendSMS(phone, message);
  }
}

// Export singleton instance
module.exports = new TwilioService();
