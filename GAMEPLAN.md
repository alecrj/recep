# AI RECEPTIONIST FOR HVAC COMPANIES - COMPLETE BUSINESS PLAN

**THE FINAL, COMPLETE VISION**

---

## 🎯 WHAT WE'RE BUILDING

**Product:** Self-serve AI receptionist SaaS for HVAC companies
**Price:** $299, $799, $1499/month
**Goal:** Build once, each HVAC company signs up and gets their own customized receptionist automatically

---

## 🏗️ THE ARCHITECTURE (How One Agent Serves Unlimited Businesses)

### The Magic: Dynamic Variables in ElevenLabs

**You asked: "How can one agent be customized across the board with every business that signs up?"**

**Answer:** ElevenLabs agents support **dynamic variables** - we define variables in the agent prompt using `{{variable_name}}` syntax, then pass actual values at the start of each conversation.

### How It Works:

```
1. HVAC Company "Bob's HVAC" signs up
   ↓
2. They fill out form:
   - Business name: Bob's HVAC
   - Services: AC Repair, Heating, Installation
   - Hours: Mon-Fri 8am-6pm
   - Greeting: "Thanks for calling Bob's HVAC!"
   ↓
3. Data saved to database (business_configs table)
   ↓
4. Customer calls Bob's HVAC number (+1-555-123-4567)
   ↓
5. Twilio routes to your backend
   ↓
6. Backend looks up: Who owns +1-555-123-4567? → Bob's HVAC
   ↓
7. Backend loads Bob's config from database
   ↓
8. Backend connects to ElevenLabs agent with dynamic variables:
   {
     "business_name": "Bob's HVAC",
     "services": "AC Repair, Heating, Installation",
     "hours": "Mon-Fri 8am-6pm",
     "greeting": "Thanks for calling Bob's HVAC!",
     "service_area": "Phoenix, AZ",
     "phone": "+1-555-888-9999"
   }
   ↓
9. ElevenLabs agent uses these variables to personalize conversation
   ↓
10. AI answers: "Thanks for calling Bob's HVAC! This is Sarah, how can I help you today?"
```

**Same agent, unlimited businesses, fully customized behavior.**

---

## 🧠 THE ELEVENLABS AGENT SETUP

### Agent Configuration (One-Time Setup):

**System Prompt with Dynamic Variables:**

```
You are a professional receptionist for {{business_name}}.

# Your Role
Answer phone calls for {{business_name}}, an HVAC company serving {{service_area}}.

# CRITICAL: Sound Like a Real Human
- Keep responses SHORT (1-2 sentences)
- Use natural speech: "um", "let me see", "just a moment"
- React naturally: "oh!", "mm-hmm", "got it"
- Match caller's energy

# Greeting
Start every call with: "{{greeting}}"

# Business Information
Services we offer: {{services}}
Business hours: {{hours}}
Service area: {{service_area}}
Emergency contact: {{emergency_phone}}

# What You Can Do
1. Answer questions about services and pricing
2. Check calendar availability and book appointments
3. Take messages for the owner
4. Handle emergency calls (transfer to {{emergency_phone}})

# Instructions
- If they want to book: Use the check_availability tool, then book_appointment tool
- If they need emergency service: Transfer to {{emergency_phone}}
- If owner needs to call back: Use the take_message tool
- Answer questions using the business information provided

Be warm, helpful, and sound like a real person.
```

### Dynamic Variables Defined in Agent:

- `{{business_name}}` - Company name
- `{{greeting}}` - Custom greeting message
- `{{services}}` - List of services offered
- `{{hours}}` - Business hours
- `{{service_area}}` - Geographic service area
- `{{emergency_phone}}` - After-hours emergency number
- `{{calendar_id}}` - Google Calendar ID for booking
- `{{owner_name}}` - Owner's name for messages

### Custom Tools (Webhooks):

**1. check_availability**
- Description: "Check calendar availability for service appointments"
- URL: `https://your-backend.com/api/tools/check-availability`
- Method: POST
- Parameters: `date` (string), `business_id` (from context)
- Returns: Available time slots

**2. book_appointment**
- Description: "Book a service appointment"
- URL: `https://your-backend.com/api/tools/book-appointment`
- Method: POST
- Parameters: `customer_name`, `customer_phone`, `date`, `time`, `service_type`, `business_id`
- Returns: Confirmation with appointment details

**3. take_message**
- Description: "Record a message for the business owner"
- URL: `https://your-backend.com/api/tools/take-message`
- Method: POST
- Parameters: `customer_name`, `customer_phone`, `message`, `business_id`
- Returns: Message recorded confirmation

**4. transfer_to_emergency**
- Description: "Transfer call to emergency contact"
- Built-in ElevenLabs tool: "Transfer to number"
- Uses: `{{emergency_phone}}` variable

---

## 💻 THE TECHNICAL IMPLEMENTATION

### Updated Backend Flow:

```javascript
// In elevenlabs-handler.js

async function getSignedUrl(agentId, dynamicVariables) {
  const params = new URLSearchParams({
    agent_id: agentId
  });

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?${params}`,
    {
      method: 'POST',  // Changed to POST to send body
      headers: {
        'xi-api-key': config.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dynamic_variables: dynamicVariables  // Pass business-specific data
      })
    }
  );

  return (await response.json()).signed_url;
}

async function initializeConnection() {
  // Load business config from database
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { config: true }
  });

  // Prepare dynamic variables for this specific business
  const dynamicVariables = {
    business_name: business.name,
    greeting: business.config.greetingMessage,
    services: business.config.services.join(', '),
    hours: business.config.businessHours,
    service_area: business.config.serviceArea,
    emergency_phone: business.config.emergencyContactPhone || business.ownerPhone,
    calendar_id: business.config.googleCalendarId,
    owner_name: business.ownerName,
    business_id: business.id  // For webhook tool calls
  };

  // Get signed URL with dynamic variables
  const signedUrl = await getSignedUrl(agentId, dynamicVariables);

  // Connect to ElevenLabs with personalized agent
  elevenLabsWs = new WebSocket(signedUrl);
}
```

### Tool Webhook Endpoints:

```javascript
// In apps/backend/src/routes/tools.js

router.post('/tools/check-availability', async (req, res) => {
  const { date, business_id } = req.body;

  // Load business calendar
  const business = await prisma.business.findUnique({
    where: { id: business_id },
    include: { config: true }
  });

  // Check Google Calendar availability
  const availableSlots = await googleCalendar.getAvailableSlots(
    business.config.googleCalendarAccessToken,
    business.config.googleCalendarId,
    date
  );

  return res.json({
    available_slots: availableSlots,
    message: `Available times on ${date}: ${availableSlots.join(', ')}`
  });
});

router.post('/tools/book-appointment', async (req, res) => {
  const { customer_name, customer_phone, date, time, service_type, business_id } = req.body;

  // Load business
  const business = await prisma.business.findUnique({
    where: { id: business_id },
    include: { config: true }
  });

  // Create customer record
  const customer = await prisma.customer.upsert({
    where: { phone_businessId: { phone: customer_phone, businessId: business_id } },
    update: { name: customer_name },
    create: {
      name: customer_name,
      phone: customer_phone,
      businessId: business_id
    }
  });

  // Book in Google Calendar
  const event = await googleCalendar.createEvent(
    business.config.googleCalendarAccessToken,
    business.config.googleCalendarId,
    {
      summary: `${service_type} - ${customer_name}`,
      description: `Customer: ${customer_name}\nPhone: ${customer_phone}\nService: ${service_type}`,
      start: { dateTime: `${date}T${time}` },
      end: { dateTime: `${date}T${addHours(time, 1)}` }  // 1 hour appointment
    }
  );

  // Save to database
  const appointment = await prisma.appointment.create({
    data: {
      businessId: business_id,
      customerId: customer.id,
      scheduledAt: new Date(`${date}T${time}`),
      serviceType: service_type,
      status: 'SCHEDULED',
      googleEventId: event.id
    }
  });

  // Send SMS confirmation
  await twilioService.sendSMS(
    customer_phone,
    `Appointment confirmed! ${business.name} - ${service_type} on ${date} at ${time}. See you then!`
  );

  return res.json({
    success: true,
    message: `Appointment booked for ${date} at ${time}. Confirmation sent via text.`,
    appointment_id: appointment.id
  });
});

router.post('/tools/take-message', async (req, res) => {
  const { customer_name, customer_phone, message, business_id } = req.body;

  // Save message to database
  await prisma.message.create({
    data: {
      businessId: business_id,
      customerName: customer_name,
      customerPhone: customer_phone,
      message: message,
      createdAt: new Date()
    }
  });

  // Notify business owner via SMS
  const business = await prisma.business.findUnique({ where: { id: business_id } });
  await twilioService.sendSMS(
    business.ownerPhone,
    `New message from ${customer_name} (${customer_phone}): ${message}`
  });

  return res.json({
    success: true,
    message: `Got it! I've recorded your message and ${business.ownerName} will call you back shortly.`
  });
});
```

---

## 🚀 THE SELF-SERVE ONBOARDING FLOW

### Step 1: HVAC Owner Visits Your Website

Landing page: **"Never Miss Another HVAC Call - AI Receptionist Starting at $299/month"**

### Step 2: Signup Form

**Business Information:**
- Company name: ________________
- Service area (city/region): ________________
- Owner name: ________________
- Owner email: ________________
- Owner phone: ________________

**Business Hours:**
- Monday-Friday: [8:00 AM] to [6:00 PM]
- Saturday: [9:00 AM] to [3:00 PM]
- Sunday: [Closed]
- After-hours emergency number: ________________

**Services Offered (check all):**
- [ ] AC Repair
- [ ] Heating Repair
- [ ] Installation
- [ ] Maintenance
- [ ] Emergency Service
- [ ] Commercial HVAC
- [Custom]: ________________

**Pricing (typical):**
- Service call fee: $______
- Hourly rate: $______
- Emergency rate: $______

**Greeting Message:**
- Default: "Thanks for calling [Business Name]! How can I help you today?"
- Custom: ________________

**Choose Voice:**
- ( ) Sarah - Professional female (PLAY SAMPLE)
- ( ) Mike - Friendly male (PLAY SAMPLE)
- ( ) Lisa - Upbeat female (PLAY SAMPLE)

### Step 3: Calendar Integration

"Connect your Google Calendar so the AI can book appointments automatically"

[Connect Google Calendar Button]

### Step 4: Pricing Selection

**STARTER - $299/month**
- 500 minutes (~ 100 calls)
- 1 phone number
- Basic AI receptionist
- Appointment booking
- Message taking
- Email support

**PROFESSIONAL - $799/month**
- 2,000 minutes (~ 400 calls)
- Up to 3 phone numbers
- Advanced AI features
- Priority support
- Custom voice options
- Call analytics dashboard

**ENTERPRISE - $1,499/month**
- Unlimited minutes
- Unlimited phone numbers
- Dedicated account manager
- Custom integrations
- White-label option
- Advanced reporting

[Select Plan]

### Step 5: Payment

Enter credit card → Stripe Checkout

### Step 6: Automatic Setup (Backend Does This)

```javascript
// In signup handler
async function handleBusinessSignup(signupData) {
  // 1. Create business record
  const business = await prisma.business.create({
    data: {
      name: signupData.businessName,
      industry: 'HVAC',
      ownerEmail: signupData.ownerEmail,
      ownerPhone: signupData.ownerPhone,
      ownerName: signupData.ownerName,
      plan: signupData.selectedPlan, // STARTER, PROFESSIONAL, ENTERPRISE
      status: 'ACTIVE'
    }
  });

  // 2. Provision Twilio phone number
  const phoneNumber = await twilioService.provisionNumber({
    areaCode: signupData.areaCode || '800',
    capabilities: ['voice', 'sms']
  });

  await prisma.business.update({
    where: { id: business.id },
    data: { twilioNumber: phoneNumber }
  });

  // 3. Configure Twilio webhook
  await twilioService.configureWebhook(phoneNumber, {
    voiceUrl: `${config.BACKEND_URL}/api/elevenlabs/incoming`,
    voiceMethod: 'POST'
  });

  // 4. Create business config
  await prisma.businessConfig.create({
    data: {
      businessId: business.id,
      aiVoiceId: signupData.chosenVoice, // 'sarah', 'mike', 'lisa'
      aiAgentName: signupData.receptionistName || 'Sarah',
      aiTone: 'Professional and friendly',
      greetingMessage: signupData.customGreeting || `Thanks for calling ${signupData.businessName}! How can I help you today?`,
      businessHours: signupData.businessHours,
      serviceArea: signupData.serviceArea,
      services: signupData.services,
      emergencyContactPhone: signupData.emergencyPhone,
      // Google Calendar tokens saved during OAuth flow
      googleCalendarId: signupData.calendarId,
      googleCalendarAccessToken: signupData.calendarAccessToken,
      googleCalendarRefreshToken: signupData.calendarRefreshToken,
    }
  });

  // 5. Create Stripe customer and subscription
  const stripeCustomer = await stripe.customers.create({
    email: signupData.ownerEmail,
    name: signupData.businessName,
    metadata: { business_id: business.id }
  });

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomer.id,
    items: [{ price: getPriceId(signupData.selectedPlan) }],
    metadata: { business_id: business.id }
  });

  // 6. Send welcome email with phone number
  await emailService.send({
    to: signupData.ownerEmail,
    subject: '🎉 Your AI Receptionist is Live!',
    html: `
      <h1>Welcome to AI Receptionist!</h1>
      <p>Your AI receptionist is now live and ready to answer calls.</p>
      <h2>Your New Phone Number:</h2>
      <p style="font-size: 24px; font-weight: bold;">${phoneNumber}</p>
      <p>Forward your existing number to this one, or use it as your new business line.</p>
      <h3>Next Steps:</h3>
      <ol>
        <li>Make a test call: ${phoneNumber}</li>
        <li>Log in to your dashboard: ${config.BUSINESS_DASHBOARD_URL}</li>
        <li>Customize your receptionist settings</li>
      </ol>
    `
  });

  return {
    businessId: business.id,
    phoneNumber: phoneNumber,
    dashboardUrl: `${config.BUSINESS_DASHBOARD_URL}/login`
  };
}
```

### Step 7: Welcome Screen

```
🎉 You're All Set!

Your AI Receptionist is Live

Your new business number: +1-800-555-1234

✅ AI receptionist configured
✅ Calendar connected
✅ Billing active

Next Steps:
1. [Make a Test Call] → Call your number now
2. [View Dashboard] → See call logs and settings
3. [Customize Settings] → Adjust hours, services, greeting

Need help? support@ai-receptionist.com
```

---

## 📊 THE BUSINESS DASHBOARD (What HVAC Owners See)

### Dashboard Pages:

**1. Home / Today's View**
- Today's call volume
- Scheduled appointments for today
- Recent messages
- Real-time: "Call in progress..." notification

**2. Calls**
- List of all calls with:
  - Date/time
  - Caller name/number
  - Duration
  - Outcome (Booked appointment, Left message, Question answered, Hung up)
  - [Listen to Recording] button
  - [View Transcript] button

**3. Appointments**
- Calendar view synced with Google Calendar
- List view of upcoming appointments
- Filter by status (Scheduled, Completed, Cancelled)
- Ability to manually add/edit/cancel

**4. Messages**
- Inbox of messages left by callers
- Mark as read/unread
- [Call Back] button (initiates call via Twilio)
- Archive

**5. Customers (CRM)**
- List of all customers who've called
- Each customer shows:
  - Name, phone, email
  - Total calls
  - Appointments history
  - Messages history
  - Notes field

**6. Settings**
- **Business Info**: Name, hours, services, pricing
- **Receptionist Voice**: Choose between Sarah/Mike/Lisa
- **Greeting Message**: Customize greeting
- **Calendar**: Reconnect Google Calendar
- **Phone Number**: View current number, port existing number
- **Notifications**: SMS/email preferences
- **Team**: Add team members (Professional/Enterprise plans)

**7. Analytics**
- Calls per day/week/month chart
- Busiest call times
- Call outcomes pie chart
- Appointment booking rate
- Average call duration
- Missed calls (if any)

**8. Billing**
- Current plan
- Minutes used this month
- Upgrade/downgrade options
- Invoices
- Payment method

---

## 💰 PRICING & ECONOMICS

### Your Pricing (What HVAC Companies Pay):

**STARTER - $299/month**
- 500 minutes (~100 calls)
- Target: Small HVAC shops (1-3 technicians)

**PROFESSIONAL - $799/month**
- 2,000 minutes (~400 calls)
- Target: Mid-size HVAC companies (4-10 technicians)

**ENTERPRISE - $1,499/month**
- Unlimited minutes
- Target: Large HVAC companies (10+ technicians)

### Your Costs (Per Business):

**STARTER Plan Costs:**
- Twilio phone number: $2/month
- Twilio voice (500 min): $4.25
- ElevenLabs (500 min): $40 ($0.08/min)
- OpenAI (for LLM in agent): ~$15
- Infrastructure (server, database): ~$5
- **Total Cost: $66.25/month**
- **Profit: $232.75/month (78% margin)**

**PROFESSIONAL Plan Costs:**
- Twilio phone number: $2/month
- Twilio voice (2000 min): $17
- ElevenLabs (2000 min): $160
- OpenAI: ~$50
- Infrastructure: ~$10
- **Total Cost: $239/month**
- **Profit: $560/month (70% margin)**

**ENTERPRISE Plan Costs:**
- ~$600-800/month at scale
- **Profit: $699-899/month (47-60% margin)**

### Revenue Projections:

**Year 1:**
- 50 customers × avg $500/month = $25,000/month = $300K/year
- Profit after costs: ~$200K

**Year 2:**
- 200 customers × avg $600/month = $120,000/month = $1.44M/year
- Profit after costs: ~$1M

**Year 3:**
- 500 customers × avg $650/month = $325,000/month = $3.9M/year
- Profit after costs: ~$2.8M

---

## 🎯 GO-TO-MARKET STRATEGY

### Target Customer Profile:

**Ideal Customer:**
- HVAC company with 3-10 employees
- Handles 50-200 calls/month
- Currently missing 20-30% of calls
- Paying receptionist $3,000-4,000/month OR missing revenue from lost calls
- Tech-savvy enough to sign up online
- Located in US (for now)

### Customer Acquisition:

**1. Google Ads**
- Keywords: "HVAC answering service", "HVAC receptionist", "AI receptionist HVAC"
- Cost: ~$5-10 per click, 10% conversion = $50-100 CAC
- Budget: $5,000/month → 50-100 signups/month

**2. Facebook/Instagram Ads**
- Target: HVAC business owners, 30-55 years old
- Creative: Video showing AI receptionist in action
- Budget: $3,000/month

**3. HVAC Industry Partnerships**
- Partner with HVAC supply distributors
- Attend HVAC trade shows
- Sponsor HVAC podcasts/YouTube channels

**4. Content Marketing**
- Blog: "How to Never Miss an HVAC Call Again"
- YouTube: Demo videos of AI receptionist
- Case studies: "Bob's HVAC increased bookings 40% with AI"

**5. Referral Program**
- Give existing customers $100/month credit for each referral
- Referred customer gets first month 50% off

### Sales Funnel:

Landing page → 14-day free trial → Onboarding call (for high-value leads) → Activation → Paid subscriber

**Free Trial Strategy:**
- 14 days free, no credit card required
- During trial: High-touch onboarding, personal check-in calls
- Conversion target: 30% trial → paid

---

## 🔧 DEVELOPMENT PHASES (Updated)

### PHASE 1: Voice Quality (Week 1)
**Status: Current**

✅ Code built
✅ ElevenLabs integration working
⏳ Create agent with dynamic variables
⏳ Test with one business
⏳ Iterate until voice sounds 100% human

**Deliverable:** One working HVAC company with perfect voice quality

### PHASE 2: Multi-Tenant + Tools (Week 2-3)

**Build:**
1. Update `getSignedUrl()` to pass dynamic variables
2. Create agent in ElevenLabs with `{{variable}}` syntax in prompt
3. Build 3 tool webhook endpoints:
   - `/api/tools/check-availability`
   - `/api/tools/book-appointment`
   - `/api/tools/take-message`
4. Integrate Google Calendar API
5. Test with 3 different dummy businesses

**Deliverable:** System that can serve multiple businesses with different configs

### PHASE 3: Business Dashboard (Week 4-5)

**Build:**
1. React dashboard with pages: Home, Calls, Appointments, Messages, Customers, Settings
2. Authentication (login/logout for business owners)
3. Call transcript display
4. Appointment management
5. Message inbox
6. Settings page to customize greeting, hours, services

**Deliverable:** HVAC owners can log in and manage their receptionist

### PHASE 4: Self-Serve Onboarding (Week 6-7)

**Build:**
1. Landing page with signup form
2. Signup flow that collects all business info
3. Google Calendar OAuth integration during signup
4. Automatic Twilio number provisioning
5. Stripe checkout for payment
6. Welcome email with phone number
7. Admin dashboard (your view) to see all businesses

**Deliverable:** HVAC companies can sign up completely self-serve

### PHASE 5: Billing & Analytics (Week 8)

**Build:**
1. Stripe subscription management
2. Usage tracking (minutes used)
3. Overage billing
4. Analytics dashboard for HVAC owners
5. Invoice generation
6. Plan upgrade/downgrade

**Deliverable:** Fully automated billing system

### PHASE 6: Marketing & Launch (Week 9-10)

**Build:**
1. Marketing landing page
2. Demo video
3. Case study with beta customer
4. Google Ads campaign
5. Onboard first 10 paying customers

**Deliverable:** Live business with paying customers

---

## ✅ PROOF THE SYSTEM WORKS

### Why This Architecture is Scalable:

1. **One ElevenLabs Agent Serves Everyone** ✅
   - Dynamic variables customize per business
   - No need to create agent per customer
   - Works for 10 businesses or 10,000

2. **Database is Multi-Tenant** ✅
   - `businesses` table (each HVAC company is a row)
   - `business_configs` table (each has their own settings)
   - `calls`, `appointments`, `customers` all have `business_id` foreign key

3. **Phone Numbers Scale** ✅
   - Twilio has unlimited phone numbers
   - Automatically provision via API
   - Each business gets unique number

4. **Webhooks Handle Tools** ✅
   - ElevenLabs agent calls YOUR API for booking/messages
   - Your API loads correct business config
   - Works for any number of businesses

5. **Self-Serve Onboarding** ✅
   - Signup form → automatic setup
   - No manual configuration needed
   - HVAC owner is live in 5 minutes

### Real-World Examples of This Architecture:

- **Shopify**: One platform, millions of stores, each customized
- **Calendly**: One scheduling system, unlimited users, each with own settings
- **Intercom**: One chat widget, thousands of businesses, personalized per company

**We're building the Shopify of AI receptionists for HVAC companies.**

---

## 🎯 THE ANSWER TO YOUR QUESTIONS

### Q: "How will it actually be able to work with each company that signs up?"

**A:** Dynamic variables. The agent prompt has `{{business_name}}`, `{{services}}`, `{{hours}}`, etc. When a call comes in, we load that specific business's data from the database and pass it to ElevenLabs. The agent behaves as if it's working for that specific company.

### Q: "How can one agent be customized across the board with every business?"

**A:** The agent is a template. Variables get filled in at runtime. It's like a form letter - one template, but personalized for each recipient.

### Q: "I want to be able to have hundreds of clients and need a system that can work self-serve"

**A:** Yes. Signup form → automatic database entry → automatic phone number → automatic webhook configuration → HVAC owner is live. No human intervention needed.

### Q: "On their CRM dashboard they will be able to choose voice, input their services, etc."

**A:** Yes. Settings page in dashboard. They change greeting → saved to `business_configs` table → next call uses new greeting.

### Q: "It must link to their calendar"

**A:** Yes. During signup, they click "Connect Google Calendar" → OAuth flow → tokens saved → agent can now check availability and book appointments using Google Calendar API.

### Q: "How does this whole system work?"

**A:** See the complete flow diagrams above. But in summary:
1. HVAC company signs up (self-serve)
2. Gets phone number automatically
3. Customer calls → Twilio → Your backend → ElevenLabs with business-specific variables → AI answers
4. AI can check calendar, book appointments, take messages (via webhook tools)
5. Everything shows up in HVAC owner's dashboard
6. They pay monthly via Stripe
7. System scales to unlimited businesses

---

## 🚀 NEXT IMMEDIATE ACTION

**Stop overthinking. Start building.**

**Today:**
1. Create ONE ElevenLabs agent with dynamic variables in the prompt
2. Test passing dynamic variables via the API
3. Make a test call with one business configuration
4. Verify voice sounds human

**This Week:**
Complete Phase 1 (voice quality perfect)

**Next Week:**
Build Phase 2 (multi-tenant with tools)

**One phase at a time. No more changes to the plan.**

This is the blueprint. Follow it. Build it. Ship it.
