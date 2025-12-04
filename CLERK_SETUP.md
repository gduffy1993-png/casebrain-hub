# Clerk Authentication Setup

## ⚠️ IMPORTANT: Enable Password Authentication

**The SignIn component will only show username/password boxes if password authentication is enabled in your Clerk dashboard.**

### Steps to Enable Password Authentication:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **User & Authentication** → **Email, Phone, Username**
4. Under **Email address**, enable:
   - ✅ **Email address** (required)
   - ✅ **Password** - **MUST BE ENABLED** (this is what shows the password box!)
   - Optionally enable **Username** if you want username + password login

5. Under **Authentication methods**, make sure:
   - ✅ **Password** - **MUST be enabled** (this is critical!)
   - ⚠️ **Email code (magic links)** - You can disable this if you ONLY want password login

6. **Save changes** and wait a few seconds for the changes to propagate

### If You Still See Email Code Verification:

If you're still seeing email code verification instead of password fields:
- Password authentication might not be enabled in Clerk dashboard
- Check that "Password" is enabled under Authentication methods
- The component will automatically show password fields once enabled in Clerk

## What the SignIn Component Shows

The Clerk `<SignIn />` component automatically displays:
- **Email + Password fields** if password authentication is enabled
- **Email code/magic link** if only email code is enabled
- **Username + Password** if username is enabled in addition to email

## Current Configuration

The app is configured to:
- Show SignIn form at `/` (homepage) when signed out
- Show SignUp form at `/sign-up` when clicking "Create account"
- Redirect to `/cases` after successful authentication

All authentication is handled securely by Clerk - no passwords are stored in your app.

