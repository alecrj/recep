/**
 * Quick Business Setup Script
 * Run this to add a new HVAC company to your AI receptionist system
 *
 * Usage: node scripts/setup-business.js
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupBusiness() {
  console.log('\n🏢 AI Receptionist - New Business Setup\n');
  console.log('Let\'s get a new HVAC company set up!\n');

  // Basic Info
  const businessName = await ask('Business Name: ');
  const ownerName = await ask('Owner Name: ');
  const ownerEmail = await ask('Owner Email: ');
  const ownerPhone = await ask('Owner Phone (for emergencies): ');

  // Twilio Number
  console.log('\n📞 Phone Number');
  const twilioNumber = await ask('Twilio Phone Number (e.g., +18773578556): ');

  // Location & Service Area
  console.log('\n📍 Location & Service');
  const address = await ask('Business Address: ');
  const serviceArea = await ask('Service Area Description (e.g., "Phoenix metro area"): ');
  const cities = await ask('Cities Serviced (comma-separated): ');

  // Hours
  console.log('\n🕐 Business Hours');
  const hoursStart = await ask('Opening Time (e.g., 08:00): ') || '08:00';
  const hoursEnd = await ask('Closing Time (e.g., 18:00): ') || '18:00';

  // AI Configuration
  console.log('\n🤖 AI Receptionist');
  const agentName = await ask('AI Receptionist Name (default: Sarah): ') || 'Sarah';

  // Emergency Contacts
  console.log('\n🚨 Emergency Contacts');
  const emergencyTechName = await ask('On-Call Tech Name: ');
  const emergencyTechPhone = await ask('On-Call Tech Phone: ');
  const afterHoursPhone = await ask('After Hours Phone (optional): ') || ownerPhone;

  // Company Branding
  console.log('\n🎨 Company Info');
  const website = await ask('Website (optional): ');
  const email = await ask('Company Email (for confirmations): ') || ownerEmail;
  const yearsInBusiness = await ask('Years in Business (optional): ');
  const licenseNumber = await ask('License Number (optional): ');
  const brands = await ask('Brands Serviced (comma-separated, or press enter for defaults): ');

  // Confirm
  console.log('\n📋 Summary:');
  console.log(`Business: ${businessName}`);
  console.log(`Owner: ${ownerName} (${ownerEmail})`);
  console.log(`Phone: ${twilioNumber}`);
  console.log(`Location: ${address}`);
  console.log(`Service Area: ${serviceArea}`);
  console.log(`Hours: ${hoursStart} - ${hoursEnd}`);
  console.log(`AI Agent: ${agentName}`);
  console.log(`Emergency Tech: ${emergencyTechName} (${emergencyTechPhone})`);

  const confirm = await ask('\nCreate this business? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    rl.close();
    await prisma.$disconnect();
    return;
  }

  try {
    // Create business
    const business = await prisma.business.create({
      data: {
        name: businessName,
        industry: 'HVAC',
        ownerName,
        ownerEmail,
        ownerPhone,
        twilioNumber,
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
      },
    });

    console.log(`✅ Created business: ${business.id}`);

    // Create business config
    const config = await prisma.businessConfig.create({
      data: {
        businessId: business.id,
        aiAgentName: agentName,
        industry: 'HVAC',
        businessAddress: address,
        serviceArea,
        serviceAreaCities: cities ? cities.split(',').map(c => c.trim()) : [],
        businessHoursStart: hoursStart,
        businessHoursEnd: hoursEnd,
        emergencyContactName: emergencyTechName,
        emergencyContactPhone: emergencyTechPhone,
        afterHoursPhone,
        companyEmail: email,
        companyWebsite: website || null,
        yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
        licenseNumber: licenseNumber || null,
        brandsServiced: brands
          ? brands.split(',').map(b => b.trim())
          : ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'York', 'Amana'],
        bookingEnabled: true,
        reminderEnabled: true,
      },
    });

    console.log(`✅ Created config: ${config.id}`);

    console.log('\n🎉 Success! Business setup complete!\n');
    console.log(`📞 Twilio Number: ${twilioNumber}`);
    console.log(`🔗 Make sure this number's webhook points to:`);
    console.log(`   https://your-railway-url.railway.app/api/calls/incoming\n`);
    console.log(`📊 View in dashboard: https://your-admin-dashboard.app/businesses/${business.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  rl.close();
  await prisma.$disconnect();
}

setupBusiness().catch(console.error);
