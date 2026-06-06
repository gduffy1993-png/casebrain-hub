# Reasoning feedback — solicitor marks

**Status:** Local capture with optional DB persistence behind `?persistence=1`.

**Visibility:** Only when Reasoning V2 flag is on (`?reasoningV2=1` or `localStorage: casebrain:reasoningV2=true`).

**Persistence (slice 1):** When `?persistence=1` or `localStorage: casebrain:persistence=true`, the card attempts `POST /api/criminal/[caseId]/reasoning-feedback`. On success, feedback is stored in `reasoning_feedback` and mirrored to localStorage. If the API is unavailable, localStorage fallback applies unchanged.

**Kill switch:** `localStorage: casebrain:persistence:feedback=false` disables feedback DB writes while keeping other persistence slices ready for later.

**Stored fields:** caseId, surface, feedbackOption, optional sanitized note (max 400 chars), routeLabel, humanReviewRequired, timestamp, appVersion — never bundle or evidence text.

**Tests:** `npx tsx scripts/reasoning-feedback.test.ts`
