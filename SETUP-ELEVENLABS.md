# ElevenLabs Conversational AI Setup Guide

**THE BEST architecture for human-like voice quality**

This guide will help you set up ElevenLabs Conversational AI to power your AI receptionist with the most natural, human-like voice available.

---

## 🎯 What You're Building

```
Phone Call → Twilio → Your Backend → ElevenLabs Agent → Human-like voice
```

**Result:** Sub-100ms latency, natural conversation, 90%+ human pass rate

---

## 📋 Step 1: Create ElevenLabs Agent

1. **Go to ElevenLabs Dashboard**
   - Visit: https://elevenlabs.io/app/conversational-ai
   - Log in with your account (you already have an API key)

2. **Create New Agent**
   - Click "Create Agent" or "New Agent"
   - Give it a name: "AI Receptionist - Professional"

3. **Configure Voice**
   - Select a voice from the library
   - **Recommended voices to try:**
     - **Sarah** (warm, professional female)
     - **Charlie** (friendly, natural male)
     - **Laura** (upbeat, conversational female)
   - Test each voice with the preview feature

4. **Configure Conversation Settings**
   - **First Message:** Leave blank (we'll handle greeting in our prompt)
   - **Language:** English
   - **Voice Settings:**
     - Stability: 0.5 (allows natural variation)
     - Similarity: 0.75 (good voice consistency)
     - Style: 0.8 (maximum expressiveness)

5. **System Prompt**
   - Use this template (you can customize per business later):

```
You are a professional receptionist.

CRITICAL: Keep responses SHORT (1-2 sentences). Sound natural, not scripted.

Greeting: "Hello! How can I help you today?"

During conversation:
- Be warm and helpful
- Ask clarifying questions when needed
- Use natural reactions: "oh!", "got it", "mm-hmm"
- Don't give long explanations
- If you don't know something: "Let me check on that for you"

Sound like a real person having a phone conversation.
```

6. **Save and Get Agent ID**
   - Click "Save" or "Create"
   - Copy the **Agent ID** (it looks like: `abc123xyz...`)
   - You'll need this for the next step

---

## 📋 Step 2: Add Agent ID to Environment

1. **Local Development (.env file)**
   ```bash
   # Edit apps/backend/.env
   ELEVENLABS_AGENT_ID=your_agent_id_here
   ```
   Replace `your_agent_id_here` with the Agent ID you copied

2. **Production (Railway)**
   ```bash
   railway variables --set ELEVENLABS_AGENT_ID=your_agent_id_here
   ```
   Or add it in the Railway dashboard under Variables

---

## 📋 Step 3: Update Twilio Webhook

We need to point Twilio to use the new ElevenLabs endpoint instead of OpenAI.

**Option A: Using update-twilio-webhook.js script**

Create a file `apps/backend/update-webhook-to-elevenlabs.js`:

```javascript
const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Use Railway URL in production, or your ngrok URL for local testing
const webhookUrl = 'https://ai-receptionistbackend-production.up.railway.app/api/elevenlabs/incoming';

client
  .incomingPhoneNumbers
  .list({ phoneNumber: twilioNumber })
  .then(numbers => {
    if (numbers.length === 0) {
      console.error('❌ No phone number found');
      return;
    }

    const number = numbers[0];
    return client
      .incomingPhoneNumbers(number.sid)
      .update({
        voiceUrl: webhookUrl,
        voiceMethod: 'POST'
      });
  })
  .then(() => {
    console.log('✅ Webhook updated to ElevenLabs endpoint');
    console.log(`📞 ${twilioNumber} → ${webhookUrl}`);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });
```

Then run:
```bash
cd apps/backend
node update-webhook-to-elevenlabs.js
```

**Option B: Manually in Twilio Console**

1. Go to: https://console.twilio.com/
2. Phone Numbers → Manage → Active Numbers
3. Click on +1-877-357-8556
4. Scroll to "Voice Configuration"
5. Set "A CALL COMES IN" to:
   - **Webhook:** `https://ai-receptionistbackend-production.up.railway.app/api/elevenlabs/incoming`
   - **HTTP:** POST
6. Click "Save"

---

## 📋 Step 4: Test the System

1. **Call your Twilio number:** +1-877-357-8556

2. **What you should hear:**
   - AI greeting: "Hello! How can I help you today?"
   - Natural, human-like voice
   - Sub-200ms response time
   - Perfect interruption handling (you can say "yeah", "mm-hmm" naturally)

3. **If something's wrong:**
   - Check Railway logs: `railway logs`
   - Check that ELEVENLABS_AGENT_ID is set
   - Verify webhook URL is correct
   - Test ElevenLabs API key: `curl https://api.elevenlabs.io/v1/voices -H "xi-api-key: YOUR_KEY"`

---

## 🎙️ Step 5: Voice Testing & Selection

Now that it's working, test different voices to find the best ones:

### Testing Different Voices

1. Go to ElevenLabs dashboard
2. Clone your agent 3 times
3. Name them:
   - "AI Receptionist - Professional Female" (Sarah voice)
   - "AI Receptionist - Professional Male" (Charlie voice)
   - "AI Receptionist - Upbeat Female" (Laura voice)

4. For each agent:
   - Change the voice
   - Copy the new Agent ID
   - Update your environment variable
   - Test by calling the number

### Voice Evaluation Criteria

Rate each voice 1-10 on:
- [ ] Natural sound (not robotic)
- [ ] Appropriate tone for business
- [ ] Clarity on phone
- [ ] Emotional expressiveness
- [ ] Professional but warm

**Goal:** Select 3 voices that score 8+ on all criteria

---

## 🎯 Step 6: Multi-Voice Setup (Future)

Once you have 3 great voices, you can:

1. Store all 3 Agent IDs
2. Let businesses choose their preferred voice
3. Store choice in `business_configs.elevenLabsAgentId`
4. Backend will use business-specific agent automatically

---

## 🐛 Troubleshooting

### Static or No Audio
- Check ELEVENLABS_AGENT_ID is set correctly
- Verify agent exists in ElevenLabs dashboard
- Check Railway logs for connection errors

### "Business not found" error
- Make sure you have a business in database with twilioNumber matching your phone

### Connection timeout
- Check ElevenLabs API key is valid
- Try regenerating signed URL (happens automatically, but check logs)

### Voice sounds robotic
- Try different voices in ElevenLabs dashboard
- Adjust stability (lower = more natural variation)
- Increase style setting (more expressiveness)

---

## 📊 Success Metrics

After setup, verify:
- ✅ Call connects within 2 seconds
- ✅ AI responds within 200ms
- ✅ Voice sounds natural and human-like
- ✅ Interruptions work smoothly
- ✅ Conversation flows naturally
- ✅ No robotic artifacts

---

## 🚀 Next Steps

1. **Test extensively** - Call multiple times, try different scenarios
2. **Get external feedback** - Have people who don't know it's AI call
3. **Measure pass rate** - How many think it's human? (Goal: 90%+)
4. **Iterate on voices** - Keep testing until you hit the goal
5. **ONLY THEN** proceed to business features

---

**Remember: Voice quality is EVERYTHING. Don't proceed until it sounds genuinely human.**
