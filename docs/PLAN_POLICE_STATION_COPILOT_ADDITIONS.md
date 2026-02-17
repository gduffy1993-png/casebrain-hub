# Plan: Police Station – Copilot-suggested additions

## What we already have
- Date of arrest, Offence alleged, Matter stage  
- Brief summary, Grounds for arrest  
- Custody clock (time in custody, next PACE review)  
- Interview stance, Bail return/outcome  
- Matter closed (date + reason)  
- Create matter (page) / Save changes (tab)  
- List of police station matters; open → case  
- Suggested next steps when summary/grounds filled  

---

## What Copilot says is missing (and we agree would help)

| # | Addition | Purpose |
|---|----------|--------|
| 1 | **Custody number** (optional) | Link to custody records; solicitors often track by this before charge |
| 2 | **Police station name** (optional) | e.g. Bury, Middleton, Central Park – standard in real station work |
| 3 | **Client initials** + **Year of birth** (optional) | Identify the matter without full name; privacy-safe |
| 4 | **Representation type** | Duty / Own client / Telephone only / Attendance |
| 5 | **Risk / support needs** (tick boxes) | Appropriate Adult, Interpreter, Mental Health, Medical issues – feeds later case work |
| 6 | **Initial disclosure received** | Yes/No + notes (MG5, CCTV, interview plan, etc.) – ties into strategy later |
| 7 | **“Move to Case File”** (after charge) | When matter stage = Charged, show clear CTA to go to the case (e.g. open case and default to Strategy tab) |

---

## Where these live

- **Police station page** (New matter form): add all new fields so new matters can be created with full detail.  
- **Police station tab** (inside a case): add the same fields so existing cases can be edited and stay in sync.  
- **Matter API** (`GET/PATCH /api/criminal/[caseId]/matter`): return and accept the new fields.  
- **Create-matter API** (`POST /api/criminal/matters`): accept new fields in the payload and persist them on `criminal_cases`.  

So: **one schema, one API, two UIs** (page form + tab form).

---

## Data model (criminal_cases)

All new columns on `criminal_cases` (single source of truth for matter/station data).

| Field | Type | Notes |
|-------|------|--------|
| `custody_number` | TEXT, nullable | Optional |
| `police_station_name` | TEXT, nullable | Free text for now; dropdown later if we add a list |
| `client_initials` | TEXT, nullable | e.g. "AB" |
| `client_yob` | INTEGER, nullable | Year of birth only (e.g. 1990) |
| `representation_type` | TEXT, nullable | One of: duty \| own_client \| telephone_only \| attendance |
| `risk_appropriate_adult` | BOOLEAN, default false | |
| `risk_interpreter` | BOOLEAN, default false | |
| `risk_mental_health` | BOOLEAN, default false | |
| `risk_medical_issues` | BOOLEAN, default false | |
| `initial_disclosure_received` | BOOLEAN, nullable | Yes/No |
| `initial_disclosure_notes` | TEXT, nullable | |

“Move to Case File” is **no new column** – it’s a UI button shown when `matter_state === 'charged'` that links to the case (and optionally sets default tab to Strategy).

---

## UI placement (same order on page and tab)

Suggested order so the form stays consistent and solicitor-friendly:

1. **Identity / matter**
   - Client initials  
   - Year of birth (optional)  
   - Custody number (optional)  
   - Police station name (optional)  

2. **Arrest / allegation** (existing)
   - Date of arrest  
   - Offence alleged  
   - Matter stage  

3. **Representation**
   - Representation type (dropdown: Duty, Own client, Telephone only, Attendance)  

4. **Risk / support needs**
   - Tick boxes: Appropriate Adult, Interpreter, Mental Health, Medical issues  

5. **Disclosure**
   - Initial disclosure received (Yes / No)  
   - Initial disclosure notes (textarea, optional)  

6. **Rest as now**
   - Brief summary, Grounds for arrest  
   - Suggested next steps  
   - Station pack upload, Custody clock, Interview stance  
   - Speak/no comment callout  
   - Bail return/outcome  
   - Save / Create matter  
   - Matter closed  
   - Request paperwork  

7. **After charge**
   - When matter stage = Charged: show a clear **“Move to Case File”** (or “Open case”) button that goes to the case (e.g. ` /cases/[id]?tab=strategy` or just “Open case” that goes to the case default tab).  

---

## Implementation order (no code in this doc – just sequence)

1. **Migration**  
   Add the new columns to `criminal_cases` (custody_number, police_station_name, client_initials, client_yob, representation_type, four risk booleans, initial_disclosure_received, initial_disclosure_notes).  

2. **Matter API**  
   - GET: include new fields in `station` or a new `stationDetails` (or keep flat in `station`).  
   - PATCH: accept and persist them.  

3. **Create-matter API**  
   Accept new fields in the JSON body and write them to `criminal_cases` on create.  

4. **Police station page**  
   Add the new inputs to the “New matter” form in the same order as above; submit them in the create-matter payload.  

5. **Police station tab**  
   Add the same fields to the single card form; load/save via matter API.  

6. **“Move to Case File”**  
   When `matter_state === 'charged'`, show a prominent button (e.g. “Open case” / “Move to case file”) that links to `/cases/[caseId]?tab=strategy` (or to the case without tab so default tab applies). On the **page**, “Open” already exists in the list; we can add a small inline CTA after “Create matter” when editing a matter that’s charged, or we only show “Move to Case” in the **tab** when you’re viewing a charged matter. Decision: show “Move to Case File” in the **tab** when matter stage is Charged (and optionally on the page list row for charged matters).  

---

## Summary

- **7 additions**: custody number, police station name, client initials + YoB, representation type, risk tick boxes, initial disclosure (yes/no + notes), “Move to Case File” button when charged.  
- **One schema** (new columns on `criminal_cases`), **one API** (matter GET/PATCH + create-matter POST), **two UIs** (page + tab) with the same field order and behaviour.  
- No code in this doc – this is the plan to implement next once you’re happy with it.
