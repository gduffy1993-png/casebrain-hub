# Plan: AI Strategy as Hero + Guardrailed Conversation + Living Strategy

**Goal:** One clear proposed strategy at the top, one scoped "Ask about this case" conversation, and a gentle nudge when the case changes. Human always in control. No predictions, no new offence types, everything logged.

**Design principle (ChatGPT):** Proposal = anchor. Conversation = pressure-test the proposal, not the universe. Nudge = "something changed; do you want to look again?" — no auto-changes, no silent rewrites.

---

## What gets removed or demoted

| Thing | Action | Why |
|-------|--------|-----|
| Current **"AI strategy suggestion"** block (collapsed section with "Get suggestion", Use/Edit/Reject) | **Remove as separate section.** Replace with the new **"Proposed strategy for this case"** block at the **top** of Strategy. | One place for the proposal; no competing "AI" blocks. |
| **Strategy Routes** (three big cards: Fight charge, Charge reduction, Outcome management) | **Demote.** Keep content but make it **reference only**: compact cards or single "Compare strategies" expandable below the proposal. Proposal stays the single hero. | Stops three routes competing with one proposal. |
| Any duplicate "Get suggestion" or secondary AI strategy UI | **Remove.** Only one entry point: the proposal block at top. | One moment, one ownership. |
| Loose or generic "chat" about the case | **Don’t add.** Only **guardrailed** "Ask about this case" (scoped to proposal + fixed angles). | Precision, not chatter. |

**Kept (and where they sit):**

- **Proposed strategy** (new shape) — top of Strategy column.
- **Current Defence Position** — below; shows the adopted/edited position.
- **Commitment** — below; reflects chosen route (e.g. Charge reduction).
- **Defence Plan / Legal tests / Attack order** — support the strategy; keep.
- **Declared Dependencies, Disclosure Chase, Irreversible Decisions, Safety** — keep; they’re evidence and readiness, not the strategy proposal itself.

---

## Order of work

### Phase 1: Proposal as hero (UX only — use existing API)

**Objective:** One block at the top. No new AI. Use current strategy-suggest API and data.

1. **Add "Proposed strategy for this case" block** at the very top of the Strategy column.
   - Title: e.g. "Proposed strategy for this case".
   - One line: offence type + primary route (e.g. "Assault/OAPA · Charge reduction (s18 → s20)").
   - 2–4 strategy angles (from existing API).
   - Short narrative (from existing API).
   - Confidence line: "Based on charges and case summary. Verify and add client instructions."
   - Actions: **Use this strategy** | **Edit** | **Reject** (or "Get new proposal" after reject).
   - Optional: one line **Alternatives:** "Fight charge | Outcome management" (so they see we considered options).

2. **Remove the old "AI strategy suggestion"** collapsed section so there’s only this one proposal block.

3. **Wire "Use this strategy":**
   - Set/update **Current Defence Position** from proposal narrative.
   - Set **Commitment** to the matching route (e.g. Charge reduction).
   - Record audit (e.g. source: ai_suggested, ai_approved_at) using existing position API.

4. **Wire "Edit":**
   - Open Record Position (or a small edit flow) with proposal text pre-filled; on save, treat as solicitor-edited (no "AI approved" if they change materially, or tag "based on AI, edited").

5. **Wire "Reject":**
   - Clear proposal from UI; optionally call existing reject API; show "Get proposed strategy" again.

**Outcome:** Solicitor sees one proposal first, then Use/Edit/Reject. Rest of Strategy column unchanged in function, just layout order.

---

### Phase 2: Simplify what’s below (so proposal dominates)

**Objective:** Strategy Routes and other content support the proposal; they don’t compete with it.

1. **Restructure Strategy Routes:**
   - Option A: Turn the three big route cards into a **compact "Reference: other strategies"** section (e.g. expandable or short list with one line each).
   - Option B: Keep cards but move them **below** the proposal and Current Position, and add a short label: "Compare other options (reference)."

2. **Ensure visual hierarchy:** Proposal block is the largest/most prominent; Current Position and Commitment clearly visible next; then Defence Plan, Dependencies, Disclosure, Safety.

3. **No new features in Phase 2;** only layout and labels.

**Outcome:** One clear "main thing" (proposal); everything else clearly supporting or reference.

---

### Phase 3: Guardrailed conversation ("Ask about this case")

**Objective:** Let solicitors pressure-test the proposal with scoped Q&A. Not generic chat; answers only within fixed angles and doctrine.

1. **UI:**
   - In or just below the proposal block: **"Ask about this case"** or **"Ask about this strategy"**.
   - Input + thread of Q&A (or at least last exchange). No replacement of the proposal; conversation is secondary.

2. **Backend:**
   - New endpoint (e.g. `POST /api/criminal/[caseId]/strategy-ask`) or extend strategy-suggest.
   - Input: message text + case context (charge text, summary, **current proposal** — offence type, angles, narrative).
   - System prompt: answer only in scope of this case; use only fixed offence types and strategy angles; no new routes; conditional, evidential, short; no predictions ("the court will", "likely outcome"); no legal advice. "Like questioning a junior."
   - Response: plain text or short structured reply. Length cap.
   - **Log every exchange:** case_id, user_id, prompt, response, timestamp (audit).

3. **Guardrails in prompt:**
   - Proposal remains primary; chat never replaces it.
   - No new offence types, routes, or outcomes.
   - Answers stay conditional, evidential, short.
   - No predictions. No "likely outcome". No "the court will".
   - Every interaction logged as assistance, not authority.

**Outcome:** Solicitors can ask "What if disclosure never comes?", "What’s my fallback if they prove intent?" and get answers that stay in scope, with full audit.

---

### Phase 4: Strategy that stays current (nudge only)

**Objective:** When the case changes, prompt "Review proposed strategy?" — no auto-changes, no silent rewrites.

1. **Define "case updated":**
   - New disclosure item logged, or
   - New document uploaded (or key doc re-processed), or
   - New charge added/edited, or
   - Explicit "case updated" flag (e.g. from disclosure chase or manual).

2. **Track "last proposal" and "last case update":**
   - When we show or refresh the proposal, store proposal timestamp (and optionally a lightweight hash of inputs: charges + doc summary).
   - When we detect a case update (from events above), set "case_updated_after_proposal" (or equivalent).

3. **UI nudge:**
   - If case was updated after last proposal (or after last "Review" dismissal): show a small banner or line: **"Case updated. Review proposed strategy?"** with button **"Refresh proposal"** (and optionally "Dismiss").
   - "Refresh proposal" calls the existing strategy-suggest API again and replaces the proposal block content. Human still approves via Use/Edit/Reject.

4. **No auto-refresh:** We never change the proposal or the recorded position without the human clicking.

**Outcome:** Strategy stays in view as the case evolves; human always decides when to refresh and whether to adopt.

---

### Phase 5: Guardrails and audit (reinforce)

**Objective:** Hard lines everywhere: no predictions, no new types, everything logged.

1. **Review all prompts** (proposal + conversation):
   - No "likely outcome", "the court will", "you will win/lose".
   - No introducing offence types or strategy angles outside the fixed lists.
   - Proposal and conversation both: assistance, not authority.

2. **Audit:**
   - Proposal: already have event logging (request, fallback, success, rejected, approved).
   - Conversation: every Q&A pair logged with case_id, user_id, timestamps, no PII in logs (or minimal).
   - Position API: already has source/ai_approved_at; ensure "Use this strategy" uses it.

3. **UI disclaimers:**
   - On proposal block: "AI-assisted. Not legal advice. You must verify and take responsibility."
   - On conversation: same tone; e.g. "Answers are scoped to this case and strategy. Not legal advice."

**Outcome:** Design is not only good UX but clearly compliant and defensible.

---

## Summary table

| Phase | What | Removes / demotes |
|-------|------|--------------------|
| 1 | Proposal as hero; Use/Edit/Reject; remove old AI block | Old "AI strategy suggestion" section; duplicate entry points |
| 2 | Simplify Strategy Routes; hierarchy under proposal | Routes demoted to "reference" |
| 3 | Guardrailed "Ask about this case" + backend + logs | — |
| 4 | "Case updated. Review?" nudge + refresh proposal | — |
| 5 | Guardrails and audit pass | — |

---

## Hard guardrails (non-negotiable)

- The **proposal** remains primary. Chat never replaces it.
- Chat **cannot** introduce new offence types, routes, or outcomes.
- Answers stay **conditional, evidential, short**. No predictions. No "the court will".
- Every interaction **logged** as assistance, not authority.
- **No auto-changes** to strategy or position; nudge only.

---

---

## Implementation status

- **Phase 1:** Done. Proposal block at top; Use/Edit/Reject; commitment wired; old AI block removed.
- **Phase 2:** Done. Strategy Routes wrapped in FoldSection "Compare other strategies (reference)" default closed.
- **Phase 3:** Done. "Ask about this case" UI + POST /api/criminal/[caseId]/strategy-ask; guardrailed prompt; logged.
- **Phase 4:** Done. GET strategy-suggest/status (caseUpdatedAt); nudge "Case updated. Review proposed strategy?" + Refresh/Dismiss; sessionStorage lastProposalAt.
- **Phase 5:** Done. Prompts no predictions; strategy-suggest and strategy-ask logged; UI disclaimers in place.

---

## What needs finishing: Training / real-case improvement

**Goal:** Make the proposal and angles charge-specific and grounded in how each offence is actually fought – not generic across robbery, arson, assault, etc.

**Approach: method-first (agreed best way to do this).**  
Solicitors learn **methods** (the law, elements of offences, standard defence angles), not by studying hundreds of individual cases. So we encode **how each charge type is legally fought** – elements, defences, standard angles – into the prompt and constants. No real-case dataset required for this step. We can add real data or a firm playbook later if available.

**Method-based encoding (do this first):**
- For each offence type (assault_oapa, robbery, theft, arson, drugs, fraud, etc.): encode the **standard ways that charge is argued and fought** in law (e.g. assault: intent vs recklessness, self-defence, ID; robbery: theft + force, deny dishonesty / deny force; arson: intent, recklessness, lawful excuse). This is legal method, not made-up case outcomes.
- Build that into (1) per-charge guidance in the prompt and (2) strategy angles/labels in constants so the model is steered by method.

**Optional later:** If you get real case data or a short “how we fight robbery” playbook, we can layer that in to nudge emphasis or add angles. Method first; data/playbook when you have it.

**Plan (add these to the finishing list):**

1. **Encode per-charge method in the prompt**  
   - In `lib/criminal/strategy-suggest/prompt.ts` (and optionally strategy-ask): add a short, charge-specific block per offence type describing how that charge is typically fought (elements, common defence angles).  
   - Examples: assault/OAPA → intent vs recklessness, self-defence, identification; robbery → theft (dishonesty, appropriation) + force/threat, deny dishonesty / deny or minimise force; theft → dishonesty, appropriation, intention to deprive, honest belief, claim of right; arson/criminal damage → intent, recklessness, lawful excuse; drugs → possession, intent to supply, deny possession, personal use; fraud → dishonesty, representation, no false representation, no intent to gain/loss.  
   - No dataset required – this is legal method.

2. **Review and tighten constants (strategy angles per offence)**  
   - In `lib/criminal/strategy-suggest/constants.ts`: review `getStrategyAnglesForOffence(offenceType)` and angle labels.  
   - Ensure every offence type has angles that match the method (add any missing angles, adjust labels to how solicitors talk).

3. **Validate and iterate**  
   - Run the app on a few cases per charge (robbery, arson, assault, etc.).  
   - Check: does the proposed offence type and angles feel right for that charge?  
   - Refine prompt and constants based on what still feels generic or wrong.

4. **Optional later: data or playbook**  
   - If you later have real case summaries or a “how we fight X” playbook: use that to nudge weighting or add angles.  
   - Optional: 1–2 sentence examples per charge or small RAG once we have that material.

**Order of work:**  
Do (1) and (2) – method-based encoding in prompt + constants. Then (3) validate on a few cases. Add (4) only when you have data or a playbook.

---

## Professional layout: tabbed / pop-out (case page)

**Goal:** Replace one long full-page scroll with a tabbed (or click-to-pop-out) layout so the solicitor gets one thing at a time – e.g. click “Key facts” or “Summary”, that section is what they see. More professional; matches workflow (task by task).

**Current state (from case page paste):**  
The case page is a single long scroll: Case Files → Letters → Export → Case status / At a glance → Key Facts (client, opponent, summary, domain summaries, key dates, primary issues, next step, role lenses) → Charges → Case phase → Evidence / Defence Plan (Compare other strategies, Fight Charge / Charge Reduction / Outcome Management, Tactical Plan, Current Defence Position) → Guidance (Strategy Commitment, Defence Strategy Plan, legal tests, attack order, defence counters, reassessment triggers, hearing prep, strategic options) → Supervisor Snapshot → Declared Dependencies → Disclosure Chase Timeline → Irreversible Decisions → Case Readiness → Procedural Safety → Worst-Case Exposure → Solicitor notes → Client instructions → Missing Evidence → Disclosure Tracker → Disclosure Chasers → Strategy / Next steps / Additional Tools (PACE, Court Hearings, Client Advice, Bail). Everything is visible in one flow; no way to “open just Summary” or “just Strategy”.

**Proposed approach:**

- **Tabs (or clear sidebar sections)** such as: **Key facts** | **Summary** | **Charges** | **Strategy** | **Disclosure** | **Next steps** | **Client / Instructions** | **Safety & procedural** | **Additional tools**. Click a tab → that section is the main content (or pops out). Rest stays available but not on screen.
- **Priority for solicitor workflow:** What they need most often should be one click away: Summary, Charges, Strategy (including proposed strategy and current position), Disclosure status and chase, Next steps / actions, Client instructions. Secondary: Key facts detail, legal tests, hearing checklists, bail template, PACE checker – can live in their own tabs so the main view isn’t crowded.
- **Trim or collapse:** Long blocks that are “reference” (e.g. full legal tests list, full hearing checklist, full bail template) can be inside the tab as expandable or “Show more” so the tab isn’t another endless scroll. Duplicate or redundant lines (e.g. “Case Readiness” repeated, or same status in two places) can be reduced to one source of truth.
- **Add if missing:** Nothing obvious missing from the paste; the main gain is **reorganising** into tabs so workflow is “I need X → I click X → I get X”.

**Workflow change:**  
Solicitor opens case → chooses what they need (Summary / Strategy / Disclosure / Next steps) → works in that view → switches tab when the task changes. Case is still built from the same data; layout supports task-by-task use instead of one full-page scroll.

**Police station: its own tab and build**

- **Idea:** Ingest police station material (custody record, disclosure at the station, MG4/MG5, first disclosure, etc.). System helps with **station decisions**: e.g. “Should I advise speak on this or no comment?” based on what’s there (evidence strength, gaps, offence type, client instructions). The **case file** then starts from the station: what was said (or no comment), what was disclosed, what we’re building on. By the time the matter is in the main app, the “case” is already partly built from the station.
- **Place in UI:** Police station is its **own tab** on the case page (e.g. "Police station" or "Station"), planned and built as a dedicated slice – not a one-off feature, but a first-class area like Strategy or Disclosure.

---

## Full plan layout order (implementation order)

Use this order when coding. AI strategy (Phases 1–5) is already done; below is the sequence for layout, tabs, police station, and training.

### Block A: Case page – tabbed shell (structure first)

1. Add tab (or sidebar) shell to the criminal case page. Tabs = **Key facts** | **Summary** | **Charges** | **Strategy** | **Disclosure** | **Next steps** | **Client & instructions** | **Safety & procedural** | **Additional tools** | **Police station**. One tab is "active"; clicking a tab shows that tab's content and hides the rest. No content move yet – e.g. all current content can sit under one default tab until Block B.
2. Choose default tab: e.g. **Summary** or **Strategy** as the tab that opens when you land on the case.
3. Optional: tab id in URL (e.g. `?tab=strategy`) or in state so deep-link or refresh keeps the same tab.

**Outcome:** Case page has a tab bar; content still under one tab until Block B.

### Block B: Map existing content into tabs

4. Assign every current section to a tab: **Key facts** (Key Facts block, client, opponent, key dates, primary issues, next step, role lenses). **Summary** (Summary + Domain summaries + Bundle summary). **Charges** (Charges & offences, Case phase). **Strategy** (Proposed strategy, Compare other strategies, Tactical Plan, Current Position, Guidance, Defence Strategy Plan, legal tests, attack order, Supervisor Snapshot). **Disclosure** (Declared Dependencies, Chase Timeline, Missing Evidence, Tracker, Chasers). **Next steps** (next steps/actions). **Client & instructions** (Client instructions, Solicitor notes). **Safety & procedural** (Case Readiness, Procedural Safety, Worst-Case Exposure, Irreversible Decisions). **Additional tools** (PACE, Court Hearings, Client Advice, Bail). **Police station** (placeholder for Block C).
5. Remove duplicate/redundant blocks; single source of truth per piece of info.

**Outcome:** Content lives in the right tab; Police station tab exists as placeholder.

### Block C: Police station tab (own build)

6. **Phase 1:** Tab shows "Station materials and advice. Upload custody record, MG4/MG5, first disclosure." Optional: upload for "station pack" (files stored against case). List uploaded station docs.
7. **Phase 2:** Ingest or manual summary of station docs. Show **Station summary** block (e.g. "Interview: no comment", "Disclosure at station: …", "Custody: …").
8. **Phase 3:** **Speak vs no comment** block: input = station summary + offence type (+ client instructions). Backend: guardrailed prompt (no legal advice; factors; solicitor decides). Output: short suggestion. UI: "Not legal advice; you decide."
9. **Phase 4:** Surface station context in **Key facts** or **Summary** (e.g. "At the station: Interview no comment; Station disclosure: …") so case file clearly starts at the station. Optional: link to Police station tab.

**Outcome:** Police station is a first-class tab: upload → station summary → speak/no comment → case built from station.

**Police station – extra angles (add to Block C or follow-on):**

- **Summary when all info is in:** When the solicitor has put in the police paperwork (custody, MG4, MG5, disclosure, etc.), the Police station tab should show a **summary** – e.g. "Police have full paperwork: [short summary of what's there]". So the tab isn't just uploads; it becomes a clear "here's what we have from the station" once everything is in.
- **Request paperwork to run through the app:** Solicitor (or client) can **request** that police station materials be sent – e.g. "Request these to be emailed to you" (custody record, MG4, MG5, first disclosure list, etc.). When they receive them (email), they upload into the app and run them through for: station summary, speak/no comment support, and (when charged) the full case. So the workflow is: ask for docs (email request) → receive → upload → run through app → get results. Think of every angle: custody, MG4, MG5, disclosure list, interview record, etc. – all requestable, then uploadable, then summarised and used in the app.

### Bail flow, outcome routing, and taking you to the Strategy page

- **Bail date and alerts:** If the matter is bailed (e.g. 3 months with a return date), the app should store the **bail date** and **alert/update** the user as that date approaches (e.g. reminder 1 week before, on the day). So bail isn't just a note – it's a dated event with reminders.
- **Outcome at bail date:** When the bail date is reached (or updated), the **outcome** is one of: **extended bail** (new date), **released under investigation (RUI)**, **NFA**, or **charged**. The app should record which outcome and update the matter state.
- **Route to Strategy page when charged:** If the outcome is **charged**, the app should **direct the user to the full case page** – i.e. the main case view with **Strategy** tab (proposed strategy, Compare other strategies, Tactical Plan, etc.). So: station/bail flow → charged → "Go to case" / open the case → land on or default to **Strategy** tab so they can get the proposal and run the case. If it's extended bail or RUI, stay in the station/bail flow with updated dates; if NFA, matter can be closed or marked NFA.
- **Summary on Police station tab:** When all info is in (police full paperwork uploaded and run through the app), the Police station tab should show a **case summary** or **station summary** so the solicitor sees one place: what we have from the station, what was said (or no comment), what was disclosed, and – when charged – clear direction to the Strategy page for the next steps.

**Every angle:** Request paperwork (e.g. list of what to ask for by email) → receive and upload → run through app (summary, speak/no comment) → bail date + alerts → outcome (extended/RUI/NFA/charged) → if charged, take user to Strategy page; case has summary (including on Police station tab when all info is in).

### Block D: Trim and polish within tabs

10. Within each tab, make long reference blocks (legal tests, hearing checklist, bail template) **expandable** ("Show more" / accordion).
11. Tab order: primary = Summary, Charges, Strategy, Disclosure, Next steps, Client & instructions. Secondary = Key facts, Safety & procedural, Additional tools, Police station.

**Outcome:** Each tab scannable; reference there but not overwhelming.

### Block E: Training (method encoding)

12. Encode per-charge method in `lib/criminal/strategy-suggest/prompt.ts` (charge-specific blocks per offence type).
13. Review and tighten `lib/criminal/strategy-suggest/constants.ts` (angles per offence, labels).
14. Validate on a few cases per charge; refine.

**Outcome:** Proposal and Ask about this case are charge-specific.

### Summary: order to code

| Order | Block | What |
|-------|--------|------|
| 1 | A | Tabbed shell on case page (tabs + default tab) |
| 2 | B | Map all existing content into tabs; remove duplicates |
| 3 | C.6 | Police station tab: placeholder + optional station doc upload |
| 4 | C.7 | Police station: station summary (ingest or manual) |
| 5 | C.8 | Police station: speak vs no comment (guardrailed suggestion) |
| 6 | C.9 | Police station: case built from station (surface in Summary/Key facts) |
| 7 | C+ | Police station: summary when all info in; request paperwork (email list) → upload → run through app |
| 8 | Bail | Bail date + alerts; outcome (extended/RUI/NFA/charged); when charged → direct to Strategy page |
| 9 | D | Trim and collapse within tabs; tab order/prominence |
| 10 | E | Method encoding in prompt + constants; validate |

**Already done (no redo):** Phases 1–5 (proposal hero, demoted routes, Ask about this case, nudge, guardrails).

---

## Police station to courts: full process (and how the app replicates it)

This section sets out the real-world journey in detail, then what the app should do at each stage and what was missing from the plan.

### 1. Police station (pre-charge)

**Real process:**  
Client arrested or voluntarily attends. **Custody:** booking in, custody record, detention clock (PACE time limits: 6h, 9h, 15h, 24h, 36h, 72h, 96h depending on offence). Custody reviews at those times. Right to legal advice. **Key decision: speak or no comment** (or prepared statement). Limited disclosure at station (what custody/IO tell solicitor; sometimes MG4, MG5, first disclosure list). **Interview** (recorded). Post-interview: **release** (bail with/without conditions + return date, or RUI, or NFA) or **charged** (then bailed to court or remanded). Paperwork: custody record, MG4, MG5, charge sheet (if charged), disclosure list, interview record. Solicitor requests copies (email/post) to run through at office.

**App replication (plan):**  
Police station tab: upload station pack, station summary, speak/no comment support, request paperwork (list to email), case built from station when charged. ✅  
**Added / ensure:**  
- **Custody clock:** In Police station tab, record **time in custody** and **next PACE review time** (e.g. next 6h/9h/24h review). So solicitor sees "next review at [time]" and knows detention limits.  
- **Interview stance recorded:** Store "Interview: no comment" / "prepared statement" / "answered questions" and show in station summary and Key facts.

### 2. Post-station, pre-court (bailed or RUI, not yet charged)

**Real process:**  
**Bail:** conditions (residence, curfew, no contact, report to station, etc.) – client must comply; breach is an offence. **Return date** (e.g. 3 months). Solicitor must diarise and prepare for return. **Extended bail:** same client, new return date. **RUI:** released under investigation; no return date; may be charged later (summons or postal charge) – could be weeks/months. **NFA:** no further action; matter closed unless reopened. **Charged at station:** then bailed to court or remanded – go to 3.

**App replication (plan):**  
Bail date + alerts; outcome at return (extended/RUI/NFA/charged); when charged → direct to Strategy page. ✅  
**Added / ensure:**  
- **Bail conditions (full list):** Store and display all conditions (not just date). Optional "Conditions checklist" or client-friendly export so client knows what they must/must not do.  
- **RUI as ongoing state:** If outcome = RUI, matter stays "RUI" until **charge received** (summons/postal). When charge received, same as "charged" – direct to case/Strategy. So "Charge received (from RUI)" is an event that triggers route to Strategy page and populates Charges.  
- **Remand (custody):** If client remanded, record **remand status**, **next custody hearing date**, and alerts. Different workflow (visits, legal aid) – at least show next hearing and that client is in custody.  
- **NFA / matter closed:** When outcome = NFA (or case disposed), **close matter** or **archive**; optional "Matter closed" summary (outcome, date). So matter doesn’t stay "live" forever.

### 3. First hearing / magistrates

**Real process:**  
First appearance: name, address, charge(s) put; **plea** (guilty / not guilty / no plea yet). Often adjourned for disclosure or legal aid. **Bail** (if not already): court can grant/refuse/vary conditions. **Remand** if refused bail. **Sent to Crown Court** if indictable only or either-way sent. Key dates: first hearing, then PTPH (Crown), trial, sentence. All need diarising and prep.

**App replication (plan):**  
Court Hearings (add hearing, list) in Additional tools; Bail template; Strategy and Charges tabs. ✅  
**Added / ensure:**  
- **Hearings as first-class:** Not just "add hearing" but **hearing type** (first appearance, PTPH, PCMH, trial, sentence, mention), **date**, **outcome** (adjourned, plea entered, trial date set, sent to Crown Court, etc.), and **what’s needed for next hearing**. Hearings drive "next steps". Consider a dedicated **Hearings** tab or promote hearings so they’re primary (dates, types, outcomes, prep).  
- **Plea record:** Record **plea entered** (per charge if multiple): guilty / not guilty / no plea; date; court. Link to Irreversible decisions and Strategy (outcome management vs fight).  
- **Trial date and alerts:** When trial date is set, treat it like bail date – **alerts** (e.g. 4 weeks, 2 weeks, 1 week, day before) so prep isn’t missed.

### 4. Between first hearing and trial

**Real process:**  
**Disclosure:** CPIA; initial and continuing prosecution disclosure; defence statement; unused material (MG6C, schedules). Chase missing items; disclosure requests; abuse of process if failures. **Strategy:** fight / charge reduction / outcome management; position; defence plan. **Client instructions:** ongoing; authority; key decisions (plea, basis, witnesses). **Hearings:** PTPH, PCMH – dates and outcomes. **Evidence:** bundle, docs, summaries. **Letters:** to CPS, court, client. **Irreversible decisions:** plea, basis of plea, abandon issue. **Sentencing prep** (if guilty plea or anticipated conviction): mitigation, PSR, guidelines.

**App replication (plan):**  
Disclosure tab (dependencies, chase, tracker, chasers); Strategy tab (proposal, Compare other strategies, Tactical Plan, position, defence plan); Client & instructions; Next steps; Court Hearings; Letters; Irreversible decisions. ✅  
**Added / ensure:**  
- **First disclosure request:** Template or one-click "Request initial disclosure" (letter/email) so it’s easy to start the chase.  
- **Sentencing (when Phase 3):** When case phase = sentencing (or guilty plea), clear **Sentencing** view or sub-tab: mitigation, PSR, guidelines, sentence type. Already have outcome management in Strategy; ensure sentencing checklist/guidance is easy to find.  
- **Matter state / lifecycle:** Explicit **matter state** (e.g. At station | Bailed | RUI | Charged | Before first hearing | Before PTPH | Before trial | Trial | Sentencing | Disposed). App uses state to **default the right tab** (e.g. at station → Police station; charged pre-trial → Strategy) and to show only relevant actions.

### 5. Trial and sentencing

**Real process:**  
Trial: evidence, witnesses, defence case, verdict. If **guilty** → sentencing (mitigation, PSR, sentence). If **not guilty** → matter closed. **Sentencing:** custodial, community, fine, discharge; bail pending sentence or remand.

**App replication (plan):**  
Strategy covers trial and outcome management; Bail/Additional tools has sentencing. ✅  
**Added / ensure:**  
- **Trial checklist:** In Hearings or Strategy, trial prep checklist (witness list, exhibits, key points) so nothing is missed.  
- **Post-disposal:** When case is **disposed** (sentence, acquittal, NFA), **close/archive** matter; optional summary (outcome, date). Appeal (if any) could be a future "Appeal" state or tab.

### 6. Cross-cutting

**Legal aid:** Application, means, merits, certificate. Not in current plan – note as **future or optional** (Legal aid tab or checklist).  
**Client-facing:** Bail conditions list/export for client; optional "What happens next" in plain language. **Request paperwork:** Already in plan (request by email → upload → run through app).

---

### Summary: what was missing (now in plan)

| Gap | Added to plan |
|-----|----------------|
| Custody clock / next PACE review | Police station tab: time in custody + next review time |
| Interview stance stored | Station summary + Key facts: "Interview: no comment" etc. |
| Bail conditions (full list + client view) | Store and show all conditions; optional client checklist/export |
| RUI → charge later | RUI as state; "Charge received (from RUI)" → route to Strategy + Charges |
| Remand (custody) | Remand status, next custody hearing, alerts |
| NFA / matter closed | Close or archive matter; "Matter closed" summary |
| Hearings: type, outcome, next steps | Hearings first-class: type, date, outcome, what’s needed next |
| Plea record | Record plea (per charge), date, court; link to Strategy |
| Trial date alerts | Alerts for trial date (e.g. 4w, 2w, 1w, day before) |
| First disclosure request template | Template or one-click "Request initial disclosure" |
| Sentencing view (Phase 3) | Sentencing checklist/guidance when phase = sentencing |
| Matter state / lifecycle | State drives default tab and available actions |
| Trial prep checklist | Trial checklist (witnesses, exhibits, key points) |
| Post-disposal / archive | Close/archive when disposed; optional outcome summary |
| Legal aid | Note as future/optional (tab or checklist) |

---

## Implementation order (single list)

Use this order when building. Each step builds on the previous. Already done: Phases 1–5 (proposal hero, Ask about this case, nudge, guardrails).

| # | What | Notes |
|---|------|------|
| **1** | **Tabbed shell (Block A)** | Add tab bar to criminal case page. Tabs: Key facts \| Summary \| Charges \| Strategy \| Disclosure \| Next steps \| Client & instructions \| Safety & procedural \| Additional tools \| Police station. One active tab; optional ?tab= in URL. Default tab e.g. Summary or Strategy. |
| **2** | **Matter state / lifecycle** | Define and store matter state: At station \| Bailed \| RUI \| Charged \| Before first hearing \| Before PTPH \| Before trial \| Trial \| Sentencing \| Disposed. Use state to default which tab opens and (later) which actions show. Foundation for "when charged → Strategy" and bail outcomes. |
| **3** | **Map content into tabs (Block B)** | Move every current section into the correct tab. Remove duplicates. Police station tab = placeholder for now. |
| **4** | **Police station: placeholder + upload (C.6)** | Station tab: "Station materials and advice. Upload custody, MG4, MG5, first disclosure." Upload "station pack"; list uploaded docs. |
| **5** | **Police station: custody clock + interview stance** | In station tab: record time in custody + next PACE review time. Record interview stance (no comment / prepared statement / answered). Show in station summary and Key facts. |
| **6** | **Police station: station summary (C.7)** | Ingest or manual summary of station docs. Show Station summary block (interview stance, disclosure at station, custody). Summary when all info in. |
| **7** | **Police station: speak vs no comment (C.8)** | Guardrailed speak/no comment block; backend + UI; "Not legal advice; you decide." |
| **8** | **Police station: case built from station + request paperwork (C.9, C+)** | Surface station context in Summary/Key facts. "Request paperwork" list (what to ask for by email); upload → run through app. When charged → direct to Strategy page. |
| **9** | **Bail: date + alerts + outcome** | Store bail return date. Alerts (e.g. 1 week before, on the day). Outcome at return: extended bail / RUI / NFA / charged. When charged → open case and land on Strategy tab. |
| **10** | **Bail: conditions + RUI + remand + NFA/closed** | Store and show full bail conditions; optional client checklist/export. RUI as state; "Charge received (from RUI)" → route to Strategy + Charges. Remand: status, next custody hearing, alerts. NFA or disposed → close/archive matter; optional "Matter closed" summary. |
| **11** | **Hearings: first-class** | Hearings: type (first appearance, PTPH, PCMH, trial, sentence, mention), date, outcome (adjourned, plea entered, trial set, sent to Crown Court, etc.), "what's needed for next hearing". Promote to primary or dedicated Hearings tab. Plea record (per charge, date, court). Trial date = key date with alerts (4w, 2w, 1w, day before). |
| **12** | **Disclosure: first disclosure request** | Template or one-click "Request initial disclosure" (letter/email) so chase can start easily. |
| **13** | **Sentencing view + trial checklist** | When phase = sentencing (or guilty plea): clear Sentencing view or sub-tab (mitigation, PSR, guidelines). Trial prep checklist (witnesses, exhibits, key points) in Hearings or Strategy. |
| **14** | **Post-disposal / archive** | When disposed (sentence, acquittal, NFA): close or archive matter; optional outcome summary (date, result). |
| **15** | **Trim and polish (Block D)** | Within each tab: expandable "Show more" for long reference. Tab order: primary (Summary, Charges, Strategy, Disclosure, Next steps, Client) then secondary (Key facts, Safety, Additional tools, Police station). |
| **16** | **Method encoding (Block E)** | Per-charge method in strategy-suggest prompt; review constants (angles per offence); validate on a few cases per charge. |

**Summary:**  
1–3 = structure (tabs + matter state + content in tabs).  
4–8 = Police station (upload → custody/interview → summary → speak/no comment → case from station + request paperwork).  
9–10 = Bail (date, alerts, outcome, conditions, RUI, remand, NFA/closed).  
11 = Hearings (type, date, outcome, plea, trial alerts).  
12–14 = Disclosure template, sentencing, trial checklist, post-disposal.  
15–16 = Polish + method encoding.

**Progress:** Steps 1–16 done.

**Steps 11–16 (what’s in place):**  
- **11 Hearings:** Dedicated Hearings tab: CourtHearingsPanel (type, date, outcome, what’s needed next; trial date callout when a Trial hearing exists), PleaRecordCard (plea + date via matter API), Trial date alerts (4w / 2w / 1w / day before), Trial prep checklist (expandable).  
- **12 Disclosure:** FirstDisclosureRequestCard in Disclosure tab (one-click draft via POST letters/draft with kind `initial_disclosure_request`, copy to clipboard).  
- **13 Sentencing:** Sentencing tab with phase 3 mitigation panel and Sentencing checklist (expandable). Trial prep checklist in Hearings tab.  
- **14 Post-disposal:** Matter closed banner when `matter_closed_at` is set (from matter API); close/record in Police station tab (date + reason).  
- **15 Trim and polish:** Tab order = primary then secondary; long reference blocks use FoldSection (expandable).  
- **16 Method encoding:** `lib/criminal/strategy-suggest/prompt.ts` uses `METHOD_HINTS_BY_OFFENCE` from constants; per-offence hints and `getStrategyAnglesForOffence` in `constants.ts`.

---

## Your checklist (when implementation is finished)

Do this on your side so the new features work in your environment.

### 1. Run the database migration

One new migration adds columns to `criminal_cases`:

- **File:** `supabase/migrations/20260209100000_criminal_matter_state_and_station.sql`
- **Adds:** `matter_state`, `time_in_custody_at`, `next_pace_review_at`, `interview_stance`, `station_summary`, `bail_return_date`, `bail_outcome`, `matter_closed_at`, `matter_closed_reason`

**If you use Supabase locally:**

```bash
npx supabase db push
```

**If you use Supabase hosted / dashboard:**  
Run the SQL from that migration file in the SQL Editor (or apply the migration via your usual process).

**If you don’t use Supabase:**  
Run the same SQL against your Postgres (the table is `criminal_cases`; it must already exist from the criminal law system migration).

### 2. No new env vars

Nothing new is required in `.env`. Existing auth and Supabase config are enough.

### 3. Deploy / run the app

- Build and deploy as you normally do (e.g. `npm run build`, then deploy).
- Or run locally: `npm run dev`, then open a criminal case and use the new tabs and Police station / bail / matter state features.

### 4. Optional: seed or backfill

- **Matter state:** Existing criminal cases will have `matter_state = null`; the app will default to the Summary tab until you set a stage (e.g. in the Police station tab).
- No backfill is required. You can set matter stage per case as you use them.

### 5. Steps 11–16

No extra migrations for steps 11–16. The same migration (20260209100000) is enough; plea/plea_date already exist on `criminal_cases` from the original criminal schema. Just run that one migration and you’re set.
