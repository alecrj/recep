# Production Deployment Checklist

## ✅ Phase 1: Verify Railway Deployment

### 1. Get Railway URL
- [ ] Go to Railway dashboard
- [ ] Find your backend deployment
- [ ] Copy the public URL (looks like: `https://ai-receptionist-backend-production-xxxx.up.railway.app`)

### 2. Test Backend Health
```bash
curl https://YOUR-RAILWAY-URL/health
```
Should return: `{"status":"ok"}`

### 3. Verify Database Connection
```bash
curl https://YOUR-RAILWAY-URL/api/calls/active
```
Should return: `{"activeCalls":0}` or similar

---

## ✅ Phase 2: Update Twilio Webhook

### 1. Log into Twilio Console
- Go to: https://console.twilio.com/
- Navigate to Phone Numbers → Manage → Active Numbers
- Click on your number: **+18773578556**

### 2. Update Webhook URL
- Scroll to "Voice Configuration"
- Set "A CALL COMES IN" to:
  ```
  https://YOUR-RAILWAY-URL/api/calls/incoming
  ```
- Method: `POST`
- Click **Save**

### 3. Test Webhook
- Call your Twilio number from your phone
- You should hear: "Thank you for calling! How can I help you today?"

---

## ✅ Phase 3: Setup Your First Business

### Option A: Use the Setup Script (Recommended)
```bash
DATABASE_URL="your-database-url" node scripts/setup-business.js
```

Follow the prompts to enter:
- Business name
- Owner info
- Twilio number
- Address & service area
- Emergency tech contact
- Hours of operation

### Option B: Manual Database Entry
Use the database query tool or run this:
```javascript
// See scripts/setup-business.js for the full setup
```

---

## ✅ Phase 4: Test Complete Call Flow

### Test Scenario 1: Book an Appointment
1. **Call** your Twilio number
2. **Say**: "Hi, my AC is broken and I need someone to come fix it"
3. **AI Should**:
   - Empathize with your problem
   - Ask for your name
   - Ask for your phone number
   - Ask for your address
   - Ask when works for you
   - Book the appointment
   - Confirm the details

### Test Scenario 2: Emergency Transfer
1. **Call** your Twilio number
2. **Say**: "This is an emergency! I smell gas coming from my furnace!"
3. **AI Should**:
   - Recognize the emergency
   - Say "Let me connect you with [emergency tech name] right away"
   - Transfer to the emergency phone number you configured

### Test Scenario 3: General Question
1. **Call** your Twilio number
2. **Say**: "What brands of air conditioners do you service?"
3. **AI Should**:
   - List the brands you configured
   - Ask if you need anything else

### Test Scenario 4: Hours Question
1. **Call** your Twilio number
2. **Say**: "What are your hours?"
3. **AI Should**:
   - Tell you the business hours you configured
   - Mention 24/7 emergency availability

---

## ✅ Phase 5: Verify Data in Dashboard

### Check Database for:
- [ ] Call logged in `calls` table with transcript
- [ ] Appointment created in `appointments` table
- [ ] Customer created in `customers` table
- [ ] Proper `businessId` association

### SQL Queries to Verify:
```sql
-- Check recent calls
SELECT * FROM calls ORDER BY started_at DESC LIMIT 5;

-- Check appointments
SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5;

-- Check customers
SELECT * FROM customers ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ Phase 6: Multi-Business Test

### Setup Second Business
1. Run setup script again with different:
   - Business name
   - Twilio number (you'll need to buy another)
   - Different service area
   - Different hours

2. **Test Call Routing**:
   - Call Business A's number → Should get Business A's info
   - Call Business B's number → Should get Business B's info
   - Verify AI uses correct company name, address, hours

---

## 🚨 Troubleshooting

### If calls don't connect:
1. Check Railway logs: `railway logs`
2. Check Twilio debugger: https://console.twilio.com/monitor/logs/debugger
3. Verify webhook URL is correct
4. Check DATABASE_URL is set in Railway env vars

### If AI doesn't respond naturally:
1. Check OPENAI_API_KEY is valid
2. Review conversation in database transcript
3. Check `openai.service.js` buildSystemPrompt method

### If appointments aren't created:
1. Check Prisma connection
2. Verify businessId exists
3. Check actionExecutor.js logs

---

## 📊 Success Metrics

After testing, you should have:
- ✅ Railway backend running 24/7
- ✅ Twilio number connected and working
- ✅ At least 1 successful test call with appointment booked
- ✅ Call transcript saved in database
- ✅ Emergency transfer routing working
- ✅ Multi-business capability proven

---

## 🎯 Next Steps After Validation

1. **Get your second customer**
   - Use setup script to onboard them
   - Purchase Twilio number for them
   - Test their specific use case

2. **Build admin dashboard**
   - View all businesses
   - See call analytics
   - Manage appointments

3. **Optimize voice quality**
   - Implement streaming TTS
   - Reduce latency
   - Add interruption handling

4. **Add pricing tiers**
   - Starter: $99/month
   - Professional: $199/month
   - Enterprise: Custom

---

## 🔥 DEMO SCRIPT FOR SALES

When showing this to a prospect:

### Script:
"Let me show you how this works. I'm going to call your new AI receptionist right now..."

[Call the number on speakerphone]

**You**: "Hi, my air conditioner stopped working and it's 95 degrees in here!"

**AI**: "Oh no, AC's out? That's the worst. Okay, let me get you taken care of. What's your name?"

**You**: "John Smith"

**AI**: "Perfect. And the best number for you?"

**You**: "555-1234"

**AI**: "Got it. And where are you at?"

**You**: "123 Main Street"

**AI**: "Alright, so we can get someone out there this afternoon around 2pm, does that work?"

**You**: "Yes!"

**AI**: "Perfect, we've got you scheduled for AC repair today at 2pm. You'll get a confirmation text shortly. Is there anything else I can help with?"

**You**: "Nope, that's it!"

**AI**: "Great, we'll see you this afternoon!"

[End call, show them the appointment in the dashboard]

**You**: "And just like that, the appointment is in your system, customer profile created, and they got a professional experience. No missed calls, no voicemail, no waiting for a call back. Just handled."

---

## 🎬 You're Ready to Sell When:
- [ ] Demo call works flawlessly
- [ ] Appointments book correctly
- [ ] Emergency routing works
- [ ] You can explain the system confidently
- [ ] You have pricing set
- [ ] You can onboard a new business in under 10 minutes
