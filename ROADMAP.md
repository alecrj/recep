# AI Receptionist - Master Roadmap & Status
**Single Source of Truth** | Last Updated: 2025-01-16

---

## 🎯 THE BUSINESS VISION

### What We're Building
**The Stripe of AI Phone Receptionists** - A self-service SaaS platform where any business can have a 24/7 AI receptionist in under 5 minutes.

### The Problem We're Solving
Small businesses lose **$70K-$150K/year** in missed calls:
- Calls during lunch breaks
- After-hours inquiries
- When staff is busy with customers
- Weekends and holidays
- Can't afford full-time receptionist ($35K-$45K/year)

### Our Solution
**AI Receptionist that:**
- Answers every call, 24/7
- Books appointments directly to calendar
- Answers common questions
- Takes detailed messages
- Transfers urgent calls to owner
- Costs $299-$1,499/month (vs $3,000+/month for human)
- Zero training required
- Works in 5 minutes

### Target Market
**Phase 1:** Service-based small businesses (10-50 employees)
- HVAC companies
- Plumbing services
- Dental offices
- Law firms
- Auto repair shops
- Salons/spas
- Medical practices

**Why them?**
- High call volume
- Appointment-based
- Every missed call = lost revenue
- Can afford $299-$799/month
- Understand ROI immediately

### Business Model
**Monthly Recurring Revenue (MRR):**
- Starter: $299/month - unlimited calls, basic features
- Professional: $799/month - priority support, advanced analytics
- Enterprise: $1,499/month - custom integrations, white-label

**Unit Economics:**
- Cost per minute: ~$0.31 (Twilio + OpenAI + Deepgram)
- Average call: 3 minutes = $0.93 cost
- Revenue per call: ~$3-5 (based on unlimited model)
- Gross margin: ~70%+ at scale

**Growth Strategy:**
1. **Month 1-3:** Launch to 10 beta customers (friends, network)
2. **Month 4-6:** Refine product, get testimonials, reach 50 customers
3. **Month 7-12:** Paid ads (Google, Facebook), aim for 200 customers
4. **Year 2:** Scale to 1,000 customers = $300K-$800K MRR

### Success Metrics
**Product-Market Fit Indicators:**
- Customer stays >3 months (low churn)
- Customer refers others (NPS >50)
- Takes <10 minutes to set up
- AI handles >80% of calls without human intervention
- Customer ROI is obvious (<1 month payback)

### Competitive Advantage
1. **Self-service** - Competitors require sales calls, demos, setup fees
2. **Instant activation** - Get phone number and go live in 5 minutes
3. **Transparent pricing** - No hidden fees, no per-minute charges
4. **Simple UX** - Built for non-technical business owners
5. **Real AI** - Actually books appointments, not just transcription

---

## 🎯 PRODUCT MISSION
Build a production-ready AI receptionist platform where business owners can sign up, configure their AI, get a phone number, and start receiving calls immediately - with zero technical knowledge required.

---

## ✅ COMPLETED - What's Working Now

### Core Infrastructure
- [x] **Backend API** - Express.js on Railway (port 3000)
- [x] **Database** - PostgreSQL via Prisma ORM
- [x] **Admin Dashboard** - React app (port 5183)
- [x] **Business Dashboard** - React app (port 5174)
- [x] **Authentication** - JWT-based auth for admins & business owners
- [x] **Real-time Call Handling** - OpenAI Realtime API + Twilio integration

### Phone Number System ✅
- [x] Self-service phone number selection
- [x] Search by area code (Twilio integration)
- [x] One-click activation (FREE for users)
- [x] Call forwarding instructions (mobile + landline)
- [x] Two setup options: Get New Number OR Forward Existing
- [x] Automatic webhook configuration
- [x] Works for trial AND paid users

### Business Dashboard Features
- [x] Dashboard with call statistics
- [x] Calls log with playback
- [x] Customers list
- [x] Appointments calendar
- [x] Messages inbox
- [x] Analytics (basic)
- [x] Phone number management (JUST COMPLETED)

### Admin Dashboard Features
- [x] Platform overview
- [x] All businesses management
- [x] All calls across platform
- [x] Usage analytics with cost tracking
- [x] Real-time expense monitoring
- [x] Business creation/management

### Basic Settings (Partially Complete)
- [x] Business name
- [x] Business hours (start/end)
- [x] Greeting message
- [x] Appointment duration
- [x] Google Calendar integration
- [x] Phone number setup

---

## 🚧 IN PROGRESS - What We're Building Now

### Settings Overhaul (CRITICAL FOR LAUNCH)
Making the business dashboard production-ready so clients can actually configure their AI receptionist properly.

**Goal:** Client signs up → Goes to Settings → Configures everything → AI is ready to take calls

**What's Missing:**
1. **Services/Products Configuration** 🔴 CRITICAL
   - What services do you offer? (HVAC repair, dental cleaning, etc.)
   - Price ranges (optional)
   - Duration (for appointments)
   - AI needs this to properly handle customer inquiries

2. **Call Transfer Settings** 🔴 CRITICAL
   - Urgent keywords ("urgent", "leak", "broken pipe", etc.)
   - Transfer number (forward urgent calls to owner/on-call staff)
   - Enable/disable call transfer
   - Critical for businesses with time-sensitive situations

3. **FAQs Manager** 🟡 IMPORTANT
   - Common questions & answers
   - "What are your hours?" → "We're open 9-5 Mon-Fri"
   - "Do you accept insurance?" → "Yes, we accept most major insurance"
   - Makes AI smarter without retraining

4. **Voice Selection** 🟡 IMPORTANT
   - Currently shows fake options (Alloy, Echo, Fable)
   - Need 3 REAL OpenAI Realtime voices
   - With audio previews so clients can hear them
   - Professional female, Professional male, Friendly neutral

5. **After-Hours Message** 🟡 IMPORTANT
   - Different greeting when calling outside business hours
   - "Thanks for calling, we're currently closed. Our hours are..."

---

## 📋 ARCHITECTURE DECISIONS

### Settings Component Structure (Option A - CHOSEN)
**Clean, Maintainable Architecture:**

```
/apps/business-dashboard/src/pages/Settings.jsx (Main container)
├── General Tab
│   ├── Business Info (name, hours)
│   ├── ServicesManager.jsx ← NEW COMPONENT
│   └── Greeting Message
├── AI Configuration Tab
│   ├── VoiceSelector.jsx ← NEW COMPONENT (with previews)
│   ├── CallTransferSettings.jsx ← NEW COMPONENT
│   └── FAQsManager.jsx ← NEW COMPONENT
├── Integrations Tab
│   └── Google Calendar (already working)
├── Phone Tab
│   └── PhoneNumberManager.jsx (already working)
└── Billing Tab
    └── Plan management (already working)
```

### Why Separate Components?
- **Cleaner code** - Each component has single responsibility
- **Easier testing** - Test each feature independently
- **Better UX** - Can add loading states, validation per section
- **Maintainable** - Easy to update one feature without breaking others

---

## 🎯 IMMEDIATE NEXT STEPS (In Order)

### Step 1: Build ServicesManager.jsx
**File:** `/apps/business-dashboard/src/components/ServicesManager.jsx`

**Features:**
- Add/edit/delete services
- Each service has:
  - Name (e.g., "AC Repair", "Teeth Cleaning")
  - Description (what's included)
  - Duration (for appointments)
  - Price range (optional, for AI context)
- Beautiful UI with add/remove buttons
- Saves to `businessConfig.services` (JSON field)

**Backend:**
- Already exists! Config endpoint handles JSON fields
- Just need to update frontend

---

### Step 2: Build CallTransferSettings.jsx
**File:** `/apps/business-dashboard/src/components/CallTransferSettings.jsx`

**Features:**
- Urgent keywords textarea (comma-separated)
  - Default: "urgent, leak, flooding, no heat, no cooling, broken"
  - Placeholder examples based on industry
- Transfer phone number input
  - Where to forward urgent calls (owner/on-call staff)
  - Validation for proper phone format
- Toggle: Enable/Disable call transfer
- Clear explanation: "When customers use these words, AI will transfer them to this number"

**Backend:**
- Already works! Config endpoint handles:
  - `transferKeywords` (array)
  - `transferNumber` (string)
  - `transferEnabled` (boolean)

---

### Step 3: Build FAQsManager.jsx
**File:** `/apps/business-dashboard/src/components/FAQsManager.jsx`

**Features:**
- List of Q&A pairs
- Add new FAQ button
- Edit/delete existing FAQs
- Each FAQ:
  - Question: "Do you accept insurance?"
  - Answer: "Yes, we accept most major insurance providers"
- Saves to `businessConfig.faqs` (JSON array)

**Backend:**
- Already works with JSON fields
- No changes needed

---

### Step 4: Build VoiceSelector.jsx
**File:** `/apps/business-dashboard/src/components/VoiceSelector.jsx`

**Features:**
- 3 voice options with radio buttons:
  1. **Alloy** - Professional Female
  2. **Echo** - Professional Male
  3. **Shimmer** - Friendly Neutral
- Each option shows:
  - Voice name
  - Description
  - ▶️ Play Preview button (sample audio)
- Selected voice highlighted
- Saves to `businessConfig.aiVoiceId`

**Technical:**
- Need sample audio files for each voice
- OR use OpenAI TTS API to generate previews on-demand
- Store selection in config

---

### Step 5: Add After-Hours Message
**Where:** Settings.jsx General Tab

**Features:**
- Textarea for after-hours greeting
- Preview of when it's used
- Default: "Thank you for calling [Business Name]. We're currently closed. Our hours are [hours]. Please call back during business hours or leave a message."
- Saves to `businessConfig.afterHoursMessage`

---

### Step 6: End-to-End Testing
**Test as if you're a brand new client:**

1. Sign up for trial account
2. Go to Settings
3. Fill in ALL fields:
   - Business name
   - Hours
   - Services (add 2-3)
   - Voice selection
   - Emergency settings
   - FAQs (add 2-3)
   - Phone number (claim one)
4. Test: Make a call to the number
5. Verify: AI knows about services, hours, FAQs
6. Test: Say emergency keyword → Should transfer
7. Test: Call after hours → Should play after-hours message

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### Database Schema (Prisma)
```prisma
model BusinessConfig {
  // ... existing fields ...

  // JSON fields (already in schema)
  services         Json?  // Array of {name, description, duration, priceMin, priceMax}
  faqs             Json?  // Array of {question, answer}
  emergencyKeywords Json? // Array of strings

  // New fields needed
  transferNumber   String?
  emergencyEnabled Boolean @default(true)
  afterHoursMessage String?
  aiVoiceId        String @default("alloy")
}
```

### API Endpoints (Already Working)
- `GET /api/business/config` - Get current config
- `PUT /api/business/config` - Update config (handles JSON)
- No backend changes needed for Steps 1-5!

### Frontend State Management
- Using TanStack Query (React Query)
- Each component manages its own state
- Parent Settings.jsx handles form submission
- Auto-save option for better UX

---

## 📊 SUCCESS CRITERIA

### Minimum Viable Product (MVP)
**Can we launch with this?**

- [x] Business can sign up
- [x] Business can get phone number
- [x] Business can set hours
- [ ] Business can add services ← BUILDING NOW
- [ ] Business can choose voice
- [ ] Business can set emergency transfer
- [ ] AI can answer basic questions
- [ ] AI can book appointments
- [ ] AI can handle emergencies
- [ ] Dashboard shows real call data

**When all ✅ above = READY TO LAUNCH** 🚀

---

## 🎨 UI/UX PRINCIPLES

1. **No Technical Jargon** - Business owners, not developers
2. **Helpful Examples** - Show placeholder text, tooltips
3. **Instant Feedback** - Success messages, validation
4. **Mobile Friendly** - Works on phone/tablet
5. **Fast & Responsive** - No lag, smooth transitions
6. **Clear CTAs** - Obvious next steps
7. **Error Recovery** - Clear error messages with solutions

---

## 🚀 POST-MVP ENHANCEMENTS

### Phase 2 (After Launch)
- [ ] Custom AI training per business
- [ ] Multi-location support (multiple phone numbers)
- [ ] Advanced analytics (conversion rates, peak times)
- [ ] SMS notifications for appointments
- [ ] Email notifications for messages
- [ ] Payment collection over phone
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Voicemail transcription
- [ ] Call recording playback
- [ ] Custom hold music
- [ ] Multi-language support (Spanish, etc.)
- [ ] White-label option for agencies

### Phase 3 (Future)
- [ ] Mobile app (iOS/Android)
- [ ] Video call support
- [ ] AI chat widget for websites
- [ ] Advanced call routing
- [ ] Team collaboration features
- [ ] API for third-party integrations
- [ ] Zapier integration
- [ ] Industry-specific templates

---

## 📁 PROJECT STRUCTURE

```
ai-receptionist/
├── apps/
│   ├── backend/              # Express.js API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── admin.js          ✅ Admin endpoints
│   │   │   │   ├── business.js       ✅ Business endpoints
│   │   │   │   ├── auth.js           ✅ Authentication
│   │   │   │   └── twilio.js         ✅ Webhooks
│   │   │   ├── services/
│   │   │   │   ├── twilio.service.js ✅ Phone integration
│   │   │   │   └── calendar.service.js ✅ Google Calendar
│   │   │   └── websocket/
│   │   │       └── realtime-handler.js ✅ OpenAI Realtime
│   │   └── prisma/
│   │       └── schema.prisma         ✅ Database schema
│   ├── admin-dashboard/      # Admin UI (React)
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Dashboard.jsx     ✅ Platform overview
│   │       │   ├── Businesses.jsx    ✅ All businesses
│   │       │   └── Calls.jsx         ✅ All calls
│   │       └── components/
│   │           └── UsageAnalytics.jsx ✅ Cost tracking
│   └── business-dashboard/   # Business Owner UI (React)
│       └── src/
│           ├── pages/
│           │   ├── Dashboard.jsx     ✅ Call stats
│           │   ├── Calls.jsx         ✅ Call history
│           │   ├── Settings.jsx      🚧 IN PROGRESS
│           │   └── ...
│           └── components/
│               ├── PhoneNumberManager.jsx ✅ DONE
│               ├── ServicesManager.jsx    ✅ DONE
│               ├── CallTransferSettings.jsx 🔴 TO BUILD
│               ├── FAQsManager.jsx        🔴 TO BUILD
│               └── VoiceSelector.jsx      🔴 TO BUILD
└── ROADMAP.md                # THIS FILE
```

---

## 💾 DATA MODELS

### Business Configuration (What AI Knows)
```json
{
  "businessName": "Bob's HVAC",
  "greetingMessage": "Thank you for calling Bob's HVAC, how can I help you today?",
  "afterHoursMessage": "We're currently closed. Our hours are 8 AM to 6 PM Monday through Friday.",
  "businessHoursStart": "08:00",
  "businessHoursEnd": "18:00",
  "aiVoiceId": "alloy",
  "services": [
    {
      "name": "AC Repair",
      "description": "Air conditioning repair and maintenance",
      "duration": 60,
      "priceMin": 100,
      "priceMax": 500
    },
    {
      "name": "Heating System Installation",
      "description": "New heating system installation",
      "duration": 240,
      "priceMin": 3000,
      "priceMax": 8000
    }
  ],
  "faqs": [
    {
      "question": "Do you offer emergency services?",
      "answer": "Yes, we offer 24/7 emergency HVAC services. Just mention it's an emergency when you call."
    },
    {
      "question": "Do you accept credit cards?",
      "answer": "Yes, we accept all major credit cards including Visa, Mastercard, and American Express."
    }
  ],
  "transferKeywords": ["urgent", "no heat", "no cooling", "leak", "flooding", "broken"],
  "transferNumber": "+15551234567",
  "transferEnabled": true
}
```

---

## 🎯 CURRENT FOCUS

**TODAY:** Build ServicesManager.jsx component
**THIS WEEK:** Complete all 4 new settings components
**THIS MONTH:** Launch MVP to first 10 customers

---

## 📞 KEY METRICS TO TRACK

### Business Health
- Total businesses signed up
- Active businesses (made at least 1 call)
- Churn rate
- MRR (Monthly Recurring Revenue)

### Platform Performance
- Total calls handled
- Average call duration
- Successful appointment bookings
- Emergency transfers executed
- AI response accuracy

### Costs
- Twilio costs per minute: $0.013
- OpenAI costs per minute: $0.06 + $0.24 = $0.30
- Total cost per minute: ~$0.31
- Revenue per minute needed: >$0.50 (for profitability)

---

## 🔐 ENVIRONMENT VARIABLES

### Required for Production
```env
# Database
DATABASE_URL=postgresql://...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY=SK...
TWILIO_API_SECRET=...

# AI Services
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Auth
JWT_SECRET=...

# URLs
BACKEND_URL=https://your-backend.railway.app
ADMIN_DASHBOARD_URL=https://admin.yourdomain.com
BUSINESS_DASHBOARD_URL=https://dashboard.yourdomain.com
```

---

## ✅ DEFINITION OF DONE

**For each new component:**
- [ ] Component created in correct location
- [ ] Proper TypeScript/PropTypes (if applicable)
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Error handling
- [ ] Success feedback
- [ ] Saves to backend
- [ ] Tested with real data
- [ ] Looks good in dark mode
- [ ] No console errors

**For MVP launch:**
- [ ] All critical features complete (see checklist above)
- [ ] End-to-end test passes
- [ ] Real phone call works perfectly
- [ ] Dashboard shows real data
- [ ] Settings are saveable
- [ ] No mock data visible
- [ ] Deploy to production
- [ ] Domain connected
- [ ] SSL certificates active
- [ ] Monitoring enabled

---

## 🚨 KNOWN ISSUES & LIMITATIONS

### Current Limitations
1. **Phone Number Purchase** - Works on deployed Railway, not localhost (Twilio webhook requirement)
2. **Voice Previews** - Need to implement audio samples
3. **Mock Data** - Some billing history still shows placeholder data

### Technical Debt
- [ ] Add proper error boundaries in React
- [ ] Implement retry logic for failed API calls
- [ ] Add request rate limiting
- [ ] Implement proper logging (Winston/Pino)
- [ ] Add unit tests for critical paths
- [ ] Add E2E tests (Playwright/Cypress)

---

## 📚 RESOURCES

### Documentation
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Twilio Voice API Docs](https://www.twilio.com/docs/voice)
- [Prisma ORM Docs](https://www.prisma.io/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)

### Deployment
- Backend: Railway
- Frontend: Vercel (recommended)
- Database: Supabase PostgreSQL

---

**Last Updated:** 2025-01-16
**Next Review:** After ServicesManager.jsx completion
**Owner:** Alec
**Status:** 🚧 Active Development - Building Settings Components
