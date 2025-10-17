# Making the AI Receptionist Sound 100% Human

**Goal:** 90%+ of callers cannot distinguish it from a real person

This guide explains everything about the voice system and how to optimize it for maximum human-like quality.

---

## 🎯 How the System Works

### The Architecture
```
1. Caller dials → Twilio phone number
2. Twilio webhook → Your backend (/api/elevenlabs/incoming)
3. Backend creates WebSocket proxy
4. Caller audio → Backend → ElevenLabs Agent
5. AI response → Backend → Caller
6. Real-time conversation with sub-100ms latency
```

### Key Components

**Twilio Media Streams:**
- Streams caller audio in real-time (μ-law 8kHz format)
- Uses WebSocket for bidirectional audio
- `track="inbound_track"` ensures AI only hears the caller (NOT its own voice)

**Your Backend (WebSocket Proxy):**
- Receives audio from Twilio
- Forwards to ElevenLabs Conversational AI
- Receives AI audio response
- Sends back to Twilio/caller
- Located in: `apps/backend/src/websocket/elevenlabs-handler.js`

**ElevenLabs Conversational AI:**
- Agent with custom voice and personality
- Built-in Speech-to-Text (STT)
- Built-in Language Model (processes conversation)
- Built-in Text-to-Speech (TTS) with human-like voices
- Natural turn-taking and interruption handling

---

## 🎤 Voice Selection (THE MOST IMPORTANT PART)

### Recommended Voices for Receptionist

**Top 3 Choices:**

1. **Sarah** (`voice_id: EXAVITQu4vr4xnSDxMaL`)
   - Warm, professional female
   - Best for: HVAC, plumbing, medical offices
   - Natural variation with slight breathiness
   - Sounds genuinely helpful

2. **Charlie** (`voice_id: IKne3meq5aSn9XLyUdCD`)
   - Friendly, natural male
   - Best for: Tech, consulting, B2B
   - Confident but approachable
   - Clear phone clarity

3. **Laura** (`voice_id: FGY2WhTYpPnrIDTdsKH5`)
   - Conversational, upbeat female
   - Best for: Retail, hospitality, salons
   - Energetic without being artificial
   - Great for customer-facing businesses

### Voice Settings in Agent Dashboard

When configuring your agent, these settings control naturalness:

**Stability: 0.3-0.5** (CRITICAL)
- Lower = more human variation (hesitations, natural pauses)
- 0.5 = Good balance
- DON'T go above 0.7 (sounds robotic)

**Similarity: 0.75-0.85**
- Voice consistency
- 0.75 = Good for phone
- Too high can sound artificial

**Style: 0.7-0.9** (CRITICAL)
- Controls expressiveness, laughs, reactions
- 0.8 = Natural emotional range
- 0.9 = Maximum expressiveness (use for very conversational agents)

---

## 📝 Prompt Engineering for Human-Like Conversation

### The 6 Core Building Blocks

Based on ElevenLabs best practices, your system prompt should include:

#### 1. **Personality** (Who the agent is)
```
You are Sarah, a 28-year-old receptionist who loves helping people.
You've worked in customer service for 5 years and genuinely enjoy your job.
You're warm, patient, and professional but never stiff.
```

#### 2. **Environment** (Where they are)
```
You're answering phone calls for [Business Name], a [type of business].
Callers may be existing customers or new prospects.
Most calls are about: [list common scenarios]
```

#### 3. **Tone** (How they speak)
```
Speak conversationally like you're having a phone call with a friend.
- Use contractions: "I'm" not "I am"
- Natural filler words: "um", "let me see", "just a moment"
- Reactions: "oh!", "got it", "mm-hmm"
- Keep responses SHORT (1-2 sentences)
```

#### 4. **Natural Speech Markers** (The Secret Sauce)
```
Include these to sound human:
- Brief affirmations: "Got it", "Okay", "Sure"
- Filler words: "actually", "you know", "like"
- False starts: "I think... actually, let me check that"
- Thoughtful pauses: "Hmm...", "Let me see..."
- Backchanneling: "yeah", "mm-hmm" while they talk
```

#### 5. **TTS Optimization** (Format for speech)
```
- Use ellipses for pauses: "Let me... check that for you"
- Spell numbers: "five five five... one two three... four five six seven"
- Money as spoken: "$19.99" → "nineteen dollars and ninety-nine cents"
- Emails spelled out: "john dot smith at company dot com"
```

#### 6. **Guardrails** (What NOT to do)
```
- Don't give long explanations (keeps responses short)
- If you don't know something: "Let me check on that for you"
- Don't make things up - be honest about limitations
- Don't sound scripted or robotic
- Match the caller's energy (excited ↔ calm)
```

---

## ✅ Example PERFECT Prompt (Use This Template)

```
# Identity
You are Sarah, a professional receptionist for [Business Name].

# Role
You answer phone calls and help customers with:
- Scheduling appointments
- Answering questions about services
- Taking messages
- Providing business information

# CRITICAL: How to Sound Human

## Voice Delivery:
- Keep responses SHORT (1-2 sentences MAX)
- Use natural speech: "um", "let me see", "just a moment"
- Sometimes hesitate: "hmm... let me check that"
- Sound conversational, NOT scripted
- Use contractions: "I'm", "you're", "that's"

## Natural Reactions:
- "Oh!" when surprised
- "Got it" when understanding
- "Mm-hmm" to show you're listening
- "Yeah" to agree
- "Really?" to show interest

## Greeting:
"Hello! Thanks for calling [Business Name]. How can I help you today?"
(Keep it brief and warm)

## During Conversation:
- Ask clarifying questions: "What day works best for you?"
- Acknowledge: "Okay, I can help with that"
- If uncertain: "Let me check on that for you"
- Match their energy (if they're excited, be excited too)

## What NOT to Do:
- Don't give long explanations
- Don't sound formal or scripted
- Don't say the same phrases repeatedly
- Don't use robotic language like "I apologize for any inconvenience"

## Business Info:
Services: [List services]
Hours: [Business hours]
Address: [If relevant]

Remember: Sound like a real person having a phone conversation. Be helpful, warm, and natural.
```

---

## 🔧 Technical Configuration

### In ElevenLabs Dashboard:

1. **Agent Name:** "AI Receptionist - [Business Name]"

2. **Voice:** Sarah (or Charlie/Laura based on brand)

3. **Language:** English

4. **First Message:** Leave BLANK (let greeting come from prompt)

5. **Voice Settings:**
   - Stability: 0.5
   - Similarity: 0.75
   - Style: 0.8

6. **Advanced Settings:**
   - Turn detection: Enabled (handles interruptions)
   - Response delay: Default (don't change)

7. **System Prompt:** Use the template above

### In Your Code:

The agent ID goes in your environment:
```bash
# Local (.env)
ELEVENLABS_AGENT_ID=your_agent_id_here

# Production (Railway)
railway variables --set ELEVENLABS_AGENT_ID=your_agent_id_here
```

---

## 🎨 Voice Customization Per Business

### Multi-Agent Setup

You can have different agents for different businesses:

1. **Create 3 base agents:**
   - Professional Female (Sarah)
   - Professional Male (Charlie)
   - Upbeat Female (Laura)

2. **Store agent IDs:**
   ```sql
   UPDATE business_configs
   SET elevenlabs_agent_id = 'agent_id_here'
   WHERE business_id = 'business_id';
   ```

3. **Backend automatically uses business-specific agent:**
   ```javascript
   // In elevenlabs-handler.js
   agentId = businessConfig.elevenLabsAgentId || config.ELEVENLABS_AGENT_ID;
   ```

---

## 🐛 Common Issues & Fixes

### "AI is talking to itself"
**Problem:** Agent hears its own voice and responds to itself
**Fix:** ✅ FIXED - Added `track="inbound_track"` to TwiML
**Status:** Deployed in latest version

### "Voice sounds robotic"
**Problem:** Voice settings or prompt not optimized
**Fixes:**
- Lower stability to 0.3-0.5
- Increase style to 0.8-0.9
- Add more natural speech markers to prompt
- Try different voice (Sarah is most natural)

### "Responses are too long"
**Problem:** Agent gives monologues
**Fix:** Emphasize in prompt: "Keep responses SHORT (1-2 sentences MAX)"

### "Doesn't handle interruptions well"
**Problem:** Agent doesn't stop when caller speaks
**Check:** Turn detection should be enabled in agent settings
**Backend:** Interruption handling is automatic with ElevenLabs

### "Sounds too formal"
**Problem:** Prompt is too corporate
**Fix:** Use more casual language in prompt, add filler words

---

## 📊 Testing for Human-Like Quality

### The 90% Test

Get 10 people who DON'T know it's AI to call and rate:
- [ ] Did it sound like a real person? (Yes/No)
- [ ] Would you have known it was AI? (Yes/No)
- [ ] Was the conversation natural? (1-10)
- [ ] Any robotic moments? (List them)

**Goal:** 9 out of 10 think it's human = 90% pass rate

### What to Listen For:

**Good Signs:**
- ✅ Natural pauses and hesitations
- ✅ Varied responses (not repetitive)
- ✅ Appropriate emotional tone
- ✅ Smooth interruption handling
- ✅ Sounds genuinely helpful

**Red Flags:**
- ❌ Robotic consistency (too perfect)
- ❌ Repeated phrases
- ❌ Monotone delivery
- ❌ Long monologues
- ❌ Unnatural pauses

---

## 🚀 Optimization Workflow

1. **Start with Sarah voice, stability 0.5, style 0.8**
2. **Use the example prompt template**
3. **Test 5 calls yourself**
4. **Record any robotic moments**
5. **Iterate on prompt (add more natural speech markers)**
6. **Try adjusting stability (lower = more natural)**
7. **Test with external users**
8. **Measure pass rate**
9. **Keep iterating until 90%+**

---

## 🎯 Which Voice Should You Use?

Based on your business type:

**Service Businesses (HVAC, Plumbing, Electrical):**
→ **Sarah** - Warm, professional, trustworthy

**Tech/Consulting/B2B:**
→ **Charlie** - Confident, professional male voice

**Retail/Hospitality/Salons:**
→ **Laura** - Upbeat, friendly, conversational

**Medical/Legal/Finance:**
→ **Sarah** - Professional but caring

**Start with Sarah** - it's the most versatile and natural-sounding voice.

---

## 🔑 The Secret to 90%+ Pass Rate

**It's not one thing - it's the combination:**

1. ✅ **Right voice** (Sarah for most use cases)
2. ✅ **Low stability** (0.3-0.5 for natural variation)
3. ✅ **High style** (0.8-0.9 for expressiveness)
4. ✅ **Natural speech markers** in prompt (um, hmm, got it)
5. ✅ **Short responses** (1-2 sentences)
6. ✅ **Conversational tone** (not formal)
7. ✅ **Proper audio routing** (inbound_track only)
8. ✅ **Real user testing** (iterate based on feedback)

**Don't expect perfection on day 1.** Plan to iterate 5-10 times based on real user feedback.

---

**Current Status:** System is deployed and fixed (audio loop resolved). Ready for voice optimization and testing phase.
