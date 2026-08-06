# Cross-Perspective Protocol (MAA V2)

**Registry family:** R (`XPP`)  
**Status:** protocol only — not a live multi-agent court  

## Purpose

Register distinct automated reviewer perspectives that may exchange **structured findings** without overwriting one another and without impersonating real lawyers, prosecutors or judges.

## Perspectives

| Control | Perspective | Must not claim |
|---------|-------------|----------------|
| `MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE` | Defence-solicitor | Real instructing solicitor |
| `MAA2-XPP-02-PROSECUTION-CHALLENGE` | Prosecution-challenge | Real prosecutor / CPS advocate |
| `MAA2-XPP-03-JUDICIAL-NEUTRALITY` | Judicial-neutrality | Real judge / tribunal |
| `MAA2-XPP-04-CLIENT-COMPREHENSION` | Client-comprehension | Client legal advice |
| `MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE` | Supervisor/risk | Supervisory sign-off |

## Exchange rules

1. Each perspective emits its own finding set with stable IDs and `perspectiveId`.
2. Perspectives may **cite** each other by finding ID; they may not rewrite another perspective’s `exactWording` or verdict.
3. An **agreement/disagreement record** is mandatory (`MAA2-XPP-06-AGREEMENT-DISAGREEMENT-RECORD`):
   - exact agreements;
   - exact disagreements;
   - source support for each side;
   - unresolved conflicts left unresolved.
4. **No synthetic consensus.** Absence of disagreement is not proof of correctness.
5. Human adjudication may later resolve conflicts; human fields stay blank until filled.

## Verdict discipline

- Unavailable perspective for a case/exit → `not_exercised`.
- Insufficient source to form a perspective view → `unresolved`.
- Overwrite / merge / fake unanimity → `defect` against the protocol control.

## Relation to V1

Extends `MAA-DEFENCE-LENS`, `MAA-PROSECUTION-LENS`, `MAA-JUDICIAL-LENS` without changing their historical IDs or Stage-20/50 findings.
