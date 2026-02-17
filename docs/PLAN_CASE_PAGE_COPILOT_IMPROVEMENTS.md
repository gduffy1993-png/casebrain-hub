# Plan: Case page – Copilot-suggested improvements

## Context

Copilot reviewed the **Case page** (criminal case view with Strategy, Safety, Next steps, Disclosure, Bail, Summary, Charges, Client & instructions, Sentencing, Key facts, Case files, Letters, etc.) and said: **the page is already very strong**; expandable panels work as intended. These are **optional UX improvements**, not structural gaps.

---

## What we already have (Case page)

- Strategy panel (expandable, detailed)
- Safety panel
- Next steps
- Disclosure tracker
- Bail
- Summary
- Charges
- Client & instructions
- Sentencing
- Key facts
- Case files
- Letters
- Export overview / case pack

Verdict: **core solicitor workflow is covered.**

---

## Copilot’s 5 suggestions (and our view)

### 1. **Case Overview header**

**Idea:** At the top, one compact block with:
- Allegation
- Date of incident
- Client initials
- Next hearing
- Disclosure status (critical / high / satisfied)
- Strategy selected  

**Our view: Agree.** A short “Case overview” strip gives orientation without opening panels. We may already have some of this (e.g. next hearing, strategy preview); if not, or if it’s scattered, consolidating into one header is sensible.

---

## Case Overview – full proposed layout (Copilot)

Copilot’s **exact** proposal for what sits **above** Summary / Strategy / Safety. Six blocks:

### 1. Case Snapshot
- **Offence** (from charge sheet, e.g. s18, s20, robbery)
- **Date of incident** (from MG5 or intake)
- **Client initials** (non-PII)
- **Police station** (from intake)
- **Next hearing** (from Summary/hearings)
- **Case status:** Awaiting Disclosure / Pre-PTPH / Strategy Committed
- **Disclosure status:** Critical: X · High: Y · Satisfied: Z  

*Instant orientation.*

### 2. Key Evidence Summary
Auto-extracted from uploaded PDFs – surface “what we have” without opening panels:
- MG5 summary present
- Victim MG11 present
- CCTV continuity present
- Custody record present
- Medical summary present
- Charge sheet present
- Interview transcript present
- MG6C/MG6E present  

*Saves clicks; depends on doc-type detection or extraction tagging.*

### 3. Missing Evidence (Case File)
Not disclosure – *our* case file checklist:
- MG11 (employee), MG11 (passer-by)
- CCTV viewing log, Scene photos, Forensics, Medical mechanism report  

*Same as “Missing Documents” panel; can live here or as separate panel.*

### 4. Missing Disclosure (Safety Panel Summary)
Pulled from Safety panel:
- **Critical:** e.g. CCTV continuity, Interview recording
- **High:** e.g. 999 audio, CAD log, Custody CCTV  

*Surfaces Safety’s critical/high without opening Safety.*

### 5. Strategy Snapshot
Pulled from Strategy panel:
- **Primary:** e.g. Charge Reduction
- **Secondary:** e.g. Act Denial
- **Blocked:** e.g. Identification Challenge
- **Risks:** missing sequence evidence, mechanism, continuity
- **Next actions:** Review disclosure, update position, prepare counsel instructions  

*“What’s the plan?” in one place.*

### 6. Quick Actions Bar
Horizontal bar: **Upload Evidence** · **Add Client Instructions** · **Add Hearing** · **Generate Letter** · **Add Note**

*Already in plan.*

---

**Why Summary alone isn’t enough (Copilot):** Summary already shows next hearing, bundle status, disclosure status, strategy, procedural status, disclosure counts – but not allegation, date of incident, client initials, police station, timeline, missing case docs, quick actions, or a clear strategy snapshot. The Case Overview header fixes that.

**Placement:** Case Overview sits **above** Summary, Strategy, Safety, Next Steps, etc. – the first thing the solicitor sees.

---

## Our view / alternative method

We agree with the **content** of the six blocks (snapshot, evidence summary, missing evidence, missing disclosure summary, strategy snapshot, quick actions). Two things we’d adjust:

**1. Risk of overload**  
Six blocks at the top can make the fold heavy. We’d consider a **compact variant**:

- **Always visible (first row):** **Case Snapshot** (offence, date of incident, client initials, police station, next hearing, case status, disclosure counts) + **Quick Actions bar**. One strip: orientation + actions.
- **Second row or expandable:** **Key Evidence Summary**, **Missing Evidence**, **Missing Disclosure summary**, **Strategy Snapshot** – either in a single “Expand overview” section or as a second row that doesn’t dominate the fold.

So: same six elements, but **tiered** (must-see vs expand/detail) to avoid overwhelming the top of the page. If we’re confident solicitors want everything at once, we can still do all six in one view.

**2. Key Evidence Summary – data source**  
“MG5 present”, “Charge sheet present”, etc. requires us to **know document types**. That’s either:
- document classification (auto or manual) on upload, or  
- extraction metadata (e.g. “MG5” in doc name or extracted_json).  

We’d add this block once we’ve defined how we derive “present” (e.g. tags, doc type field, or naming convention). Otherwise we show a placeholder or skip this block until we have the data.

**Summary:** Add the full Case Overview to the plan as above. Prefer a **compact first row** (Snapshot + Quick Actions) with the rest in a second row or expandable section unless we explicitly want all six blocks visible at once. Key Evidence Summary: implement when we have a clear way to know “MG5 present” / “charge sheet present”.

---

### 2. **Timeline panel**

**Idea:** One panel showing:
- Arrest → Interview → Charge → First hearing → Disclosure served → Defence actions  

**Our view: Agree in principle.** A timeline helps solicitors see the story at a glance. We have data for some of this (arrest date, matter state, hearings, bail). We’d need to define: which events we show, where each date comes from (e.g. date_of_arrest, first hearing from hearings table, charge from matter_state change or a field), and “defence actions” (e.g. key steps from Next steps or strategy). Small caveat: implement once we’re clear on data sources so we don’t show empty or wrong dates.

---

### 3. **Missing Documents panel**

**Idea:** A checklist of missing *case file* items, e.g.:
- MG11 (employee)
- MG11 (passer-by)
- CCTV viewing log
- Scene photos
- Forensics
- Medical report  

**Our view: Partially agree.** This is **different from** the existing disclosure tracker (what’s been requested/received from the other side). “Missing case documents” is a **solicitor-side case file checklist** – “what we still need in our file”. Useful, but optional and a bit more product design (fixed list vs configurable). We’re not against it; we’d treat it as a follow-on once Police station + Case overview are in place.

---

### 4. **Quick Actions bar**

**Idea:** Shortcuts in one bar, e.g.:
- Upload evidence
- Add client instructions
- Add hearing
- Generate letter
- Add note  

**Our view: Agree.** Quick actions are standard and speed up workflow. We may already have some of these in the case UI; if there isn’t a single “quick actions” bar, adding one (or making existing actions more visible as a bar) would help.

---

### 5. **Case Status badge**

**Idea:** One clear status label, e.g.:
- Awaiting Disclosure
- Pre-PTPH
- Strategy Committed  

**Our view: Agree.** Deriving a single “Case status” from matter_state, disclosure state, and whether strategy is committed would help orientation. We have the building blocks (matter_state, disclosure tracker, strategy); this is mostly UI + a small derivation rule.

---

## Summary

| Suggestion            | Our view        | Note |
|----------------------|-----------------|------|
| Case Overview header | Agree           | Consolidate allegation, next hearing, disclosure, strategy at top. |
| Timeline panel       | Agree (caveat)  | Do once we’re clear on data sources for each event. |
| Missing Documents    | Partially agree | Different from disclosure; nice-to-have, do after core improvements. |
| Quick Actions bar    | Agree           | One place for upload, hearing, letter, note, etc. |
| Case Status badge    | Agree           | One label from matter_state + disclosure + strategy. |

We **don’t disagree** with any of the five; we’d prioritise **Case Overview**, **Case Status badge**, and **Quick Actions**, then **Timeline** once data is defined, then **Missing Documents** as a later enhancement.

No code in this doc – plan only. Can be turned into a developer spec or mockup when you’re ready.

---

# Full UI improvement list (Copilot verdict – complete)

Below is the **full** solicitor-grade list Copilot gave: every panel, what’s missing, and what needs change. We’ve added our view where it adds something.

---

## 1. Strategy panel — needs the most change

**Copilot’s view:** This is the only panel that genuinely needs restructuring. Too long, too dense, too many sections in one place; overwhelming and hard to scan.

**Proposal: split Strategy into 3 sub-tabs:**

| Sub-tab | Content (solicitor-friendly) |
|--------|------------------------------|
| **A. Strategy Overview** | Primary strategy, secondary strategy, blocked routes, risks, next actions, one-sentence rationale |
| **B. Legal Doctrine** | Causation requirement, evidence-based resolution, weapon uncertainty, required findings, evidential limitations (for advanced users) |
| **C. Full Engine Output** | Attack order, counters, reassessment triggers, alternatives, hearing prep, disclosure directions, case management, worst-case exposure (power users) |

**Our view: Agree in principle.** The Strategy panel is dense; splitting by audience (overview vs doctrine vs full output) could reduce overwhelm. We’d need to map existing Strategy UI/data to these three buckets and confirm which fields we actually have (e.g. “blocked routes”, “counters”, “reassessment triggers” may already exist under different names). So: **yes to the idea**, implement once we’ve mapped current content to the three sub-tabs.

---

## 2. Case Overview header (top of page)

As above: allegation, date of incident, client initials, next hearing, disclosure status, strategy selected. **We agree.**

---

## 3. Case Timeline panel

As above: arrest → interview → charge → first hearing → disclosure served → defence actions → next hearing. **We agree (with data-source caveat).**

---

## 4. Missing Documents panel

As above: MG11 (employee), MG11 (passer-by), CCTV log, scene photos, forensics, medical report. **We partially agree** (different from disclosure tracker; do after core improvements).

---

## 5. Quick Actions bar

As above: upload evidence, add client instructions, add hearing, generate letter, add note. **We agree.**

---

## 6. Case Status badge

As above: e.g. Awaiting Disclosure / Pre-PTPH / Strategy Committed. **We agree.**

---

## 7. Disclosure panel — optional improvements

**Copilot:** Already good. Optional: colour coding, group by priority, auto-sort critical → high → satisfied.

**Our view:** Agree these are optional; nice polish once the rest is in place.

---

## 8. Charges panel — optional improvements

**Copilot:** Add “Source document” and “Extracted from charge sheet” so solicitors can trust the extraction.

**Our view:** Agree; small trust/transparency improvement if we have source doc or extraction metadata.

---

## 9–12. Letters, Client instructions, Case files, Safety

**Copilot:** Letters, Client instructions, Case files — good as is. **Safety panel — perfect; do not change.**

**Our view:** No disagreement.

---

# Panel-by-panel verdict table (Copilot)

| Panel | Verdict | Needs change? |
|-------|---------|----------------|
| **Strategy** | Too long, too dense | **YES — major UI restructure (3 sub-tabs)** |
| Summary | Good | Optional improvements |
| Safety | Excellent | **No** |
| Next Steps | Good | No |
| Disclosure | Good | Optional (colour, sort, priority) |
| Charges | Good | Optional (source doc, extraction note) |
| Case Files | Good | No |
| Letters | Good | No |
| Client Instructions | Good | No |
| **Timeline** | Missing | **YES — add** |
| **Case Overview** | Missing | **YES — add** |
| **Quick Actions** | Missing | **YES — add** |
| **Missing Documents** | Missing | **YES — add** |
| **Case Status Badge** | Missing | **YES — add** |

**Bottom line (Copilot):** The Strategy panel is the only thing that truly needs changing; everything else is optional improvements that will make the UI feel more solicitor-friendly and professional.

**Our bottom line:** We agree. Prioritise: (1) Strategy sub-tabs once content is mapped, (2) Case Overview + Case Status + Quick Actions, (3) Timeline (with clear data sources), (4) Optional Disclosure/Charges polish, (5) Missing Documents as a later enhancement.
