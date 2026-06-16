# 06-listing-hearing-notice.md — Listing / hearing notice shape

## Source(s)
- https://www.gov.uk/single-justice-procedure-notices
- https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023
- https://www.gov.uk/government/publications/how-to-use-hmcts-common-platform-for-prosecuting-organisations/when-to-use-common-platform-for-prosecutions
- https://www.cps.gov.uk/prosecution-guidance/directors-guidance-charging-sixth-edition-december-2020-incorporating-national

## Headings in order (verbatim where short and source-clear)
1. Notice of hearing
2. Single Justice Procedure Notice
3. Written charge
4. Requisition
5. Court
6. Date
7. Time
8. Hearing type
9. Case reference
10. Defendant

## Field labels
- Court:
- Court address:
- Case reference:
- URN:
- Defendant:
- Hearing date:
- Hearing time:
- Hearing type:
- You must attend:
- Plea:
- Prosecutor:
- Contact:

## Table columns
- Case reference
- Defendant
- Court
- Hearing type
- Date
- Time
- Room
- Notes

## Typical page order in full bundle
1. Cover/index
2. Charge/written charge
3. MG5
4. Listing/hearing notice
5. SJP response page if relevant

## CaseBrain extraction fields
- correct_court
- correct_hearing
- stage
- truth_hierarchy
- case_title

## Common glue/OCR risks
- CourtHearing glued to venue.
- Date stuck to court name.
- 12:00 read as section number.
- Old MG5 hearing date wrongly wins over listing notice.
- SJP response deadline mistaken for hearing date.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Listing notice beats old MG5 date for next hearing.
- Do not create a court time from response deadline.
- Do not say trial listed where notice says first appearance or PTPH.

## Replica notes: fixed vs swappable
- Fixed: court/date/time/hearing-type labels.
- Swappable: fictional venue, date and time.
- Use a clear `24 August 2026 at 11:15` tracker format.
- Court Today must use latest current listing, not stale history.
- Avoid real court listing names/real cases.
