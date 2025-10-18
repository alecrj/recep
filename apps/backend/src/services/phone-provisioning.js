const twilio = require('twilio');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Phone Number Provisioning Service
 *
 * Automatically purchases and configures Twilio phone numbers for new businesses
 */

const twilioClient = twilio(
  config.TWILIO_ACCOUNT_SID,
  config.TWILIO_AUTH_TOKEN
);

/**
 * Search for available phone numbers
 * @param {string} areaCode - Optional area code preference (e.g., '602' for Phoenix)
 * @param {string} country - Country code (default: 'US')
 */
async function searchAvailableNumbers(areaCode = null, country = 'US') {
  try {
    const searchParams = {
      limit: 10,
      voiceEnabled: true
    };

    if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    const numbers = await twilioClient
      .availablePhoneNumbers(country)
      .local
      .list(searchParams);

    logger.info('Available phone numbers found', {
      count: numbers.length,
      areaCode,
      country
    });

    return numbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region
    }));
  } catch (error) {
    logger.error('Error searching for phone numbers', {
      error: error.message,
      areaCode,
      country
    });
    throw error;
  }
}

/**
 * Purchase and configure a phone number for a business
 * @param {string} businessId - Business ID from database
 * @param {string} phoneNumber - Optional specific number to purchase
 * @param {string} areaCode - Optional area code preference
 */
async function provisionPhoneNumber(businessId, phoneNumber = null, areaCode = null) {
  try {
    // If no specific number provided, find one
    if (!phoneNumber) {
      const available = await searchAvailableNumbers(areaCode);

      if (available.length === 0) {
        throw new Error('No available phone numbers found');
      }

      phoneNumber = available[0].phoneNumber;
    }

    // Purchase the number from Twilio
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      friendlyName: `AI Receptionist - Business ${businessId}`,
      voiceUrl: `${config.BACKEND_URL}/api/elevenlabs/incoming`,
      voiceMethod: 'POST',
      statusCallback: `${config.BACKEND_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST'
    });

    logger.info('Phone number purchased from Twilio', {
      businessId,
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid
    });

    // Update business record with the new number
    await prisma.business.update({
      where: { id: businessId },
      data: {
        twilioNumber: purchasedNumber.phoneNumber,
        phoneNumber: purchasedNumber.phoneNumber // Also set as display number
      }
    });

    // Record in PhoneNumber table for tracking
    await prisma.phoneNumber.create({
      data: {
        phoneNumber: purchasedNumber.phoneNumber,
        twilioSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName,
        businessId: businessId,
        assignedAt: new Date(),
        status: 'ASSIGNED',
        capabilities: {
          voice: true,
          sms: purchasedNumber.capabilities.sms,
          mms: purchasedNumber.capabilities.mms
        },
        country: 'US'
      }
    });

    logger.info('Phone number assigned to business', {
      businessId,
      phoneNumber: purchasedNumber.phoneNumber
    });

    return {
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid
    };
  } catch (error) {
    logger.error('Error provisioning phone number', {
      businessId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Release a phone number (when business cancels)
 * @param {string} businessId - Business ID
 */
async function releasePhoneNumber(businessId) {
  try {
    // Find the business's phone number
    const phoneRecord = await prisma.phoneNumber.findFirst({
      where: { businessId: businessId, status: 'ASSIGNED' }
    });

    if (!phoneRecord) {
      logger.warn('No phone number found to release', { businessId });
      return { success: false, error: 'No phone number assigned' };
    }

    // Release from Twilio
    await twilioClient
      .incomingPhoneNumbers(phoneRecord.twilioSid)
      .remove();

    logger.info('Phone number released from Twilio', {
      businessId,
      phoneNumber: phoneRecord.phoneNumber
    });

    // Update database
    await prisma.phoneNumber.update({
      where: { id: phoneRecord.id },
      data: {
        status: 'AVAILABLE',
        businessId: null,
        assignedAt: null
      }
    });

    await prisma.business.update({
      where: { id: businessId },
      data: {
        twilioNumber: null,
        status: 'CANCELLED'
      }
    });

    return {
      success: true,
      phoneNumber: phoneRecord.phoneNumber
    };
  } catch (error) {
    logger.error('Error releasing phone number', {
      businessId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update phone number webhook URLs (for system updates)
 * @param {string} phoneNumberSid - Twilio phone number SID
 */
async function updatePhoneNumberWebhooks(phoneNumberSid) {
  try {
    await twilioClient
      .incomingPhoneNumbers(phoneNumberSid)
      .update({
        voiceUrl: `${config.BACKEND_URL}/api/elevenlabs/incoming`,
        voiceMethod: 'POST',
        statusCallback: `${config.BACKEND_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST'
      });

    logger.info('Phone number webhooks updated', { phoneNumberSid });
    return { success: true };
  } catch (error) {
    logger.error('Error updating phone number webhooks', {
      phoneNumberSid,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  searchAvailableNumbers,
  provisionPhoneNumber,
  releasePhoneNumber,
  updatePhoneNumberWebhooks
};
