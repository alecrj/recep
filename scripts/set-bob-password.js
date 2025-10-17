/**
 * Set Password for Bob's HVAC Business
 */

const { prisma } = require('@ai-receptionist/database');
const bcrypt = require('bcrypt');

async function setPassword() {
  const business = await prisma.business.findFirst({
    where: { ownerEmail: 'bob@bobshvac.com' }
  });

  if (!business) {
    console.log('❌ Business not found');
    await prisma.$disconnect();
    return;
  }

  const password = 'BobHVAC123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.business.update({
    where: { id: business.id },
    data: { password: hashedPassword }
  });

  console.log('✅ Password set for Bob\'s HVAC');
  console.log('');
  console.log('📧 Email: bob@bobshvac.com');
  console.log('🔑 Password:', password);
  console.log('');
  console.log('🔗 Business Dashboard: http://localhost:5174');
  console.log('   (or your deployed URL)');

  await prisma.$disconnect();
}

setPassword();
