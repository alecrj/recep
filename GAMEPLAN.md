# AI RECEPTIONIST FOR HVAC COMPANIES - THE FINAL GAMEPLAN

**NO MORE CHANGES. THIS IS THE PLAN.**

---

## WHAT WE'RE BUILDING

**Product:** Self-serve AI receptionist SaaS for HVAC companies
**Price:** $299, $799, $1499/month
**Goal:** Build once, copy-paste for infinite HVAC clients
**Tech Stack:** Twilio → Backend → ElevenLabs Conversational AI

---

## ANSWER TO YOUR QUESTION: YES, ELEVENLABS CONVERSATIONAL AI IS SCALABLE AND SELF-SERVE

**Yes.** Here's why:

1. **One agent can serve unlimited businesses** - We customize behavior with prompts (business name, hours, services)
2. **Multi-tenant architecture already built** - Database has `businesses`, `business_configs`, system loads the right config per call
3. **Self-serve ready** - HVAC company signs up → fills form → gets phone number → system works automatically
4. **Infinitely scalable** - ElevenLabs handles the AI, we just proxy calls

**The code is ALREADY built for this.** Look at line 116 of `elevenlabs-handler.js`:
```javascript
agentId = businessConfig.elevenLabsAgentId || config.ELEVENLABS_AGENT_ID;
```

This means:
- If business has custom agent → use theirs
- If not → use default shared agent
- **Either way, it works for unlimited businesses**

---

## THE STACK WE'RE USING (FINAL ANSWER)

### ✅ WHAT WE'RE USING:

**Twilio** → Phone numbers and call routing
**ElevenLabs Conversational AI** → All-in-one (Speech-to-Text + AI Brain + Text-to-Speech)
**Your Backend** → WebSocket proxy that loads business configs
**PostgreSQL** → Database with business settings

### ❌ WHAT WE'RE NOT USING:

**Deepgram** - Not needed, ElevenLabs has STT built-in
**OpenAI** - Not needed, ElevenLabs has LLM built-in

**We have the API keys but we DON'T need them for the ElevenLabs approach.**

---

## HOW IT WORKS (THE ARCHITECTURE)

```
HVAC Company gets call on their number
↓
Twilio receives call
↓
Twilio webhook → Your backend (/api/elevenlabs/incoming)
↓
Backend looks up: Which HVAC company owns this number?
↓
Backend loads business config (hours, services, greeting)
↓
Backend opens WebSocket to ElevenLabs agent
↓
Backend sends custom prompt: "You are receptionist for Bob's HVAC, hours 9-5, services AC/heating..."
↓
Caller talks ↔ ElevenLabs AI responds (human-like voice)
↓
Call ends → Transcript saved to database
```

**This architecture supports UNLIMITED HVAC companies with ONE codebase.**

---

## THE 4 PHASES TO BUILD THIS (IN ORDER)

### PHASE 1: MAKE VOICE SOUND 100% HUMAN (Current - 2 days)

**What:** Get one HVAC company test setup working with perfect voice quality

**Steps:**
1. ✅ Code is built (elevenlabs-handler.js, routes, database)
2. ⏳ Create ONE ElevenLabs agent in dashboard
3. ⏳ Configure agent with Sarah voice (stability 0.3, style 0.9)
4. ⏳ Add agent ID to Railway environment
5. ⏳ Call and test - does it sound like a real receptionist?
6. ⏳ Iterate on voice settings until 90%+ people think it's human

**Goal:** Prove the voice quality is good enough to sell

**Don't move to Phase 2 until voice is perfect.**

---

### PHASE 2: BUILD RECEPTIONIST FEATURES (1 week)

**What:** Make AI actually function as HVAC receptionist

**Features to add:**
1. **Appointment booking** - "Can you schedule a service call for Tuesday at 2pm?"
2. **Answer common questions** - "What's your service area?" "Do you do emergency calls?"
3. **Take messages** - "Can you have Bob call me back?"
4. **Emergency detection** - "My AC is broken and it's 100 degrees!" → priority routing
5. **Business hours handling** - Different responses after hours

**Implementation:**
- Add ElevenLabs functions/tools for booking, messaging
- Connect to Google Calendar API for real appointments
- Add to database: messages, appointments tables

**Goal:** AI can actually do the job of an HVAC receptionist

---

### PHASE 3: BUILD HVAC BUSINESS DASHBOARD (1 week)

**What:** HVAC companies need to see call logs, manage settings

**Build:**
1. **Business signup page** - HVAC owner enters company info, chooses voice
2. **Dashboard:**
   - View call logs with transcripts
   - Listen to call recordings
   - See booked appointments
   - Manage business hours
   - Customize greeting message
   - View/respond to messages
3. **Settings page:**
   - Business info (name, address, services)
   - Phone number display
   - Voice selection (later: choose between Sarah/Charlie/Laura)

**Tech:** React frontend (already scaffolded), connects to backend API

**Goal:** HVAC owners can self-manage their receptionist

---

### PHASE 4: BILLING & SCALING (3 days)

**What:** Make it a real business - charge money, onboard automatically

**Build:**
1. **Stripe integration** - Credit card signup, monthly billing
2. **Pricing tiers:**
   - $299/month - 500 minutes, basic features
   - $799/month - 2000 minutes, priority support
   - $1499/month - Unlimited minutes, custom voice
3. **Auto phone number provisioning** - When HVAC signs up, Twilio API assigns them a number
4. **Usage tracking** - Track minutes used per business
5. **Self-serve onboarding** - HVAC owner signs up → enters info → gets phone number → live in 5 minutes

**Goal:** Fully automated HVAC onboarding, no manual setup needed

---

## THE SELF-SERVE FLOW (HOW HVAC COMPANIES ONBOARD)

**Step 1:** HVAC owner visits your website, clicks "Get Started"

**Step 2:** Signup form:
- Company name: "Bob's HVAC"
- Service area: "Phoenix, AZ"
- Business hours: "Mon-Fri 8am-6pm, Sat 9am-3pm"
- Services offered: [AC Repair, Heating, Installation, Emergency]
- Email/password

**Step 3:** Choose pricing tier ($299, $799, $1499)

**Step 4:** Enter credit card (Stripe)

**Step 5:** System automatically:
- Creates business record in database
- Provisions Twilio phone number
- Creates business_config with their settings
- Sends welcome email with their new phone number

**Step 6:** HVAC owner logs into dashboard, sees:
- "Your AI receptionist is live at +1-555-123-4567"
- "Make a test call now"
- Link to customize settings

**Step 7:** They call, it works. They're live.

**NO MANUAL SETUP REQUIRED. Fully self-serve.**

---

## YOUR DATABASE ALREADY SUPPORTS THIS

**businesses table:**
- Each HVAC company is a row
- Has their own twilioNumber

**business_configs table:**
- Each HVAC company's settings
- Business hours, services, greeting, voice choice
- Can store elevenLabsAgentId if they want custom agent (Phase 4 - enterprise tier)

**calls table:**
- Every call logged with transcript
- HVAC owner sees in dashboard

**The multi-tenant architecture is DONE. We just need to build the features.**

---

## WHAT WE DO TODAY (RIGHT NOW)

1. **Create ElevenLabs agent** (5 minutes)
   - Go to https://elevenlabs.io/app/conversational-ai
   - Click "Create Agent"
   - Name: "HVAC Receptionist"
   - Voice: Sarah
   - Stability: 0.3
   - Style: 0.9
   - Prompt: "You are a professional receptionist for an HVAC company. Keep responses SHORT. Use natural speech: 'um', 'let me check', 'mm-hmm'. Sound like a real person."
   - Copy agent ID

2. **Add to Railway** (1 minute)
   ```bash
   railway variables --set ELEVENLABS_AGENT_ID=your_actual_agent_id
   ```

3. **Test call** (30 minutes)
   - Call +1-877-357-8556
   - Have natural conversation
   - Test interruptions
   - Does it sound human?

4. **If voice sounds robotic:**
   - Lower stability to 0.2
   - Increase style to 1.0
   - Add more natural speech to prompt
   - Test again

5. **Once voice is perfect:**
   - Mark Phase 1 complete
   - Start Phase 2 (receptionist features)

---

## ANSWERS TO YOUR SPECIFIC QUESTIONS

**Q: "Is the ElevenLabs Conversational Agent scalable?"**
**A: YES.** One agent can serve unlimited HVAC companies. We customize with prompts.

**Q: "Can it be self-serve?"**
**A: YES.** HVAC company signs up → fills form → system auto-configures → they're live. No manual setup.

**Q: "Do we need Deepgram and OpenAI?"**
**A: NO.** ElevenLabs Conversational AI has STT + LLM + TTS all built-in. We only need Twilio + ElevenLabs.

**Q: "How does one system serve multiple HVAC companies?"**
**A: Database has business_configs table. When call comes in, system looks up which business owns that number, loads their config, sends custom prompt to ElevenLabs. Same agent, different context.**

**Q: "What's the plan moving forward?"**
**A: THIS FILE. Four phases. No more changes. Phase 1 first (voice quality), don't move forward until complete.**

---

## RULES GOING FORWARD

1. **NO MORE .MD FILES** - This is the only plan document
2. **NO CHANGING THE STACK** - We're using ElevenLabs Conversational AI, period
3. **NO SKIPPING PHASES** - Phase 1 must be perfect before Phase 2
4. **NO OVERTHINKING** - Build, test, iterate, ship

---

## CURRENT STATUS

✅ **Code built** - elevenlabs-handler.js, routes, database schema
✅ **Deployed to Railway** - Live at production URL
✅ **Phone number active** - +1-877-357-8556
⏳ **Agent not configured** - Need to create in ElevenLabs dashboard (DO THIS NOW)
⏳ **Voice quality not tested** - Need to call and verify human-like quality
❌ **Receptionist features not built** - Phase 2
❌ **Dashboard not built** - Phase 3
❌ **Billing not built** - Phase 4

---

## NEXT ACTION

**CREATE THE ELEVENLABS AGENT RIGHT NOW.**

That's the only blocker. Everything else is ready.
