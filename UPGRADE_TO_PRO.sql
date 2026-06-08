-- Quick script to upgrade your organization to PRO plan
-- Run this in Supabase SQL Editor

-- First, find your organization ID
-- Replace 'YOUR_USER_ID' with your actual Clerk user ID
-- You can find this in the Clerk dashboard or by checking the organisations table

-- Option 1: Upgrade a specific org by user_id (if you know it)
-- UPDATE public.organisations
-- SET plan = 'pro'
-- WHERE id IN (
--   SELECT org_id FROM public.user_organisations 
--   WHERE user_id = 'YOUR_USER_ID'
-- );

-- Option 2: Upgrade ALL organizations (for development/testing)
UPDATE public.organisations
SET plan = 'pro'
WHERE plan = 'free';

-- Option 3: Reset usage counts AND upgrade to pro
UPDATE public.organisations
SET 
  plan = 'pro',
  upload_count = 0,
  analysis_count = 0,
  export_count = 0
WHERE plan = 'free';

-- Verify the change
SELECT id, plan, upload_count, analysis_count, export_count 
FROM public.organisations 
ORDER BY created_at DESC 
LIMIT 5;

