const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function fixVoiceId() {
  try {
    console.log('Updating voice ID to use default (Rachel - premade voice)...');

    // Update all business configs to use Adam voice (default in code)
    // This is a premade voice that should work with any ElevenLabs account
    const result = await prisma.businessConfig.updateMany({
      where: {},
      data: {
        aiVoiceId: 'pNInz6obpgDQGcFmaJgB'  // Adam - friendly male voice
      }
    });

    console.log(`Updated ${result.count} business configs`);

    // Verify
    const configs = await prisma.businessConfig.findMany({
      select: {
        id: true,
        aiVoiceId: true,
        aiAgentName: true
      }
    });

    console.log('\nCurrent configs:');
    configs.forEach(c => {
      console.log(`  - ID: ${c.id}, Voice: ${c.aiVoiceId || 'DEFAULT'}, Agent: ${c.aiAgentName}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixVoiceId();
