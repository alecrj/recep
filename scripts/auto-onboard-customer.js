/**
 * SEMI-AUTOMATED CUSTOMER ONBOARDING
 *
 * This script:
 * 1. Buys Twilio number via API
 * 2. Configures webhook automatically
 * 3. Creates business in database
 * 4. Outputs welcome info for customer
 *
 * Usage:
 * DATABASE_URL="..." TWILIO_ACCOUNT_SID="..." TWILIO_AUTH_TOKEN="..." \
 * node scripts/auto-onboard-customer.js
 */

const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

const prisma = new PrismaClient();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'https://ai-receptionistbackend-production.up.railway.app';

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function purchaseAndConfigureNumber(areaCode = '480') {
  console.log(`🔍 Searching for available numbers in area code ${areaCode}...`);

  // Search for available numbers
  const availableNumbers = await twilioClient.availablePhoneNumbers('US').local.list({
    areaCode,
    limit: 5,
  });

  if (availableNumbers.length === 0) {
    throw new Error(`No available numbers in area code ${areaCode}`);
  }

  const selectedNumber = availableNumbers[0].phoneNumber;
  console.log(`✅ Found number: ${selectedNumber}`);

  // Purchase the number
  console.log('💳 Purchasing number...');
  const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: selectedNumber,
    voiceUrl: `${BACKEND_URL}/api/calls/incoming`,
    voiceMethod: 'POST',
    friendlyName: 'AI Receptionist Line',
  });

  console.log(`✅ Number purchased: ${purchasedNumber.phoneNumber}`);
  console.log(`✅ Webhook configured: ${BACKEND_URL}/api/calls/incoming`);

  return purchasedNumber.phoneNumber;
}

async function createBusinessInDatabase(data) {
  console.log(`\n📝 Creating business in database...`);

  const business = await prisma.business.create({
    data: {
      name: data.businessName,
      industry: 'HVAC',
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      twilioNumber: data.twilioNumber,
      status: 'ACTIVE',
      plan: data.plan || 'PROFESSIONAL',
    },
  });

  const config = await prisma.businessConfig.create({
    data: {
      businessId: business.id,
      aiAgentName: data.aiAgentName || 'Sarah',
      industry: 'HVAC',
      businessAddress: data.businessAddress,
      serviceArea: data.serviceArea || 'Local area',
      serviceAreaCities: data.cities || [],
      businessHoursStart: data.hoursStart || '08:00',
      businessHoursEnd: data.hoursEnd || '18:00',
      emergencyContactName: data.emergencyTechName,
      emergencyContactPhone: data.emergencyTechPhone || data.ownerPhone,
      afterHoursPhone: data.ownerPhone,
      companyEmail: data.companyEmail || data.ownerEmail,
      companyWebsite: data.website || null,
      brandsServiced: data.brands || ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem'],
      bookingEnabled: true,
      reminderEnabled: true,
    },
  });

  console.log(`✅ Business created: ${business.id}`);
  console.log(`✅ Config created: ${config.id}`);

  return business;
}

async function onboardCustomer(customerData) {
  try {
    console.log(`\n🚀 Starting automated onboarding for: ${customerData.businessName}\n`);

    // Step 1: Buy and configure Twilio number
    const twilioNumber = await purchaseAndConfigureNumber(customerData.areaCode || '480');

    // Step 2: Create business in database
    const business = await createBusinessInDatabase({
      ...customerData,
      twilioNumber,
    });

    // Step 3: Output success info
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ONBOARDING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\nBusiness: ${business.name}`);
    console.log(`Phone Number: ${twilioNumber}`);
    console.log(`Plan: ${business.plan}`);
    console.log(`Status: ${business.status}`);
    console.log(`\nOwner: ${business.ownerName}`);
    console.log(`Email: ${business.ownerEmail}`);
    console.log(`\n📞 Test it: Call ${twilioNumber} right now!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Send welcome email to ${business.ownerEmail}`);
    console.log(`   2. Provide dashboard login`);
    console.log(`   3. Schedule training call\n`);

    await prisma.$disconnect();
    return business;
  } catch (error) {
    console.error('\n❌ Onboarding failed:', error.message);
    await prisma.$disconnect();
    throw error;
  }
}

// Example usage
const exampleCustomer = {
  businessName: 'Phoenix Air Experts',
  ownerName: 'John Smith',
  ownerEmail: 'john@phoenixairexperts.com',
  ownerPhone: '+14805559876',
  areaCode: '480',
  businessAddress: '456 Desert Dr, Phoenix, AZ 85001',
  serviceArea: 'Greater Phoenix area',
  cities: ['Phoenix', 'Scottsdale', 'Mesa', 'Tempe'],
  hoursStart: '07:00',
  hoursEnd: '19:00',
  aiAgentName: 'Jessica',
  emergencyTechName: 'Tom (Lead Tech)',
  website: 'https://phoenixairexperts.com',
  brands: ['Carrier', 'Trane', 'Rheem'],
  plan: 'PROFESSIONAL',
};

// Run if called directly
if (require.main === module) {
  // Check for required env vars
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing required environment variables:');
    console.error('   TWILIO_ACCOUNT_SID');
    console.error('   TWILIO_AUTH_TOKEN');
    console.error('   DATABASE_URL');
    process.exit(1);
  }

  // Run with example data (or modify for real customer)
  onboardCustomer(exampleCustomer).catch(console.error);
}

module.exports = { onboardCustomer, purchaseAndConfigureNumber };
