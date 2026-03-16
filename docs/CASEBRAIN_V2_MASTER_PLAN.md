# CaseBrain V2 — Master Product Plan

**Single blueprint for the next version. No code — planning only.**  
*Folds in: current build, Copilot’s V2 rewrite, Cursor’s final decisions on Summary/Key Facts/removals.*

---

# 1. What CaseBrain already has (foundation)

Already built and working:

## 1.1 Case list / dashboard
- One list of all matters
- Offence, phase, next hearing, Safe/Unsafe, N outstanding
- Sort + filter
- New case, View all

## 1.2 Safety = Case Readiness
- Safety panel is the single source of truth
- Critical + High missing items; labels reported to parent
- Case is Safe only when Safety is Safe
- Case Readiness uses same source (no mismatch)

## 1.3 Defence Plan (fight‑harder engine)
- Case theory
- Stance (win vs damage limitation)
- Winning angles, offence leverage, disclosure as weapon
- Risks + pivots, no‑case line
- Evidence‑driven route scoring

## 1.4 “Best way to fight” (UI)
- One‑liner + next 1–3 actions + “If things change” on case overview
- **Sourced from** Defence Plan (case theory, stance, winning angles) — one brain, one display. Not removed in V2.

## 1.5 Chat grounding (current)
- Grounded on plan summary (compressed)
- Grounded on Safety missing items only (no generic disclosure)
- Timeline + evidence context + law slices
- Higher output token limit to avoid truncation

## 1.6 Intake
- Upload PDFs, extract key facts
- Auto‑infer criminal case, create criminal_cases row

---

# 2. Direction (what V2 must become)

- **Richer summaries** — more accurate, structured, useful for chat and strategy.
- **Chat helps build the case** — proposes summaries and case theory; you approve or edit; result becomes canonical.
- **Copilot verdict loop** — review outputs, flag issues, drive next iteration.
- **Full lifecycle** — police station as first phase of the same case, not a separate system.

---

# 3. New features and changes (V2)

## 3.1 One Agreed Case Summary (canonical)

**Single source of truth** for the case, built from:
- extraction, key facts, police station data, Defence Plan, Safety, chat proposals, your edits.

**Three tiers:**

| Tier | Use |
|------|-----|
| **Short** (1 paragraph) | Dashboard, “best way to fight” headline, quick view |
| **Detailed** (2–3 paragraphs) | Chat grounding, strategy, hearing prep — **main one you approve** |
| **Full** (long form) | Internal / counsel; more nuance and detail |

**Summary structure (solicitor buckets):**  
The agreed summary (and Summary tab) separates and shows:
- Prosecution case | Defence case | Disputed issues | Agreed facts | Unknowns | Missing disclosure (from Safety) | Risks  

So it’s not one blob; it’s structured the way solicitors think.

---

## 3.2 Case Theory Line (one sentence)

**The anchor for the whole case.**  
Example: *“Prosecution say X; we say Y; best angle is Z because…”*

- Chat, Strategy, Safety, and Summary all anchor to it.
- Chat can propose it; you approve it; it becomes canonical.

---

## 3.3 Chat as Case Builder (new mode)

**Flow: “Help me build the case summary.”**

- Chat proposes: key facts, disputed issues, prosecution burdens, defence angles, short/detailed summary, case theory line.
- You: Agree | Edit | Reject.
- Result becomes the **agreed summary** (and/or case theory line).

---

## 3.4 Summary → Strategy integration

Summary and agreed case theory **feed** Strategy explicitly:
- Case theory line → Strategy case theory
- Summary (defence / disputed / risks) → offence leverage, disclosure‑as‑weapon, pivots, stance

Summary tab and Strategy tab = same brain; one source of truth.

---

## 3.5 Key Facts hierarchy and links

**Key Facts becomes structured (not flat):**
- People | Places | Times | Evidence | Disclosure | Risks | Statements | CCTV refs | Forensic refs

Each fact has:
- **Source tag** (MG5, interview, extraction, plan)
- **Confidence** (high / medium / low, or solid / inferred / missing)

**Key Facts feeds:**
- **Summary** — first‑class input to agreed summary and tiers
- **Safety** — e.g. “CCTV mentioned” → auto‑flag CCTV Full Window, Continuity, exhibit number; “forensics mentioned” → flag forensic report
- **Strategy** — e.g. “client denies involvement” → seed actus reus denial, no‑case line, disclosure pressure

---

## 3.6 Sources and confidence (everywhere)

- **Source tags:** “From MG5”, “From interview”, “From key facts”, “From plan” so you can verify.
- **Confidence:** Where useful, show solid (from document) / inferred / missing so the app doesn’t sound like it’s inventing.

---

## 3.7 Police station → court (one case spine)

**Police station = first phase of the same case.** If charged, we **continue** that case (e.g. phase → First appearance), not create a new one.

**When outcome = charged:**
- Create or link one criminal case from the police station record (same defendant, offence(s), incident date, allegation, first hearing, bail).
- Carry forward: interview type, first account, early disclosure, early missing items, vulnerabilities, custody details.
- Set phase: Police station → First appearance → Case progression.

**Police station seeds Safety + Strategy:**
- Safety: MG5, custody record, interview record, CCTV shown/disclosed → early missing items that carry to court.
- Strategy: early case theory, early offence leverage, early disclosure‑as‑weapon, early risks.

**Dashboard:** Matter can be Police station only, or Police station + Court; show next police date and/or next court date; navigate to Police station tab or Strategy tab.

**Chat continuity:** Once linked, chat can answer “What did the client say in interview?”, “What disclosure was mentioned at station but not served?”, “How to use the interview at court?” — grounding includes police station summary, interview type, early disclosure/missing items.

---

## 3.8 Disclosure Pressure Dashboard

- Missing items (from Safety)
- Why they matter, CPIA duties, deadlines
- Pressure steps, what CPS has failed to do

Makes disclosure a visible **weapon**.

---

## 3.9 Hearing Prep Mode

Structured mode that generates:
- What to say, what to ask, what to challenge, what to request
- What disclosure to push, what risks to flag
- Fallback positions

---

## 3.10 Strategy Timeline

- What we’re doing now | what we’re waiting for | what we’ll do next
- What changes if evidence changes

Gives solicitors confidence and clarity.

---

## 3.11 Chat UX modernisation

- Auto‑scroll to latest message
- Floating input bar, message bubbles
- Collapsible sections, pinned context bar
- Typing indicator
- Command shortcuts (e.g. /disclosure, /timeline, /plan)

So the chat feels premium and matches the intelligence behind it.

---

## 3.12 Verdict loop and audit (plan)

- You / Copilot **rate** outputs: summary good or needs work; chat accurate or off; strategy aligned or not.
- That produces a **change list** (e.g. “include X in summary”, “chat must use Y”); plan and behaviour get updated from that list.
- When chat proposes or you agree a summary / case theory, the system records **what was agreed when** (audit trail) so it’s clear what’s current.

---

# 4. What to remove or replace (final decisions)

| Old | Decision |
|-----|----------|
| **Generic unversioned summaries** | **Replace** with short / detailed / full tiers and agreed case summary. |
| **“Best way to fight”** | **Keep.** It stays as the **UI label** for the one‑liner + next actions + “If things change”, **fed by** Defence Plan. One plan, one display. Do not remove. |
| **Standalone disclosure lists** | **Replace** with Safety panel + missing items + Disclosure Pressure Dashboard. |
| **Old chat grounding** | **Replace** with: agreed summary, case theory, plan summary, Safety, timeline, evidence context, law slices. |
| **Police station / court as two systems** | **Replace** with one case spine (station → charge → court). |
| **Unstructured notes only** | **Evolve:** add structured Key Facts, disputed/agreed/unknowns, risks; freeform notes can remain for ad‑hoc use. |

---

# 5. How it all fits together (the story)

1. **Police station** → early facts, early disclosure, early case theory; if charged → **court case auto‑created/linked**.
2. **Key Facts** extracted and **structured** (hierarchy + source + confidence); feeds Summary, Safety, Strategy.
3. **Chat builds the case summary** with you; you approve **agreed summary** + **case theory line**.
4. **Summary** (solicitor buckets) + **case theory** feed **Strategy**; Summary tab and Strategy tab = same brain.
5. **Safety** uses missing items from station + court (+ Key Facts triggers where relevant).
6. **Chat** grounded on: agreed summary, case theory, plan summary, Safety, timeline, evidence context, law slices.
7. **Disclosure Pressure Dashboard** drives pressure; **Hearing Prep Mode** prepares court; **Strategy Timeline** shows what’s next.
8. **Chat UX** is modern and professional.
9. **Verdict loop** and **audit** keep the plan and behaviour improving.

---

# 6. Build order (priority)

1. **Court‑case core first:** Richer summaries, one agreed case summary (with solicitor buckets), case theory line, chat as case builder, Summary → Strategy integration, Key Facts hierarchy + links, sources/confidence, verdict loop. (So chat and strategy run off one agreed truth.)
2. **Then police station spine:** Police station tab as first phase, link to court when charged, dashboard one spine, chat continuity. (Builds on stable court‑case model.)
3. **Then:** Disclosure Pressure Dashboard, Hearing Prep Mode, Strategy Timeline, Chat UX modernisation, audit trail implementation.

---

## 6.1 Implementation order (step‑by‑step)

*The order we’re gonna implement. Each step builds on the previous; finish one phase before moving to the next.*

### Phase A — Foundation (extraction + Key Facts + Summary structure)

| Step | What to implement | Why this order |
|------|-------------------|----------------|
| A1 | **Extraction / Key Facts split** — Narrative and prosecution text go to Summary only; only discrete facts (people, places, times, evidence refs, disclosure refs, risks) go into Key Facts. Add **source tags** and **confidence** to facts. | Everything else depends on “facts vs narrative” being correct. |
| A2 | **Key Facts hierarchy** — Group facts into People, Places, Times, Evidence, Disclosure, Risks, Statements, CCTV refs, Forensic refs. Store and display by category. | Summary buckets and Safety/Strategy seeds need structured facts. |
| A3 | **Solicitor buckets in Summary** — Add the seven buckets (Prosecution case, Defence case, Disputed issues, Agreed facts, Unknowns, Missing disclosure, Risks). Wire extraction + Key Facts so buckets can be filled (auto or manual). **Missing disclosure** bucket fed from Safety. | Summary becomes structured; Strategy and chat can consume it. |

### Phase B — Safety + Strategy wiring

| Step | What to implement | Why this order |
|------|-------------------|----------------|
| B1 | **Key Facts → Safety** — When Key Facts (or extraction) mention e.g. CCTV, forensics, fire report, flag the right missing items in Safety so they appear in the checklist. | Safety stays single source of truth; Disclosure Pressure and chat get correct missing list. |
| B2 | **Key Facts → Strategy** — Use Key Facts to seed Strategy angles (e.g. “client denies” → actus reus denial, no‑case line; “CCTV mentioned” → disclosure pressure). | Defence Plan starts from real case content, not blank. |
| B3 | **Agreed case summary (short / detailed / full)** — Store one agreed summary per case; user (or chat) can edit; versions/tiers for dashboard vs chat vs counsel. Add **case theory line** (one sentence); store and show it; user can approve/edit. | Chat and Strategy need one canonical “what we say the case is”. |
| B4 | **Chat as case builder** — Mode/flow where chat proposes key facts, disputed issues, short/detailed summary, case theory line; user Agree / Edit / Reject; result writes into agreed summary and case theory. | Gets agreed summary and case theory in place without double‑entry. |
| B5 | **Summary + case theory → Strategy** — Defence Plan explicitly takes agreed summary (buckets) and case theory line as input. “Best way to fight” remains the UI read‑out of Strategy (no duplicate logic). | Summary tab and Strategy tab = same brain. |
| B6 | **Chat grounding** — Point chat at: agreed summary, case theory, plan summary, Safety (missing items), timeline, evidence context, law. No generic disclosure; cite sources. | Chat answers from one agreed truth and stays accurate. |

### Phase C — Police station spine

| Step | What to implement | Why this order |
|------|-------------------|----------------|
| C1 | **Police station as first phase** — Same case record from station; when outcome = charged, create/link court case (same defendant, offence, incident date, allegation, first hearing, bail). Carry forward interview type, first account, early disclosure, early missing items, vulnerabilities. | One case spine; no double‑entry. |
| C2 | **Police station → Safety + Strategy** — Seed Safety with early missing items (MG5, custody, interview, CCTV shown/disclosed). Seed Strategy with early case theory, early leverage, early disclosure weapon. | Court case starts with station context. |
| C3 | **Dashboard: one spine** — Show Police station only vs Police station + Court; next police date and/or next court date; navigate to station tab or Strategy tab. | Matches how solicitors work. |
| C4 | **Chat + police station** — Grounding includes police station summary, interview type, early disclosure/missing items. Chat can answer “what did client say at station?”, “what’s missing from station disclosure?”. | Continuity from station to court in one place. |

### Phase D — Pressure, prep, timeline, UX, audit

| Step | What to implement | Why this order |
|------|-------------------|----------------|
| D1 | **Disclosure Pressure Dashboard** — Missing items from Safety; why they matter; CPIA duties; deadlines; pressure steps. | Disclosure as weapon, visible. |
| D2 | **Hearing Prep Mode** — Generate what to say, ask, challenge, request; disclosure to push; risks to flag; fallbacks. | Uses Strategy + Summary + Safety; builds on core. |
| D3 | **Strategy Timeline** — What we’re doing now / waiting for / doing next; what changes if evidence changes. | Read‑out of Strategy + Safety. |
| D4 | **Chat UX modernisation** — Auto‑scroll, floating input, bubbles, collapsible sections, pinned context, typing indicator, command shortcuts (/disclosure, /timeline, /plan). | Polish once chat content and grounding are right. |
| D5 | **Verdict loop + audit trail** — Rate summary/chat/strategy; change list drives plan updates. Record what was agreed when (summary, case theory). | Keeps plan and behaviour improving. |

**Summary:** Implement in order **A1 → A2 → A3 → B1 → B2 → B3 → B4 → B5 → B6**, then **C1 → C2 → C3 → C4**, then **D1 → D2 → D3 → D4 → D5**. Don’t skip phases; each step unblocks the next.

---

# 7. Grounded verdict: real case (Arson bundle)

*Copilot’s verdict on the actual Arson bundle — what’s wrong now, what V2 fixes, and how Strategy/Summary/Key Facts fit the plan.*

## 7.1 What the Summary tab is doing right now

- Pulling **raw MG5 text** and **raw extracted facts** and showing them as flat text.
- No separation of prosecution vs defence, no solicitor buckets, no case theory line.
- **Verdict:** Useful raw data ✔ | Not structured ❌ | Not safe for grounding ❌ | Not aligned with V2 ❌

## 7.2 Why Key Facts is showing summary text

- Extraction is pulling **all text** from the PDF, running entity extraction, then putting narrative paragraphs into “Key Facts” because they contain dates, names, places, events.
- So Key Facts ends up with **prosecution narrative** (e.g. “The premises comprise…”, “The fire was determined as deliberate…”, “Neighbour saw a male…”) instead of **discrete facts**.
- **Verdict:** Wrong place, wrong structure, wrong purpose. This is exactly why V2 introduces the **Key Facts Hierarchy** (facts by category, not narrative dumps).

## 7.3 What’s missing (solicitor‑grade, from the bundle)

- **No separation:** Prosecution case vs defence case vs disputed issues vs agreed facts vs unknowns vs missing disclosure vs risks.
- **No case theory line** — even though the bundle supports one (e.g. no direct ID, no CCTV, no forensic confirmation, key disclosure missing).
- **No link to Safety:** Bundle says “fire cause report awaited”, “footwear not yet compared”, “CCTV overwritten” — these should auto‑populate Safety as missing items; they don’t.
- **No link to Strategy:** Motive, opportunity, circumstantial ID, no CCTV, overwritten CCTV, no forensic confirmation, no comment interview, etc. should feed offence leverage, disclosure weapon, risks, pivots, no‑case line; they don’t.

## 7.4 What to remove when V2 goes live (aligned with section 4)

- Old Summary text → short / detailed / full + solicitor buckets + case theory line.
- Old Key Facts dump → Key Facts Hierarchy + source tags + confidence + links to Safety + Strategy.
- Old disclosure lists → Safety panel + Disclosure Pressure Dashboard.
- Old chat grounding → agreed summary + case theory + plan summary + safety + timeline + evidence context + law slices.
- Old police station separation → one case spine.

## 7.5 What to add (from the same bundle)

- **Agreed Case Summary** built from MG5, MG11s, fire report, scene summary, CCTV summary, interview, custody, disclosure list.
- **Solicitor buckets** — example from this case:
  - **Prosecution case:** motive, opportunity, circumstantial ID, deliberate ignition.
  - **Defence case:** no direct ID, no CCTV, no forensic confirmation, overwritten CCTV, neighbour couldn’t ID, no ignition source recovered.
  - **Agreed facts:** fire occurred, deliberate ignition likely, defendant’s car in area, dispute existed.
  - **Disputed issues:** identity, causation, intent.
  - **Unknowns:** accelerant?, footwear comparison?, fire cause report?.
  - **Missing disclosure:** fire cause report, forensic report, footwear comparison, CCTV continuity, CCTV full window.
  - **Risks:** circumstantial case can still convict, motive strong, ANPR timing tight.
- **Case theory line** (example): *“Prosecution rely on circumstantial evidence only; no direct ID, no CCTV, no forensic confirmation, and key disclosure (fire cause report, CCTV continuity) is missing.”*
- **Summary → Strategy integration:** bundle content should auto‑seed offence leverage, disclosure weapon, risks, pivots, no‑case line.
- **Key Facts Hierarchy** from bundle: People (e.g. Webb, witnesses), Places (Canal Wharf), Times (00:52, 01:00, 01:15), Evidence (ANPR, MG11s, fire report), Disclosure (missing items), Risks (circumstantial case).
- **Police station → court:** custody, interview, early disclosure, early missing items should seed the court case when charged.

## 7.6 Verdict

The Arson bundle shows: **raw data and extraction are good; structure and intelligence layer are missing.** The V2 plan fixes every gap (solicitor buckets, case theory, Key Facts hierarchy, Summary → Safety/Strategy, agreed summary, chat as case builder).

---

# 8. How the plan works together (end‑to‑end flow)

*One path from upload to solicitor‑grade output — so we know how each piece connects and what depends on what.*

## 8.0 Integration map: who feeds whom (all working together)

| Component | Receives from | Sends to |
|-----------|----------------|----------|
| **Extraction** | PDFs, police station record | **Summary** (narrative → prosecution/defence buckets), **Key Facts** (discrete facts only) |
| **Key Facts** | Extraction (facts only), user edits | **Summary** (drafts), **Safety** (e.g. CCTV/forensics mentioned → missing items), **Strategy** (seed angles) |
| **Safety** | Offence checklist, Key Facts triggers, police station gaps | **Summary** (missing disclosure bucket), **Chat** (grounding), **Disclosure Pressure Dashboard**, **Strategy** (disclosure weapon) |
| **Summary** | Extraction, Key Facts, Safety (missing disclosure), Chat (proposals), user (agree/edit) | **Strategy** (agreed summary + case theory), **Chat** (grounding), Dashboard (short), Hearing Prep |
| **Agreed case theory line** | Chat (propose), user (approve) | **Strategy**, **Chat** (grounding), "Best way to fight" |
| **Strategy (Defence Plan)** | Summary (buckets + agreed text), case theory line, Key Facts (seeds), Safety (missing items) | "Best way to fight", **Chat** (plan summary in grounding), Hearing Prep, Strategy Timeline |
| **Chat** | Agreed summary, case theory, plan summary, Safety, timeline, evidence, law | **Summary** (case builder proposals), user (answers); must cite sources |
| **Police station** | User input, custody/interview/disclosure | **Court case** (when charged), **Safety** (early missing items), **Strategy** (early theory/leverage) |

**Single source of truth:**
- **What's missing** = Safety (fed by checklist + Key Facts + police station).
- **What we say the case is** = Agreed case summary + case theory line (fed by Summary + chat + you).
- **How we fight** = Strategy (fed by agreed summary + case theory + Key Facts + Safety).

So: extraction and Key Facts feed everyone; Safety feeds Summary/Chat/Dashboard/Strategy; Summary + case theory feed Strategy and Chat; Strategy feeds "best way to fight", Chat context, Hearing Prep, Timeline. No duplicate brains — one flow, all working together.

---

## 8.1 Data flow (high level)

1. **Input:** PDFs (MG5, MG11s, custody, interview, etc.) + optional police station record.
2. **Extraction:** Text and entities pulled from PDFs. **Critical split:** narrative/prosecution text must **not** be dumped into Key Facts; it feeds **Summary** (prosecution/defence buckets). Only **discrete facts** (people, places, times, evidence refs, disclosure refs, risks) go into **Key Facts** with hierarchy + source + confidence.
3. **Key Facts:** Structured facts (People, Places, Times, Evidence, Disclosure, Risks, etc.) → feed **Summary** (agreed summary drafts), **Safety** (e.g. “CCTV mentioned” → flag missing CCTV items), **Strategy** (e.g. “client denies” → seed denial angles).
4. **Safety:** Missing items from offence checklist + Key Facts triggers + police station early gaps. Single source of truth for “what’s missing”; feeds chat grounding and Disclosure Pressure Dashboard.
5. **Summary:** Solicitor buckets (prosecution / defence / disputed / agreed / unknowns / missing disclosure / risks) filled from extraction + Key Facts + Safety. **Chat as case builder** proposes short/detailed/full + case theory line; you agree or edit → **agreed case summary** + **case theory line** become canonical.
6. **Strategy (Defence Plan):** Fed by agreed summary + case theory + Key Facts seeds. Produces: case theory, stance, winning angles, offence leverage, disclosure as weapon, risks, pivots. **“Best way to fight”** is the UI headline for this (one‑liner + next actions + “If things change”).
7. **Chat:** Grounded on agreed summary, case theory, plan summary, Safety, timeline, evidence context, law. Answers and case‑builder proposals must cite sources; no generic disclosure.
8. **Outputs:** Dashboard (short summary, phase, Safe/N outstanding), Strategy tab (full plan + timeline), Hearing Prep, Disclosure Pressure, audit trail of what was agreed when.

## 8.2 Dependencies (what needs to exist first)

- **Key Facts hierarchy** and **narrative vs facts split** must exist before Summary buckets and Safety/Strategy seeds can be reliable.
- **Agreed summary + case theory** (at least draft) must exist before chat and Strategy can be fully grounded.
- **Safety** (missing items) should be seeded as early as possible (from offence checklist + Key Facts + police station) so Disclosure Pressure and chat grounding are correct.
- **Summary → Strategy** means: agreed summary and case theory line should be in place (or drafted by chat) before Strategy is treated as “the same brain” as Summary.

## 8.3 How Strategy fits

- Strategy (Defence Plan) is **downstream** of: extraction, Key Facts, Summary buckets, Safety, and (once we have it) agreed case theory.
- Strategy **consumes:** agreed case summary (defence/disputed/risks), case theory line, Key Facts (for seeding angles), Safety (for disclosure weapon).
- Strategy **produces:** case theory line (if not yet agreed), stance, winning angles, offence leverage, disclosure weapon, risks, pivots → which then feed “best way to fight”, Hearing Prep, Strategy Timeline, and chat context.
- So: **no duplicate “best way to fight” logic** — Strategy is the engine; “best way to fight” is the read‑out. Summary and Key Facts feed Strategy; Strategy does not replace Summary, it uses it.

## 8.4 Order of operations (when building)

1. Fix **extraction / Key Facts** so narrative stays in Summary and only structured facts go into Key Facts hierarchy; add source + confidence.
2. Add **solicitor buckets** to Summary (prosecution, defence, disputed, agreed, unknowns, missing disclosure, risks) and wire extraction + Key Facts into them.
3. Wire **Key Facts → Safety** (e.g. CCTV/forensics mentioned → flag missing items) and **Key Facts → Strategy** (seed angles from facts).
4. Add **agreed case summary** (short/detailed/full) + **case theory line**; add **chat as case builder** so user can approve/edit.
5. Wire **Summary + case theory → Strategy** so Defence Plan is explicitly fed from agreed summary.
6. Point **chat grounding** at agreed summary + case theory + plan + Safety + timeline + evidence + law.
7. Then add police station spine, Disclosure Pressure, Hearing Prep, Strategy Timeline, Chat UX, audit trail.

---

*End of CaseBrain V2 Master Plan. When ready, turn chosen items into concrete specs and code.*
