#!/usr/bin/env python3
"""One-shot builder for the S3000 public layout-reference registry.

Generates machine-readable registry JSON, validation contracts, and does not
touch renderer/app code. Safe to re-run; overwrites only files under
docs/s3000-layout-reference/.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REGISTRY = ROOT / "registry"
DOC_TYPES = REGISTRY / "document-types"
VALIDATION = ROOT / "validation"
CONTRACTS = VALIDATION / "contracts"
RETRIEVED = "2026-08-02"
BASELINE = "308b7cb633f83d7c998bc80adf87356de346b3e9"
BRANCH = "programme/s3000-layout-reference"

COMMON_FICTIONALISATION = [
    "Use wholly invented names, addresses, DOBs, phone numbers, URN/PTI numbers, exhibit marks, and force identifiers.",
    "Do not reproduce protected personal data from real cases, private case papers, or non-public force templates.",
    "Prefer clearly fictional markers (e.g. 'FX-' URNs, 'Anytown', invented force codes) while preserving structural realism.",
    "Do not copy Crown copyright form artwork/logos beyond structural field labels described in public guidance.",
    "Where exact blank-form layout is unpublished, record layout confidence as inferred_from_guidance and avoid pixel-perfect claims.",
]

COMMON_PROHIBITIONS = [
    "No private case papers, custody-system screenshots, or force intranet templates.",
    "No real victim/witness/defendant identifiers, phone numbers, IMEIs, vehicle registrations, or medical identifiers.",
    "No reproduction of protected sensitive/PII schedules containing real sensitive material.",
    "No claim that this register is a substitute for live CrimPR/Practice Direction forms.",
    "No coupling to V2.1.2 renderer implementation; this pack is reference-only.",
]


def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def source(
    sid: str,
    title: str,
    url: str,
    publisher: str,
    authority: str,
    covers: list[str],
    notes: str = "",
) -> dict:
    return {
        "id": sid,
        "title": title,
        "url": url,
        "publisher": publisher,
        "authority_class": authority,
        "retrieved_on": RETRIEVED,
        "covers_document_families": covers,
        "notes": notes,
    }


SOURCES = [
    source(
        "govuk-mog-forms-accessible",
        "Criminal casefiles – forms, standards, and file structure (accessible)",
        "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
        "Home Office / UKVI (GOV.UK)",
        "official_guidance",
        [
            "mg-forms-and-witness-statements",
            "disclosure-schedules",
            "charge-sheets-and-indictments",
            "custody-and-interview-records",
            "medical-forensic-expert-reports",
            "exhibits-and-continuity",
            "youth-justice",
            "abe-special-measures",
        ],
        "Public MG-form purpose/structure summary; version 2.0 noted on page (published for HO staff 9 June 2026).",
    ),
    source(
        "govuk-mog-forms-pdf",
        "Criminal casefiles – forms, standards, and file structure (PDF)",
        "https://assets.publishing.service.gov.uk/media/6a31102ad95ffddb05d4b0f1/Criminal_casefiles_-_forms__standards__and_file_structure__1_.pdf",
        "Home Office (GOV.UK assets)",
        "official_guidance",
        ["mg-forms-and-witness-statements", "disclosure-schedules", "charge-sheets-and-indictments"],
    ),
    source(
        "cps-disclosure-ch7",
        "Disclosure Manual: Chapter 7 – The Non-Sensitive Material Schedule",
        "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-7-non-sensitive-material-schedule",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["disclosure-schedules", "phone-digital-evidence-schedules", "cctv-bwv-media-logs"],
    ),
    source(
        "cps-disclosure-ch8",
        "Disclosure Manual: Chapter 8 – The Sensitive Material Schedule",
        "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-8-sensitive-material-schedule",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["disclosure-schedules", "public-interest-immunity"],
    ),
    source(
        "ago-disclosure-2024",
        "Attorney General’s Guidelines on Disclosure 2024",
        "https://www.gov.uk/government/publications/attorney-generals-guidelines-on-disclosure",
        "Attorney General’s Office",
        "official_guidance",
        ["disclosure-schedules", "phone-digital-evidence-schedules", "emails-attachments-native-digital", "cctv-bwv-media-logs"],
        "Effective from 29 May 2024; digital-material annex integrated.",
    ),
    source(
        "ago-disclosure-2024-pdf",
        "Attorney General’s Guidelines on Disclosure 2024 (PDF)",
        "https://assets.publishing.service.gov.uk/media/65e1ab9d2f2b3b00117cd803/Attorney_General_s_Guidelines_on_Disclosure_-_2024.pdf",
        "Attorney General’s Office",
        "official_guidance",
        ["disclosure-schedules", "phone-digital-evidence-schedules"],
    ),
    source(
        "crimpr-2025-part10",
        "Criminal Procedure Rules 2025 – Part 10 The Indictment",
        "https://www.legislation.gov.uk/uksi/2025/909/part/10/made",
        "legislation.gov.uk",
        "primary_secondary_legislation",
        ["charge-sheets-and-indictments"],
    ),
    source(
        "cps-drafting-indictment",
        "Drafting the Indictment",
        "https://www.cps.gov.uk/legal-guidance/drafting-indictment",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["charge-sheets-and-indictments"],
    ),
    source(
        "pace-code-c-2023",
        "PACE Code C 2023",
        "https://www.gov.uk/government/publications/pace-code-c-2023",
        "Home Office",
        "statutory_code",
        ["custody-and-interview-records"],
    ),
    source(
        "pace-code-e-2018",
        "PACE Code E 2018 (accessible)",
        "https://www.gov.uk/government/publications/pace-codes-e-and-f-2018/pace-code-e-2018-accessible",
        "Home Office",
        "statutory_code",
        ["custody-and-interview-records"],
    ),
    source(
        "pace-codes-index",
        "PACE codes of practice (A–H index)",
        "https://www.gov.uk/guidance/police-and-criminal-evidence-act-1984-pace-codes-of-practice",
        "Home Office",
        "official_guidance",
        ["custody-and-interview-records"],
    ),
    source(
        "digital-imaging-v3",
        "Digital Imaging and Multimedia Procedure v3.0",
        "https://www.gov.uk/government/publications/digital-investigations-digital-imaging-and-multimedia-procedure/digital-imaging-and-multimedia-procedure-v30",
        "Home Office / FCN (GOV.UK)",
        "official_guidance",
        ["cctv-bwv-media-logs", "exhibits-and-continuity", "emails-attachments-native-digital"],
    ),
    source(
        "npcc-bwv-2024",
        "NPCC Body Worn Video Guidance 2024 (v3)",
        "https://www.npcc.police.uk/SysSiteAssets/media/downloads/publications/publications-log/local-policing-coordination-committee/2024/npcc-bwv-guidance-2024.pdf",
        "National Police Chiefs’ Council",
        "national_policing_guidance",
        ["cctv-bwv-media-logs", "disclosure-schedules"],
    ),
    source(
        "cps-exhibits",
        "Exhibits (CPS legal guidance)",
        "https://www.cps.gov.uk/legal-guidance/exhibits",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["exhibits-and-continuity", "cctv-bwv-media-logs"],
    ),
    source(
        "crimpr-2025-part19",
        "Criminal Procedure Rules 2025 – rule 19.4 Content of expert’s report",
        "https://www.legislation.gov.uk/uksi/2025/909/rule/19.4/made",
        "legislation.gov.uk",
        "primary_secondary_legislation",
        ["medical-forensic-expert-reports"],
    ),
    source(
        "cps-expert-evidence",
        "Expert Evidence (CPS)",
        "https://www.cps.gov.uk/prosecution-guidance/expert-evidence",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["medical-forensic-expert-reports"],
    ),
    source(
        "cps-fsr-code",
        "Forensic Science Regulator Act 2021 and FSR Code of Practice 2023 (CPS)",
        "https://www.cps.gov.uk/prosecution-guidance/forensic-science-regulator-act-2021-and-forensic-science-regulators-code",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["medical-forensic-expert-reports", "exhibits-and-continuity"],
    ),
    source(
        "abe-2023",
        "Achieving best evidence in criminal proceedings",
        "https://www.gov.uk/government/publications/achieving-best-evidence-in-criminal-proceedings",
        "Ministry of Justice",
        "official_guidance",
        ["abe-special-measures"],
    ),
    source(
        "cps-special-measures",
        "Special Measures (CPS)",
        "https://www.cps.gov.uk/prosecution-guidance/special-measures",
        "Crown Prosecution Service",
        "prosecution_guidance",
        ["abe-special-measures", "mg-forms-and-witness-statements"],
    ),
    source(
        "crimpr-forms",
        "Criminal Procedure Rules: Forms",
        "https://www.gov.uk/guidance/criminal-procedure-rules-forms",
        "Ministry of Justice / HMCTS",
        "official_forms_index",
        ["court-notices-orders-appeals", "abe-special-measures", "public-interest-immunity", "charge-sheets-and-indictments"],
    ),
    source(
        "crimpr-2025-part39",
        "Criminal Procedure Rules 2025 – rule 39.3 Form of appeal notice",
        "https://www.legislation.gov.uk/uksi/2025/909/rule/39.3/made",
        "legislation.gov.uk",
        "primary_secondary_legislation",
        ["court-notices-orders-appeals"],
    ),
    source(
        "crimpr-2025-part15",
        "Criminal Procedure Rules 2025 – Part 15 Disclosure",
        "https://www.legislation.gov.uk/uksi/2025/909/part/15/made",
        "legislation.gov.uk",
        "primary_secondary_legislation",
        ["public-interest-immunity", "disclosure-schedules"],
    ),
    source(
        "welsh-language-act-s22",
        "Welsh Language Act 1993 s.22 Use of Welsh in legal proceedings",
        "https://www.legislation.gov.uk/ukpga/1993/38/section/22",
        "legislation.gov.uk",
        "primary_secondary_legislation",
        ["welsh-language-translation-interpreter"],
    ),
    source(
        "hmcts-welsh-scheme",
        "HMCTS Welsh Language Scheme 2023–26",
        "https://assets.publishing.service.gov.uk/media/63ff195bd3bf7f557532ce6c/HMCTS_Welsh_Language_Scheme_2023_-26.pdf",
        "HM Courts & Tribunals Service",
        "official_scheme",
        ["welsh-language-translation-interpreter", "court-notices-orders-appeals"],
    ),
    source(
        "govuk-interpreters",
        "Criminal investigations: use of interpreters (accessible)",
        "https://www.gov.uk/government/publications/criminal-investigations-use-of-interpreters/criminal-investigations-use-of-interpreters-accessible",
        "Home Office / UKVI (GOV.UK)",
        "official_guidance",
        ["welsh-language-translation-interpreter", "custody-and-interview-records"],
    ),
    source(
        "yjb-referral-order",
        "Referral Order Guidance (MoJ/YJB PDF)",
        "https://assets.publishing.service.gov.uk/media/5bbb2aabed915d23b049e137/referral-order-guidance-9-october-2018.pdf",
        "Ministry of Justice / Youth Justice Board",
        "official_guidance",
        ["youth-justice"],
    ),
    source(
        "sentencing-council-referral",
        "Sentencing Council – Referral order pronouncement builder",
        "https://www.sentencingcouncil.org.uk/pronouncement-builder/referral-order/",
        "Sentencing Council",
        "sentencing_guidance",
        ["youth-justice"],
    ),
    source(
        "directors-guidance-charging-6",
        "Charging (The Director’s Guidance) – sixth edition (National File Standard)",
        "https://www.cps.gov.uk/legal-guidance/charging-directors-guidance-sixth-edition-december-2020-incorporating-national-file",
        "Crown Prosecution Service / DPP",
        "prosecution_guidance",
        ["mg-forms-and-witness-statements", "charge-sheets-and-indictments", "disclosure-schedules"],
        "National File Standard annexes define which MG forms belong in GAP/NGAP/Crown Court file builds.",
    ),
]


def field(name: str, order: int, required: bool, notes: str, dtype: str = "string") -> dict:
    return {
        "name": name,
        "order": order,
        "required": required,
        "data_type": dtype,
        "notes": notes,
    }


def doc_type(
    id_: str,
    title: str,
    aliases: list[str],
    sources: list[str],
    fields: list[dict],
    page_hierarchy: list[dict],
    density: dict,
    conventions: dict,
    relationships: list[dict],
    fictionalisation: list[str],
    charge_families: list[str],
    visual_qa: list[str],
    prohibitions: list[str],
    layout_confidence: str,
    subtypes: list[dict] | None = None,
    notes: str = "",
) -> dict:
    return {
        "id": id_,
        "title": title,
        "aliases": aliases,
        "jurisdiction": "England and Wales",
        "purpose": "Structural and realism reference for fictional test-document generation only.",
        "authoritative_sources": sources,
        "retrieval_date": RETRIEVED,
        "layout_confidence": layout_confidence,
        "structural_fields": fields,
        "page_hierarchy": page_hierarchy,
        "realistic_density_and_continuation": density,
        "tables_signatures_identifiers": conventions,
        "common_document_relationships": relationships,
        "safe_fictionalisation_rules": COMMON_FICTIONALISATION + fictionalisation,
        "applicable_charge_procedure_families": charge_families,
        "visual_qa_requirements": visual_qa,
        "prohibited_copying_or_unsupported_assumptions": COMMON_PROHIBITIONS + prohibitions,
        "subtypes": subtypes or [],
        "notes": notes,
    }


DOCUMENT_TYPES = [
    doc_type(
        id_="mg-forms-and-witness-statements",
        title="MG forms and witness statements",
        aliases=["MG11", "MG11M", "MG11 Cont", "MG02", "MG03", "MG05", "MG09", "MG10", "Manual of Guidance"],
        sources=["govuk-mog-forms-accessible", "govuk-mog-forms-pdf", "directors-guidance-charging-6", "cps-special-measures"],
        fields=[
            field("form_reference", 1, True, "MG code e.g. MG11 / MG11M / MG11 Cont"),
            field("protective_marking", 2, True, "GSCP marking: Official / Official-Sensitive etc."),
            field("pti_urn", 3, True, "Pre-trial information unique reference number for the investigation"),
            field("defendant_or_suspect_name", 4, False, "Often present on case-linked forms; may be anonymised on some witness copies"),
            field("witness_name", 5, True, "For MG11 family"),
            field("witness_dob_or_age", 6, False, "Age-sensitive; fictionalise carefully"),
            field("occupation_or_status", 7, False, "Common on statements"),
            field("statement_body", 8, True, "Narrative evidence; may span continuation sheets"),
            field("page_of_pages", 9, True, "Pagination on multi-page statements"),
            field("declaration_of_truth", 10, True, "Statutory/declaration wording block before signature"),
            field("signature_and_date", 11, True, "Witness signature/date; officer countersign where applicable"),
            field("consent_medical_records", 12, False, "MG11 records consent for medical records use"),
            field("willingness_to_attend_court", 13, False, "MG11 tick/field"),
            field("special_measures_need", 14, False, "Flag; detail often on MG02"),
            field("officer_details", 15, True, "Taking officer name/number/station"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "form_header", "contains": ["form_reference", "protective_marking", "pti_urn"]},
            {"level": 2, "name": "party_and_witness_block", "contains": ["witness_name", "witness_dob_or_age", "occupation_or_status"]},
            {"level": 3, "name": "statement_narrative", "contains": ["statement_body"], "continues_on": "MG11 Cont / MG11M Cont"},
            {"level": 4, "name": "footer_declarations", "contains": ["declaration_of_truth", "signature_and_date", "consent_medical_records", "willingness_to_attend_court", "special_measures_need"]},
            {"level": 5, "name": "admin_footer", "contains": ["officer_details", "page_of_pages"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 12, "mode": 2},
            "continuation_behaviour": "Blank typed continuation sheets (electronic MG11) or lined handwritten MG11M Cont; page-of-pages consecutive; declaration typically on final page.",
            "whitespace_pattern": "Header dense; narrative mid-density paragraphs or lined manuscript; signature block near foot of final page.",
            "overflow_rules": "Do not squeeze declaration onto cramped last lines; spill narrative to Cont page before signatures.",
        },
        conventions={
            "tables": "Usually not tabular for MG11; MG09/MG10 use row-per-witness tables.",
            "signatures": "Wet-ink or electronic signature zone; date adjacent; officer endorsement separate.",
            "identifiers": "PTI URN prominent; exhibit marks referenced in narrative as 'I produce exhibit AB/1'.",
            "chequered_banding": "Some MG forms use chequered banding to denote non-disclosable content (e.g. MG6 family sensitive variants).",
        },
        relationships=[
            {"to": "abe-special-measures", "relation": "MG02 feeds special-measures application; ABE video may accompany MG11/MG15"},
            {"to": "exhibits-and-continuity", "relation": "MG11 produces exhibits listed on MG12"},
            {"to": "disclosure-schedules", "relation": "Unused drafts/notes may appear on MG6C/MG6D"},
            {"to": "custody-and-interview-records", "relation": "MG15 interview record pairs with audio/visual interview for suspects/ABE"},
        ],
        fictionalisation=[
            "Invent witness narrative consistent with charged facts; avoid copying published case-study wording from training packs.",
            "Keep special-measures flags structurally present without fabricating clinical diagnoses.",
        ],
        charge_families=[
            "summary_only",
            "either_way",
            "indictable_only",
            "sexual_offences_YJCEA",
            "violence",
            "dishonesty",
            "drugs",
            "road_traffic",
            "youth_court",
        ],
        visual_qa=[
            "Form code and URN visible in header region on every page.",
            "Continuation pages show Cont designation and consecutive page numbering.",
            "Declaration/signature not orphaned mid-page without preceding narrative close.",
            "Protective marking present; chequered banding only on forms that public guidance marks non-disclosable.",
            "No real crest artwork required; placeholder header label acceptable if noted.",
        ],
        prohibitions=[
            "Do not treat commercial MG blank downloads as authoritative unless they match public GOV.UK purpose descriptions.",
            "Do not invent compulsory fields beyond those evidenced in public MG purpose summaries and NFS annex references.",
        ],
        layout_confidence="high_for_purpose_fields; medium_for_pixel_layout",
        subtypes=[
            {"id": "MG02", "title": "Special Measures Assessment"},
            {"id": "MG03", "title": "Pre Charge Decision Request"},
            {"id": "MG03A", "title": "Further Report to CPS for Charging Decision"},
            {"id": "MG05", "title": "Offence Report / Police Report"},
            {"id": "MG09", "title": "Witness List"},
            {"id": "MG10", "title": "Witness Non-Availability"},
            {"id": "MG11", "title": "Witness Statement (electronic/typed)"},
            {"id": "MG11M", "title": "Witness Statement (manuscript)"},
            {"id": "MG11_Cont", "title": "Witness Statement continuation"},
        ],
        notes="National File Standard (Director’s Guidance 6th ed.) determines which MG forms appear in GAP/NGAP/Crown Court builds. Digital Case File rollout may later absorb MG forms; interim register retains MG structure.",
    ),
    doc_type(
        id_="disclosure-schedules",
        title="Disclosure schedules / MG6 / MG6C",
        aliases=["MG6", "MG6C", "MG6D", "MG6E", "MG06C", "unused material schedule", "sensitive schedule", "disclosure officer report"],
        sources=["govuk-mog-forms-accessible", "cps-disclosure-ch7", "cps-disclosure-ch8", "ago-disclosure-2024", "ago-disclosure-2024-pdf", "directors-guidance-charging-6"],
        fields=[
            field("form_reference", 1, True, "MG6 / MG6C / MG6D / MG6E"),
            field("pti_urn", 2, True, "Case URN"),
            field("disclosure_officer_name", 3, True, "Completing officer"),
            field("schedule_version_or_date", 4, True, "Submission date; later additional schedules continue numbering"),
            field("item_number", 5, True, "Consecutive across continuation/additional schedules", "integer"),
            field("description_of_item", 6, True, "Meaningful description; not bare form numbers; avoid unexplained acronyms"),
            field("location_of_item", 7, True, "Where material is held"),
            field("sensitivity_reason", 8, False, "MG6D only – reason for sensitivity belief"),
            field("prosecutor_decision", 9, False, "Disclose / inspect / not disclose; or agree sensitivity / PII needed"),
            field("undermines_or_assists_flag", 10, False, "MG6E revelation against disclosure test"),
            field("certification", 11, True, "Disclosure officer certification on MG6E"),
            field("rebuttable_presumption_category", 12, False, "AG Guidelines / CPIA Code categories where applicable"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "schedule_header", "contains": ["form_reference", "pti_urn", "disclosure_officer_name", "schedule_version_or_date"]},
            {"level": 2, "name": "item_table", "contains": ["item_number", "description_of_item", "location_of_item", "sensitivity_reason", "prosecutor_decision"]},
            {"level": 3, "name": "officer_report_block", "contains": ["undermines_or_assists_flag", "certification"], "applies_to": ["MG6E"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 40, "mode": 3},
            "continuation_behaviour": "Continuation sheets or later additional schedules; item numbers must remain consecutive to earlier schedules; additional MG6E accompanies later schedules.",
            "whitespace_pattern": "Dense tabular rows; description column widest; decisions column narrow.",
            "overflow_rules": "Long descriptions wrap within cell or spill to next row with same item number only if schedule convention allows; prefer complete row then next item.",
        },
        conventions={
            "tables": "Core artefact is a numbered table: Item | Description | Location | (Sensitivity reason) | Prosecutor decision.",
            "signatures": "Disclosure officer signature/certification; prosecutor endorsements on decision columns.",
            "identifiers": "Item numbers unique and consecutive; cross-refs to exhibit marks / digital media IDs.",
            "chequered_banding": "Sensitive schedule (MG6D) is not disclosed to defence; chequered/non-disclosable marking common.",
        },
        relationships=[
            {"to": "phone-digital-evidence-schedules", "relation": "Digital blocks/metadata often scheduled on MG6C with DMD strategy"},
            {"to": "cctv-bwv-media-logs", "relation": "Unused BWV/CCTV listed; rebuttable presumption categories apply"},
            {"to": "public-interest-immunity", "relation": "MG6D sensitivity may lead to CrimPR 15.3 PII application"},
            {"to": "emails-attachments-native-digital", "relation": "Email corpuses block-listed with search-term methodology"},
        ],
        fictionalisation=[
            "Invent unused-item descriptions that are plausible but non-identifying.",
            "Include some rebuttable-presumption class items (crime report, interview records, CCTV) with adequate descriptions.",
            "For MG6D, invent sensitivity reasons at category level only (e.g. 'informant identity') without real operational detail.",
        ],
        charge_families=[
            "either_way_ngap",
            "indictable_only",
            "crown_court_trial",
            "summary_ng_plea",
            "digital_heavy_fraud_or_comms",
            "sexual_offences",
            "organised_crime",
        ],
        visual_qa=[
            "Consecutive item numbering with no gaps after continuations.",
            "Description column contains enough detail for a prosecutor decision (not 'CCTV' alone).",
            "MG6C vs MG6D clearly labelled; sensitive reasons only on MG6D.",
            "Prosecutor decision column present even if blank pending endorsement in fictional packs.",
            "MG6E certification block present when pack claims disclosure officer report included.",
        ],
        prohibitions=[
            "Do not copy real unused schedules from cases.",
            "Do not place sensitive material descriptions on a defence-facing MG6C.",
            "Do not assume GAP guilty-plea files always contain full MG6C (CPIA scheduling triggers differ).",
        ],
        layout_confidence="high_for_scheduling_rules; medium_for_exact_column_geometry",
        subtypes=[
            {"id": "MG6", "title": "Case File Information (background, including non-disclosable notes)"},
            {"id": "MG6C", "title": "Schedule of Relevant Non-Sensitive Unused Material"},
            {"id": "MG6D", "title": "Schedule of Relevant Sensitive Unused Material"},
            {"id": "MG6E", "title": "Disclosure Officer’s Report"},
            {"id": "DMD", "title": "Disclosure Management Document (digital strategy companion)"},
        ],
    ),
    doc_type(
        id_="charge-sheets-and-indictments",
        title="Charge sheets and indictments",
        aliases=["MG4", "MG04", "MG04D", "MG04E", "indictment", "draft indictment", "written charge", "count"],
        sources=["govuk-mog-forms-accessible", "crimpr-2025-part10", "cps-drafting-indictment", "crimpr-forms", "directors-guidance-charging-6"],
        fields=[
            field("document_class", 1, True, "police_charge_sheet | written_charge | draft_indictment | indictment"),
            field("court_or_station", 2, True, "Charging station or Crown Court name"),
            field("pti_urn_or_case_number", 3, True, "URN / T number as applicable"),
            field("defendant_name", 4, True, "Order of defendants matters on multi-accused indictments"),
            field("defendant_dob_or_age", 5, False, "Especially youth / age-element offences"),
            field("charge_or_count_number", 6, True, "Consecutive counts on indictment"),
            field("statement_of_offence", 7, True, "Ordinary language + creating legislation"),
            field("particulars_of_offence", 8, True, "Sufficient particulars of alleged conduct"),
            field("reply_after_charge", 9, False, "MG4 custody charge reply"),
            field("bail_endorsement", 10, False, "Unconditional/conditional bail after charge"),
            field("first_hearing_details", 11, False, "Written charge forms MG04D/E"),
            field("preferment_or_date_header", 12, False, "Indictment head date / preferment statement per CrimPR 10.2(6)"),
            field("prosecutor_signature_or_endorsement", 13, False, "Where form/practice requires"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "document_head", "contains": ["document_class", "court_or_station", "pti_urn_or_case_number", "preferment_or_date_header"]},
            {"level": 2, "name": "defendant_block", "contains": ["defendant_name", "defendant_dob_or_age"]},
            {"level": 3, "name": "counts", "contains": ["charge_or_count_number", "statement_of_offence", "particulars_of_offence"], "repeats": True},
            {"level": 4, "name": "post_charge_admin", "contains": ["reply_after_charge", "bail_endorsement", "first_hearing_details", "prosecutor_signature_or_endorsement"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 8, "mode": 1},
            "continuation_behaviour": "Additional counts continue on following pages; each count remains a self-contained numbered paragraph pair (statement + particulars).",
            "whitespace_pattern": "Formal sparse layout; generous spacing between counts; headers compact.",
            "overflow_rules": "Never split statement_of_offence from its particulars across a confusing break; keep pair together.",
        },
        conventions={
            "tables": "Rare; counts are numbered prose blocks, not grid tables.",
            "signatures": "Custody sergeant on MG4; indictment endorsements per CrimPR/court officer practice.",
            "identifiers": "Count numbers consecutive; statute citations in statement of offence.",
            "forms_note": "Indictment must follow Practice Direction forms unless exception applies (CrimPR 10.2(6)).",
        },
        relationships=[
            {"to": "mg-forms-and-witness-statements", "relation": "Charges grounded in MG5/MG11 evidence package"},
            {"to": "youth-justice", "relation": "MG04D / MG04D PG for youth written charges"},
            {"to": "court-notices-orders-appeals", "relation": "Sending/committal notices and later appeal against conviction on indictment"},
            {"to": "custody-and-interview-records", "relation": "Charge recorded after detention/interview pathway"},
        ],
        fictionalisation=[
            "Use correct offence-creating statute names publicly known; do not invent fake Acts.",
            "Particulars must be factually complete enough to read as a real count, using fictional people/places.",
            "Multi-count joinder must remain legally plausible (same defendant/facts family).",
        ],
        charge_families=[
            "summary_charge",
            "either_way",
            "indictable_only",
            "section_40_CJA_1988_joined_summary",
            "youth_written_charge",
            "postal_written_charge",
            "multi_handed_conspiracy",
        ],
        visual_qa=[
            "Each count shows both statement_of_offence and particulars_of_offence.",
            "Count numbering consecutive starting at 1.",
            "Indictment head contains date / preferment-style statement fields when document_class is indictment.",
            "MG4 shows reply-after-charge and bail fields when modelling custody charge.",
            "No CPS logo on Practice Direction indictment forms.",
        ],
        prohibitions=[
            "Do not invent indictment form geometry that contradicts CrimPR Part 10 requirements.",
            "Do not mix police MG4 charge-sheet layout with Crown Court indictment layout in one artefact without labelling document_class.",
        ],
        layout_confidence="high_for_legal_structure; medium_for_MG4_pixel_layout",
        subtypes=[
            {"id": "MG04", "title": "Charge Sheet (custody sergeant)"},
            {"id": "MG04A", "title": "Bail – Grant or Variation"},
            {"id": "MG04D", "title": "Written Charges – Youth"},
            {"id": "MG04E", "title": "Written Charges – Adult"},
            {"id": "INDictment", "title": "Indictment / draft indictment (CrimPR Part 10)"},
        ],
    ),
    doc_type(
        id_="custody-and-interview-records",
        title="Custody / interview records",
        aliases=["custody record", "PACE Code C", "MG15", "interview record", "Code E", "Code F"],
        sources=["pace-code-c-2023", "pace-code-e-2018", "pace-codes-index", "govuk-mog-forms-accessible", "govuk-interpreters"],
        fields=[
            field("custody_record_number", 1, True, "Station custody ID"),
            field("detainee_name", 2, True, "As booked into custody"),
            field("arrival_time", 3, True, "Detention clock start events per Code C"),
            field("grounds_for_detention", 4, True, "Arrest/detention reasons"),
            field("rights_given", 5, True, "Rights/entitlements explained and timing"),
            field("appropriate_adult", 6, False, "Youth/vulnerable detainee"),
            field("solicitor_attendance", 7, False, "Requested/attended/declined"),
            field("reviews_of_detention", 8, False, "Timed review decisions", "array"),
            field("property_log", 9, False, "Property seized/retained"),
            field("medical_risk_entries", 10, False, "Healthcare/risk assessments"),
            field("interview_recording_medium", 11, False, "Audio (Code E) / visual (Code F) / written fallback"),
            field("interview_start_end", 12, False, "Times; breaks"),
            field("caution_and_reminders", 13, False, "Caution administration recorded"),
            field("mg15_transcript_or_record", 14, False, "Written record of interview body"),
            field("release_or_charge_time", 15, True, "Exit from detention / charge / bail"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "booking_header", "contains": ["custody_record_number", "detainee_name", "arrival_time", "grounds_for_detention"]},
            {"level": 2, "name": "rights_and_welfare", "contains": ["rights_given", "appropriate_adult", "solicitor_attendance", "medical_risk_entries"]},
            {"level": 3, "name": "timed_event_log", "contains": ["reviews_of_detention", "property_log"], "style": "chronological_entries"},
            {"level": 4, "name": "interview_pack", "contains": ["interview_recording_medium", "interview_start_end", "caution_and_reminders", "mg15_transcript_or_record"]},
            {"level": 5, "name": "disposal", "contains": ["release_or_charge_time"]},
        ],
        density={
            "typical_pages": {"min": 2, "max": 60, "mode": 8},
            "continuation_behaviour": "Custody record is a chronological log; MG15 Cont / MG15M Cont for long interviews; time-stamped speakers.",
            "whitespace_pattern": "Log lines dense; interview transcript medium density with speaker labels and timestamps.",
            "overflow_rules": "New review/event on new line; do not rewrite earlier times; append-only feel.",
        },
        conventions={
            "tables": "Event log often rendered as Time | Event | Officer columns.",
            "signatures": "Custody officer accountability entries; detainee signatures for rights/property where modelled.",
            "identifiers": "Custody number + URN linkage; recording unique IDs for media.",
            "recording_rule": "If authorised device available, Code E requires audio recording; written record only on specified fallback.",
        },
        relationships=[
            {"to": "charge-sheets-and-indictments", "relation": "Charge/bail recorded at end of custody episode"},
            {"to": "mg-forms-and-witness-statements", "relation": "MG15 accompanies recorded interviews; MG6A pre-interview briefing"},
            {"to": "welsh-language-translation-interpreter", "relation": "Interpreter attendance for interview/court"},
            {"to": "disclosure-schedules", "relation": "Interview records often rebuttable-presumption material"},
        ],
        fictionalisation=[
            "Use realistic detention durations and review intervals without copying real custody-system UI.",
            "Interview speech should be fictional; include caution and break markers for realism.",
            "Mark appropriate adult clearly for under-18s.",
        ],
        charge_families=[
            "any_arrest_detention_pathway",
            "voluntary_interview",
            "youth_detention",
            "vulnerable_adult",
            "post_charge_interview_rare",
        ],
        visual_qa=[
            "Chronological times consistent (no later event before earlier).",
            "Rights entry appears early in record.",
            "Interview record references recording medium ID.",
            "MG15 pages numbered; speaker labels consistent.",
            "Youth packs show appropriate adult fields populated.",
        ],
        prohibitions=[
            "Do not reproduce real custody IT screens or force-specific proprietary printouts as if national forms.",
            "Do not claim Code F visual recording is mandatory in all cases.",
        ],
        layout_confidence="high_for_required_record_content; low_for_force_print_layout",
        subtypes=[
            {"id": "custody_record", "title": "PACE Code C custody record"},
            {"id": "MG15", "title": "Interview Record (typed)"},
            {"id": "MG15M", "title": "Interview Record (manuscript)"},
            {"id": "MG6A", "title": "Interview Briefing to solicitor"},
        ],
    ),
    doc_type(
        id_="cctv-bwv-media-logs",
        title="CCTV / BWV / media logs",
        aliases=["BWV", "body worn video", "CCTV viewing log", "multimedia exhibit log", "DIMP"],
        sources=["digital-imaging-v3", "npcc-bwv-2024", "cps-exhibits", "ago-disclosure-2024", "cps-disclosure-ch7"],
        fields=[
            field("media_type", 1, True, "BWV | CCTV | 999_audio | dashcam | other_video"),
            field("master_copy_id", 2, True, "Unedited master / bit-for-bit identifier"),
            field("working_copy_id", 3, False, "Working/evidential clip ID"),
            field("capture_device_or_camera", 4, True, "Camera/officer BWV unit reference (fictional)"),
            field("capture_start_end", 5, True, "Recording times"),
            field("location_description", 6, True, "Scene/location"),
            field("hash_or_integrity_value", 7, False, "Where force practice records integrity metadata"),
            field("audit_trail_entries", 8, True, "View/copy/export events", "array"),
            field("exhibit_mark", 9, False, "If used as evidence"),
            field("unused_schedule_ref", 10, False, "MG6C/MG6D item number if unused"),
            field("editing_redaction_notes", 11, False, "Pixelation/PII edit notes before CPS supply"),
            field("disclosure_classification", 12, True, "evidential | unused_relevant | unused_irrelevant | sensitive"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "media_identity", "contains": ["media_type", "master_copy_id", "working_copy_id", "capture_device_or_camera"]},
            {"level": 2, "name": "capture_context", "contains": ["capture_start_end", "location_description", "exhibit_mark"]},
            {"level": 3, "name": "integrity_and_audit", "contains": ["hash_or_integrity_value", "audit_trail_entries"]},
            {"level": 4, "name": "disclosure_handling", "contains": ["unused_schedule_ref", "editing_redaction_notes", "disclosure_classification"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 25, "mode": 3},
            "continuation_behaviour": "Audit trail appends chronologically; clip lists tabular with one row per clip/segment.",
            "whitespace_pattern": "Log/table dense; narrative viewing notes medium.",
            "overflow_rules": "New export/view event as new audit row; clip list continues with stable master ID in header.",
        },
        conventions={
            "tables": "Clip# | Start | End | Description | Exhibit/Unused ref | Sensitivity.",
            "signatures": "Officer producing exhibit statement; system audit may be unsigned machine log.",
            "identifiers": "Master vs working copy distinction mandatory for realism; exhibit marks map to MG12.",
        },
        relationships=[
            {"to": "exhibits-and-continuity", "relation": "Evidential media produced as exhibits with continuity"},
            {"to": "disclosure-schedules", "relation": "Unused footage scheduled; RP categories for incident imagery"},
            {"to": "mg-forms-and-witness-statements", "relation": "Officer statement produces media exhibit"},
            {"to": "emails-attachments-native-digital", "relation": "Secure links / DEMS references in file build"},
        ],
        fictionalisation=[
            "Invent camera IDs and hashes; never use real BWV platform URLs with live tokens.",
            "Redaction notes should refer to fictional third-party faces/VRMs.",
            "When modelling unused multi-camera overlap, schedule clearly and avoid implying all angles disclosed.",
        ],
        charge_families=[
            "public_order",
            "violence_in_public",
            "theft_shoplifting",
            "police_contact_incidents",
            "road_traffic",
            "any_street_arrest",
        ],
        visual_qa=[
            "Master and working copy IDs distinct when both present.",
            "Audit trail times monotonic.",
            "Exhibit mark present iff disclosure_classification is evidential.",
            "Unused items show schedule cross-reference.",
            "No unredacted real PII in viewing stills (reference packs should use placeholders only).",
        ],
        prohibitions=[
            "Do not embed real CCTV stills of identifiable members of the public.",
            "Do not assume a single national BWV printout template exists.",
        ],
        layout_confidence="high_for_integrity_concepts; low_for_force_DEMS_screens",
    ),
    doc_type(
        id_="phone-digital-evidence-schedules",
        title="Phone and digital-evidence schedules",
        aliases=["phone download schedule", "digital material schedule", "handset exhibit schedule", "DMD digital"],
        sources=["ago-disclosure-2024", "ago-disclosure-2024-pdf", "cps-disclosure-ch7", "digital-imaging-v3", "govuk-mog-forms-accessible"],
        fields=[
            field("device_exhibit_mark", 1, True, "Handset/laptop exhibit ID"),
            field("device_type", 2, True, "phone | tablet | computer | sim | storage_media"),
            field("seizure_time_place", 3, True, "When/where seized"),
            field("extraction_method", 4, False, "Logical/physical/cloud – high level only"),
            field("download_id_or_ufdr_ref", 5, False, "Fictional extraction package ID"),
            field("block_listing_title", 6, True, "AG digital strategy block title + quantity"),
            field("block_summary", 7, True, "High-level contents summary"),
            field("search_terms_or_filters", 8, False, "Recorded in DMD"),
            field("metadata_subvolume_ref", 9, False, "Separate metadata listing sub-volume"),
            field("itemised_responsive_hits", 10, False, "Disclosable/undermining items broken out of blocks", "array"),
            field("schedule_cross_ref", 11, True, "MG6C/MG6D item numbers"),
            field("integrity_hash", 12, False, "Container hash if modelled"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "device_header", "contains": ["device_exhibit_mark", "device_type", "seizure_time_place", "extraction_method", "download_id_or_ufdr_ref"]},
            {"level": 2, "name": "strategy_blocks", "contains": ["block_listing_title", "block_summary", "search_terms_or_filters", "metadata_subvolume_ref"]},
            {"level": 3, "name": "responsive_items", "contains": ["itemised_responsive_hits", "schedule_cross_ref", "integrity_hash"]},
        ],
        density={
            "typical_pages": {"min": 2, "max": 80, "mode": 6},
            "continuation_behaviour": "Block schedules first; break out disclosable hits with cross-refs; metadata annex as sub-volume continuation.",
            "whitespace_pattern": "Block tables dense; DMD narrative medium; hit lists tabular.",
            "overflow_rules": "Do not dump entire chat histories into MG6C descriptions; summarise blocks and itemise only responsive material.",
        },
        conventions={
            "tables": "Block | Qty | Summary | Method | Schedule ref; Hits table: Hit# | App/Thread | Timestamp | Summary | Disclosure decision.",
            "signatures": "Disclosure officer / digital investigator endorsement; expert SFR if analysis opinions offered.",
            "identifiers": "Exhibit mark stable across extraction reports, schedules, and statements.",
        },
        relationships=[
            {"to": "disclosure-schedules", "relation": "Primary scheduling home for unused digital material"},
            {"to": "exhibits-and-continuity", "relation": "Device continuity from seizure to extraction"},
            {"to": "medical-forensic-expert-reports", "relation": "Digital forensics SFR/expert reports"},
            {"to": "emails-attachments-native-digital", "relation": "Overlapping native mail/message corpora"},
        ],
        fictionalisation=[
            "Invent IMEI/phone numbers; never use real subscriber data.",
            "Chat snippets must be fictional and minimal; prefer summaries over full dumps.",
            "Record search-term methodology at strategy level without implying secret police tools.",
        ],
        charge_families=[
            "drugs_supply_comms",
            "fraud_cyber",
            "sexual_offences_device_extraction",
            "harassment_comms",
            "organised_crime",
            "theft_of_phone",
        ],
        visual_qa=[
            "Device exhibit mark consistent across pages.",
            "Block listings include quantity and summary.",
            "Responsive hits cross-refer schedule item numbers.",
            "DMD/search methodology present in digital-heavy packs.",
            "No real contact-list dumps.",
        ],
        prohibitions=[
            "Do not paste real phone extractions or Cellebrite/UFED report fragments from live cases.",
            "Do not claim unsupported exact UI of proprietary forensic tools.",
        ],
        layout_confidence="high_for_AG_block_listing_rules; low_for_tool_report_chrome",
    ),
    doc_type(
        id_="medical-forensic-expert-reports",
        title="Medical, forensic and expert reports",
        aliases=["SFR", "MG21", "MG22", "CrimPR 19.4", "streamlined forensic report", "FME report", "expert report"],
        sources=["govuk-mog-forms-accessible", "crimpr-2025-part19", "cps-expert-evidence", "cps-fsr-code"],
        fields=[
            field("report_class", 1, True, "SFR1_summary | SFR2_evidence | full_expert_report | medical_statement | MG21_submission"),
            field("expert_name_and_qualifications", 2, True, "CrimPR 19.4(a) for full reports"),
            field("accreditation_or_fsr_declaration", 3, False, "FSR Code compliance declaration where activity covered"),
            field("instructions_and_material_relied_on", 4, True, "Facts given / literature / exhibits received"),
            field("continuity_of_exhibits", 5, False, "Date/source of exhibit control"),
            field("methodology", 6, False, "Tests/examinations performed"),
            field("range_of_opinion", 7, False, "Where applicable"),
            field("conclusions_summary", 8, True, "Required summary of conclusions"),
            field("duty_to_court_declaration", 9, True, "CrimPR 19.4(j) for full reports"),
            field("declaration_of_truth", 10, True, "Same as witness statement for full reports"),
            field("target_dates", 11, False, "MG21 forensic submission dates"),
            field("stage_markers", 12, False, "MG22A/B/C/D stage labels"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "title_and_expert_identity", "contains": ["report_class", "expert_name_and_qualifications", "accreditation_or_fsr_declaration"]},
            {"level": 2, "name": "instructions_continuity", "contains": ["instructions_and_material_relied_on", "continuity_of_exhibits", "target_dates"]},
            {"level": 3, "name": "technical_body", "contains": ["methodology", "range_of_opinion", "stage_markers"]},
            {"level": 4, "name": "conclusions_and_declarations", "contains": ["conclusions_summary", "duty_to_court_declaration", "declaration_of_truth"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 40, "mode": 4},
            "continuation_behaviour": "SFR1 short; SFR2/full reports paginate with numbered sections; annexes for raw results.",
            "whitespace_pattern": "Formal report sections; tables for results; declarations near end.",
            "overflow_rules": "Keep declarations intact on final pages; move result tables to annex rather than splitting declaration blocks.",
        },
        conventions={
            "tables": "Results tables common (sample ID | test | result | uncertainty).",
            "signatures": "Expert signature + date; FSR declaration annex if non-compliance mitigated.",
            "identifiers": "Lab job numbers; exhibit marks; MG22 series completed by experts not officers.",
        },
        relationships=[
            {"to": "exhibits-and-continuity", "relation": "MG21 accompanies samples; continuity recited in report"},
            {"to": "mg-forms-and-witness-statements", "relation": "Expert statement form overlaps MG11 declaration model"},
            {"to": "disclosure-schedules", "relation": "Unused draft notes/working papers may be scheduled"},
            {"to": "phone-digital-evidence-schedules", "relation": "Digital forensics experts"},
        ],
        fictionalisation=[
            "Invent lab numbers and expert CVs; do not use real living experts’ details without consent.",
            "SFR1 must remain a summary-for-admission style artefact, not a full 19.4 report.",
            "Medical content must be fictional and non-identifying; avoid real health-service patient identifiers.",
        ],
        charge_families=[
            "assault_injury",
            "sexual_offences_forensic",
            "drugs_purity",
            "firearms_residue",
            "digital_forensics",
            "fatal_collision",
            "DNA_cold_case_style_fictional",
        ],
        visual_qa=[
            "report_class labelled clearly (SFR1 vs SFR2 vs full).",
            "Full reports include qualifications, duty-to-court, and declaration of truth.",
            "Exhibit continuity recited where opinions depend on seized material.",
            "FSR declaration present or explicitly N/A with reason.",
            "MG21 shows audit/target-date fields when modelling submissions.",
        ],
        prohibitions=[
            "Do not treat SFR1 as evidential expert report under CrimPR 19.4.",
            "Do not forge UKAS accreditation claims for fictional labs in a way that could be mistaken for real accreditation outside test harness labelling.",
        ],
        layout_confidence="high_for_CrimPR_19_4_content; medium_for_MG22_templates",
        subtypes=[
            {"id": "MG21", "title": "Submission of Work for Scientific Examination"},
            {"id": "MG21A", "title": "Additional scientific work"},
            {"id": "MG22A", "title": "SFR Initial Investigation"},
            {"id": "MG22B", "title": "SFR Stage 1 results"},
            {"id": "MG22C", "title": "SFR Stage 2 issues"},
            {"id": "MG22D", "title": "CSI / forensic examination statement (abridged)"},
            {"id": "expert_report_19_4", "title": "Full CrimPR 19.4 expert report"},
        ],
    ),
    doc_type(
        id_="abe-special-measures",
        title="ABE / special-measures records",
        aliases=["ABE", "Achieving Best Evidence", "special measures", "YJCEA", "MG02", "s.28", "video recorded interview"],
        sources=["abe-2023", "cps-special-measures", "govuk-mog-forms-accessible", "crimpr-forms"],
        fields=[
            field("witness_eligibility_basis", 1, True, "age_under_18 | incapacity | intimidation | sexual_complainant_etc"),
            field("abe_interview_recording_id", 2, False, "Video-recorded interview master ID"),
            field("interview_date_location", 3, False, "ABE interview logistics"),
            field("intermediary_details", 4, False, "If s.29 sought/used"),
            field("measures_sought", 5, True, "screens | live_link | video_EIC | s28 | private | wigs | aids", "array"),
            field("quality_of_evidence_grounds", 6, True, "Completeness/coherence/accuracy grounds where not automatic"),
            field("mg02_assessment_ref", 7, False, "Police special measures assessment"),
            field("application_form_fields", 8, True, "CrimPR Part 18 / Practice Direction special measures application content"),
            field("court_direction_outcome", 9, False, "Granted/refused/varied"),
            field("arrangements_at_court", 10, False, "Practical arrangements description"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "eligibility", "contains": ["witness_eligibility_basis", "mg02_assessment_ref"]},
            {"level": 2, "name": "abe_interview_record", "contains": ["abe_interview_recording_id", "interview_date_location", "intermediary_details"]},
            {"level": 3, "name": "application", "contains": ["measures_sought", "quality_of_evidence_grounds", "application_form_fields", "arrangements_at_court"]},
            {"level": 4, "name": "order", "contains": ["court_direction_outcome"]},
        ],
        density={
            "typical_pages": {"min": 2, "max": 20, "mode": 5},
            "continuation_behaviour": "Application form sections (live link / video / intermediary parts) appear as distinct parts; ABE transcript/index separate.",
            "whitespace_pattern": "Form-like sections; ticklists for measures; narrative grounds medium length.",
            "overflow_rules": "Keep each special measure’s particulars in its dedicated part; attach ABE disc/index as annex.",
        },
        conventions={
            "tables": "Measures checklist; hearing date timetable.",
            "signatures": "Applicant legal representative; court order sealed/endorsed.",
            "identifiers": "ABE recording exhibit mark; witness cipher for anonymity orders where modelled.",
            "branding": "Written applications should not be CPS-badged; Practice Direction form.",
        },
        relationships=[
            {"to": "mg-forms-and-witness-statements", "relation": "MG02 + MG11/MG15 for visually recorded witness interviews"},
            {"to": "cctv-bwv-media-logs", "relation": "ABE media handled under multimedia integrity rules"},
            {"to": "youth-justice", "relation": "Child witnesses automatic eligibility pathways"},
            {"to": "court-notices-orders-appeals", "relation": "Court directions/orders on measures"},
        ],
        fictionalisation=[
            "Use witness ciphers in packs that model anonymity; invent ABE suite locations.",
            "Do not include real child identifying details.",
            "Grounds language should track YJCEA concepts without copying sealed application wording from real cases.",
        ],
        charge_families=[
            "sexual_offences",
            "child_abuse",
            "modern_slavery",
            "domestic_abuse",
            "any_child_witness",
            "intimidated_witness_gang",
        ],
        visual_qa=[
            "Eligibility basis explicit.",
            "Measures sought listed as discrete items.",
            "No CPS logo on special-measures application form pages.",
            "ABE recording ID cross-refs exhibit/media log when video EIC sought.",
            "Order page distinguishable from application page.",
        ],
        prohibitions=[
            "Do not reproduce real ABE interview videos or transcripts.",
            "Do not assume ABE guidance is a legally enforceable code.",
        ],
        layout_confidence="high_for_legal_content_requirements; medium_for_form_geometry",
    ),
    doc_type(
        id_="court-notices-orders-appeals",
        title="Court notices, orders and appeal documents",
        aliases=["Form NG", "appeal notice", "PTPH notice", "summons", "court order", "respondent notice"],
        sources=["crimpr-forms", "crimpr-2025-part39", "hmcts-welsh-scheme"],
        fields=[
            field("form_code", 1, True, "e.g. NG / Part 34 appeal notice / summons form id from CrimPR forms index"),
            field("crimpr_part", 2, True, "Part 34 / 36 / 39 etc."),
            field("case_reference", 3, True, "Crown Court / CAO references"),
            field("appellant_or_party", 4, True, "Party names"),
            field("decision_appealed", 5, False, "Conviction/sentence/order details"),
            field("grounds_summary", 6, False, "First ≤2 pages summary for CA appeals"),
            field("grounds_numbered", 7, False, "Consecutive grounds with facts/arguments"),
            field("applications_bundled", 8, False, "permission | extension | bail | evidence", "array"),
            field("service_and_lodgement", 9, True, "Where/when lodged; CAO direct lodgement rules for Part 39"),
            field("order_operative_parts", 10, False, "For court orders: numbered operative paragraphs"),
            field("seal_or_endorsement", 11, False, "Court seal/date endorsement"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "form_identity", "contains": ["form_code", "crimpr_part", "case_reference"]},
            {"level": 2, "name": "parties_and_decision", "contains": ["appellant_or_party", "decision_appealed"]},
            {"level": 3, "name": "grounds_body", "contains": ["grounds_summary", "grounds_numbered", "applications_bundled"]},
            {"level": 4, "name": "lodgement_admin", "contains": ["service_and_lodgement", "seal_or_endorsement", "order_operative_parts"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 30, "mode": 4},
            "continuation_behaviour": "Grounds continue numbered; authorities annexed; Easy Read variants exist for some NG forms.",
            "whitespace_pattern": "Official form headers; grounds prose with numbered headings; orders use numbered paragraphs.",
            "overflow_rules": "Keep grounds summary within opening two pages for CA notices; detailed grounds follow.",
        },
        conventions={
            "tables": "Occasionally for hearing dates / parties; usually prose forms.",
            "signatures": "Appellant or legal representative signature/date; court seal on orders.",
            "identifiers": "Form code + CrimPR reference printed; case numbers in header/footer.",
        },
        relationships=[
            {"to": "charge-sheets-and-indictments", "relation": "Appeals against conviction reference indictment counts"},
            {"to": "abe-special-measures", "relation": "Orders may include special-measures directions"},
            {"to": "public-interest-immunity", "relation": "PII rulings and reviews"},
            {"to": "welsh-language-translation-interpreter", "relation": "Bilingual notices / Welsh plea facilities"},
        ],
        fictionalisation=[
            "Use fictional case numbers in realistic formats (e.g. T2026/FFFF).",
            "Grounds must be legally styled but factually invented.",
            "Prefer publicly indexed CrimPR form names; do not invent official form codes.",
        ],
        charge_families=[
            "crown_court_conviction_appeal",
            "sentence_appeal",
            "magistrates_to_crown_appeal",
            "interlocutory_prosecution_appeals",
            "ancillary_orders",
        ],
        visual_qa=[
            "Form code and CrimPR part visible.",
            "Part 39 notices show grounds summary then numbered grounds.",
            "Signature/date present on appeal notices.",
            "Orders show operative numbered paragraphs and date/seal zone.",
            "Easy Read variants only when explicitly modelled.",
        ],
        prohibitions=[
            "Do not claim Part 39 lodgement at Crown Court (direct to Criminal Appeal Office).",
            "Do not invent non-existent official form codes.",
        ],
        layout_confidence="high_for_required_notice_content; medium_for_exact_PDF_form_layout",
    ),
    doc_type(
        id_="youth-justice",
        title="Youth justice",
        aliases=["youth court", "MG04D", "referral order", "YOT", "appropriate adult", "youth written charge"],
        sources=["govuk-mog-forms-accessible", "yjb-referral-order", "sentencing-council-referral", "pace-code-c-2023", "abe-2023"],
        fields=[
            field("youth_name_cipher", 1, True, "Prefer cipher in test packs"),
            field("age_at_offence_and_hearing", 2, True, "Age elements drive venue/eligibility"),
            field("parent_guardian_details", 3, False, "MG04D PG / panel attendance"),
            field("written_charge_fields", 4, False, "MG04D offence list + first hearing"),
            field("appropriate_adult_record", 5, False, "Custody/interview AA"),
            field("venue", 6, True, "youth_court | crown_court_youth | adult_court_exception"),
            field("referral_order_length", 7, False, "3–12 months if modelled"),
            field("yot_panel_contract_items", 8, False, "Reparative/restorative activities", "array"),
            field("reporting_restrictions_banner", 9, True, "Youth identity protection marking on generated pages"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "youth_identity_protected", "contains": ["youth_name_cipher", "age_at_offence_and_hearing", "reporting_restrictions_banner"]},
            {"level": 2, "name": "charging_and_welfare", "contains": ["parent_guardian_details", "written_charge_fields", "appropriate_adult_record", "venue"]},
            {"level": 3, "name": "order_or_outcome", "contains": ["referral_order_length", "yot_panel_contract_items"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 15, "mode": 3},
            "continuation_behaviour": "Charge lists short; referral-order contracts itemised; AA entries in custody log continue chronologically.",
            "whitespace_pattern": "Forms + prominent reporting-restriction banners.",
            "overflow_rules": "Banner repeated on each page of youth-identifying material.",
        },
        conventions={
            "tables": "Offence list; contract activity checklist.",
            "signatures": "Youth/parent signatures on contracts; panel members.",
            "identifiers": "Youth cipher; avoid full address on shared pages where possible.",
        },
        relationships=[
            {"to": "charge-sheets-and-indictments", "relation": "MG04D written charges"},
            {"to": "custody-and-interview-records", "relation": "AA and youth detention rules"},
            {"to": "abe-special-measures", "relation": "Child witnesses/defendants interfaces"},
            {"to": "court-notices-orders-appeals", "relation": "Youth court orders and parental orders"},
        ],
        fictionalisation=[
            "Always fictionalise youth identity; prefer ciphers even in test data.",
            "Do not use real school names tied to identifiable children.",
            "Referral-order content should be generic reparative activities.",
        ],
        charge_families=[
            "youth_first_time_guilty_plea",
            "youth_either_way",
            "grave_crime_crown_court",
            "referral_order_breach",
        ],
        visual_qa=[
            "Reporting restrictions banner on each page with youth identity.",
            "Age fields present.",
            "MG04D/PG distinction clear when both modelled.",
            "Referral order length within 3–12 months if used.",
            "AA indicated for under-18 custody/interview pathways.",
        ],
        prohibitions=[
            "No real youth identities or school records.",
            "Do not assume adult charge-sheet layout for youth written charges.",
        ],
        layout_confidence="high_for_process_fields; medium_for_local_YOT_proformas",
    ),
    doc_type(
        id_="welsh-language-translation-interpreter",
        title="Welsh-language, translation and interpreter material",
        aliases=["Welsh Language Act", "HMCTS Welsh Language Scheme", "interpreter log", "bilingual summons"],
        sources=["welsh-language-act-s22", "hmcts-welsh-scheme", "govuk-interpreters", "crimpr-forms"],
        fields=[
            field("language_choice", 1, True, "Welsh | English | other_language"),
            field("document_language_mode", 2, True, "welsh | english | bilingual"),
            field("interpreter_name_cipher", 3, False, "Court/police interpreter identity fictionalised"),
            field("interpreter_role", 4, False, "police_interview | court_simultaneous | translation_of_exhibits"),
            field("notice_of_welsh_use", 5, False, "Prior notice for non-magistrates’ courts as required"),
            field("translation_certificate", 6, False, "Certificate that translation is accurate"),
            field("source_and_target_language", 7, True, "e.g. Welsh→English"),
            field("booking_responsibility", 8, False, "HMCTS Welsh Language Unit / police / court"),
            field("separate_interpreter_for_court", 9, False, "If interview interpreter becomes witness"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "language_status", "contains": ["language_choice", "document_language_mode", "notice_of_welsh_use"]},
            {"level": 2, "name": "interpreter_deployment", "contains": ["interpreter_name_cipher", "interpreter_role", "booking_responsibility", "separate_interpreter_for_court"]},
            {"level": 3, "name": "translation_artefact", "contains": ["source_and_target_language", "translation_certificate"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 12, "mode": 2},
            "continuation_behaviour": "Bilingual documents may present parallel text or sequential Welsh then English; interpreter logs chronological.",
            "whitespace_pattern": "Parallel columns optional; certificates short; logs tabular.",
            "overflow_rules": "Keep translation certificate with identified source document version/hash.",
        },
        conventions={
            "tables": "Time | Speaker language | Interpreter | Notes.",
            "signatures": "Translator/interpreter certificate signature; court booking confirmation.",
            "identifiers": "Language job numbers; link to interview recording IDs.",
        },
        relationships=[
            {"to": "custody-and-interview-records", "relation": "Interview interpreters recorded on custody/interview papers"},
            {"to": "court-notices-orders-appeals", "relation": "Bilingual summons / Welsh plea pathways"},
            {"to": "mg-forms-and-witness-statements", "relation": "Welsh statements and translations"},
            {"to": "emails-attachments-native-digital", "relation": "Translated native documents as attachments"},
        ],
        fictionalisation=[
            "Use invented interpreter names; do not scrape real interpreter registers into packs.",
            "Welsh body text may be short authentic Welsh phrases or clearly marked placeholder Welsh for layout tests.",
            "Do not present machine-translation artefacts as certified translations without labelling test status.",
        ],
        charge_families=[
            "any_proceedings_in_wales",
            "non_english_speaking_defendant",
            "foreign_language_exhibits",
        ],
        visual_qa=[
            "Language mode labelled on each bilingual artefact.",
            "Interpreter role and booking responsibility present when interpreter used.",
            "Certificate ties to source document identifier.",
            "If interview interpreter is a prosecution witness, court interpreter shown as separate person.",
            "Magistrates’ bilingual default vs Crown Court notice distinction respected when modelled.",
        ],
        prohibitions=[
            "Do not deny Welsh-language right in Wales proceedings in narrative realism.",
            "Do not reuse real simultaneous-interpretation transcripts from courts.",
        ],
        layout_confidence="high_for_legal_rights_and_roles; medium_for_bilingual_typesetting",
    ),
    doc_type(
        id_="public-interest-immunity",
        title="Public interest immunity (PII)",
        aliases=["PII", "public interest ruling", "CrimPR 15.3", "sensitive disclosure application"],
        sources=["crimpr-2025-part15", "cps-disclosure-ch8", "ago-disclosure-2024", "crimpr-forms"],
        fields=[
            field("application_in_writing", 1, True, "CrimPR 15.3 requires written application; no dedicated national form"),
            field("material_description_for_court", 2, True, "Fuller description for court part"),
            field("material_description_for_defence_part", 3, False, "Redacted/partial service on defendant"),
            field("why_disclosure_otherwise_required", 4, True, "Would have to disclose without order"),
            field("public_interest_harm_explanation", 5, True, "Why not in public interest to disclose"),
            field("alternative_measures_considered", 6, True, "Admissions/summary/extract/edited copy inadequate"),
            field("mg6d_cross_ref", 7, False, "Sensitive schedule item refs"),
            field("hearing_ex_parte_or_inter_partes", 8, False, "Hearing mode as directed"),
            field("ruling_outcome", 9, False, "Withhold / disclose / disclose in edited form"),
            field("review_trigger", 10, False, "CrimPR 15.6 review application markers"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "application_head", "contains": ["application_in_writing", "mg6d_cross_ref"]},
            {"level": 2, "name": "court_only_part", "contains": ["material_description_for_court", "why_disclosure_otherwise_required", "public_interest_harm_explanation", "alternative_measures_considered"]},
            {"level": 3, "name": "defence_served_part", "contains": ["material_description_for_defence_part"]},
            {"level": 4, "name": "ruling", "contains": ["hearing_ex_parte_or_inter_partes", "ruling_outcome", "review_trigger"]},
        ],
        density={
            "typical_pages": {"min": 2, "max": 25, "mode": 6},
            "continuation_behaviour": "Split court-only / defence bundles; annex sensitive schedule extracts for court only.",
            "whitespace_pattern": "Formal skeleton argument style; clear PART markings.",
            "overflow_rules": "Never leak court-only content onto defence-served pages.",
        },
        conventions={
            "tables": "Itemised sensitive materials with harm categories.",
            "signatures": "Prosecutor signature; court ruling endorsement.",
            "identifiers": "Mark pages 'FOR COURT ONLY' vs 'SERVED ON DEFENCE'.",
        },
        relationships=[
            {"to": "disclosure-schedules", "relation": "Arise from MG6D sensitive unused material"},
            {"to": "court-notices-orders-appeals", "relation": "Ruling and review process"},
            {"to": "cctv-bwv-media-logs", "relation": "Sometimes sensitive imagery/techniques"},
        ],
        fictionalisation=[
            "Use category-level harm reasons (national security / informant identity / technique) without real operational methods.",
            "Always physically separate court-only and defence parts in pack structure.",
        ],
        charge_families=[
            "organised_crime",
            "terrorism_adjacent_fictional",
            "undercover_or_CHIS_contexts_fictional",
            "serious_sexual_offences_with_third_party_sensitive",
        ],
        visual_qa=[
            "Court-only pages clearly bannered.",
            "Defence part omits secret particulars.",
            "Alternative measures section present.",
            "Cross-refs to MG6D items consistent.",
            "No dedicated fake 'Form PII1' code unless labelled non-official test label.",
        ],
        prohibitions=[
            "Do not invent an official national PII form code.",
            "Do not include real informant or tactic detail.",
        ],
        layout_confidence="high_for_CrimPR_15_3_content; n_a_for_official_blank_form",
        notes="CrimPR forms index states there are no dedicated forms for Part 15 PII applications; structure follows rule content.",
    ),
    doc_type(
        id_="exhibits-and-continuity",
        title="Exhibits and continuity",
        aliases=["MG12", "exhibit list", "continuity statement", "chain of custody", "MG21"],
        sources=["govuk-mog-forms-accessible", "cps-exhibits", "digital-imaging-v3", "cps-fsr-code"],
        fields=[
            field("exhibit_mark", 1, True, "Producer initials/number e.g. AB/1"),
            field("description", 2, True, "What the exhibit is"),
            field("produced_by", 3, True, "Witness/officer producing"),
            field("statement_cross_ref", 4, True, "MG11 paragraph producing exhibit"),
            field("seizure_time_place", 5, False, "If physical seizure"),
            field("storage_location", 6, True, "Current location if copy not provided"),
            field("continuity_transfers", 7, True, "From → To → Date/time → Reason", "array"),
            field("copy_vs_original", 8, True, "original | authentic_copy | working_copy"),
            field("integrity_notes", 9, False, "Seals/hashes/playback format"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "exhibit_list_header", "contains": ["exhibit_mark", "description", "produced_by", "statement_cross_ref"]},
            {"level": 2, "name": "location_and_form", "contains": ["storage_location", "copy_vs_original", "seizure_time_place"]},
            {"level": 3, "name": "continuity_chain", "contains": ["continuity_transfers", "integrity_notes"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 20, "mode": 2},
            "continuation_behaviour": "MG12 list continues row-wise; continuity statements may be separate MG11s per handler.",
            "whitespace_pattern": "Tabular list + short continuity narrative.",
            "overflow_rules": "Each transfer is its own row/line; do not collapse multi-handler chains.",
        },
        conventions={
            "tables": "Exhibit | Description | Produced by | Location | Copy provided Y/N.",
            "signatures": "Each continuity statement signed by handler.",
            "identifiers": "Stable exhibit marks across statements, schedules, SFR, and media logs.",
        },
        relationships=[
            {"to": "mg-forms-and-witness-statements", "relation": "Produced via MG11; listed on MG12"},
            {"to": "medical-forensic-expert-reports", "relation": "MG21 submissions and lab continuity"},
            {"to": "cctv-bwv-media-logs", "relation": "Media authenticity/continuity"},
            {"to": "phone-digital-evidence-schedules", "relation": "Device seizure to extraction chain"},
        ],
        fictionalisation=[
            "Invent exhibit marks consistently across the pack.",
            "Continuity times must be coherent with seizure and analysis dates.",
        ],
        charge_families=["all_families_with_physical_or_digital_exhibits"],
        visual_qa=[
            "Exhibit marks unique and stable.",
            "Every evidential exhibit appears on list and in producing statement.",
            "Continuity chain has no unexplained gaps.",
            "Copy/original status explicit for media.",
            "Location field present when copy not provided to prosecutor.",
        ],
        prohibitions=[
            "Do not claim continuity without modelling transfers for multi-handler exhibits.",
            "Do not reuse real property-store barcodes from forces.",
        ],
        layout_confidence="high_for_list_and_chain_concepts; medium_for_MG12_geometry",
    ),
    doc_type(
        id_="emails-attachments-native-digital",
        title="Emails, attachments and native digital evidence",
        aliases=["email native", "MSG/EML", "attachment hash list", "mailbox export", "cloud mail"],
        sources=["ago-disclosure-2024", "ago-disclosure-2024-pdf", "digital-imaging-v3", "cps-disclosure-ch7"],
        fields=[
            field("container_type", 1, True, "pst | mbox | eml_dir | msg | cloud_export | zip"),
            field("custodian", 2, True, "Mailbox owner role (fictional)"),
            field("date_range", 3, True, "Collection window"),
            field("message_id", 4, False, "RFC message-id for itemised hits"),
            field("from_to_cc", 5, False, "Header fields for itemised messages"),
            field("sent_received_timestamps", 6, False, "Including timezone"),
            field("subject", 7, False, "Subject line"),
            field("body_summary_or_extract", 8, False, "Prefer summary; short extracts only"),
            field("attachment_filename", 9, False, "Attachment name"),
            field("attachment_hash", 10, False, "Hash of attachment bytes"),
            field("native_path", 11, False, "Path within container"),
            field("disclosure_treatment", 12, True, "block_listed | itemised_disclosed | unused_scheduled | privileged_claimed"),
        ],
        page_hierarchy=[
            {"level": 1, "name": "container_manifest", "contains": ["container_type", "custodian", "date_range"]},
            {"level": 2, "name": "block_or_item_schedule", "contains": ["disclosure_treatment", "native_path"]},
            {"level": 3, "name": "message_hit_detail", "contains": ["message_id", "from_to_cc", "sent_received_timestamps", "subject", "body_summary_or_extract"]},
            {"level": 4, "name": "attachment_register", "contains": ["attachment_filename", "attachment_hash"]},
        ],
        density={
            "typical_pages": {"min": 1, "max": 100, "mode": 5},
            "continuation_behaviour": "Manifest first; block schedule; then hit/attachment annexes. Avoid printing entire mailboxes.",
            "whitespace_pattern": "Manifest compact; hit tables dense; extracts short.",
            "overflow_rules": "Large corpora stay block-listed with methodology; only responsive hits expand.",
        },
        conventions={
            "tables": "Msg# | Date | From | To | Subject | Treatment | Hash.",
            "signatures": "Disclosure officer certification via MG6E/DMD rather than per-email signatures.",
            "identifiers": "Container hash + message-id + attachment hash triad for integrity realism.",
        },
        relationships=[
            {"to": "disclosure-schedules", "relation": "Unused native material scheduled; DMD explains review"},
            {"to": "phone-digital-evidence-schedules", "relation": "Overlaps mobile mail/apps"},
            {"to": "exhibits-and-continuity", "relation": "Export containers exhibited"},
            {"to": "welsh-language-translation-interpreter", "relation": "Translated native documents"},
        ],
        fictionalisation=[
            "Invent email addresses on clearly fictional domains (e.g. example.test).",
            "Do not import real mailbox exports.",
            "Attachment contents should be fictional stubs; record hashes of stubs if needed.",
        ],
        charge_families=[
            "fraud",
            "corporate_regulatory_adjacent_fictional",
            "harassment",
            "conspiracy_comms",
            "disclosure_heavy_NGAP",
        ],
        visual_qa=[
            "Container identity present before item lists.",
            "Timestamps include timezone or explicit local-time note.",
            "Attachment rows hash-stable relative to filenames.",
            "Block-listed corpora not fully dumped.",
            "Privileged claims labelled without revealing content.",
        ],
        prohibitions=[
            "No real inbox contents.",
            "No unsupported assumption that native printouts equal forensic exports without integrity fields.",
        ],
        layout_confidence="high_for_disclosure_strategy_structure; low_for_client_print_chrome",
    ),
]


def build() -> None:
    dump(
        REGISTRY / "meta.json",
        {
            "registry_id": "s3000-public-criminal-document-structure-realism-reference",
            "version": "1.0.0",
            "baseline_commit": BASELINE,
            "branch": BRANCH,
            "created_for": "Fictional test-document generation realism only",
            "retrieval_date": RETRIEVED,
            "scope_exclusions": [
                "No V2.1.2 renderer implementation or modification",
                "No app logic changes",
                "No PDFs or case packs in this deliverable",
                "No private case papers",
                "No commit/push/merge/deploy by this workstream",
                "No PASS claim",
            ],
            "jurisdiction": "England and Wales (primary); Welsh-language rights included",
            "document_type_count": len(DOCUMENT_TYPES),
            "source_count": len(SOURCES),
        },
    )

    dump(
        REGISTRY / "sources.json",
        {
            "retrieval_date": RETRIEVED,
            "authority_classes": [
                "primary_secondary_legislation",
                "statutory_code",
                "official_guidance",
                "official_forms_index",
                "official_scheme",
                "prosecution_guidance",
                "national_policing_guidance",
                "sentencing_guidance",
            ],
            "sources": SOURCES,
        },
    )

    dump(
        REGISTRY / "index.json",
        {
            "registry_id": "s3000-public-criminal-document-structure-realism-reference",
            "retrieval_date": RETRIEVED,
            "document_types": [
                {
                    "id": d["id"],
                    "title": d["title"],
                    "path": f"document-types/{d['id']}.json",
                    "layout_confidence": d["layout_confidence"],
                    "primary_sources": d["authoritative_sources"][:3],
                }
                for d in DOCUMENT_TYPES
            ],
        },
    )

    for d in DOCUMENT_TYPES:
        dump(DOC_TYPES / f"{d['id']}.json", d)

    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://casebrain.local/schemas/s3000-layout-reference/document-type.json",
        "title": "S3000 layout reference document type",
        "type": "object",
        "required": [
            "id",
            "title",
            "authoritative_sources",
            "retrieval_date",
            "structural_fields",
            "page_hierarchy",
            "realistic_density_and_continuation",
            "tables_signatures_identifiers",
            "common_document_relationships",
            "safe_fictionalisation_rules",
            "applicable_charge_procedure_families",
            "visual_qa_requirements",
            "prohibited_copying_or_unsupported_assumptions",
            "layout_confidence",
        ],
        "properties": {
            "id": {"type": "string", "pattern": "^[a-z0-9-]+$"},
            "title": {"type": "string", "minLength": 3},
            "aliases": {"type": "array", "items": {"type": "string"}},
            "jurisdiction": {"type": "string"},
            "authoritative_sources": {
                "type": "array",
                "minItems": 1,
                "items": {"type": "string"},
            },
            "retrieval_date": {"type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
            "layout_confidence": {"type": "string"},
            "structural_fields": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "required": ["name", "order", "required", "notes"],
                    "properties": {
                        "name": {"type": "string"},
                        "order": {"type": "integer", "minimum": 1},
                        "required": {"type": "boolean"},
                        "data_type": {"type": "string"},
                        "notes": {"type": "string"},
                    },
                },
            },
            "page_hierarchy": {"type": "array", "minItems": 1},
            "realistic_density_and_continuation": {
                "type": "object",
                "required": ["typical_pages", "continuation_behaviour"],
            },
            "tables_signatures_identifiers": {"type": "object"},
            "common_document_relationships": {"type": "array"},
            "safe_fictionalisation_rules": {"type": "array", "minItems": 1},
            "applicable_charge_procedure_families": {"type": "array", "minItems": 1},
            "visual_qa_requirements": {"type": "array", "minItems": 1},
            "prohibited_copying_or_unsupported_assumptions": {"type": "array", "minItems": 1},
            "subtypes": {"type": "array"},
            "notes": {"type": "string"},
        },
        "additionalProperties": True,
    }
    dump(VALIDATION / "document-type.schema.json", schema)

    sources_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://casebrain.local/schemas/s3000-layout-reference/sources.json",
        "title": "S3000 layout reference sources catalogue",
        "type": "object",
        "required": ["retrieval_date", "sources"],
        "properties": {
            "retrieval_date": {"type": "string"},
            "sources": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "required": ["id", "title", "url", "publisher", "authority_class", "retrieved_on"],
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "url": {"type": "string", "minLength": 12},
                        "publisher": {"type": "string"},
                        "authority_class": {"type": "string"},
                        "retrieved_on": {"type": "string"},
                        "covers_document_families": {"type": "array", "items": {"type": "string"}},
                        "notes": {"type": "string"},
                    },
                },
            },
        },
    }
    dump(VALIDATION / "sources.schema.json", sources_schema)

    dump(
        CONTRACTS / "required-fields.contract.json",
        {
            "contract_id": "required-fields",
            "version": "1.0.0",
            "description": "Every document type must expose ordered structural fields and a page hierarchy.",
            "asserts": [
                {
                    "id": "RF1",
                    "rule": "structural_fields.length >= 1",
                    "severity": "error",
                },
                {
                    "id": "RF2",
                    "rule": "structural_fields[*].order is unique and sorted ascending when sorted",
                    "severity": "error",
                },
                {
                    "id": "RF3",
                    "rule": "page_hierarchy.length >= 1 and references field names where contains is present",
                    "severity": "error",
                },
                {
                    "id": "RF4",
                    "rule": "realistic_density_and_continuation.typical_pages has min,max,mode with min<=mode<=max",
                    "severity": "error",
                },
            ],
        },
    )

    dump(
        CONTRACTS / "source-authority.contract.json",
        {
            "contract_id": "source-authority",
            "version": "1.0.0",
            "description": "Document types must cite catalogue sources with retrieval dates; prefer official/public authorities.",
            "asserts": [
                {
                    "id": "SA1",
                    "rule": "every authoritative_sources[] id exists in sources.json",
                    "severity": "error",
                },
                {
                    "id": "SA2",
                    "rule": "retrieval_date on document type equals sources catalogue retrieved_on window",
                    "severity": "warning",
                },
                {
                    "id": "SA3",
                    "rule": "at least one source per document type has authority_class in {primary_secondary_legislation, statutory_code, official_guidance, official_forms_index, official_scheme, prosecution_guidance, national_policing_guidance}",
                    "severity": "error",
                },
                {
                    "id": "SA4",
                    "rule": "urls must be http(s) public endpoints (gov.uk, legislation.gov.uk, cps.gov.uk, npcc.police.uk, sentencingcouncil.org.uk preferred)",
                    "severity": "warning",
                },
            ],
        },
    )

    dump(
        CONTRACTS / "fictionalisation-safety.contract.json",
        {
            "contract_id": "fictionalisation-safety",
            "version": "1.0.0",
            "description": "Generated fictional documents must obey safety rules recorded in the register.",
            "asserts": [
                {
                    "id": "FS1",
                    "rule": "safe_fictionalisation_rules.length >= 1",
                    "severity": "error",
                },
                {
                    "id": "FS2",
                    "rule": "prohibited_copying_or_unsupported_assumptions includes ban on private case papers and real PII",
                    "severity": "error",
                },
                {
                    "id": "FS3",
                    "rule": "no registry file may embed real personal data samples",
                    "severity": "error",
                },
                {
                    "id": "FS4",
                    "rule": "youth-justice entries must require reporting_restrictions_banner / cipher guidance",
                    "severity": "error",
                },
            ],
        },
    )

    dump(
        CONTRACTS / "visual-qa.contract.json",
        {
            "contract_id": "visual-qa",
            "version": "1.0.0",
            "description": "Visual QA checklist hooks for later renderer/chat packs (not implemented here).",
            "asserts": [
                {
                    "id": "VQ1",
                    "rule": "visual_qa_requirements.length >= 3",
                    "severity": "error",
                },
                {
                    "id": "VQ2",
                    "rule": "continuation behaviour must be stated whenever typical_pages.max > 1",
                    "severity": "error",
                },
                {
                    "id": "VQ3",
                    "rule": "identifier/signature conventions object present",
                    "severity": "error",
                },
                {
                    "id": "VQ4",
                    "rule": "layout_confidence must not claim pixel-perfect when source is guidance-only",
                    "severity": "warning",
                },
            ],
        },
    )

    dump(
        CONTRACTS / "no-renderer-coupling.contract.json",
        {
            "contract_id": "no-renderer-coupling",
            "version": "1.0.0",
            "description": "This workstream must remain reference-only relative to Chat 1 V2.1.2 renderer.",
            "asserts": [
                {
                    "id": "NR1",
                    "rule": "changed paths limited to docs/s3000-layout-reference/**",
                    "severity": "error",
                },
                {
                    "id": "NR2",
                    "rule": "no imports from lib/** or app/** renderer modules",
                    "severity": "error",
                },
                {
                    "id": "NR3",
                    "rule": "no PDF binaries or case evidence packs added",
                    "severity": "error",
                },
                {
                    "id": "NR4",
                    "rule": "meta.scope_exclusions includes no renderer modification and no PASS claim",
                    "severity": "error",
                },
            ],
        },
    )

    dump(
        CONTRACTS / "relationship-integrity.contract.json",
        {
            "contract_id": "relationship-integrity",
            "version": "1.0.0",
            "description": "Cross-document relationships must point at known document type ids.",
            "asserts": [
                {
                    "id": "RI1",
                    "rule": "common_document_relationships[*].to exists in registry index",
                    "severity": "error",
                },
                {
                    "id": "RI2",
                    "rule": "each document type has at least one relationship",
                    "severity": "warning",
                },
            ],
        },
    )

    # Lightweight validator used as executable contract check (stdlib only).
    validate_script = '''#!/usr/bin/env python3
"""Validate S3000 layout-reference registry against local contracts (stdlib only)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry"
DOC_TYPES = REGISTRY / "document-types"

errors: list[str] = []
warnings: list[str] = []


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    meta = load(REGISTRY / "meta.json")
    sources = load(REGISTRY / "sources.json")
    index = load(REGISTRY / "index.json")
    source_ids = {s["id"] for s in sources["sources"]}
    type_ids = {t["id"] for t in index["document_types"]}

    if "No V2.1.2 renderer implementation or modification" not in meta.get("scope_exclusions", []):
        errors.append("NR4: meta.scope_exclusions missing renderer exclusion")
    if "No PASS claim" not in meta.get("scope_exclusions", []):
        errors.append("NR4: meta.scope_exclusions missing no PASS claim")

    docs = []
    for p in sorted(DOC_TYPES.glob("*.json")):
        docs.append(load(p))

    if len(docs) != len(type_ids):
        errors.append(f"index/document-types count mismatch: {len(type_ids)} vs {len(docs)}")

    for d in docs:
        did = d["id"]
        for key in [
            "authoritative_sources",
            "structural_fields",
            "page_hierarchy",
            "realistic_density_and_continuation",
            "tables_signatures_identifiers",
            "common_document_relationships",
            "safe_fictionalisation_rules",
            "applicable_charge_procedure_families",
            "visual_qa_requirements",
            "prohibited_copying_or_unsupported_assumptions",
        ]:
            if key not in d:
                errors.append(f"{did}: missing {key}")

        orders = [f["order"] for f in d.get("structural_fields", [])]
        if orders != sorted(orders) or len(orders) != len(set(orders)):
            errors.append(f"{did}: RF2 structural_fields.order must be unique ascending")

        dens = d.get("realistic_density_and_continuation", {})
        tp = dens.get("typical_pages", {})
        if not (tp.get("min", 0) <= tp.get("mode", -1) <= tp.get("max", -2)):
            errors.append(f"{did}: RF4 typical_pages min<=mode<=max failed")

        if dens.get("typical_pages", {}).get("max", 1) > 1 and not dens.get("continuation_behaviour"):
            errors.append(f"{did}: VQ2 missing continuation_behaviour")

        if len(d.get("visual_qa_requirements", [])) < 3:
            errors.append(f"{did}: VQ1 visual_qa_requirements < 3")

        for sid in d.get("authoritative_sources", []):
            if sid not in source_ids:
                errors.append(f"{did}: SA1 unknown source {sid}")

        for rel in d.get("common_document_relationships", []):
            if rel.get("to") not in type_ids:
                errors.append(f"{did}: RI1 bad relationship target {rel.get('to')}")

        prohib = " ".join(d.get("prohibited_copying_or_unsupported_assumptions", [])).lower()
        if "private case papers" not in prohib:
            errors.append(f"{did}: FS2 missing private case papers prohibition")
        if "personal data" not in prohib and "pii" not in prohib and "protected personal" not in prohib:
            errors.append(f"{did}: FS2 missing personal-data/PII prohibition")

        if did == "youth-justice":
            field_names = {f["name"] for f in d.get("structural_fields", [])}
            if "reporting_restrictions_banner" not in field_names:
                errors.append("youth-justice: FS4 missing reporting_restrictions_banner field")

        # crude real-data smell check (ignore instructional ban phrases)
        blob = json.dumps(d).lower()
        for smell in ["@gmail.com", "@hotmail.com", "@yahoo.com"]:
            if smell in blob:
                warnings.append(f"{did}: possible real-data smell '{smell}'")

    # source authority coverage
    authority_ok = {
        "primary_secondary_legislation",
        "statutory_code",
        "official_guidance",
        "official_forms_index",
        "official_scheme",
        "prosecution_guidance",
        "national_policing_guidance",
    }
    src_by_id = {s["id"]: s for s in sources["sources"]}
    for d in docs:
        classes = {src_by_id[s]["authority_class"] for s in d["authoritative_sources"] if s in src_by_id}
        if not (classes & authority_ok):
            errors.append(f"{d['id']}: SA3 no acceptable authority_class")

    for w in warnings:
        print("WARNING:", w)
    for e in errors:
        print("ERROR:", e)

    print(f"validated_document_types={len(docs)} sources={len(source_ids)} errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
'''
    (VALIDATION / "validate_registry.py").write_text(validate_script, encoding="utf-8")

    print(f"Wrote {len(DOCUMENT_TYPES)} document types and {len(SOURCES)} sources under {ROOT}")


if __name__ == "__main__":
    build()
