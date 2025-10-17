# Voice AI Tech Stack Research - 2025 Cutting Edge

**Goal:** Build the most realistic, human-like AI receptionist possible. Google/Apple quality.

---

## 🔬 Research Findings

### Voice Quality Rankings (2025)

**Based on blind human preference tests and technical benchmarks:**

1. **ElevenLabs** - Winner for voice quality
   - Context awareness: 63.37% (vs OpenAI 39.25%)
   - Prosody accuracy: 64.57% (vs OpenAI 45.83%)
   - Pronunciation: 81.97% correct (vs OpenAI 77.30%)
   - Naturalness: 44.98% rated "high" (vs OpenAI 78% rated "low")
   - **Latency:** 75ms (Flash v2.5 model) + network

2. **Cartesia Sonic** - Winner for latency
   - **Latency:** 40-95ms (fastest in class)
   - Quality: Consistently wins blind preference tests
   - Voice cloning: Preserves emotion, accent, style perfectly
   - 15 languages, phone number/technical term mastery

3. **OpenAI Realtime API**
   - **Latency:** ~200ms
   - Quality: Good but behind ElevenLabs/Cartesia
   - Advantage: End-to-end (no STT→LLM→TTS pipeline)
   - Disadvantage: Voice options limited

### Speech-to-Text Rankings (2025)

1. **Deepgram Nova-3** - Winner for phone calls
   - **Latency:** 150ms US, 250-350ms global
   - **WER:** 6.84% (excellent)
   - Trained on real phone calls
   - Excels in noisy environments
   - Best for real-time streaming

2. **AssemblyAI Universal-2** - Winner for accuracy
   - **WER:** 6.68% (best accuracy)
   - Consistent across diverse scenarios
   - Slightly higher latency than Deepgram

3. **Groq Whisper** - Winner for speed/cost
   - **Latency:** Sub-300ms with hardware acceleration
   - Fastest transcription speed
   - Most competitive pricing

### LLM for Conversation

**GPT-4 Turbo / GPT-4o-mini:**
- Best conversational intelligence
- Function calling for actions (booking, transfers, etc.)
- Fast enough for real-time (<500ms typically)

---

## 🏆 THE WINNING ARCHITECTURES

### Option 1: Pure ElevenLabs Conversational AI (Simplest)

```
Caller → Twilio → ElevenLabs Agent → Back to caller
                    ↓
              (STT + LLM + TTS all built-in)
```

**Pros:**
- ✅ Simplest to implement (already mostly done)
- ✅ Best voice quality (ElevenLabs TTS)
- ✅ One vendor, one API call
- ✅ Built-in turn-taking and interruption handling
- ✅ 75ms latency for TTS

**Cons:**
- ❌ Locked into ElevenLabs STT/LLM choices
- ❌ Less control over conversation flow
- ❌ Can't optimize each component separately

**Cost:** ~$0.30-0.50/min

**Status:** Currently implemented but needs agent setup

---

### Option 2: Best-in-Class Stack (Optimal Performance)

```
Caller → Twilio → Backend WebSocket Proxy
                    ↓
                  Deepgram Nova-3 (STT) - 150ms
                    ↓
                  GPT-4o-mini (LLM) - 200ms
                    ↓
                  Cartesia Sonic (TTS) - 40ms
                    ↓
                  Back to caller
```

**Pros:**
- ✅ **Fastest possible latency:** ~390ms total
- ✅ **Best STT:** Deepgram trained on phone calls
- ✅ **Best LLM:** GPT-4o-mini for conversation
- ✅ **Lowest TTS latency:** Cartesia Sonic 40ms
- ✅ Complete control over each component
- ✅ Can optimize/swap components independently

**Cons:**
- ❌ More complex to implement
- ❌ Need to handle turn-taking and interruptions manually
- ❌ 3 API calls instead of 1
- ❌ Voice quality slightly behind ElevenLabs TTS

**Cost:** ~$0.20-0.30/min (cheaper than Option 1)

**Status:** Not implemented

---

### Option 3: Hybrid Best (Optimal Quality + Speed)

```
Caller → Twilio → Backend WebSocket Proxy
                    ↓
                  Deepgram Nova-3 (STT) - 150ms
                    ↓
                  GPT-4o-mini (LLM) - 200ms
                    ↓
                  ElevenLabs Flash v2.5 (TTS) - 75ms
                    ↓
                  Back to caller
```

**Pros:**
- ✅ **Best voice quality:** ElevenLabs TTS (proven winner)
- ✅ **Best STT:** Deepgram for phone calls
- ✅ **Best conversation:** GPT-4o-mini
- ✅ **Fast latency:** ~425ms total
- ✅ Complete control
- ✅ Each component best-in-class

**Cons:**
- ❌ More complex than Option 1
- ❌ Need to handle turn-taking/interruptions
- ❌ 3 API calls
- ❌ Slightly higher latency than Option 2 (but better voice)

**Cost:** ~$0.25-0.35/min

**Status:** Not implemented

---

## 🎯 RECOMMENDATION

### For Maximum Human-Like Quality: **Option 3 (Hybrid Best)**

**Why:**
1. **Voice Quality is #1 Priority** - ElevenLabs TTS is proven best
2. **Phone-Optimized STT** - Deepgram trained on real calls
3. **Fast Enough** - 425ms is excellent (human perception ~500ms)
4. **Full Control** - Can optimize each part
5. **We already have all the API keys** - Deepgram, OpenAI, ElevenLabs

### For Fastest Implementation: **Option 1 (Pure ElevenLabs)**

**Why:**
1. Already 90% implemented
2. Just need to create agent and configure properly
3. Good enough voice quality (not best, but good)
4. Simpler to debug and maintain

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Get Something Working (Option 1)
**Timeline:** 1-2 hours

1. Create ElevenLabs agent with optimal settings
2. Test and iterate on voice quality
3. Verify latency is acceptable
4. If it sounds good enough → ship it

### Phase 2: Upgrade to Best-in-Class (Option 3)
**Timeline:** 4-6 hours

1. Implement Deepgram streaming STT
2. Connect to GPT-4o-mini for conversation
3. Stream responses to ElevenLabs TTS
4. Handle turn-taking and interruptions
5. Optimize for sub-500ms latency

---

## 📊 Detailed Latency Breakdown

### Current System (OpenAI Realtime)
```
Total: ~300-500ms
- OpenAI processing: 200-300ms
- Network: 50-100ms
- Audio buffering: 50-100ms
```

### Option 1 (ElevenLabs Conversational AI)
```
Total: ~275-400ms
- ElevenLabs STT: 100-150ms
- ElevenLabs LLM: 100-150ms
- ElevenLabs TTS: 75ms
- Network: 50-100ms
```

### Option 2 (Cartesia - Fastest)
```
Total: ~340-490ms
- Deepgram STT: 150ms
- GPT-4o-mini: 200ms
- Cartesia TTS: 40ms
- Network: 50-100ms
```

### Option 3 (ElevenLabs TTS - Best Quality)
```
Total: ~375-525ms
- Deepgram STT: 150ms
- GPT-4o-mini: 200ms
- ElevenLabs TTS: 75ms
- Network: 50-100ms
```

**All are under human perception threshold (~500-600ms)**

---

## 🎤 Voice Settings for Maximum Realism

### ElevenLabs (if using Option 1 or 3)

**Best Voice: Sarah** (`EXAVITQu4vr4xnSDxMaL`)
- Most natural for receptionist
- Warm, professional female

**Settings:**
- Stability: **0.3** (more natural variation)
- Similarity: **0.75** (good consistency)
- Style: **0.9** (maximum expressiveness)
- Model: **eleven_flash_v2_5** (lowest latency)

### Cartesia (if using Option 2)

**Best Voice: TBD** (need to test their library)
- Focus on "professional female" category
- Test for phone clarity
- Verify emotional range

---

## 🐛 Why Current System Sounds Bad

**Issues with current OpenAI Realtime API setup:**

1. **Voice Limited** - OpenAI voices (shimmer, nova) aren't as natural as ElevenLabs
2. **Static Issue** - Was fixed (track="inbound_track")
3. **Latency** - 300-500ms is borderline
4. **Prompt** - Probably not optimized enough

**Issues with ElevenLabs attempt:**

1. **No Agent ID configured** - ELEVENLABS_AGENT_ID=your_agent_id_here
2. **Never tested** - System deployed but agent not created
3. **Prompt likely needs optimization**

---

## ✅ IMMEDIATE ACTION PLAN

**Let's go with hybrid approach:**

### Step 1: Fix ElevenLabs Agent (Quick Win)
1. Create agent in dashboard
2. Use optimal settings (stability 0.3, style 0.9)
3. Use proven prompt template
4. Test - if it sounds good, we're done

### Step 2: If Not Perfect, Build Option 3
1. Implement Deepgram streaming
2. Connect GPT-4o-mini
3. Use ElevenLabs for TTS only
4. Test and optimize

### Step 3: Iterate to Perfection
1. Test with 10+ external users
2. Measure what doesn't sound human
3. Fix specific issues
4. Repeat until 90%+ pass rate

---

## 💰 Cost Comparison

**Per Minute Costs (estimated):**

**Option 1 (ElevenLabs Conversational AI):**
- Total: $0.30-0.50/min

**Option 2 (Deepgram + GPT + Cartesia):**
- Deepgram STT: $0.0043/min
- GPT-4o-mini: ~$0.10/min (estimated)
- Cartesia TTS: ~$0.10/min
- Total: ~$0.20-0.25/min

**Option 3 (Deepgram + GPT + ElevenLabs):**
- Deepgram STT: $0.0043/min
- GPT-4o-mini: ~$0.10/min
- ElevenLabs TTS: ~$0.15/min
- Total: ~$0.25-0.30/min

**All are commercially viable at scale.**

---

## 🎯 DECISION

**Start with Option 1** (pure ElevenLabs) because:
1. Already 90% implemented
2. Fastest to test
3. If it sounds good enough, ship it
4. If not, we have Option 3 as backup

**Build Option 3** if ElevenLabs agent doesn't meet quality bar:
1. We have all the API keys
2. Best-in-class for each component
3. Full control and optimization
4. Proven to work (based on research)

---

**Next Action:** Create ElevenLabs agent with optimal settings and test the quality.
