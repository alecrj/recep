# Quick Start Guide - Get Running in 30 Minutes

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed (or Supabase account)
- [ ] Credit card for API signups (most have free tiers)

## Step 1: Install Dependencies (5 minutes)

\`\`\`bash
cd ai-receptionist
npm install
\`\`\`

## Step 2: Get API Keys (15 minutes)

### Twilio (3 min)
1. Go to https://www.twilio.com/try-twilio
2. Sign up (gets $15 free credit)
3. Dashboard → Account → Keys & Credentials
4. Copy: Account SID, Auth Token
5. Create API Key → Copy: API Key SID, Secret

### Deepgram (2 min)
1. Go to https://console.deepgram.com/signup
2. Sign up (gets $200 free credit)
3. API Keys → Create Key
4. Copy the API key

### OpenAI (2 min)
1. Go to https://platform.openai.com/signup
2. Sign up
3. API Keys → Create new secret key
4. Copy the key (starts with sk-)

### ElevenLabs (2 min)
1. Go to https://elevenlabs.io/sign-up
2. Sign up (free tier available)
3. Profile → API Keys
4. Copy the key

### Google Calendar (4 min)
1. Go to https://console.cloud.google.com
2. Create new project
3. APIs & Services → Enable APIs → Search "Google Calendar API" → Enable
4. Credentials → Create Credentials → OAuth client ID
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
7. Copy: Client ID, Client Secret

### Stripe (2 min)
1. Go to https://dashboard.stripe.com/register
2. Sign up
3. Developers → API keys
4. Copy: Secret key (starts with sk_test_)

## Step 3: Configure Environment (2 minutes)

\`\`\`bash
# Copy the example file
cp .env.example .env

# Edit .env and paste your API keys
nano .env  # or use your favorite editor
\`\`\`

Fill in:
\`\`\`
DATABASE_URL="postgresql://user:password@localhost:5432/ai_receptionist"
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY=SK...
TWILIO_API_SECRET=...
DEEPGRAM_API_KEY=...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
JWT_SECRET=your_random_string_here_make_it_long_and_random
\`\`\`

## Step 4: Setup Database (3 minutes)

\`\`\`bash
# Run migrations
cd packages/database
npx prisma migrate dev --name init
npx prisma generate

# Create admin user
node seed.js

# Go back to root
cd ../..
\`\`\`

## Step 5: Start the System (1 minute)

\`\`\`bash
npm run dev
\`\`\`

This starts:
- ✅ Backend API on http://localhost:3000
- ✅ Admin Dashboard on http://localhost:5173
- ✅ Business Dashboard on http://localhost:5174

## Step 6: Setup Ngrok for Webhooks (2 minutes)

In a new terminal:

\`\`\`bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
\`\`\`

Update .env:
\`\`\`
BACKEND_URL=https://abc123.ngrok.io
\`\`\`

Restart the backend (Ctrl+C and `npm run dev` again)

## Step 7: Test It Out (2 minutes)

### Login to Admin
1. Open http://localhost:5173
2. Email: admin@airec.com
3. Password: ChangeMe123!

### Buy a Twilio Number
1. Go to Twilio Console → Phone Numbers → Buy a number
2. Choose any number
3. Click "Buy"

### Configure Twilio Webhook
1. Click on your number
2. Voice Configuration:
   - A CALL COMES IN: Webhook
   - URL: `https://YOUR_NGROK_URL/api/calls/incoming`
   - HTTP POST
3. Save

### Add Your First Business
1. In Admin Dashboard → Add Business
2. Fill in:
   - Name: "My Test Company"
   - Industry: "HVAC"
   - Owner Email: your@email.com
   - Phone: your phone
   - Twilio Number: (paste the number you bought)
3. Configure AI settings
4. Save

### Make a Test Call!
1. Call your Twilio number
2. The AI will answer!
3. Try: "I need to schedule an appointment"

### View Results
1. Login to Business Dashboard: http://localhost:5174
2. Email: your@email.com (from business setup)
3. See your call transcript!

## Common Issues

### "Cannot connect to database"
\`\`\`bash
# Start PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo service postgresql start

# Or use Supabase (cloud PostgreSQL):
# 1. Go to https://supabase.com
# 2. Create project
# 3. Copy connection string
# 4. Update DATABASE_URL in .env
\`\`\`

### "Twilio webhook not working"
- Make sure ngrok is running
- Make sure BACKEND_URL in .env matches ngrok URL (with https://)
- Restart backend after changing .env
- Check Twilio webhook URL matches exactly

### "OpenAI API error"
- Check your API key is correct
- Make sure you have credits: https://platform.openai.com/account/billing
- Check usage limits

## Next Steps

1. ✅ **Test more scenarios**: Emergency calls, questions, different services
2. ✅ **Connect Google Calendar**: Business Config → Connect Calendar
3. ✅ **Test appointment booking**: Have AI book you an appointment
4. ✅ **Enable Stripe**: Connect Stripe for payment collection
5. ✅ **Customize prompts**: Adjust AI personality and responses
6. ✅ **Add more businesses**: Test multi-tenant isolation

## You're Ready!

You now have a fully functional AI receptionist system. Time to:
- Refine the AI prompts for your use case
- Build out the frontend dashboards
- Start marketing to potential clients
- Scale to your first paying customer

**Need help?** Check README.md for detailed documentation.

**Ready to deploy?** See DEPLOYMENT.md for production setup.

🚀 Happy building!
