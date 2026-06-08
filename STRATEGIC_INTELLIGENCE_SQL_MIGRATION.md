# Strategic Intelligence SQL Migration Guide

## ✅ What You Need to Run

**Run this migration file in Supabase:**
```
supabase/migrations/0037_strategic_intelligence_support.sql
```

## 📋 What This Migration Does

### 1. **Adds 'HEARING' Category to Deadlines**
- Updates the `deadlines` table constraint to include `'HEARING'` category
- Allows strategic intelligence to query for hearing dates

### 2. **Updates Deadlines Table Structure**
- Adds missing columns (`org_id`, `category`, etc.) if they don't exist
- Ensures the table has all required columns for strategic intelligence
- **Note:** API routes use the `deadlines` table directly (no view needed)

### 3. **Ensures Required Tables Exist**
- `timeline_events` - For timeline analysis
- `bundles` - For contradiction detection
- `letters` - For opponent tracking

All tables include:
- ✅ Proper indexes for performance
- ✅ RLS policies for multi-tenant isolation
- ✅ Required columns for strategic intelligence

## 🚀 How to Run

### Option 1: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/0037_strategic_intelligence_support.sql`
4. Paste and run

### Option 2: Supabase CLI
```bash
supabase migration up
```

### Option 3: Direct SQL
Copy and paste the entire migration file into Supabase SQL Editor and run it.

## ✅ Verification

After running the migration, verify:

```sql
-- Check HEARING category is allowed
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'deadlines' AND constraint_name = 'valid_category';

-- Check deadlines table has org_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deadlines' AND column_name = 'org_id';

-- Check timeline_events table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'timeline_events';

-- Check bundles table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'bundles';

-- Check letters table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'letters';
```

## ⚠️ Important Notes

1. **Safe for Existing Tables**: This migration safely adds missing columns to existing `deadlines` tables. If your table already has `org_id`, it won't duplicate it.

2. **Existing Data**: This migration is safe to run on existing databases. It uses `IF NOT EXISTS` to avoid conflicts and won't modify existing data.

3. **RLS Policies**: All tables have RLS enabled with org-based isolation. Make sure your app sets `app.current_org_id` in the session.

4. **No Data Loss**: This migration only adds constraints and creates views/tables. It doesn't modify or delete existing data.

## 🔧 If You Get Errors

### Error: "constraint already exists"
- The constraint might already be updated. You can skip that part or drop it first:
```sql
ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS valid_category;
```

### Error: "table already exists"
- The tables might already exist. The migration uses `IF NOT EXISTS` so this shouldn't happen, but if it does, the migration will skip those parts.

### Error: "permission denied"
- Make sure you're running as a database admin or have the necessary permissions.

## 📊 Tables Used by Strategic Intelligence

The strategic intelligence system uses these existing tables:
- ✅ `cases` - Case information
- ✅ `documents` - Document metadata
- ✅ `deadlines` - Deadline tracking (with `org_id` and `category` columns)
- ✅ `timeline_events` - Timeline data
- ✅ `bundles` - Bundle information for contradictions
- ✅ `letters` - Letter tracking for opponent analysis

All of these are now ensured to exist with the correct structure.

