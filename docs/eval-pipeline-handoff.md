# Eval / defence-plan-chat — handoff (May 2026)

## Done (in repo)

- **Full-chat grounding:** If three-line format strips anchors but **full capped** reply still passes the gate, keep capped full; then `passesEvalGroundingGate` (literal + bundle overlap heuristics) for lightweight + full chat finalization.
- **`eval_meta` (v1)** on JSON responses: `route_trace`, `grounding_metrics`, `answer_fingerprint`, `reply_finalization`, `fallback_reason` where applicable.
- **Supabase:** `eval_sweep_rows.row_meta` migration; POST/GET eval-sweeps persist and return it.
- **UI:** GoldenEvalRunner + DefencePlanBox capture `eval_meta` → `row_meta`; EvalSweepReviewPanel observability + semantic-collapse banner; `weak` uses route for exhibit lists.
- **Strict routes:** MG6 parses `MG6` / `MG6A`; bundle anchor line on MG6 + interview; interview reads `INTERVIEW` + `IR*_SUMMARY` sections.
- **Weak:** `isEvalWeakAnswer(..., { route_tag })` — `strict_exhibit` and Northshire-style exhibit lists not flagged weak.
- **Case order:** `lib/eval-case-sort.ts` — Golden runner, DefencePlanBox sweep, `scripts/run-eval.mts`.
- **Question rules:** Extra mandatory bundle tie-ins for interpretive / weakness / next-24h prompts.
- **Diagnostics (server):** If `CASEBRAIN_INTERPRETIVE_FALLBACK_LOG=1`, before returning `full_chat_ungrounded_fallback`, logs one JSON line to stderr: prefix **`[casebrain:interpretive-fullchat-fallback]`** — first LLM completion, post-pipeline raw, after cap, three-line, chosen reply, gate snapshots per stage, `bundle_chars`, `bundle_excerpt_chars`, `docs_with_text_count`, heuristic `failure_phase`.

## Observed on recent runs

- **Q1, Q2, Q4, Q5:** Expected strict routes; Q5 weak cleared; MG6/interview show per-case **Bundle anchor** (NS-CPS + EX-…).
- **Q3 & Q6–Q10:** Still often **`full_chat_ungrounded_fallback`** + same MG5 slab; `eval_meta` on saved rows describes the **forced** answer (not the discarded model text).

## Next (when you continue)

1. **Enable logging on the server that serves the app** (e.g. Vercel): set **`CASEBRAIN_INTERPRETIVE_FALLBACK_LOG=1`**, redeploy, reproduce **one** interpretive question (e.g. missing evidence on Current case).
2. Open **Vercel → Deployment → Logs** (or `vercel logs`) and copy the line starting with **`[casebrain:interpretive-fullchat-fallback]`**.
3. That line answers: model was case-specific vs generic, whether post-processing / three-line killed the gate, vs gate rejecting reasonable text. Downloaded sweep JSON alone does **not** include pre-fallback model output.

## Manual sweep JSON note

- Single-question manual exports use **`questionNo: 1`** for the first (only) question — normal if the question text is golden Q3 wording.
