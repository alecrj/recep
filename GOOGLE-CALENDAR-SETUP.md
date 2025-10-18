# Google Calendar Integration Setup Guide

## Step 1: Create Google Cloud Project (5 minutes)

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create New Project
1. Click the project dropdown at the top
2. Click "New Project"
3. Name it: "AI Receptionist Calendar"
4. Click "Create"

### 3. Enable Google Calendar API
1. In the search bar at top, type "Google Calendar API"
2. Click "Google Calendar API"
3. Click "Enable"
4. Wait ~30 seconds for it to enable

### 4. Configure OAuth Consent Screen
1. In left sidebar, go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have Google Workspace)
3. Click "Create"

**Fill in the form**:
- App name: `AI Receptionist`
- User support email: `your-email@gmail.com`
- Developer contact: `your-email@gmail.com`
- Click "Save and Continue"

**Scopes page**:
- Click "Add or Remove Scopes"
- Search for "Google Calendar API"
- Check these two scopes:
  - `.../auth/calendar` (See, edit, share, and permanently delete calendars)
  - `.../auth/calendar.events` (View and edit events)
- Click "Update"
- Click "Save and Continue"

**Test users** (while in development):
- Click "Add Users"
- Add YOUR email address (so you can test)
- Click "Save and Continue"

### 5. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "AI Receptionist Backend"

**Authorized redirect URIs** - Add BOTH:
```
https://ai-receptionistbackend-production.up.railway.app/api/calendar/oauth/callback
http://localhost:3000/api/calendar/oauth/callback
```

5. Click "Create"

### 6. COPY YOUR CREDENTIALS ⚠️ IMPORTANT

You'll see a popup with:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxx`

**SAVE THESE!** You'll need them in the next step.

---

## Step 2: Add to Railway Environment Variables

1. Go to Railway: https://railway.app
2. Open your backend project
3. Go to "Variables" tab
4. Add these three variables:

```
GOOGLE_CLIENT_ID=<paste your Client ID here>
GOOGLE_CLIENT_SECRET=<paste your Client Secret here>
GOOGLE_REDIRECT_URI=https://ai-receptionistbackend-production.up.railway.app/api/calendar/oauth/callback
```

5. Railway will auto-redeploy with new variables

---

## ✅ Done!

Once you've completed these steps, let me know and I'll:
1. Wire up the calendar service to the AI tools
2. Test the OAuth flow
3. Make a live call to book an appointment

**PASTE YOUR CREDENTIALS HERE WHEN READY:**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```
