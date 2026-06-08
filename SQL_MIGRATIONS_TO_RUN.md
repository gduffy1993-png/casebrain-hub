# 📋 SQL Migrations to Run

## ✅ **YES - You Need to Run These SQL Migrations**

All the new features require database tables. Here are the migrations you need to run:

---

## 🗄️ **Migrations to Run (In Order)**

### **1. Time Tracking & Billing** ✅
**File:** `supabase/migrations/0038_time_tracking_billing.sql`

**What it creates:**
- Extends `time_entries` table with billing fields
- Creates `billing_rates` table
- Creates `invoices` table
- Creates `invoice_line_items` table
- Creates `payments` table
- Creates `disbursements` table
- Creates triggers for auto-calculations

**Run this first!**

---

### **2. Email Integration** ✅
**File:** `supabase/migrations/0039_email_integration.sql`

**What it creates:**
- `email_accounts` table
- `emails` table
- `email_attachments` table
- `email_threads` table
- Triggers for thread management

---

### **3. Document Version Control** ✅
**File:** `supabase/migrations/0040_document_version_control.sql`

**What it creates:**
- `document_versions` table
- `document_version_comments` table
- `document_locks` table
- Triggers for version numbering

---

### **4. Communication History** ✅
**File:** `supabase/migrations/0041_communication_history.sql`

**What it creates:**
- `communication_events` table
- `communication_threads` table
- Triggers for thread management

---

### **5. E-Signature Tracking** ✅
**File:** `supabase/migrations/0042_esignature_tracking.sql`

**What it creates:**
- `esignature_requests` table
- `esignature_events` table
- Triggers for status updates

---

### **6. Calendar Integration** ✅
**File:** `supabase/migrations/0043_calendar_integration.sql`

**What it creates:**
- `calendar_events` table
- `calendar_accounts` table
- Triggers for timestamp updates

---

### **7. SMS/WhatsApp Integration** ✅
**File:** `supabase/migrations/0044_sms_whatsapp.sql`

**What it creates:**
- `sms_messages` table
- `sms_conversations` table
- Triggers for conversation stats

---

### **8. Custom Reports** ✅
**File:** `supabase/migrations/0045_custom_reports.sql`

**What it creates:**
- `custom_reports` table
- `report_schedules` table
- `report_runs` table
- Triggers for timestamp updates

---

### **9. Trust Accounting** ✅
**File:** `supabase/migrations/0046_trust_accounting.sql`

**What it creates:**
- `trust_accounts` table
- `client_money` table
- `trust_reconciliations` table
- Triggers for balance updates

---

## 🚀 **How to Run Migrations**

### **Option 1: Supabase CLI (Recommended)**

```bash
# Make sure you're in the project root
cd C:\Users\gduff\casebrain-hub

# Run all pending migrations
npx supabase db push

# Or run specific migration
npx supabase migration up
```

### **Option 2: Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content
4. Run them in order (0038, 0039, 0040, etc.)

### **Option 3: Direct SQL Execution**

If you have direct database access:

```sql
-- Run each file in order
\i supabase/migrations/0038_time_tracking_billing.sql
\i supabase/migrations/0039_email_integration.sql
\i supabase/migrations/0040_document_version_control.sql
\i supabase/migrations/0041_communication_history.sql
\i supabase/migrations/0042_esignature_tracking.sql
\i supabase/migrations/0043_calendar_integration.sql
\i supabase/migrations/0044_sms_whatsapp.sql
\i supabase/migrations/0045_custom_reports.sql
\i supabase/migrations/0046_trust_accounting.sql
```

---

## ⚠️ **Important Notes**

1. **Run in Order** - Migrations must be run in numerical order (0038, then 0039, etc.)

2. **Backup First** - Always backup your database before running migrations

3. **Test Environment** - Test migrations in a development environment first

4. **Migration 0038** - This extends the existing `time_entries` table, so it's safe to run even if you already have time entries

5. **No Data Loss** - All migrations use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, so they're safe to run multiple times

---

## ✅ **Verification**

After running migrations, verify tables exist:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'billing_rates',
  'invoices',
  'invoice_line_items',
  'payments',
  'disbursements',
  'email_accounts',
  'emails',
  'email_threads',
  'document_versions',
  'document_locks',
  'communication_events',
  'communication_threads',
  'esignature_requests',
  'calendar_events',
  'calendar_accounts',
  'sms_messages',
  'sms_conversations',
  'custom_reports',
  'report_schedules',
  'trust_accounts',
  'client_money',
  'trust_reconciliations'
)
ORDER BY table_name;
```

---

## 🎯 **Quick Start**

**Fastest way to run all migrations:**

```bash
# In your project root
npx supabase db push
```

This will run all pending migrations automatically!

---

## 📝 **Summary**

**9 new migration files** need to be run:
- 0038_time_tracking_billing.sql
- 0039_email_integration.sql
- 0040_document_version_control.sql
- 0041_communication_history.sql
- 0042_esignature_tracking.sql
- 0043_calendar_integration.sql
- 0044_sms_whatsapp.sql
- 0045_custom_reports.sql
- 0046_trust_accounting.sql

**All migrations are safe to run** - they use `IF NOT EXISTS` checks and won't break existing data.

