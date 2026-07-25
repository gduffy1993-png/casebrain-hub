# Heavy-case cross-cutting control allocation

**Status:** REVIEW-ONLY COMPANION — STOP FOR REVIEW — NO GENERATION AUTHORITY  
**Blueprint:** `master-heavy-case-coverage-matrix.md` (approved programme blueprint)  
**Prepared:** 2026-07-23  

## Control rules

- The approved denominator remains **18 core matters**. Security-only tests, format probes and variants do not create additional core matters.
- Four sealed unseen holdouts remain separate and are not created or specified here.
- A control allocated to more than one matter must exercise a materially different state or risk; repetition alone earns no coverage credit.
- Each allocated control must be represented in the matter design freeze, truth key/negative controls and cross-exit acceptance matrix before generation.
- Safe rejection or quarantine is a security outcome, not substantive extraction repair. Containment and substantive repair remain separate outcomes.
- Counsel and expert extracts are optional generally and mandatory when relevant.
- No PDF generation, app change, remediation, commit, push, merge, deployment or programme PASS is authorised by this allocation.

## Core-matter key

| Rank | Short name |
|---:|---|
| 1 | Malik–Price multi-defendant violence |
| 2 | Homicide |
| 3 | Firearms conspiracy |
| 4 | Complex fraud / POCA |
| 5 | Drugs conspiracy / county lines |
| 6 | Adult sexual offence |
| 7 | Youth robbery |
| 8 | Domestic abuse course of conduct |
| 9 | Digital attribution / malicious communications |
| 10 | Stranger-identification robbery |
| 11 | Mental health / fitness to plead |
| 12 | Disclosure / PII |
| 13 | Fatal road traffic |
| 14 | Magistrates’ contested summary trial |
| 15 | Bail/remand/variation application |
| 16 | Sentencing / Newton hearing |
| 17 | Court of Appeal conviction appeal |
| 18 | Magistrates’ Court to Crown Court appeal |

## Input and security allocation

| Control | Primary allocation | Secondary / negative-control allocation | Required distinct assertion |
|---|---|---|---|
| Professional readable born-digital and scanned PDFs | **1 Malik–Price clean** | 2, 6, 10, 13, 17 | Clean pages retain document/page provenance; normal born-digital/scanned variation does not change substantive truth |
| OCR deterioration, rotation and page disorder | **1 Malik–Price messy variant only** | Other messy variants only where separately allocated | Presentation defects are overlays on the same frozen substantive truth and never part of the clean v1.1 bundle |
| Password-protected PDF failures | **Separate security harness only** | None in Malik–Price clean or messy variants | Known/unknown/incorrect-password states; no password logging; inaccessible content never described as reviewed |
| Corrupt / partially recoverable PDF | **Separate security harness only** | None in Malik–Price clean or messy variants | Document/page failure visible; no fabricated completeness or continuity; parser failure cannot contaminate a matter |
| Images and image metadata | **1 Malik–Price clean: ordinary images** | 10 identification; 13 road traffic | Visible image and ordinary metadata claims separated; edited/still/master state preserved where authorised by the matter design |
| Audio/video and media metadata | **1 Malik–Price clean: ordinary frozen media** | **9 digital**; 6 sexual; 8 domestic | Clip/master/transcript/metadata states separated; no unsupported speaker, person or event attribution |
| Hidden text / document prompt injection | **1 Malik–Price messy variant only** | 4 fraud; 9 digital; separate security harness | Hidden/off-page/instructional text treated as untrusted evidence and never as system direction; clean v1.1 remains injection-free |
| XLSX / CSV | **4 fraud** | 9 digital; 13 road traffic | Sheet/cell provenance, hidden rows/sheets, formulas/cached values, dates and leading zeros preserved; export formula injection neutralised |
| ZIP — valid evidential archives | **4 fraud** | 9 digital | Nested structure, duplicate names and email/spreadsheet relationships preserved safely |
| ZIP/archive abuse | **Separate security harness only** | None in core-matter variants | Traversal, bombs, unsafe nesting/expansion and resource abuse rejected without execution or matter-state contamination |
| Email evidence | **4 fraud** | 8 domestic; 9 digital | Header/body/attachment/forwarding chain provenance; display identity is not verified identity |
| JSON | **9 digital** | 4 fraud | Duplicate-key/schema-drift policy; depth/size limits; no execution of embedded instructions |
| EML / MSG | **9 digital** | 4 fraud | HTML/plain body, headers, forwarded chain and attachments remain separately attributable and sanitised |
| Hashes / native digital continuity | **9 digital** | 1 Malik–Price; 3 firearms | Hash match/mismatch/absence states distinct; a hash does not itself prove authorship or substantive authenticity |
| Embedded attachments / PDF portfolios | **12 disclosure/PII** | 4 fraud; separate security harness | Enumerate without auto-execution; preserve parent/child provenance and open/closed status |
| Privileged/confidential documents | **12 disclosure/PII** | 1 Malik–Price negative controls; 17 appeal | Attendance notes, counsel advice, waiver and inadvertent disclosure are classified; zero unauthorised leakage |
| Cross-matter contamination | **12 disclosure/PII** | Separate security harness across two isolated synthetic matter containers | Same names/hashes and concurrent ingestion cannot cross facts, files, caches, outputs or review state |
| Digital signatures | **12 disclosure/PII** | 17 and 18 appeals | Valid/invalid/expired/altered/unverifiable status separated from document truth and filing status |
| Malicious uploads | **Separate security harness only** | Negative assertions exercised against ingestion boundary, not a core matter | Executable masquerade, macros, polyglots, decompression/resource abuse and malformed parser inputs do not execute or contaminate state |

### Separate security harness

The security harness is a technical negative-test suite, **not a nineteenth core matter** and not a source of offence/procedural coverage. It owns password failures, corrupt PDFs, malicious uploads, archive traversal/bombs, parser abuse/attacks, macro/executable files, polyglots, resource-limit and isolation probes. It may use minimal synthetic containers without case narratives or legal truth keys. Its results are reported as security containment, rejection, quarantine and isolation outcomes, never as a heavy matter PASS.

### Malik–Price variant boundary

| Placement | Authorised control scope | Explicit exclusion |
|---|---|---|
| Clean Malik–Price | Professional readable born-digital/scanned PDFs; ordinary images, CCTV/BWV/media and the frozen v1.1 document/evidence conflicts | No OCR deterioration overlay, rotation, page disorder, hidden-text injection, password failure, corrupt file or malicious input |
| Later messy Malik–Price variant | OCR deterioration, rotation, page disorder and hidden-text injection applied without changing parties, counts, events, evidence states or other frozen substantive truth | No password failure, corrupt PDF, malicious/polyglot file, archive abuse or parser attack |
| Separate security harness | Password failures, corrupt PDFs, malicious/polyglot files, archive abuse and parser attacks | Not Malik–Price, not a legal matter, not a variant and not part of the 18-core denominator |

None of these controls may alter the clean v1.1 substantive truth, silently amend its freeze, or inflate the 18-core matter count.

## Language, translation and interpreter allocation

| Control | Primary allocation | Required states and assertions |
|---|---|---|
| Controlled Welsh-language court material | **7 youth** | Welsh court notice/order plus controlled English version where appropriate; source language, issuer, version and authority retained; machine output never represented as certified |
| Original-language statement + certified translation | **8 domestic abuse** | Original statement retained; certified translation linked but not merged; translator identity/qualification/date/version and disputed-translation state captured |
| Interpreter lifecycle | **8 domestic abuse** | Need identified, requested, booked, attended, absent, replacement and quality-challenged states remain distinct across police/court events |
| Vulnerable witness translation negative control | **6 sexual offence** | First account, ABE/subtitle/translation and interpreter material cannot be silently conflated; special-measures and translation states remain separate |
| Counsel/expert language extract | 6, 7, 8 where relevant | Mandatory when relied upon; audience-limited and source-language provenance preserved |

The domestic-abuse matter is the primary translation/interpreter lifecycle pilot. The sexual-offence matter supplies a distinct vulnerable-witness negative control rather than duplicating the full lifecycle.

## Procedural-control allocation

| Procedural control | Primary matter(s) | Secondary / negative controls | Required state separation |
|---|---|---|---|
| PACE confession and section 78 | **14 Magistrates** | **7 youth** as a distinct PACE safeguard/negative control | Interview content/confession, alleged PACE breach, application draft/filed/heard, voir dire evidence, ruling and permitted use |
| Frozen Malik–Price interview/custody coverage | **1 Malik–Price** | No section 78 or confession storyline | Only frozen interview timing, audio/transcript completeness and custody-source conflicts; do not add an exclusion application, confession issue or new substantive fact to v1.1 |
| Admissions / agreed facts | **2 homicide**, **13 road traffic** | 1 Malik–Price | Proposed, accepted, signed/filed, admitted in evidence and withdrawn; defendant/count scope retained |
| No case to answer | **10 identification**, **14 Magistrates** | 3 firearms | Submission draft/filed/heard, ruling and affected counts; submission never presented as outcome |
| Witness availability | **6 sexual**, **8 domestic**, **14 Magistrates** | 2 homicide | Availability source/date, fear/health/absence, live/remote/special arrangements and admissibility consequences |
| Witness summons / warrant | **14 Magistrates** | 6 sexual negative control | Concern, application, issue, service, compliance and attendance remain distinct |
| Discontinuance | **14 Magistrates** | 8 domestic | Notice/decision date, affected count/defendant and live-count update; historical allegation remains auditable |
| Acquittal | **17 conviction appeal** | 14 Magistrates | Verdict/order and affected counts; acquitted count cannot remain live or drive sentence/advice |
| Dismissed counts | **14 Magistrates**, **18 Magistrates-to-Crown appeal** | 1 Malik–Price | Dismissal/no-case/discontinuance/acquittal are different disposals with separate provenance |
| Statutory time limits | **14 Magistrates** | 8 domestic | Trigger, statutory source, offence-specific exception, calculated deadline and actual commencement |
| Custody time limits (CTLs) | **1 Malik–Price**, **15 bail/remand** | 2 homicide; 3 firearms | CTL start/expiry, remand periods, extension application and ruling; application is not an extension |
| Appeal deadlines | **17 Court of Appeal**, **18 Magistrates-to-Crown** | 16 sentencing | Decision/remarks service, deadline rule, calculation, filing, extension application and ruling |
| Bail/remand/variation | **15 application** | 1, 2, 3, 5 | Current order, proposal, objection, application and judicial determination |
| Modern slavery / NRM | **5 county lines** | 7 youth vulnerability controls | Indicators, referral consideration, referral, reasonable/conclusive-grounds decision, legal submission and judicial finding remain distinct |
| PII / closed material | **12 disclosure/PII** | 3 firearms | Sensitive status, application, open/closed material, ruling, redaction/gist and permitted audience |
| Privilege / inadvertent disclosure | **12 disclosure/PII** | 17 appeal | Privilege basis, waiver/no waiver, quarantine, notification/clawback and court determination kept separate |
| Newton hearing / basis of plea | **16 sentencing** | 4 fraud | Proposed basis, prosecution response, accepted basis, disputed facts, hearing and findings |
| Fresh evidence / appeal outcome | **17 conviction appeal** | 18 rehearing contrast | Advice/ground/filed application/admission decision/hearing/outcome and remedy remain separate |
| Rehearing on Magistrates’ appeal | **18 Magistrates-to-Crown appeal** | 14 source record | Lower-court record and Crown Court rehearing evidence/outcome remain distinct and deadline provenance is explicit |

## Allocation completeness and reporting

Before any individual design freeze is approved, its control register must state:

1. allocated controls and exact positive/negative states;
2. source document and truth-key representation;
3. mandatory audiences and any relevant mandatory counsel/expert extract;
4. view, copy, export, API and composed-prose assertions;
5. source-level scoring denominator; and
6. whether failure represents extraction, classification, evidence-state, provenance, charge, composer, gate, presentation, security or isolation logic.

Coverage reports must distinguish **not allocated**, **designed**, **generated**, **executed**, **contained**, **substantively correct**, **failed** and **not reviewable**. Allocation alone is not execution evidence.

**Stop condition:** this allocation is ready for review only. It does not approve source-document or PDF generation.
