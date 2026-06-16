# 04-mg6-disclosure-schedule.md — MG6 / MG6C disclosure schedule shape

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://www.gov.uk/government/publications/attorney-generals-guidelines-on-disclosure
- https://assets.publishing.service.gov.uk/media/65e1ab9d2f2b3b00117cd803/Attorney_General_s_Guidelines_on_Disclosure_-_2024.pdf
- https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-1-introduction

## Headings in order (verbatim where short and source-clear)
1. MG06 Case File Information
2. MG06C Schedule of Relevant Non-Sensitive Unused Material
3. MG06D Schedule of Relevant Sensitive Unused Material
4. MG06E Disclosure Officer's Report
5. Item
6. Description
7. Location
8. Disclosure decision

## Field labels
- URN:
- Defendant:
- Disclosure officer:
- Item no:
- Description of material:
- Location:
- Date obtained:
- Disclose:
- Inspect:
- Withhold:
- Reason:
- Prosecutor decision:
- Disclosure officer certificate:

## Table columns
- Item no.
- Description of material
- Date
- Location
- Relevance
- Disclose
- Inspect
- Withhold
- Comments

## Typical page order in full bundle
1. MG5 mentions possible material
2. MG6/MG6C schedule identifies unused material
3. MG6E notes undermining/assisting material
4. Disclosure decision recorded
5. Later update/supplemental schedule if present

## CaseBrain extraction fields
- served_material
- missing_material
- expected_disclosure_chase
- must_not_say
- truth_hierarchy
- expected_status

## Common glue/OCR risks
- CCTV mentioned in MG5 but absent from MG6C.
- CAD/999 listed as requested but not served.
- BWV appears in exhibit ref but is not in schedule.
- MG6C table row wraps and loses `withhold/inspect` decision.
- Duplicate MG6C pages cause double counting.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not call material disclosed because it is mentioned as requested.
- Do not say sensitive material is available to defence.
- Do not chase every theoretical item; chase what is missing or tensioned by the file.

## Replica notes: fixed vs swappable
- Fixed: schedule title, item/description/location/disclose/inspect/withhold logic.
- Swappable: fictional item descriptions and locations.
- Use short practical disclosure-chase bullets.
- Where disclosure decision wording is uncertain, mark `verify against AG Disclosure 2024 / MG6C source`.
- Never put tracker-only must-not-say traps into the PDF.
