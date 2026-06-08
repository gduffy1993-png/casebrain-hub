# Trial / paywall abuse test checklist

Use this to confirm that trial limits are enforced and no route bypasses the paywall.

**Prerequisites**

- A **non-owner** account (trial limits apply). Owner accounts bypass the paywall.
- Optional: set `PAYWALL_MODE=trial` so limits are enforced.

**Trial rules (from `lib/paywall/trialLimits.ts`)**

- 14 days from first case **or** first document.
- Max **2 cases** during trial.
- Max **10 documents** total during trial.
- When **trial expired** or at limit: new case and new document must return **402**; analysis rerun/rebuild must return **402** when trial expired.

---

## Enforcement audit (where 402 is returned)

| Route | When it returns 402 |
|-------|----------------------|
| `POST /api/upload` | **CASE_LIMIT**: Creating a **new case** (no `caseId`) when already at 2 cases. **DOC_LIMIT**: Adding documents when already at 10 docs. |
| `POST /api/intake/create-case` | **Any** trial block: TRIAL_EXPIRED, CASE_LIMIT, or DOC_LIMIT. |
| `POST /api/cases/[caseId]/analysis/rerun` | **TRIAL_EXPIRED** only. (Re-analysis is allowed within the 2 cases / 10 docs.) |
| `POST /api/cases/[caseId]/analysis/rebuild` | **TRIAL_EXPIRED** only. |

No other API route creates cases or documents. `intake/attach` only links an existing doc to an existing case (no new rows).

---

## Manual test steps

Use a **non-owner** user. Run in order.

### 1. Third case returns 402

1. Create **2 cases** (e.g. via Upload with a new case each time, or Intake → Create case twice).
2. Try to create a **3rd case**:
   - **Upload**: New upload, new case title, no existing case → expect **402** and message like "Trial limit reached: 2 cases. Upgrade to continue."
   - **Intake**: From inbox, "Create case" on a doc when you already have 2 cases → expect **402**.

### 2. Eleventh document returns 402

1. With 1 or 2 cases, upload documents until you have **10 documents** in total (across the org).
2. Try to upload an **11th** document (any case or new case) → expect **402** and message like "Trial limit reached: 10 documents. Upgrade to continue."

### 3. Expired trial returns 402

1. Either wait for the 14-day trial to end, or temporarily change `TRIAL_DAYS` in `trialLimits.ts` to `0` and use an org that already has one case/doc (so trial start is in the past).
2. Try:
   - **Create new case** (upload or intake create-case) → expect **402** (Trial limit reached. Your trial has ended.).
   - **Upload new document** → expect **402**.
   - **Analysis rerun** on an existing case → expect **402**.
   - **Analysis rebuild** on an existing case → expect **402**.

### 4. Owner bypass (sanity check)

With an **owner** account (see `lib/paywall/owner.ts`), creating cases and documents and running analysis should **not** return 402 (owner is always allowed).

---

## Quick reference: response shape

All trial 402 responses use the same shape (from `lib/paywall/trialLimit402.ts`):

- `error`: Human message (e.g. "Trial limit reached: 2 cases. Upgrade to continue.")
- `code`: `"TRIAL_EXPIRED"` | `"DOC_LIMIT"` | `"CASE_LIMIT"`
- `upgrade`: `{ price: "£39/user/month" }`
- Optional: `casesUsed`, `casesLimit`, `docsUsed`, `docsLimit`, `trialEndsAt`

HTTP status must be **402 Payment Required**.
