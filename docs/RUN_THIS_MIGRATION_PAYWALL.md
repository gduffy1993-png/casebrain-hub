# 📋 Paywall Migration - Run This First

## Migration File
`supabase/migrations/0047_paywall_usage.sql`

## What This Does

This migration:
1. Adds usage tracking columns to the `organisations` table:
   - `upload_count` - Total PDF uploads
   - `analysis_count` - Total AI analysis operations
   - `export_count` - Total case pack exports

2. Updates the plan system:
   - Migrates existing plans (`FREE`, `LOCKED`, `PAID_MONTHLY`, `PAID_YEARLY`) to new system (`free`, `pro`)
   - Sets default plan to `free`
   - Updates constraint to only allow `free` or `pro`

3. Creates a helper function for atomic usage increments

## How to Run

### Option 1: Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left menu
3. Click **New query**
4. Open `supabase/migrations/0047_paywall_usage.sql` in your editor
5. Copy the entire file content (Ctrl+A, Ctrl+C)
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

## Verification

After running, verify the migration worked:

```sql
-- Check that columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organisations'
  AND column_name IN ('upload_count', 'analysis_count', 'export_count');

-- Check that plans are migrated
SELECT plan, COUNT(*) 
FROM organisations 
GROUP BY plan;

-- Check that function exists
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_usage_counter';
```

You should see:
- 3 columns with default values of 0
- Plans showing as `free` or `pro`
- Function `increment_usage_counter` exists

## Important Notes

- **Idempotent**: Safe to run multiple times (uses `IF NOT EXISTS`)
- **Data Preserved**: Existing organisations are migrated, not deleted
- **No Downtime**: Migration is non-blocking

## Troubleshooting

If you see errors:
1. Make sure you have admin access to the database
2. Check that the `organisations` table exists (from migration `0033_paywall_system.sql`)
3. If plans are still old values, manually update:
   ```sql
   UPDATE organisations SET plan = 'pro' WHERE plan IN ('PAID_MONTHLY', 'PAID_YEARLY');
   UPDATE organisations SET plan = 'free' WHERE plan IN ('FREE', 'LOCKED');
   ```

