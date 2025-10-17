# If Call is Still Silent - Debugging Steps

## 1. Check Railway Environment Variables

The #1 cause of silence is missing/wrong API key in Railway.

**Do this:**
1. Go to Railway dashboard → Your service → Variables
2. Confirm `OPENAI_API_KEY` exists and starts with `sk-proj-`
3. If missing, add it from your local `.env` file

## 2. Check Railway Logs

Look for these errors in Railway logs:

**401 Unauthorized:**
```
OpenAI WebSocket error: Incorrect API key
```
→ Fix: Update OPENAI_API_KEY in Railway variables

**Model Error:**
```
Error: Unknown model 'gpt-realtime'
```
→ Fix: Verify your OpenAI account has Realtime API access (paid tier required)

**Connection Refused:**
```
WebSocket connection failed
```
→ Fix: Check OpenAI service status, verify API key tier

## 3. Test Locally First

Before calling production, test locally:

```bash
# In terminal 1:
cd apps/backend
npm run dev

# In terminal 2:
# Use ngrok to expose local server
ngrok http 3000

# Update Twilio webhook to ngrok URL
# Then call your number
```

If it works locally but not on Railway → Environment variable issue

## 4. Verify OpenAI Account Status

- Visit https://platform.openai.com/account/limits
- Confirm you have "Realtime API" access
- Check usage limits aren't exceeded
- Verify billing is active (Realtime API requires paid tier)

## 5. Last Resort: Check WebSocket Connection

Add this to your Railway logs to see exactly what's happening:

```javascript
// In realtime-handler.js, add to openAiWs.on('open'):
logger.info('=== OpenAI CONNECTION DEBUG ===', {
  url: OPENAI_REALTIME_URL,
  hasApiKey: !!config.OPENAI_API_KEY,
  apiKeyPreview: config.OPENAI_API_KEY?.substring(0, 10) + '...',
  wsReadyState: openAiWs.readyState
});
```

If you see this in logs but still silence → the session config is wrong
If you DON'T see this → WebSocket isn't connecting (API key issue)
