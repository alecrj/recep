/**
 * Create Admin User
 * Run this to create your first admin account
 */

const { prisma } = require('@ai-receptionist/database');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const email = 'admin@airec.com';
  const password = 'ChangeMe123!';
  const name = 'Admin User';

  try {
    // Check if admin exists
    const existing = await prisma.admin.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('✅ Admin already exists:', email);
      console.log('   Use this to login to admin dashboard');
      await prisma.$disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin created successfully!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('');
    console.log('🔗 Admin Dashboard: http://localhost:5173');
    console.log('   (or your deployed URL)');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run
createAdmin();
