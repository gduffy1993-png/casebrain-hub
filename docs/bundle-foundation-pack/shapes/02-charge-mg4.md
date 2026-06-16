# 02-charge-mg4.md — Charge sheet / MG4-style charge page

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://www.cps.gov.uk/prosecution-guidance/directors-guidance-charging-sixth-edition-december-2020-incorporating-national
- https://www.cps.gov.uk/prosecution-guidance/drafting-indictment
- https://www.cps.gov.uk/prosecution-guidance/legal-guidance

## Headings in order (verbatim where short and source-clear)
1. Charge Sheet
2. MG04
3. Written Charge
4. Defendant details
5. Offence
6. Statement of Offence
7. Particulars of Offence
8. Reply after charge
9. Bail
10. Court appearance

## Field labels
- URN:
- Defendant:
- DOB:
- Address:
- Offence:
- Statement of Offence:
- Particulars of Offence:
- Contrary to:
- Date of offence:
- Location:
- Reply after charge:
- Bail:
- Court:
- Date:
- Time:

## Table columns
- Count
- Offence
- Contrary to
- Particulars
- Court
- Date/time

## Typical page order in full bundle
1. Cover/index
2. Charge sheet/written charge
3. MG5 summary
4. Listing/requisition
5. MG11 statements
6. MG6 schedule

## CaseBrain extraction fields
- primary_defendant
- case_title
- offence_family
- correct_offence_wording
- correct_court
- correct_hearing
- truth_hierarchy

## Common glue/OCR risks
- ChargeContraryTo glued into one token.
- Old charge sheet has superseded wording.
- Charge sheet lists first appearance but later listing changes date.
- Multiple counts create false single-offence summary.
- Co-defendant charge row mistaken for client charge.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not treat old charge sheet as final where indictment/corrected charge is later in bundle.
- Do not infer plea unless plea or anticipated plea is stated.

## Replica notes: fixed vs swappable
- Fixed: `Statement of Offence`, `Particulars of Offence`, `contrary to section ...` style.
- Swappable: date/place/value/complainant/factual narrative.
- Use one clean statutory line, then particulars in plain case facts.
- For Crown recipes, indictment beats old magistrates charge sheet.
- Use CPS offence guidance to choose offence family.
