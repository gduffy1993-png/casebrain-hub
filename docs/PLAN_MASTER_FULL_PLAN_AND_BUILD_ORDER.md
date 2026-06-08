# Full plan and build order

One place for **what we’re building** and **the order we’re building it**. Detailed specs stay in the other plan docs; this is the master view.

---

# Part 1: The full plan (what we’re building)

## A. Police station (intake + Copilot additions)

**Already done**
- Police station **page**: full form (date of arrest, offence, matter stage, summary, grounds, custody clock, interview stance, bail, matter closed) + Create matter + list of matters.
- Police station **tab** (inside case): same layout as page, one card, Save changes.
- **POST /api/criminal/matters**: creates case + criminal_cases from form.
- **GET/PATCH /api/criminal/[caseId]/matter**: reads/writes all current station fields.

**Planned (Copilot additions)**
1. **Custody number** (optional)
2. **Police station name** (optional)
3. **Client initials** + **Year of birth** (optional)
4. **Representation type** (Duty / Own client / Telephone only / Attendance)
5. **Risk / support needs** (tick boxes: Appropriate Adult, Interpreter, Mental Health, Medical issues)
6. **Initial disclosure received** (Yes/No + notes)
7. **“Move to Case File”** button when matter stage = Charged (link to case, e.g. Strategy tab)

**Where:** Same fields on Police station **page** form and Police station **tab**; one schema on `criminal_cases`, matter API + create-matter API.

**Ref:** `docs/PLAN_POLICE_STATION_COPILOT_ADDITIONS.md`

---

## B. Case page – Case Overview (top of page)

**Goal:** One block **above** Summary / Strategy / Safety so the solicitor is oriented without opening panels.

**Six blocks (Copilot); we prefer a compact variant first:**

1. **Case Snapshot** – Offence, date of incident, client initials, police station, next hearing, **case status** (e.g. Awaiting Disclosure / Pre-PTPH / Strategy Committed), disclosure counts (Critical: X · High: Y · Satisfied: Z).
2. **Quick Actions bar** – Upload evidence, Add client instructions, Add hearing, Generate letter, Add note.
3. **Key Evidence Summary** (optional / later) – “MG5 present”, “Charge sheet present”, etc. (needs doc-type or tagging).
4. **Missing Evidence (case file)** (optional / later) – MG11s, CCTV log, scene photos, forensics, medical report.
5. **Missing Disclosure summary** (optional / later) – Critical & high items from Safety panel.
6. **Strategy Snapshot** (optional / later) – Primary, secondary, blocked, risks, next actions from Strategy.

**Our approach:** Ship **Case Snapshot + Case Status + Quick Actions** as the first row; add 3–6 as a second row or expandable “Overview” section when we’re ready.

**Ref:** `docs/PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (Case Overview – full proposed layout + our view).

---

## C. Case page – Timeline panel

**Goal:** One panel: Arrest → Interview → Charge → First hearing → Disclosure served → Defence actions → Next hearing.

**Needs:** Clear data sources for each event (e.g. date_of_arrest, first hearing from hearings, charge from matter_state or date field). Build once we’ve defined where each date comes from.

**Ref:** `docs/PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md`

---

## D. Case page – Strategy panel restructure

**Goal:** Reduce overwhelm by splitting Strategy into **3 sub-tabs**:
- **A. Strategy Overview** – Primary, secondary, blocked routes, risks, next actions, one-sentence rationale.
- **B. Legal Doctrine** – Causation, evidence-based resolution, weapon uncertainty, required findings, evidential limitations.
- **C. Full Engine Output** – Attack order, counters, reassessment triggers, alternatives, hearing prep, disclosure directions, case management, worst-case exposure.

**Needs:** Map existing Strategy UI/data to these three buckets, then implement.

**Ref:** `docs/PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (Strategy panel – needs the most change).

---

## E. Case page – Optional polish

- **Disclosure panel:** Colour coding, group by priority, auto-sort critical → high → satisfied.
- **Charges panel:** “Source document”, “Extracted from charge sheet”.
- **Missing Documents panel:** Case file checklist (MG11s, CCTV log, scene photos, forensics, medical report) – can live in Case Overview or as its own panel.
- **Key Evidence Summary:** “MG5 present”, etc., when we have doc-type detection or tagging.

**Ref:** `docs/PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (panel verdict table).

---

# Part 2: Build order (when we build it)

We build in **phases**. Each phase is shippable on its own.

---

## Phase 1: Police station Copilot additions

**Goal:** Add the 7 missing fields and “Move to Case File” so the Police station flow is solicitor-complete.

| Step | What | Notes |
|------|------|--------|
| 1.1 | **Migration** | Add to `criminal_cases`: custody_number, police_station_name, client_initials, client_yob, representation_type, risk_appropriate_adult, risk_interpreter, risk_mental_health, risk_medical_issues, initial_disclosure_received, initial_disclosure_notes. |
| 1.2 | **Matter API** | GET: return new fields (e.g. in station or flat). PATCH: accept and persist them. |
| 1.3 | **Create-matter API** | POST /api/criminal/matters: accept new fields in body and write to criminal_cases on create. |
| 1.4 | **Police station page** | Add new inputs to “New matter” form in agreed order (identity → arrest → representation → risk → disclosure → rest). Submit in create-matter payload. |
| 1.5 | **Police station tab** | Add same fields to the single card; load/save via matter API. |
| 1.6 | **“Move to Case File”** | In Police station tab (and optionally list row), when matter_state === Charged, show button linking to `/cases/[id]?tab=strategy` (or case default). |

**Ref:** `PLAN_POLICE_STATION_COPILOT_ADDITIONS.md`

---

## Phase 2: Case Overview (first row) + Case Status + Quick Actions

**Goal:** Top-of-page orientation and actions without changing existing panels.

| Step | What | Notes |
|------|------|--------|
| 2.1 | **Case Snapshot** | One strip: offence (from charges), date of incident (from criminal_cases or intake), client initials, police station, next hearing (from hearings), **case status** (derived: Awaiting Disclosure / Pre-PTPH / Strategy Committed etc.), disclosure counts (Critical / High / Satisfied). Data from existing APIs/tables. |
| 2.2 | **Case Status badge** | Derive one label from matter_state + disclosure state + strategy committed; show in Snapshot or next to it. |
| 2.3 | **Quick Actions bar** | Horizontal bar: Upload evidence, Add client instructions, Add hearing, Generate letter, Add note. Wire to existing actions or routes. |

**Ref:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (Case Overview – our compact variant).

---

## Phase 3: Case Overview (second row or expandable)

**Goal:** Add the rest of the overview without overloading the fold.

| Step | What | Notes |
|------|------|--------|
| 3.1 | **Strategy Snapshot** | Primary, secondary, blocked, risks, next actions – pull from existing Strategy data. Show in second row or “Expand overview”. |
| 3.2 | **Missing Disclosure summary** | Critical & high from Safety panel – surface at top. |
| 3.3 | **Missing Evidence (case file)** | Checklist (MG11s, CCTV log, scene photos, forensics, medical). Needs simple model (e.g. checklist per case) or fixed list. Can be same as “Missing Documents” panel. |
| 3.4 | **Key Evidence Summary** | “MG5 present”, “Charge sheet present”, etc. Only after we have doc-type or tagging (or manual “document type” on upload). |

**Ref:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md`

---

## Phase 4: Timeline panel

**Goal:** One panel with key case events in order.

| Step | What | Notes |
|------|------|--------|
| 4.1 | **Define events and data sources** | Arrest (date_of_arrest), Interview (from station or placeholder), Charge (matter_state change or date), First hearing (hearings table), Disclosure served (disclosure tracker?), Defence actions (from Next steps or strategy?), Next hearing (hearings). |
| 4.2 | **Timeline UI** | Single panel, chronological list or visual timeline; read-only from existing data. |

**Ref:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md`

---

## Phase 5: Strategy panel – 3 sub-tabs

**Goal:** Split Strategy into Overview / Legal Doctrine / Full Engine Output so it’s scannable.

| Step | What | Notes |
|------|------|--------|
| 5.1 | **Map content to sub-tabs** | List existing Strategy fields and which sub-tab they belong to (Overview vs Doctrine vs Full Output). |
| 5.2 | **Implement sub-tabs** | Tabs or sections: A. Strategy Overview, B. Legal Doctrine, C. Full Engine Output. Reuse existing data; no new backend required for v1. |

**Ref:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (Strategy panel).

---

## Phase 6: Optional polish

**Goal:** Nice-to-haves that improve trust and clarity.

| Step | What | Notes |
|------|------|--------|
| 6.1 | **Disclosure panel** | Colour coding, group by priority, auto-sort critical → high → satisfied. |
| 6.2 | **Charges panel** | “Source document”, “Extracted from charge sheet” (if we have the metadata). |
| 6.3 | **Anything else** | Missing Documents as standalone panel if not already in Overview; Key Evidence Summary when doc-type exists. |

**Ref:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md` (verdict table).

---

# Part 3: Summary table

| Phase | What we ship | Depends on |
|-------|----------------|------------|
| **1** | Police station: 7 new fields + Move to Case File | Migration, matter API, create-matter API, page + tab UI |
| **2** | Case Overview first row (Snapshot + Status + Quick Actions) | Existing case/charges/hearings/disclosure/strategy data |
| **3** | Case Overview second row / expandable (Strategy snapshot, Missing disclosure, Missing evidence, Key evidence when ready) | Phase 2; optional doc-type for Key Evidence |
| **4** | Timeline panel | Defined event list and data sources |
| **5** | Strategy panel 3 sub-tabs | Content mapping from current Strategy |
| **6** | Disclosure/Charges polish, Missing Documents, Key Evidence (if not in 3) | Phases 2–3 |

---

# Reference to other docs

- **Police station form + create flow:** `PLAN_POLICE_STATION_PAGE_FORM.md`  
- **Police station Copilot additions (fields, schema, order):** `PLAN_POLICE_STATION_COPILOT_ADDITIONS.md`  
- **Case page improvements + Case Overview layout + Strategy split + verdict table:** `PLAN_CASE_PAGE_COPILOT_IMPROVEMENTS.md`  

This doc is the **single place** for the full plan and the order we’re going to build it.
