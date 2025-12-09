# 🚨 Quick Fix: Email Table Missing

## The Error
```
Could not find the table 'public.emails' in the schema cache
```

## Why This Happens
The database tables haven't been created yet. You need to run the SQL migrations.

---

## ✅ **EASIEST FIX: Run All Migrations**

### **Option 1: Supabase CLI (Fastest)**

```bash
# In your project root
cd C:\Users\gduff\casebrain-hub

# Run all pending migrations
npx supabase db push
```

This will automatically run all 9 migration files in order.

---

### **Option 2: Supabase Dashboard (If CLI doesn't work)**

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Go to **SQL Editor** (left sidebar)
4. Run each migration file **in order**:

   - Copy/paste `supabase/migrations/0039_email_integration.sql`
   - Click **Run**
   - Wait for success
   - Repeat for:
     - `0038_time_tracking_billing.sql` (do this first!)
     - `0039_email_integration.sql`
     - `0040_document_version_control.sql`
     - `0041_communication_history.sql`
     - `0042_esignature_tracking.sql`
     - `0043_calendar_integration.sql`
     - `0044_sms_whatsapp.sql`
     - `0045_custom_reports.sql`
     - `0046_trust_accounting.sql`

---

### **Option 3: Quick Test - Just Email Table**

If you just want to test email sending quickly, you can run **only** the email migration:

1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste the contents of `supabase/migrations/0039_email_integration.sql`
3. Click **Run**

**Note:** You'll eventually need all migrations, but this will at least let you test email.

---

## ✅ **After Running Migrations**

1. **Refresh your browser** (or wait a few seconds for cache to clear)
2. **Try sending email again**
3. It should work! ✅

---

## 🔍 **Verify It Worked**

Run this in Supabase SQL Editor to check:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('emails', 'email_accounts', 'email_threads')
ORDER BY table_name;
```

You should see all 3 tables listed.

---

## 📝 **What Each Migration Does**

- **0038** - Time tracking & billing tables
- **0039** - Email tables (`emails`, `email_accounts`, `email_threads`) ← **This one fixes your error!**
- **0040** - Document version control
- **0041** - Communication history
- **0042** - E-signature tracking
- **0043** - Calendar integration
- **0044** - SMS/WhatsApp
- **0045** - Custom reports
- **0046** - Trust accounting

---

## ⚠️ **Important Notes**

1. **Run in order** - Migrations must be run 0038, then 0039, etc.
2. **Safe to run multiple times** - All migrations use `IF NOT EXISTS`, so they're safe
3. **No data loss** - These only create new tables, won't break existing data

---

## 🎯 **Quick Command Summary**

```bash
# Fastest way:
npx supabase db push

# Or if that doesn't work, use Supabase Dashboard SQL Editor
```

---

**Once migrations are run, email sending will work!** 🎉

