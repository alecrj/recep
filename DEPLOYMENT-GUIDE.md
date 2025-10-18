# 🚀 Deployment Guide - AI Receptionist Dashboards

## Overview

We have 2 frontends to deploy on Netlify:
1. **Business Dashboard** (`apps/business-dashboard`) - For your clients
2. **Admin Dashboard** (`apps/admin-dashboard`) - For you to manage the platform

Both already point to your Railway backend: `https://ai-receptionistbackend-production.up.railway.app`

---

## ✅ Prerequisites

- Netlify account (free): https://app.netlify.com/signup
- GitHub repo connected to Netlify
- Both dashboards already built successfully locally

---

## 📦 Option 1: Deploy via Netlify UI (Easiest)

### Business Dashboard

1. **Go to Netlify**: https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. **Configure build settings**:
   - **Base directory**: `apps/business-dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/business-dashboard/dist`
5. **Advanced build settings** (optional):
   - Add environment variable: `VITE_API_URL` = `https://ai-receptionistbackend-production.up.railway.app/api`
6. Click **"Deploy site"**

### Admin Dashboard

1. Click **"Add new site"** again
2. Select same repo
3. **Configure build settings**:
   - **Base directory**: `apps/admin-dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/admin-dashboard/dist`
4. **Advanced build settings** (optional):
   - Add environment variable: `VITE_API_URL` = `https://ai-receptionistbackend-production.up.railway.app/api`
5. Click **"Deploy site"**

---

## 🌐 Option 2: Deploy via Netlify CLI (Faster)

### Install Netlify CLI

```bash
npm install -g netlify-cli
netlify login
```

### Deploy Business Dashboard

```bash
cd apps/business-dashboard
netlify deploy --prod
```

When prompted:
- **Publish directory**: `dist`
- Confirm and deploy

### Deploy Admin Dashboard

```bash
cd apps/admin-dashboard
netlify deploy --prod
```

When prompted:
- **Publish directory**: `dist`
- Confirm and deploy

---

## 🔧 After Deployment

### 1. Custom Domains (Optional)

In each Netlify site's settings:
- **Business Dashboard**: `dashboard.yourdomain.com` or `app.yourdomain.com`
- **Admin Dashboard**: `admin.yourdomain.com`

### 2. Update Backend CORS

Add your new Netlify URLs to backend CORS whitelist:

**File**: `apps/backend/src/server.js`

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://your-business-dashboard.netlify.app',  // ← Add this
  'https://your-admin-dashboard.netlify.app',     // ← Add this
  'https://dashboard.yourdomain.com',             // ← If using custom domain
  'https://admin.yourdomain.com',                 // ← If using custom domain
];
```

Then redeploy backend on Railway.

### 3. Test Everything

1. **Business Dashboard**:
   - Login with: `test@demo.com` / `demo123`
   - Check Settings, Phone tab, Services, etc.

2. **Admin Dashboard**:
   - Login with your admin credentials
   - Check business list, usage analytics

---

## 🎯 Quick Deployment Checklist

- [ ] Both dashboards build successfully (`npm run build`)
- [ ] `netlify.toml` files created in each dashboard
- [ ] Deployed to Netlify (via UI or CLI)
- [ ] Backend CORS updated with Netlify URLs
- [ ] Backend redeployed on Railway
- [ ] Test login on both dashboards
- [ ] Test phone number search/purchase flow
- [ ] (Optional) Custom domains configured

---

## 📝 Important Notes

1. **No environment variables needed** - Both dashboards already default to your Railway backend
2. **Automatic deployments** - If you connect GitHub, Netlify auto-deploys on push
3. **Free tier is fine** - Netlify free tier works great for these dashboards
4. **Build time** - ~30 seconds per dashboard

---

## 🔒 Security

Both `netlify.toml` files include security headers:
- X-Frame-Options: DENY
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

---

## 🆘 Troubleshooting

### Build fails on Netlify

- Check Node version is 20 (set in `netlify.toml`)
- Check build logs for missing dependencies
- Try building locally first: `npm run build`

### Can't login after deployment

- Check browser console for CORS errors
- Make sure you added Netlify URLs to backend CORS
- Verify backend is running on Railway

### 404 on refresh

- The `netlify.toml` redirects should handle this
- If not, check the redirects section is present

---

## 🎉 You're Done!

Your dashboards should now be live and accessible worldwide!

**Business Dashboard URL**: `https://[your-site-name].netlify.app`
**Admin Dashboard URL**: `https://[your-site-name].netlify.app`
