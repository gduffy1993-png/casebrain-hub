# Supabase password recovery — callback URL configuration

CaseBrain email/password sign-in is **Supabase Auth** (`signInWithPassword` on `/sign-in`).
Clerk is an optional remnant in layout/middleware and is **not** the recovery provider.

## App routes added

| Route | Purpose |
|-------|---------|
| `/forgot-password` | Email entry + neutral acknowledgement |
| `/auth/callback` | Exchanges Supabase `?code=` for a recovery session |
| `/reset-password` | New password + confirm; then redirect to `/sign-in?reset=success` |
| `/api/auth/forgot-password` | Rate-limited `resetPasswordForEmail` |
| `/api/auth/update-password` | Recovery reset or authenticated change-password |
| Settings → Change password | Authenticated password change |

## Redirect URL allow-list (Supabase Dashboard → Authentication → URL configuration)

Add these **Redirect URLs** (no secrets required in the app commit):

1. Local: `http://localhost:3000/auth/callback`
2. Production: `https://<your-production-host>/auth/callback`
3. Vercel previews: either
   - exact preview host after each deploy, or
   - a wildcard pattern if your Supabase plan supports it (e.g. `https://*-gduffy1993-pngs-projects.vercel.app/auth/callback`)

Also set **Site URL** in Supabase to the production host (not a secret).

## App env (public only)

```bash
# Preferred public origin for recovery emails (preview or production)
NEXT_PUBLIC_SITE_URL=https://your-deployment-host
```

When `NEXT_PUBLIC_SITE_URL` is unset, the API falls back to `https://$VERCEL_URL` on Vercel, then the request origin.

Do **not** commit service-role keys, SMTP passwords, or dashboard tokens.

## Rate limiting / enumeration

- Forgot-password is limited per IP and per email (in-memory LRU; per-instance on serverless).
- Client always receives the same neutral acknowledgement text when the email shape is valid.
- Invalid email returns `400` with a validation message only (not “account not found”).

## Operator checklist before authenticated pilot

1. Confirm Supabase Redirect URLs include the current Vercel preview callback.
2. Open preview `/forgot-password`, submit the account email.
3. Confirm a real reset email arrives (do not claim delivery until inbox shows it).
4. Complete reset → sign-in → Settings → Change password smoke check.
