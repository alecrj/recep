#!/usr/bin/env node

/**
 * Setup Script for AI Receptionist System
 * Validates environment and guides through initial configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI Receptionist System - Setup\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found. Creating from .env.example...\n');

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file');
    console.log('📝 Please edit .env and add your API keys\n');
  } else {
    console.error('❌ .env.example not found!');
    process.exit(1);
  }
}

// Read .env and check for missing values
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const missingKeys = [];

const requiredKeys = [
  'DATABASE_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'DEEPGRAM_API_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'JWT_SECRET',
];

requiredKeys.forEach((key) => {
  const line = envLines.find((l) => l.startsWith(key));
  if (!line || line.includes('your_') || line.split('=')[1]?.trim() === '') {
    missingKeys.push(key);
  }
});

console.log('🔍 Checking environment configuration...\n');

if (missingKeys.length > 0) {
  console.log('❌ Missing or incomplete environment variables:\n');
  missingKeys.forEach((key) => {
    console.log(`   - ${key}`);
  });
  console.log('\n📖 See README.md for instructions on getting API keys\n');
  process.exit(1);
}

console.log('✅ Environment configuration looks good!\n');

console.log('📋 Next steps:\n');
console.log('1. Set up database:');
console.log('   cd packages/database');
console.log('   npx prisma migrate dev --name init');
console.log('   npx prisma generate\n');
console.log('2. Create admin user:');
console.log('   node packages/database/seed.js\n');
console.log('3. Start development servers:');
console.log('   npm run dev\n');
console.log('4. Open admin dashboard:');
console.log('   http://localhost:5173\n');

console.log('🎉 Setup complete! Ready to build your AI receptionist system.\n');
