# AI Receptionist - Complete Master Blueprint
## The Undeniable HVAC Receptionist System

> **⚠️ CRITICAL: This is the ONLY master document.**
> **NO other .md files should be created.** Update THIS file only.
> All progress, status, and plans live HERE.

---

## 🎯 BUSINESS MODEL

### Pricing Tiers (LOCKED IN)
- **Starter: $299/month**
  - 1 phone number
  - Up to 500 minutes/month
  - Basic appointment booking
  - Email support

- **Professional: $799/month**
  - 1 phone number
  - Up to 2,000 minutes/month
  - Advanced features (emergency routing, SMS)
  - Priority support
  - Call analytics dashboard

- **Enterprise: $1,499/month**
  - Multiple phone numbers
  - Unlimited minutes
  - White-label option
  - Custom integrations
  - Dedicated account manager
  - API access

### Revenue Model
- Base subscription (monthly recurring)
- Overage: $0.15/minute beyond plan limits
- Setup fee: $99 one-time (waived for annual)
- Phone number: $10/month per additional number

### Target Market
- HVAC companies (primary)
- Plumbing companies
- Electrical contractors
- Any home service business with 1-20 employees

### Customer Acquisition Cost Target
- CAC: $300-500
- LTV: $7,000+ (24+ month retention)
- Payback period: 1-2 months

---

## 🏗️ TECHNICAL ARCHITECTURE

### Current Stack
```
Frontend:
- Admin Dashboard (Next.js) - For YOU to manage all businesses
- Business Dashboard (Next.js) - For CUSTOMERS to see their calls/appointments

Backend:
- Node.js/Express API (Railway)
- Twilio Media Streams (real-time voice)
- OpenAI GPT-4o (conversation AI)
- ElevenLabs (text-to-speech)
- Deepgram (speech-to-text)

Database:
- PostgreSQL (Supabase)
- Prisma ORM

Infrastructure:
- Railway (backend hosting)
- Vercel (dashboard hosting)
- Twilio (phone infrastructure)
```

### Multi-Tenant Architecture
- Single codebase serves all customers
- Database routing by Twilio phone number
- Each business completely isolated
- Zero cross-contamination

---

## 📊 DATABASE SCHEMA (COMPLETE)

### Business Table
Every HVAC company you sell to:
```
- id, name, industry
- ownerEmail, ownerName, ownerPhone
- twilioNumber (their AI phone number)
- status (TRIAL, ACTIVE, SUSPENDED, CANCELLED)
- plan (STARTER, PROFESSIONAL, ENTERPRISE)
- createdAt, updatedAt
```

### BusinessConfig Table
All the company-specific details:
```
LOCATION & SERVICE:
- businessAddress
- serviceArea (description)
- serviceAreaCities[] (array of cities)
- serviceAreaZipCodes[] (array of zips)

AI PERSONALITY:
- aiAgentName (e.g., "Sarah")
- aiVoiceId (ElevenLabs voice)
- aiTone (professional/friendly/casual)
- greetingMessage (custom greeting)

CONTACT INFO:
- emergencyContactName (on-call tech)
- emergencyContactPhone (tech's cell)
- afterHoursPhone
- companyEmail
- companyWebsite

BRANDING:
- brandsServiced[] (Carrier, Trane, etc)
- yearsInBusiness
- licenseNumber

OPERATIONS:
- businessHours (JSON with days/times)
- businessHoursStart (simple 09:00)
- businessHoursEnd (simple 17:00)
- appointmentDuration (default 60 mins)
- services (JSON array of service types)

FEATURES:
- bookingEnabled
- paymentEnabled
- reminderEnabled
```

### Other Tables
- **Customer**: CRM for each business's clients
- **Appointment**: All scheduled jobs
- **Call**: Complete call logs with transcripts
- **Message**: Messages taken by AI
- **Payment**: Stripe payment records
- **UsageLog**: For billing (calls, minutes, cost)
- **PhoneNumber**: Pool of available Twilio numbers
- **Admin**: YOU and your team

---

## 🎭 CUSTOMER JOURNEY

### For YOU (Platform Owner):
1. New HVAC company contacts you
2. Run: `node scripts/setup-business.js`
3. Enter their details (name, address, hours, etc)
4. System provisions Twilio number
5. Configure webhooks automatically
6. Send customer login to their dashboard
7. Customer starts taking calls IMMEDIATELY

### For YOUR CUSTOMER (HVAC Company):
1. Gets welcome email with phone number
2. Forwards their main line to AI number OR
3. Updates Google Business with new number
4. AI starts answering calls
5. Appointments auto-created in their dashboard
6. They review calls, manage schedule
7. Monthly billing automatic

### For THEIR CUSTOMER (Homeowner):
1. Calls HVAC company
2. AI answers: "Thanks for calling [Company]! How can I help?"
3. Natural conversation about their AC/heating issue
4. AI books appointment
5. Receives confirmation text
6. Tech shows up on time
7. Job done ✅

---

## 🚀 FEATURE ROADMAP

### PHASE 1: PRODUCTION READY ✅ COMPLETE
Status: **100% Complete** - Deployed to Railway
- [x] Multi-tenant database
- [x] Company-specific AI prompts
- [x] Emergency call routing
- [x] Appointment booking
- [x] Call logging
- [x] Business setup script
- [x] Railway URL + Twilio webhook configured
  - URL: `https://ai-receptionistbackend-production.up.railway.app`
  - Twilio Number: +18773578556
  - Bob's HVAC test business configured
- [x] First production call test (completed successfully)
- [ ] First real customer onboarded (pending)

### PHASE 2: VOICE QUALITY (CURRENT - IN PROGRESS)
Goal: Sub-500ms latency, human-like quality
- [x] Implement streaming TTS (**COMPLETED** - Oct 16, 2025)
  - ElevenLabs streaming API integrated
  - Real-time MP3 → μ-law conversion with FFmpeg
  - Chunk-by-chunk delivery to Twilio
  - Expected latency: ~200ms to first audio
- [ ] **BLOCKING**: Fix ElevenLabs 401 error in Railway production
  - Works locally, fails in Railway with 401 Unauthorized
  - API key appears correct, investigating environment variable issue
- [ ] Voice Activity Detection (VAD)
- [ ] Interrupt handling
- [ ] Background noise suppression
- [ ] Response caching for common questions

### PHASE 3: SELF-SERVICE ONBOARDING (Week 2)
Goal: Customer can sign up and go live in 10 minutes
- [ ] Landing page with pricing
- [ ] Stripe payment integration
- [ ] Automated Twilio number purchasing
- [ ] Auto webhook configuration
- [ ] Email onboarding sequence
- [ ] Self-service dashboard access

### PHASE 4: ADVANCED FEATURES (Week 3-4)
- [ ] SMS conversation capability
- [ ] Outbound calling (reminders, follow-ups)
- [ ] Calendar integration (Google Calendar)
- [ ] CRM integration (HubSpot, Salesforce)
- [ ] Multi-language support (Spanish critical)
- [ ] Custom voice cloning (owner's voice)

### PHASE 5: ANALYTICS & INTELLIGENCE (Week 5)
- [ ] Call analytics dashboard
- [ ] Sentiment analysis
- [ ] ROI calculator for customers
- [ ] Common questions report
- [ ] Performance metrics
- [ ] A/B testing for prompts

### PHASE 6: INTEGRATIONS (Week 6-8)
- [ ] ServiceTitan
- [ ] Housecall Pro
- [ ] Jobber
- [ ] FieldEdge
- [ ] Zapier
- [ ] Slack notifications

### PHASE 7: SCALE (Ongoing)
- [ ] White-label option
- [ ] Agency/reseller program
- [ ] API for custom integrations
- [ ] Mobile app for business owners
- [ ] SOC 2 compliance
- [ ] HIPAA compliance (for medical)

---

## 💰 UNIT ECONOMICS (Per Customer)

### Costs (Starter Plan)
- Twilio: ~$50/month (500 min @ $0.10/min)
- OpenAI: ~$20/month
- ElevenLabs: ~$15/month
- Deepgram: ~$10/month
- Infrastructure: ~$5/month (Railway)
**Total COGS: ~$100/month**

**Gross Margin: 66%** ($299 - $100 = $199 profit)

### Costs (Professional Plan)
- Twilio: ~$200/month (2000 min)
- OpenAI: ~$60/month
- ElevenLabs: ~$40/month
- Deepgram: ~$30/month
- Infrastructure: ~$10/month
**Total COGS: ~$340/month**

**Gross Margin: 57%** ($799 - $340 = $459 profit)

### Costs (Enterprise Plan)
- Negotiated Twilio rates (30% cheaper)
- Volume pricing on AI services
- Target COGS: $500/month
**Gross Margin: 66%** ($1,499 - $500 = $999 profit)

---

## 🎯 GO-TO-MARKET STRATEGY

### Month 1-2: Validation
- Get 3 pilot customers at 50% discount
- Obsess over their experience
- Record all calls, fix every issue
- Get testimonials and case studies

### Month 3-4: Local Domination
- Target Phoenix HVAC companies (your market)
- Door-to-door sales to 50 companies
- Offer free trial (first 100 calls free)
- Goal: 10 paying customers

### Month 5-6: Scale
- Facebook/Google ads targeting HVAC owners
- SEO content (blog posts, comparison pages)
- Partnerships with HVAC suppliers
- Goal: 25 paying customers

### Month 7-12: National
- Expand to other cities
- Hire sales rep
- Build reseller program
- Goal: 100 paying customers

---

## 📈 SUCCESS METRICS

### Product Metrics
- Response latency: <500ms
- Call completion rate: >95%
- Appointment booking rate: >60%
- Customer satisfaction: >4.5/5
- Churn rate: <5%/month

### Business Metrics
- MRR: Track monthly
- Customer count: Track weekly
- CAC: <$500
- LTV:CAC ratio: >3:1
- Gross margin: >60%

---

## 🛠️ IMMEDIATE NEXT STEPS (RIGHT NOW)

### Step 1: Get Railway URL
```bash
railway domain
```
OR find it in Railway dashboard

### Step 2: Update Twilio Webhook
- Go to Twilio console
- Phone Numbers → +18773578556
- Update webhook to: `https://YOUR-RAILWAY-URL/api/calls/incoming`

### Step 3: Setup First Business
```bash
DATABASE_URL="postgresql://postgres:%2963PL%236up%25N8QXL@db.govliamsjgvemjwsmnnt.supabase.co:5432/postgres" \
node scripts/setup-business.js
```

Enter details for a test HVAC company (can use fake data for now)

### Step 4: Make Test Call
- Call +18773578556
- Have a conversation
- Book an appointment
- Verify it works perfectly

### Step 5: Verify in Database
```sql
SELECT * FROM calls ORDER BY started_at DESC LIMIT 1;
SELECT * FROM appointments ORDER BY created_at DESC LIMIT 1;
```

---

## 🎬 DEMO SCRIPT (For Selling)

**"I'm going to show you something that's going to change how you handle phone calls..."**

[Call the AI receptionist on speakerphone]

**You**: "Hi, my AC stopped working"

**AI**: "Oh no, AC's out? That's the worst. Let me get you taken care of. What's your name?"

**You**: "John Smith"

**AI**: "Perfect. And the best number for you?"

**You**: "555-1234"

**AI**: "Got it. And where are you at?"

**You**: "123 Main Street"

**AI**: "We can get someone out this afternoon at 2pm, does that work?"

**You**: "Perfect"

**AI**: "Great! You're all set for AC repair today at 2pm. You'll get a confirmation text."

[Show them the appointment in their dashboard]

**"That was an AI. Not a person. And here's the appointment, customer profile created, ready for your tech. No missed calls, no voicemail, no call-backs needed. Just handled."**

**"This is $299 a month. Way less than a receptionist, works 24/7, never calls in sick."**

**"Want to try it?"**

---

## 🔥 COMPETITIVE ADVANTAGES

Why you'll win vs Bland.ai, Vapi, others:

1. **Niche-focused**: Built FOR HVAC, not general purpose
2. **Full-service**: You handle everything, they just get calls
3. **Better pricing**: Transparent, no hidden fees
4. **Local**: You can meet customers in person
5. **Fast**: Can onboard in minutes, not days
6. **Support**: You actually care about their success

---

## ⚠️ CRITICAL THINGS TO NEVER FORGET

1. **Pricing**: $299/$799/$1,499 (NOT $99/$199)
2. **Target margin**: 60%+ gross profit
3. **Each business gets**: Their own AI, phone number, branding
4. **Emergency routing**: Critical feature, routes to their tech
5. **Multi-tenant**: One system serves everyone
6. **Database-driven**: Everything configurable, no code changes per customer
7. **Production-first**: No shortcuts, build it right

---

## 📞 SUPPORT FOR THIS CONVERSATION

When I forget something, refer me to:
- Pricing: See "PRICING TIERS" section
- Features: See "PHASE" sections in roadmap
- Database: See "DATABASE SCHEMA" section
- Business model: See "BUSINESS MODEL" section

**This is the master document. Everything else references this.**

---

Last updated: Today
Next review: After first paying customer
