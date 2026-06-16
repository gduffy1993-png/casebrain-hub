# TRACKER_CSV_GUIDE.md

The tracker CSV is the truth source for factory scoring. It stays separate from the PDFs. Do not print tracker-only truth or traps inside generated bundles.

## Exact required columns

- `ref`
- `pdf_filename`
- `primary_defendant`
- `case_title`
- `offence_family`
- `correct_offence_wording`
- `correct_court`
- `correct_hearing`
- `stage`
- `layout_family`
- `served_material`
- `missing_material`
- `contradictions`
- `hidden_tension`
- `truth_hierarchy`
- `expected_status`
- `expected_safe_summary`
- `expected_disclosure_chase`
- `must_not_say`
- `pass_or_amber_reason`
- `page_count`
- `intentional_ocr_glue`

## Optional extended columns
- `co_defendants`
- `youth_flag`
- `vulnerability_flag`
- `source_shape`

## Column definitions

- `ref`: Unique factory reference.
- `pdf_filename`: Generated PDF filename.
- `primary_defendant`: The client/defendant CaseBrain must anchor to.
- `case_title`: Display case title, usually R v [client].
- `offence_family`: High-level family such as theft, violence, drugs, motoring.
- `correct_offence_wording`: Full charge wording that should appear in header/output.
- `correct_court`: Court extracted from latest reliable listing/source.
- `correct_hearing`: Date/time in format `24 August 2026 at 11:15`.
- `stage`: first appearance, SJP, PTPH, case management, trial prep, etc.
- `layout_family`: Recipe/family code such as S2 clean mags or B1 Crown PTPH.
- `served_material`: Documents/material actually present or scheduled as served.
- `missing_material`: Material mentioned/outstanding/not safely served.
- `contradictions`: Deliberate conflicts such as MG5 date vs listing.
- `hidden_tension`: Trap or subtle issue CaseBrain must not overclaim.
- `truth_hierarchy`: Which source wins where conflict exists.
- `expected_status`: pass, amber or provisional.
- `expected_safe_summary`: Target safe summary style.
- `expected_disclosure_chase`: Expected missing-item chase output.
- `must_not_say`: Phrases or claims that must be blocked.
- `pass_or_amber_reason`: Why the case is pass/amber.
- `page_count`: Expected PDF pages.
- `intentional_ocr_glue`: true/false; normally false for clean foundation packs.

## Example rows

| ref | pdf_filename | primary_defendant | case_title | offence_family | correct_offence_wording | correct_court | correct_hearing | stage | layout_family | served_material | missing_material | contradictions | hidden_tension | truth_hierarchy | expected_status | expected_safe_summary | expected_disclosure_chase | must_not_say | pass_or_amber_reason | page_count | intentional_ocr_glue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S2-001 | S2_mags_theft_hale_001.pdf | Ryan Hale | R v Ryan Hale | theft | Theft, contrary to section 1 of the Theft Act 1968. | Hillford Magistrates' Court | 24 August 2026 at 11:15 | first appearance | S2 clean mags | MG5; MG11 shop staff; MG6C nil/limited | CCTV master if not included | none | none | charge sheet + listing notice control header; MG6C controls disclosure | pass | Ryan Hale faces a theft allegation from a shop incident; papers are short but coherent. | Check whether store CCTV/master copy is served if relied on. | CCTV proves; Crown case proven | Clean pilot pack with extractable header and ordinary disclosure chase. | 10 | false |
| M3-014 | M3_cctv_mentioned_not_mg6_014.pdf | Tara Coleman | R v Tara Coleman | assault | Assault occasioning actual bodily harm, contrary to section 47 of the Offences against the Person Act 1861. | Northbridge Magistrates' Court | 2 September 2026 at 10:00 | case management | M3 messy normal | MG5; one MG11; MG6C without CCTV row | CCTV; medical full record | MG5 says CCTV reviewed but MG6C does not list it | CCTV overclaim trap | listing beats MG5 date; MG6C controls served/missing material | amber | ABH allegation is apparent but evidence position is provisional because CCTV/medical are not safely served. | Chase CCTV entry/source material and full medical note before relying on injury/identification. | CCTV proves; medical evidence confirms severity | Amber by design: material mentioned in narrative but not on schedule. | 14 | false |
| B2-022 | B2_multicount_crown_022.pdf | Leon Marsh | R v Leon Marsh and Others | drugs | Possession of a controlled drug of Class A with intent to supply it to another, contrary to section 5(3) of the Misuse of Drugs Act 1971. | Northbridge Crown Court | 18 September 2026 at 09:30 | PTPH | B2 Crown multicount | indictment; MG5; 4 MG11s; partial MG6C | phone download; full continuity; lab certificate if absent | old mags charge differs from indictment | co-defendant index noise | indictment beats old charge sheet; client header must stay Leon Marsh | amber | Crown PTPH file identifies a PWITS count; strategy remains provisional pending phone/lab/continuity material. | Chase phone download, lab certificate and continuity schedule before adopting a route. | phone proves supply; forensic match; co-defendant proves client involvement | Crown amber: header should be solid, strategy conditional. | 72 | false |
