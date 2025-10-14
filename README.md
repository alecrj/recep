# AI Receptionist System

A complete multi-tenant SaaS platform that replaces human receptionists with AI. Built for service businesses (HVAC, plumbing, contractors, etc.)

## 🚀 Features

### Core AI Receptionist
- ✅ 24/7 phone answering with natural voice
- ✅ Real-time speech-to-text with Deepgram
- ✅ Intelligent conversation with OpenAI GPT-4
- ✅ Natural text-to-speech with ElevenLabs
- ✅ Appointment booking with Google Calendar
- ✅ Payment collection via Stripe Connect
- ✅ SMS confirmations and reminders
- ✅ Emergency detection and routing
- ✅ Call recording and transcription
- ✅ Customer database management

### Admin Dashboard (Your View)
- Add and manage client businesses
- Configure AI personality and voice
- Set up services, pricing, FAQs
- Test AI before going live
- Monitor usage and costs
- View all businesses and stats

### Business Owner Dashboard (Client View)
- Today's appointments and schedule
- Complete call history with transcripts
- Customer database (CRM)
- Analytics and reports
- Real-time notifications
- Call recordings playback

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database (or use Supabase)
- API keys for:
  - Twilio (phone & SMS)
  - Deepgram (speech-to-text)
  - OpenAI (AI brain)
  - ElevenLabs (text-to-speech)
  - Google Cloud (Calendar API)
  - Stripe (payments)

## 🛠️ Setup Instructions

### 1. Clone and Install

\`\`\`bash
cd ai-receptionist
npm install
\`\`\`

### 2. Database Setup

\`\`\`bash
# Copy environment file
cp .env.example .env

# Edit .env and add your DATABASE_URL
# Example: postgresql://user:password@localhost:5432/ai_receptionist

# Run migrations
cd packages/database
npx prisma migrate dev --name init
npx prisma generate

# Optional: Open Prisma Studio to view database
npx prisma studio
\`\`\`

### 3. Get API Keys

#### Twilio (Phone & SMS)
1. Sign up at https://www.twilio.com/try-twilio
2. Get your Account SID and Auth Token from dashboard
3. Create an API Key: Console → Account → API Keys
4. Add to .env:
   \`\`\`
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_API_KEY=SK...
   TWILIO_API_SECRET=...
   \`\`\`

#### Deepgram (Speech-to-Text)
1. Sign up at https://console.deepgram.com/signup
2. Create an API key
3. Add to .env:
   \`\`\`
   DEEPGRAM_API_KEY=...
   \`\`\`

#### OpenAI (AI Brain)
1. Sign up at https://platform.openai.com/signup
2. Create an API key: https://platform.openai.com/api-keys
3. Add to .env:
   \`\`\`
   OPENAI_API_KEY=sk-...
   \`\`\`

#### ElevenLabs (Text-to-Speech)
1. Sign up at https://elevenlabs.io/
2. Get API key from Profile → API Keys
3. Add to .env:
   \`\`\`
   ELEVENLABS_API_KEY=...
   \`\`\`

#### Google Calendar API
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: \`http://localhost:3000/api/auth/google/callback\`
6. Add to .env:
   \`\`\`
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   \`\`\`

#### Stripe (Payments)
1. Sign up at https://dashboard.stripe.com/register
2. Get your secret key: Developers → API Keys
3. Set up Stripe Connect: https://dashboard.stripe.com/connect/accounts/overview
4. Get webhook secret: Developers → Webhooks → Add endpoint
5. Add to .env:
   \`\`\`
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   \`\`\`

### 4. Create Admin User

\`\`\`bash
# Set admin credentials in .env
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your_secure_password

# Run seed script to create admin
cd packages/database
node seed.js
\`\`\`

### 5. Start Development

\`\`\`bash
# From root directory
npm run dev

# This starts:
# - Backend API (http://localhost:3000)
# - Admin Dashboard (http://localhost:5173)
# - Business Dashboard (http://localhost:5174)
\`\`\`

### 6. Expose Webhook Endpoints (For Twilio)

During development, use ngrok to expose your local server:

\`\`\`bash
# Install ngrok
npm install -g ngrok

# Expose backend
ngrok http 3000

# Copy the https:// URL (e.g., https://abc123.ngrok.io)
# Use this as your BACKEND_URL in .env
# Configure Twilio webhooks to point to:
# - Incoming call: https://abc123.ngrok.io/api/calls/incoming
# - Status callback: https://abc123.ngrok.io/api/calls/status
\`\`\`

## 📱 Testing Your First Call

### 1. Login to Admin Dashboard

1. Go to http://localhost:5173
2. Login with your admin credentials
3. You'll see the admin dashboard

### 2. Add a Test Business

1. Click "Add Business"
2. Fill in:
   - Business Name: "Test HVAC Company"
   - Industry: "HVAC"
   - Owner Email: your@email.com
   - Owner Phone: your phone number
   - Plan: "STARTER"

3. System will provision a Twilio number automatically

### 3. Configure the AI

1. Click on your test business
2. Configure:
   - AI Name: "Sarah"
   - Tone: "Professional and friendly"
   - Greeting: "Thank you for calling Test HVAC. This is Sarah, how can I help you?"
   - Business Hours
   - Services (e.g., "AC Repair - $150+ - 60 minutes")
   - FAQs

3. Save configuration

### 4. Connect Google Calendar

1. Click "Connect Google Calendar"
2. Authorize with your Google account
3. Select which calendar to use
4. System stores refresh token

### 5. Make a Test Call

1. Call the Twilio number assigned to your business
2. The AI will answer!
3. Try saying:
   - "I need to schedule an AC repair"
   - "What are your hours?"
   - "How much does it cost?"

### 6. View the Results

1. Go to Business Dashboard (http://localhost:5174)
2. Login with business owner email
3. See:
   - Call transcript
   - Appointment (if booked)
   - Customer information

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────┐
│         AI RECEPTIONIST SYSTEM              │
├─────────────────────────────────────────────┤
│                                             │
│  Admin Dashboard  ←→  Backend API  ←→  DB  │
│  Business Dashboard                         │
│                                             │
│  Twilio ←→ AI Engine (Deepgram + OpenAI    │
│                       + ElevenLabs)         │
│                                             │
│  Google Calendar API  ←→  Calendar Service  │
│  Stripe Connect       ←→  Payment Service   │
│                                             │
└─────────────────────────────────────────────┘
\`\`\`

### Call Flow

1. Customer calls business number
2. Twilio forwards to your backend webhook
3. WebSocket stream established
4. Audio streamed to Deepgram (speech-to-text)
5. Text sent to OpenAI GPT-4 (conversation AI)
6. Response generated and sent to ElevenLabs (text-to-speech)
7. Audio streamed back to caller via Twilio
8. If booking: Check Google Calendar → Book appointment → Send SMS confirmation

## 📊 Costs Per Call (Approximate)

- Twilio Voice: $0.0085/min × 5 min = $0.04
- Deepgram STT: $0.0043/min × 5 min = $0.02
- OpenAI GPT-4: ~$0.03 per call
- ElevenLabs TTS: ~$0.05 per call
- Twilio SMS: $0.0079 per text
- **Total: ~$0.15-0.25 per call**

## 💰 Pricing Strategy

### Your Pricing (Per Business)
- Starter: $1,299/month (up to 1,000 minutes)
- Professional: $1,999/month (up to 2,500 minutes)
- Enterprise: Custom pricing

### Your Costs (Per Business, ~1,500 min/month)
- Twilio: ~$180
- Deepgram: ~$40
- OpenAI: ~$50
- ElevenLabs: ~$30
- SMS: ~$20
- Infrastructure: ~$20
- **Total: ~$340/month**

### Your Profit
- **$959/month per client (75% margin)**
- At 50 clients: $47,950/month profit ($575k/year)

## 🚀 Deployment

### Option 1: Railway (Easiest)

\`\`\`bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
\`\`\`

### Option 2: Digital Ocean / AWS / GCP

1. Build the apps:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy backend to any Node.js hosting
3. Deploy frontends to Vercel/Netlify
4. Set environment variables on hosting platform
5. Update Twilio webhooks with production URLs

## 🔧 Development

### Project Structure

\`\`\`
ai-receptionist/
├── apps/
│   ├── backend/           # Express API server
│   ├── admin-dashboard/   # React admin interface
│   └── business-dashboard/# React business owner interface
├── packages/
│   ├── database/          # Prisma schema & migrations
│   ├── shared-types/      # TypeScript types
│   └── ai-core/           # AI conversation logic
├── scripts/               # Utility scripts
├── .env.example          # Environment template
└── turbo.json            # Monorepo configuration
\`\`\`

### Key Files

- \`packages/database/schema.prisma\` - Database schema
- \`apps/backend/src/server.js\` - Main Express server
- \`apps/backend/src/ai/conversationHandler.js\` - AI conversation engine
- \`apps/backend/src/services/twilio.service.js\` - Twilio integration
- \`apps/backend/src/routes/calls.js\` - Call handling webhooks

## 🐛 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Run migrations: \`cd packages/database && npx prisma migrate dev\`

### "Twilio webhook failed"
- Ensure ngrok is running and BACKEND_URL matches ngrok URL
- Check Twilio webhook signature verification
- Look at backend logs for errors

### "AI not responding"
- Check OPENAI_API_KEY is valid
- Check DEEPGRAM_API_KEY is valid
- Check ELEVENLABS_API_KEY is valid
- Monitor backend logs for API errors

### "Calendar integration not working"
- Re-authorize Google OAuth
- Check Google Calendar API is enabled in Google Cloud Console
- Verify redirect URI matches exactly

## 📚 Next Steps

1. **Test thoroughly** - Make calls, book appointments, test edge cases
2. **Refine prompts** - Adjust AI personality and responses
3. **Add monitoring** - Set up error tracking (Sentry)
4. **Scale infrastructure** - Move to production database
5. **Marketing** - Build landing page, start outreach
6. **First customer** - Onboard a real business
7. **Iterate** - Improve based on real usage

## 🤝 Support

For issues or questions:
- Check logs: \`apps/backend/logs/\`
- Review database: \`npx prisma studio\`
- Test APIs individually before full integration

## 📄 License

MIT License - Build amazing things!

---

**Built with:** Node.js, React, PostgreSQL, Prisma, Express, Twilio, OpenAI, Deepgram, ElevenLabs, Google Calendar API, Stripe

**Ready to replace receptionists and build a profitable SaaS business!** 🚀
