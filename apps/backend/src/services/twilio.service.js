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
  generateIncomingCallTwiML(businessName, streamUrl, callSid) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Connect the call to a bidirectional media stream
    const connect = response.connect();
    const stream = connect.stream({
      url: streamUrl,
    });

    // Pass callSid as parameter that will be available in stream
    stream.parameter({ name: 'callSid', value: callSid });

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

  /**
   * Search for available phone numbers by area code
   */
  async searchAvailableNumbers(areaCode, region = 'US') {
    if (this.testMode) {
      logger.info('[TEST MODE] Would search for available numbers', {
        areaCode,
        region,
      });
      // Return mock phone numbers for testing
      return [
        {
          phoneNumber: `+1${areaCode}5551001`,
          friendlyName: `(${areaCode}) 555-1001`,
          locality: 'Test City',
          region: region,
          capabilities: { voice: true, sms: true, mms: false },
        },
        {
          phoneNumber: `+1${areaCode}5551002`,
          friendlyName: `(${areaCode}) 555-1002`,
          locality: 'Test City',
          region: region,
          capabilities: { voice: true, sms: true, mms: false },
        },
      ];
    }

    try {
      const numbers = await this.client.availablePhoneNumbers(region)
        .local
        .list({
          areaCode: areaCode,
          limit: 20,
          voiceEnabled: true,
          smsEnabled: true,
        });

      logger.info('Found available phone numbers', {
        count: numbers.length,
        areaCode,
      });

      return numbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        locality: num.locality,
        region: num.region,
        capabilities: num.capabilities,
      }));
    } catch (error) {
      logger.error('Failed to search for phone numbers', {
        error: error.message,
        areaCode,
      });
      throw error;
    }
  }

  /**
   * Purchase a phone number from Twilio
   */
  async purchasePhoneNumber(phoneNumber) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would purchase phone number', { phoneNumber });
      return {
        sid: 'TEST_PN_' + Date.now(),
        phoneNumber: phoneNumber,
        friendlyName: phoneNumber,
        capabilities: { voice: true, sms: true, mms: false },
        testMode: true,
      };
    }

    try {
      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        voiceUrl: `${config.BACKEND_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        statusCallback: `${config.BACKEND_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST',
        smsUrl: `${config.BACKEND_URL}/api/twilio/sms`,
        smsMethod: 'POST',
      });

      logger.info('Phone number purchased successfully', {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
      });

      return {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
        friendlyName: purchasedNumber.friendlyName,
        capabilities: purchasedNumber.capabilities,
      };
    } catch (error) {
      logger.error('Failed to purchase phone number', {
        error: error.message,
        phoneNumber,
      });
      throw error;
    }
  }

  /**
   * Configure webhook URLs for a phone number (includes business ID in webhook)
   */
  async configureNumberWebhooks(phoneNumberSid, businessId) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would configure phone number webhooks', {
        phoneNumberSid,
        businessId,
      });
      return { testMode: true };
    }

    try {
      const updated = await this.client.incomingPhoneNumbers(phoneNumberSid).update({
        voiceUrl: `${config.BACKEND_URL}/api/twilio/voice?businessId=${businessId}`,
        voiceMethod: 'POST',
        statusCallback: `${config.BACKEND_URL}/api/twilio/status?businessId=${businessId}`,
        statusCallbackMethod: 'POST',
        smsUrl: `${config.BACKEND_URL}/api/twilio/sms?businessId=${businessId}`,
        smsMethod: 'POST',
      });

      logger.info('Phone number webhooks configured for business', {
        sid: phoneNumberSid,
        businessId,
      });

      return updated;
    } catch (error) {
      logger.error('Failed to configure phone number webhooks', {
        error: error.message,
        phoneNumberSid,
        businessId,
      });
      throw error;
    }
  }

  /**
   * Update phone number webhook URLs
   */
  async updatePhoneNumberWebhooks(phoneNumberSid, webhookUrls) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would update phone number webhooks', {
        phoneNumberSid,
        webhookUrls,
      });
      return { testMode: true };
    }

    try {
      const updated = await this.client.incomingPhoneNumbers(phoneNumberSid).update({
        voiceUrl: webhookUrls.voiceUrl || `${config.BACKEND_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        statusCallback: webhookUrls.statusCallback || `${config.BACKEND_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST',
        smsUrl: webhookUrls.smsUrl || `${config.BACKEND_URL}/api/twilio/sms`,
        smsMethod: 'POST',
      });

      logger.info('Phone number webhooks updated', {
        sid: phoneNumberSid,
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update phone number webhooks', {
        error: error.message,
        phoneNumberSid,
      });
      throw error;
    }
  }

  /**
   * Release/delete a phone number from Twilio account
   */
  async releasePhoneNumber(phoneNumberSid) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would release phone number', { phoneNumberSid });
      return { testMode: true };
    }

    try {
      await this.client.incomingPhoneNumbers(phoneNumberSid).remove();

      logger.info('Phone number released', {
        sid: phoneNumberSid,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to release phone number', {
        error: error.message,
        phoneNumberSid,
      });
      throw error;
    }
  }

  /**
   * Get list of all purchased phone numbers
   */
  async listPhoneNumbers() {
    if (this.testMode) {
      logger.info('[TEST MODE] Would list phone numbers');
      return [
        {
          sid: 'TEST_PN_001',
          phoneNumber: '+15555551001',
          friendlyName: '(555) 555-1001',
          testMode: true,
        },
      ];
    }

    try {
      const numbers = await this.client.incomingPhoneNumbers.list();

      return numbers.map(num => ({
        sid: num.sid,
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        voiceUrl: num.voiceUrl,
        smsUrl: num.smsUrl,
      }));
    } catch (error) {
      logger.error('Failed to list phone numbers', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TwilioService();
