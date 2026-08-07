# STOP FOR CODEX REVIEW — Auth recovery blocker (PR #66)

**Do not merge. No production deploy. Authenticated pilot still blocked until reset email is confirmed in a real inbox.**

## Provider verified
- CaseBrain email/password sign-in is **Supabase Auth** (`signInWithPassword`).
- Clerk is an optional layout/middleware remnant only — not used for recovery.

## Shipped in this commit
- `/sign-in` → **Forgot password?**
- `/forgot-password` (neutral acknowledgement; no account enumeration)
- `/api/auth/forgot-password` (rate-limited; real `resetPasswordForEmail`)
- `/auth/callback` (PKCE code exchange → recovery session)
- `/reset-password` (new + confirm; expiry/invalid states; success → `/sign-in?reset=success`)
- Settings → **Change password**
- Contracts: `scripts/auth-password-recovery-contracts.test.ts`
- Callback URL notes: `docs/auth/SUPABASE-PASSWORD-RECOVERY.md`

## Explicit non-claims
- No email delivery claim until a real message is received.
- No merge / production deploy.
- No authenticated pilot PASS.

## Single user action required
1. Ensure the current Vercel preview host’s `/auth/callback` is in Supabase Redirect URLs.
2. On the new preview, open `/forgot-password`, enter the CaseBrain account email, submit.
3. Check inbox/spam for the Supabase reset email — only then continue the authenticated pilot.
