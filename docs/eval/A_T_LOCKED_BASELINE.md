# Eval packs A–T — individual lock & baseline summary

**Document generated:** 2026-05-15 06:28:24 +01:00  
**Purpose:** Record that **packs A through T are individually locked** as accepted eval baselines, with agreed pass/weak/fail/timeout numbers and **known residuals only** (not retune targets unless explicitly reopened).

**Working-tree inspection (this verification):** `git status` / `git diff` showed **only** `app/api/criminal/[caseId]/defence-plan-chat/route.ts` modified (eval chat route). **No** upload/import, database migrations, Golden 10 question strings, or scoring-module edits appeared in that diff snapshot. Broader history may contain other commits; re-run `git diff` before merges as usual.

**Typecheck:** `npx tsc --noEmit` — pass at time of this document.

---

## Lock statement

Each eval pack **A through T** is treated as **locked**: baseline numbers and residuals below are **accepted**; routine work must **not** retune packs, routing, Golden 10 wording, or scoring unless a pack is **explicitly** taken out of lock for a scoped change.

**These are accepted baseline weaknesses, not current blockers.**

---

## Per-pack baselines (locked)

### A–D — LOCKED

Truth / trap / gold-answer baseline packs. **Do not retune.**

### E–J — LOCKED (combined E–J baseline)

Final combined **E–J** baseline:

| Metric   | Value   |
|----------|---------|
| Total    | 2320 pass / 80 weak / 0 fail / 0 timeout |

Per-pack (same battery convention as your sweep):

| Pack | Pass | Weak | Fail | Timeout |
|------|------|------|------|---------|
| **E** | 400 | 0 | 0 | 0 |
| **F** | 400 | 0 | 0 | 0 |
| **G** | 360 | 40 | 0 | 0 |
| **H** | 360 | 40 | 0 | 0 |
| **I** | 400 | 0 | 0 | 0 |
| **J** | 400 | 0 | 0 | 0 |

**Accepted known residual (E–J):** **G / H Q8** semantic-collapse polish only (documented under accepted residuals below).

### K — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Messy PDFs passed. **Residual:** Q1 missing offence wording polish only.

### L — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Stage workflow passed. **Residual:** Q1 missing offence wording polish only.

### M — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Multi-defendant / multi-count passed. **Residual:** Q1 missing offence wording polish only.

### N — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 396 | 4 | 0 | 0 |

Youth / vulnerability / safeguards passed. **Residual:** Q1 missing offence wording polish only.

### O — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 396 | 4 | 0 | 0 |

Client instruction conflict; **Q3 semantic collapse addressed** (narrow Pack O Q3 path). **Residual:** Q1 missing offence wording polish only.

### P — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 396 | 4 | 0 | 0 |

Bad defence facts / CPS pressure passed. **Residual:** Q1 missing offence wording polish only.

### Q — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 396 | 4 | 0 | 0 |

Thin bundle / no-safe-strategy passed. **Residual:** Q1 missing offence wording polish only.

### R — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Prompt injection / malicious document passed. **Residual:** Q1 missing offence wording polish only.

### S — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Solicitor exports; **Q3 semantic collapse addressed** (narrow Pack S Q3 path). **Residual:** Q1 missing offence wording polish only.

### T — LOCKED

| Pass | Weak | Fail | Timeout |
|------|------|------|---------|
| 397 | 3 | 0 | 0 |

Solicitor review readiness passed. **Residual:** Q1 missing offence wording polish only.

---

## Accepted residuals (summary)

| Area | Packs / scope | Note |
|------|----------------|------|
| **Q1** — missing offence wording polish | K, L, M, N, O, P, Q, R, S, T (and similar where listed) | Cosmetic / wording polish; **not** a blocker under lock. |
| **Q8** — semantic-collapse polish | **G, H** (within **E–J** baseline) | Accepted under the **E–J** combined baseline; **not** a blocker under lock. |

Again: **these are accepted baseline weaknesses, not current blockers.**

---

## Next step

**Run packs A–T selected all together** as the full regression proof after any future eval-route or scoring change that is intentionally out of lock.
