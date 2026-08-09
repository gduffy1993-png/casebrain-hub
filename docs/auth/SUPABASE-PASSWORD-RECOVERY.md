# Supabase password recovery — callback URL configuration

CaseBrain email/password sign-in is **Supabase Auth** (`signInWithPassword` on `/sign-in`).
Clerk is an optional remnant in layout/middleware and is **not** the recovery provider.

## Critical implementation notes (session completion)

1. **`resetPasswordForEmail` must run in the browser** so the PKCE code verifier is stored in the same browser that later opens the email link.
2. **`/auth/callback` must write Supabase auth cookies onto the redirect `NextResponse`** (not only `cookies()` from `next/headers`), then redirect to `/reset-password`.
3. Middleware **must not** redirect `/auth/callback` or `/reset-password` to sign-in. Gating stays in `(protected)/layout.tsx` only.
4. Prefer a **stable branch alias** for `redirectTo` so redeploys do not invalidate outstanding emails.
5. **Never** allow recovery to fall back to `https://www.casebrain.co.uk/?code=...`.

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
2. **PR #66 stable alias (required):**
   `https://casebrain-hub-git-programme-rea-33bd05-gduffy1993-pngs-projects.vercel.app/auth/callback`
3. Optional wildcard for that preview family:
   `https://casebrain-hub-git-programme-rea-33bd05-gduffy1993-pngs-projects.vercel.app/**`
4. Production (separate from this pilot): `https://www.casebrain.co.uk/auth/callback`

Also set **Site URL** carefully. If a `redirectTo` is not allow-listed, Supabase falls back to Site URL and the email lands on `https://www.casebrain.co.uk/?code=...` — that is the failure mode this PR rejects.

Env for previews (no trailing newline/CRLF — that breaks allow-list matching):

```bash
NEXT_PUBLIC_AUTH_RECOVERY_ORIGIN=https://casebrain-hub-git-programme-rea-33bd05-gduffy1993-pngs-projects.vercel.app
```

If `redirectTo` is missing from Supabase **Redirect URLs**, Auth falls back to **Site URL**
(`https://www.casebrain.co.uk/?code=...`). Keep the exact PR #66 callback allow-listed.

## Operator checklist (legacy account, PR #66)

1. Confirm the **stable PR #66** `/auth/callback` is in Supabase Redirect URLs (exact URL above).
2. Open **only** the preview forgot-password page (not www).
3. Request a **fresh** reset email for the legacy account.
4. Email link must open:
   `…/auth/callback?code=…&next=%2Freset-password` on the preview host
   then `/reset-password` with a live recovery session.
5. Set a new password → `/sign-in?reset=success`.
6. Do **not** claim fixed until steps 4–5 succeed with a real inbox message.
7. Do not move/delete/reassign legacy cases; do not assign a password via admin API.
