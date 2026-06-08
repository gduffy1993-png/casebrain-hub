# Option 3: AI Strategy Suggestion – Build Plan & Risk Stamp-Out

**Goal:** AI suggests strategy (and offence type) for any charge; solicitor always approves/edits. No hand-coding every outcome. Works for every charge.

---

## 1. What we're building (scope)

- **Input:** Case summary, charge sheet text, and/or key doc text (MG6, custody, etc.).
- **AI does:** (1) Classify offence type from a controlled list. (2) Suggest strategy angles / possible defences / outcomes relevant to that offence and case.
- **Output:** Structured only (e.g. offence_type, strategy_angles[], suggested_narrative_draft). Never free-form “advice”.
- **App:** Shows everything as **“Suggested – solicitor must verify”**. Nothing auto-committed. Solicitor approves, edits, or rejects before it becomes the case position or strategy.
- **Fallback:** If AI low-confidence or input missing/unclear → show “Reserved pending disclosure” / generic options only. No guess.

---

## 2. What the system needs to know

| Need | Why |
|------|-----|
| **Charge wording / offence description** | So AI can classify offence type and suggest relevant defences. |
| **Case summary (if no charge row)** | So we can still classify when charge isn’t in a structured field. |
| **Fixed list of offence types** | So AI only picks from our list (no invented offences). |
| **Fixed list of “strategy angle” types** | So suggestions are from a controlled set (e.g. ID, intent, disclosure, self-defence, lesser charge). |
| **What we will NOT send to AI** | Client name, sensitive PII, or anything that must stay in-house unless we use a confidential/on-prem model. |
| **When to NOT call AI** | No/minimal text, scanned images with no extractable text, or user has disabled AI. |
| **Confidence / uncertainty** | So we can fall back to “Reserved pending disclosure” when AI is unsure. |

---

## 3. Success paths (what “working” looks like)

- User opens case → AI (or rules) gets offence type + suggested strategy angles.
- Strategy screen shows **suggested** content only; user sees “Suggested – verify before use.”
- User approves (maybe with edits) → that becomes the recorded position/strategy. User rejects → we keep “Reserved” or last approved.
- No s18 content on robbery; no robbery content on assault. Suggestions match the charge.
- No fake cases, no fake citations, no made-up law in any output we show.
- If AI fails or times out → we fall back to generic/Reserved and log; no blank or broken screen.

---

## 4. Bad outcomes from real world (and how we stamp them out)

Findings from sanctions, discipline, and research (2023–2025):

### 4.1 Fabricated cases / citations (hallucination)

- **What happened:** Lawyers sanctioned (e.g. $10k fine, referral to discipline) after filing briefs with AI-invented case names and quotes. Courts and bars say: lawyer must personally verify any cited authority.
- **Stamp-out:**
  - **We never let AI output case names, citations, or quotes as if they were real.** Our structured output = offence type + strategy angles + draft narrative. No “case law” field.
  - If we ever add “supporting authority” later, it must come from a **retrieval/search** step (real database), not from the LLM’s raw text. No model-generated citations.
  - UI and terms: “AI suggestion only. You must verify any legal authority yourself.”

### 4.2 Wrong or misleading legal advice

- **What happened:** AI gives advice that sounds right but is wrong or jurisdictionally off. User relies on it; client harmed; regulator takes interest.
- **Stamp-out:**
  - Prompts: Explicit “You are not giving legal advice. Suggest only high-level strategy angles a solicitor would consider. Solicitor must verify.”
  - We never present output as “advice” or “recommendation” – only “suggested angles / draft for your review”.
  - All screens: “Solicitor-controlled. Not legal advice.”

### 4.3 Pro-prosecution / bias

- **What happened:** Studies show some LLMs skew toward recommending prosecution or harsher outcomes; facial recognition and risk tools have shown bias against marginalised groups.
- **Stamp-out:**
  - Our use case = **defence** only. Prompts and product framing are defence-sided (angles that help the client, not the prosecution).
  - We do not use AI for identification, risk scores, or sentencing. Only for offence classification and strategy-angle suggestions.
  - If we later use any risk/outcome model, we test for bias and document limits.

### 4.4 No human check (over-reliance)

- **What happened:** Lawyers file AI output without reading it; courts and bars say the lawyer is responsible for the work product.
- **Stamp-out:**
  - **Nothing from AI is ever auto-saved as the firm’s position.** Always “Suggest → Show → Solicitor approves or edits”.
  - UI: Clear “Suggested by AI – you must review and approve before use.” Require an explicit “Approve” or “Use this” step before strategy/position is saved.
  - Optional: Short checklist at approval (“I have read this and verified it is appropriate for this case.”).

### 4.5 Confidentiality / data leakage

- **What happened:** Putting client data into consumer AI can breach confidentiality and professional rules.
- **Stamp-out:**
  - Policy: Do not send client names, file numbers, or identifying details to any AI unless we use a contractually confidential / on-prem / private deployment.
  - Prefer sending only: charge wording, anonymised summary, or redacted doc snippets. Document what we send and where it goes.
  - If we use OpenAI/Anthropic etc., use their enterprise/API terms that guarantee no training on our data and comply with our confidentiality policy.

### 4.6 Tool unreliability (RAG still hallucinates)

- **What happened:** Studies (e.g. Stanford) show legal RAG tools still hallucinate 17%+ of the time; vendors’ “no hallucination” claims are overstated.
- **Stamp-out:**
  - We assume AI can be wrong. Design around it: structured output, no citations from the model, human in the loop, and fallback when confidence is low.
  - Optional later: Chain-of-Verification (draft → verify claims → finalise) or evidence-audit step for any factual claims in the narrative.
  - Log and monitor: track when we fall back, when user rejects suggestion, and when we get low-confidence so we can tune prompts and thresholds.

### 4.7 Ethics / discipline / disclosure to tribunal

- **What happened:** Bars and courts require competence, candour, and sometimes disclosure of AI use.
- **Stamp-out:**
  - We keep a clear product stance: “AI-assisted; solicitor remains responsible; verify before use.”
  - Consider: short in-app note or help text on “AI use and your professional duties” (verify, competence, confidentiality, disclosure if required by tribunal).
  - Record-keeping: optional log of “AI suggested at [time]; user approved/edited at [time]” for audit and compliance.

---

## 5. What could stop it working (and how we handle it)

| Risk | Mitigation |
|------|------------|
| **No charge / no summary text** | Don’t call AI. Show “Reserved pending disclosure” and prompt user to add charge or summary. |
| **Charge in image/PDF with no text** | Use existing extraction first; only call AI on extracted text. If nothing extracted, don’t guess. |
| **AI timeout / API down** | Timeout after N seconds; fallback to generic/Reserved; show “Suggestion unavailable – add charge or try again.” |
| **AI returns offence type not in our list** | Map to “Other” and use generic strategy angles only. Never invent a new offence type from raw text. |
| **AI returns empty or malformed** | Validate structured fields; if invalid, treat as no suggestion and fallback. |
| **User in a hurry and approves without reading** | We can’t force reading, but we can make “Approve” a separate step and keep wording clear that they are responsible. |
| **Model change (upgrade/downgrade) breaks behaviour** | Version the prompt and the expected schema; test before rollout; keep fallback. |
| **Jurisdiction / law wrong (e.g. Scottish vs E&W)** | Prompt should specify jurisdiction (e.g. England & Wales). Later: allow firm to set jurisdiction and lock it. |

---

## 6. Technical and process safeguards (checklist)

- [ ] **Structured output only** – e.g. JSON with `offence_type`, `strategy_angles[]`, `narrative_draft`. No free-form “advice” blob.
- [ ] **No model-generated citations** – never show case names or quotes from the model as authority.
- [ ] **Solicitor-in-the-loop** – every suggestion shown as draft; explicit Approve/Edit/Reject before saving.
- [ ] **Fallback on low confidence or failure** – Reserved pending disclosure / generic options; no blank or broken state.
- [ ] **Confidentiality** – document what we send to AI; no client identifiers unless using a confidential stack.
- [ ] **Prompts** – “Defence-only; suggest angles only; not legal advice; solicitor must verify.”
- [ ] **Logging** – when AI was called, fallback used, or suggestion rejected (for tuning and compliance).
- [ ] **Offence list** – fixed list of allowed offence types; AI picks one (or “Other”), never invents.
- [ ] **Strategy angle list** – fixed set of angle types we support; AI suggests from that set (or we map to it).

---

## 7. Model and API (Phase 2.1)

- **Model:** OpenAI `gpt-4o-mini` via existing `getOpenAIClient()`. Enterprise/API terms: no training on our data (OpenAI API policy); we send only charge wording, case summary, and optional doc snippets – no client name or file ref (see Phase 2.9).

---

## 7b. Jurisdiction (Phase 4.4)

- **Default:** England & Wales. Set in the system prompt in `lib/criminal/strategy-suggest/prompt.ts` (“criminal defence solicitor in England & Wales”).
- **Offence list and strategy angles** in `lib/criminal/strategy-suggest/constants.ts` are drafted for E&W. If the firm operates in another jurisdiction, update the prompt and review the fixed lists.

---

## 7c. Confidentiality and data flow (Phase 4.5)

- **What we send to the AI:** Charge wording only (from `criminal_charges` or request body), case summary (from document extracted summary or raw text slice), and optional doc snippets. No client name, file number, DOB, address, or custody identifiers.
- **Where it goes:** OpenAI API (see Model and API above). No training on our data per provider terms.
- **If this changes** (e.g. new provider, new fields in the prompt): update this section and the route comments.

---

## 8. Phased build (high level)

1. **Phase 1 – Scope and safety**
   - Define exact API input/output (what we send, what we get).
   - Define offence-type list and strategy-angle list.
   - Implement fallback and “no AI” path.

2. **Phase 2 – AI integration**
   - Integrate one model (e.g. OpenAI/Anthropic) with strict schema.
   - Prompt design and testing (no citations, defence-only, verify).
   - Wire into app as “suggestion only” with Approve/Edit/Reject.

3. **Phase 3 – Hardening**
   - Confidence threshold and fallback rules.
   - Logging and monitoring.
   - Optional: Chain-of-Verification or evidence check for narrative claims.

4. **Phase 4 – Policy and compliance**
   - In-app wording and help on professional duties.
   - Optional record of “AI suggested / user approved”.
   - Review confidentiality and jurisdiction handling.

---

## 9. References (what we used to stamp out bad outcomes)

- California fine re ChatGPT fabrications (21/23 quotes fake); courts requiring lawyers to verify AI output.
- Reuters: AI hallucinations in court papers; multiple disciplinary incidents 2023–2025.
- Stanford: legal RAG tools still hallucinate 17%+; supervision and verification recommended.
- Innocence Project / Justice Innovation Lab: AI errors in criminal justice; bias and over-reliance risks.
- Bar Council / Law Society / WSBA: use AI as assist; verify; confidentiality; supervise; document.
- MDPI / CoVe: structured output, verification loops, human review for high-stakes use.

---

*This plan is the single place we think through every outcome and stamp out known failure modes before we build. Update it as we find new risks or change scope.*
