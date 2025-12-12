# Production Domain Setup - Owner Exemption

## Setting Up Owner Exemption on Your Production Domain

Since you're using a custom domain for production, you need to set the environment variables in your hosting platform (Vercel, Railway, etc.).

## Quick Setup

### For Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

```
Name: APP_OWNER_USER_IDS
Value: user_35JeizOJrQ0Nj
Environment: Production (and Preview if you want)
```

4. Click **Save**
5. **Redeploy** your application (Vercel will automatically redeploy when you add env vars, but you can trigger a manual redeploy)

### For Other Platforms (Railway, Render, etc.)

1. Go to your project's environment variables section
2. Add:
   ```
   APP_OWNER_USER_IDS=user_35JeizOJrQ0Nj
   ```
3. Restart/redeploy your application

## Verify It's Working

After setting the environment variable and redeploying:

1. Log in to your production domain with your account (`user_35JeizOJrQ0Nj`)
2. Try uploading a file
3. Check your server logs (Vercel logs, Railway logs, etc.)
4. You should see: `[paywall] ✅ Owner bypass active for userId: user_35JeizOJrQ0Nj`
5. Upload should work without hitting paywall limits

## Multiple Owners

If you have multiple owners, use comma-separated values:

```
APP_OWNER_USER_IDS=user_35JeizOJrQ0Nj,user_abc123,user_def456
```

## Alternative: Use Email Instead

If you prefer to use email instead of user ID:

```
APP_OWNER_EMAILS=your-email@example.com,other-owner@example.com
```

**Note:** Email check requires a database call, so user ID is faster.

## Important Notes

- ✅ Environment variables are read on server startup
- ✅ You must **redeploy** after adding/changing env vars
- ✅ The bypass check happens **BEFORE** any database calls
- ✅ Works in both dev and production
- ✅ No need to set `BYPASS_PAYWALL_IN_DEV` in production (that's only for local dev)

## Troubleshooting

If it's still not working:

1. **Check the logs** - Look for `[paywall]` messages in your server logs
2. **Verify the user ID** - Make sure `user_35JeizOJrQ0Nj` is your actual Clerk user ID
3. **Check env var format** - No spaces, no quotes (unless your platform requires them)
4. **Redeploy** - Environment variables require a redeploy to take effect
5. **Check environment** - Make sure you set it for the correct environment (Production vs Preview)

## Finding Your Clerk User ID

If you're not sure of your user ID:

1. Log in to your Clerk dashboard
2. Go to **Users** → Find your user
3. Copy the User ID (starts with `user_`)
4. Or check your browser console when logged in - it will be in the auth context

