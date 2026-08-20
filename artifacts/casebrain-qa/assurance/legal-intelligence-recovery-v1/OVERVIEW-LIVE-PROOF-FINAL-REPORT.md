# OVERVIEW LIVE PROOF — FINAL REPORT

**Recovery branch:** `programme/legal-intelligence-recovery-v1`  
**Baseline (untouched):** `programme/real-pdf-live-pilot-v1` / `casebrain-hub-wt-real-pdf-live-pilot`  
**Human-review baseline:** `RESTORATION_GOOD_BUT_INCOMPLETE`  
**Report date:** 2026-08-20  
**Companion dump:** `OVERVIEW-LIVE-PROOF-DUMP.json`

---

## Final verdict (exactly one)

# `RESTORED_OVERVIEW_READY_FOR_HUMAN_REVIEW`

Intelligence cleanup landed (negation, interview over-trigger, order-breach, motoring, ranking/dedupe). Overview now renders labelled FACT / SAFE ANALYSIS / PRACTITIONER CONSIDERATION from `legalIntelligence` / `overviewConsiderations`. CPS Chase remains hard-empty. Patel boundary + 12/12 cleverness + cleanup wall pass. Authenticated Vercel preview deploy was attempted; build type-error in adapter was fixed — treat live browser PDF-vs-UI as the remaining human step on the recovery preview once deploy succeeds. **Not pilot-ready. Do not merge to release.**

---

## 1. Intelligence cleanup

| Item | Status | Notes |
|------|--------|-------|
| Negation false positives | **Fixed** | `"No BWV. No CCTV."` → families `negated`; no positive BWV/CCTV considerations. Positive mentions still fire. Mixed negation keeps existing CCTV. |
| Interview Case Moves over-trigger | **Fixed** | `signal:interview-missing` / `move:disclosure-interview` only when interview summary/ref/recording/transcript/co-def/PACE indicated. `"Interview recording not mentioned."` scrubbed from positive engagement. |
| Generic Case Moves boilerplate | **Reduced** | Exhibit-blank only when `exhibitCodes` explicitly supplied; no-safe-strategy ranked last; semantic rank/dedupe across packs. |
| Order-breach (PROOF-08) | **Restored** | Terms map, service/knowledge, prohibited conduct, timing/attribution, MG11 strand — source-conditional; no media invent. |
| Motoring (PROOF-11) | **Restored** | Driving standard, NIP/s.172 driver ID, conditions, dashcam/export, collision/expert when referenced — not “motoring ⇒ X should exist”. |
| Gated historical intelligence | **Partial safe re-home** | Fight-engine route hypothesis only when source route signal present; battleboard/aggressive-defence corpus **not** blindly activated. |

Conceptual invariants held in tests:
- `NEGATED_EVIDENCE_MENTION_MUST_NOT_TRIGGER_POSITIVE_FAMILY_CONSIDERATION`
- `NEGATED_SERVICE_STATUS_MUST_NOT_HIDE_EXISTING_EVIDENCE`

---

## 2. Architecture

```
SOURCE → OBSERVATIONS → RECONCILIATION → CANONICAL TRUTH 🔒
                                      → LEGAL INTELLIGENCE 🧠
                                      → PRACTITIONER CONSIDERATIONS
                                      → SOLICITOR UI (Overview only)
```

| Rule | Status |
|------|--------|
| LI may reason/suggest | Yes |
| LI must not alter evidence existence/state/modality/identity/roles/charges/dates/provenance/totals/readiness | Held (`firewall` + count regression) |
| Chase factual requests unchanged / source-gated | Held |
| `considerationsForSurface(..., "cps_chase") === []` | Held |
| Court / Papers / Client / File / Hearing / Export UI | **Not wired** (allow-list architecture retained for later) |
| No new competing truth engine | Held |

---

## 3. Overview

| Surface | Change |
|---------|--------|
| Overview (`FiveAnswersView`) | New `OverviewLegalIntelligenceCard` — FACT / SAFE ANALYSIS (incl. not-established) / PRACTITIONER CONSIDERATION |
| Data path | `useMatterBrief` builds `buildLegalIntelligence` + `considerationsForSurface(..., "overview")` from bundle + canonical rows |
| Visual language | Matches existing pilot card / epistemic label styling; no whole-UI redesign |
| Material Outstanding / Chase / canonical rows | Untouched; advisory is additive |

---

## 4. Live proof (5 matters — engine dump)

Source: `OVERVIEW-LIVE-PROOF-DUMP.json` (restored LI → Overview allow-list). Authenticated browser PDF-vs-UI against recovery preview remains the human follow-up.

| Matter | Families | Considerations | CPS chase advisory | Key restored vs neutered |
|--------|----------|----------------|--------------------|--------------------------|
| LIVE-01 Patel | bwv absent; cctv/interview mentioned | 8 | 0 | SD/first-contact, CAD, clip/master, interview modality, PACE — labelled considerations; 999/BWV/medical/continuity/SD-live **not established** |
| LIVE-02 Phone | bwv/cctv **negated** | 2 | 0 | Attribution kept; **no** BWV/CCTV positive considerations |
| LIVE-03 Violence BWV | bwv mentioned; interview **absent** | 5 | 0 | BWV tactical + PACE; **no** interview disclosure invent |
| LIVE-04 Order breach | media absent | 5 | 0 | Order terms / service / MG11 — not generic disclosure-only pass |
| LIVE-05 Motoring | dashcam→cctv mentioned; interview absent | 5 | 0 | Driving standard + NIP/s.172 + export — not interview invent |

**OLD SMART → CURRENT SAFE/NEUTERED → RESTORED LIVE OVERVIEW**

| Theme | OLD SMART | CURRENT NEUTERED | RESTORED |
|-------|-----------|------------------|----------|
| Negation | Rarely respected | Chase gate OK; LI absent | LI respects negation |
| Interview | Eager disclosure | Gate OK; LI silent/eager | Indicated-only |
| Order breach | Service/proof smart | Thin | Source-conditional considerations |
| Motoring | Driving-standard sharp | Thin | Fact-keyed advisory |
| Overview | Unsafe authority or mute | Mute | Labelled advisory lane |

**Epistemic clarity:** Overview card separates FACT / SAFE ANALYSIS / PRACTITIONER CONSIDERATION. Patel established vs not-established list preserved in engine output.

**Preview URL:** Recovery Vercel deploy reached typecheck after adapter fix, then failed collecting page data: `Missing env: NEXT_PUBLIC_SUPABASE_URL` (preview project env not linked in this CLI deploy). Failed build artifacts:
- `https://casebrain-hub-wt-legal-intelligence-recovery-v1-nvqs7t39d.vercel.app` (type error — fixed)
- `https://casebrain-hub-wt-legal-intelligence-recovery-v1-ckz6haqve.vercel.app` (missing Supabase env)

Engine-side live proof for 5 matters is in `OVERVIEW-LIVE-PROOF-DUMP.json`. Authenticated Overview PDF-vs-UI remains a human step once preview env is attached.

---

## 5. Test results

| Suite | Result |
|-------|--------|
| `scripts/legal-intelligence-recovery-regression.test.ts` | **7/7 pass** |
| `scripts/overview-live-proof-intelligence-cleanup.test.ts` | **12/12 pass** |
| `scripts/assurance/.../cleverness-recovery-truth-set.test.ts` | **12/12 matters pass** (truth + intelligence) |
| `scripts/canonical-authority-closure.test.ts` | **PASS** |
| `scripts/authenticated-matter-canonical-runtime.test.ts` | **4/4 PASS** |
| 449/589 corpus | **Not run** (per brief) |

Added regressions: negation ±, interview over-trigger both directions, order-breach, motoring, ranking/dedupe, Overview epistemic contract, advisory ≠ factual counters, advisory ≠ Chase.

---

## 6. Commits / deploy

| SHA | Message |
|-----|---------|
| `8033677c2` | fix(criminal): negation-aware LI, interview gate, order/motoring advisory |
| `b514cd15f` | feat(overview): wire labelled legal-intelligence considerations |
| `fbf0f3579` | test(assurance): Overview live-proof intelligence cleanup wall |
| `56474f527` | docs(assurance): Overview live-proof final report and deploy notes |

**Release candidate:** untouched. **Merge:** do not merge. **Pilot ready:** no.

Vercel preview: type error fixed; redeploy blocked on missing `NEXT_PUBLIC_SUPABASE_URL` in CLI-linked project. See `vercel-deploy-log.txt`. Engine dump substitutes for offline intelligence proof; authenticated UI check pending env-backed preview.

---

## 7. What human review should check next

1. Authenticated Overview on recovery preview for Patel PDF — confirm labelled considerations visible; counters unchanged.  
2. Spot-check LIVE-02 negation (no BWV/CCTV consideration chips).  
3. Spot-check LIVE-04 order/service wording usefulness.  
4. Confirm CPS Chase page still has zero advisory rows.  
5. Only then consider Court/Papers allow-list wiring (out of scope here).

---

## Artefact index

1. `OVERVIEW-LIVE-PROOF-FINAL-REPORT.md` (this file)  
2. `OVERVIEW-LIVE-PROOF-DUMP.json`  
3. `HUMAN-REVIEW-PACK.md` (prior incomplete baseline)  
4. `scripts/overview-live-proof-intelligence-cleanup.test.ts`  
5. `components/criminal/five-answers/OverviewLegalIntelligenceCard.tsx`
