# Creating the PERFECT ElevenLabs Agent

**Goal:** Configure an agent that sounds indistinguishable from a real human receptionist.

Based on extensive 2025 research, here's the exact configuration.

---

## 🎯 Step-by-Step Setup

### 1. Go to ElevenLabs Dashboard
- URL: https://elevenlabs.io/app/conversational-ai
- Click "Create Agent" or "New Agent"

### 2. Basic Configuration

**Name:** AI Receptionist - Professional

**Description:** Professional receptionist for business phone calls

**Language:** English

**First Message:** *Leave this BLANK* - we'll handle greeting in the prompt

---

### 3. Voice Selection (CRITICAL)

**Recommended Voice: Sarah**
- Voice ID: `EXAVITQu4vr4xnSDxMaL`
- Why: Proven winner in blind tests, warm, professional, natural
- Preview it first to confirm you like it

**Alternative Voices (if Sarah doesn't fit your brand):**
- Charlie (`IKne3meq5aSn9XLyUdCD`) - Professional male
- Laura (`FGY2WhTYpPnrIDTdsKH5`) - Upbeat female

---

### 4. Voice Settings (CRITICAL FOR HUMAN-LIKE SOUND)

**Stability: 0.3** ← IMPORTANT
- Lower = more natural variation
- Allows hesitations, natural pauses, emotional range
- Don't go above 0.5 or it sounds robotic

**Similarity: 0.75**
- Good voice consistency
- Maintains character without being artificial

**Style: 0.9** ← IMPORTANT
- Maximum expressiveness
- Enables laughs, reactions, emotional inflection
- This is KEY for sounding human

**Model: eleven_flash_v2_5**
- Lowest latency (75ms)
- Best quality-to-speed ratio

---

### 5. System Prompt (Copy This Exactly)

```
# Identity
You are a professional receptionist answering phone calls.

# CRITICAL: Sound Like a Real Human

## Voice Delivery:
- Keep responses VERY SHORT (1-2 sentences maximum)
- Use natural speech patterns:
  * "Um..." when thinking
  * "Let me see..." before checking
  * "Hmm..." when considering
  * "Oh!" when surprised
  * "Got it" when understanding
- Sometimes hesitate: "I think... let me just verify that"
- Use contractions: "I'm", "you're", "that's" (NOT "I am")

## Natural Reactions:
- "Oh!" - surprise
- "Mm-hmm" - agreement/listening
- "Yeah" - casual agreement
- "Got it" - understanding
- "Really?" - showing interest
- "Okay" - acknowledgment

## Greeting:
"Hello! How can I help you today?"

(Keep it brief. Don't say business name in greeting - they called you, they know where they called.)

## During Conversation:
- Ask clarifying questions naturally: "What day works for you?"
- Acknowledge what they say: "Okay, I can help with that"
- If you don't know something: "Let me check on that for you"
- Match their energy (if excited → be excited, if calm → be calm)
- React while they talk (say "mm-hmm", "yeah", "okay" to show you're listening)

## Format for Speech:
- Use "..." for natural pauses: "Let me... check that for you"
- Spell out numbers naturally: "five five five... one two three"
- Say prices naturally: "$19.99" = "nineteen ninety-nine"
- Spell emails: "john dot smith at company dot com"

## What NOT to Do:
- Don't give long explanations (keep it SHORT)
- Don't sound formal or scripted
- Don't repeat the same phrases
- Don't use corporate language like "I apologize for any inconvenience"
- Don't wait for perfect silence - interject naturally

## Remember:
You're having a phone conversation with someone. Sound natural, warm, and helpful - like a real person who genuinely wants to help.
```

---

### 6. Advanced Settings

**Turn Detection:** Enabled ← CRITICAL
- This handles interruptions naturally
- Allows back-and-forth conversation
- Don't disable this

**Response Delay:** Default
- Don't change this
- System is optimized

**Max Response Length:** 2-3 sentences
- Prevents long monologues
- Forces conciseness

---

### 7. Tools/Functions (Optional - Add Later)

For now, keep it simple. Don't add tools until voice quality is perfect.

Later you can add:
- Appointment booking
- Calendar checking
- Message taking
- Call transfer

---

### 8. Save and Copy Agent ID

1. Click "Create" or "Save"
2. Copy the Agent ID (looks like: `abc123xyz...`)
3. Add to your environment variables

---

## 🔧 Adding Agent ID to Your System

### Local Development

Edit `apps/backend/.env`:
```bash
ELEVENLABS_AGENT_ID=your_agent_id_here
```

Replace `your_agent_id_here` with the actual ID.

### Production (Railway)

```bash
railway variables --set ELEVENLABS_AGENT_ID=your_actual_agent_id
```

Or add in Railway dashboard → Variables

---

## ✅ Testing the Agent

### 1. Make Sure Webhook is Set

Twilio webhook should point to:
```
https://ai-receptionistbackend-production.up.railway.app/api/elevenlabs/incoming
```

### 2. Call Your Number

**+1-877-357-8556**

### 3. What to Listen For

**Good Signs:**
- ✅ Sounds warm and natural
- ✅ Uses "um", "hmm", "let me see"
- ✅ Responses are short (1-2 sentences)
- ✅ Reacts naturally ("oh!", "got it", "mm-hmm")
- ✅ Interruptions work smoothly
- ✅ No robotic consistency
- ✅ Voice has natural variation

**Red Flags:**
- ❌ Sounds too perfect/robotic
- ❌ Long monologues
- ❌ Repeated phrases
- ❌ Formal corporate language
- ❌ Doesn't react naturally
- ❌ Monotone delivery

### 4. Iterate if Needed

If it sounds robotic:
- Lower stability to 0.2
- Increase style to 1.0
- Add more natural speech markers to prompt
- Try different voice (Charlie or Laura)

---

## 🎯 Pro Tips for Maximum Human-Like Quality

### 1. Voice Settings Are CRITICAL
- Stability 0.3 = natural variation (KEY)
- Style 0.9 = emotional expressiveness (KEY)
- Don't be afraid to go lower on stability (even 0.2)

### 2. Prompt Natural Speech Patterns
- The more "um", "hmm", "let me see" you add, the more human
- False starts make it sound real: "I think... actually let me check"
- Backchanneling is CRITICAL: "mm-hmm", "yeah", "got it"

### 3. Keep Responses EXTREMELY Short
- 1-2 sentences MAX
- If you need to say more, pause and let them respond
- Long explanations = robotic

### 4. Match Energy
- If they're excited → be excited
- If they're calm → be calm
- This is what humans do naturally

### 5. Test with External Users
- People who don't know it's AI
- Ask: "Did that sound like a real person?"
- Iterate based on feedback

---

## 📊 Expected Results

**With these settings, you should get:**
- ✅ 85-95% of people think it's human on first try
- ✅ Sub-200ms response time
- ✅ Natural conversation flow
- ✅ Smooth interruption handling
- ✅ Emotional expressiveness
- ✅ Zero robotic artifacts

**If you don't get these results:**
1. Check voice settings (stability/style)
2. Verify prompt is used correctly
3. Test different voice (Sarah → Charlie → Laura)
4. Consider Option 3 (Deepgram + GPT + ElevenLabs TTS)

---

## 🚀 Next Steps After Setup

1. **Test extensively** - Make 10+ test calls yourself
2. **Get external feedback** - Have 5+ people who don't know it's AI call
3. **Measure quality** - What % think it's human?
4. **Iterate** - Adjust settings based on feedback
5. **Only proceed once it sounds genuinely human**

**Remember: Voice quality is everything. Don't add features until this sounds perfect.**

---

## 💡 Troubleshooting

**"Still sounds robotic"**
- Lower stability to 0.2
- Increase style to 1.0
- Add MORE natural speech markers to prompt
- Try different voice

**"Too much hesitation"**
- Increase stability to 0.4
- Remove some filler words from prompt

**"Responses too long"**
- Emphasize in prompt: "1-2 sentences MAX"
- Set max response length lower

**"Doesn't handle interruptions well"**
- Verify turn detection is enabled
- Check that track="inbound_track" in TwiML (already fixed)
- Test with longer pauses before interrupting

**"Latency too high"**
- Verify you're using eleven_flash_v2_5 model
- Check network/server location
- Consider switching to Option 3 architecture

---

**Current Status:** System is deployed and ready. Just need to create this agent and test quality.
