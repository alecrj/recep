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

## 📞 WHAT A REAL HVAC RECEPTIONIST DOES (Our Blueprint)

### **Call Flow Scenarios**

#### **Scenario 1: Emergency Call (15% of calls)**
**Customer**: "My heater stopped working and it's 20 degrees outside!"

**Real Receptionist Does:**
1. **Immediate empathy**: "Oh no, that's terrible, especially in this cold!"
2. **Triage urgency**: "Do you have any heat at all? Any gas smell?"
3. **Get basics fast**: Name, phone, address
4. **Check for immediate danger**: Gas, CO, flooding, extreme temps
5. **Either**:
   - Transfer to on-call tech immediately: "Let me get you to our emergency tech right now"
   - OR book emergency same-day: "I can get someone there in 2 hours"
6. **Confirm contact**: "I'm texting you the tech's number now"
7. **Set expectations**: "He'll call you in 5 minutes to confirm"

#### **Scenario 2: Standard Service Call (60% of calls)**
**Customer**: "My AC isn't cooling very well"

**Real Receptionist Does:**
1. **Friendly greeting**: "Thanks for calling Bob's HVAC! This is Sarah, how can I help?"
2. **Let them explain**: Don't interrupt, let them describe the problem
3. **Ask clarifying questions**:
   - "When did you first notice this?"
   - "Is it blowing air at all?"
   - "Have you changed the filter recently?"
4. **Get customer info** (conversationally, not like a form):
   - "What's your name?" → "Got it, and the best number for you?"
   - "What's the address where the unit is?"
5. **Check availability**: "Let me see what I have... I've got tomorrow afternoon around 2, does that work?"
6. **Alternative if needed**: "If you need it sooner, I have Thursday morning at 9?"
7. **Confirm details**: "Perfect, so I've got you down for Friday at 2pm for AC not cooling"
8. **Set expectations**: "The tech will call 30 minutes before arriving"
9. **Mention pricing**: "Service call is $89, then if you need repairs the tech will give you a price before starting"
10. **Send confirmation**: "I'm texting you a confirmation right now"

#### **Scenario 3: Pricing/Quote Call (10% of calls)**
**Customer**: "How much for a new AC unit?"

**Real Receptionist Does:**
1. **Don't give exact prices**: "Great question! It really depends on the size of your home and what system you need"
2. **Give ranges**: "Typically we see anywhere from $3,500 to $12,000 depending on the system"
3. **Offer free estimate**: "But the best thing is to have someone come out and give you a free quote. When works for you?"
4. **Book appointment**: Same process as Scenario 2
5. **Explain process**: "Tech will measure your space, check your ducts, and give you a few options with exact prices"

#### **Scenario 4: Existing Customer Callback (10% of calls)**
**Customer**: "Hi, I'm calling back about my appointment"

**Real Receptionist Does:**
1. **Look up customer**: "Sure! What's your name?" → Search system
2. **Pull up their info**: "Okay I see you, John Smith, appointment Friday at 2?"
3. **Handle request**:
   - **Reschedule**: "No problem, what works better for you?"
   - **Cancel**: "I can cancel that for you. Is everything okay with the AC now?"
   - **Add info**: "Let me add that note for the tech"
   - **Question**: Answer based on their upcoming appointment

#### **Scenario 5: Wrong Number / Not Service Area (5% of calls)**
**Customer**: "Do you service Orlando?"

**Real Receptionist Does:**
1. **Polite**: "We're actually based in Phoenix, so Orlando's outside our area"
2. **Helpful**: "But I'd recommend calling [local company if known] or searching 'HVAC Orlando'"
3. **Thank them**: "Sorry we couldn't help, but thanks for calling!"

---

### **What Information Receptionist MUST Collect (for service call)**

#### **Critical (Can't book without)**:
- ✅ Name
- ✅ Phone number
- ✅ Address (where the unit is)
- ✅ Problem description
- ✅ Preferred appointment time

#### **Nice to Have**:
- Email (for confirmation)
- Alternate contact
- How urgent (today vs. this week)
- When problem started
- Model/brand of system
- Age of system
- Previous service history

---

### **Receptionist "Soft Skills" (What Makes Them Human)**

#### **1. Empathy**
- "Oh no, that's the worst!"
- "Ugh, I'm so sorry you're dealing with that"
- "In this heat? That's terrible"
- "I totally understand, let's get you taken care of"

#### **2. Active Listening**
- Let customer finish talking
- Don't interrupt with next question
- Acknowledge what they said: "Got it" "Okay" "I hear you"
- Repeat back key details: "So the AC is running but not cooling?"

#### **3. Conversational Flow**
- **NOT**: "What is your name? What is your phone number? What is your address?"
- **YES**: "What's your name?" → [they answer] → "Perfect, and the best number for you?" → [they answer] → "Got it, and where are you at?"

#### **4. Setting Expectations**
- "Tech will call 30 min before"
- "Service call is $89, then we'll give you a price"
- "Should take about an hour"
- "He'll have parts on the truck for most common repairs"

#### **5. Handling Objections**
- **"That's expensive"**: "I totally get it. The good news is we'll give you the exact price before starting any work"
- **"Can you come today?"**: "Let me check... I don't have anything today, but I can get you first thing tomorrow morning?"
- **"I need to think about it"**: "Of course! No pressure. When would you like me to call you back?"

---

### **Common Questions Receptionist Answers**

1. **"What are your hours?"** → "We're open Monday-Friday 8 to 6, and we have 24/7 emergency service"

2. **"Do you service my area?"** → Check against serviceAreaCities or ZIP codes

3. **"How much does [service] cost?"** → Give range, offer free estimate

4. **"How long does it take?"** → "Usually about an hour for a repair, but depends what the tech finds"

5. **"Do you have emergency service?"** → "Absolutely, we have techs on call 24/7"

6. **"What brands do you work on?"** → "We work on all major brands - Carrier, Trane, Lennox, etc."

7. **"Are you licensed and insured?"** → "Yes, we're fully licensed and insured"

8. **"Do you offer financing?"** → "Yes, we offer financing on installations and bigger repairs"

9. **"Can I get same-day service?"** → Check availability

10. **"What payment methods do you accept?"** → "Cash, check, and all major credit cards"

---

### **Receptionist Workflow (Behind the Scenes)**

#### **When Call Comes In:**
1. ✅ Answer warmly
2. ✅ Listen to problem
3. ✅ Assess urgency (emergency vs. routine)
4. ✅ Collect customer info
5. ✅ Check calendar availability
6. ✅ Book appointment
7. ✅ Create customer record (if new)
8. ✅ Update existing record (if returning)
9. ✅ Send SMS confirmation
10. ✅ Add notes for tech
11. ✅ Set reminder (day before)

#### **After Call:**
- Update CRM
- Send confirmation text/email
- Add to calendar
- Notify tech if emergency
- Set follow-up reminder

---

## 🎭 THE COMPLETE CUSTOMER JOURNEY

### **THE GOAL: 5 Minutes from Ad Click to Live AI Receptionist**

---

### 1️⃣ CUSTOMER SEES AD & SIGNS UP (30 seconds)

**Ad**: "Never miss another call. AI receptionist for your HVAC business. 14-day free trial."

**Landing Page**:
- Video demo of AI taking a call
- "Start 14-Day Free Trial" button

**Sign Up Form**:
- Business name
- Your name
- Email
- Password
- Phone number
- Click "Create Account"

**Result**: Account created, logged into dashboard

---

### 2️⃣ 5-STEP SETUP WIZARD (3 minutes)

#### **Screen 1: Business Basics**
- Business address (auto-complete)
- Service area (cities/zip codes)
- Business hours (quick presets: M-F 8-5, M-F 7-7, 24/7)
- Years in business
- License number (optional)

#### **Screen 2: Services & Pricing Ranges**
Pre-filled HVAC services (editable):
- AC Repair: $150-300
- Heater Repair: $150-300
- AC Installation: $3,000-8,000
- Maintenance: $100-150
- Emergency Service: $200-400

**CRITICAL**: AI always gives RANGES, never exact prices

#### **Screen 3: AI Personality**
- AI Name: "Sarah" (dropdown with options)
- Voice: Play 5 voice samples, select one
- Tone: Professional / Friendly / Casual
- Custom greeting (optional):
  - Default: "Thank you for calling [Business Name], this is [AI Name]. How can I help you today?"

#### **Screen 4: Emergency Contacts & After-Hours**
- On-call tech name
- On-call tech phone
- After-hours handling:
  - Take message (AI says "We're closed, I can take a message")
  - Offer emergency service (routes to on-call tech)
- Emergency triggers (checkboxes):
  - No heat (winter)
  - Gas smell
  - Electrical issues
  - Water flooding
  - No AC (extreme heat)

#### **Screen 5: Your AI Phone Number**

**System assigns**: +1-877-XXX-XXXX

**Two Options Presented**:

**OPTION A: Forward Your Existing Number** ⭐ RECOMMENDED
```
Your customers keep calling: (480) 555-1234
But it forwards to AI: +1-877-XXX-XXXX

Setup Instructions (based on detected carrier):
- Verizon: Dial *72 + 18773578556
- AT&T: Dial *21* + 18773578556 + #
- T-Mobile: Settings > Call Forwarding
[Copy forwarding number button]

Test it: Call your main number and hear your AI!
```

**OPTION B: Use New Number**
```
Give customers new AI number: +1-877-XXX-XXXX
Update:
- Google Business listing
- Website
- Business cards
- Ads
```

**Click "Test My AI Now"** → Calls them so they hear it
**Click "Go Live"** → AI starts answering

---

### 3️⃣ THEIR DASHBOARD (What HVAC Business Owner Sees)

**Two Dashboards**:
1. **YOUR Admin Dashboard**: See all customers, all businesses, all revenue
2. **THEIR Business Dashboard**: Each HVAC company sees only their data

#### **HVAC Business Owner Dashboard Tabs**:

**📅 Today** (Home screen)
- Today's appointments at a glance
- Upcoming calls/messages
- Quick stats: Calls today, Appointments booked, Revenue

**📞 Calls** (Call History)
- List of all calls with:
  - Date/time
  - Customer name
  - Duration
  - Intent (Booking, Question, Emergency, Other)
  - Outcome (Booked, Message taken, Transferred)
- Click any call → Full transcript
- Play recording (if enabled)
- Add notes

**👥 Customers** (Auto-Populated CRM)
```
Customer Record (created automatically by AI):
- Name: "John Smith"
- Phone: "+1-555-1234"
- Email: "john@email.com" (if collected)
- Address: "123 Main St, Phoenix, AZ"
- First call: "2025-10-16"
- Total calls: 5
- Total appointments: 3
- Last service: "AC Repair - Oct 15"
- Notes: "Prefers afternoon appointments"
- Tags: "Regular Customer", "AC Repair"
```

**📆 Calendar** (Synced with Google)
- Week/month view
- All appointments booked by AI
- Color-coded by service type
- Click appointment → Customer details
- Manually add/edit/cancel appointments

**⚙️ Settings** (Editable Anytime)
- Business info (address, hours, service area)
- Services & pricing ranges (add/edit/remove)
- AI personality (name, voice, tone, greeting)
- Emergency contacts
- FAQs (AI uses these to answer common questions)
- Integrations (Google Calendar, Stripe, etc.)
- Team members (invite techs to view schedule)

**💳 Billing**
- Current plan: Professional ($799/month)
- Usage: 1,247 / 2,000 minutes
- Next billing date
- Upgrade/downgrade
- Payment method

**📊 Analytics**
- "Answered 47 calls this week (would have missed 18)"
- "Booked 12 appointments = $2,340 in revenue"
- Busiest times graph
- Common questions report
- Booking rate over time

---

### 4️⃣ HOW THE AI AUTO-FILLS THE CRM

**When call comes in**:

1. **Customer calls** → AI answers
2. **AI asks**: "What's your name?"
   - Creates Customer record: `name: "John Smith"`
3. **AI asks**: "What's your phone number?"
   - Adds to record: `phone: "+1-555-1234"`
4. **AI asks**: "What's your address?"
   - Adds to record: `address: "123 Main St, Phoenix, AZ"`
5. **AI conversation** → Determines issue
   - Adds: `issue: "AC not cooling"`
6. **AI checks availability** → Books appointment
   - Creates Appointment record:
     ```
     scheduledAt: "2025-10-17 14:00"
     service: "AC Repair"
     duration: 60 mins
     estimatedCost: "$150-300"
     notes: "AC stopped cooling, unit is 8 years old"
     ```
7. **AI sends SMS confirmation** to customer
8. **AI adds to Google Calendar**
9. **Dashboard updates in real-time** → Owner sees new appointment

**If returning customer**:
- AI recognizes phone number: "Hi John! Good to hear from you again."
- Links to existing Customer record
- Updates: `totalCalls: 2`, `lastCallDate: "2025-10-17"`

---

### 5️⃣ FOR THE HOMEOWNER (End Customer Experience)

1. **AC breaks** at 10pm on Saturday
2. **Calls HVAC company** (their usual number)
3. **AI answers immediately**: "Thanks for calling Bob's HVAC Service! This is Sarah. How can I help you?"
4. **Natural conversation**:
   - "My AC stopped working and it's 85 degrees in here"
   - "Oh no, that's the worst! Let me get you taken care of. What's your name?"
   - "John Smith"
   - "And the best number to reach you?"
   - "555-1234"
   - "What's your address?"
   - "123 Main Street"
   - "We can get someone out first thing tomorrow morning at 8am, or if this is an emergency, I can connect you with our on-call technician right now for emergency service. What works better for you?"
   - "Tomorrow morning is fine"
   - "Perfect! You're all set for AC repair tomorrow at 8am. You'll get a confirmation text in just a moment. Is there anything else I can help you with?"
   - "No, that's it"
   - "Great! We'll see you tomorrow. Thanks for calling Bob's HVAC!"

5. **Gets SMS**: "Appointment confirmed for tomorrow 10/17 at 8:00am with Bob's HVAC Service. Reply YES to confirm or CANCEL to reschedule."
6. **Tech shows up** at 8am
7. **Job done**, customer happy
8. **Homeowner has NO IDEA it was AI** - sounded completely human

---

### 6️⃣ YOUR ADMIN DASHBOARD (What YOU See)

**One Master Dashboard for All Your Customers**:

**Customers Tab**:
- List of all HVAC businesses you're serving:
  ```
  Bob's HVAC Service
  Plan: Professional ($799/mo)
  Status: Active
  Calls this month: 247
  Revenue: $3,750 (your profit: $2,160)

  [View Dashboard] [View Calls] [Edit Settings]
  ```

**Click "View Dashboard"** → See THEIR full dashboard (calls, CRM, appointments)

**System Stats**:
- Total customers: 15
- Total MRR: $11,985
- Total calls today: 142
- Total appointments booked: 47
- System uptime: 99.8%

---

## 🔑 CRITICAL FEATURES THAT MAKE THIS WORK

### **1. Call Forwarding Made Simple**
- Show carrier-specific instructions automatically
- "Copy number" button
- Video tutorial for each carrier
- **Future**: Twilio number porting (port their existing number in 2-3 days)

### **2. Google Calendar Auto-Sync**
- "Connect Google Calendar" button in setup
- OAuth flow (30 seconds)
- AI adds appointments automatically
- Two-way sync (if they block time, AI knows)

### **3. SMS Confirmations & Reminders**
Auto-enabled:
- Confirmation immediately after booking
- Reminder 1 day before
- "Tech is on the way!" notification (manual trigger)

### **4. FAQs (Pre-filled, Editable)**
Dashboard has FAQ section:
- "What are your hours?" → AI knows from settings
- "Do you service my area?" → AI knows from service area
- "How much does AC repair cost?" → AI gives pricing range
- Custom FAQs: "Do you finance?" "What brands?" "Licensed/insured?"

### **5. Emergency Detection & Routing**
AI trained to detect:
- "No heat" (winter) + "baby in house" → EMERGENCY
- "Gas smell" → EMERGENCY (immediate transfer)
- "Sparking electrical" → EMERGENCY
- "Water flooding" → EMERGENCY

AI says: "This sounds like an emergency. Let me connect you with our on-call technician right now." → Transfers immediately

### **6. After-Hours Handling**
AI knows business hours from settings:
- During hours: Normal booking
- After hours:
  - Option A: "We're closed but I can take a message and someone will call you first thing tomorrow morning"
  - Option B: "Would you like emergency service? I can connect you with our on-call technician for $200-400"

### **7. Analytics That Show Value**
Customer dashboard shows:
- "You would have missed 18 calls this week without AI"
- "AI booked $2,340 in revenue this week"
- "Busiest time: Tuesday 9-11am (add more techs?)"
- "Most common issue: AC not cooling (75% of calls)"

---

## 🎯 THE PERFECTED VISION

**For Customer (HVAC Business)**:
- See ad → Click → 5 minutes → AI answering their calls
- Zero technical knowledge required
- Can edit everything through dashboard
- CRM fills automatically
- Calendar syncs automatically
- Gets analytics showing ROI

**For You (Platform Owner)**:
- Customer signs up (self-serve or you help)
- System provisions Twilio number automatically
- System configures webhooks automatically
- You see all customers in one admin dashboard
- You can view any customer's data
- Track revenue, usage, profitability

**For Homeowners**:
- Call HVAC company
- AI answers (sounds human)
- Appointment booked in 2 minutes
- Gets SMS confirmation
- Tech shows up
- Never knew it was AI

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

### PHASE 2: VOICE QUALITY ✅ COMPLETE (Oct 16, 2025)
Goal: Sub-500ms latency, human-like quality
- [x] ✅ Streaming TTS with ElevenLabs Turbo v2.5
  - Real-time MP3 → μ-law conversion with FFmpeg
  - Chunk-by-chunk delivery to Twilio
  - Actual latency: ~200-300ms to first audio
- [x] ✅ ElevenLabs upgraded tier (resolved 401 errors)
- [x] ✅ Voice optimization for human-like quality:
  - Stability: 0.50 (natural variation, not monotone)
  - Style: 0.45 (expressive, emotional)
  - Similarity boost: 0.75 (maintains character)
  - Speaker boost: true (phone clarity)
- [x] ✅ Warm professional female voice selected
- [x] ✅ Natural conversation flow (empathy, acknowledgments, filler words)
- [ ] Voice Activity Detection (VAD) - Future
- [ ] Interrupt handling - Future
- [ ] Background noise suppression - Future

### PHASE 2.5: CRITICAL RECEPTIONIST FEATURES (WEEK 1 - PRIORITY)
Goal: Complete receptionist functionality
- [ ] **SMS Confirmations** (test if working)
  - Send immediately after booking
  - Format: "Appointment confirmed for [date] at [time]..."
  - Reply to reschedule/cancel
- [ ] **Recognize Returning Customers**
  - Look up by phone number
  - Greet: "Hi [Name]! Good to hear from you again"
  - Pull previous service history
- [ ] **Service Area Validation**
  - Check ZIP code / city against serviceAreaCities
  - Politely decline if out of area
  - Suggest competitors if possible
- [ ] **Real Calendar Integration**
  - Google Calendar sync (two-way)
  - Check actual availability (not mock data)
  - Block off time slots
  - Show tech's calendar
- [ ] **After-Hours Detection**
  - Check businessHours from config
  - Different greeting when closed
  - Offer emergency service or next-day booking
- [ ] **Appointment Rescheduling**
  - Customer calls back to change time
  - Look up existing appointment
  - Modify or cancel
  - Send updated confirmation
- [ ] **Pricing Intelligence**
  - Store service prices in database (by service type)
  - Give accurate ranges
  - Update via dashboard
  - Currently: Hardcoded in prompt
- [ ] **Appointment Reminders**
  - Automated SMS 24 hours before
  - "Reminder: You have an appointment tomorrow..."
  - Reduce no-shows by 50%+
- [ ] **Callback Requests**
  - "Can someone call me back?"
  - Create follow-up task in CRM
  - Set priority/urgency

### PHASE 3: SELF-SERVICE ONBOARDING (Week 2-3)
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
