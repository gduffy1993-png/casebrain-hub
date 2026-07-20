# Subprocessors and AI processing

**Status:** Plain-English **placeholder** for pilot discussion  
**Rule:** Final subprocessor list, regions, and contract terms must be **confirmed in writing before any firm-uploaded matter** (including redacted shadows).

**Gold-only path:** A firm may review CaseBrain’s own fictional gold packets (e.g. Waves A+B) before the final subprocessor schedule is signed — those packets are not firm client uploads. Firm uploads wait for confirmation.

This document does **not** claim SOC 2, ISO 27001, or pen-test certification.

---

## What “AI processing” means here

CaseBrain surfaces are a mix of:

- **Deterministic / rule-based** builders (evidence-state, many court/chase presentation gates)  
- **Optional AI API calls** for some extraction or drafting steps, depending on the environment and feature flags  

At kick-off, CaseBrain states **which of the above apply** to the pilot workspace. Do not assume every screen is “an LLM”.

Where AI is used, it may:

- Read uploaded PDF / text bundles  
- Extract or structure disclosure and evidence-state signals  
- Draft court / chase / client / proof review surfaces  

A human solicitor must review before any external use. Output is **provisional**.

---

## Placeholder subprocessor categories

Confirm names, roles, and locations at kick-off. Typical categories for a product like CaseBrain:

| Category | Example role (placeholder) | Confirm before firm uploads |
|----------|----------------------------|-----------------------------|
| Application hosting / database | App, auth, Postgres, file storage | ☐ Name + region |
| Object storage | PDF / document blobs | ☐ Name + region |
| AI model API | Text analysis / drafting (API terms) | ☐ Vendor + **written no-training terms** |
| Email / transactional | Login and notification mail | ☐ Vendor |
| Error / uptime monitoring | Operational diagnostics | ☐ Vendor + data scope |
| Analytics (if any) | Product usage — **prefer off for pilot** | ☐ None or named |

**Do not treat this table as the live list.** Replace placeholders with the agreed schedule before firm uploads.

---

## No public model training (pilot policy + gate)

**Policy:**

- Firm matter content (including redacted shadows) is **not** used to train public foundation models.  
- AI API vendors used for the pilot must have **written terms excluding training on customer/API content** (or the firm must accept a documented exception — default is **no exception**).  
- Controlled fictional eval sets are CaseBrain’s own test data, separate from firm uploads.  
- Product improvement from pilot feedback means **anonymised form themes**, not feeding bundle text into model training.

**Gate:** if no-training terms cannot be confirmed for the AI vendors in use, **do not upload firm matters**.

---

## Data minimisation

- Upload only what the review needs.  
- Prefer redacted shadows over full unredacted files.  
- Avoid pasting extra client narrative into support tickets.  
- Turn off optional analytics on pilot workspaces where practical.

---

## Redaction option

Firms should redact before upload whenever possible.  
See `REDACTED-SHADOW-PILOT-PROCESS.md` and `SECURITY-AND-DATA-HANDLING.md`.

---

## International transfers

If any subprocessor processes data outside the UK / agreed region, document:

- Where data goes  
- What transfer mechanism applies  
- Whether the firm accepts that for the pilot  

Confirm before firm uploads.

---

## Change control

If a subprocessor is added or terms change mid-pilot:

1. Notify the firm lead.  
2. Pause new firm uploads if needed.  
3. Update this schedule in writing.  

---

## Acknowledgement (kick-off)

Firm lead confirms they have received the **final** subprocessor schedule (not only this placeholder) before firm uploads:  

Name: _____________ Date: _____________
