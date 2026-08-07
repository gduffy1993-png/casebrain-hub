# Supabase password recovery — callback URL configuration

CaseBrain email/password sign-in is **Supabase Auth** (`signInWithPassword` on `/sign-in`).
Clerk is an optional remnant in layout/middleware and is **not** the recovery provider.

## Critical implementation notes (session completion)

1. **`resetPasswordForEmail` must run in the browser** so the PKCE code verifier is stored in the same browser that later opens the email link.
2. **`/auth/callback` must write Supabase auth cookies onto the redirect `NextResponse`** (not only `cookies()` from `next/headers`), then redirect to `/reset-password`.
3. Middleware **must not** redirect `/auth/callback` or `/reset-password` to sign-in. Gating stays in `(protected)/layout.tsx` only.
4. Prefer a **stable branch alias** for `redirectTo` so redeploys do not invalidate outstanding emails.

## App routes

| Route | Purpose |
|-------|---------|
| `/forgot-password` | Email entry; browser sends reset email after rate-limit check |
| `/api/auth/forgot-password` | Rate-limit + returns stable `redirectTo` (does **not** call provider) |
| `/auth/callback` | PKCE `code` exchange or `token_hash` verify; sets cookies; redirects |
| `/reset-password` | New + confirm password; `updateUser({ password })`; sign-out → sign-in |
| Settings → Change password | Authenticated password change |

## Redirect URL allow-list (Supabase Dashboard → Authentication → URL configuration)

Add these **Redirect URLs** (no secrets in git):

1. Local: `http://localhost:3000/auth/callback`
2. Stable PR branch alias (recommended for PR #66):
   `https://casebrain-git-programme-real-pdf-live-pilot-v1-gduffy1993-pngs-projects.vercel.app/auth/callback`
3. Production: `https://<your-production-host>/auth/callback`

Optional env:

```bash
NEXT_PUBLIC_AUTH_RECOVERY_ORIGIN=https://casebrain-git-programme-real-pdf-live-pilot-v1-gduffy1993-pngs-projects.vercel.app
```

## Operator checklist

1. Confirm the **stable branch alias** `/auth/callback` is in Supabase Redirect URLs.
2. Request a **fresh** reset email from that same origin/browser.
3. Open the email link → must land on the new-password form (not an immediate invalid/missing-session state).
4. Set a new password → land on `/sign-in?reset=success` and sign in.
5. Do not claim fixed until steps 3–4 succeed with a real message.
