const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  // Find Bob's business
  const business = await prisma.business.findFirst({
    where: { email: 'bob@bobshvac.com' },
    include: { config: true }
  });

  console.log('\n=== Bob Business Config ===');
  console.log('Business ID:', business.id);
  console.log('Business Name:', business.name);
  console.log('Greeting Message:', business.config?.greetingMessage);
  console.log('Business Hours:', business.config?.businessHours);
  console.log('\n=== Full Config ===');
  console.log(JSON.stringify(business.config, null, 2));

  await prisma.$disconnect();
}

checkConfig().catch(console.error);
