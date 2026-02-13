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

**Goal:** Use real case data (e.g. many cases per charge type, most common strategies, ways they’re fought) so the proposal and angles feel charge-specific and grounded in practice, not generic.

**Why it’s doable now:** We have fixed offence types and fixed strategy angles. “Training” = feed real-world patterns into (1) the angle lists and labels and (2) per-charge prompt/config so the model picks and drafts from evidence, not thin air.

**Plan (add these to the finishing list):**

1. **Gather / define the data (you or a collaborator)**  
   - For each offence type we care about (assault_oapa, robbery, theft, arson, drugs, fraud, etc.):  
     - Collect or summarise a set of real cases (e.g. 50–100 per charge type if possible; fewer is still useful).  
     - For each charge type, note:  
       - **Most common strategies used** (e.g. “charge reduction”, “fight ID”, “disclosure leverage”).  
       - **Most common ways the case is fought** (e.g. “deny intent”, “challenge identification”, “reserved pending disclosure”).  
   - Output: a simple structure per charge, e.g. “Robbery: common strategies = X, Y, Z; ways fought = A, B, C. Arson: …” (spreadsheet, doc, or JSON is fine).

2. **Update constants (strategy angles per offence)**  
   - In `lib/criminal/strategy-suggest/constants.ts`:  
     - Review `getStrategyAnglesForOffence(offenceType)` and the angle lists.  
     - Add any missing angles that real cases show are important for a given charge.  
     - Adjust labels in `STRATEGY_ANGLE_LABELS` so they match how solicitors talk.  
   - Ensure every offence type we support has angles that reflect “most common strategies and ways they’re fought” from the data.

3. **Add per-charge guidance to the prompt**  
   - In `lib/criminal/strategy-suggest/prompt.ts` (and optionally strategy-ask):  
     - Add a short, charge-specific line or block per offence type, e.g.  
       - “For assault/OAPA: focus on intent vs recklessness, self-defence, identification where relevant.”  
       - “For robbery: focus on theft (dishonesty/appropriation) and/or force/threat; common angles: …”  
       - “For arson/criminal damage: focus on intent, recklessness, lawful excuse.”  
   - Derive this text from the “most common strategies / ways fought” summary so the model is nudged toward real-world patterns.

4. **Optional: small “examples” or RAG later**  
   - If you later have anonymised, short “case → strategy” snippets, we could add 1–2 sentence examples per charge into the prompt, or a small RAG lookup so the model sees “cases like this often use angles X, Y.”  
   - Treat this as Phase 2 of training once (1)–(3) are in place and we’ve seen how the proposal behaves.

5. **Validate and iterate**  
   - Run the app on a few cases per charge (robbery, arson, assault, etc.).  
   - Check: does the proposed offence type and angles match what real cases would suggest?  
   - Refine the lists and prompt text based on what still feels generic or wrong.

**Order of work:**  
Do (1) first (gather/summarise the data). Then (2) and (3) in code. Then (5) on a few cases. Add (4) only if we want to push quality further after that.
