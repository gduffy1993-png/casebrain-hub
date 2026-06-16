# 07-sjp-thin-pack.md — Single Justice Procedure / thin pack shape

## Source(s)
- https://www.gov.uk/single-justice-procedure-notices
- https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023
- https://www.gov.uk/government/publications/how-to-use-hmcts-common-platform-for-prosecuting-organisations/when-to-use-common-platform-for-prosecutions

## Headings in order (verbatim where short and source-clear)
1. Single Justice Procedure Notice
2. Written charge
3. Statement of facts
4. Plea response
5. Mitigation
6. Court decision by a single magistrate
7. 21 days to respond
8. Case reference

## Field labels
- Defendant:
- Case reference:
- Offence:
- Date of offence:
- Place:
- Prosecutor:
- How to plead:
- Guilty:
- Not guilty:
- Mitigation:
- Fine:
- Costs:
- Victim surcharge:

## Table columns
- Page
- Document
- Purpose
- Response required
- Deadline

## Typical page order in full bundle
1. SJP notice
2. Written charge
3. Statement of facts
4. Plea/means form
5. Guidance/response information
6. Optional evidence/exhibit page
7. Postal certificate/service note

## CaseBrain extraction fields
- primary_defendant
- case_title
- offence_family
- correct_offence_wording
- stage
- correct_hearing
- expected_status

## Common glue/OCR risks
- Response deadline mistaken for court hearing.
- No physical hearing but app forces Court Today hearing.
- Defendant company vs individual confused.
- Minor offence treated as Crown-ready.
- SJP notice date read as offence date.

## Must-not-invent rules
- Do not infer a hearing date if no listing/requisition/hearing notice appears.
- Do not infer a served MG6 schedule from an index label alone.
- Do not replace the client with a co-defendant found in a witness narrative.
- Do not promote a historical police date over the latest listing notice.
- Do not say material is disclosed unless the schedule or page itself says it is available/served.
- Do not treat an exhibit reference as an exhibit being physically served.
- Do not create a hearing when SJP is paper-only unless the notice says court hearing/referral.
- Do not say defendant must attend where SJP allows postal/online response.
- Do not infer full disclosure bundle from 3-8 page thin pack.

## Replica notes: fixed vs swappable
- Fixed: SJP notice/written charge/statement-of-facts structure.
- Swappable: minor offence facts and fictional prosecuting body.
- Use clean plain layout for S1 recipe.
- Tracker expected_status can be pass even if thin, provided extraction truth is clear.
- Avoid panic/provisional wording where the thinness is normal for SJP.
