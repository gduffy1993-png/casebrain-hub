# recipes/ALL_RECIPES.md

Fifteen whole-bundle recipes. Generate S1-S2 first only after docs are accepted. No PDF generation in this step.

## S1 — SJP / postal requisition

- ID: `S1`
- Target firm size: small firm / high street
- Page count: 3-8 pages
- Expected status: `pass`
- Layout family: `S1 SJP / postal requisition`
- Offence family: minor motoring/TVL/simple non-imprisonable

### Exact page order
1. SJP notice
2. written charge
3. statement of facts
4. plea/means form
5. response guidance
6. optional certificate/service note

### Tracker truth fields
- `ref`: S1-###
- `pdf_filename`: s1_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: minor motoring/TVL/simple non-imprisonable
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S1
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: No physical hearing unless referral/hearing notice appears.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 3-8
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- No physical hearing unless referral/hearing notice appears.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## S2 — Mags first appearance — theft s.1

- ID: `S2`
- Target firm size: duty solicitor / small firm
- Page count: 8-12 pages
- Expected status: `pass`
- Layout family: `S2 Mags first appearance — theft s.1`
- Offence family: theft

### Exact page order
1. Cover/index
2. MG4 charge
3. MG5
4. MG11 shop staff
5. MG11 officer
6. MG6C short/nil
7. listing notice

### Tracker truth fields
- `ref`: S2-###
- `pdf_filename`: s2_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: theft
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S2
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Store CCTV can be mentioned only if scheduled/served.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 8-12
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Store CCTV can be mentioned only if scheduled/served.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## S3 — Mags — common assault / s.47 ABH

- ID: `S3`
- Target firm size: small firm
- Page count: 8-14 pages
- Expected status: `pass or amber if medical partial`
- Layout family: `S3 Mags — common assault / s.47 ABH`
- Offence family: violence

### Exact page order
1. Cover/index
2. charge
3. MG5
4. complainant MG11
5. officer MG11
6. photo/medical note if present
7. MG6C
8. listing

### Tracker truth fields
- `ref`: S3-###
- `pdf_filename`: s3_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: violence
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S3
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Do not upgrade common assault to ABH without injury material.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass or amber if medical partial
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 8-14
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Do not upgrade common assault to ABH without injury material.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## S4 — Mags — drink drive

- ID: `S4`
- Target firm size: motoring / duty solicitor
- Page count: 8-16 pages
- Expected status: `pass`
- Layout family: `S4 Mags — drink drive`
- Offence family: motoring

### Exact page order
1. Cover/index
2. charge
3. MG5
4. procedure statement
5. intoximeter/breath result page
6. MG11 officer
7. MG6C
8. listing

### Tracker truth fields
- `ref`: S4-###
- `pdf_filename`: s4_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: motoring
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S4
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: No reading = no confident drink-drive summary.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 8-16
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- No reading = no confident drink-drive summary.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## S5 — Mags — simple drugs possession

- ID: `S5`
- Target firm size: small firm
- Page count: 10-18 pages
- Expected status: `pass`
- Layout family: `S5 Mags — simple drugs possession`
- Offence family: drugs

### Exact page order
1. Cover/index
2. charge
3. MG5
4. seizure officer MG11
5. exhibit/continuity note
6. lab/field test if present
7. MG6C
8. listing

### Tracker truth fields
- `ref`: S5-###
- `pdf_filename`: s5_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: drugs
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S5
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Possession only; do not infer supply.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 10-18
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Possession only; do not infer supply.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## S6 — Shop theft / retail

- ID: `S6`
- Target firm size: duty solicitor / high street
- Page count: 8-12 pages
- Expected status: `pass`
- Layout family: `S6 Shop theft / retail`
- Offence family: theft

### Exact page order
1. Cover/index
2. charge
3. MG5
4. store staff MG11
5. officer MG11
6. property/value line
7. MG6C
8. listing

### Tracker truth fields
- `ref`: S6-###
- `pdf_filename`: s6_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: theft
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: S6
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Retail CCTV/source footage must be chased if not on schedule.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: pass
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 8-12
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Retail CCTV/source footage must be chased if not on schedule.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## M1 — MG5 hearing date differs from listing

- ID: `M1`
- Target firm size: small/mid firm
- Page count: 10-16 pages
- Expected status: `amber`
- Layout family: `M1 MG5 hearing date differs from listing`
- Offence family: any

### Exact page order
1. Cover/index
2. charge
3. MG5 with old date
4. MG11s
5. MG6C
6. later listing notice

### Tracker truth fields
- `ref`: M1-###
- `pdf_filename`: m1_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: any
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: M1
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Listing notice wins.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 10-16
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Listing notice wins.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## M2 — Old charge sheet vs corrected indictment

- ID: `M2`
- Target firm size: Crown transition
- Page count: 35-70 pages
- Expected status: `amber`
- Layout family: `M2 Old charge sheet vs corrected indictment`
- Offence family: violence/drugs/theft

### Exact page order
1. Cover/index
2. old mags charge
3. sending/PTPH notice
4. indictment corrected wording
5. MG5
6. MG11s
7. MG6C

### Tracker truth fields
- `ref`: M2-###
- `pdf_filename`: m2_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: violence/drugs/theft
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: M2
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Indictment wins.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 35-70
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Indictment wins.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## M3 — CCTV in MG5 but not on MG6

- ID: `M3`
- Target firm size: small/mid firm
- Page count: 10-18 pages
- Expected status: `amber`
- Layout family: `M3 CCTV in MG5 but not on MG6`
- Offence family: theft/violence

### Exact page order
1. Cover/index
2. charge
3. MG5 saying CCTV reviewed
4. MG11
5. MG6C with no CCTV row
6. listing

### Tracker truth fields
- `ref`: M3-###
- `pdf_filename`: m3_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: theft/violence
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: M3
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Do not say CCTV proves.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 10-18
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Do not say CCTV proves.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## M4 — Thin bundle — interview summary only

- ID: `M4`
- Target firm size: duty solicitor
- Page count: 6-10 pages
- Expected status: `provisional`
- Layout family: `M4 Thin bundle — interview summary only`
- Offence family: any

### Exact page order
1. Cover
2. charge
3. MG5 short
4. interview summary/MG15 extract
5. listing
6. no/full MG6 absent

### Tracker truth fields
- `ref`: M4-###
- `pdf_filename`: m4_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: any
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: M4
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Provisional; chase transcript/recording and missing witness material.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: provisional
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 6-10
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Provisional; chase transcript/recording and missing witness material.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## M5 — Partial medical / triage note only

- ID: `M5`
- Target firm size: violence
- Page count: 10-16 pages
- Expected status: `amber`
- Layout family: `M5 Partial medical / triage note only`
- Offence family: violence

### Exact page order
1. Cover/index
2. charge
3. MG5
4. complainant MG11
5. triage note
6. MG6C showing full records outstanding
7. listing

### Tracker truth fields
- `ref`: M5-###
- `pdf_filename`: m5_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: violence
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: M5
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Do not confirm injury severity.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 10-16
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Do not confirm injury severity.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## B1 — Crown PTPH single count s.18/s.20

- ID: `B1`
- Target firm size: bigger firm / Crown
- Page count: 40-80 pages
- Expected status: `amber`
- Layout family: `B1 Crown PTPH single count s.18/s.20`
- Offence family: serious violence

### Exact page order
1. Cover/index
2. indictment
3. PTPH notice
4. MG5
5. complainant/officer MG11s
6. exhibits
7. MG6C
8. custody/interview

### Tracker truth fields
- `ref`: B1-###
- `pdf_filename`: b1_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: serious violence
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: B1
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Header solid; strategy conditional.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 40-80
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Header solid; strategy conditional.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## B2 — Multi-count indictment + MG6 schedule

- ID: `B2`
- Target firm size: bigger firm / Crown
- Page count: 60-120 pages
- Expected status: `amber`
- Layout family: `B2 Multi-count indictment + MG6 schedule`
- Offence family: drugs/violence/theft

### Exact page order
1. Cover/index
2. indictment counts 1-3
3. PTPH notice
4. MG5
5. MG11s
6. exhibit schedule
7. MG6C
8. interview/custody

### Tracker truth fields
- `ref`: B2-###
- `pdf_filename`: b2_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: drugs/violence/theft
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: B2
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Do not merge counts.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 60-120
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Do not merge counts.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## B3 — Co-defendant index noise

- ID: `B3`
- Target firm size: bigger firm / Crown
- Page count: 30-80 pages
- Expected status: `amber`
- Layout family: `B3 Co-defendant index noise`
- Offence family: multi-defendant

### Exact page order
1. Cover/index with co-defs
2. client-specific indictment count
3. MG5
4. co-def MG11/interview refs
5. MG6C
6. listing

### Tracker truth fields
- `ref`: B3-###
- `pdf_filename`: b3_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: multi-defendant
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: B3
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Client header must stay on primary defendant.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 30-80
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Client header must stay on primary defendant.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.

## B4 — Disclosure-heavy long MG6C

- ID: `B4`
- Target firm size: bigger firm / Crown
- Page count: 80-150 pages
- Expected status: `amber`
- Layout family: `B4 Disclosure-heavy long MG6C`
- Offence family: complex

### Exact page order
1. Cover/index
2. indictment
3. PTPH
4. MG5
5. statements
6. exhibits
7. long MG6C/MG6D/MG6E
8. disclosure notes

### Tracker truth fields
- `ref`: B4-###
- `pdf_filename`: b4_[short_slug]_[seq].pdf
- `primary_defendant`: fictional client name only
- `case_title`: R v [Primary Defendant]
- `offence_family`: complex
- `correct_offence_wording`: use one line from SPECIMEN_CHARGE_WORDINGS.md
- `correct_court`: fictional court from PDF source of truth
- `correct_hearing`: `24 August 2026 at 11:15` style
- `stage`: SJP / first appearance / case management / PTPH as recipe requires
- `layout_family`: B4
- `served_material`: list documents actually present
- `missing_material`: list only material absent/outstanding/mentioned but not served
- `contradictions`: state deliberate conflict or `none`
- `hidden_tension`: Schedule governs served/missing; no global no-issue claim.
- `truth_hierarchy`: latest listing beats old MG5; indictment beats old charge if Crown; MG6C controls disclosure
- `expected_status`: amber
- `expected_safe_summary`: short, evidence-linked, no outcome claim
- `expected_disclosure_chase`: practical missing-item bullets
- `must_not_say`: pulled from MUST_NOT_SAY_REGISTER.md
- `page_count`: 80-150
- `intentional_ocr_glue`: false unless messy recipe deliberately says true

### Extractability checklist
- Client name appears on charge/cover and at least one summary page.
- Charge wording appears as a full statutory line.
- Court appears on listing/requisition/PTPH source.
- Hearing date/time appears in one clear current source unless contradiction is deliberate.
- Stage is visible from notice/context.
- Served vs missing material is inferable from pages/schedules.

### Must-not-say list
- Schedule governs served/missing; no global no-issue claim.
- Crown case proven.
- Evidence confirms guilt.
- Material is served when only mentioned.
- Court will accept/win.

### Believability notes
- Use normal form titles and labels.
- No giant fiction banner.
- No app explanatory text.
- Vary URN, court, dates and page lengths.
- Keep PDF boring and solicitor-recognisable.
