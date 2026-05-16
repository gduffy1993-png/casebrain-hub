# Pack X — Hearing / Court Move Reasoning — **LOCKED BASELINE**

**Recorded:** 2026-05-16  
**Purpose:** Accepted eval baseline for **Pack X** (hearing / court move reasoning, disclosure hearing pressure, source-material gaps). **No routine retuning** of Pack X routing, Golden 10 wording, or scoring unless this pack is explicitly reopened.

**Typecheck:** `npx tsc --noEmit` — pass at time of lock.

---

## Locked baseline

| Metric      | Value   |
|-------------|---------|
| **Rows**    | 400     |
| **HTTP**    | 400 OK  |
| **Pass**    | **390** |
| **Weak**    | **10**  |
| **Fail**    | **0**   |
| **Timeout** | **0**   |

**Notes:** The remaining **10 weak** rows are **scoring / wording strictness only**, mainly **Q2** (missing expected bundle wording in the scorer). They are **harmless** for product risk: **no fallback failures**, **no timeout**. **Q1 / Q4 / Q7 / Q8 / Q9** Pack X builders **route correctly**. This distribution is **accepted for the locked baseline**.

---

## What this baseline covers

- **Hearing / court move reasoning** and **disclosure hearing pressure** grounded in file wording.
- **Source-material gaps** and **MG6 / disclosure** pressure lines where printed.
- **EX-X** exhibit anchors and **`CB-HEARING`**, **`CB-COURT`**, **`CB-MOVE`** case references in answers where the file publishes them.
- **Provisional hearing strategy**, **no overstatement**, and **solicitor-safe court wording** (conditional moves; do not predict outcome).

**Identifiers (bundle/title/reference):** `PACK X`, `CB-HEARING`, `CB-COURT`, `CB-MOVE`, `EX-X-*`.

---

## Lock statement

**Pack X is LOCKED.** Treat the numbers above as the accepted baseline; do not chase further Pack X-only changes unless product or compliance requirements reopen this pack.

---

## Next step

**A–X full regression** — run the combined eval sweep across packs **A** through **X** before treating wider changes as safe.
