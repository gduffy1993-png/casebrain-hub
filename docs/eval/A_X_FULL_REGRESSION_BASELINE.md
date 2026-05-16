# A–X Full Regression — **LOCKED BASELINE**

**Recorded:** 2026-05-16  
**Purpose:** Accepted combined eval baseline for all **24 packs (A–X)**. **No routine retuning** of pack routing, Golden 10 wording, scoring, upload/import, or database schema unless a pack or the full battery is explicitly reopened.

**Typecheck:** `npx tsc --noEmit` — pass at time of lock.

---

## Locked baseline

| Metric      | Value     |
|-------------|-----------|
| **Packs**   | **24** (A–X) |
| **Rows**    | **9,600** |
| **HTTP**    | **9,600 OK** |
| **Pass**    | **9,521** |
| **Weak**    | **79**    |
| **Fail**    | **0**     |
| **Timeout** | **0**     |

**Pass rate:** ~99.18% (9,521 / 9,600).

---

## What this baseline covers

### A–T — criminal defence truth / safety packs

Combined battery across the original **A–T** corpus (see [`A_T_FULL_REGRESSION_BASELINE.md`](./A_T_FULL_REGRESSION_BASELINE.md) and [`A_T_LOCKED_BASELINE.md`](./A_T_LOCKED_BASELINE.md) for per-pack detail), including:

- Truth / trap / gold answers, hallucination refusal, procedural stages
- Youth / vulnerability / safeguards, evidence chaos, strategy pressure
- Multi-defendant / multi-count, messy PDFs, instruction conflicts
- CPS / bad-facts pressure, thin bundle / no-safe-strategy
- Prompt injection, solicitor exports, solicitor review readiness

### U — scanned / photo / OCR evidence

- Visual / scanned bundle limits, OCR-style anchors, **`EX-U-*`**, **`CB-OCR` / `CB-SCAN` / `CB-PHOTO`**
- See [`PACK_U_LOCKED_BASELINE.md`](./PACK_U_LOCKED_BASELINE.md)

### V — strategy leverage / why evidence helps or hurts

- Conditional leverage wording, Crown/defence “may assist” lines, **`EX-V-*`**, **`CB-LEVERAGE` / `CB-WHY`**
- See [`PACK_V_LOCKED_BASELINE.md`](./PACK_V_LOCKED_BASELINE.md)

### W — timeline / sequence / alibi conflict

- Timing pressure, sequence conflict, provisional alibi limits, **`EX-W-*`**, **`CB-TIMELINE` / `CB-SEQUENCE` / `CB-ALIBI`**
- See [`PACK_W_LOCKED_BASELINE.md`](./PACK_W_LOCKED_BASELINE.md)

### X — hearing / court move reasoning

- Disclosure hearing pressure, source-material gaps, provisional hearing strategy, **`EX-X-*`**, **`CB-HEARING` / `CB-COURT` / `CB-MOVE`**
- See [`PACK_X_LOCKED_BASELINE.md`](./PACK_X_LOCKED_BASELINE.md)

---

## Accepted residuals

The remaining **79 weak** rows are **accepted scoring / wording strictness only**:

- Mostly **Q1** offence-wording / scorer strictness
- Small **Q2 / Q5** wording or source-digest strictness
- **No fail groups**
- **No timeout groups**
- **No fallback collapse groups**
- **Pack G / Pack H Q8** prosecution-weakness semantic collapse has been **fixed**; full regression still passes with this distribution

**No safety failure. No timeout. No hallucination / fallback collapse group.**

This is the **baseline before product-layer work** — controlled eval reliability, not autonomous legal advice. Solicitor review remains required.

---

## Lock statement

**A–X full regression is LOCKED.** Treat the numbers above as the accepted combined baseline; do not retune A–X eval routing or scoring unless product, compliance, or an explicit pack reopen requires it.

---

## Next phase (after baseline)

Product and platform work may proceed on top of this lock, including (non-exhaustive):

- **Strategy Battleboard**
- **Evidence Impact Meter**
- **What Would Make Us Lose**
- **Hearing War Room**
- **Case Moves Engine**
- **Security / RLS hardening**
- **Solicitor demo / pilot**

Re-run the full **A–X** battery after any change that could affect deterministic eval answers, grounding, or pack gates.
