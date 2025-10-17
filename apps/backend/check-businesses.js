const { prisma } = require('@ai-receptionist/database');

async function checkBusinesses() {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        twilioNumber: true
      }
    });

    console.log('\nBusinesses in database:');
    businesses.forEach(b => {
      console.log(`\n- ${b.name}`);
      console.log(`  Number: ${b.twilioNumber || 'Not configured'}`);
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
