# Self-Serve Multi-Tenant SaaS Architecture

**Build once, sell unlimited times with ZERO manual setup per customer**

## 🎯 Core Principle

**One codebase. One ElevenLabs agent. Unlimited customers.**

Every business gets the same system with their own:
- Phone number (auto-provisioned)
- Database records (isolated by businessId)
- Dynamic variables (loaded per call)
- Subscription (via Stripe)

**NO manual configuration. NO custom deployments. 100% automated.**

---

## 🚀 Self-Serve Onboarding Flow

### Customer Journey (5 minutes)

```
1. Visit https://voxi.ai
   ↓
2. Click "Get Started"
   ↓
3. Fill out signup form:
   - Business name
   - Owner name & email
   - Password
   - Current phone number
   - Industry (HVAC, Plumbing, etc.)
   - Choose plan ($299, $799, $1499)
   - Enter payment card
   - Select area code for AI phone number
   ↓
4. Click "Start 14-Day Free Trial"
   ↓
5. Backend automatically:
   ✅ Creates Stripe subscription
   ✅ Purchases Twilio phone number
   ✅ Creates business account in database
   ✅ Configures AI with business info
   ✅ Sends welcome email
   ↓
6. Customer sees welcome screen:
   "🎉 Your AI Receptionist is Ready!
    📞 Your Number: +1-555-123-4567
    Forward your business line → Start receiving calls"
   ↓
7. Customer logs into dashboard
   ↓
8. DONE! System is live.
```

**Time to value: 5 minutes**

---

## 🏗️ Multi-Tenant Architecture

### How ONE System Serves UNLIMITED Businesses

#### **ElevenLabs Agent** (Already working!)
```
ONE agent in your ElevenLabs account
    ↓
Uses dynamic variables:
- {{business_name}}
- {{greeting}}
- {{services}}
- {{hours}}
- {{emergency_phone}}
- {{owner_name}}
- {{business_id}}
    ↓
Backend loads different values per call
    ↓
Same agent sounds different for each business!
```

**Example:**
- Bob's HVAC calls → Agent says "Thanks for calling Bob's HVAC!"
- Joe's Plumbing calls → Agent says "Thanks for calling Joe's Plumbing!"
- Same agent. Different data. Zero configuration.

#### **Twilio Phone Numbers**
```
Each business gets unique number:
- Bob's HVAC: +1-602-555-1001
- Joe's Plumbing: +1-602-555-1002
- Sue's Electric: +1-602-555-1003

All webhook to: /api/elevenlabs/incoming

Backend looks up: SELECT * FROM businesses WHERE twilioNumber = incoming_number

Loads business config → Passes to ElevenLabs → Call proceeds
```

#### **Database Isolation**
```sql
-- Every table has businessId
appointments {
  id
  businessId  ← Isolates data
  customer_id
  scheduled_time
  ...
}

customers {
  id
  businessId  ← Isolates data
  name
  phone
  ...
}

-- Queries always filter by businessId
SELECT * FROM appointments WHERE businessId = 'bob-hvac-id'
-- Bob only sees Bob's appointments
```

**Result: Complete data isolation. One database serves all.**

---

## 💰 Revenue Model

### Pricing Tiers

| Plan | Price/mo | Features | Target Customer |
|------|----------|----------|----------------|
| **Starter** | $299 | 1 number, unlimited calls, booking, calendar sync | Solo contractors, small shops |
| **Professional** | $799 | + SMS/email notifications, analytics, CRM | Growing businesses, 2-10 employees |
| **Enterprise** | $1,499 | + Multiple numbers, custom AI, API access | Large companies, franchises |

### Revenue Projection

| Timeline | Customers | Avg Price | MRR | ARR |
|----------|-----------|-----------|-----|-----|
| Month 1 | 10 | $299 | $2,990 | $36K |
| Month 3 | 50 | $350 | $17,500 | $210K |
| Month 6 | 200 | $400 | $80,000 | $960K |
| Year 1 | 500 | $450 | $225,000 | **$2.7M** |

**Key metrics:**
- Churn target: <5% monthly
- Customer acquisition cost: $200-500 (ads + sales)
- Lifetime value: $5,000+ (12+ months avg)
- Gross margin: 85% (SaaS margins)

---

## 🔧 Backend Implementation

### Automated Signup API

**Endpoint:** `POST /api/signup`

**Request:**
```json
{
  "businessName": "Bob's HVAC",
  "ownerName": "Bob Smith",
  "email": "bob@bobshvac.com",
  "password": "SecurePass123",
  "phone": "+16025551234",
  "industry": "HVAC",
  "plan": "STARTER",
  "paymentMethodId": "pm_card_visa",
  "areaCode": "602"
}
```

**Backend Processing (30 seconds):**

```javascript
// 1. Create Stripe customer & subscription
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomer.id,
  items: [{ price: 'price_starter_monthly' }],
  trial_period_days: 14
});

// 2. Auto-purchase Twilio phone number
const numbers = await twilioClient.availablePhoneNumbers('US')
  .local.list({ areaCode: '602', limit: 1 });

const twilioNumber = await twilioClient.incomingPhoneNumbers.create({
  phoneNumber: numbers[0].phoneNumber,
  voiceUrl: `${BACKEND_URL}/api/elevenlabs/incoming`,
  friendlyName: 'AI Receptionist - Bob\'s HVAC'
});

// 3. Create business in database
const business = await prisma.business.create({
  data: {
    name: 'Bob\'s HVAC',
    ownerEmail: 'bob@bobshvac.com',
    ownerName: 'Bob Smith',
    password: hashedPassword,
    twilioNumber: twilioNumber.phoneNumber,
    status: 'TRIAL',
    plan: 'STARTER',
    config: {
      create: {
        greetingMessage: 'Thanks for calling Bob\'s HVAC!',
        services: ['AC Repair', 'Installation', 'Maintenance'],
        businessHours: '8am-6pm Monday-Friday'
      }
    }
  }
});

// 4. Send welcome email
await sendWelcomeEmail({
  to: 'bob@bobshvac.com',
  name: 'Bob Smith',
  phoneNumber: twilioNumber.phoneNumber,
  dashboardUrl: 'https://dashboard.voxi.ai'
});

// 5. Return success
return {
  success: true,
  token: jwtToken,
  phoneNumber: twilioNumber.phoneNumber,
  trialEndsAt: subscription.trial_end
};
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "business": {
    "id": "uuid",
    "name": "Bob's HVAC",
    "phoneNumber": "+1-602-555-1001",
    "trialEndsAt": "2025-11-01T00:00:00Z"
  },
  "nextSteps": {
    "step1": "Forward your business line to +1-602-555-1001",
    "step2": "Customize your AI in the dashboard",
    "step3": "Test by calling your AI number"
  }
}
```

---

## 📁 New Files Created

### Backend Services

**`apps/backend/src/services/phone-provisioning.js`**
- `searchAvailableNumbers(areaCode)` - Find available Twilio numbers
- `provisionPhoneNumber(businessId, areaCode)` - Auto-purchase & configure
- `releasePhoneNumber(businessId)` - Release when cancelled
- `updatePhoneNumberWebhooks()` - Update all webhooks (system updates)

**`apps/backend/src/routes/signup.js`**
- `POST /api/signup` - Complete self-serve signup
- `POST /api/signup/check-email` - Check if email available
- `GET /api/signup/area-codes` - Get available area codes

### Already Implemented (Multi-Tenant Ready!)

✅ **ElevenLabs Dynamic Variables** (`apps/backend/src/websocket/elevenlabs-handler.js`)
- Passes business-specific data per call
- One agent, unlimited businesses

✅ **Database Isolation** (`packages/database/schema.prisma`)
- All tables have `businessId`
- Complete data separation

✅ **Webhook Routing** (`apps/backend/src/routes/elevenlabs-call.js`)
- Looks up business by phone number
- Loads correct config per call

✅ **Tools with Business Context** (`apps/backend/src/routes/tools.js`)
- All tools receive `business_id` dynamic variable
- Appointments/customers saved to correct business

---

## 🎨 Frontend Signup Page (To Build)

### Landing Page Flow

**Page 1: Marketing Site** (`/`)
```
HEADLINE: "Never Miss Another Call"
SUBHEAD: "AI Receptionist that books appointments, takes messages, and sounds 100% human"

[Get Started - 14 Day Free Trial →]
```

**Page 2: Signup Form** (`/signup`)
```
┌─────────────────────────────────────┐
│  Step 1: Business Information       │
├─────────────────────────────────────┤
│  Business Name: [____________]       │
│  Industry: [HVAC ▼]                  │
│  Your Name: [____________]           │
│  Email: [____________]               │
│  Password: [____________]            │
│  Phone: [____________]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Step 2: Choose Your Plan           │
├─────────────────────────────────────┤
│  ○ Starter - $299/mo                 │
│  ● Professional - $799/mo ✓          │
│  ○ Enterprise - $1,499/mo            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Step 3: Get Your Phone Number      │
├─────────────────────────────────────┤
│  Area Code: [602 ▼]                  │
│  Your AI Number: +1-602-555-1001    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Step 4: Payment                     │
├─────────────────────────────────────┤
│  [Stripe Payment Element]            │
│  💳 Card Number                      │
│  📅 Expiry   🔒 CVC                 │
│                                      │
│  ✓ 14-day free trial                │
│  ✓ Cancel anytime                   │
└─────────────────────────────────────┘

[Start Free Trial →]
```

**Page 3: Welcome Screen** (`/welcome`)
```
🎉 Welcome to Voxi, Bob!

Your AI Receptionist is Ready

┌─────────────────────────────────────┐
│  📞 Your AI Phone Number             │
│                                      │
│      +1-602-555-1001                 │
│                                      │
│  [Copy Number]                       │
└─────────────────────────────────────┘

Next Steps:
✓ Account created
✓ Phone number assigned
☐ Forward your business line
☐ Customize your AI
☐ Test your AI

[Go to Dashboard →]
```

---

## 🔐 Security & Best Practices

### Multi-Tenancy Security

**Database-level isolation:**
```javascript
// EVERY query must filter by businessId
const appointments = await prisma.appointment.findMany({
  where: {
    businessId: req.user.id  // From JWT token
  }
});

// NEVER allow cross-business access
// Bad: SELECT * FROM appointments WHERE id = userInput
// Good: SELECT * FROM appointments WHERE id = userInput AND businessId = currentUser.businessId
```

### Payment Security

**Stripe handles:**
- PCI compliance
- Card storage
- Subscription billing
- Failed payment retries
- Invoicing

**We handle:**
- Webhook verification
- Subscription status sync
- Account suspension on failed payment
- Upgrade/downgrade logic

### Phone Number Security

**Twilio handles:**
- Call routing
- Audio streaming
- Number provisioning

**We handle:**
- Number assignment tracking
- Webhook authentication
- Call recording permissions
- TCPA compliance

---

## 📊 Operational Metrics to Track

### Customer Metrics
- Signups per day
- Trial conversion rate
- Plan distribution (Starter vs Pro vs Enterprise)
- Churn rate by plan
- Average revenue per customer

### System Metrics
- Total active phone numbers
- Calls per day (across all customers)
- Average call duration
- Appointments booked per day
- System uptime

### Cost Metrics
- Twilio costs per customer
- ElevenLabs costs per minute
- Stripe fees
- Hosting costs (Railway/AWS)
- **Target: <15% COGS**

---

## 🚦 Go-to-Market Checklist

### Before Launch:

- [ ] Set up Stripe product & pricing
- [ ] Configure Twilio number pool
- [ ] Build signup page frontend
- [ ] Set up welcome email (SendGrid)
- [ ] Create marketing website
- [ ] Add analytics (PostHog/Mixpanel)
- [ ] Set up customer support (Intercom)
- [ ] Write terms of service
- [ ] Write privacy policy
- [ ] Test complete signup flow
- [ ] Set up admin dashboard to monitor signups

### After Launch:

- [ ] Monitor signup funnel conversion
- [ ] Track trial-to-paid conversion
- [ ] Collect customer feedback
- [ ] Optimize AI responses based on call logs
- [ ] Build referral program
- [ ] Create case studies
- [ ] Launch paid ads (Google/Facebook)
- [ ] Partner with industry associations

---

## 🎯 Success Criteria

**System is truly self-serve when:**

✅ Customer can sign up in <5 minutes
✅ Zero manual steps required from you
✅ Phone number auto-assigned
✅ AI works immediately after signup
✅ Payment collected automatically
✅ Customer can customize everything in dashboard
✅ System scales to 1000+ customers with zero code changes

**Current Status:**

✅ Multi-tenant architecture working
✅ ElevenLabs dynamic variables working
✅ Database isolation working
✅ Auto phone provisioning built
✅ Signup API built
⏳ Signup frontend page (next)
⏳ Stripe integration testing (next)
⏳ Welcome email automation (next)

---

**You're 90% there!** The hard part (multi-tenancy, voice AI, tools) is done. Just need the signup UI and you're ready to launch.
