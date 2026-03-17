# Fictional GBH Solicitor Bundle — Plan (no code)

**Goal:** Picture one **thick** fictional bundle (GBH, fake names) **start to finish** — what’s in it, how it looks, how we’d make it. Then plan **tricky details** buried in the PDFs to test whether the app notices. No real names; planning only.

---

## 1. The case in one paragraph (fiction)

**R v [Defendant]** — Allegation: Section 20 GBH (or S18 if we want higher stakes). Prosecution say: defendant and victim had a dispute outside a takeaway; defendant punched victim, victim fell and hit head on kerb; serious injury. Defence: self-defence / mistaken identity / dispute over what happened. One main prosecution witness (friend of victim), one independent (takeaway staff), CCTV mentioned in the MG5 but not fully described in the disclosure schedule, custody record and interview present. We’ll plant a few **deliberate inconsistencies or easy-to-miss details** and see if the app picks them up.

---

## 2. Bundle structure: start to finish (what it looks like)

Assume a single **combined PDF** or a **folder of PDFs** that together form “the bundle” a solicitor would receive. All fake names and places.

### Cover + index (1–2 pages)

- **Cover:** “Crown Prosecution Service — Case papers. R v [Surname]. GBH s.20. [Court]. Listed [date].”
- **Index:** List of documents with page numbers (so we know what “should” be there and what’s missing). Items: Charge sheet, MG5, Custody record, MG6(a), MG6(c), Witness statements (MG11) — [W1], [W2], Disclosure schedule, CCTV list, Exhibit list.

*Tricky idea:* Index lists “CCTV continuity statement” but we **don’t** include that document in the bundle — test: does Safety flag “CCTV Continuity” as missing when CCTV is mentioned in the case?

---

### Charge sheet (1 page)

- Defendant: **Jordan Pike** (DOB, address — fictional).
- Charge: “Section 20 OAPA 1861 — Grievous Bodily Harm”. Date of offence: **14 March 2024**. Court, date of charge, bail status.
- Plea: Not guilty (or “to be entered”).

*Tricky idea:* Use a **different date** somewhere else (e.g. MG5 says “evening of 15 March” or witness says “Friday 15th”). One place says “14 March 2024”, another says “15 March 2024” — test: does the app surface a **date inconsistency** in Key Facts or timeline?

---

### MG5 — Case summary (3–4 pages)

- Prosecution narrative: incident outside **Aroma Kebab**, High Street, [Town]. Time “around 23:00–23:30”. Victim **Casey Webb** with friend **Morgan Drew**. Defendant **Jordan Pike** and victim had words; Pike punched Webb; Webb fell, head struck kerb; ambulance, hospital, serious injury (fracture / laceration — GBH level).
- **CCTV:** “CCTV from Aroma Kebab and surrounding premises has been requested. Footage from 22:45 to 23:45 has been secured.” So the **narrative** says CCTV exists and a time window — but we’ll decide later whether the **disclosure schedule** actually lists it or not (to test Safety).
- **Witnesses:** Morgan Drew (friend, present throughout); staff at Aroma Kebab (one named **Samir Patel** in the MG5). Maybe one line: “A second customer, **Tina Walsh**, was present but left before the police arrived.” — **Easy to miss** name; test: does Key Facts pull “Tina Walsh” as a person?
- **Forensics:** One sentence: “Forensic samples were taken from the scene; forensic report is awaited.” — Test: does the app flag “Forensic report” in Safety when “forensic” is mentioned?
- **999 call:** “Emergency services were called; 999 call and CAD log are retained.” — Test: does Safety flag 999 / CAD if we **don’t** list them as served in MG6?

*Tricky ideas already in this section:*
- Date: we can make MG5 say “evening of **15** March” while charge sheet says “**14** March” — inconsistency.
- Tina Walsh — mentioned once in a long paragraph; does extraction pick her up?
- CCTV / forensic / 999 mentioned in narrative → Safety should want them; if we omit from disclosure list, they should stay “missing”.

---

### Custody record (2–3 pages)

- Standard custody record layout: arrest time, place, detention clock, meals, rest, legal visit (solicitor attended), interview time, charge time, release.
- Defendant: Jordan Pike. Arrest: 15 March 2024, 00:45 (so early hours after the incident). Interview: 15 March, 04:00–04:45. No comment / or short comment (we choose).
- So we have a **custody record** — PACE extractor should mark “custody record: present”. If we **removed** this doc from the bundle, we’d expect “custody record: missing”.

*Tricky idea:* In the custody record, one small note: “Detained requested copy of custody CCTV. Not yet provided.” — Test: does anything flag “Custody CCTV” as outstanding disclosure?

---

### MG6(a) / Initial disclosure (1–2 pages)

- Schedule of initial disclosure: MG5 (served), Charge sheet (served), Custody record (served), Witness statements — Morgan Drew, Samir Patel (served). Exhibit list (served). **CCTV:** “CCTV from Aroma Kebab — 22:45–23:45 — requested from premises; awaiting.” So we **do** mention CCTV but as “awaiting” — test: app should still want “CCTV Full Window” and “CCTV Continuity” until actually served.
- We **don’t** list: 999 call audio, CAD log, BWV, Forensic report. So Safety should flag those if it derives “999/CAD/forensic” from Key Facts or narrative.

*Tricky idea:* MG6 lists “CCTV — Aroma Kebab — 22:45–23:45” but MG5 said “22:45 to 23:45” — same. In **one** MG11 we could write a slightly different window: “I saw the incident between about **23:10 and 23:30**.” So we have “full window” 22:45–23:45 and “incident window” 23:10–23:30 — test: does the app surface that the **incident** is a subset (useful for disclosure pressure: “we need the full window”)?

---

### Witness statements — MG11 (3–5 pages each, so “thick”)

**MG11 — Morgan Drew**

- Full statement: friend of victim, was there, saw defendant punch victim, victim fell, hit head. Time “around 23:15”. Location: outside Aroma Kebab. No other witnesses named except “someone from the shop came out after.”
- *Tricky:* Don’t mention Tina Walsh here — she’s only in MG5. So the “second customer” is only in one place.

**MG11 — Samir Patel**

- Staff at Aroma Kebab. Saw disturbance; saw someone on the floor; called police. Time “about 23:20”. Says “CCTV covers the front; we keep it for 28 days.” So **CCTV** is mentioned again — reinforces that Safety should care about CCTV continuity/full window.
- *Tricky:* One line: “The man who was on the floor had been in earlier with a woman; she left before the fight.” — We could give that woman a name only here: “I think her name was **Tina**.” So “Tina” appears in one statement, “Tina Walsh” in MG5 — test: does the app link or at least list both?

**MG11 — (Optional) Police officer**

- Short statement: attended scene, arrested defendant, viewed CCTV at scene (so BWV or body-worn mentioned). If we mention BWV here but **don’t** list BWV in MG6 as served — test: Safety should flag BWV as missing.

---

### CCTV list (1 page)

- “CCTV — Aroma Kebab. Date: 14/15 March 2024. Time window: 22:45–23:45. Exhibit ref: CCTV-001. Status: Requested; copy to be served.”
- So we have a **CCTV list** but not the actual footage or a **continuity statement**. Test: Safety should still want “CCTV Continuity” and “CCTV Full Window” (if we treat “to be served” as not yet served).

---

### Exhibit list (1 page)

- List of exhibits: MG5, MG11 (Drew), MG11 (Patel), Custody record, CCTV list, (no forensic report yet, no 999/CAD/BWV if we want them missing). So the **exhibit list** doesn’t include 999 audio or CAD — reinforces that they’re “missing” for Safety.

---

### What we deliberately omit (to test the app)

- **Not included:** 999 call audio, CAD log, BWV, Forensic report, CCTV continuity statement, Custody CCTV (we only mention “requested” in custody record). So the bundle is **realistic**: some things are said to exist or be requested but aren’t in the pack. We want the app to:
  - List these as **missing** in Safety / Disclosure.
  - Use them in **Strategy** as disclosure pressure / “disclosure as weapon”.
  - Optionally flag in Key Facts (e.g. “Forensic report awaited”, “999 call retained but not served”).

---

## 3. Tricky details — summary (what we plant, what we test)

| What we plant | Where | What we’re testing |
|---------------|--------|---------------------|
| **Date inconsistency** | Charge sheet: 14 March. MG5 or witness: 15 March. | Timeline / Key Facts: does the app surface two different dates? |
| **Tina Walsh** | MG5: one line “Tina Walsh was present but left.” MG11 Patel: “woman, I think her name was Tina.” | Key Facts: does the app extract “Tina Walsh” / “Tina” as a person from dense text? |
| **CCTV mentioned, not fully served** | MG5 + MG11 + MG6 say CCTV requested/awaiting; no continuity statement. | Safety: CCTV Full Window + CCTV Continuity flagged as missing? Key Facts: CCTV refs? |
| **Forensic mentioned, not served** | MG5: “Forensic report awaited.” No report in bundle. | Safety: Forensic report (and maybe Fire cause / Footwear if we add a line) flagged? |
| **999 / CAD mentioned, not in schedule** | MG5: “999 call and CAD log retained.” MG6 doesn’t list them. | Safety: 999 Call Audio, CAD Log missing? |
| **BWV mentioned in statement, not in MG6** | Officer MG11: “I viewed BWV at scene.” MG6: no BWV. | Safety: BWV missing? |
| **Custody CCTV requested** | Custody record: “Detained requested copy of custody CCTV. Not yet provided.” | Safety or disclosure: Custody CCTV / custody-related disclosure? |
| **Time window nuance** | MG5/MG6: 22:45–23:45. One MG11: “between 23:10 and 23:30.” | Key Facts or Strategy: incident window vs full window (disclosure point)? |
| **Index lists continuity statement, doc absent** | Index: “CCTV continuity statement” with a page number; no such document. | Manual check or future feature: “index says X, bundle doesn’t contain X”? |

---

## 4. How we could make the fictional bundle (no code yet)

**Option A — Author in Word / Google Docs**

- Write each “document” as a section (or separate doc): Cover, Index, Charge sheet, MG5, Custody, MG6, MG11 Drew, MG11 Patel, CCTV list, Exhibit list. Use headings and tables where it looks like a real form. Export to PDF (one big PDF or one PDF per section). Pros: full control, looks realistic. Cons: manual.

**Option B — Structured text (Markdown) then PDF**

- One folder: `fictional-bundle-gbh/` with `cover.md`, `index.md`, `charge-sheet.md`, `mg5.md`, `custody.md`, `mg6.md`, `mg11-drew.md`, `mg11-patel.md`, `cctv-list.md`, `exhibit-list.md`. Write content with the tricky details in the right places. Use a tool (pandoc, or a simple script) to turn each into PDF. Pros: versionable, easy to tweak text. Cons: less “form-like” unless we add layout.

**Option C — Minimal “test” PDFs**

- Create the **minimum** text that the extractor and Safety need: one PDF that’s just the MG5 narrative (with dates, names, CCTV, forensic, 999), one that’s a fake MG6 (with some items, omitting others), one custody record. Quick to build; good for regression. Then expand to a full thick bundle later.

**Recommendation for “plan only”:** Decide on one **canonical** fictional case (this GBH) and document it in Markdown first (section by section). That becomes the **spec** for what the bundle contains and where the tricky bits are. Then we can either (a) export to PDF by hand from Word/Docs, or (b) add a small script later to generate PDFs from the Markdown. For now, the plan is: **we have a spec** (this doc) and **we know what we’re testing** (the table above).

---

## 5. What “success” looks like when we run the app

After we build the bundle (one way or another) and upload it into CaseBrain:

- **Charges:** GBH s.20 (or s.18), defendant name, offence date.
- **Key Facts:** People (Jordan Pike, Casey Webb, Morgan Drew, Samir Patel; ideally Tina Walsh / Tina). Places (Aroma Kebab, High Street). Times (23:00–23:30, or 14/15 March). Evidence (CCTV, forensic awaited, 999/CAD). Disclosure (CCTV requested, items missing).
- **Safety:** Missing: CCTV Full Window and/or Continuity, BWV, 999, CAD, Forensic report, maybe Custody CCTV — depending on what we actually put in the bundle.
- **Strategy:** Case theory; disclosure as weapon (missing CCTV, missing BWV, missing 999); defence angles (self-defence, ID, etc.).
- **Tricky:** We’d love the app to (a) show **two dates** somewhere so a human spots the 14 vs 15 March issue, (b) list **Tina Walsh** (or Tina) in Key Facts, (c) list all the missing disclosure items above. If it doesn’t yet, we’ve got a clear **test spec** for what to improve.

---

*Plan only. Next step: either author the bundle in Markdown (per-section) or in Word/Docs and export to PDF, then run it through the app and compare to this spec.*
