# S3000 Public Criminal-Document Structure & Realism Reference

**Status:** UNCOMMITTED — held for Codex review. Not a PASS claim.  
**Baseline:** `308b7cb633f83d7c998bc80adf87356de346b3e9`  
**Branch / worktree:** `programme/s3000-layout-reference` @ `C:\Users\gduff\casebrain-hub-wt-s3000-layout-research`  
**Retrieval date:** 2026-08-02  

This pack is a **reference register only** for fictional test-document generation. Chat 1 owns the V2.1.2 renderer. This workstream does **not** implement or modify that renderer, app logic, frozen evidence, Brain 1/Guardian, commits, pushes, merges, or deploys.

## Deliverables

| Path | Role |
| --- | --- |
| `registry/meta.json` | Scope lock, baseline, counts |
| `registry/sources.json` | Authoritative public sources + retrieval dates |
| `registry/index.json` | Catalogue of document families |
| `registry/document-types/*.json` | Per-family structural/realism records |
| `validation/*.schema.json` | JSON Schemas |
| `validation/contracts/*.json` | Validation contracts |
| `validation/validate_registry.py` | Stdlib contract checker |
| `HUMAN_GUIDE.md` | This guide (concise) |
| `STATUS.md` | Stop / scope / review notes |

No PDFs and no case packs are included.

## Document families covered

1. MG forms and witness statements  
2. Disclosure schedules / MG6 / MG6C (+ MG6D/E, DMD)  
3. Charge sheets and indictments  
4. Custody / interview records  
5. CCTV / BWV / media logs  
6. Phone and digital-evidence schedules  
7. Medical, forensic and expert reports  
8. ABE / special-measures records  
9. Court notices, orders and appeal documents  
10. Youth justice  
11. Welsh-language, translation and interpreter material  
12. Public interest immunity (PII)  
13. Exhibits and continuity  
14. Emails, attachments and native digital evidence  

## What each document-type record contains

- Authoritative public source IDs (resolved in `sources.json`) and retrieval date  
- Structural fields and ordering  
- Page hierarchy  
- Realistic density and continuation behaviour  
- Tables / signature / identifier conventions  
- Common document relationships  
- Safe fictionalisation rules  
- Applicable charge/procedure families  
- Visual-QA requirements  
- Prohibited copying / unsupported assumptions  
- Layout confidence (high/medium/low) so generators do not over-claim pixel fidelity  

## How to use (generators / later chats)

1. Read `registry/index.json` and select a family.  
2. Load `registry/document-types/<id>.json`.  
3. Resolve sources via `registry/sources.json` before inventing fields.  
4. Obey `safe_fictionalisation_rules` and `prohibited_copying_or_unsupported_assumptions`.  
5. Treat `layout_confidence` as a hard honesty bound: guidance-backed structure ≠ scanned blank-form replica.  
6. Run `python validation/validate_registry.py` after any registry edit.  

## Authority ladder (prefer in this order)

1. legislation.gov.uk (CrimPR, statutes)  
2. Statutory codes (PACE Codes)  
3. GOV.UK / MoJ / Home Office / HMCTS official guidance and forms indexes  
4. CPS prosecution guidance / Disclosure Manual / Director’s Guidance  
5. NPCC national policing guidance (e.g. BWV)  
6. Sentencing Council public materials (youth outcomes)  

Do **not** use private case papers, force intranet templates, or protected personal data.

## Key structural anchors (by family)

- **MG / statements:** GOV.UK Manual of Guidance form purposes; NFS via Director’s Guidance 6th ed.  
- **Disclosure:** MG6C/D/E purposes + CPS Disclosure Manual ch.7–8 + AG Guidelines 2024 (incl. digital block-listing / rebuttable presumption).  
- **Charges / indictments:** MG4 family + CrimPR Part 10 (statement of offence + particulars; Practice Direction forms).  
- **Custody / interview:** PACE Code C record duties; Code E audio recording; MG15 written interview record.  
- **Media:** Digital Imaging & Multimedia Procedure; NPCC BWV guidance; CPS Exhibits continuity/authenticity.  
- **Experts:** CrimPR 19.4 content; SFR vs full report distinction; FSR declarations where applicable.  
- **ABE / SM:** MoJ ABE guidance; YJCEA measures; CrimPR Part 18 applications (not CPS-badged).  
- **Appeals / notices:** CrimPR forms index; Part 39 Form NG content rules.  
- **Youth:** MG04D/PG; referral-order public guidance; reporting-restriction banners in test packs.  
- **Welsh / interpreters:** Welsh Language Act s.22; HMCTS Welsh Language Scheme; interpreter guidance.  
- **PII:** CrimPR 15.3 written application content — **no** dedicated national form.  
- **Exhibits / native digital:** MG12 + continuity chains; AG digital scheduling rather than full mailbox dumps.  

## Honesty rules for this pack

- Public guidance describes **purpose and required content**; many exact blank-form geometries are force/DCF-local.  
- Where geometry is unpublished, records set `layout_confidence` accordingly and forbid unsupported pixel claims.  
- Sensitive/PII material in fiction must stay category-level and court-only partitioned.  
- Youth packs must use ciphers + reporting-restriction banners.  

## Out of scope (explicit)

- V2.1.2 renderer code paths  
- App / Brain 1 / Guardian changes  
- PDF generation, OCR stress lanes, or case corpora  
- Commit, push, merge, deploy, or PASS  

## Rebuild

```bash
python docs/s3000-layout-reference/_build_registry.py
python docs/s3000-layout-reference/validation/validate_registry.py
```

`_build_registry.py` is a one-shot authoring helper for this docs tree only; it is not application runtime.
