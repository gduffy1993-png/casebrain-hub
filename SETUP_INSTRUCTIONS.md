# CaseBrain Hub - Setup Instructions

## 🎯 What's Been Added/Changed

### 1. **Premium Dark Theme** ✅
- Restored premium dark theme with proper card styling
- Updated Risk Alerts panel with gradient cards
- Updated Case Health panel with colored tiles
- All panels now use `bg-card`, `border-border`, premium shadows

### 2. **SaaS Paywall System** ✅
Complete free trial + paywall system with:
- **Database tables**: organisations, organisation_members, usage_counters, abuse_tracker, phone_trials_used, app_events
- **Usage limits**: 30 PDFs/month, 10 active cases for FREE tier
- **Phone verification**: Required before uploads
- **Paywall modals**: Show when limits reached
- **Pricing page**: `/pricing` with plan details
- **Admin override**: `/admin/org-plan` for manual plan management

### 3. **Marketing Homepage** ✅
- New landing page at `/` for signed-out users
- Hero section, features, how it works, CTAs
- SEO metadata added
- Redirects signed-in users to `/dashboard`

---

## 📋 What You Need to Do

### Step 1: Run Database Migration

**CRITICAL**: You must run the paywall system migration in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/0033_paywall_system.sql`
4. Copy the entire SQL content
5. Paste and run it in Supabase SQL Editor
6. Verify tables were created:
   - `organisations`
   - `organisation_members`
   - `usage_counters`
   - `abuse_tracker`
   - `phone_trials_used`
   - `app_events`

**Without this migration, the paywall system will NOT work!**

### Step 2: Set Environment Variable

Add to your `.env.local` file:

```bash
# Your Clerk user ID (find it in Clerk dashboard → Users → Your user)
NEXT_PUBLIC_ADMIN_USER_ID=user_xxxxxxxxxxxxx
```

**How to find your Clerk User ID:**
1. Go to https://dashboard.clerk.com
2. Navigate to **Users**
3. Find your user account
4. Copy the User ID (starts with `user_`)

This allows you to access `/admin/org-plan` to manually manage organisation plans.

### Step 3: Install Vercel Analytics (Optional but Recommended)

If you haven't already:

```bash
npm install @vercel/analytics
```

Already added to `app/layout.tsx` - will work automatically in production.

### Step 4: Test the System

#### Test Paywall System:
1. **Sign up a new account** → Should create organisation automatically
2. **Upload PDFs** → Should work until you hit 30 PDFs
3. **Create cases** → Should work until you hit 10 active cases
4. **Hit limit** → Should show paywall modal
5. **Admin page** → Go to `/admin/org-plan` (must be logged in as admin user)
   - Change plan to `PAID_MONTHLY` or `PAID_YEARLY`
   - Limits should disappear

#### Test Homepage:
1. **Sign out** → Visit `/` → Should see marketing homepage
2. **Sign in** → Visit `/` → Should redirect to `/dashboard`
3. **Click CTAs** → Should go to `/sign-in`

#### Test Phone Verification:
1. **Sign up** → Must verify phone before uploading
2. **Try uploading without phone** → Should show phone verification modal

### Step 5: Add Dashboard Screenshot (Optional)

To replace the placeholder screenshot on homepage:

1. Take a screenshot of your dashboard
2. Save it as `/public/dashboard-screenshot.png`
3. Update `app/page.tsx` line 88-96 to use `next/image`:

```tsx
import Image from "next/image";

// Replace the placeholder div with:
<Image
  src="/dashboard-screenshot.png"
  alt="CaseBrain Hub Dashboard"
  width={1200}
  height={675}
  className="rounded-lg w-full h-auto"
  priority
/>
```

---

## 🔍 How to Verify Everything Works

### Check Database:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM organisations LIMIT 5;
SELECT * FROM usage_counters LIMIT 5;
```

### Check Routes:
- ✅ `/` → Marketing homepage (signed out) or redirect to dashboard (signed in)
- ✅ `/sign-in` → Sign in page (unchanged)
- ✅ `/sign-up` → Sign up page (unchanged)
- ✅ `/dashboard` → Main dashboard (unchanged)
- ✅ `/pricing` → Pricing page (NEW)
- ✅ `/admin/org-plan` → Admin plan management (NEW)

### Check Paywall:
1. Create a test account
2. Upload 30 PDFs → Should hit limit
3. Create 10 cases → Should hit limit
4. Check `/admin/org-plan` → Should see your organisation

---

## 🚨 Important Notes

### Phone Verification:
- **Must be enabled in Clerk Dashboard** for phone verification to work
- Go to Clerk Dashboard → **User & Authentication** → **Phone number**
- Enable phone number authentication

### Organisation Assignment:
- Users are automatically assigned to organisations by email domain
- Generic emails (gmail.com, etc.) → Personal workspace
- Business emails → Shared organisation by domain
- First user in org becomes OWNER

### Free Trial Rules:
- **One free trial per email domain** (shared across all users from that domain)
- **One free trial per phone number**
- If domain/phone already used → Organisation set to `LOCKED`
- `LOCKED` orgs must upgrade to continue

---

## 📁 Files Changed/Created

### New Files:
- `supabase/migrations/0033_paywall_system.sql` ⚠️ **MUST RUN THIS**
- `lib/organisations.ts`
- `lib/usage-limits.ts`
- `lib/phone-verification.ts`
- `lib/abuse-protection.ts`
- `lib/paywall-bridge.ts`
- `components/paywall/PaywallModal.tsx`
- `app/pricing/page.tsx`
- `app/api/upgrade/placeholder/route.ts`
- `app/admin/org-plan/page.tsx`
- `app/api/admin/organisations/route.ts`

### Modified Files:
- `app/globals.css` (added premium theme tokens)
- `tailwind.config.ts` (added card/muted/border tokens)
- `components/ui/card.tsx` (updated to use premium tokens)
- `components/core/RiskAlertCard.tsx` (premium gradient styling)
- `components/core/CaseHeatmapPanel.tsx` (premium card styling)
- `components/layout/app-shell.tsx` (premium gradient background)
- `app/api/upload/route.ts` (added paywall checks)
- `components/upload/upload-form.tsx` (added paywall modal)
- `app/layout.tsx` (added Vercel Analytics, updated metadata)
- `app/page.tsx` (new marketing homepage)

---

## 🎨 Theme Customization

All theme tokens are in:
- `app/globals.css` → CSS variables (`--card`, `--muted`, `--border`, etc.)
- `tailwind.config.ts` → Tailwind color tokens

To change colors, edit these files.

---

## 🐛 Troubleshooting

### "Organisation not found" errors:
- Make sure migration `0033_paywall_system.sql` was run
- Check Supabase tables exist

### "Access denied" on admin page:
- Set `NEXT_PUBLIC_ADMIN_USER_ID` in `.env.local`
- Make sure it matches your Clerk User ID exactly

### Paywall not showing:
- Check browser console for errors
- Verify `canUploadPDF()` and `canCreateCase()` are being called
- Check organisation plan in database

### Phone verification not working:
- Enable phone authentication in Clerk Dashboard
- Check user has verified phone in Clerk

---

## ✅ Checklist Before Going Live

- [ ] Run migration `0033_paywall_system.sql` in Supabase
- [ ] Set `NEXT_PUBLIC_ADMIN_USER_ID` in environment variables
- [ ] Enable phone verification in Clerk Dashboard
- [ ] Test signup → organisation creation
- [ ] Test upload → usage counter increments
- [ ] Test hitting limits → paywall modal shows
- [ ] Test admin page → can change plans
- [ ] Test homepage → shows for signed-out, redirects for signed-in
- [ ] (Optional) Add dashboard screenshot to `/public/`
- [ ] (Optional) Set up Stripe integration for real upgrades

---

## 🚀 Next Steps (Future)

1. **Stripe Integration**: Replace `/api/upgrade/placeholder` with real Stripe checkout
2. **Email Notifications**: Set up email alerts for paywall hits
3. **Analytics Dashboard**: Build admin dashboard for usage metrics
4. **Clerk Webhook**: Add IP abuse protection to signup webhook

---

**Questions?** Check the code comments in the new files - they explain the logic.

