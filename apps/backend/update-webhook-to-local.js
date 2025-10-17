const config = require('./src/utils/config');

const TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = '+18773578556';

// LOCAL ngrok URL
const NGROK_URL = 'https://leonore-dizzied-out.ngrok-free.dev';
const WEBHOOK_URL = `${NGROK_URL}/api/realtime/incoming`;

async function updateWebhook() {
  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

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

    console.log(`Current webhook: ${currentVoiceUrl}`);
    console.log(`New webhook: ${WEBHOOK_URL}`);
    console.log(`\nUpdating...`);

    const updated = await twilio.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: WEBHOOK_URL,
      voiceMethod: 'POST'
    });

    console.log('\n✅ Webhook updated to LOCAL SERVER!');
    console.log(`Phone: ${updated.phoneNumber}`);
    console.log(`Webhook: ${updated.voiceUrl}`);
    console.log(`\n🎙️  Call ${TWILIO_PHONE_NUMBER} to test`);
    console.log(`📊 Watch logs in terminal for real-time debugging\n`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateWebhook();
