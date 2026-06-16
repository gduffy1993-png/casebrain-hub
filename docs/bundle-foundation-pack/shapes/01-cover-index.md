# 01-cover-index.md — Cover and bundle index shape

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://assets.publishing.service.gov.uk/media/67c19021750837d7604dbcd4/Criminal+casefiles+-+forms_+standards_+and+file+structure.pdf
- https://www.cps.gov.uk/prosecution-guidance/directors-guidance-charging-sixth-edition-december-2020-incorporating-national
- https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023

## Headings in order (verbatim where short and source-clear)
1. CASE FILE
2. PROSECUTION CASE FILE
3. INDEX
4. URN
5. Defendant
6. Court
7. Hearing date
8. Hearing time
9. Offence
10. Document
11. Pages

## Field labels
- URN:
- PTI URN:
- Case reference:
- Defendant:
- Date of birth:
- Court:
- Next hearing:
- Time:
- Stage:
- Document description:
- Page from:
- Page to:

## Table columns
- No.
- Document
- Form
- Description
- Date
- Pages
- Served
- Notes

## Typical page order in full bundle
1. Cover page
2. Index page
3. Charge sheet / written charge
4. MG5 case summary
5. MG11 witness statements
6. Exhibits or exhibit list
7. MG6/MG6C schedules
8. Listing/hearing notice
9. Custody/interview material if present

## CaseBrain extraction fields
- primary_defendant
- case_title
- correct_offence_wording
- correct_court
- correct_hearing
- stage
- layout_family
- served_material
- missing_material
- page_count

## Common glue/OCR risks
- CourtHearing glued into court line.
- DOB glued to surname.
- Index row wrapped so document title falls under wrong page range.
- Old hearing date in index beating later listing notice.
- Co-defendant row above client row.
- Page numbers rendered as offence numbers.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.

## Replica notes: fixed vs swappable
- Fixed: title/case/index language, URN/court/date labels, document order.
- Swappable: fictional court names, URN, defendants, dates, page numbers.
- Use plausible fake courts, e.g. Hillford Magistrates' Court or Northbridge Crown Court.
- Do not use a giant FICTIONAL TEST DATA banner.
- If a public source wording is uncertain, write `verify against [URL]` in recipe notes, not inside final PDF.
