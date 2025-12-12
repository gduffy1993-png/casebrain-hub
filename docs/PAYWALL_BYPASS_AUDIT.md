# Paywall Bypass System Audit & Fix

## Summary

Fixed the paywall system to ensure owner bypass works correctly in both dev and production. The bypass now happens **BEFORE** any database calls or limit checks.

## Files Modified

1. **`lib/paywall/bypass.ts`** (NEW FILE)
   - Created clean helper functions for bypass checks
   - `isDevBypassActive()` - checks dev mode bypass
   - `isOwnerByUserId(userId)` - fast check by user ID (no DB calls)
   - `isOwnerByEmail(userId)` - check by email (requires DB call)
   - `shouldBypassPaywall(userId)` - main function that checks all methods

2. **`lib/paywall/usage.ts`**
   - Updated `ensureCanUseFeature()` to call `shouldBypassPaywall()` FIRST
   - Removed all the old inline bypass logic
   - Bypass check now happens before any database queries

3. **`lib/paywall/guard.ts`**
   - Updated `paywallGuard()` to check bypass FIRST (before getting user/org)
   - Bypass check happens before any database calls

4. **`app/api/paywall/status/route.ts`**
   - Added bypass check at the start
   - Returns unlimited status for owners

## How It Works

### Bypass Check Order (Fastest to Slowest)

1. **Dev Mode Bypass** (fastest, no DB calls)
   - Checks `NODE_ENV === "development"` AND `BYPASS_PAYWALL_IN_DEV === "true"`
   - Accepts: "true", "1", or "yes"

2. **Owner by User ID** (fast, no DB calls)
   - Checks if `userId` is in `APP_OWNER_USER_IDS` env var
   - Comma-separated list: `APP_OWNER_USER_IDS=user_123,user_456`

3. **Owner by Email** (slower, requires DB call)
   - Fetches user email from Supabase
   - Checks if email is in `APP_OWNER_EMAILS` env var
   - Comma-separated list: `APP_OWNER_EMAILS=owner@example.com,other@example.com`

### Your Clerk User ID

Your user ID `user_35JeizOJrQ0Nj` will bypass the paywall if set in:

```env
APP_OWNER_USER_IDS=user_35JeizOJrQ0Nj
```

## Environment Variables

### For Development
```env
# Bypass paywall for everyone in dev mode
BYPASS_PAYWALL_IN_DEV=true
NODE_ENV=development
```

### For Production
```env
# Your Clerk user ID (comma-separated for multiple owners)
APP_OWNER_USER_IDS=user_35JeizOJrQ0Nj

# OR by email (comma-separated)
APP_OWNER_EMAILS=your-email@example.com
```

## Logging

The system now logs clearly when bypass is active:

- `[paywall] ✅ Dev bypass active`
- `[paywall] ✅ Owner bypass active for userId: user_35JeizOJrQ0Nj`
- `[paywall] ✅ Owner bypass active for email: your@email.com`
- `[paywall] Regular usage check proceeding` (when bypass is not active)

## Testing

1. Set `APP_OWNER_USER_IDS=user_35JeizOJrQ0Nj` in your environment
2. Restart your server (env vars are read on startup)
3. Try uploading a file
4. Check console logs - you should see: `[paywall] ✅ Owner bypass active for userId: user_35JeizOJrQ0Nj`
5. Upload should succeed without hitting paywall limits

## Key Changes

✅ Bypass check happens **BEFORE** any database calls
✅ Clean helper functions for maintainability
✅ Clear logging for debugging
✅ Works in both dev and production
✅ Supports multiple owners (comma-separated)
✅ Fastest checks first (dev bypass, then userId, then email)

