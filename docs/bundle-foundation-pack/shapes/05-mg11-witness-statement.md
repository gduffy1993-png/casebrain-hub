# 05-mg11-witness-statement.md — MG11 witness statement shape

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://assets.publishing.service.gov.uk/media/5d2c8582ed915d2feeac49b2/BAGT-Witness-statements-v4-archived.pdf

## Headings in order (verbatim where short and source-clear)
1. MG11 WITNESS STATEMENT
2. Criminal Procedure Rules
3. Section 9 Criminal Justice Act 1967
4. Statement of Truth
5. Witness details
6. Statement
7. Signature
8. Date
9. Consent / attendance / special measures

## Field labels
- URN:
- Statement of:
- Age if under 18:
- Occupation:
- This statement consisting of:
- Signature:
- Date:
- Witness contact:
- Willing to attend court:
- Special measures:
- Medical consent:
- Exhibit:

## Table columns
- Witness name
- Role
- Statement date
- Pages
- Exhibit refs
- Consent
- Special measures

## Typical page order in full bundle
1. Cover/index
2. MG5 summary
3. MG11 complainant
4. MG11 officer/shop staff/independent witness
5. Exhibits referred to
6. MG6 schedule cross-check

## CaseBrain extraction fields
- served_material
- witnesses
- complainant
- expected_safe_summary
- hidden_tension
- vulnerability_flag

## Common glue/OCR risks
- Witness name tail includes `Statement` in header.
- Signature block scanned poorly.
- Exhibit initials glued to narrative.
- Witness and defendant names confused.
- Statement date mistaken for hearing date.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not say witness attends unless attendance/willingness is shown.
- Do not say statement is served if it only appears in index and not pages.
- Do not overstate identity evidence from a vague witness account.

## Replica notes: fixed vs swappable
- Fixed: MG11 title, witness details block, statement/signature/date structure.
- Long statement/perjury wording: use `verify against current MG11 / BAGT source` rather than inventing.
- Swappable: witness name, statement facts, exhibit initials, signature/date.
- Keep a normal witness voice; not an AI narrative.
- One slightly rough scan page can be used in messy recipes only.

## Additional notes
Short wording policy:
- Form title and field labels may be used directly.
- Do not reproduce full official MG11 form wholesale in generated docs.
- For the exact declaration/perjury wording, the generator should verify against the current public MG11 source before PDF creation.
