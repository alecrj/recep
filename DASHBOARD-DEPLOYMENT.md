# Dashboard Deployment Guide

## 🎯 Overview

You have 2 dashboards ready to deploy:
1. **Admin Dashboard** - Your master control panel
2. **Business Dashboard** - CRM for your clients

Both are configured to connect to your Railway backend automatically.

---

## 📋 Prerequisites

- ✅ Railway backend deployed: `https://ai-receptionistbackend-production.up.railway.app`
- ✅ Admin user created: `admin@airec.com` / `ChangeMe123!`
- ✅ Sarah voice configured with barge-in
- ✅ Bob's HVAC business set up with phone number

---

## 🚀 Deploy to Netlify

### Option 1: Quick Deploy (Recommended)

#### Admin Dashboard
```bash
cd apps/admin-dashboard
npm install
npm run build

# Deploy to Netlify
# You'll get a URL like: https://your-admin-dashboard.netlify.app
```

#### Business Dashboard
```bash
cd apps/business-dashboard
npm install
npm run build

# Deploy to Netlify
# You'll get a URL like: https://your-business-dashboard.netlify.app
```

### Option 2: Netlify CLI (Fastest)

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy Admin Dashboard
cd apps/admin-dashboard
netlify init
netlify deploy --prod

# Deploy Business Dashboard
cd apps/business-dashboard
netlify init
netlify deploy --prod
```

### Option 3: Netlify Web UI (Easiest)

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Configure:
   - **Admin Dashboard:**
     - Base directory: `apps/admin-dashboard`
     - Build command: `npm run build`
     - Publish directory: `apps/admin-dashboard/dist`

   - **Business Dashboard:**
     - Base directory: `apps/business-dashboard`
     - Build command: `npm run build`
     - Publish directory: `apps/business-dashboard/dist`

5. Deploy!

---

## 🔑 Login Credentials

### Admin Dashboard
**URL:** `https://your-admin-dashboard.netlify.app/login`

```
Email: admin@airec.com
Password: ChangeMe123!
```

**What you can do:**
- View all businesses
- Manage phone numbers
- See all calls across all clients
- System-wide analytics

### Business Dashboard (Bob's HVAC)
**URL:** `https://your-business-dashboard.netlify.app/login`

```
Email: bob@bobshvac.com
Password: [You need to set this - see below]
```

**What Bob can do:**
- View his calls
- Manage customers
- See appointments
- Configure AI voice/greeting
- Analytics for his business

---

## 🔧 Set Password for Bob's HVAC

Bob's business exists but needs a password. Run this:

```bash
cd apps/backend
DATABASE_URL="your_database_url" node -e "
const { prisma } = require('@ai-receptionist/database');
const bcrypt = require('bcrypt');

async function setPassword() {
  const business = await prisma.business.findFirst({
    where: { ownerEmail: 'bob@bobshvac.com' }
  });

  if (!business) {
    console.log('❌ Business not found');
    return;
  }

  const password = 'BobHVAC123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.business.update({
    where: { id: business.id },
    data: { password: hashedPassword }
  });

  console.log('✅ Password set for Bob\\'s HVAC');
  console.log('Email: bob@bobshvac.com');
  console.log('Password:', password);

  await prisma.\$disconnect();
}

setPassword();
"
```

---

## 🎨 Customization

### Change Branding

Both dashboards have "Voxi" branding. To customize:

1. **Admin Dashboard Logo:**
   - Edit: `apps/admin-dashboard/src/pages/Login.jsx` (line 40)
   - Change "V" to your logo/initials
   - Update "Voxi Admin" text (line 42)

2. **Business Dashboard:**
   - Similar changes in `apps/business-dashboard/src/pages/Login.jsx`

### Change Colors

Both use Tailwind CSS with a dark theme:
- Primary: Emerald/Green (`emerald-500`, `green-600`)
- Background: Zinc (`zinc-900`, `zinc-950`)

Edit: `tailwind.config.js` in each dashboard

---

## 🧪 Testing Checklist

### Admin Dashboard ✅
- [ ] Login works
- [ ] Can see Bob's HVAC business
- [ ] Can view calls from +1 (877) 357-8556
- [ ] Analytics show data
- [ ] Phone numbers page loads

### Business Dashboard ✅
- [ ] Bob can login
- [ ] Sees only his calls
- [ ] Can manage customers
- [ ] Settings page works
- [ ] Can update AI greeting

---

## 🔒 Security Notes

### Change These Immediately:
1. ✅ Admin password: `admin@airec.com`
2. ✅ Bob's password: `bob@bobshvac.com`
3. ✅ JWT_SECRET in Railway (if not already unique)

### CORS Configuration

Your Railway backend already has CORS configured for:
- `localhost:5173` (admin dev)
- `localhost:5174` (business dev)

**Add your Netlify URLs:**

In `apps/backend/src/server.js` (line 41-50), add:
```javascript
origin: [
  config.ADMIN_DASHBOARD_URL,
  config.BUSINESS_DASHBOARD_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://your-admin-dashboard.netlify.app',  // ADD THIS
  'https://your-business-dashboard.netlify.app', // ADD THIS
],
```

Then redeploy Railway backend.

---

## 📱 Dashboard Features

### Admin Dashboard
- 📊 **Dashboard:** Overview of all businesses
- 🏢 **Businesses:** Manage clients
- 📞 **Phone Numbers:** Twilio number management
- 📞 **Calls:** All calls across all businesses
- 📈 **Analytics:** System-wide metrics

### Business Dashboard
- 📊 **Dashboard:** Business overview
- 📞 **Calls:** Call history & transcripts
- 👥 **Customers:** Customer database
- 📅 **Appointments:** Booking management
- 📈 **Analytics:** Business-specific metrics
- ⚙️ **Settings:** Configure AI, voice, greeting, hours

---

## 🆘 Troubleshooting

### "Network Error" on login
- Check Railway backend is running
- Verify CORS includes your Netlify URL
- Check browser console for exact error

### "Invalid credentials"
- Verify admin user exists (run `create-admin.js` again)
- Check password is correct
- Look at Railway logs for auth errors

### Dashboard won't load
- Check build succeeded on Netlify
- Verify `.env.production` is correct
- Check Netlify deploy logs

### API calls fail
- Verify `VITE_API_URL` is set correctly
- Check Network tab in browser DevTools
- Verify Railway backend is responding

---

## 🎉 Next Steps

1. **Deploy both dashboards to Netlify**
2. **Update CORS in Railway backend**
3. **Test login flows**
4. **Add more businesses** (use `scripts/admin-quick-add.js`)
5. **Buy more Twilio numbers** for additional clients
6. **Customize branding** to match your company

---

## 📚 Additional Resources

- Railway Backend: `https://ai-receptionistbackend-production.up.railway.app`
- API Health Check: `https://ai-receptionistbackend-production.up.railway.app/health`
- Test Phone Number: +1 (877) 357-8556

**Support:** Check Railway logs for backend issues, Netlify logs for frontend issues.

---

**Version:** 3.1.0-ULTRA-HUMAN
**Last Updated:** 2025-10-16
**Voice:** Sarah (Maximum Expressiveness)
**Features:** Barge-in ✅ | Streaming TTS ✅ | Sub-500ms Latency ✅
