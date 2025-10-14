const { prisma } = require('./index');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../../.env' });

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@airec.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${adminEmail}`);
      console.log('   Skipping admin creation\n');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'System Admin',
          role: 'SUPER_ADMIN',
        },
      });

      console.log('✅ Created admin user');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n');
    }

    // Create demo business (optional)
    const demoBusinessEmail = 'demo@testbusiness.com';
    const existingBusiness = await prisma.business.findFirst({
      where: { ownerEmail: demoBusinessEmail },
    });

    if (!existingBusiness) {
      const demoBusiness = await prisma.business.create({
        data: {
          name: 'Demo HVAC Company',
          industry: 'HVAC',
          ownerEmail: demoBusinessEmail,
          ownerPhone: '+15555551234',
          ownerName: 'John Demo',
          status: 'TRIAL',
          plan: 'STARTER',
          phoneNumber: '+15555555678', // Placeholder
          config: {
            create: {
              aiAgentName: 'Sarah',
              aiVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel from ElevenLabs
              aiTone: 'professional',
              greetingMessage:
                'Thank you for calling Demo HVAC Company. This is Sarah, how can I help you today?',
              businessHours: {
                monday: { open: '08:00', close: '17:00' },
                tuesday: { open: '08:00', close: '17:00' },
                wednesday: { open: '08:00', close: '17:00' },
                thursday: { open: '08:00', close: '17:00' },
                friday: { open: '08:00', close: '17:00' },
                saturday: { open: '09:00', close: '14:00' },
                sunday: { open: 'closed', close: 'closed' },
              },
              services: [
                { name: 'AC Repair', price: '$150+', duration: 60 },
                { name: 'Heating Repair', price: '$150+', duration: 60 },
                { name: 'Installation', price: '$3000+', duration: 240 },
                { name: 'Maintenance', price: '$99', duration: 30 },
              ],
              faqs: [
                {
                  question: 'What areas do you serve?',
                  answer: 'We serve the entire metro area within 50 miles.',
                },
                {
                  question: 'Do you offer emergency service?',
                  answer: 'Yes, we offer 24/7 emergency service. Just let us know it\'s urgent.',
                },
                {
                  question: 'Do you offer financing?',
                  answer: 'Yes, we offer flexible financing options for major installations.',
                },
              ],
              emergencyKeywords: ['emergency', 'urgent', 'flooding', 'no heat', 'no ac'],
              transferKeywords: ['manager', 'owner', 'human', 'person', 'real person'],
            },
          },
        },
        include: {
          config: true,
        },
      });

      console.log('✅ Created demo business');
      console.log(`   Business: ${demoBusiness.name}`);
      console.log(`   Owner: ${demoBusiness.ownerEmail}\n`);
    }

    console.log('✅ Seeding complete!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
