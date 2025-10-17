# AI Receptionist for HVAC Companies

Self-serve AI receptionist SaaS platform for HVAC businesses.

## 📋 THE PLAN

**Read GAMEPLAN.md** - This is the complete plan from start to finish.

## 🚀 Current Status

**Phase 1: Voice Quality** (In Progress)

- ✅ Code built and deployed
- ✅ Phone number active: +1-877-357-8556
- ⏳ Need to create ElevenLabs agent
- ⏳ Need to test voice quality

## 🔧 Tech Stack

- **Twilio** - Phone numbers and call routing
- **ElevenLabs Conversational AI** - All-in-one voice AI (STT + LLM + TTS)
- **Node.js + Express** - Backend API + WebSocket proxy
- **PostgreSQL** - Multi-tenant database
- **React** - Frontend dashboards (Phase 3)

## 📞 How It Works

```
HVAC company gets call
↓
Twilio routes to backend
↓
Backend loads business config
↓
ElevenLabs AI answers (human-like voice)
↓
Call transcript saved to database
```

## 🏗️ Multi-Tenant Architecture

One codebase serves unlimited HVAC companies:
- Each HVAC company has their own phone number
- Each has their own settings (hours, services, greeting)
- System loads the right config per call
- Fully self-serve onboarding

## 📁 Project Structure

```
/apps
  /backend - Node.js API + WebSocket proxy
  /admin-dashboard - React admin panel (Phase 3)
  /business-dashboard - React business portal (Phase 3)
/packages
  /database - Prisma schema + migrations
```

## 🎯 Next Actions

1. Create ElevenLabs agent in dashboard
2. Add agent ID to Railway: `railway variables --set ELEVENLABS_AGENT_ID=xyz`
3. Call +1-877-357-8556 and test
4. Iterate until voice sounds human

**See GAMEPLAN.md for complete roadmap.**
