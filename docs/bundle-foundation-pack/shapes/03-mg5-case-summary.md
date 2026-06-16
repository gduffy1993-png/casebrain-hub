# 03-mg5-case-summary.md — MG5 case summary / offence report shape

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://www.judiciary.uk/wp-content/uploads/2015/09/bcm-mg5-how-to-complete.pdf
- https://www.cps.gov.uk/prosecution-guidance/directors-guidance-charging-sixth-edition-december-2020-incorporating-national

## Headings in order (verbatim where short and source-clear)
1. MG05 Offence Report
2. POLICE REPORT
3. Summary of the key evidence
4. Headline Summary
5. Chronological summary of events
6. What the key witnesses say
7. Key evidence
8. Key witness(es) and their role
9. Conditional Caution
10. Supervisor certification

## Field labels
- URN:
- Defendant 1:
- Defendant 2:
- Anticipated plea:
- Key evidence:
- Key witness(es) and their role:
- Stated value of property stolen or damaged:
- Summary:
- Officer:
- Supervisor:
- Date:

## Table columns
- Section
- Summary text
- Witness role
- Evidence item
- Value
- Orders on conviction

## Typical page order in full bundle
1. Cover/index
2. MG4/charge
3. MG5
4. MG11s
5. Exhibit list
6. MG6/MG6C
7. Listing notice

## CaseBrain extraction fields
- expected_safe_summary
- primary_defendant
- offence_family
- correct_offence_wording
- stage
- served_material
- missing_material
- hidden_tension

## Common glue/OCR risks
- MG5 date is old and later listing changes it.
- MG3 sensitive content pasted into MG5.
- Narrative says CCTV exists but MG6 does not list CCTV.
- Witness role wraps into next witness row.
- Heading rendered as Summaryofthekeyevidence.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not include police opinions as fact.
- Do not say CCTV/999/BWV/medical is served only because MG5 mentions it.
- Do not treat MG5 as proof of service.

## Replica notes: fixed vs swappable
- Fixed: MG5 title/summary headings and key witness role labels.
- Swappable: factual narrative and witness names.
- MG5 should tell a short, chronological, balanced case story.
- Use `verify against Judiciary MG5 guide` for exact local force field wording.
- Avoid AI-style prose; write like a concise police case summary.

## Additional notes
Practical CaseBrain note:
- MG5 is a strong source for allegation narrative.
- It is a weaker source for current hearing date.
- It is not the source of truth for disclosure service.
- It must be cross-checked against listing notice and MG6/MG6C.
