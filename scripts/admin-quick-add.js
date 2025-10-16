/**
 * Quick Admin Script - Add Business with Twilio Number
 * Run this to test multi-tenant setup
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBusiness(data) {
  try {
    // Create business
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

    console.log(`✅ Created business: ${business.name} (${business.id})`);

    // Create config
    const config = await prisma.businessConfig.create({
      data: {
        businessId: business.id,
        aiAgentName: data.aiAgentName || 'Sarah',
        industry: 'HVAC',
        businessAddress: data.businessAddress,
        serviceArea: data.serviceArea,
        serviceAreaCities: data.cities || [],
        businessHoursStart: data.hoursStart || '08:00',
        businessHoursEnd: data.hoursEnd || '18:00',
        emergencyContactName: data.emergencyTechName,
        emergencyContactPhone: data.emergencyTechPhone,
        afterHoursPhone: data.ownerPhone,
        companyEmail: data.companyEmail || data.ownerEmail,
        companyWebsite: data.website || null,
        brandsServiced: data.brands || ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem'],
        bookingEnabled: true,
        reminderEnabled: true,
      },
    });

    console.log(`✅ Created config for ${business.name}`);
    console.log(`\n📞 Twilio Number: ${business.twilioNumber}`);
    console.log(`🔗 Webhook: https://ai-receptionistbackend-production.up.railway.app/api/calls/incoming\n`);

    return business;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function listAllBusinesses() {
  const businesses = await prisma.business.findMany({
    include: { config: true },
  });

  console.log(`\n📊 Total Businesses: ${businesses.length}\n`);

  businesses.forEach((biz, i) => {
    console.log(`${i + 1}. ${biz.name}`);
    console.log(`   Phone: ${biz.twilioNumber}`);
    console.log(`   Plan: ${biz.plan}`);
    console.log(`   Status: ${biz.status}`);
    console.log(`   AI Agent: ${biz.config?.aiAgentName || 'Not set'}`);
    console.log(`   Address: ${biz.config?.businessAddress || 'Not set'}`);
    console.log('');
  });
}

// Example: Add 3 test businesses
async function addTestBusinesses() {
  console.log('🏢 Adding Test Businesses...\n');

  // Business 1: Bob's HVAC
  await addBusiness({
    businessName: "Bob's HVAC",
    ownerName: 'Bob Smith',
    ownerEmail: 'bob@bobshvac.com',
    ownerPhone: '+14805551234',
    twilioNumber: '+18773578556', // Your current number
    businessAddress: '123 Main St, Phoenix, AZ 85001',
    serviceArea: 'Phoenix metro area',
    cities: ['Phoenix', 'Scottsdale', 'Tempe'],
    hoursStart: '07:00',
    hoursEnd: '19:00',
    aiAgentName: 'Sarah',
    emergencyTechName: 'Mike (Tech Lead)',
    emergencyTechPhone: '+14805559999',
    website: 'https://bobshvac.com',
    brands: ['Carrier', 'Trane', 'Lennox'],
  });

  console.log('---\n');

  // You can add more test businesses here with different numbers
  // Just buy more Twilio numbers and add them

  await listAllBusinesses();
  await prisma.$disconnect();
}

// Run if called directly
if (require.main === module) {
  addTestBusinesses().catch(console.error);
}

module.exports = { addBusiness, listAllBusinesses };
