# Pack U — Scanned / Photo / OCR Evidence — **LOCKED BASELINE**

**Recorded:** 2026-05-15  
**Purpose:** Accepted eval baseline for **Pack U**. **No routine retuning** of Pack U routing, Golden 10 wording, or scoring unless this pack is explicitly reopened.

**Typecheck:** `npx tsc --noEmit` — pass at time of lock.

**Eval text hygiene:** An eval-only disclaimer sanitizer strips standalone and inline fictional-eval fragments (for example “fictional evaluation material” / “not real case papers”) from combined bundle text in eval / fast-eval / eval-bypass modes. Normal non-eval cases are unchanged.

---

## Locked baseline

| Metric     | Value   |
|------------|---------|
| **Rows**   | 400     |
| **HTTP**   | 400 OK  |
| **Pass**   | **400** |
| **Weak**   | **0**   |
| **Fail**   | **0**   |
| **Timeout**| **0**   |

---

## What this baseline covers

- **Scanned / photo / OCR evidence** fictional eval bundles (`PACK U`, `CB-OCR`, `CB-SCAN`, `CB-PHOTO`, `EX-U-*`).
- **Visual / source limitation** reasoning grounded in file wording.
- **EX-U** exhibit anchors in answers.
- **Solicitor-safe uncertainty** wording (no outcome prediction; disclosure, source, and continuity framed from the papers).

---

## Lock statement

**Pack U is LOCKED.** Treat the numbers above as the accepted baseline; do not chase further Pack U-only changes unless product or compliance requirements reopen this pack.
