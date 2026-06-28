# H5 Decision Support — locked future features

**Status:** Spec only. **Do not build until H3 and H4 core gates are substantially complete.**

**Do not touch:** Brain 1, battleboard core, chase core, Guardian, offence routing.

**Reason (Ged):** Help solicitors see safe defence options and pressure points without pretending to predict wins or give final legal advice.

---

## Placement in H5

After **Evidence Trace View**, before or alongside **20-Minute Hearing Mode**.

Feeds **Hearing Mode** and **Disclosure Timetable Builder** later.

---

## 1. Defence Decision Board

### Goal

Show solicitor-safe strategic options without predicting outcome.

### Sections

- Case Theory Options
- Move / Risk / Evidence Table
- Charge-Fit Review Points
- What Would Change The Advice
- Safe Action Plan

### Each option must show

- source state: served / referred only / missing / provisional
- supporting material
- missing material
- risk if Crown later serves material
- confidence: low / medium / high
- next action
- safe court line
- Chase ask
- client-safe explanation
- solicitor review required

### Example option types

- Attribution not safely proved
- Missing source material prevents final advice
- Custody/PACE issue requires review
- Charge-fit / alternative basis needs solicitor review
- ID evidence requires source review
- BWV/source-material pressure

### Hard rules

- never say “we win”
- never say “case collapses”
- never say “charge will be dropped”
- never advise plea
- never present options as final legal advice
- every option must show source state
- if source state unclear, option is provisional / needs review / blocked
- must pass Guardian / Weirdness / sendability gates

---

## 2. Advice Change Radar

### Goal

Show what new evidence would change the solicitor’s advice or weaken/strengthen a pressure point.

### Example radar items

- If BWV is served and supports the officer account → BWV pressure **may weaken**.
- If custody record shows safeguard issues → PACE pressure **may strengthen**.
- If phone/subscriber data links client to messages → attribution pressure **may weaken**.
- If complainant MG11 is missing or inconsistent → disclosure/account pressure **may strengthen**.
- If medical evidence is served and supports serious injury → charge-fit pressure **may weaken**.
- If CCTV full window is served and contradicts ID → ID pressure **may strengthen**.

### Each radar item must show

- evidence awaited
- current source state
- possible impact if served
- safe next action
- review trigger
- solicitor review required

### Hard rules

- use “may strengthen/weaken”, not certainty
- never predict outcome
- never say charge must be dropped/reduced
- never state absent evidence as fact

---

## Acceptance (both features)

- Gives useful decision support without unsafe advice.
- Every route is source-linked and provisional where needed.
- No option can be copied as final advice unless solicitor-reviewed.
- Works with H3 trust labels and H4 gates.

---

## Plan lock note

These two items are **locked H5 scope** — no further H5 expansion until H3/H4 are done. Anything else now risks plan bloat.
