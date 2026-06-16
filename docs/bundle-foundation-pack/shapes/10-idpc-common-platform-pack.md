# Shape sheet: IDPC / Common Platform pack

**Purpose:** How a solicitor's morning often starts — not a perfect MG bundle, but the prosecution's initial digital pack.

**Status:** Docs-only shape. Ingest later; do not block S1–S6 pilot.

## Typical contents

1. Common Platform case-at-a-glance (URN, defendant, offence list, next hearing)
2. IDPC cover / service certificate
3. Charge sheet or written charge
4. MG5-style prosecution summary (may be shorter than full MG5)
5. Key MG11 extract or interview summary
6. MG6(a) initial schedule (often partial)
7. Listing / hearing notice (current date wins over older MG5 date)
8. PNC / previous convictions extract (if served — handle redaction)
9. "Further material to follow" / not full disclosure warning

## Extractability targets

| Field | Primary source |
|-------|----------------|
| Client name | Charge + at-a-glance |
| Offence wording | Charge / offence list |
| Court | Listing notice |
| Hearing date/time | **Latest** listing (not old MG5) |
| Stage | IDPC cover / hearing type |
| Served vs missing | MG6 schedule rows only |

## Must-not-say

- Treat IDPC as complete disclosure
- Assume MG5 hearing date if listing differs
- Infer guilt from PNC alone

## Pilot note

CaseBrain foundation S1–S6 use clean MG-shaped PDFs. This sheet is the **next** believable shape after magistrates pilot proof.

## Sources (verify wording)

- [GOV.UK — Common Platform IDPC](https://www.gov.uk/government/publications/how-to-use-hmcts-common-platform/find-a-case-self-serve-the-idpc-and-fully-access-a-case-in-common-platform)
- CrimPR Part 8 — initial details of prosecution case
