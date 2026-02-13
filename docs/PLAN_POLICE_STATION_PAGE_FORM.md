# Plan: Police station page = full form + list

## Problem
The Police station **page** (/police-station) only shows a list (or empty state “Go to Cases”). All the inputs (date of arrest, offence, summary, grounds, custody, interview stance, bail, etc.) live inside a **case’s** Police station **tab**. User wants to fill everything in **on the Police station page** without opening a case first.

## Goal
- **Police station page** = one place with:
  1. **Full form** at the top: date of arrest, offence alleged, matter stage, brief summary, grounds for arrest, custody clock, interview stance, bail return/outcome, matter closed (everything we discussed).
  2. **Suggested next steps** when summary/grounds (or key fields) are filled.
  3. **“Create matter”** (or “Save as new matter”): creates a case, saves all form data to that case’s matter, adds it to the list.
  4. **List below**: existing police station matters (at_station / bailed / rui). Click row → open that case (optional: could open with Police station tab and/or load that case’s data into the form for edit).

No separate “go to Cases first” step; everything is fill-in here, then create matter.

---

## 1. Page layout (Police station page)

- **Header:** “Police station” + subtitle (unchanged).
- **Section 1 – New matter / form**
  - Card with all fields (same as current Police station **tab**):
    - Date of arrest (date)
    - Offence alleged (text)
    - Matter stage (dropdown: Not set, At station, Bailed, RUI, Charged, …)
    - Brief summary (textarea)
    - Grounds for arrest / key circumstances (textarea)
    - Custody clock: time in custody (datetime-local), next PACE review (datetime-local)
    - Interview stance (dropdown)
    - Bail return date (date), Bail outcome (dropdown)
    - Matter closed date, reason (if needed)
  - When summary or grounds have content → show **Suggested next steps** card (same content as in tab).
  - Buttons: **“Create matter”** (primary), optional “Clear form”.
- **Section 2 – Existing matters**
  - “Police station matters” list (current list: at_station, bailed, rui). Each row: title, matter state badge, last updated, “Open”.
  - Empty state only for the list: “No matters yet. Fill in the form above and click Create matter.”

No Upload or Intake on this page.

---

## 2. Create matter flow

- **“Create matter”** clicked:
  1. Validate: at least one of offence alleged, brief summary, or grounds (so we have something to name the case).
  2. **POST** create case: e.g. `POST /api/cases` or new `POST /api/criminal/matters` that:
     - Creates a row in `cases` (title e.g. “Police station – [offence] – [date of arrest]” or “Police station – [date]” if no offence).
     - Creates/updates `criminal_cases` and sets: matter_state, date_of_arrest, alleged_offence, station_summary, grounds_for_arrest, time_in_custody_at, next_pace_review_at, interview_stance, bail_return_date, bail_outcome, matter_closed_at, matter_closed_reason (all from form).
  3. On success: either redirect to the new case with `?tab=police-station`, or stay on Police station page and refresh the list so the new matter appears; optionally clear the form or leave it for “add another”.
- **Existing list:** “Open” → go to `/cases/[id]?tab=police-station` (same as now). No need to load form from case on this page for v1; opening the case is enough.

---

## 3. API

- **Option A – Extend existing**
  - `POST /api/cases` with body e.g. `{ title?, practiceArea: "criminal", matter: { ... } }` to create case and write matter fields in one go. If `POST /api/cases` already exists and is generic, add optional `matter` and create `criminal_cases` row with that data.
- **Option B – New endpoint**
  - `POST /api/criminal/matters` (or `POST /api/cases/from-police-station`): creates `cases` row + `criminal_cases` row with all matter/station fields; returns `{ caseId, title }`. Front-end then redirects or refreshes list.

Prefer reusing case creation if possible; otherwise add a dedicated “create criminal matter from police station form” endpoint.

---

## 4. Fields to include (single source of truth)

Same as Police station **tab**:

| Field              | Type / UI              | Stored (criminal_cases)   |
|--------------------|------------------------|----------------------------|
| Date of arrest     | date                   | date_of_arrest            |
| Offence alleged    | text                   | alleged_offence           |
| Matter stage       | dropdown               | matter_state              |
| Brief summary      | textarea               | station_summary           |
| Grounds for arrest | textarea               | grounds_for_arrest        |
| Time in custody    | datetime-local         | time_in_custody_at        |
| Next PACE review   | datetime-local         | next_pace_review_at       |
| Interview stance   | dropdown               | interview_stance          |
| Bail return date   | date                   | bail_return_date          |
| Bail outcome       | dropdown               | bail_outcome              |
| Matter closed date | date                   | matter_closed_at          |
| Matter closed reason| text                  | matter_closed_reason      |

Suggested next steps (UI only, when summary/grounds filled): same bullets as in tab.

---

## 5. Implementation order

1. **API:** Add endpoint to create a case + criminal_cases matter from one payload (or extend `POST /api/cases` with optional matter data).
2. **Police station page:** Refactor into two sections:
   - Section 1: full form (all fields above) + Suggested next steps + “Create matter” / “Clear form”.
   - Section 2: existing list of police station matters (reuse current list UI and `/api/cases?view=police_station`).
3. **Create matter:** On submit, call new (or extended) API; on success, refresh list and optionally redirect to new case with `?tab=police-station` or show success + clear form.
4. **No Upload/Intake** on this page (already removed).

---

## 6. Out of scope for this iteration

- Editing an existing matter’s data from this page (open case → edit in tab is enough).
- Upload of documents from this page (still from inside the case).
