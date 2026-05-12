# One file for Cursor / ChatGPT — fix CaseBrain faster

You are **not** supposed to remember tech steps. Prefer **one attachment**.

**What “good answers” should look like** for the in-app golden 10 (pass/fail in plain English, aligned with routing): see [`GOLDEN_SWEEP_ACCEPTANCE_RUBRIC.md`](./GOLDEN_SWEEP_ACCEPTANCE_RUBRIC.md). **Append-only run log (you fill after each sweep):** [`GOLDEN_SWEEP_REGRESSION_LOG.md`](./GOLDEN_SWEEP_REGRESSION_LOG.md).

---

## Option A — In the app: **Download debug bundle** (best)

1. Open the case → **Defence Plan** (same screen as chat and bulk eval).
2. Click **Download debug bundle** (also **Debug bundle** inside the bulk eval row when that panel is visible).
3. Attach the downloaded `casebrain-debug-bundle-….json` in Cursor or ChatGPT.
4. Optional: one line in chat, e.g. `Q7 feels wrong` or `whole run feels off`.

That single JSON already includes everything below (no passwords; Clerk / Supabase auth keys are **not** dumped).

### What that file contains (checklist)

| Section | What it captures |
|--------|-------------------|
| `browser` | Full URL, path, query string, referrer, language, user agent, screen + viewport size, pixel ratio, online flag, timezone offset, network `effectiveType` when available |
| `build_fingerprint` | `NODE_ENV`, git / Vercel commit env when set, eval analysis version, whether dev case picker env is on, **Supabase hostname only** (not keys) |
| `case` | Case UUID, offence type, UI phase, case nav label, how many cases were in the eval lists |
| `context_sent_to_chat` | Evidence + timeline summaries as used for chat (large text is capped with a truncation flag) |
| `committed_strategy_plan` | Full committed plan JSON (if huge, a preview + overflow note instead) |
| `defence_plan_chat` | Every chat message (role + content; very long messages truncated with a flag) |
| `golden_sweep_canonical_questions` | Exact Q1–Q10 strings the app uses for golden sweep |
| `golden_sweep_regression_meta` | Prompt/analysis/git metadata used for regression notes |
| `interactive_chat_client` | API path for this case, headers, and **body size caps** for normal chat (matches the live UI) |
| `bulk_eval_runner` | Timeout, `x-eval-mode` / `x-fast-eval` headers, sweep mode, progress counters, **every eval row** (answers, errors, HTTP status, duration, route tag, `eval_meta`), summary stats, per-question stats, weak-answer heuristics |
| `sweep_observability` | When eval rows exist: **systemic collapse** warnings, **semantic collapse** per question (fingerprint clusters), **golden route drift** strings — same logic as the `/eval` Sweep review panel (no embeddings) |
| `local_storage` | **casebrain:** keys with values; other keys as names + lengths only; **omit** obvious auth (`sb-*`, Clerk, etc.) |

If you have **not** run a bulk eval, `bulk_eval_runner.rows` is empty — that is fine; chat + plan + browser still help.

---

## Option B — Eval JSON only (golden / bulk already run)

1. Use **Download JSON** in the bulk eval row (same as before), **or** your saved sweep from `/eval`.
2. Attach that file + one short line if something felt wrong.

---

## Option C — No app access? Manual template

1. Copy the block in the older handoff template if you cannot use the button.
2. Fill what you can and attach.

---

## Why this works

- **Debug bundle** = one automated snapshot of what the browser actually had (URL, build, case, plan, chat, eval, storage policy).
- **Eval JSON** = deep row-level results when you already ran questions across cases.
- You do **not** need ten separate pastes for the basics — attach **one** file.

When the schema changes, `schema_version` at the top of the JSON is bumped so helpers know what they are reading.
