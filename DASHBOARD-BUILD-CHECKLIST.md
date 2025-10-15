# ✅ Dashboard Build Checklist

## 🎯 Your Mission

Transform both dashboards using TailAdmin as the base. Follow this checklist page-by-page.

---

## 📦 Phase 0: Setup (5 minutes)

### Copy TailAdmin Components

```bash
cd /Users/alec/ai-receptionist

# Business Dashboard
cp -r tailadmin-template/src/components apps/business-dashboard/src/
cp -r tailadmin-template/src/layout apps/business-dashboard/src/
cp -r tailadmin-template/src/icons apps/business-dashboard/src/
cp tailadmin-template/src/index.css apps/business-dashboard/src/

# Admin Dashboard
cp -r tailadmin-template/src/components apps/admin-dashboard/src/
cp -r tailadmin-template/src/layout apps/admin-dashboard/src/
cp -r tailadmin-template/src/icons apps/admin-dashboard/src/
cp tailadmin-template/src/index.css apps/admin-dashboard/src/
```

**Status:** ⬜ Not started | ⏳ In progress | ✅ Done

- [ ] Copied components to business-dashboard
- [ ] Copied components to admin-dashboard
- [ ] Verified files exist

---

## 🏢 Business Dashboard Pages

### Page 1: Dashboard (Main Overview)
**URL:** `/dashboard`
**Priority:** 🔴 CRITICAL
**Time:** 45 minutes

**What to build:**
- [ ] Layout with Sidebar + Header
- [ ] ROI Calculator Card (big, prominent with $2,000 savings)
- [ ] 4 Stat Cards (Calls, Appointments, Messages, Revenue with trends)
- [ ] Line Chart (call volume over last 30 days)
- [ ] Recent Calls Table (last 5 calls, link to full view)

**API Calls Needed:**
- `GET /api/business/analytics` - For all stats and ROI
- `GET /api/business/calls?limit=5` - For recent calls

**TailAdmin Reference:** Look at `/tailadmin-template/src/pages/Dashboard/ECommerce.tsx`

**Status:**
- [ ] Layout working
- [ ] ROI card displaying
- [ ] Stat cards showing real data
- [ ] Chart rendering
- [ ] Recent calls table populated
- [ ] Page looks professional

---

### Page 2: Calls
**URL:** `/calls`
**Priority:** 🟡 HIGH
**Time:** 30 minutes

**What to build:**
- [ ] Search input (filter by customer name/phone)
- [ ] Filter dropdowns (by outcome, by date)
- [ ] Data table with columns:
  - Time
  - Customer (name + phone)
  - Duration
  - Outcome (badge with color)
  - Actions (View transcript button)
- [ ] Pagination
- [ ] Modal for full transcript (opens on click)

**API Calls Needed:**
- `GET /api/business/calls` - Fetch all calls
- `GET /api/business/calls/:id` - Get transcript (for modal)

**TailAdmin Reference:** Look at `/tailadmin-template/src/components/tables/`

**Status:**
- [ ] Table displaying calls
- [ ] Search working
- [ ] Filters working
- [ ] Transcript modal opens
- [ ] Pagination working

---

### Page 3: Appointments (KANBAN BOARD!)
**URL:** `/appointments`
**Priority:** 🔴 CRITICAL
**Time:** 1 hour

**What to build:**
- [ ] Kanban board with 5 columns:
  - SCHEDULED
  - CONFIRMED
  - IN_PROGRESS
  - COMPLETED
  - CANCELLED
- [ ] Drag-and-drop between columns (updates status)
- [ ] Appointment cards showing:
  - Customer name
  - Service type
  - Date/time
  - Price range
- [ ] "+ Add" button in each column
- [ ] Click card to edit details modal
- [ ] Toggle to Calendar view (optional)

**API Calls Needed:**
- `GET /api/business/appointments` - Fetch all appointments
- `PUT /api/business/appointments/:id` - Update status on drag
- `POST /api/business/appointments` - Create new

**Library:** `@hello-pangea/dnd` (already installed)

**Status:**
- [ ] Kanban board rendering
- [ ] Cards display correctly
- [ ] Drag-and-drop works
- [ ] Status updates in database
- [ ] Create new appointment works
- [ ] Edit modal works

---

### Page 4: Customers (CRM)
**URL:** `/customers`
**Priority:** 🟡 HIGH
**Time:** 30 minutes

**What to build:**
- [ ] Search input
- [ ] Sort dropdown (by LTV, by appointments, etc.)
- [ ] Data table with columns:
  - Name
  - Phone
  - Email
  - Total Appointments
  - Lifetime Value (LTV)
  - Actions (View detail)
- [ ] Customer detail modal/page
- [ ] "Top Customers" widget (bar chart)

**API Calls Needed:**
- `GET /api/business/customers` - Fetch all customers
- `GET /api/business/customers/:id` - Get customer detail

**TailAdmin Reference:** Look at tables examples

**Status:**
- [ ] Table displaying customers
- [ ] Search working
- [ ] Sort working
- [ ] Detail view works
- [ ] Top customers chart displays

---

### Page 5: Analytics
**URL:** `/analytics`
**Priority:** 🟢 MEDIUM
**Time:** 45 minutes

**What to build:**
- [ ] Date range selector
- [ ] 4-5 different charts:
  - Line chart: Call volume over time
  - Pie chart: Calls by outcome
  - Bar chart: Peak hours
  - Donut chart: Services breakdown
  - Gauge: Conversion rate
- [ ] Export to PDF button

**API Calls Needed:**
- `GET /api/business/analytics` - Get all analytics data

**Library:** `react-apexcharts` (already installed)

**TailAdmin Reference:** Look at `/tailadmin-template/src/components/charts/`

**Status:**
- [ ] All charts rendering
- [ ] Date selector working
- [ ] Charts show real data
- [ ] Export button works

---

### Page 6: Settings
**URL:** `/settings`
**Priority:** 🟢 MEDIUM
**Time:** 45 minutes

**What to build:**
- [ ] Tabbed interface:
  - Business Info
  - Services & Pricing
  - Business Hours
  - AI Configuration
  - FAQs
  - Notifications
- [ ] Services table (add/edit/delete)
- [ ] Drag to reorder services
- [ ] AI config form (name, tone, greeting)
- [ ] Business hours picker
- [ ] FAQs list (add/edit/delete)
- [ ] Save button

**API Calls Needed:**
- `GET /api/business/config` - Load settings
- `PUT /api/business/config` - Save settings

**Status:**
- [ ] Tabs working
- [ ] All forms functional
- [ ] Services CRUD works
- [ ] Save persists to database
- [ ] Validation works

---

## 🎛️ Admin Dashboard Pages

### Page 1: Dashboard
**URL:** `/dashboard`
**Time:** 30 minutes

**What to build:**
- [ ] 4 Stat cards (Total businesses, revenue, calls, uptime)
- [ ] Revenue chart (last 6 months)
- [ ] Recent activity feed
- [ ] Quick actions section

**API Calls:**
- `GET /api/admin/analytics` - Platform stats

**Status:**
- [ ] Stats displaying
- [ ] Chart rendering
- [ ] Activity feed works

---

### Page 2: Businesses
**URL:** `/businesses`
**Time:** 45 minutes

**What to build:**
- [ ] Search/filter businesses
- [ ] Data table (name, industry, calls, revenue, status)
- [ ] "Create New Business" button → modal
- [ ] Click row → business detail page
- [ ] Actions (Edit, Delete)

**API Calls:**
- `GET /api/admin/businesses` - List all
- `POST /api/admin/businesses` - Create new
- `DELETE /api/admin/businesses/:id` - Delete

**Status:**
- [ ] Table displays businesses
- [ ] Create modal works
- [ ] Edit/delete works
- [ ] Search/filter works

---

### Page 3: Business Detail
**URL:** `/businesses/:id`
**Time:** 30 minutes

**What to build:**
- [ ] Business info card
- [ ] Their stats (calls, appointments, revenue)
- [ ] Charts (their call volume, conversion)
- [ ] Action buttons (Suspend, Activate, View Dashboard)

**API Calls:**
- `GET /api/admin/businesses/:id` - Get details
- `GET /api/admin/businesses/:id/stats` - Get their stats

**Status:**
- [ ] Business info displays
- [ ] Stats accurate
- [ ] Charts render
- [ ] Actions work

---

## 🎨 Shared Components

### Dark Mode
**Time:** 15 minutes

**What to build:**
- [ ] Toggle in header
- [ ] Saves preference to localStorage
- [ ] Applies dark class to `<html>`
- [ ] All components support dark mode

**Status:**
- [ ] Toggle works
- [ ] Persists on refresh
- [ ] All pages look good in dark mode

---

### Responsive Design
**Time:** 15 minutes

**What to check:**
- [ ] Sidebar collapses on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Charts resize properly
- [ ] Forms stack on mobile

**Status:**
- [ ] Works on mobile (375px)
- [ ] Works on tablet (768px)
- [ ] Works on desktop (1920px)

---

## 📊 Progress Tracker

### Business Dashboard
- [ ] Dashboard page (0%)
- [ ] Calls page (0%)
- [ ] Appointments page (0%)
- [ ] Customers page (0%)
- [ ] Analytics page (0%)
- [ ] Settings page (0%)

**Overall Progress:** 0/6 pages complete (0%)

### Admin Dashboard
- [ ] Dashboard page (0%)
- [ ] Businesses page (0%)
- [ ] Business detail page (0%)

**Overall Progress:** 0/3 pages complete (0%)

### Polish
- [ ] Dark mode (0%)
- [ ] Responsive design (0%)
- [ ] Loading states (0%)
- [ ] Error handling (0%)

**Overall Progress:** 0/4 items complete (0%)

---

## ⏱️ Estimated Timeline

**Day 1 (3 hours):**
- ✅ Setup + Business Dashboard pages 1-3

**Day 2 (2 hours):**
- ✅ Business Dashboard pages 4-6

**Day 3 (2 hours):**
- ✅ Admin Dashboard + Polish

**Total:** 7 hours to complete transformation

---

## 🎉 Success Criteria

You're DONE when:
- ✅ All pages load without errors
- ✅ All tables show real data from APIs
- ✅ Kanban board drag-and-drop works
- ✅ Charts display correctly
- ✅ Dark mode works everywhere
- ✅ Mobile responsive
- ✅ Looks professional (like $1,500/month product)

---

## 💡 Pro Tips

1. **Work page-by-page** - Don't jump around
2. **Test frequently** - Check in browser after each section
3. **Copy from TailAdmin** - Their examples are gold
4. **Focus on YOUR data** - Layout is done, plug in APIs
5. **Dark mode last** - Get light mode perfect first

---

## 🚀 START HERE

**Your first command:**

```bash
cd /Users/alec/ai-receptionist
cp -r tailadmin-template/src/components apps/business-dashboard/src/
cp -r tailadmin-template/src/layout apps/business-dashboard/src/
cp tailadmin-template/src/index.css apps/business-dashboard/src/
```

**Then:** Open `apps/business-dashboard` in your editor and start building the Dashboard page!

**You've got this!** 💪
