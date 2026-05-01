# Autoer — automated eval loop (plan)

**Name:** Autoer  
**Purpose:** Repeatedly ask fixed questions across many cases, score outputs, export results, and drive a tight fix → redeploy → retest cycle. This is **reliability engineering**, not ML model training.

---

## What it is (human terms)

- You keep **questions** and **case IDs** in config files (or later: load from API).
- You run **one command**; Autoer calls the same chat API the UI uses for each (case × question).
- It writes **timestamped results** (CSV/JSON) with answers, errors, latency.
- Optional: a **scorer** marks pass/fail against rules; a **report** summarizes pass rates and failure buckets.
- You send results to engineering / Cursor in one batch; we patch once; you redeploy; Autoer runs again to prove improvement.

---

## Frozen question pack (v1 — use exactly)

Use ChatGPT’s final 10 (wording matters for routing/scoring):

1. What is the primary allegation in one sentence using only the bundle wording?
2. What does MG6 say is served and what is outstanding?
3. What evidence appears to be missing or incomplete right now?
4. What does the interview summary say happened?
5. List every exhibit code exactly as printed and the bundle reference ID.
6. Are there any inconsistencies or conflicts in the evidence?
7. What must the prosecution still prove in this case?
8. What is the single biggest weakness in the prosecution case?
9. What is the single biggest weakness in the defence case?
10. What should be done in the next 24 hours?

**Note:** Q2, Q4, Q5 align with strict paths in app when bundle shape matches. Q8–Q10 are interpretive — expect more variance; score separately.

---

## Run strategy (recommended)

- **Question-first:** run Q1 across all cases, then Q2, … (cleanest signal for debugging).
- Alternative: case-first (all 10 per case) — better for per-case review.

Target: **40 cases × 10 questions = 400 rows** per full pass.

---

## Folder layout (target)

```text
autoer/
  config/
    questions.json      # versioned question pack
    cases.json          # case ids (+ optional titles)
    rules.json          # optional scoring rules per question
  scripts/
    run.mjs             # or run.ts — HTTP loop + export
    score.mjs           # optional — pass/fail + buckets
  README.md             # how to run + env vars
eval-runs/
  <timestamp>/
    raw.jsonl
    scored.json
    summary.md
```

---

## Execution flow

1. **Configure:** base URL (local or prod), cookie/session or API token if needed, delays, timeouts, retries.
2. **Run:** `POST /api/criminal/{caseId}/defence-plan-chat` with body `{ message, planSummary?, evidenceSummary?, timelineSummary? }` matching DefencePlanBox (runner currently sends `message` only; align with production needs).
3. **Export:** one TSV/CSV for spreadsheet + optional JSON for tooling.
4. **Score (optional v2):** regex / structural checks per question; flag hallucination patterns.
5. **Compare:** diff pass% vs previous run after deploy.

---

## Deploy loop (safe default)

- Autoer **does not** auto-merge code or auto-deploy without a human gate.
- Workflow: run → export → fix → `git commit` → deploy → re-run → compare.

---

## Safety / ops

- Rate limits: jitter between requests; max concurrent = 1 for stability.
- Caps: max retries per request; stop if error rate spikes.
- Cost: log approximate token usage if available from provider logs.
- Secrets: never commit cookies/tokens; use env or local `.env.autoer` (gitignored).

---

## Product evolution (later)

- **Account-gated UI:** bulk runner visible only for allowlisted user/org; API enforced server-side.
- **Server-side bulk endpoint:** optional — reduces browser load and centralizes auth.

---

## Relationship to “training”

Autoer does **not** update model weights. It **stress-tests** the product and drives **code + routing + parsers** improvements until outputs are stable and grounded.

---

## Next step when you have data

Paste or attach:

- `run_id` / date
- Full export or **failures only** with `case_id`, `question`, `answer`, `error`

We prioritize fixes by failure bucket (routing, parse, format, hallucination, fallback).
