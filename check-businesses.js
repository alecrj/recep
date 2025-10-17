const { PrismaClient } = require('./packages/database/dist');
const prisma = new PrismaClient();

async function checkBusinesses() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        twilioNumber: true
      }
    });

    console.log('Businesses in database:');
    businesses.forEach(b => {
      console.log(`- ${b.name}: ${b.twilioNumber || 'No number configured'}`);
      console.log(`  ID: ${b.id}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkBusinesses();
