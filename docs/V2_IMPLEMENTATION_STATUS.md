# CaseBrain V2 — Implementation Status

What's done from the master plan, what's left, and what you need to run (migrations, etc.).

---

## 1. Completed (from the plan)

### Phase A — Foundation

| Step | Plan item | Done | Where |
|------|-----------|------|------|
| **A1** | Extraction / Key Facts split — narrative in Summary only; discrete facts in Key Facts with **source** and **confidence** | ✅ | `lib/types/casebrain.ts` (StructuredKeyFact, KeyFactCategory, KeyFactsV2Hierarchy), `lib/criminal/key-facts-v2.ts` (buildCriminalStructuredKeyFacts), `lib/key-facts.ts` (criminal branch builds structuredKeyFacts) |
| **A2** | Key Facts hierarchy — People, Places, Times, Evidence, Disclosure, etc. | ✅ | Same types + builder; facts grouped by category; Key Facts panel shows "Structured key facts (V2)" for criminal |
| **A3** | Solicitor buckets in Summary — seven buckets, Missing disclosure from Safety | ✅ | `key-facts-v2.ts` (buildCriminalSolicitorBuckets), `CaseSummaryPanel` → SolicitorBucketsSection |

### Phase B — Safety + Strategy wiring

| Step | Plan item | Done | Where |
|------|-----------|------|------|
| **B1** | Key Facts → Safety — e.g. CCTV/forensics mentioned → flag missing items | ✅ | `lib/criminal/disclosure-state.ts` (bundleMentionedTopics, deriveBundleMentionedTopics), ProceduralSafetyPanel passes topics into computeDisclosureState |
| **B2** | Key Facts → Strategy — seed defence angles from facts | ✅ | `key-facts-v2.ts` (deriveStrategySeedsFromKeyFacts), buildDefenceStrategyPlan accepts keyFactsSeeds |
| **B3** | Agreed case summary (short/detailed/full) + case theory line; store and edit | ✅ | Migration `20260217000000_agreed_case_summary.sql`, `app/api/criminal/[caseId]/agreed-summary/route.ts`, CaseSummaryPanel AgreedSummaryBlock |
| **B4** | Chat as case builder — propose summary/theory; Agree / Edit / Reject | ✅ | `propose-summary/route.ts`, DefencePlanBox proposal card + Agree/Edit/Reject |
| **B5** | Summary + case theory → Strategy | ✅ | buildDefenceStrategyPlan accepts agreedCaseTheoryLine; StrategyCommitmentPanel fetches agreed-summary and passes it in |
| **B6** | Chat grounding — agreed summary, case theory, plan, Safety, timeline, evidence, law | ✅ | `defence-plan-chat/route.ts` reads agreed_summary_detailed + case_theory_line from DB and prepends to context |

### Phase D — Pressure, prep, timeline, UX, audit

| Step | Plan item | Done | Where |
|------|-----------|------|------|
| **D1** | Disclosure Pressure Dashboard — missing items, why, pressure steps | ✅ | `lib/criminal/disclosure-pressure.ts`, `app/api/criminal/[caseId]/disclosure-pressure/route.ts`, `DisclosurePressureDashboard.tsx`, Disclosure tab |
| **D2** | Hearing Prep Mode — say/ask/challenge/request, disclosure to push, risks, fallbacks | ✅ | `CriminalHearingPrepStructured` type, hearing-prep API returns structured JSON, HearingPrepGenerator shows 7 sections + outstandingDisclosure |
| **D3** | Strategy Timeline — now / waiting / next / if things change | ✅ | `StrategyTimelineSection.tsx`, Strategy tab (after "Strategy at a glance") |
| **D4** | Chat UX modernisation — auto-scroll, bubbles, typing indicator, sticky input, collapsible plan, /disclosure, /timeline, /plan | ✅ | DefencePlanBox: ref scroll, bubbles, "Thinking…", pinned context bar, Plan details collapsible, command prompts |
| **D5** | Verdict loop + audit trail — rate summary/chat/strategy; record what was agreed when | ✅ | Migration `20260209000001_criminal_verdict_audit.sql`, verdict-ratings API, VerdictRatingBlock, agreed-summary API returns/updates timestamps, "Last agreed" in AgreedSummaryBlock |

### Phase C — Police station spine

| Step | Plan item | Done | Where |
|------|-----------|------|------|
| **C1–C4** | Police station as first phase, link when charged, dashboard one spine, chat + station | ❌ | Not implemented; planned after court-case core |

---

## 2. Migrations you need

All of these live under `supabase/migrations/`. Run them with your usual process (e.g. `supabase db push` or your CI).

### Already in repo (order by filename)

1. **`20260209000001_criminal_verdict_audit.sql`** (D5 — **add this if you haven't run it yet**)
   - Adds to `criminal_cases`: `agreed_summary_updated_at`, `case_theory_updated_at`.
   - Creates `criminal_verdict_ratings` (case_id, org_id, target, rating, note, created_at) and index.
   - **Required for:** Verdict ratings API, "Last agreed" audit in Summary, rating UI (summary/chat/strategy).

2. **`20260217000000_agreed_case_summary.sql`** (B3)
   - Adds to `criminal_cases`: `agreed_summary_short`, `agreed_summary_detailed`, `agreed_summary_full`, `case_theory_line`.
   - **Required for:** Agreed summary + case theory storage and API. (You mentioned this one is already applied.)

### Summary: what to run

- If you've **only** applied `20260217000000_agreed_case_summary.sql` so far, you still need to apply:
  - **`20260209000001_criminal_verdict_audit.sql`**
- After that, no further migrations are required for the completed V2 items above.

---

## 3. Not done (from the plan)

- **Phase C (C1–C4)** — Police station spine: station as first phase, link when charged, dashboard one spine, chat + station grounding. Planned next; no code or migrations yet.
- **Rollout/clean-up** — When going full V2: retire or redirect old summary blob, old Key Facts dump, old disclosure lists (product decision).

---

## 4. Quick reference: main code areas

| Area | Paths |
|------|--------|
| Key Facts V2 (structure, buckets, seeds, topics) | `lib/criminal/key-facts-v2.ts`, `lib/key-facts.ts` |
| Safety (disclosure state, bundle topics) | `lib/criminal/disclosure-state.ts` |
| Disclosure pressure (why + pressure steps) | `lib/criminal/disclosure-pressure.ts`, `app/api/criminal/[caseId]/disclosure-pressure/route.ts`, `DisclosurePressureDashboard.tsx` |
| Strategy (plan, case theory, key-facts seeds) | `lib/criminal/strategy-output/defence-strategy.ts`, StrategyCommitmentPanel |
| Agreed summary + case theory (API, audit) | `app/api/criminal/[caseId]/agreed-summary/route.ts`, CaseSummaryPanel AgreedSummaryBlock |
| Chat (grounding, UX) | `app/api/criminal/[caseId]/defence-plan-chat/route.ts`, DefencePlanBox |
| Hearing prep (structured) | `app/api/criminal/[caseId]/hearing-prep/route.ts`, HearingPrepGenerator, `CriminalHearingPrepStructured` in `lib/types/casebrain.ts` |
| Strategy timeline | `StrategyTimelineSection.tsx`, CriminalCaseView Strategy tab |
| Verdict + audit | `20260209000001_criminal_verdict_audit.sql`, `app/api/criminal/[caseId]/verdict-ratings/route.ts`, VerdictRatingBlock, agreed-summary GET/PATCH timestamps |
| Change list (D5 follow-on) | `lib/criminal/verdict-change-list.ts`, ChangeListSection.tsx, defence-plan-chat + propose-summary use getChangeListForContext |
| Chat as case builder (B4) | `app/api/criminal/[caseId]/propose-summary/route.ts`, DefencePlanBox proposal card + Agree/Edit/Reject |

---

## 5. Env / config

- No new env vars were added for the completed work.
- Existing setup (OpenAI for chat/hearing prep, Supabase for DB, auth) is unchanged.
- Verdict ratings and audit timestamps use the same Supabase and auth as the rest of the app.

---

*Last updated to match the master plan and current codebase.*
