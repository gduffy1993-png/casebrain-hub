# Option 3: AI Strategy Suggestion – Task List

Use this to execute the build. Tick off as you go. Dependencies: complete Phase 1 before Phase 2; Phase 2 before Phase 3/4.

---

## Phase 1 – Scope and safety (no AI yet)

**Goal:** Define contracts, lists, and fallback behaviour so we can integrate AI safely.

| # | Task | Deliverable | Done |
|---|------|-------------|------|
| 1.1 | **Define API input schema** – What we send to the AI (e.g. `{ chargeText?, summaryText?, docSnippets[]? }`). Document max lengths and required fields. | Input schema doc or TypeScript type in codebase | [x] |
| 1.2 | **Define API output schema** – Structured only, e.g. `{ offenceType: string, strategyAngles: string[], narrativeDraft?: string, confidence?: "high" \| "medium" \| "low" }`. No free-form advice, no citations. | Output schema doc or TypeScript type | [x] |
| 1.3 | **Define fixed offence-type list** – E.g. assault_oapa, robbery, theft, fraud, drugs, arson, criminal_damage, sexual, public_order, other. Used by AI (pick one) and by app (map to UI). | List in config or constants file | [x] |
| 1.4 | **Define fixed strategy-angle list** – E.g. reserved_pending_disclosure, deny_offence_wrong_person, deny_intent_lesser_charge, self_defence_lawful_excuse, disclosure_failures, pace_breaches, identification_challenge, plus offence-specific where needed. | List in config or constants | [x] |
| 1.5 | **Implement “no AI” / fallback path in app** – When there’s no charge/summary text, or user has disabled AI, or we’re not calling AI yet: show “Reserved pending disclosure” and generic options only. No blank screen. | Code: fallback UI + logic | [x] |
| 1.6 | **Add feature flag or setting** – “Use AI strategy suggestions” (on/off) so we can ship behind a flag and test safely. | Code: flag in env or user/org settings | [x] |

---

## Phase 2 – AI integration

**Goal:** One model integrated; suggestions shown as draft; solicitor must approve.

| # | Task | Deliverable | Done |
|---|------|-------------|------|
| 2.1 | **Choose model and API** – e.g. OpenAI or Anthropic; confirm enterprise/API terms (no training on our data, confidentiality). Document in plan. | Decision + doc update | [x] |
| 2.2 | **Create server-side AI route** – e.g. `POST /api/criminal/strategy-suggest` (or under caseId). Accepts input per 1.1; returns output per 1.2. No client-side API keys. | API route + server-only client | [x] |
| 2.3 | **Write system prompt** – Defence-only; suggest angles from fixed list; not legal advice; solicitor must verify; England & Wales (or configurable). No citations or case names. | Prompt text in code or config | [x] |
| 2.4 | **Enforce structured output** – Use model’s structured-output mode (e.g. JSON schema) so we never get free-form “advice”. Validate response against 1.2; if invalid, return fallback. | Code in AI route | [x] |
| 2.5 | **Add confidence handling** – If model returns low confidence (or we add a simple confidence heuristic), route returns fallback and does not show suggestion. | Code in AI route | [x] |
| 2.6 | **Wire “Get suggestion” in UI** – Button or auto-trigger (e.g. when case has charge/summary and AI is enabled). Call new API; show loading state. | UI: button + loading | [x] |
| 2.7 | **Show suggestion as draft only** – New panel or modal: “Suggested by AI – you must verify before use.” Display offence type + strategy angles + optional narrative draft. No save yet. | UI: suggestion panel/modal | [x] |
| 2.8 | **Approve / Edit / Reject** – Buttons: “Use this” (approve), “Edit” (open in editor then save), “Reject” (dismiss, keep current). Only “Use this” or “Edit then save” writes to case position/strategy. | UI + API to save approved content | [x] |
| 2.9 | **Confidentiality** – Ensure we only send charge/summary/snippets; no client name or file ref in prompt. Document in plan and in code comments. | Doc + code review | [x] |

---

## Phase 3 – Hardening

**Goal:** Robust fallbacks, logging, optional verification.

| # | Task | Deliverable | Done |
|---|------|-------------|------|
| 3.1 | **Timeout and error handling** – AI route times out after N seconds (e.g. 15); on timeout or API error, return fallback and show “Suggestion unavailable – try again or add more detail.” | Code in AI route + UI message | [x] |
| 3.2 | **Validate offence type** – If AI returns an offence type not in our list, map to `other` and use generic strategy angles only. | Code in AI route or normaliser | [x] |
| 3.3 | **Validate strategy angles** – Map AI output to our fixed list; discard any unknown; never display raw unchecked strings as “strategy”. | Code in AI route or normaliser | [x] |
| 3.4 | **Logging** – Log when suggestion requested, when fallback used (and why), when suggestion rejected. No PII in logs. Optional: log prompt hash and model for debugging. | Code + log storage | [x] |
| 3.5 | **Monitoring** – Simple dashboard or weekly check: fallback rate, reject rate, errors. So we can tune prompts and confidence. | Doc or minimal dashboard | [x] |
| 3.6 | **(Optional) Chain-of-Verification** – For narrative draft only: generate draft → generate verification questions → re-answer → produce final draft. Defer until after 2 is stable. | Optional implementation | [ ] |

---

## Phase 4 – Policy and compliance

**Goal:** Clear wording, audit trail, jurisdiction.

| # | Task | Deliverable | Done |
|---|------|-------------|------|
| 4.1 | **In-app disclaimer** – Where we show AI suggestion: “AI-assisted. Not legal advice. You must verify before use.” Same line near any approved content that came from AI. | Copy in UI | [x] |
| 4.2 | **Help or policy snippet** – Short “AI use and your professional duties” (verify, competence, confidentiality). Link from settings or first use. | Help page or modal | [x] |
| 4.3 | **Optional: record “AI suggested / user approved”** – When user approves, store that this version was AI-suggested and approved at [timestamp]. For audit only; not shown to client. | DB field or audit log | [x] |
| 4.4 | **Jurisdiction** – Prompt and/or settings: “England & Wales” (or firm choice). Ensure offence list and angles match. Document. | Config + doc | [x] |
| 4.5 | **Review confidentiality and data flow** – Final check: what we send, where it goes, terms of use. Update OPTION_3_AI_STRATEGY_PLAN.md if anything changes. | Doc update | [x] |

---

## Quick reference – order of work

1. **Phase 1:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6  
2. **Phase 2:** 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8 → 2.9  
3. **Phase 3:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5 (then 3.6 if needed)  
4. **Phase 4:** 4.1 → 4.2 → 4.3 (optional) → 4.4 → 4.5  

---

*Copy this into your project board or tick off in the doc as you go.*
