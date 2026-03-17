# Phase 1 Rebuild — Full Plan and How We Will Implement It

**No code. Plan only.**  
This document is the single spec for making Phase 1 evidence-driven so the system stops giving wrong offence, wrong stance, and generic advice. It folds in Copilot’s Phase 1 rebuild, Cursor’s refinements, and a clear implementation order.

---

# Part 1 — The Problem and the Goal

## 1.1 Why the system gave wrong advice

- **Phase 1 today** asks the user to pick offence, stance, seriousness, and trial posture (or defaults to them).
- Those choices are **not** read from the bundle. So the system can default to Section 18, “fight trial”, “deny”, and generic angles.
- **Strategy and Chat** then build from those choices instead of from the actual evidence.
- Result: wrong offence (s.18 when the case is s.20), wrong angles (“challenge injury threshold” when the bundle already has fracture + hospital), generic witnesses and disclosure, and misaligned advice.

**Root cause:** Phase 1 is **UI-driven** (user picks or system defaults), not **evidence-driven** (system reads bundle and proposes).

## 1.2 What we want instead

- **Phase 1** should **read the bundle** (via existing extraction), **infer** offence, stance, and procedural stage, **generate** an evidence-based initial plan and case theory, and **propose** them to the user.
- The user **confirms or edits** (B4). No manual offence/stance/trial pickers as the main flow.
- **Strategy and Chat** use the **same** detected offence, stance, stage, and agreed summary/plan. So advice stays grounded in the real case.

**Goal:** Phase 1 never sets the case from pickers or defaults. It sets it from the bundle, then the user refines.

---

# Part 2 — The Full Plan (What We Will Build)

## 2.1 Single source of truth = the bundle

- Phase 1 uses **extracted data** from the bundle:
  - Charge sheet (for offence)
  - MG5 (narrative, facts, witnesses, evidence mentioned)
  - MG11s / witness statements
  - MG6(a) (what’s served, what’s outstanding)
  - Custody record
  - Interview (type, no comment / prepared statement / etc.)
  - Evidence list / exhibit list
- **If the bundle exists** → Phase 1 uses it. No re-upload for Phase 1; we use what extraction already produced.
- **If no bundle exists** → user can manually enter charge + brief facts so the system can still propose something (degraded but usable).

## 2.2 Auto-detect the offence (from the charge sheet)

- Parse the charge sheet / extracted charges.
- Map to a single stored value, e.g.:
  - “Section 20” / “s.20” / “OAPA 1861” + “grievous bodily harm” → **Section 20 GBH**
  - “Section 18” + intent language → **Section 18 GBH**
  - “Section 47” → **ABH**
  - “Common assault” / “s.39” → **Common assault**
  - “Criminal damage” → **Criminal damage**
  - (Extend as needed for other offence types.)
- **Store on the case:** e.g. `offence_detected` = `"Section 20 GBH"` (or equivalent field). This becomes the **single source of truth** for Strategy, Chat, Timeline, Safety, and B4. No s.18 or ABH unless the charge sheet actually says so.

## 2.3 Auto-detect the defence position / stance (from MG5 + statements + interview)

- Infer stance from **facts and interview**, not from a dropdown:
  - **One punch + fall / mechanism** → **Intent denial + Causation challenge**
  - **Weapon** → **Act denial**
  - **Self-defence language in bundle** → **Lawful force**
  - **Intoxication** → **Recklessness challenge**
  - **No comment interview** → **Put to proof** (and reinforce intent denial; do not propose a positive case like self-defence unless the bundle supports it)
- **Store on the case:** e.g. `stance_detected` = `"Intent Denial + Causation"` (or equivalent). Strategy and Chat use this.

## 2.4 Auto-detect procedural stage (from MG6(a) + disclosure state)

- Use the **same** disclosure state that Safety uses (critical/high missing items). Do not maintain a separate list.
- If **any** of the items that Safety treats as critical (or high) are missing — e.g. CCTV full window, CCTV continuity, BWV, 999, CAD, custody record, interview, forensic report, medical report, scene photos, custody CCTV (if applicable) — then:
  - **Stage** = e.g. **“Disclosure outstanding – not ready for plea”** (or equivalent).
- **Do not** default to “fight trial” or “PTPH” as the main posture until disclosure is substantially complete or the case is actually listed for trial. Default posture = **first appearance / disclosure / not ready for plea** when critical disclosure is missing.
- **Store on the case:** e.g. `stage_detected` = `"Disclosure Outstanding – Not Ready for Plea"`. Strategy, Chat, and UI use this so they don’t assume trial readiness.

## 2.5 Auto-generate the initial plan (from evidence)

- Build the **first** defence plan and case theory from:
  - **Offence** (detected)
  - **Facts** from MG5 and key facts (mechanism, fall, kerb, lighting, sequence)
  - **Witnesses** by name and role (e.g. Morgan Drew – friend of victim, saw punch; Samir Patel – independent, saw aftermath only; PC Vale – BWV; Tina Walsh – mentioned, left before police, not traced)
  - **Disclosure gaps** from Safety / MG6 (CCTV, continuity, BWV, 999, CAD, forensic, medical, scene photos, custody CCTV, etc.)
  - **Stance** (detected)
  - **Stage** (detected)
  - **Custody / interview** (no comment, etc.)
- The initial plan must be **evidence-specific**: named witnesses, real disclosure gaps, mechanism of injury, causation, lighting, sequence, missing witness (e.g. Tina Walsh). Not generic “challenge injury threshold” when the bundle already establishes GBH.
- This becomes the **proposal** that B4 offers to the user.

## 2.6 Auto-generate initial summary and case theory

- **Initial summary** — Short/detailed (and optionally full) derived from MG5 + key facts + solicitor buckets. Narrative in summary; discrete facts in key facts. Include prosecution case, defence angles, disputed issues, agreed facts, unknowns, missing disclosure, risks.
- **Initial case theory** — One sentence based on offence + stance + facts (e.g. “Prosecution say single punch caused GBH; we put them to proof on intent and causation; key disclosure missing.”).
- These are the **first draft** the user sees; B4 proposes them, user accepts or edits.

## 2.7 User confirms or edits (B4)

- B4 proposes:
  - Agreed summary (short / detailed / full)
  - Case theory line
  - Defence plan (stance, angles, disclosure as weapon, risks, pivots)
- User: **Accept** / **Edit** / **Reject**.
- Accepted values are stored and become the **canonical** source for Strategy, Chat, Timeline, Hearing Prep, and Disclosure Pressure. So Phase 1’s output is the **input** to B4; B4’s output is the **input** to everything else.

## 2.8 Remove legacy pickers (keep overrides only)

- **Remove as primary flow:** Offence picker, stance picker, seriousness picker, trial posture picker. They must not be the way the case is set when a bundle exists.
- **Keep as optional overrides:** User can **change** offence, stance, or stage if auto-detect is wrong or the user disagrees. Overrides re-run or update the proposal; user confirms again. So the system is evidence-first, but correctable.

## 2.9 One source of truth for downstream

- **Strategy**, **Chat**, **Timeline**, **Hearing Prep**, **Disclosure Pressure**, and **B4** must all read from the **same** case state:
  - Detected (or overridden) offence
  - Detected (or overridden) stance
  - Detected (or overridden) stage
  - Agreed summary and case theory (once confirmed via B4)
  - Current defence plan
- If Chat or Strategy use a different “current” offence or stance (e.g. old defaults), they will keep giving generic or wrong advice. So implementation must ensure they consume the **same** stored values.

## 2.10 Explicit content in the plan

- **Missing witness** — When the bundle mentions someone who is not a main witness (e.g. “Tina Walsh – present but left before police”), the auto-generated plan must name them and note they are missing/not traced. That is a real defence angle (disclosure / witness availability).
- **No “injury threshold” when bundle already has GBH** — When the bundle clearly describes serious injury (fracture, laceration, hospital), the plan must **not** suggest “dispute whether it is GBH/wound”. It should focus on intent, causation, mechanism, and disclosure. This is a rule in the logic, not just prompt text.

---

# Part 3 — How We Will Implement It (Order and Dependencies)

## 3.1 Principles

- **No big bang.** We build in steps so each step is testable and we don’t break existing flows.
- **Bundle-first.** Detection and plan generation use **existing** extraction and Safety. We don’t redesign extraction in Phase 1; we **consume** it.
- **Single source of truth.** Whatever we store (offence, stance, stage, summary, theory, plan) is what Strategy and Chat use. We add or reuse fields and wire them through.

## 3.2 Implementation order

### Step 1 — Data and detection (backend)

- **1a. Persist detected state**  
  Decide where to store `offence_detected`, `stance_detected`, `stage_detected` (e.g. on `criminal_cases` or a linked table). Ensure we have a place for “override” flags or overridden values if the user changes them.
- **1b. Offence detection**  
  Implement logic that reads the charge sheet / extracted charges (from existing criminal meta or documents) and sets `offence_detected` (e.g. Section 20 GBH, Section 18, ABH, etc.). No UI yet; just a function or pipeline step that can be called when a case has bundle data.
- **1c. Stance detection**  
  Implement logic that reads MG5 narrative, key facts, and interview type (no comment / prepared statement / etc.) and sets `stance_detected` (Intent Denial + Causation, Act Denial, Lawful Force, Recklessness, Put to Proof). Include “no comment → put to proof” and “one punch + fall → intent denial + causation”.
- **1d. Stage detection**  
  Implement logic that reads disclosure state (same as Safety: critical/high missing items). If any critical (or high) item is missing, set `stage_detected` to “Disclosure outstanding – not ready for plea”. Otherwise a later step can set “ready for plea” or “trial” when appropriate.
- **1e. When to run detection**  
  Define when detection runs: e.g. after upload + extraction, or when the user opens the case for the first time after upload, or when they click “Refresh from bundle”. Ensure extraction and Safety have run first (or are run as part of the same flow).

### Step 2 — Initial plan, summary, and case theory (backend)

- **2a. Auto-generate initial plan**  
  Build a function or pipeline that takes: offence (detected), key facts, witnesses (from key facts or extraction), disclosure gaps (from Safety), stance, stage, custody/interview. Output: structured defence plan (stance, case theory one-liner, angles, disclosure as weapon, risks, pivots). Use **named** witnesses and **real** disclosure gaps; do not output “challenge injury threshold” when the bundle already has clear GBH.
- **2b. Auto-generate initial summary and case theory**  
  Build logic that derives short/detailed (and optionally full) summary from MG5 + key facts + solicitor buckets, and a one-line case theory from offence + stance + facts. These become the default proposal for B4.
- **2c. Feed into B4**  
  Ensure B4’s “propose” path can accept this auto-generated summary, case theory, and plan as the **initial** proposal when the user has not yet accepted anything. So “first time opening the case” or “refresh from bundle” produces a proposal the user can accept or edit.

### Step 3 — UI: remove pickers, show proposal (frontend)

- **3a. Identify and remove legacy UI**  
  Find every place that asks the user to pick offence, stance, seriousness, or trial posture as the **primary** way to set the case. Remove or hide those controls for the evidence-driven flow (or make them secondary).
- **3b. Show detected state and proposal**  
  When the user opens a criminal case that has bundle data (and detection has run), show:
  - Detected offence (e.g. “Section 20 GBH”).
  - Detected stance (e.g. “Intent Denial + Causation”).
  - Detected stage (e.g. “Disclosure outstanding – not ready for plea”).
  - Proposed summary, case theory, and plan (from Step 2). Present this as the **B4 proposal**: “We’ve generated this from your bundle. Accept or edit.”
- **3c. B4 accept / edit / reject**  
  User can accept the proposal (which saves to agreed summary, case theory, and plan), or edit and then save, or reject and leave blank / try again. No code change to B4’s core behaviour; we just ensure the **default** proposal comes from the bundle, not from empty or generic content.

### Step 4 — Overrides (frontend + backend)

- **4a. Override offence**  
  Allow the user to change the offence (e.g. from “Section 20 GBH” to “Section 18 GBH”) when the auto-detect is wrong. Save the override; optionally re-run plan generation with the new offence.
- **4b. Override stance**  
  Allow the user to change the stance. Save the override; optionally re-run plan generation.
- **4c. Override stage**  
  Allow the user to change the procedural stage (e.g. “Ready for plea”). Save the override. These overrides are **optional** and secondary to the detected values.

### Step 5 — Strategy and Chat use the same state (backend + integration)

- **5a. Strategy**  
  Ensure the strategy/defence-plan API (and any UI that shows “best way to fight”) reads **detected (or overridden) offence**, **stance**, **stage**, and **agreed summary / case theory / plan**. Remove or bypass any path that still uses old defaults (e.g. s.18, “fight trial”) when the case has bundle-derived state.
- **5b. Chat**  
  Ensure the chat API receives the **same** case state in its context: offence, stance, stage, agreed summary, case theory, plan, key facts, disclosure gaps, witness names. So chat answers are grounded in the real case and do not drift to generic s.18/ABH or “challenge injury threshold” when the bundle says s.20 and clear GBH.
- **5c. Timeline, Hearing Prep, Disclosure Pressure**  
  These already use plan and Safety; confirm they use the **same** offence/stance/plan as Strategy and Chat. No separate “current” state.

### Step 6 — Testing and validation

- **6a. Test with the fictional GBH bundle**  
  Upload the full GBH PDF (or paste bundle). Confirm: offence = Section 20 GBH only; stance = Intent Denial + Causation; stage = Disclosure outstanding; plan names Drew, Patel, Tina Walsh, and lists real disclosure gaps; no “s.18”, “ABH”, or “challenge injury threshold”.
- **6b. Test Chat**  
  Ask Chat: “Propose agreed summary and case theory”, “What are the strongest defence routes?”, “What disclosure should we demand?”. Answers must be evidence-specific (named witnesses, real missing items, causation, lighting, etc.).
- **6c. Test overrides**  
  Override offence or stance; confirm Strategy and Chat reflect the override and that the plan can be re-generated if desired.

## 3.3 Dependencies (what needs to exist first)

- **Extraction** — Must already run on upload (charge sheet, MG5, custody, disclosure, key facts). Phase 1 consumes this; it does not replace extraction.
- **Safety / disclosure state** — Must already compute critical/high missing items from the bundle (CCTV, BWV, 999, CAD, etc.). Stage detection reuses this.
- **Key facts / solicitor buckets** — Must already exist for criminal cases so stance detection and plan generation have witnesses, mechanism, and disclosure mentions.
- **B4** — Must already support “propose summary / case theory / plan” and “accept / edit / reject”. Phase 1 feeds the **content** of the proposal; it does not replace B4.
- **Agreed summary and case theory storage** — Must already exist (DB + API). Phase 1 writes the **initial** proposal; B4 writes the **confirmed** version.

## 3.4 What we are not doing in Phase 1

- We are **not** redesigning extraction or adding new document types. We use existing extraction.
- We are **not** building a new “intake wizard” from scratch. We are changing how offence, stance, and plan are **set** (from bundle, not from pickers) and how the **first** B4 proposal is **generated** (from bundle, not empty).
- We are **not** implementing Police Station (Phase C) in this plan. Phase 1 is court-case only.

---

# Part 4 — Summary

| What | Detail |
|------|--------|
| **Problem** | Phase 1 uses pickers/defaults → wrong offence, stance, trial posture → generic advice. |
| **Goal** | Phase 1 reads bundle → detects offence, stance, stage → generates evidence-based plan/summary/theory → user confirms via B4 → Strategy and Chat use that. |
| **Single source of truth** | Bundle (extraction + Safety + key facts). Stored: offence_detected, stance_detected, stage_detected, agreed summary, case theory, plan. |
| **Remove** | Offence/stance/seriousness/trial pickers as primary flow. |
| **Keep** | Overrides for offence, stance, stage. B4 accept/edit/reject. |
| **Implement in order** | (1) Persist and run detection (offence, stance, stage). (2) Auto-generate plan, summary, case theory; feed B4. (3) UI: remove pickers, show proposal, B4. (4) Overrides. (5) Strategy and Chat use same state. (6) Test with GBH bundle and Chat. |

When we are ready to code, we start with Step 1 (data and detection) and proceed in order, testing after each step.

---

# Part 5 — Implemented (Phase 1 Rebuild)

The following has been implemented:

- **Migration** `20260218000000_phase1_detected_state.sql`: added `offence_detected_code`, `offence_detected_label`, `stance_detected`, `stage_detected` to `criminal_cases`.
- **Phase 1 detection** `lib/criminal/phase1-detection.ts`: `detectOffenceFromBundle` (uses offence-elements so every offence type is acknowledged), `detectStanceFromBundle`, `detectStageFromBundle`, `runPhase1Detection`.
- **Offence-elements** `getOffenceDefFromPhase1(code, label)` for strategy when using bundle-derived offence.
- **Strategy coordinator** accepts `preferredOffence?: { code, label }`; when set, uses it instead of re-detecting from charges.
- **Strategy-analysis** fetches `offence_detected_code`, `offence_detected_label` from `criminal_cases` and passes `preferredOffence` to `buildStrategyCoordinator`.
- **Offence API** GET: when no override, if `offence_detected_code` and `offence_detected_label` are set, returns them (label from bundle; type mapped from code).
- **Chat** defence-plan-chat: context includes `offence_detected_label`, `stance_detected`, `stage_detected` when set.
- **API** `POST /api/criminal/[caseId]/phase1-detect`: runs detection from charges, key facts, disclosure state, interview; persists to `criminal_cases`.

**How to run detection:** After uploading a bundle (or when opening a case), call `POST /api/criminal/[caseId]/phase1-detect`. The UI can call this after "Add evidence" success or expose a "Refresh from bundle" button. Strategy and Chat then use the stored offence, stance, and stage.

---

*Plan and implementation. Last updated after Phase 1 rebuild implementation.*
