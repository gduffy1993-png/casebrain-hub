# 09-custody-interview-summary.md — Custody record + MG15 interview summary shape

## Source(s)
- https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible
- https://www.cps.gov.uk/prosecution-guidance/directors-guidance-charging-sixth-edition-december-2020-incorporating-national
- https://www.gov.uk/government/publications/attorney-generals-guidelines-on-disclosure

## Headings in order (verbatim where short and source-clear)
1. Custody Record
2. Interview Record
3. MG15
4. Interview summary
5. Caution
6. Solicitor present
7. No comment
8. Admissions
9. Denials
10. Interpreter / appropriate adult

## Field labels
- Custody number:
- URN:
- Defendant:
- Date/time arrested:
- Grounds for arrest:
- Detention authorised:
- Interview start:
- Interview end:
- Persons present:
- Legal representative:
- Appropriate adult:
- Interpreter:
- Summary:
- Tape/media ref:

## Table columns
- Time
- Event
- Officer
- Decision
- Notes
- Media reference

## Typical page order in full bundle
1. Charge/MG5
2. Custody record
3. Interview summary/MG15
4. MG6 schedule for recording/transcript
5. Listing notice

## CaseBrain extraction fields
- stage
- served_material
- missing_material
- vulnerability_flag
- expected_safe_summary
- expected_disclosure_chase

## Common glue/OCR risks
- Interview summary exists but transcript not served.
- No-comment interview overread as admission.
- Solicitor present line glued to defendant name.
- Appropriate adult line lost in OCR.
- Custody date mistaken for offence or hearing date.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not treat no comment as guilt.
- Do not claim interview transcript is served unless listed/attached.
- Do not ignore youth/vulnerability/interpreter flags.
- Do not infer admissions from officer summary without actual answer text.

## Replica notes: fixed vs swappable
- Fixed: custody/interview event labels and MG15 interview-record structure.
- Swappable: custody number, times, persons present, interview summary facts.
- Use in M4 and youth/vulnerability future recipes.
- If transcript missing, chase transcript/recording rather than overstating interview value.
- Respect safeguards flags in output.
