# Real Case & PDFs — Plan (no code)

**What a real criminal case looks like in a solicitor’s hands, how the documents fit in, and how CaseBrain would apply them.**  
Planning only; we’ll finish the other plan (master / Phase C / rollout) separately. For now the focus is: understand the real workflow, then run some cases.

---

## 1. What a real case actually looks like

### 1.1 Typical life of a criminal matter

- **First contact** — Client arrested or reported; may be at police station, or charged and bailed. Solicitor gets a phone call or referral.
- **Police station** — If still in custody: attendance, advice, possibly interview. Documents here: custody record, MG4/MG5 (or equivalent), maybe early disclosure note, interview record.
- **Charge / first court** — Charge sheet, initial disclosure (often MG6 series, schedule of non-sensitive, maybe first batch of unused). First hearing: allocation, plea, bail variation, disclosure orders.
- **Progression** — Further disclosure (MG6C, schedules, exhibits), witness statements (MG11 or similar), CCTV lists and then footage, forensics, phone downloads, medical. More hearings: PCMH, trial prep, trial.
- **Resolution** — Guilty plea and sentence, or trial (acquittal/conviction), or discontinuance, or abuse of process.

So the **matter** is one spine (same client, same incident); the **documents** arrive in waves. The solicitor’s job is to keep a clear picture of: prosecution case, our case, what’s disputed, what’s missing, what we’re doing next.

### 1.2 The kinds of PDFs / files they actually get

Roughly in the order they often appear:

| When | Typical documents (names / types) | What the solicitor does with them |
|------|------------------------------------|-----------------------------------|
| Police station | Custody record, MG4/MG5, interview record (or summary), disclosure note | Note first account, vulnerabilities, what was disclosed at station, what wasn’t |
| Charge / first hearing | Charge sheet, MG5 (case summary), initial disclosure schedule (MG6), maybe MG11s | Build picture of prosecution case; spot missing basics (MG5, custody, interview); list disclosure to chase |
| Post-charge | MG6C, exhibit lists, witness statements (MG11), CCTV list, forensic request/report, phone download summary | Feed into Key Facts (people, times, evidence); flag what Safety expects (CCTV continuity, forensics); feed Strategy (angles, disclosure as weapon) |
| Pre-trial | Full bundle, unused material schedules, defence statements, final disclosure | Align agreed summary and case theory; prep hearing (say/ask/challenge/request); pressure dashboard for anything still missing |

So in practice:

- **One case = one matter**, with many **documents** added over time.
- Documents are **heterogeneous**: charge sheet, narrative (MG5), lists (MG6), statements (MG11), custody, interview, specialist (CCTV, forensics, phone).
- The solicitor **doesn’t “apply” one file once** — they keep re-using the same case: new PDFs get **added**; the system should **update** summary, key facts, safety, strategy from the **current set** of files.

---

## 2. How these files “apply” in practice

### 2.1 Intake / first drop

- **Scenario:** Solicitor gets first bundle (e.g. MG5 + charge sheet + initial disclosure list). They upload PDFs (or one combined PDF).
- **What should happen (plan):**
  - System infers **criminal** (e.g. from names: MG5, disclosure, custody, police, criminal).
  - Creates **one case**; attaches documents; runs extraction (narrative, charges, dates, people, disclosure mentions).
  - Writes into **criminal_cases** (and case meta): charges, key facts, custody present/missing, disclosure items.
  - **Summary** gets first cut (narrative in summary; discrete facts in Key Facts with source e.g. “From MG5”).
  - **Safety** gets initial state: e.g. MG5 ✓, custody record ?, initial disclosure list ✓; missing items flagged.
  - **Strategy** gets a first pass: case theory one-liner, angles, disclosure pressure from what’s missing.

So the **first batch of PDFs** doesn’t just “sit there” — they **create** the case and **populate** Summary, Key Facts, Safety, Strategy. The solicitor sees one place that already reflects “what we have and what we’re missing.”

### 2.2 Adding more PDFs later (second drop, disclosure, statements)

- **Scenario:** CPS sends more: MG11s, CCTV list, forensic report. Solicitor uploads into the **same case**.
- **What should happen (plan):**
  - New documents are **added** to the case (no new case).
  - **Re-extraction or incremental extraction** (plan): narrative, key facts, and Safety inputs are updated from **all** documents (or from new + existing). So:
    - Key Facts grow: new people, new times, new evidence (CCTV, forensics), new disclosure items.
    - **Safety** re-runs with “bundle mentioned topics” (e.g. CCTV, forensics) so it can flag “CCTV Full Window”, “Forensic report”, etc., and show what’s still missing.
    - **Strategy** can be refreshed: defence angles and disclosure-as-weapon updated from new facts.
  - **Agreed summary / case theory** stay under solicitor control: they can **edit** or **re-agree** after reviewing new material (or use chat “propose” then Agree/Edit/Reject).

So **later PDFs** = **add to the same case**, and the app **updates** the single source of truth (summary, key facts, safety, strategy) so the solicitor always sees the **current** picture.

### 2.3 What “running” the case means day to day

- **Opening the case** — One place: Summary (solicitor buckets, agreed summary, case theory), Key Facts (hierarchy, source tags), Safety (missing items, why they matter), Strategy (one-liner, timeline, pressure), Disclosure tab (pressure dashboard), Chat (grounded on all of the above).
- **After new disclosure** — Upload new PDFs → system updates key facts and Safety; solicitor reviews Summary/Strategy, may tweak agreed summary or case theory; runs Hearing Prep if a hearing is coming.
- **Before a hearing** — Use Hearing Prep (say/ask/challenge/request, disclosure to push, risks); use Strategy Timeline (now / waiting / next); use Chat (“What should I ask about the CCTV?”, “Summarise disclosure gaps”).
- **Verdict loop** — Rate summary/chat/strategy; record what was agreed when; change list feeds back into context so next time the system is better aligned.

So **running cases** = **using** that one case view repeatedly: add PDFs when they arrive, let the system update the model of the case, and use Summary / Safety / Strategy / Disclosure / Chat / Hearing Prep as the daily workspace.

---

## 3. Mapping document types → CaseBrain (conceptual)

| Document type / name | Primary use in CaseBrain | Notes |
|----------------------|--------------------------|--------|
| MG5 / case summary | Narrative → Summary; facts → Key Facts; source “From MG5” | Core prosecution narrative |
| Charge sheet | Charges, dates → case meta; offence → Strategy | Drives offence elements, leverage |
| Custody record | Safety (present/missing); times, conditions → Key Facts | Early phase, carry to court if linked |
| Interview record / summary | First account → Key Facts, Strategy (angles, no-case) | Critical for defence |
| MG6 / disclosure schedules | Disclosure items → Safety, Key Facts (Disclosure), pressure dashboard | What’s been served, what’s missing |
| MG11 / statements | People, events, evidence → Key Facts; content → Strategy | Source tag “From MG11” |
| CCTV list / report | Key Facts (evidence); Safety (CCTV continuity, full window); Strategy (disclosure weapon) | Topic “CCTV” drives Safety checks |
| Forensic report | Key Facts; Safety (forensic report item); Strategy | Topic “forensics” drives Safety |
| Phone download / summary | Key Facts; disclosure; Strategy | Same idea as above |
| Defence statement / response | Agreed position → agreed summary / case theory (solicitor maintains) | Canonical “our case” |

So the **plan** is: real cases are built from **many PDFs over time**; each type has a **role** (narrative, charges, facts, disclosure, safety checks, strategy); CaseBrain should **ingest** and **update** from the current set so the solicitor always has one coherent view.

---

## 4. Order of operations (when we implement PDF flow properly)

No code here — just the intended sequence so it matches real practice:

1. **Create case** — From first upload (or intake): infer criminal, create case + criminal_cases row, attach docs.
2. **First extraction** — Narrative + key facts + charges + disclosure mentions; persist to case meta; run Safety (with bundle topics from key facts); run Strategy (seeds from key facts, case theory from agreed summary if set).
3. **Display** — Summary (buckets, agreed summary, case theory), Key Facts (hierarchy, sources), Safety, Strategy, Disclosure pressure, Chat (grounded).
4. **Later uploads (same case)** — Add documents; re-run or incremental extraction so key facts and Safety reflect **all** docs; optional refresh of Strategy; solicitor can re-agree summary/theory.
5. **Ongoing** — Hearing Prep, Timeline, Chat, Verdict loop all operate on the **current** case state (summary, key facts, safety, strategy).

---

## 5. Running some cases (for now)

Without building new PDF logic yet, you can **run some cases** to stress-test the current build:

- **Use existing cases** — Open criminal matters you already have; add evidence (PDFs) via the existing upload / Add Evidence flow; check that Summary, Key Facts, Solicitor Buckets, Safety, Strategy, Disclosure pressure, Agreed Summary, Hearing Prep, Timeline, and Chat all behave sensibly with the documents you have.
- **Create new cases from intake** — If you have an intake flow (e.g. upload a PDF that looks like MG5/disclosure/custody), create a new case and then add more PDFs to it; see how extraction and Safety/Strategy respond.
- **Realistic filenames** — When testing, use names that hint criminal (e.g. “MG5.pdf”, “disclosure_schedule.pdf”, “custody_record.pdf”) so inference and any topic-based Safety (CCTV, forensics) get the right signals where implemented.

That gives you a **plan** for how real cases and PDFs fit together, and a **way to run cases** with the current app while we finish the other plan and any follow-on PDF/ingestion work.

---

*Plan only; no code. Other plan (master / Phase C / rollout) to be finished separately.*
