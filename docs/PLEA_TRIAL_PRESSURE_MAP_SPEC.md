# Plea / Trial Pressure Map — Feature Specification

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/plea-trial-pressure-map-spec`  
**Do not build product UI, routes, export builders, or audit runners until explicitly approved.**

---

## 1. Product purpose

The **Plea / Trial Pressure Map** is a solicitor review aid that aggregates existing CaseBrain evidence-state signals into one readable pressure layer. It helps a fee-earner or supervisor see, at a glance, where the current bundle creates **evidence pressure** — for Crown material, disclosure gaps, attribution weaknesses, and safeguard issues — without forming a plea recommendation or predicting trial outcome.

### What this feature is

- A **pressure dashboard** derived from Evidence Truth Map states, Proof Receipts, CPS Chase gaps, court-note limits, client-summary safeguards, do-not-overstate warnings, missing disclosure flags, and family-specific proof weakness checks.
- A **review checklist** surfacing negotiation and review points a solicitor may wish to consider after independent review.
- A **source-linked summary** where every pressure point traces to an evidence state and proof receipt.

### What this feature is not

- **Not legal advice.** CaseBrain does not advise guilty or not guilty pleas.
- **Not a plea recommender.** It must never say “you should plead”, “accept the offer”, “go to trial”, or equivalent.
- **Not an outcome predictor.** It must never predict conviction, acquittal, win/loss probability, or sentence.
- **Not client-facing advice without review.** Exports labelled for clients require explicit solicitor review before use.

### Relationship to existing CaseBrain layers

| Existing layer | Role in Pressure Map |
|----------------|----------------------|
| Evidence Truth Map | Primary source of evidence states (`served`, `referred-only`, `missing`, etc.) |
| Proof Receipts | Per-item provenance, certainty, and safe wording anchors |
| CPS Chase gaps | Disclosure gap pressure and chase-ready review points |
| Court note limits | Caps overstatement in court-facing copy |
| Client summary safeguards | Blocks unsafe client-facing claims |
| Do-not-overstate warnings | Flags language that must not be relied on without review |
| Missing disclosure | Drives disclosure gap pressure category |
| Family-specific proof weakness checks | Adds offence-family context to generic states |

The Pressure Map **combines** these layers; it does **not** replace them or invent new evidence facts.

---

## 2. Core sections

The Pressure Map UI and exports are organised into six fixed sections. Section order is stable so a solicitor can scan the same layout on every matter.

### 2.1 Crown evidence pressure

Surfaces Crown-side material that is **served and source-backed** versus material that is **referred-only, partial, draft, unsigned, or not safely confirmed**.

**Shows:**

- Count and list of Crown items by evidence state.
- Pressure signals where served material may still carry qualification (partial, contradicted, unsigned).
- Links to Proof Receipts for each item.

**Does not show:**

- “Strong case for prosecution” or “weak case for prosecution”.
- Conviction likelihood or “Crown will begs a guilty plea”.

### 2.2 Defence / disclosure pressure

Aggregates **missing**, **referred-only**, and **not safely confirmed** material that the defence may need before position can be reviewed — aligned with CPS Chase gap logic and missing disclosure flags.

**Shows:**

- Disclosure gaps with chase status where available.
- Items marked `draft`, `unsigned`, or `partial` on the defence side.
- Review points: “confirm whether X was requested / served = solicitor review”.

**Does not show:**

- “Disclosure failure means acquittal”.
- Automatic abuse-of-process or stay recommendations.

### 2.3 Attribution / ID / continuity weaknesses

Groups pressure signals where the **link between source material and the alleged act or person** is weak or unverified.

**Sub-groups:**

- **Attribution weakness** — who sent, owned, or operated a device/account.
- **ID weakness** — whether a person is identified from stills, BWV, or witness account with adequate basis.
- **Continuity weakness** — chain of custody, export integrity, master vs derivative media.

Each sub-group lists only items whose Truth Map / family check triggered the weakness; no inferred weaknesses without a linked state.

### 2.4 Safeguard issues

Flags **procedural and fairness safeguards** that affect whether evidence or interview material can be safely assessed or relied on in any output channel.

**Examples (non-exhaustive):**

- Youth: appropriate adult, YJS, interview fairness.
- Mental health / fitness / intermediary need flagged but not confirmed served.
- Interpreter / translation quality or missing translated messages.
- PACE / custody / interview material referred-only or missing.
- Redaction, OCR failure, wrong date or wrong court on key documents.

Safeguard issues are **review flags**, not findings of unfairness or inadmissibility unless a solicitor records that separately.

### 2.5 Negotiation / review points

A solicitor-readable bullet list of **neutral review points** derived from pressure signals. Wording is always provisional and action-oriented for the fee-earner, not directive to the client.

**Allowed patterns:**

- “Confirm whether full CCTV master has been requested.”
- “Review ID basis for stills at page ref X — master not in bundle.”
- “Lab report marked missing on Truth Map — chase status: outstanding.”

**Blocked patterns:**

- “Advise client to accept the offer.”
- “Strong grounds to plead guilty.”
- “Trial is not viable.”

### 2.6 Unsafe-to-advise guard

A persistent banner and export footer block that **hard-stops** automated plea or outcome advice when bundle conditions are not met.

**Triggers (any one may activate):**

- Any material in `not safely confirmed` or `not safe to assess` state on a charge-critical item.
- False-served risk flags from Proof Receipt / Truth Map mismatch.
- Active do-not-overstate warnings on items referenced in pressure summary.
- Family check marked `blocked` for safe assessment.

When active, the Pressure Map shows **pressure signals only** and suppresses any templated “position summary” that could be read as advice.

---

## 3. Required fixed guard wording

The following strings are **immutable** in UI, exports, and any future API copy. They must appear verbatim (allowing line breaks only).

1. **Primary guard (banner / header):**  
   `CaseBrain does not advise guilty or not guilty pleas.`

2. **Bundle guard (when pressure map is shown):**  
   `Do not advise plea from the current bundle without solicitor review.`

3. **Definition guard (footer on every export):**  
   `Pressure signals are evidence-state indicators, not legal advice.`

### Additional safe framing (recommended, not substitute for the three fixed strings)

- “For solicitor review only.”
- “Based on evidence states recorded in CaseBrain — independent review required.”
- “Review point — not a recommendation.”

---

## 4. Evidence pressure categories

Every pressure point is assigned **exactly one** primary category below. Categories describe **evidence state**, not legal merit or plea suitability.

| Category | Definition | Typical Truth Map / source states |
|----------|------------|-----------------------------------|
| **Source-backed pressure** | Material is served with a linked Proof Receipt and no active overstate block. Pressure reflects **what the served source shows**, not inferred facts. | `served` + receipt confirmed |
| **Provisional pressure** | Material is present but qualified: partial, draft, unsigned, or explicitly provisional in receipt. | `partial`, `draft`, `unsigned`, provisional receipt |
| **Disclosure gap pressure** | Material is missing, not in bundle, or only listed on schedule without body. | `missing`, chase gap, MG6C/D referred without file |
| **Attribution weakness** | Link between account, device, handle, or subscriber and the alleged conduct is not source-backed in bundle. | family check + `referred-only` / `missing` / `not safely confirmed` |
| **ID weakness** | Identification basis (stills, parade, voice, BWV freeze-frame) is incomplete or derivative-only. | stills without master, `referred-only` ID pack |
| **Continuity weakness** | Chain, export log, hash, or master/derivative relationship not demonstrated. | CCTV stills only, incomplete download cert |
| **Safeguard weakness** | Procedural fairness or fitness/interpreter/youth safeguard material absent or unverified. | custody/PACE missing, AA not confirmed |
| **Contradiction pressure** | Two or more source-backed or provisional items conflict on a material point; Truth Map marks `contradicted`. | `contradicted` |
| **Other-defendant-only pressure** | Material relates to co-defendant or another party, not safely mapped to this defendant. | `other-defendant-only` |
| **Not safe to assess** | Bundle state prevents even provisional pressure characterisation for this item or charge element. | `not safely confirmed`, OCR fail, wrong defendant bundle |

### Category rules

- **No stacking for display:** UI shows one primary category chip; secondary tags may appear as metadata only.
- **No auto-escalation:** `disclosure gap` does not become `source-backed` when a chase email is drafted.
- **Receipt required:** Every category except `not safe to assess` must link to at least one Proof Receipt or Truth Map row id.
- **No plea mapping:** Categories must never be labelled “prosecution strong”, “defence strong”, “plea advisable”, or similar.

---

## 5. Family-specific checks

Family checks run **after** generic evidence-state classification. They add offence-context review points; they do not change underlying Truth Map states.

Each check outputs: **check id**, **trigger condition**, **pressure category if triggered**, **safe review wording template**, **blocked unsafe wording**.

### 5.1 Phone harassment

| Check | Trigger | Category | Safe review point |
|-------|---------|----------|-------------------|
| Screenshots only | Messages shown as screenshots without full download or export | Attribution weakness / provisional | Confirm whether full device download or platform disclosure has been requested and served. |
| Full download missing | Schedule refers to download; file missing | Disclosure gap | Chase full download; do not treat schedule entry as served content. |
| Subscriber missing | No subscriber / account holder material for attributed number | Attribution weakness | Review attribution basis for number/account — subscriber material not in bundle. |
| Attribution gap | Handle or device not linked to client in served material | Attribution weakness | ID/attribution basis for messages is not source-backed in current bundle. |
| Call logs missing | Harassment allegation includes calls; logs referred-only or missing | Disclosure gap | Confirm call log material status — referred-only on Truth Map. |
| Course of conduct | Incidents span dates; bundle incomplete for period | Provisional / disclosure gap | Review whether served messages cover full alleged course of conduct period. |

### 5.2 CCTV / robbery

| Check | Trigger | Category |
|-------|---------|----------|
| Stills vs master | Stills served; master CCTV missing or referred-only | ID weakness / continuity weakness |
| ID basis | Recognition or comparison without served master or formal ID procedure docs | ID weakness |
| Continuity | No audit trail, export log, or continuity statement | Continuity weakness |
| Audit trail | Schedule mentions audit trail not served | Disclosure gap |

### 5.3 Assault / BWV

| Check | Trigger | Category |
|-------|---------|----------|
| Footage served/referred | BWV referred-only or partial export | Disclosure gap / provisional |
| Injury evidence | Medical or photographic injury material missing | Disclosure gap |
| Self-defence | Account or material re self-defence not in bundle or not safely confirmed | Not safe to assess / provisional |
| Custody / PACE / interview | Interview recording or transcript missing; PACE incomplete | Safeguard weakness / disclosure gap |

### 5.4 Drugs

| Check | Trigger | Category |
|-------|---------|----------|
| Continuity | Seizure-to-lab continuity not served | Continuity weakness |
| Lab report | Lab report missing or draft | Disclosure gap / provisional |
| Weight | Weight not on served lab or charge sheet alignment unclear | Provisional |
| Intent | No served material supporting intent element beyond presence | Provisional — not inference of guilt |
| Phone / Encro attribution | Comms attributed without download or handle linkage | Attribution weakness |

### 5.5 Encro

| Check | Trigger | Category |
|-------|---------|----------|
| Handle attribution | Handle linked to defendant without served extraction mapping | Attribution weakness |
| Platform extraction | Extraction report missing or referred-only | Disclosure gap |
| Device ownership | Ownership/subscriber not served | Attribution weakness |
| Subscriber / source | Source intelligence not in bundle or marked other-defendant-only | Other-defendant-only / disclosure gap |

### 5.6 Motoring / SJP

| Check | Trigger | Category |
|-------|---------|----------|
| Device calibration | Speed device calibration cert missing or expired on face of bundle | Disclosure gap / provisional |
| Notice / service | NIP or SJP notice service not demonstrated in served material | Provisional |
| ANPR / telematics | ANPR or telematics referred-only without underlying data | Disclosure gap |

### 5.7 Youth

| Check | Trigger | Category |
|-------|---------|----------|
| Appropriate adult | AA presence/documentation not served for interview | Safeguard weakness |
| YJS | Youth justice material missing where schedule references it | Disclosure gap |
| Safeguards | Strip-search, detention, or welfare material incomplete | Safeguard weakness |
| Interview fairness | Interview marked unsigned, draft, or referred-only | Safeguard weakness / provisional |

### 5.8 Domestic / stalking

| Check | Trigger | Category |
|-------|---------|----------|
| Messages | Messages partial, screenshot-only, or contradicted | Provisional / contradiction |
| Consistency | Complainant accounts or dates contradicted in served material | Contradiction pressure |
| Course of conduct | Pattern allegation not covered by served message set | Provisional / disclosure gap |
| Bail / restraining overlap | Overlap with bail or restraining order terms not clearly served | Safeguard weakness / provisional |

### 5.9 Bail / restraining order breach

| Check | Trigger | Category |
|-------|---------|----------|
| Order terms | Order text missing or draft | Disclosure gap / provisional |
| Service proof | Proof order was served on defendant not in bundle | Provisional |
| Breach evidence | Alleged breach act not linked to served terms | Not safe to assess |

### 5.10 Expert evidence

| Check | Trigger | Category |
|-------|---------|----------|
| DNA / fingerprint | Report missing, draft, or unsigned | Disclosure gap / provisional |
| Cell-site | Cell-site report referred-only or methodology section missing | Disclosure gap / provisional |
| Medical report | Medical expert report not served | Disclosure gap |
| Expert status | Expert notice or CV not served where required | Safeguard weakness / disclosure gap |

### 5.11 Mental health / fitness / intermediary

| Check | Trigger | Category |
|-------|---------|----------|
| Fitness | Fitness material missing or not safely confirmed | Safeguard weakness / not safe to assess |
| Intermediary | Intermediary need flagged; assessment not served | Safeguard weakness |

### 5.12 Interpreter / translated messages

| Check | Trigger | Category |
|-------|---------|----------|
| Interpreter at interview | Certificate or note of interpreter missing | Safeguard weakness |
| Translated messages | Foreign-language messages without served translation | Provisional / disclosure gap |

### 5.13 Redaction / OCR / wrong date or court

| Check | Trigger | Category |
|-------|---------|----------|
| Redaction | Critical pages redacted without unredacted source available | Provisional / not safe to assess |
| OCR | OCR-poor pages on charge-critical items | Not safe to assess |
| Wrong date or court | Document date or court header mismatches matter metadata | Safeguard weakness — verify index |

### 5.14 Co-defendant / mixed defendant material

| Check | Trigger | Category |
|-------|---------|----------|
| Co-defendant interview | Interview of another defendant only in bundle | Other-defendant-only |
| Mixed material | Bundle contains another defendant’s MG or statement without separation | Other-defendant-only / not safe to assess |
| Cross-attribution | Crown material attributes act to “defendants” without individualisation | Provisional — solicitor to review individual liability |

---

## 6. Example outputs

Each example shows: **pressure signal**, **source/evidence state**, **safe wording**, **blocked unsafe wording**.

### Example 1 — Phone attribution weak

| Field | Content |
|-------|---------|
| **Pressure signal** | Message attribution not source-backed |
| **Source / evidence state** | Screenshots `served`; full download `missing`; subscriber `missing` — Truth Map row `msg-bundle-01` |
| **Category** | Attribution weakness |
| **Safe wording** | “WhatsApp screenshots are in the bundle; full download and subscriber material are marked missing on the Truth Map. Review attribution basis before relying on sender identity in any note.” |
| **Blocked unsafe wording** | “Messages prove the client sent the threats.” / “Client should plead given the messages.” |

### Example 2 — CCTV stills but master missing

| Field | Content |
|-------|---------|
| **Pressure signal** | ID basis relies on stills without master footage |
| **Source / evidence state** | Stills `served` (Proof Receipt #PR-442); master CCTV `referred-only` on MG6C |
| **Category** | ID weakness + continuity weakness |
| **Safe wording** | “Crown stills are served; master CCTV is referred-only. Review identification basis and request master export or written confirmation — chase gap linked.” |
| **Blocked unsafe wording** | “CCTV proves identification.” / “No defence to ID — advise guilty.” |

### Example 3 — BWV referred-only

| Field | Content |
|-------|---------|
| **Pressure signal** | Body-worn video not in bundle |
| **Source / evidence state** | BWV `referred-only` on disclosure schedule; no file hash in Proof Receipt |
| **Category** | Disclosure gap pressure |
| **Safe wording** | “BWV is referred-only on the schedule, not served. CPS Chase draft available; do not treat as reviewed footage.” |
| **Blocked unsafe wording** | “Officer’s account is on BWV.” / “Strong prosecution case on footage.” |

### Example 4 — Co-defendant interview only

| Field | Content |
|-------|---------|
| **Pressure signal** | Interview material is other-defendant-only |
| **Source / evidence state** | Interview transcript `served` but Truth Map flags `other-defendant-only` (defendant B) |
| **Category** | Other-defendant-only pressure |
| **Safe wording** | “Served interview relates to co-defendant B, not this defendant. Do not use in this defendant’s position note without solicitor review of admissibility and attribution.” |
| **Blocked unsafe wording** | “Co-defendant implicates your client — plead now.” / “Interview proves joint enterprise.” |

### Example 5 — Drugs lab report missing

| Field | Content |
|-------|---------|
| **Pressure signal** | Substance analysis not served |
| **Source / evidence state** | Seizure record `served`; lab report `missing`; weight on charge sheet only — family check `drugs-lab-missing` |
| **Category** | Disclosure gap pressure |
| **Safe wording** | “Seizure material is served; lab report is marked missing. Review substance/weight basis before any comment on quantity or type — chase outstanding.” |
| **Blocked unsafe wording** | “Drugs confirmed as cocaine — case proven.” / “PWITS inevitable — recommend plea.” |

---

## 7. UI concept

### Card: “Pressure signals”

A dedicated card on the criminal matter workstation (future build). **No red “guilty / not guilty” labels.** No win/loss badges. No plea buttons.

#### Header

- Title: **Pressure signals**
- Fixed guard banner (Section 3, strings 1–2)
- Compact summary counts by category (chips, not scores)

#### Body layout

Six collapsible sections matching Section 2 (Crown → Defence → Attribution/ID/Continuity → Safeguards → Review points → Unsafe-to-advise guard).

#### Signal rows

Each row contains:

| Element | Behaviour |
|---------|-----------|
| **Category chip** | One primary category colour-neutral (e.g. slate/amber, not red/green guilt coding) |
| **Source-linked chips** | Truth Map id, Proof Receipt id, document page ref — clickable |
| **Evidence state badge** | `served`, `referred-only`, `missing`, etc. — read-only from Truth Map |
| **Safe summary line** | One sentence, solicitor register, no outcome language |
| **Actions** | Four explicit actions per signal (see below) |

#### Actions (per signal)

| Action | Meaning |
|--------|---------|
| **Rely** | Solicitor marks item as relied on for internal note (does not change Truth Map served state) |
| **Check** | Flag for fee-earner review — default for provisional/weak states |
| **Chase** | Opens or links CPS Chase gap for disclosure items |
| **Do-not-use** | Blocks item from export snippets and client-safe paths until cleared |

Actions are **solicitor workflow markers**, not AI recommendations.

#### Proof Receipt link

Every signal row includes **View proof receipt** — opens receipt drawer with source excerpt bounds, certainty, and do-not-overstate flags.

#### Unsafe-to-advise state

When Section 2.6 triggers, card body shows signals but **dims** review-point auto-text and shows full-width guard with string 2.

#### Explicit UI prohibitions

- No “Plea recommendation” panel.
- No “Trial likelihood” meter.
- No green/red “strong/weak case” headline.
- No client-facing “what you should do” copy on this card.

---

## 8. Export concept

Pressure Map content may be exported into three **internal** formats. All exports include Section 3 fixed guard wording (all three strings).

### 8.1 Internal matter note

- Full six-section structure.
- All source links as footnote refs (Receipt ids, page refs).
- Includes action markers (rely / check / chase / do-not-use) where set by user.
- **Audience:** fee-earner file note / workflow.

### 8.2 Solicitor review note

- Condensed: top pressure signals + review points + unsafe-to-advise status.
- Omits raw excerpts; links to Proof Receipts only.
- **Audience:** supervisor or counsel review in under 2 minutes.

### 8.3 Proof appendix

- Tabular appendix suitable for bundle index attachment: signal, category, state, receipt id, chase status.
- No narrative plea language.
- **Audience:** disclosure / proof schedule adjunct.

### Export prohibitions

- **No “client advice” export** without explicit “solicitor reviewed” gate and Client-Safe Summary safeguards applied separately.
- No export channel may omit the three fixed guard strings.
- Court Note and CPS Chase builders remain **separate** — Pressure Map export must not auto-merge into court copy without user action.

---

## 9. Acceptance criteria

Future implementation is accepted only when **all** criteria pass.

### Advice and outcome guards

- [ ] **No plea recommendation** in UI, exports, or generated copy.
- [ ] **No win/loss prediction** or conviction/acquittal probability.
- [ ] Fixed guard wording (Section 3) present and verbatim on all surfaces.

### Evidence integrity

- [ ] **Every pressure point links** to Truth Map row and/or Proof Receipt (except `not safe to assess` with documented reason).
- [ ] No pressure signal generated from inferred facts not backed by a recorded evidence state.
- [ ] **False-served** items never appear as `source-backed pressure`.

### Channel separation

- [ ] **Court / CPS / client wording** remains in existing builders; Pressure Map does not overwrite or auto-push to those channels.
- [ ] **Unsafe overclaims blocked** — do-not-overstate and unsafe-to-advise guard suppress reliance language.

### Coverage and usability

- [ ] **Family checks** (Section 5) implemented for all listed families with regression fixtures per family.
- [ ] Solicitor review note scannable in **under 2 minutes** on standard pilot bundles (target: ≤15 signals on card without pagination for typical case).

### Regression / eval (future)

- [ ] Golden scenarios for each example in Section 6.
- [ ] Negative tests: blocked unsafe wording must never appear in export snapshots.
- [ ] Cross-family bundle does not bleed checks (e.g. no motoring calibration check on harassment-only matter unless material present).

---

## 10. Implementation notes for future build

**This document is spec-only.** No code, app routes, tests, or deploy in the spec branch.

### Suggested build phases (when approved)

1. **Data model** — `PressureSignal` derived view over Truth Map + Proof Receipt + chase gaps; no duplicate evidence state store.
2. **Category engine** — Map states to Section 4 categories; family check plugin registry per Section 5.
3. **Copy layer** — Template library for safe wording; blocked-phrase linter shared with export copy gate.
4. **UI card** — Read-only v1; actions persist as user metadata only.
5. **Exports** — Three export templates (Section 8); wire to existing export versioning when available.
6. **Eval** — Extend Evidence-State Accuracy Audit fixtures with pressure-map snapshots; add Bad Output Memory rules for blocked phrases.

### Dependencies (read-only at spec time)

- Evidence Truth Map stable states: `served`, `referred-only`, `missing`, `partial`, `draft`, `unsigned`, `contradicted`, `other-defendant-only`, `not safely confirmed`.
- Proof Receipts with receipt id and certainty.
- CPS Chase gap index.
- Family profile hint from case metadata (Criminal Pilot).

### Non-goals (unchanged from spec)

- No ML outcome prediction model.
- No client chatbot “plea advisor”.
- No integration with court plea entry systems.
- No changes to Brain 1, Guardian, chase core, Supabase, auth, or deploy in the first slice.

### Open questions (for product sign-off before build)

1. Should `Rely` action on a `referred-only` item show a confirmation modal citing string 2?
2. Should supervisor dashboard aggregate **count of matters with unsafe-to-advise guard active**?
3. Per-firm toggle to hide Negotiation / review points section until supervisor role?

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Author | CaseBrain product spec |
| Related docs | `docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md`, `docs/h4/H4_EXPORT_COPY_TEST_MATRIX.md`, `docs/CRIMINAL_PILOT_MASTER_PLAN.md` |
