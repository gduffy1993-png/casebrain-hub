# Clerk Authentication Setup

## Enable Password Authentication

For the SignIn component to show email/password fields, you need to enable password authentication in your Clerk dashboard:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **User & Authentication** → **Email, Phone, Username**
4. Under **Email address**, enable:
   - ✅ **Email address** (required)
   - ✅ **Password** (enable this for password login)
   - Optionally enable **Username** if you want username + password login

5. Under **Authentication methods**, make sure:
   - ✅ Email code (magic links) - can be enabled alongside password
   - ✅ Password - **MUST be enabled** for password login to work

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

