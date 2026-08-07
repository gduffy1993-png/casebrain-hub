# STOP FOR CODEX REVIEW — Auth recovery session fix (PR #66)

**Email delivery: PASS. Recovery-session completion: previously FAIL — fix pushed; do not claim fixed until a fresh real email link reaches the password form and a real password change succeeds.**

**Do not merge. No production deploy.**

## Root causes addressed
1. Server-side `resetPasswordForEmail` broke PKCE (code verifier not in the browser).
2. `/auth/callback` did not attach Supabase auth cookies to the redirect response.
3. Ephemeral Vercel deployment hosts invalidated older reset links — prefer stable branch alias.

## Stable callback URL to allow-list in Supabase
`https://casebrain-git-programme-real-pdf-live-pilot-v1-gduffy1993-pngs-projects.vercel.app/auth/callback`

## User verification required before FIXED claim
1. Add the stable callback URL above to Supabase Redirect URLs (if not already).
2. Open the stable preview `/forgot-password`, request a **fresh** email.
3. Click the email link → must show New password + Confirm + Save.
4. Save a new password → `/sign-in?reset=success` → sign in works.
