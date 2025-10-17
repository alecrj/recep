#!/usr/bin/env node
/**
 * Setup Test User Script
 * Creates test admin and business accounts for local development
 */

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up test users...\n');

  try {
    // 1. Create Admin User
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@voxi.ai' },
      update: {
        password: adminPassword,
        name: 'Admin User',
        role: 'SUPER_ADMIN',
      },
      create: {
        email: 'admin@voxi.ai',
        password: adminPassword,
        name: 'Admin User',
        role: 'SUPER_ADMIN',
      },
    });

    console.log('✅ Admin created:');
    console.log(`   Email: admin@voxi.ai`);
    console.log(`   Password: admin123\n`);

    // 2. Create Test Business (Bob's HVAC)
    console.log('Creating test business...');
    const businessPassword = await bcrypt.hash('test123', 10);

    // Check if business exists first
    let business = await prisma.business.findFirst({
      where: { ownerEmail: 'bob@bobshvac.com' },
    });

    if (business) {
      // Update existing business
      business = await prisma.business.update({
        where: { id: business.id },
        data: {
          name: "Bob's HVAC",
          password: businessPassword,
          ownerName: 'Bob Johnson',
          ownerPhone: '+18775578556',
          industry: 'hvac',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          twilioNumber: '+18775578556',
        },
      });
    } else {
      // Create new business
      business = await prisma.business.create({
        data: {
          name: "Bob's HVAC",
          ownerEmail: 'bob@bobshvac.com',
          password: businessPassword,
          ownerName: 'Bob Johnson',
          ownerPhone: '+18775578556',
          industry: 'hvac',
          status: 'ACTIVE',
          plan: 'PROFESSIONAL',
          twilioNumber: '+18775578556',
        },
      });
    }

    console.log('✅ Business created:');
    console.log(`   Email: bob@bobshvac.com`);
    console.log(`   Password: test123`);
    console.log(`   Business: Bob's HVAC\n`);

    // 3. Create/Update Business Config with NEW GREETING
    console.log('Configuring business settings...');

    await prisma.businessConfig.upsert({
      where: { businessId: business.id },
      update: {
        aiAgentName: 'Sarah',
        aiTone: 'professional',
        greetingMessage: "Thanks for calling Bob's HVAC, how can we help?",
        businessHoursStart: '08:00',
        businessHoursEnd: '18:00',
        appointmentDuration: 90,
        bookingEnabled: true,
        paymentEnabled: false,
        reminderEnabled: true,
      },
      create: {
        businessId: business.id,
        aiAgentName: 'Sarah',
        aiTone: 'professional',
        greetingMessage: "Thanks for calling Bob's HVAC, how can we help?",
        businessHoursStart: '08:00',
        businessHoursEnd: '18:00',
        appointmentDuration: 90,
        bookingEnabled: true,
        paymentEnabled: false,
        reminderEnabled: true,
      },
    });

    console.log('✅ Business config updated with new greeting\n');

    console.log('🎉 Setup complete!\n');
    console.log('📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Dashboard: http://localhost:5173');
    console.log('  Email: admin@voxi.ai');
    console.log('  Password: admin123\n');
    console.log('Business Dashboard: http://localhost:5174');
    console.log('  Email: bob@bobshvac.com');
    console.log('  Password: test123');
    console.log(`  Phone: +1 (877) 557-8556\n`);
    console.log('Backend API: http://localhost:3000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
