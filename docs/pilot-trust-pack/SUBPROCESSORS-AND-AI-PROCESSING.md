# Subprocessors and AI processing

**Status:** Plain-English **placeholder** for pilot discussion  
**Rule:** Final subprocessor list, regions, and contract terms must be **confirmed in writing before live client data** is uploaded.

This document does **not** claim SOC 2, ISO 27001, or pen-test certification.

---

## What “AI processing” means here

CaseBrain may use automated and AI-assisted steps to:

- Read uploaded PDF / text bundles  
- Extract or structure disclosure and evidence-state signals  
- Draft court / chase / client / proof review surfaces  

A human solicitor must review before any external use. AI output is **provisional**.

---

## Placeholder subprocessor categories

Confirm names, roles, and locations at kick-off. Typical categories for a product like CaseBrain:

| Category | Example role (placeholder) | Confirm before live data |
|----------|----------------------------|--------------------------|
| Application hosting / database | App, auth, Postgres, file storage | ☐ Name + region |
| Object storage | PDF / document blobs | ☐ Name + region |
| AI model API | Text analysis / drafting (API terms) | ☐ Vendor + no-training terms |
| Email / transactional | Login and notification mail | ☐ Vendor |
| Error / uptime monitoring | Operational diagnostics | ☐ Vendor + data scope |
| Analytics (if any) | Product usage — **prefer off for pilot** | ☐ None or named |

**Do not treat this table as the live list.** Replace placeholders with the agreed schedule before client uploads.

---

## No public model training (pilot position)

CaseBrain’s intended position for pilot and production customer content:

- Customer / firm matter content is **not** used to train public foundation models.  
- Where an AI API is used, prefer contractual / product terms that **exclude training on API customer content** for model improvement.  
- Controlled fictional eval sets are CaseBrain’s own test data, separate from firm uploads.

If terms cannot be confirmed, **do not upload live client data**.

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

Confirm before live client data.

---

## Change control

If a subprocessor is added or terms change mid-pilot:

1. Notify the firm lead.  
2. Pause new live uploads if needed.  
3. Update this schedule in writing.  

---

## Acknowledgement (kick-off)

Firm lead confirms they have received the **final** subprocessor schedule (not only this placeholder):  

Name: _____________ Date: _____________
