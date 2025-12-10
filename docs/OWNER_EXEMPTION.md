# App Owner Paywall Exemption

As the app owner, you shouldn't be blocked by paywall limits. This document explains how to set up the exemption.

## Setup

Add your email or user ID to environment variables:

```env
# Option 1: By email (comma-separated for multiple owners)
APP_OWNER_EMAILS=your-email@example.com,another-owner@example.com

# Option 2: By Clerk user ID (comma-separated)
APP_OWNER_USER_IDS=user_abc123,user_def456
```

## How It Works

When you try to use a feature (upload, analysis, export), the system checks:
1. If your email matches `APP_OWNER_EMAILS` → **Bypass paywall** ✅
2. If your user ID matches `APP_OWNER_USER_IDS` → **Bypass paywall** ✅
3. Otherwise → Normal paywall check applies

## Finding Your User ID

1. Check your Clerk dashboard
2. Or check the browser console when logged in - your user ID will be in the auth context
3. Or check the database `organisations` table for your user ID

## Testing

After adding your email/ID to the env vars:
1. Restart your dev server
2. Try uploading a file
3. You should see in the console: `[paywall] Bypassing paywall for app owner`
4. Uploads should work without limits

## Security Note

- Only add trusted emails/IDs
- Don't commit these to git (they're in `.env.local`)
- In production, use your hosting platform's environment variable settings

