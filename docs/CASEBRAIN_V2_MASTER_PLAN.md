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

# 9. Criminal pilot roadmap (measurement, fidelity, product brains)

*Runs alongside V2 sections 6–8. This is the **ship-safe** track: corpus playback, bundle fidelity, hero demo, then solicitor-facing brains. Do not skip grounding before legal Q&A.*

## 9.1 Status (as of corpus-playback merge to main)

| Phase | Name | Status |
|-------|------|--------|
| 0–2 | Measurement + safety + playback/canary | **Done** — A+B gate clean, pilot-3 + production-pass GREEN |
| 3 | Bundle fidelity / truth keys | **Done** — gold 7/7 (`bundle-fidelity` → main) |
| **3.5** | **Source-backed explanation + inconsistency fidelity** | **Done** — gold 7/7; local exemplar (Sienna) on gitignored lane |
| **4** | **Proof Map + strategy spine + Battleboard / War Room** | **In progress** — §9.4; **4a–4b** eval done; **4c** next; UI **4d** gated |
| **4e** | **Strategy corpus expansion + holdout stress pack** | **Planned (docs)** — §9.7; **1k scored corpus** after **4c** |
| **4f** | **Synthetic Criminal Bundle Factory (scale-up)** | **Planned (docs)** — §9.8; **1k→5k→10k→50k** capacity; staged render only |
| 5 | Hero demo + hearing + supervisor | Planned — video-ready (after Phase 4 logic is solid) |
| 6 | Self-serve + video | Planned |
| 7 | Client plain-English layer | Planned |
| 8 | Export (notes, letters, prep) | Planned |
| 9 | Feedback flywheel (fingerprints → fix → canary) | Scaffolded via playback triage |
| **10** | **Legal Q&A brain (case-aware questions)** | **Planned — see §9.5** |
| 11 | Offence map expansion (human-approved) | Planned |
| 12 | Real PDF stress / optional depth | Planned — complements **§9.7** (local gitignored); not bulk manual upload |

**Working method (all phases):** scan → separate artifact files → fingerprints → **one shared fix** → canary/playback/fidelity re-run. Never bulk-fix; never commit client PDFs or artifacts.

## 9.2 Phase 3 — bundle fidelity (read the papers)

**Goal:** Prove CaseBrain **reads** bundle text correctly (defendant, charge, stage, doc types, missing signals, provisional route) — not answer style.

**Repo gold set (7):** pilot-3 manifest snapshots, S18 Jordan Clarke, GBH Pike, **Ella Shaw motoring thin**, **Sam Okonkwo generic provisional**. See `docs/bundle-fidelity-set/README.md`.

**Commands:**
- `npx tsx scripts/bundle-fidelity.ts --pack gold`
- `npx tsx scripts/bundle-fidelity-ingest-local-pdfs.ts` then `--pack local` (gitignored)

**Reports:** `artifacts/casebrain-auditor/latest/bundle-fidelity/` (gitignored).

**Local:** User PDFs + truth keys stay **out of git**; `artifacts/bundle-fidelity-local/`.

**Exit:** Gold passes; local lane ingests and runs; shared extract rules only (no case-by-case tuning in repo).

---

## 9.3 Phase 3.5 — source-backed explanation + inconsistency fidelity (bridge)

**Why this phase exists:** Phase 3 asks *“did we read the bundle?”* Phase 3.5 asks *“can we explain what the papers actually say — safely, with sources, and flag when sources disagree?”* That is the natural bridge before Phase 4 puts copy on screen.

### 9.3.1 What Phase 3.5 is not

- Not: generic chase lines (“CCTV missing”) with no source basis.
- Not: inventing served material, locations, or outcomes not on the papers.
- Not: production UI, live chat, or legal advice to the public.
- Not: committed real PDFs, client truth keys, or artifact commits.

### 9.3.2 What Phase 3.5 is

Two fidelity lanes on **gold + local gitignored bundle text**:

| Lane | Checks |
|------|--------|
| **A — Missing / partial material** | For each material item: what the bundle **says** (served / partial / outstanding); **which section**; short **source basis**; **why it matters** to route, risk, or hearing; **safe next action**; **do-not-overstate** warning |
| **B — Inconsistency / contradiction** | When sources conflict (e.g. weapon location A vs B; date in charge vs MG5; “stills served” vs “master footage outstanding”): **Source A says X**, **Source B says Y**, **why it matters** (continuity, provenance, attribution, reliability), **safe next action**, **do not reconcile into one fact** |

**Example (bad → good):**

| Bad | Good (Phase 3.5 style) |
|-----|-------------------------|
| “CCTV missing.” | “CCTV **stills** are served. The outstanding-material page states the **full CCTV master footage and export log** are outstanding. That matters because the route depends on timing, attribution, driver issue, causation, and continuity. Safe next step: chase master footage and export log before fixing the hearing position. **Do not** say CCTV is absent; say **full source footage is not yet served**.” |

**Example (contradiction):**

```txt
Source A (MG5): weapon recovered at Morrisons.
Source B (officer note): weapon seized from mail/package.
Status: conflicting — not reconciled on papers.
Why it matters: continuity, provenance, exhibit linkage, attribution.
Safe next step: chase seizure log, exhibit schedule, continuity statement.
Do not overstate: do not state final recovery location until reconciled.
```

### 9.3.3 Required fields per explanation block

Every generated block (missing or contradiction) must include:

| Field | Purpose |
|-------|---------|
| **issue** | Short label (e.g. full CCTV export, weapon location, CAD timing) |
| **sourceSection** | Document/section (MG5, MG6, outstanding page, witness, custody) |
| **sourceBasis** | Quote, paraphrase with page ref, or explicit “bundle states…” |
| **status** | `served` \| `partial` \| `outstanding` \| `conflicting` \| `unclear` |
| **whyItMatters** | Link to route / risk / hearing / disclosure dependency |
| **safeNextAction** | Chase / record on file / take instructions — no outcome advice |
| **confidenceTag** | `settled` \| `likely` \| `provisional` \| `needs_solicitor_review` |
| **doNotOverstate** | Explicit cap (e.g. do not say absent when partial stills served) |

### 9.3.4 Output types (starter report sections)

Reports under `artifacts/casebrain-auditor/latest/bundle-fidelity/explanation-fidelity/` (gitignored):

1. **Missing material explanations** — CCTV/CAD/999/BWV/interview/expert/medical/forensic/custody disclosure gaps.
2. **Contradiction / inconsistency map** — cross-source conflicts with reconciliation status.
3. **Police station / interview caution** — PACE, pre-interview disclosure limits, no-comment positioning (source-backed only).
4. **Disclosure dependency** — why MG6/outstanding lists affect route and chase priority.

### 9.3.5 Acceptance criteria (Phase 3.5 exit)

- Runs on **gold** and **local** bundle text (local stays gitignored).
- **Does not invent** facts; `unclear` / `needs_solicitor_review` when basis thin.
- **No** production UI changes; evaluator/artifact lane only.
- **No** real PDFs or artifacts committed.
- Pilot exemplar: **Sienna Avery / local-001 dangerous driving** — must surface at minimum:
  - CCTV stills served vs master/export outstanding
  - 999 audio / CAD log outstanding where bundle says so
  - BWV / expert / medical / forensic / full interview outstanding where stated
  - Custody/PACE limited pre-interview disclosure if on papers
  - Timing conflicts (CAD vs witness vs corrected index) flagged as **conflicting**, not merged
- Same method as playback: separate files, fingerprints, one shared fix, re-run.

### 9.3.6 Commands (planned)

```powershell
npx tsx scripts/bundle-fidelity-explanation.ts --pack gold
npx tsx scripts/bundle-fidelity-explanation.ts --pack local
```

*(Scaffold in slice 3.5a — see proposal below; not UI.)*

### 9.3.7 Relationship to other phases

```txt
Phase 3   = read the papers correctly (metadata + doc signals)
Phase 3.5 = explain the paper truth safely (sources + contradictions)
Phase 4   = Proof Map → Battleboard / War Room (source-backed; all cases)
Phase 5   = hero demo + hearing + supervisor surfaces
Phase 10  = legal Q&A (after Phase 4 strategy + grounding are solid)
```

---

## 9.4 Phase 4 — Proof Map, strategy spine, Battleboard / War Room

**Gate:** Do **not** build product UI until the user explicitly says **“start Phase 4”**. Until then: plan, specs, and **artifact/evaluator lanes** only (same discipline as Phase 3 / 3.5).

**Universal rule:** Applies to **every** criminal case — existing matters, hero bundles, gold fiction, local gitignored PDFs, and future offences. **No** hero-only logic; **no** case-by-case hacks in repo.

**Central engine:** The **Proof Map / Evidence Dependency Graph** is how we **prove** deep strategy before showing it in the product. Battleboard, War Room, Disclosure Chase, Supervisor View, and Client View must all read from the **same source-backed map** (UI in slice **4d** only).

### 9.4.1 What Phase 4 is not

- Not: “best route” labels with no source basis.
- Not: overconfident outcomes (“this wins”, “Crown collapses”, “proves innocence”).
- Not: deep strategy when papers are thin — must stay **provisional** or **needs_solicitor_review**.
- Not: offence-specific fiction invented when lens is unknown (use generic provisional proof map + human review).
- Not: replacing solicitor judgment or final advice.
- Not: UI before Proof Map + Battleboard + War Room evaluators pass.

### 9.4.2 What Phase 4 is

Phase 4 **consumes Phase 3.5 explanation blocks** (missing material, contradictions, disclosure dependencies, custody/interview caps) and builds a **Proof Map**, then **views** on that map:

| Layer | Role |
|-------|------|
| **Proof Map / Evidence Dependency Graph** | Connects every source-backed fact to charge, Crown proof points, evidence for/against, gaps, contradictions, route impact, risk, chase, court-safe caps (see §9.4.3) |
| **Universal strategy spine** | Same 13-step scaffold for any charge — feeds and validates Proof Map nodes (§9.4.4) |
| **Battleboard** | **Strategy view** of the Proof Map: why routes are live; which proof point they attack; helps/hurts/conflicts/missing; collapse risks; confidence + do-not-overstate |
| **War Room** | **Hearing-action view** of the same map: safe lines, record asks, disclosure timetable, non-concessions, Crown X → safe defence Y |

```txt
Phase 3   → read paper truth
Phase 3.5 → explain paper truth (sources, gaps, contradictions)
Phase 4a  → Proof Map / evidence dependency graph (evaluator — prove deep strategy)
Phase 4b  → Battleboard (strategy view of Proof Map)
Phase 4c  → War Room (court-action view of Proof Map)
Phase 4d  → product UI (last)
Phase 4e  → first 1k scored strategy corpus (factory v1)
Phase 4f  → Synthetic Criminal Bundle Factory scale-up (50k capacity; staged materialisation)
Phase 4d  → product UI (last)
Phase 5+  → hero demo, supervisor, client surfaces — after 4a–4c pass
```

### 9.4.3 Proof Map / Evidence Dependency Graph (Phase 4a — evaluator first)

**Purpose:** Prove that CaseBrain can map paper truth to **proof points, strategy, risk, and court action** before any UI. Not a detour — this is the **central engine** for consistent Battleboard, War Room, Disclosure Chase, Supervisor, and Client views.

Every **source-backed node** on the map links (where papers support it):

| # | Link |
|---|------|
| 1 | **Charge / offence** |
| 2 | **Crown proof points** (safe high level — elements sketch, not verdict advice) |
| 3 | **Evidence supporting** each proof point |
| 4 | **Evidence weakening** each proof point |
| 5 | **Missing / partial material** linked to each proof point |
| 6 | **Contradictions / inconsistencies** linked to each proof point |
| 7 | **Defence route impact** (which routes this node helps or limits) |
| 8 | **Crown risk / defence risk** (procedural or evidential — provisional wording) |
| 9 | **What would change** the advice or route if served / reconciled |
| 10 | **What to chase** (disclosure / clarification) |
| 11 | **What can safely be said at court** (on these papers) |
| 12 | **What must not be overstated** |
| 13 | **Human review** flag where offence family or source support is uncertain |

**Required node fields (evaluator):** align with Phase 3.5 — `sourceSection`, `sourceBasis`, `status`, `confidenceTag`, `doNotOverstate`; plus `proofPointId`, `linkedExplanationIssue` where applicable.

**Example — weapon provenance conflict:**

```txt
Proof point affected: weapon provenance / continuity / attribution
Source A: weapon found at Morrisons (MG5 / officer note — cite section)
Source B: weapon seized from mail/package (seizure note — cite section)
Status: conflicting — not reconciled
Risk: exhibit reliability and attribution unresolved on served papers
Next action: chase seizure log, exhibit schedule, continuity statement, officer MG11, BWV/photos
Do not overstate: do not state final seizure location until reconciled
```

**Example — self-defence route (provisional):**

```txt
Proof point: unlawful force / self-defence live issue
Supporting (provisional): witness says complainant moved first (MG11 — source basis)
Weakening / gap: CCTV partial only; medical/expert not final; CAD/999 timing unresolved;
  full interview transcript outstanding
Route impact: self-defence live but provisional — not established
→ Battleboard explains why route is live but capped
→ War Room gives safe hearing wording + disclosure asks (see §9.4.6–9.4.7)
```

Offence-specific **lenses** (§9.4.5) add proof-point **detail** only when safely detected — never replace the universal map.

**Evaluator output (gitignored):** e.g. `artifacts/casebrain-auditor/latest/strategy-fidelity/proof-map/` with per-case graph JSON + human-readable summary (gold fiction first; optional local expects).

### 9.4.4 Universal strategy spine (all criminal cases)

The spine **feeds** Proof Map construction and sanity-checks that every case runs the same scaffold before offence lenses apply:

| Step | Output (source-backed or provisional) |
|------|----------------------------------------|
| 1 | Identify **charge / offence** (from papers; flag if unclear) |
| 2 | Identify **stage / hearing** |
| 3 | What the Crown must prove — **high level, safe wording** |
| 4 | **Served** evidence (only what bundle says is served) |
| 5 | **Missing / partial** evidence (from Phase 3.5 blocks) |
| 6 | **Contradictions / inconsistencies** (from Phase 3.5; do not merge) |
| 7 | What **helps** the defence route (linked to sources) |
| 8 | What **hurts** the defence route |
| 9 | What would **collapse** the route if missing/wrong |
| 10 | **Safe next action** (chase, record, instructions) |
| 11 | What can **safely be said at court** (on these papers) |
| 12 | What **must not be overstated** |
| 13 | **Human review** flag when offence family or source support is uncertain |

### 9.4.5 Offence-specific lenses (additive only)

| Lens | Safe detail themes (when detected) |
|------|-----------------------------------|
| **Fraud** | Dishonesty, representation, account control, transaction trail, loss, source of funds |
| **PWITS** | Possession, supply inference, quantity, packaging, lab report, phone attribution, messages, cell-site, cash |
| **Violence / GBH** | Identity, self-defence, injury, causation, intent, medical, BWV/CCTV, witness reliability |
| **Robbery / ID** | Force/threat, taking, identification, CCTV, complainant account, timing, continuity |
| **Motoring** | Driving standard, driver ID, collision sequence, dashcam/CCTV, CAD/999, telematics, expert/collision, injury causation |
| **Serious / provisional** | Attempted murder, murder, perverting, witness intimidation, etc. — **cautious** unless dedicated lens exists |
| **Unknown / unmapped** | Generic provisional proof map + **needs_solicitor_review** |

### 9.4.6 Battleboard (Phase 4b — strategy view of Proof Map)

Not only “best route”. Each live route is a **view over Proof Map nodes** and explains:

- **Why** this route is live on the papers
- **Which Crown proof point** it attacks or supports
- **Which source** supports it (`sourceSection` / `sourceBasis`)
- Evidence that **helps** / **hurts** / **conflicts** (from linked map edges)
- What is **missing** before the route can firm up
- What would **collapse** the route (evidential or procedural)
- **Safest next move**
- **confidenceTag** + **doNotOverstate**

**Example (provisional route):**

```txt
Self-defence is only provisional: Witness A says the complainant moved first, but CCTV is partial,
medical/expert evidence is not final, and full CAD/999/BWV/interview material remains outstanding.
Do not say self-defence is established; say it is a live issue requiring further service.
```

### 9.4.7 War Room (Phase 4c — hearing-action view of Proof Map)

Battleboard **thinks** from the map; War Room **turns the same map** into safe court action (still source-backed):

- Safe **hearing line**
- What to ask the court to **record**
- **Disclosure timetable** to request
- What **not to concede** / **not to overstate**
- If Crown says **X**, safe defence response **Y** (provisional)
- **Source-backed reason** per hearing point
- **Human-review** flag where needed

**Example (provenance conflict — same pattern as Phase 3.5):**

```txt
Battleboard: provenance/continuity conflict — Source A Morrisons vs Source B mail/package; unresolved.
War Room: The defence cannot safely accept exhibit provenance until seizure location, continuity,
exhibit log and officer statement are reconciled. Ask for seizure log, exhibit schedule, continuity
statement, officer MG11, BWV and photographs. Do not state final location as fact until reconciled.
```

### 9.4.8 Acceptance rules (Phase 4 exit — before UI)

- No deep strategy unless **source-backed** or clearly tagged **provisional** / **needs_solicitor_review**.
- **Proof Map nodes** must trace to Phase 3.5 explanation blocks or direct bundle text — no orphan strategy.
- Battleboard and War Room outputs must **reference Proof Map edges** (same proof point IDs / issue links).
- **No** case-by-case tuning in repo; shared map + lens rules only.
- **Forbidden:** “this wins”, “Crown cannot prove”, “proves innocence”, plea/outcome advice without qualification.
- If source is **missing or conflicting**, say so and give **safe next action** — do not merge contradictions.
- Evaluator packs (gold + optional local expects) mirror Phase 3.5 — reports **gitignored** under `artifacts/`.
- Pilot-3 + production-pass remain green after shared rule changes.

### 9.4.9 Phase 4 build slices (when user says “start Phase 4”)

| Slice | Deliverable |
|-------|-------------|
| **4a** | **Proof Map / Evidence Dependency Graph** — evaluator, gold expects, artifact reports |
| **4b** | **Battleboard** — strategy view of Proof Map + expects |
| **4c** | **War Room** — hearing-action view of Proof Map + expects |
| **4d** | **Product UI** (Control Room, Disclosure Chase, Supervisor, Client) — **last** — **slice 1–2 shipped:** read-only Reasoning panel + War Room bridge behind `?reasoningV2=1` / `localStorage: casebrain:reasoningV2=true`; route-difference notice; empty-state reasons; auditor probe |
| **4e** | **Strategy corpus expansion** — first **1k** scored fictional corpus + holdout packs (§9.7) — **after 4c** |
| **4f** | **Synthetic Criminal Bundle Factory** — generator architecture to **50k** variants; staged materialisation only (§9.8) |

Until **4a–4c** pass on gold (and agreed local exemplars), **4d UI stays off**. Until **4e** design is locked and **4c** is green, **do not** mass-generate bundles or tune on holdout. **50k is long-term private stress capacity — not a near-term deliverable.**

### 9.6.1 Phase 4d — product UI bridge (current)

**Status:** **4d slice 2 shipped — PR-ready** — Reasoning V2 panel hardened for pilot review (route consistency notice, empty-state reasons, sanitizer lint, War Room bridge focus, optional auditor probe). Flag remains **default OFF**.

**Enable (pilot/dev only):** `?reasoningV2=1` or `localStorage: casebrain:reasoningV2=true`.

### 9.6.2 Product layers after 4d UI bridge (agreed order — build in sequence)

**Principle:** Each layer extends the same spine — Reasoning V2 → Proof Map → Battleboard → War Room — without duplicate reasoning or random features.

| # | Layer | Status |
|---|--------|--------|
| 1 | **Solicitor feedback marking loop** | **Shipped (local)** — `lib/criminal/reasoning-v2/feedback/README.md` |
| 2 | **Client Account Stress-Test** | **Slice 1–2 shipped (local):** account compare + **Client Instructions Checklist** + **Do-not-concede Guard**; `?clientStress=1` + `?reasoningV2=1`; `lib/criminal/client-stress-test/README.md` |
| 3 | **New Evidence Change Detector** | **Slice 1 shipped (local):** snapshot compare (`?evidenceChanges=1` + `?reasoningV2=1`); `lib/criminal/evidence-change-detector/README.md` |
| 4 | **Disclosure letter / export builder** | **Slices 1–2 shipped (local):** disclosure chase + hearing prep + **case handover summary** (`?exports=1` + `?reasoningV2=1`); `lib/criminal/disclosure-export/README.md` |
| 5 | **Supervisor review queue + case handover** | **Slice 1 shipped (local):** per-case Supervisor QA panel (`?supervisor=1` + `?reasoningV2=1`); `lib/criminal/supervisor-qa/README.md` |
| 6 | **Client explanation mode** | Planned — plain-English solicitor-safe client summary (papers / missing / why not finalised) |
| 7 | **Plea/credit pressure warning** | Planned — timing/stage pressure only; no plea advice; optional |
| 8 | **Pre-hearing readiness score** | **Slice 1 shipped (local):** flag-gated badge (`?readiness=1` + `?reasoningV2=1`); `lib/criminal/pre-hearing-readiness/README.md` |
| 9 | **Route comparison** | Planned — identity / role / causation / self-defence / possession vs supply / mitigation with helps/hurts/missing/collapse |
| 10 | **Real-layout PDF/OCR stress lane** | Planned — private ingest (§9.7 lane B) |
| 11 | **Audio-to-Bundle Loop** | **Docs only** — §9.6.3 |
| 12 | **Phase 4f scale-up (5k / 10k / 50k)** | **After** workflows 1–9 are stable — §9.8 |

**Do not build yet:** NECD slice 2+ (auto-snapshot on upload), export slice 3+ (PDF download), supervisor multi-case queue (slice 2), client explanation (6), plea warning (7), route comparison (9), PDF/OCR (10), audio (11), mass corpus (12).

### 9.6.3 Audio-to-Bundle Loop (planned — do not build yet)

**Status:** **Roadmap only.** No product UI, transcription APIs, DB/schema changes, or audio files in repo until this lane is explicitly scoped and gated.

**Principle:** Audio must **never** become a free-standing “AI heard it so it is true” feature. It feeds the **same source-backed spine** as text bundles:

`audio transcript → source-backed issue → contradiction → Proof Map → Battleboard → War Room → solicitor review`

**Future ingestion sources (examples):**

| Source type | Examples |
|-------------|----------|
| Emergency / dispatch | 999 calls, CAD audio |
| Police material | BWV audio, interview recordings, custody audio |
| Messaging | WhatsApp voice notes |
| Defence-side | Client voice notes (instructions / account — provisional only) |

**Future structured output (per clip or segment):**

- Transcript (provisional until solicitor review)
- Speaker split (where reliable)
- Source label (999 / BWV / interview / custody / messaging / client note)
- Timeline events (time-coded where available)
- Admissions / denials (tagged provisional)
- Contradictions vs other served material
- Interview fairness / PACE issues (flag only — not legal advice)
- Missing source material (what audio references but is not on file)
- Proof-map links (which proof points affected)
- Battleboard impact (route pressure / helping / hurting — conditional)
- War Room safe hearing line + do-not-overstate warning

**Cross-source conflict example (target behaviour):**

If **999 audio** says X, **MG5** says Y, and **BWV** says Z, CaseBrain should flag:

- **Source conflict** — what differs, on which papers/clips
- **Why it matters** — which element or proof point is in play
- **What proof point it affects** — link to Proof Map id internally; product shows label only
- **What to chase** — disclosure / continuity / enhanced transcript / original recording
- **What not to overstate** — do not treat any single clip as agreed fact; solicitor review required

**Non-negotiables:**

- No “proves innocence”, “Crown collapses”, “guaranteed”, or outcome predictions from audio alone.
- Transcripts are **provisional** until reviewed; human-review flag when clip quality, speaker ID, or cross-source conflict is unresolved.
- Audio ingest is a **private stress lane** (like PDF/OCR lane B) until eval gates exist — no client audio in git.
- Product UI for audio playback/transcription is **out of scope** until 4d Reasoning bridge is stable in pilot.

---

## 9.7 Strategy corpus expansion + holdout stress pack (Phase 4e — planned)

**Status:** **4e-slice-3 shipped** — holdout milestone reporting, anti-tautology checks, trap tests, threshold baseline. See `docs/strategy-corpus/README.md`.

**Goal:** Train and test **pattern survival** across unseen bundles — not memorise individual PDFs or bundle IDs.

**Relationship to §9.8:** Phase **4e** ships factory **v1** + first **1k** manifest/truth-key/expect lane + blind eval runners. Phase **4f** scales the **same factory** to 5k / 10k / 50k without changing the scoring philosophy.

### 9.7.1 Corpus strategy (recommended — mixed A + B, not C at scale)

| Lane | Role | In git? |
|------|------|--------|
| **A — Generated fictional corpus** | Primary scale: ~1000 cases with **truth keys** + structured bundle text (and optional PDF shells when extract/OCR lane is ready) | Truth keys + **fictional** fixture metadata only; **no** raw PDFs in repo |
| **B — Local real PDF ingest** | Secondary **layout/OCR/realism stress** — small batches, manual ingest script (`bundle-fidelity-ingest-local-pdfs`) | **Gitignored** PDFs + local truth keys + local expects |
| **C — Manual upload (1000)** | **Not recommended** for bulk — too slow, non-reproducible, risks client material in wrong place | N/A |
| **D — Mixed** | **Yes:** A for scored blind eval; B for private stress; gold **7** stays the regression anchor | See `docs/bundle-fidelity-set/README.md` |

**Honest sequencing:** Today’s fidelity evaluators run on **repo-safe bundle text** (markdown/copy-paste). Phase **4e** can start with **1000 fictional bundles + truth keys** (same schema as gold) and add **PDF generation** as a parallel stress layer once product extract/OCR is in scope — do not block 4c on 1000 PDFs.

### 9.7.2 Suggested split (stratified, not random-only)

| Pack | Count | Use |
|------|------:|-----|
| **Discovery / training** | **700** | Fingerprint mining; shared rule fixes; may re-run after fixes |
| **Validation** | **150** | Tune **shared** thresholds/lenses only; never per-case hacks |
| **Secret holdout** | **150** | **Blind first**; **untouched** during fix loops; final gate only |

Stratify by **offence family** (fraud, PWITS, violence/GBH/S18, robbery/ID, motoring, generic provisional, serious provisional) and by **failure-mode tags** (thin bundle, messy index, partial CCTV, CAD/999 gap, interview summary only, custody/PACE, timing contradiction, exhibit continuity, ID dispute, phone attribution, self-defence provisional, etc.) — see user pattern list in §9.7.4.

### 9.7.3 Method (same as playback — non-negotiable)

1. **Blind run first** on discovery (and holdout only at milestones).
2. **Separate artifact files** per case; **group fingerprints** (regex/issue families), not case IDs.
3. **One shared fix** per fingerprint → re-run discovery + validation; **holdout frozen** until release candidate.
4. Score full stack where available: bundle → explanation (3.5) → proof map (4a) → battleboard (4b) → war room (4c).
5. **No** case-by-case tuning in repo; **no** committing client PDFs, local truth keys, or artifacts.

### 9.7.4 Pattern coverage (fictional corpus themes)

Include deliberate variation (not one “perfect” bundle shape):

- Thin vs normal vs messy-OCR-style text; duplicate pages; wrong indexes; corrected charge sheets
- Missing MG5; incomplete MG6; draft/corrected MG11
- CCTV stills without master; CAD summary without full log; 999 summary without audio; interview summary without transcript
- Custody/PACE disclosure gaps; multi-defendant; multi-count
- Offence families: fraud, PWITS, GBH/S18, robbery/ID, motoring, perverting, witness intimidation, serious provisional
- Cross-cutting: weapon provenance conflicts, timing contradictions, exhibit continuity, self-defence (provisional), causation disputes, ID disputes, phone/device attribution disputes

### 9.7.5 What **not** to do (avoid overfitting)

- Do **not** tune rules to make **holdout** pass during development.
- Do **not** add per-case `if (bundleId === …)` fixes in repo.
- Do **not** merge holdout cases into discovery after seeing failures.
- Do **not** treat validation pass rate as ship gate if fixes were driven by validation peeking.
- Do **not** commit real client PDFs or firm matter text “for convenience.”
- Do **not** chase **1000/1000 pass** — chase **fingerprint collapse rate** and **no unsafe advice** patterns.
- Do **not** use the corpus to **memorise** outputs (no answer-key matching per PDF filename).
- Do **not** start mass PDF generation **before** 4c War Room evaluator exists (strategy spine must be scoreable end-to-end).

### 9.7.6 Gates and commands

```powershell
npx tsx scripts/strategy-corpus.ts --count 50 --split discovery --canary
npx tsx scripts/strategy-corpus.ts --count 1000 --split all
npx tsx scripts/strategy-corpus.test.ts
```

Reports: `artifacts/casebrain-auditor/latest/strategy-corpus/` (gitignored). Generated bodies: `artifacts/casebrain-auditor/cache/strategy-corpus/` (gitignored).

### 9.7.7 Relationship to Phase 12 and §9.8

**Phase 12 (real PDF stress)** remains the **private/local** lane for a small set of real layouts. **Phase 4e** is the **first large fictional scored corpus**. **Phase 4f** is the **long-term factory scale-up** (up to **50k** scenario capacity). All three feed fingerprints into the same shared-fix loop; none replaces gold **7** or pilot-3/production-pass gates.

---

## 9.8 Synthetic Criminal Bundle Factory (Phase 4f — planned scale-up)

**Status:** **Architecture plan only** — design during **4e** so the first **1k** run uses factory patterns; **do not** materialise 50k cases until evaluator stability and storage/runbook are proven.

**Purpose:** A **parametric generator** capable of **50,000+ fictional criminal case variants** (scenario identity + truth + expects), with **lazy/staged materialisation** — most cases exist as **manifest + truth key + expectations** until a run explicitly renders bundle text or a **sampled** PDF subset.

**This is not:** 50,000 full PDFs on day one; LLM-authored case law essays; committed client matter text; a pass-rate vanity metric.

### 9.8.1 Factory architecture (long-term)

```txt
Seed + scenario recipe (offence family, tags, doc mix, gap/contradiction profile)
  → Case manifest (inventory, labels, fingerprint tags, split assignment)
  → truth-key.json (ground truth for bundle fidelity)
  → optional bundle text (markdown sections) — rendered on demand
  → optional expectation files (explanation / proof-map / battleboard / war-room)
  → optional PDF shell — sampled subset only, when OCR/layout lane exists
  → Eval runners (staged: read → explain → map → battleboard → war room)
  → Fingerprint rollup (not per-case tuning)
```

**Core principles:**

| Principle | Meaning |
|-----------|---------|
| **Capacity ≠ materialisation** | Factory can *address* 50k IDs; only **N** are rendered/run per stage |
| **Deterministic seeds** | `seed` + `recipeId` → reproducible case; reruns comparable |
| **Manifest-first** | Truth lives in manifest/truth-key; bundle text is a **view** |
| **Stratified tags** | Every case carries offence family + failure-mode fingerprint tags |
| **Holdout frozen** | Secret holdout manifest list never merged into discovery mid-loop |
| **Gold 7 anchor** | Hand-crafted gold stays small, human-readable regression |

Complements **1000-case safety playback** (product surfaces) with **scored strategy depth** (paper truth → court-safe outputs).

### 9.8.2 Staged scale (recommended gates)

| Stage | Target capacity | Materialise (typical) | Gate before next stage |
|-------|----------------:|------------------------|-------------------------|
| **4e — v1** | **1,000** | ~1k manifests + truth keys; ~1k bundle text; **0–50 PDF samples** | Full stack eval stable; fingerprint loop works; holdout blind once |
| **4f.1** | **5,000** | Manifests/truth keys for 5k; **run** discovery on 1k–2k text bundles per loop | Top fingerprint groups collapsing; no unsafe advice regressions |
| **4f.2** | **10,000** | Manifests for 10k; batch eval in chunks (e.g. 50–100); PDF sample **1–2%** | Evaluator runtime + artifact storage under control |
| **4f.3** | **50,000** | **Long-term private stress corpus** — manifests + truth keys at scale; text rendered in batches; PDF **≤0.5–1%** sample | Release-candidate holdout; legal review of factory templates |

**Split ratios (hold at every stage):** ~**70% discovery / 15% validation / 15% secret holdout** (e.g. 1k → 700/150/150; 50k → 35k/7.5k/7.5k). Stratify within each split by offence family and fingerprint tag — not pure random.

### 9.8.3 Text vs PDF (honest default)

| Output | Default | When |
|--------|---------|------|
| **Manifest + truth-key + expects** | **Always** | All stages |
| **Markdown / text bundle** | **Primary** for eval | 4e–4f until extract/OCR product lane is in scope |
| **PDF render** | **Sampled subset only** | Layout/OCR stress; never required for strategy fidelity scoring |

**50k should mean 50k scored scenarios**, not 50k binary PDFs in git or on laptop disk by default.

### 9.8.4 Case manifest schema (minimum fields — future spec)

Each generated case should carry enough structure to test **read → explain → proof map → battleboard → war room** without case-specific repo code:

| Field group | Fields (indicative) |
|-------------|---------------------|
| **Identity** | `caseId`, `seed`, `recipeId`, `fictional`, `generatorVersion`, `split` (`discovery` \| `validation` \| `holdout`) |
| **Charge / stage** | `offenceFamily`, `offenceLens`, `chargeWording`, `stage`, `court`, `hearingDate`, `defendant(s)`, `coDefendants`, `counts[]` |
| **Document inventory** | `documents[]`: `{ type, status: served\|partial\|outstanding\|conflicting, sectionRef }` — MG5, MG6, MG11, CCTV, CAD, 999, BWV, interview, custody, medical, index, charge sheet |
| **Evidence states** | `evidenceSignals`: CCTV (stills/master), CAD/999 (summary/full), BWV, phone download, lab, cash, bank export, device logs, ID procedure |
| **Ground truth gaps** | `missingMaterialExpected[]`, `contradictionsExpected[]` (source A vs B, unreconciled) |
| **Strategy expects** | `explanationExpectRef`, `proofMapExpectRef`, `battleboardExpectRef`, `warRoomExpectRef` (paths or inline schema version) |
| **Fingerprint tags** | `fingerprintTags[]` — e.g. `thin_bundle`, `bad_index`, `cctv_stills_no_master`, `cad_timing_conflict`, `pace_limited_disclosure`, `weapon_provenance_conflict`, `pwits_phone_outstanding` |
| **Prohibited / caps** | `prohibitedFamilies[]`, `humanReviewExpected`, `doNotOverstateThemes[]` |
| **Materialisation** | `bundleTextPath`, `pdfPath`, `materialisedAt`, `linkStatus` (`manifest-only` \| `text-rendered` \| `pdf-sampled`) |

Expect files should assert **patterns** (contains issue, link type, proof point id) — not verbatim paragraph matching — to avoid memorisation.

### 9.8.5 Variation dimensions (factory recipes)

Recipes combine weighted draws across:

- Offence family and charge wording variants; serious/provisional offences
- Stage, court, hearing date; multi-count; multi-defendant
- Document mix quality (missing MG5, incomplete MG6, draft/corrected MG11, bad index, duplicate pages, corrected charge sheet, late evidence)
- Missing/partial evidence (CCTV stills without master; CAD summary without log; 999 summary without audio; interview summary without transcript)
- Contradictions (timing, incident date, exhibit location/continuity, witness reliability)
- Custody/PACE/disclosure schedule quality
- Cross-cutting disputes: self-defence (provisional), causation, identity, phone/device attribution, weapon provenance

### 9.8.6 Storage and performance risks

| Risk | Mitigation |
|------|------------|
| **Disk** (50k text bundles) | Manifest-only default; render text to **gitignored cache** or object store; chunk by split |
| **Git repo size** | Commit **schemas + recipes + small gold** only; not 50k bodies or PDFs |
| **Eval runtime** | Batch/chunk runners (`--chunk-size`, `--offset`); fingerprint rollup without per-case human review |
| **Artifact explosion** | Aggregate reports by fingerprint; cap per-case JSON retention; TTL on discovery artifacts |
| **False confidence** | Holdout frozen; report **unsafe / contradiction-merge / overstatement** rates, not pass % alone |
| **Generator bugs at scale** | `generatorVersion` on every manifest; replay seed; template unit tests on recipes |
| **LLM drift** | **No LLM in factory v1** — templated parametric generation only |

### 9.8.7 What **not** to do (50k scale)

- Do **not** materialise 50k PDFs as a milestone.
- Do **not** commit corpus bodies, PDFs, or run artifacts.
- Do **not** chase **50k/50k pass**.
- Do **not** tune on holdout or merge holdout into discovery.
- Do **not** add per-case fixes in application code.
- Do **not** use factory output to fine-tune models on memorised bundles (if ML is ever added — out of scope for now).
- Do **not** skip **4c** or gold **7** because “we have 50k scenarios.”
- Do **not** let factory replace solicitor review on real matters.

### 9.8.9 Scale-run method (planned runner — docs only)

**Do not build, run, or materialise 50k in this phase.** This subsection records the long-term scaling route so engineers do not default to “50k PDFs” or “50k/50k pass” later.

**Fast safe method = chunked manifest/text run with summary-only reports, not 50k PDFs.**

| Rule | Design |
|------|--------|
| **What 50k means** | **50k manifest/text scenarios** (IDs + truth keys + optional rendered bundle text in **gitignored cache**), **not** 50k committed or generated PDFs |
| **PDFs** | **Sampled later only** for OCR/layout stress (e.g. ≤0.5–1% of corpus); never required for strategy fidelity scoring |
| **Execution** | Run in **chunks** (e.g. 500–1000 cases per batch); resume-friendly; no single monolithic job |
| **Reports (default)** | **Summary-only** — fingerprint rollup, by-split counts, unsafe-rate, top weak/fail fingerprints |
| **Heavy artifacts** | **Weak/fail cases only** — per-case detail JSON/Markdown retained for investigation, not every pass case |
| **Per-case reports** | **No** full per-case reports for 50k unless explicitly requested (`--full-case-reports` future flag) |
| **Holdout** | **Remains frozen** — never merged into discovery mid-loop; milestone report only |
| **Fixes** | **No `caseId` hacks** in application or eval code — shared recipe / lens / generator fixes only |
| **Success goal** | **Fingerprint collapse + safety**, not vanity **1000/1000** or **50k/50k** pass rates |

**Staged path (mandatory before 50k):**

1. **Benchmark 1k** — measure runtime, fingerprint baseline, storage per chunk (current **4e** lane)  
2. **5k** — manifest scale + chunked discovery runs  
3. **10k** — chunk + summary-only discipline proven  
4. **50k** — long-term private stress capacity only after 10k runbook is stable  

**Proposed future runner flags (not implemented until approved):**

```txt
npx tsx scripts/strategy-corpus.ts --count 5000 --split discovery
  --chunk-size 500          # or 1000
  --summary-only            # default on for large counts
  --weak-fail-only-artifacts
  # --workers N             # optional later if safe and deterministic
```

| Flag | Purpose |
|------|---------|
| `--count 5000` / `10000` / `50000` | Target scenario count (manifest-first) |
| `--chunk-size 500` or `1000` | Batch size per eval pass |
| `--summary-only` | Emit rollup JSON/MD only; skip per-pass case trees |
| `--weak-fail-only-artifacts` | Write detailed artifacts only for non-pass cases |
| `--workers` (later) | Parallel chunks only if reproducible and storage-safe |

**Rough runtime method:**

1. Time a full **1k** text run on target hardware (wall clock, disk written).  
2. Estimate **50k** as **~1k runtime × 50** if single-threaded and similarly IO-bound.  
3. If parallel workers are added later, discount CPU time but **not** fingerprint rollup merge cost or disk caps.  
4. Abort or down-scope if a chunk exceeds agreed storage budget (see below).

**Storage warnings:**

- Do **not** write huge artifact trees under `artifacts/` for large counts.  
- Do **not** render PDFs by default.  
- Use **gitignored cache only** (`artifacts/casebrain-auditor/cache/strategy-corpus/` or equivalent) for rendered text bodies.  
- Cap retained per-case JSON; TTL or prune pass-case artifacts after rollup.  
- Commit **schemas, recipes, thresholds, gold 7** — never 50k bodies or run output.

**Ask / answer (for future operators):**

- *“How do we run 50k safely?”* → Chunked **manifest/text** eval with **summary-only** reports; PDF sample separate and tiny.  
- *“Is 50k/50k the goal?”* → **No** — reduce top fingerprints and unsafe wording; holdout is a blind gate, not a tuning set.  
- *“Can we skip 1k?”* → **No** — 1k is the benchmark for runtime, storage, and evaluator stability.

### 9.8.8 Success metrics (factory era)

Prioritise:

1. **Unsafe advice / forbidden phrase** rate → zero tolerance on sampled runs  
2. **Fingerprint frequency** → top groups trend down after shared fixes  
3. **Explanation** — source basis present; contradictions not merged  
4. **Proof map** — proof points and links trace to Phase 3.5 / bundle text  
5. **Battleboard / War Room** — provisional caps, disclosure chase, no outcome certainty  
6. **Holdout** — blind milestone only; not a daily tuning target  

---

## 9.5 Phase 10 — Legal Q&A brain (case-aware questions)

**Purpose:** Help solicitors who are strong in one area but weaker in another (motoring vs fraud vs PWITS, charge elements, procedure, disclosure, hearing). **Second brain + checker** — not replacement counsel.

**Gate — do not build until:**
- Phase 3 bundle fidelity is strong (charge/defendant/docs read reliably on gold set).
- **Phase 3.5 explanation fidelity** passes on gold + local exemplars (source-backed missing material + contradictions; no invented facts).
- Phase 4 **Proof Map + Battleboard + War Room** pass eval (§9.4.8–9.4.9); product UI only after **4a–4c** and explicit “start Phase 4”.
- Phase 5 hero surfaces align with War Room hearing outputs.
- Chat grounding already uses agreed summary, Safety, case theory (V2 §3, §6 B6).

If Q&A runs on badly read PDFs or thin explanation blocks, it will sound clever and be **unsafe**.

### 9.5.1 What it is not

- Not: user asks → AI gives confident legal advice (“plead guilty”, “you will win”, “Crown cannot prove it”).
- Not: abstract law essay disconnected from the file.
- Not: training on committed client PDFs or firm case data in git.

### 9.5.2 What it is

Flow:

```txt
User asks legal/workflow question
→ CaseBrain loads case facts (agreed summary, Key Facts, Safety, route, bundle fidelity signals)
→ Pulls from approved legal sources (statute, Crim PR, CPIA/disclosure guidance, Sentencing Council, CPS legal guidance, solicitor-approved notes — not memory alone)
→ Answers with: legal point | why it matters | what evidence affects it | what is missing | risk if wrong | safe next step
→ Confidence tag on every answer
→ Disclaimer: solicitor must verify; not final advice
```

**Example (motoring):**

| Bad | CaseBrain-style |
|-----|-----------------|
| “Yes, argue careless driving.” | “Reduction *may* be an issue depending on standard of driving, causation, injury evidence, expert/collision material, and **served papers**. On current bundle: **provisional only**. Chase dashcam, expert, CAD, medical link. **Solicitor must confirm** after full disclosure.” |

### 9.5.3 Required layers (safeguards)

| Layer | Requirement |
|-------|-------------|
| **Case-aware** | “On **these** papers…” or “papers do not safely support that yet” — never abstract-only on a live matter |
| **Source-backed** | Cite or name basis (statute, rule, guidance, plan); flag when source missing |
| **Confidence tags** | `settled` \| `likely` \| `provisional` \| `needs_solicitor_review` \| `not_enough_information` |
| **Forbidden outputs** | Outcome guarantees, plea advice, “proves innocence”, “Crown cannot prove” without qualification |
| **Required outputs** | What’s missing, what solicitor must verify, safe next step, link to route/disclosure where relevant |
| **UI disclaimer** | Persistent: not legal advice; for qualified solicitor use; verify before court/client reliance |

### 9.5.4 Question domains (starter bank)

- Charge elements and differences (e.g. possession vs PWITS; s18 vs s20; dangerous driving standard)
- Disclosure / CPIA (what to chase, why MG6 matters, incomplete schedules)
- Identification, CCTV/BWV continuity, interview / no-comment implications (procedural, not verdict)
- First hearing / PTPH safe asks (align with Hearing Prep Mode §3.9)
- Thin bundle / provisional routes — what not to overstate
- Offence families the solicitor does not usually handle (motoring, fraud account-control, etc.)

### 9.5.5 Training / quality method (same as playback)

Not ML on client files. Use:

| Asset | Role |
|-------|------|
| **Question bank** | Approved solicitor questions per domain |
| **Gold answers** | Safe wording + required elements |
| **Bad-answer traps** | Overconfidence, no source, no case link, final advice |
| **Auditor checks** | Cited source? linked to case? missing material stated? confidence tag? |
| **Separate reports** | e.g. `legal-qa-overconfident.md`, `legal-qa-no-case-link.md` |
| **One fix per fingerprint** | Shared prompt/rule/guard — re-run Q&A pack |

Pilot pack idea: `legal-qa-pilot` (fictional cases only) — parallel to `pilot-3` and `bundle-fidelity --pack gold`.

### 9.5.6 Integration with V2 chat

- Extends **§3.5 Chat as case builder** and **§3.6 sources/confidence** — Legal Q&A is a **mode** or command family (e.g. `/law`, `/charge`, `/disclosure`) with stricter guards than general chat.
- Grounding order: agreed summary → case theory → Safety missing items → route/profile → law slices → **approved legal KB** → fidelity signals (“charge read as X”).
- Client-facing copy (Phase 7) must never be **more** confident than solicitor/Q&A output.

### 9.5.7 Success criteria (Phase 10 exit)

- Fictional question pack: ≥85% pass on auditor (no unsafe advice patterns).
- Hero cases: sample questions return case-linked, provisionally worded answers.
- Playback + fidelity gates still green after Q&A guard changes.
- Solicitor review sign-off on gold answer bank before public/demo Q&A.

### 9.5.8 Product promise (when ready)

```txt
Ask CaseBrain anything about the file.
It answers carefully.
It shows what it relies on.
It says what is missing.
It tells you what a solicitor must verify.
It never pretends to be the solicitor.
```

---

## 9.6 Build order relative to V2

| Priority | Track |
|----------|--------|
| **Done** | Phase 3 + **3.5** (gold 7/7); Phase **4a** Proof Map; Phase **4b** Battleboard-view (eval) |
| **Next** | Phase **4c** War Room-view evaluator → merge; then lock **4a–4c** on gold |
| **Then** | Phase **4e** — first **1k** scored strategy corpus (factory v1) — §9.7 |
| **Then** | Phase **4f** — factory scale-up **1k→5k→10k→50k** (manifest-first, staged runs) — §9.8 |
| **Then** | Phase **4d** product UI (only after **4a–4c** + agreed corpus gates) |
| **Then** | Phase 5 hero demo + hearing surfaces (V2 Hearing Prep aligns with War Room) |
| **Then** | V2 Phase A–B core where it unblocks agreed summary + chat grounding |
| **Then** | Phase 6–9 pilot product + feedback |
| **Then** | **Phase 10 Legal Q&A** (after §9.5.1 gates + Phase 4 exit) |
| **Later** | Phase 11 offence map expansion; Phase 12 local real-PDF stress (gitignored) + factory PDF sampling |

V2 **chat modernisation** (§3.11, Phase D4) can ship UI polish before or in parallel with Legal Q&A **content** guards — but Legal Q&A **logic** must not precede Phase 3 + **3.5** + **4** strategy fidelity.

---

*End of CaseBrain V2 Master Plan. When ready, turn chosen items into concrete specs and code.*
