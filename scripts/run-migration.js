const { prisma } = require('@ai-receptionist/database');

async function runMigration() {
  try {
    console.log('Running migration: add Stripe fields...');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS businesses_stripe_customer_id_key
      ON businesses(stripe_customer_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS businesses_stripe_subscription_id_key
      ON businesses(stripe_subscription_id)
    `);

    console.log('✅ Migration completed successfully!');
    console.log('Added stripe_customer_id and stripe_subscription_id columns to businesses table');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
