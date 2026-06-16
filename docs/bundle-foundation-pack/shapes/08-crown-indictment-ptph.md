# 08-crown-indictment-ptph.md — Crown indictment + PTPH shape

## Source(s)
- https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023
- https://www.legislation.gov.uk/uksi/2025/909/part/10
- https://www.cps.gov.uk/prosecution-guidance/drafting-indictment
- https://www.judiciary.uk/guidance-and-resources/better-case-management-revival-handbook-january-2023/

## Headings in order (verbatim where short and source-clear)
1. IN THE CROWN COURT
2. THE KING v [Defendant]
3. INDICTMENT
4. Count 1
5. Statement of Offence
6. Particulars of Offence
7. Plea and Trial Preparation Hearing
8. PTPH
9. Trial estimate
10. Prosecution witnesses

## Field labels
- Court:
- Case number:
- Defendant:
- Count:
- Statement of Offence:
- Particulars of Offence:
- Contrary to:
- PTPH date:
- Time:
- Trial estimate:
- Bail/remand:
- Counsel:
- Judge:

## Table columns
- Count
- Defendant
- Statement of offence
- Particulars
- Contrary to
- Plea
- Notes

## Typical page order in full bundle
1. Cover/index
2. Indictment
3. Sending notice/PTPH listing
4. MG5 or case summary
5. MG11 bundle
6. Exhibits
7. MG6/MG6C
8. Defence statement if later stage

## CaseBrain extraction fields
- correct_offence_wording
- primary_defendant
- co_defendants
- correct_court
- correct_hearing
- stage
- truth_hierarchy

## Common glue/OCR risks
- Old mags charge sheet conflicts with corrected indictment.
- Co-defendant count appears first.
- Count number mistaken for charge section.
- PTPH date glued to Crown Court venue.
- Particulars wrap over several lines.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Indictment beats old charge sheet in M2/B recipes.
- Do not merge counts into one allegation.
- Do not use co-defendant offence as client offence.
- Do not say plea entered unless PTPH/plea page records it.

## Replica notes: fixed vs swappable
- Fixed: Crown Court/indictment/count/statement/particulars structure.
- Swappable: fictional court, count wording, particulars, dates.
- Use clear page numbers and index in B recipes.
- Strategy must be provisional if disclosure is long/partial.
- Header must stay solid even where strategy is amber.
