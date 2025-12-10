# 🚨 SQL Migrations You Need to Run NOW

## ⚠️ **CRITICAL: Fix Broken Features**

### **Migration 0049 - Fix Time Tracking & Billing** ⚠️ REQUIRED
**File:** `supabase/migrations/0049_fix_time_tracking_billing.sql`

**What it fixes:**
- Converts `time_entries.org_id` from UUID to TEXT (fixes time tracking)
- Fixes `activity_type` values
- Adds missing columns to `time_entries`
- Adds invoice calculation triggers (fixes billing)
- Adds duration calculation triggers
- Ensures `billing_rates` table exists

**This is the most important one** - it fixes the broken time tracking and billing features.

---

## 📋 **Other Migrations (If Not Already Run)**

If you haven't run these yet, you'll need them too:

### **1. Time Tracking & Billing Base** (0038)
**File:** `supabase/migrations/0038_time_tracking_billing.sql`
- Creates `billing_rates`, `invoices`, `invoice_line_items`, `payments` tables
- **Run this BEFORE 0049** if you haven't already

### **2. Email Integration** (0039)
**File:** `supabase/migrations/0039_email_integration.sql`
- Creates `email_accounts`, `emails`, `email_threads` tables
- Needed for email sending to work

### **3. SMS/WhatsApp** (0044)
**File:** `supabase/migrations/0044_sms_whatsapp.sql`
- Creates `sms_messages`, `sms_conversations` tables
- Needed for SMS/WhatsApp to work

### **4. Communication History** (0041)
**File:** `supabase/migrations/0041_communication_history.sql`
- Creates `communication_events`, `communication_threads` tables
- Used by email and SMS features

---

## 🚀 **How to Run**

### **Option 1: Supabase Dashboard (Easiest)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor**
3. Copy and paste the contents of each migration file
4. Run them in this order:
   - `0038_time_tracking_billing.sql` (if not already run)
   - `0039_email_integration.sql` (if not already run)
   - `0041_communication_history.sql` (if not already run)
   - `0044_sms_whatsapp.sql` (if not already run)
   - **`0049_fix_time_tracking_billing.sql`** ⚠️ **REQUIRED**

### **Option 2: Supabase CLI**

```bash
# Make sure you're in the project root
cd C:\Users\gduff\casebrain-hub

# Run all pending migrations (will run 0049 automatically)
npx supabase db push
```

### **Option 3: Direct SQL (psql)**

```sql
-- Run in order (only run ones you haven't run yet)
\i supabase/migrations/0038_time_tracking_billing.sql
\i supabase/migrations/0039_email_integration.sql
\i supabase/migrations/0041_communication_history.sql
\i supabase/migrations/0044_sms_whatsapp.sql
\i supabase/migrations/0049_fix_time_tracking_billing.sql  -- REQUIRED
```

---

## ✅ **Quick Check: What Do You Already Have?**

Run this to see what tables already exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'time_entries',
  'billing_rates',
  'invoices',
  'invoice_line_items',
  'email_accounts',
  'emails',
  'sms_messages',
  'communication_events'
)
ORDER BY table_name;
```

**If you see all these tables**, you probably just need to run **0049**.

**If some are missing**, run the corresponding migrations first, then 0049.

---

## 🎯 **Minimum Required**

**At minimum, you MUST run:**
- ✅ `0049_fix_time_tracking_billing.sql` - **This fixes the broken features**

**But you'll also need these for full functionality:**
- `0038_time_tracking_billing.sql` - Base billing tables
- `0039_email_integration.sql` - Email tables
- `0041_communication_history.sql` - Communication tracking
- `0044_sms_whatsapp.sql` - SMS tables

---

## ⚠️ **Important Notes**

1. **Migration 0049 is safe** - It uses `IF EXISTS` checks and won't break anything
2. **Backup first** - Always backup your database before running migrations
3. **Run in order** - If running multiple, do them in numerical order
4. **No data loss** - All migrations are designed to be safe

---

## 🐛 **After Running 0049**

Test that it worked:

```sql
-- Check time_entries org_id is TEXT (not UUID)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
AND column_name = 'org_id';
-- Should show: data_type = 'text'

-- Check triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name IN (
  'trg_calculate_invoice_totals',
  'trg_calculate_time_entry_duration'
);
-- Should show both triggers
```

If these checks pass, the migration worked! ✅

