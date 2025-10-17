const config = require('./src/utils/config');

/**
 * Update Twilio Phone Number Webhook to use Realtime API
 */

const TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = config.TWILIO_PHONE_NUMBER || '+18773578556';

// Production backend URL
const BACKEND_URL = 'https://ai-receptionistbackend-production.up.railway.app';
const NEW_WEBHOOK_URL = `${BACKEND_URL}/api/realtime/incoming`;

async function updateWebhook() {
  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    console.log('Fetching current phone number configuration...');
    console.log(`Phone number: ${TWILIO_PHONE_NUMBER}`);

    // Get the phone number SID
    const phoneNumbers = await twilio.incomingPhoneNumbers.list({
      phoneNumber: TWILIO_PHONE_NUMBER,
      limit: 1
    });

    if (phoneNumbers.length === 0) {
      console.error(`No phone number found matching ${TWILIO_PHONE_NUMBER}`);
      process.exit(1);
    }

    const phoneNumberSid = phoneNumbers[0].sid;
    const currentVoiceUrl = phoneNumbers[0].voiceUrl;

    console.log(`\nCurrent voice webhook: ${currentVoiceUrl}`);
    console.log(`New voice webhook: ${NEW_WEBHOOK_URL}`);

    // Update the webhook
    console.log('\nUpdating webhook...');
    const updated = await twilio.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: NEW_WEBHOOK_URL,
      voiceMethod: 'POST'
    });

    console.log('\n✅ Webhook updated successfully!');
    console.log(`Phone number: ${updated.phoneNumber}`);
    console.log(`Voice URL: ${updated.voiceUrl}`);
    console.log(`Voice Method: ${updated.voiceMethod}`);
    console.log('\n🎉 Ready to receive calls with OpenAI Realtime API!');
    console.log(`\nCall ${TWILIO_PHONE_NUMBER} to test the new system.`);

  } catch (error) {
    console.error('Error updating webhook:', error.message);
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

updateWebhook();
