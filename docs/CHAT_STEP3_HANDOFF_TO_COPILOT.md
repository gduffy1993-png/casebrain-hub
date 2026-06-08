# Chat Step 3 — Handoff to Copilot

Use this when Copilot is "acting up" or when you need to align Cursor and Copilot. It contains: (1) what Cursor said, (2) the three deliverables Copilot wrote, and (3) current implementation status.

---

## 1) What to send Copilot (what Cursor said)

Copy this so Copilot has the same context:

**Cursor’s summary:**

> Summary: **The plan is finished.** All implementation steps are done. Here’s the mapping:
>
> | Plan step | Status |
> |-----------|--------|
> | **1** — `getCaseStateSnapshot(caseId, orgId)` | ✅ `lib/criminal/case-state-snapshot.ts` |
> | **2** — Strategy (strategy-analysis + UI) | ✅ Uses snapshot; UI uses commitment + phase1-detect |
> | **3** — Chat (defence-plan-chat) | ✅ SOURCE OF TRUTH from snapshot, narrative separate, guardrails |
> | **4** — Bail, sentencing, mitigation, disclosure | ✅ Bail application uses snapshot for offence. Sentencing-mitigation uses snapshot. Disclosure-pressure only uses `declared_dependencies`. |
> | **5** — Timeline + Defence Plan box | ✅ No direct legacy usage; they use snapshot-backed APIs |
> | **6** — GET case-state + legacy cleanup | ✅ `GET /api/criminal/[caseId]/case-state` exists. Legacy column removal left for later. |
> | **7** — Chat bundle excerpt | ✅ In defence-plan-chat context |
> | **8** — Chat offence-aware law retrieval | ✅ Law query includes `offence_detected_label` |
> | **9** — Ongoing (detection quality, prompts) | Not “code to do now” |
>
> Remaining (optional, later): Legacy cleanup; Step 9 (detection + prompt tuning). So no further required code for the plan.

**Why send this:** So Copilot knows what Cursor claimed and can compare it to the three deliverables and the checklist.

---

## 2) Deliverable 1 — The complete system prompt (drop-in style)

This is the final, unified, guardrail-enforced system prompt for defence-plan-chat. The **route now builds this dynamically** and injects snapshot values where the template has placeholders.

**Template (placeholders filled server-side from `getCaseStateSnapshot()`):**

- `{{offence_detected_label}}` → snapshot.offence_detected_label
- `{{offence_detected_code}}` → snapshot.offence_detected_code
- `{{stance_detected}}` → snapshot.stance_detected
- `{{stage_detected}}` → snapshot.stage_detected
- `{{strategy_committed_primary}}` → snapshot.strategy_committed_primary
- `{{strategy_committed_secondary}}` → snapshot.strategy_committed_secondary (joined)
- `{{timestamp}}` → snapshot.timestamp

**Prompt text (what the model sees, with values filled):**

```
You are CaseBrain, the defence-side reasoning engine. You must reason ONLY from the authoritative case state snapshot and committed strategy. Narrative is supporting context only.

========================
SINGLE SOURCE OF TRUTH
========================
Use ONLY the following fields as authoritative for offence, stance, stage, and strategy:

- OFFENCE: {{offence_detected_label}} ({{offence_detected_code}})
- STANCE: {{stance_detected}}
- STAGE: {{stage_detected}}
- STRATEGY (committed): {{strategy_committed_primary}}
- SECONDARY STRATEGIES: {{strategy_committed_secondary}}
- SNAPSHOT TIMESTAMP: {{timestamp}}

These values come from the unified case state snapshot. They override ALL narrative, summaries, Defence Plan text, or user-provided descriptions unless the user explicitly asks to discuss a different offence/stance/stage.

========================
NARRATIVE (SUPPORTING ONLY)
========================
You may use the narrative (agreed summary, case theory, Defence Plan text, bundle excerpt) ONLY to understand factual background. Narrative NEVER overrides the snapshot.

========================
GUARDRAILS (MANDATORY)
========================

1. OFFENCE DISCIPLINE — Reason ONLY from the detected offence. Do NOT switch to a different offence (e.g. s.18) unless the user explicitly asks. If inconsistent, CLARIFY first.
2. STANCE DISCIPLINE — Reason from the detected stance. Do NOT drift into mitigation or guilty plea unless the user explicitly asks.
3. STAGE DISCIPLINE — Reason from the detected stage. If disclosure is outstanding, do NOT advise as if disclosure is complete.
4. STRATEGY DISCIPLINE — Align with the committed primary strategy. Do NOT contradict how the case is being run.
5. NARRATIVE VS AUTHORITY — Narrative is NOT authoritative. If conflict, ALWAYS follow the snapshot.
6. NO GENERIC LEGAL TEMPLATES — Do NOT cite Turnbull, Ghosh, Woollin, Cunningham, etc. unless the offence or facts in THIS case require them.
7. NO FALLBACK TO DEFENCE PLAN — Do NOT say "I can only answer from the Defence Plan." If required fields are missing, say: "I need the detected offence, stance, stage, and committed strategy to answer properly."
8. MISSING CONTEXT — If offence/stance/stage/strategy are missing, do NOT guess. Ask for the missing fields.

========================
BUNDLE EXCERPT (FACTUAL DETAIL)
========================
Use the bundle excerpt ONLY for factual detail. It does NOT override the snapshot.

========================
HOW TO ANSWER
========================
- Be precise, offence-aware, stance-aware, stage-aware, and strategy-aligned.
- Use the snapshot as the anchor for all reasoning.
- If the user asks something inconsistent with the snapshot, clarify before answering.
- Never invent offence, stance, stage, or strategy.
```

**Implementation:** `defence-plan-chat/route.ts` uses `buildSystemPrompt(snapshot)` so the **system** message contains the actual OFFENCE/STANCE/STAGE/STRATEGY values (not only in the user context block).

---

## 3) Deliverable 2 — The diff (what Cursor did)

- **A. Snapshot block in system prompt** — Done. System prompt is built with `buildSystemPrompt(snapshot)` and includes OFFENCE, STANCE, STAGE, STRATEGY, SECONDARY, TIMESTAMP.
- **B. Narrative as supporting only** — Done. `agreed_summary_detailed` and `case_theory_line` are fetched separately and labeled “narrative only; if conflict, follow SOURCE OF TRUTH”. Not passed as authority.
- **C. Legacy fields** — Not passed as authority. We do not pass `defence_plan_text`, `analysis_version`, `legacy_offence`, `legacy_stance`, `legacy_stage`, or `fallback_strategy` from the DB. Client can still send `planSummary`/`evidenceSummary`/`timelineSummary`; they are labeled as supporting context.
- **D. Replace system prompt** — Done. Replaced with the full guardrails prompt and snapshot values in the system message.
- **E. Missing-context behaviour** — In prompt: “If offence/stance/stage/strategy are missing, do NOT guess. Ask for the missing fields.” Optional strict mode: return 400 before calling the model when required snapshot fields are missing (not implemented; Chat can still reply with “I need the detected offence…”).
- **F. Remove Defence Plan fallback** — Done. Explicit guardrail: “Do NOT say ‘I can only answer from the Defence Plan.’”
- **G. Law retrieval** — Done. `lawQuery = message + " " + snapshot.offence_detected_label` when present.
- **H. Bundle excerpt** — Done. Appended after snapshot/context; labeled “use for factual detail; do not contradict SOURCE OF TRUTH”.
- **Order in user content:** Change list → SOURCE OF TRUTH block → Narrative → Bundle excerpt → Defence Plan → Evidence → Timeline → Law → User message.

---

## 4) Deliverable 3 — Verification checklist (for you + Cursor)

Use this to confirm Chat is fully migrated to V2.

**A. Snapshot discipline**  
- [ ] Chat always starts from OFFENCE / STANCE / STAGE / STRATEGY (in system prompt).  
- [ ] Chat never contradicts these fields.  
- [ ] Chat never invents new values.

**B. Narrative discipline**  
- [ ] Narrative is used only for factual detail.  
- [ ] Narrative never overrides snapshot.  
- [ ] Conflicts resolved in favour of snapshot.

**C. Offence discipline**  
- [ ] s.20 case → Chat never mentions s.18 unless user explicitly asks.  
- [ ] If user asks about s.18 → Chat clarifies first.

**D. Stance discipline**  
- [ ] Intent-denial stance → Chat never drifts into mitigation.  
- [ ] Put-to-proof stance → Chat never assumes guilty plea.

**E. Stage discipline**  
- [ ] Disclosure outstanding → Chat does NOT advise as if disclosure is complete.

**F. Strategy discipline**  
- [ ] Chat’s “how we’re running it” matches Strategy tab.  
- [ ] Chat never contradicts committed primary strategy.

**G. No generic templates**  
- [ ] No Turnbull unless ID in issue.  
- [ ] No Ghosh unless dishonesty in issue.  
- [ ] No Woollin unless intent in issue.  
- [ ] No Cunningham unless recklessness in issue.

**H. Missing-context behaviour**  
- [ ] If snapshot fields missing → Chat says: “I need the detected offence, stance, stage, and committed strategy to answer properly.”  
- [ ] Not: “I can only answer from the Defence Plan” or generic templates or guessing.

**I. No stale reads**  
- [ ] Snapshot is fetched fresh per request. No caching.

**J. Bundle excerpt**  
- [ ] Used only for factual detail. Never treated as authority for offence/stance/stage/strategy.

---

## 5) Current status (after Cursor’s last pass)

- **System prompt:** Replaced with Copilot’s full prompt; snapshot values are injected into the **system** message via `buildSystemPrompt(snapshot)`.
- **No Defence Plan fallback:** Explicit guardrail added: “Do NOT say ‘I can only answer from the Defence Plan.’”
- **SOURCE OF TRUTH:** Still also included in the user message (context block) so the model sees it in both system and user content.
- **Strict missing-context return:** Not implemented. Chat still responds with “I need the detected offence…” instead of returning 400. Can be added later if you want to block requests when snapshot is empty.

You can send Copilot: (1) the “What Cursor said” block above, and (2) this doc (or the three deliverables sections) so they have the full picture and the checklist.
