# Chat fix plan — single source of truth (unified spec)

**Goal:** Chat uses the same source of truth as Strategy. No legacy fields, no fallbacks, no offence/stance/template drift.

---

## How we're working

- **Planning:** Ged, Copilot, and Cursor are agreeing the plan in this doc (and in chat). Add or change items here until we're happy.
- **Coding:** Once the plan is locked, Cursor will implement it all (helper, migrations, Chat, Strategy, other tools, cleanup).
- **Plan status:** In progress. Use "Open for Copilot / Ged" below for anything you want to add or decide before we lock.

---

## Open for Copilot / Ged

- Anything you want to add, change, or decide before Cursor codes it goes here (or paste into chat and we'll fold it in).
- Current decisions: Option A first (shared helper), 6-step migration order, snapshot schema and forbidden sources as below.

### Defence Plan chat — prompt hardening (reasoning + dataset-aligned behaviour)

**Encoded in** `app/api/criminal/[caseId]/defence-plan-chat/route.ts` (`buildSystemPrompt`):

- **GBH injury threshold:** When offence/facts describe GBH-level harm, the model must not relabel as ABH or dispute severity; focus on intent/recklessness, causation, and defences.
- **Causation:** Single blow + natural fall = one incident; **forbidden** phrasing: “breaks the chain of causation” for that pattern.
- **Disclosure:** Strict mirror of evidence context—served/retained/available must never be called outstanding; no invented gaps.
- **No re-ask:** If snapshot fields are set, do not ask the user to confirm/provide offence/stance/stage/strategy again.
- **Contradictions & messy evidence:** Flag document conflicts; no invented harmonisation; partial CCTV/BWV/timeline limits; thin context → say limits without drifting snapshot; acknowledge strong Crown pattern only when supported by provided text, while staying strategy/stance-aligned.

*(Copilot’s wider dataset checklist—section delimiters, MG11 variation, JSON metadata per case, validators, edge-case packs—belongs in bundle generation / ingestion tooling; the bullet above is what we enforce in Chat today.)*

**Fictional GBH bundle (`docs/fictional-bundle-gbh/`)** — `FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt` now includes JSON metadata, `=== SECTION ===` delimiters, enriched MG5/MG6/custody/MG11s, CCTV continuity + partial 999/CAD + IR summary, and documented document tensions for regression testing. See `docs/fictional-bundle-gbh/README.md`.

### Plan chat — scroll containment (UX)

- **Issue:** Auto-scroll to latest message used `scrollIntoView` on a sentinel inside the chat; browsers scroll **all scrollable ancestors**, so the **whole CaseBrain page** jumped down as well as the chat panel.
- **Fix:** Scroll **only** the chat messages container (`overflow-y-auto`) via `element.scrollTo({ top: scrollHeight })` on that container; optional `overscroll-contain` to reduce scroll chaining.
- **Acceptance:** Typing/sending in Defence Plan chat moves only the inner chat scroller; the case page scroll position stays put unless the user scrolls the page themselves.

### Review & Confirm (replaces multi-phase UI)

- See **`docs/REVIEW_AND_CONFIRM.md`**. Users without `review_confirmed_at` (and not grandfathered) complete one screen before the full case workspace. Snapshot remains authoritative; Defence Plan text is narrative only.

---

## What could make Chat more accurate (additions to consider)

The plan already fixes wrong frame and drift. These would push accuracy further:

1. **Give Chat actual bundle content** — Right now Chat gets SOURCE OF TRUTH + narrative + plan/evidence/timeline *summaries*. It doesn't see the raw MG5, charge sheet, or key facts text. Adding a **bundle excerpt** (e.g. extracted MG5 snippet + charge wording + key facts, length-capped) into the chat context would let the model reason from the real wording and "work round" the documents. Recommend adding to the plan: "Chat context: include a controlled bundle snippet (e.g. from case documents / key facts) so the model can cite and reason from the actual bundle."

2. **Offence-aware law retrieval** — Chat retrieves law chunks by the user's message. If we also pass `offence_detected_code` into retrieval and bias results (e.g. prefer s.20 OAPA / GBH law when offence is s20_oapa), the model gets more relevant law by default. Recommend: "Law retrieval for Chat: optionally bias by offence_detected_code so offence-specific authorities are prioritised."

3. **Detection quality** — Accuracy depends on detection being right. The plan doesn't cover improving detection itself. Recommend adding: "Ongoing: test detection on real bundles; extend offence/stance/stage logic and fix edge cases so the snapshot is trustworthy."

4. **Prompt tuning after the plan** — Once structure is in place, a lot of gains will be prompt-level: clearer rules, examples ("when user asks X, do Y"), stricter wording. So yes: after the plan, making it *more* accurate will partly be "feeding it prompt" (and context). The plan gives the foundation; prompt + richer context + better detection do the rest.

**Summary:** The plan isn't missing anything critical for *alignment* (one source of truth, no drift). For *deeper* accuracy, add: (a) bundle snippet in Chat context, (b) offence-aware law retrieval, (c) a note that detection quality is ongoing work, (d) expect prompt tuning after rollout.

---

## How everything works (end-to-end)

This is the flow once the plan is fully implemented. One source of truth, no double-asking, no drift.

### 1. Case + bundle

- You create a case and upload the bundle (MG5, charge sheet, etc.).
- Optionally you **record position** (client instructions / basis of plea). That helps detection but is **not** required to open Strategy.

### 2. Detection (Phase 1)

- **When:** Runs when you first open the Strategy tab (if nothing is stored yet), or after upload, or when you click “Refresh from bundle.”
- **What it does:** Reads the bundle + charges + interview + disclosure state and infers:
  - **Offence** → `offence_detected_code`, `offence_detected_label` (e.g. s20_oapa, “Section 20 GBH”).
  - **Stance** → `stance_detected` (e.g. “Intent denial + Causation”, “Put to proof”, “Recklessness challenge”).
  - **Stage** → `stage_detected` (e.g. “Disclosure outstanding – not ready for plea”, “Ready for plea”).
- **Where it’s stored:** `criminal_cases` (those four columns). No other place is used as authority for offence/stance/stage.

### 3. Strategy tab

- **Load:** Fetches (1) any **committed strategy** from `case_strategy_commitments`, and (2) **detected** offence/stance/stage (from DB or by running detection once if missing).
- **If there’s a commitment:** That’s what you see; Strategy and plan are built from it.
- **If there’s no commitment:** The UI shows “Detected from bundle: Offence · Stance · Stage” and **pre-fills** the primary strategy from the detected stance (e.g. “Intent denial + Causation” → fight charge). The dropdown is **hidden**; you only see “Change strategy (override)” if you want to change it.
- **You:** Confirm the strategy (or override then confirm). That **commits** one row to `case_strategy_commitments` (primary + optional fallbacks). From then on, that commitment is the authority for “how we’re running this case.”
- **Strategy analysis / Defence Plan:** Use **effective primary** = committed primary if it exists, otherwise the mapped value from `stance_detected`. So routes, artifacts, and the plan all follow the same line.

### 4. Chat

- **Every request:** Builds a **case state snapshot** (via `getCaseStateSnapshot`): offence, stance, stage, committed strategy — from the DB, no cache.
- **Prompt:** The first thing the model sees is **SOURCE OF TRUTH**: OFFENCE, STANCE, STAGE, STRATEGY from that snapshot. Narrative (agreed summary, case theory, Defence Plan text) is passed **after** that and is explicitly “narrative only; if it conflicts, follow SOURCE OF TRUTH.”
- **Rules:** Chat must not infer a different offence (e.g. no s.18 when the case is s.20 unless you ask), not use generic legal templates (Turnbull, Ghosh, etc.) unless the offence/facts require them, and not fall back to “I can only answer from the Defence Plan.” If something is missing, it says it needs the detected offence/stance/stage.
- **Result:** Chat and Strategy always agree on offence, stance, stage, and how the case is being run.

### 5. Other tools (once migrated)

- **Bail, sentencing, mitigation, disclosure helper, timeline, Defence Plan box:** All will read **only** from the same **case state snapshot** (the helper’s return value). No tool will use `analysis_version`, `defence_plan_text`, legacy stance/stage/offence, or narrative fields as authority. So bail, sentencing, mitigation, disclosure, and timeline will never contradict Strategy or Chat.

### 6. Single contract: case state snapshot

- **What it is:** One object, built by `getCaseStateSnapshot(caseId, orgId)`, containing: `case_id`, `offence_detected_code`, `offence_detected_label`, `stance_detected`, `stage_detected`, `strategy_committed_primary`, `strategy_committed_secondary`, `strategy_committed_at`, optional `bundle_uploaded_at` / `disclosure_status`, `timestamp`.
- **Who uses it:** Chat, Strategy (analysis + UI), and—after migration—bail, sentencing, mitigation, disclosure, timeline, Defence Plan box. Nothing else is used for offence/stance/stage/strategy.
- **Guarantee:** No drift, no stale data, no “Chat says X, Strategy says Y,” no fallback to V1 fields.

---

## Current state

- **Strategy tab** correctly uses: `offence_detected_*`, `stance_detected`, `stage_detected`, and committed primary from `case_strategy_commitments`.
- **Chat (defence-plan-chat)** already reads from `criminal_cases`: `offence_detected_label`, `stance_detected`, `stage_detected`, plus `agreed_summary_detailed`, `case_theory_line`. It does **not** read `case_strategy_commitments`. The system prompt still prioritises “agreed case summary” and “Defence Plan” and instructs the model to say “I can only answer from the Defence Plan” when out of scope.

---

## Implementation tasks

### Task 1 — Chat API: add committed strategy

- **Where:** `app/api/criminal/[caseId]/defence-plan-chat/route.ts`
- Fetch committed strategy for this case from `case_strategy_commitments` (latest: `primary_strategy`, optionally `fallback_strategies`, `committed_at`).
- Add an explicit block to the context: e.g. `STRATEGY (committed): primary = fight_charge | charge_reduction | outcome_management`.

### Task 2 — Chat API: include offence_detected_code

- Read `offence_detected_code` from `criminal_cases` and pass it into the prompt so the model can enforce offence-specific rules (e.g. do not advise on s.18 when offence is s.20 unless the user asks).

### Task 3 — Rewrite system prompt: single source of truth + discipline

- **Start** the system/context with an explicit block:
  - OFFENCE: `offence_detected_label` (and `offence_detected_code`).
  - STANCE: `stance_detected`.
  - STAGE: `stage_detected`.
  - STRATEGY: committed primary (from Task 1).
- Add **discipline rules** (see “Guardrails” below).
- **Remove** the instruction that says “if the question is outside the plan and law context, say you can only answer from the Defence Plan and criminal law.” Replace with: if context is missing, say that detected offence/stance/stage (and committed strategy) are needed to answer properly; do not invent offence, stance, or strategy.
- Keep “agreed case summary” and “Defence Plan” as **supporting** context only, **after** the single-source-of-truth block.

### Task 4 — Remove legacy fields from chat context

- Do not pass into the prompt: `analysis_version`, or any legacy “fallback” offence/stance/strategy fields. Keep `agreed_summary_detailed` and `case_theory_line` only as narrative context; authority for offence/stance/stage/strategy is the new pipeline only.

### Task 5 — Missing-context behaviour

- If offence/stance/stage or committed strategy are missing, the prompt must tell the model to say it needs the detected offence, stance, and stage (and committed strategy) to answer properly—not to guess or use generic defence templates.
- No Turnbull/ID guidance unless the case actually raises identification (from offence type, charges, or explicit context).

### Task 6 — Client consistency (optional)

- Ensure `planSummary` / `evidenceSummary` / `timelineSummary` passed to Chat are built from the same strategy and case state the user sees on the Strategy tab.

---

## Additional required fixes (critical)

These five points must be explicitly implemented so Chat does not drift, hallucinate, or use stale data.

### 1. agreed_summary_detailed must never override detected fields

- `agreed_summary_detailed` (and `case_theory_line`) are **narrative only**.
- They must **never** override or contradict `offence_detected_*`, `stance_detected`, `stage_detected`, or committed strategy.
- **If there is a conflict, Chat must ALWAYS follow the detected fields and committed strategy.**

### 2. Remove all Defence Plan fallback behaviour

- Remove the “I can only answer from the Defence Plan” instruction—and **all** behaviour that reverts to Defence Plan text when the model is unsure.
- When context is missing or unclear, Chat must say it needs the **detected offence, stance, and stage** (and committed strategy) to answer properly.
- It must **not** fall back to Defence Plan text as an authority for offence/stance/stage/strategy.

### 3. Chat must never infer a different offence

- Chat must **never** infer or assume a different offence (e.g. s.18) unless the user **explicitly** asks.
- If the user asks something that contradicts or is inconsistent with the detected offence, Chat must **clarify** (e.g. “This case is charged as s.20; are you asking about s.18 specifically?”), not silently switch offence.

### 4. No generic criminal-law templates unless required

- Chat must **not** use generic criminal-law templates (Turnbull, Ghosh, Woollin, Cunningham, etc.) unless the **offence or facts for this case** explicitly require them.
- Examples:
  - No **Turnbull** unless identification is in issue.
  - No **Woollin** unless intent is in issue.
  - No **Ghosh** unless dishonesty is in issue.
- No generic “when in doubt cite X” fallback legal tests.

### 5. Chat must read the latest case snapshot (no stale reads)

- Chat must **always** read the **latest** case snapshot at the **moment the request is made**: `offence_detected_*`, `stance_detected`, `stage_detected`, and committed strategy from the DB.
- **No caching** of these values for Chat.
- **No stale reads.** Chat and Strategy must use the same DB state so they stay aligned.

---

## Guardrails to encode in the prompt

- **Offence discipline:** Reason only from the detected offence; do not assume a different offence (e.g. no s.18 when the case is s.20) unless the user asks. If the user asks something inconsistent with the detected offence, clarify; do not switch.
- **Stance discipline:** Reason from `stance_detected`; do not drift into a different stance (e.g. mitigation/guilty plea when stance is intent denial) unless the user asks.
- **Stage discipline:** Reason from `stage_detected` (e.g. if “disclosure outstanding”, do not advise on plea/trial as if disclosure is complete).
- **Strategy discipline:** Align with the committed strategy; do not contradict how the case is being run.
- **Narrative vs authority:** `agreed_summary_detailed` and Defence Plan text are supporting narrative only. On conflict with detected offence/stance/stage or committed strategy, follow the detected/committed values.
- **No generic templates:** Do not cite Turnbull, Ghosh, Woollin, Cunningham, etc. unless the offence or facts for this case require them.
- **No fallback:** If a field is missing, say you need the detected offence/stance/stage (and committed strategy) to answer; do not guess or use generic templates.

---

## Verification (test cases)

- **s.20 case:** Chat does not mention s.18 unless the user asks.
- **ID not in issue:** Chat does not mention Turnbull.
- **Disclosure outstanding:** Chat does not advise on plea/trial as if disclosure is complete.
- **Intent-denial stance:** Chat does not drift into mitigation/guilty plea.
- **Strategy alignment:** Chat’s “how we’re running this” matches the Strategy tab.
- **Out of scope:** Model says it needs detected offence/stance/stage (and strategy) to answer, instead of “I can only answer from the Defence Plan.”
- **Conflict:** If agreed summary said “s.18” but detected offence is s.20, Chat follows s.20 and does not advise on s.18 unless the user asks.

---

## TL;DR

- **Strategy is correct.** Chat must use the same source of truth: detected offence/stance/stage + committed strategy.
- **Implement:** Add committed strategy to Chat context; add `offence_detected_code`; rewrite system prompt with single source of truth and all guardrails above; remove Defence Plan fallback and legacy fields; ensure no caching/stale reads.
- **Critical additions:** (1) agreed_summary never overrides detected fields; (2) no Defence Plan fallback behaviour; (3) never infer a different offence—clarify if user asks something inconsistent; (4) no generic legal templates unless the case requires them; (5) always read latest DB snapshot for Chat.

---

## Unified case state snapshot (architectural requirement)

**Problem:** Different parts of the system still read from different DB fields (Strategy from detected + commitments, Chat from detected + commitments, but bail/sentencing/mitigation/disclosure helpers may still use legacy fields). That leads to drift, stale stance/offence/stage, tools disagreeing with Strategy, and Chat disagreeing with tools.

**Fix:** Introduce a **single, unified case state object** that **all** reasoning tools must use. No tool may use offence/stance/stage/strategy from anywhere else.

### Schema: `case_state_snapshot`

The object must contain **only** these fields (populated from current DB at request time; no caching):

| Field | Source | Notes |
|-------|--------|--------|
| `case_id` | route param | |
| `offence_detected_code` | `criminal_cases` | e.g. s20_oapa, s18_oapa |
| `offence_detected_label` | `criminal_cases` | e.g. Section 20 GBH |
| `stance_detected` | `criminal_cases` | e.g. Intent denial + Causation, Put to proof |
| `stage_detected` | `criminal_cases` | e.g. Disclosure outstanding – not ready for plea |
| `strategy_committed_primary` | `case_strategy_commitments` (latest) | fight_charge \| charge_reduction \| outcome_management |
| `strategy_committed_secondary` | `case_strategy_commitments` (latest) | optional array |
| `strategy_committed_at` | `case_strategy_commitments` (latest) | optional timestamp |
| `bundle_uploaded_at` | cases / documents | optional; for “has bundle” |
| `disclosure_status` | from Safety / disclosure state | optional; e.g. complete, outstanding |
| `timestamp` | when snapshot was built | so consumers know freshness |

All other fields (narrative, plan text, etc.) are **not** part of this object. Narrative (e.g. agreed summary, case theory) may be passed separately as “narrative only” and must never override the snapshot.

### Who must read ONLY from this object

- Chat (defence-plan-chat)
- Strategy (strategy-analysis, Strategy UI)
- Bail tool
- Sentencing tool
- Mitigation tool
- Disclosure helper
- Timeline builder
- Defence Plan box (for “how we’re running it”)
- Any future modules that reason about offence, stance, stage, or strategy

### Forbidden sources for offence / stance / stage / strategy

No tool may use these as authority for offence, stance, stage, or strategy:

- `analysis_version`
- `agreed_case_narrative`
- `defence_plan_text`
- `legacy_stance`
- `legacy_stage`
- `legacy_offence`
- `fallback_strategy`
- `case_theory_line` (narrative only; not authority)
- `agreed_summary_detailed` (narrative only; not authority)

### Implementation approach

- **Option A — Shared builder:** Add a server-side helper (e.g. `getCaseStateSnapshot(caseId, orgId)`) that reads from `criminal_cases` + `case_strategy_commitments` (and optionally disclosure/Safety) and returns the snapshot object. Every route that needs offence/stance/stage/strategy calls this helper and uses only its result.
- **Option B — Dedicated API:** Add `GET /api/criminal/[caseId]/case-state` that returns the snapshot. Front-end and other APIs call it when they need canonical state. Still no long-lived caching; caller gets fresh snapshot per request or per load.

### Guarantees once adopted

- No drift: all tools see the same offence, stance, stage, strategy.
- No hallucinations from stale or conflicting fields.
- No “Chat says X, Strategy says Y”.
- No “tool says s.18 when case is s.20”.
- No fallback to V1 fields; single pipeline for all reasoning.

---

## Implementation order (decided)

We do **Option A first** (shared server helper), then expose **Option B** (GET route) when we want a clear API for the front-end or future modules.

**Step 1** — Add `getCaseStateSnapshot(caseId, orgId)` in `lib/criminal/case-state-snapshot.ts`. No behaviour change elsewhere yet.

**Step 2** — Migrate Strategy (strategy-analysis + Strategy UI) to use the snapshot as the only source for offence/stance/stage/strategy.

**Step 3** — Migrate Chat (defence-plan-chat) to call the helper and build SOURCE OF TRUTH from its return value only.

**Step 4** — Migrate bail, sentencing, mitigation, disclosure helper to use the snapshot.

**Step 5** — Migrate timeline builder and Defence Plan box to use the snapshot for "how we're running it".

**Step 6** — (Later) Remove or deprecate legacy fields once all consumers are on the snapshot; add `GET /api/criminal/[caseId]/case-state` that returns the snapshot for the front-end.

**Step 7** — Chat: add **bundle excerpt** to context (MG5/key facts/charge text, length-capped) so the model can reason from actual document wording.

**Step 8** — Chat: **offence-aware law retrieval** — pass `offence_detected_code` into retrieval so offence-relevant law is prioritised.

**Step 9** — Ongoing: detection quality (test on real bundles, extend offence/stance logic); prompt tuning after rollout.

---

## Summary you can send to Copilot

- **Plan mode:** Ged, Copilot, and Cursor are finalising the plan together in this doc. Once we lock it, Cursor will implement everything.
- **In the plan:** Chat and Strategy single source of truth (detected offence/stance/stage + committed strategy); Chat guardrails (5 critical points, forbidden sources, no Defence Plan fallback); **unified case state snapshot** as first-class contract (schema, who must use it, forbidden sources, Option A then B, guarantees).
- **Decided:** Option A first (shared helper `getCaseStateSnapshot`), then Option B (GET case-state) if needed. Migration order: (1) add helper, (2) Strategy, (3) Chat, (4) bail/sentencing/mitigation/disclosure, (5) timeline + Defence Plan box, (6) later remove legacy fields.
- **After we lock the plan:** Cursor will code the helper, migrate all listed modules to the snapshot, then optional cleanup of legacy fields.
