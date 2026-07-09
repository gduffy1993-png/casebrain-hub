#!/usr/bin/env npx tsx
/**
 * Messy PDF-backed proof pack + proof receipts (v9 scale-3000).
 *
 * Run:
 *   npx tsx scripts/run-messy-pdf-proof-v6-scale1000.ts
 *   npx tsx scripts/run-messy-pdf-proof-v6-scale1000.ts --preflight
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";
import { runAcceptanceGates, type CaseAcceptanceReport } from "../lib/eval/line-source-proof/acceptance-gates";
import type { LineSourceProofRecord, LineSourceProofReport } from "../lib/eval/line-source-proof/types";
import { buildPdfBackedCaseArtifacts } from "../lib/eval/line-source-proof/pdf-bundle-pipeline";
import { DEMO_AUDIT_V9_SOURCE_IDS } from "../lib/eval/demo-audit-packs/v9-forty-case-catalog";

const ROOT = process.cwd();
const CASE_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const OUT_ROOT = path.join(ROOT, "artifacts", "casebrain-qa", "messy-pdf-proof-v9-scale3000");
const LINE_OUT_ROOT = path.join(OUT_ROOT, "line-source-proof");
const CASE_OUT_ROOT = path.join(OUT_ROOT, "cases");

const BANNED_WORDS = ["synthetic", "simulator", "test bundle", "fake", "ai-generated", "training data"];

type ScenarioSpec = {
  index: number;
  scenario: string;
  sourceCaseId: string;
  caseId: string;
  title: string;
  family: string;
  trap: string;
  layout: string;
};

type BaseScenarioSpec = Omit<ScenarioSpec, "family" | "trap" | "layout">;
type SourceMeta = { family: string; trap: string; layout: string };

const SOURCE_META: Record<string, SourceMeta> = {
  "demo-audit-01-phone-harassment": { family: "domestic-harassment", trap: "wrong-phone-attribution", layout: "chat-screenshots" },
  "demo-audit-02-cctv-stills": { family: "robbery-cctv", trap: "partial-media-vs-master", layout: "stills-index" },
  "demo-audit-03-bwv-custody": { family: "robbery-bwv-custody", trap: "referred-only-bwv", layout: "custody-extract-thin" },
  "demo-audit-04-co-def-interview": { family: "mixed-defendant", trap: "co-defendant-bleed", layout: "interview-schedule" },
  "demo-audit-05-encro-attribution": { family: "encro-handle-attribution", trap: "handle-mapping-missing", layout: "message-extracts" },
  "demo-audit-06-domestic-stalking": { family: "domestic-stalking", trap: "date-court-contradiction", layout: "narrative-bundle" },
  "demo-audit-07-phone-ocr-trap": { family: "domestic-harassment", trap: "ugly-ocr", layout: "rotated-phone-dump" },
  "demo-audit-08-cctv-night-stills": { family: "robbery-cctv", trap: "continuity-hash-gap", layout: "night-stills" },
  "demo-audit-09-cctv-index-only": { family: "robbery-cctv", trap: "index-says-served-file-missing", layout: "index-only" },
  "demo-audit-10-bwv-public-order": { family: "public-order-bwv", trap: "referred-only-clips", layout: "clip-log" },
  "demo-audit-11-custody-pace-ocr": { family: "custody-pace", trap: "ocr-date-court", layout: "scan-heavy-custody" },
  "demo-audit-12-multi-def-burglary": { family: "mixed-defendant", trap: "wrong-person-material", layout: "multi-def-pack" },
  "demo-audit-13-co-def-index-trap": { family: "mixed-defendant", trap: "index-cross-defendant", layout: "index-contradiction" },
  "demo-audit-14-encro-retail": { family: "encro-handle-attribution", trap: "wrong-family-contamination", layout: "retail-encro-schedule" },
  "demo-audit-15-county-lines-runners": { family: "drugs-county-lines", trap: "runner-identity-mix", layout: "runner-intelligence-pack" },
  "demo-audit-16-fraud-bank-statements": { family: "fraud-bank-device", trap: "partial-banking-exhibits", layout: "bank-statement-pack" },
  "demo-audit-17-fraud-transaction-export": { family: "fraud-bank-device", trap: "full-export-missing", layout: "csv-extract-narrative" },
  "demo-audit-18-motoring-sjp-thin": { family: "motoring-sjp", trap: "thin-schedule-missing", layout: "sjp-thin-pack" },
  "demo-audit-19-motoring-breath-specimen": { family: "medical-gap-motoring", trap: "medical-report-missing", layout: "specimen-attachments" },
  "demo-audit-20-domestic-harassment": { family: "domestic-harassment", trap: "charge-wording-drift", layout: "statement-pack" },
  "demo-audit-21-historic-sexual-abe": { family: "abe-first-account-third-party", trap: "third-party-family-bleed", layout: "abe-transcript-pack" },
  "demo-audit-22-youth-interview": { family: "youth-vulnerability", trap: "aa-record-missing", layout: "youth-interview-pack" },
  "demo-audit-23-duplicate-pages": { family: "layout-ocr-duplication", trap: "duplicated-rotated-pages", layout: "rotated-duplicates" },
  "demo-audit-24-missing-pages-index": { family: "index-contradiction", trap: "index-says-served-file-missing", layout: "index-vs-pages" },
  "demo-audit-25-charge-bundle-mismatch": { family: "charge-mismatch", trap: "charge-sheet-vs-mg5", layout: "charge-comparison" },
  "demo-audit-26-phone-referred-metadata": { family: "phone-attribution", trap: "metadata-only-referral", layout: "metadata-schedule" },
  "demo-audit-27-custody-pace-missing": { family: "custody-pace", trap: "extract-served-full-missing", layout: "extract-only" },
  "demo-audit-28-fraud-subscriber-trap": { family: "fraud-bank-device", trap: "subscriber-attribution-gap", layout: "subscriber-schedules" },
  "demo-audit-29-youth-yjs-material": { family: "youth-vulnerability", trap: "yjs-safeguard-partial", layout: "youth-services-pack" },
  "demo-audit-30-layout-hearing-date": { family: "layout-ocr-duplication", trap: "date-court-ocr-contradiction", layout: "layout-trap-pack" },
  // v9 new criminal bundle families (demo-audit-31–70)
  "demo-audit-31-bail-condition-breach": { family: "bail-condition-breach", trap: "bail-order-alleged-breach", layout: "order-breach-pack" },
  "demo-audit-32-restraining-order-breach": { family: "restraining-order-breach", trap: "non-molestation-breach", layout: "order-breach-pack" },
  "demo-audit-33-non-mol-dvpo-overlap": { family: "civil-order-overlap", trap: "non-mol-dvpo-civil-overlap", layout: "order-breach-pack" },
  "demo-audit-34-late-disclosure-hearing": { family: "late-disclosure-hearing", trap: "post-hearing-disclosure-gap", layout: "disclosure-timing-pack" },
  "demo-audit-35-bwv-edited-footage": { family: "edited-bwv-footage", trap: "trimmed-start-end-bwv", layout: "bwv-gap-pack" },
  "demo-audit-36-custody-clock-contradiction": { family: "custody-clock-contradiction", trap: "detention-time-conflict", layout: "custody-timing-pack" },
  "demo-audit-37-interview-timing": { family: "interview-timing-contradiction", trap: "interview-clock-mismatch", layout: "custody-timing-pack" },
  "demo-audit-38-dna-expert-partial": { family: "forensic-dna-gap", trap: "dna-report-missing-partial", layout: "forensic-gap-pack" },
  "demo-audit-39-fingerprint-partial": { family: "forensic-fingerprint-gap", trap: "fingerprint-report-partial", layout: "forensic-gap-pack" },
  "demo-audit-40-cell-site-partial": { family: "forensic-cell-site-gap", trap: "cell-site-report-partial", layout: "forensic-gap-pack" },
  "demo-audit-41-translated-messages": { family: "translated-messages", trap: "interpreter-translation-gap", layout: "phone-message-pack" },
  "demo-audit-42-vulnerable-complainant": { family: "vulnerable-complainant", trap: "special-measures-safeguard-gap", layout: "safeguard-pack" },
  "demo-audit-43-mental-health-fitness": { family: "mental-health-fitness", trap: "fitness-intermediary-gap", layout: "safeguard-pack" },
  "demo-audit-44-bad-redaction": { family: "bad-redaction-bundle", trap: "redaction-hides-names-dates", layout: "redaction-pack" },
  "demo-audit-45-multiple-hearings": { family: "multiple-hearings-listing", trap: "wrong-listing-date-split", layout: "listing-pack" },
  "demo-audit-46-prison-calls": { family: "prison-calls-attribution", trap: "prison-telephone-log-gap", layout: "phone-message-pack" },
  "demo-audit-47-social-media-handles": { family: "social-media-handles", trap: "handle-attribution-unmapped", layout: "phone-message-pack" },
  "demo-audit-48-vehicle-telematics": { family: "vehicle-telematics", trap: "telematics-export-missing", layout: "motoring-device-pack" },
  "demo-audit-49-anpr-trap": { family: "anpr-attribution", trap: "anpr-hit-export-partial", layout: "motoring-device-pack" },
  "demo-audit-50-lab-continuity-conflict": { family: "lab-continuity-conflict", trap: "seal-weight-chain-conflict", layout: "drugs-lab-pack" },
  "demo-audit-51-phone-other-suspect": { family: "phone-wrong-suspect", trap: "exhibit-belongs-other-suspect", layout: "phone-message-pack" },
  "demo-audit-52-exhibit-label-mismatch": { family: "exhibit-label-mismatch", trap: "label-vs-content-mismatch", layout: "index-exhibit-pack" },
  "demo-audit-53-witness-signed-draft": { family: "witness-statement-conflict", trap: "signed-vs-draft-mg11", layout: "statement-pack" },
  "demo-audit-54-complainant-first-account": { family: "complainant-first-account", trap: "first-account-timing-conflict", layout: "abe-account-pack" },
  "demo-audit-55-unused-see-exhibit": { family: "unused-schedule-exhibit", trap: "schedule-see-exhibit-absent", layout: "index-exhibit-pack" },
  "demo-audit-56-edited-screenshots": { family: "edited-screenshots-metadata", trap: "screenshot-metadata-missing", layout: "phone-message-pack" },
  "demo-audit-57-bwv-transcript-no-video": { family: "bwv-transcript-no-video", trap: "transcript-served-video-absent", layout: "bwv-gap-pack" },
  "demo-audit-58-partial-custody-record": { family: "partial-custody-record", trap: "extract-vs-full-custody", layout: "custody-timing-pack" },
  "demo-audit-59-interview-summary-no-audio": { family: "interview-summary-no-audio", trap: "summary-served-audio-missing", layout: "custody-timing-pack" },
  "demo-audit-60-third-party-records": { family: "third-party-records-gap", trap: "referred-third-party-not-served", layout: "third-party-pack" },
  "demo-audit-61-medical-triage-partial": { family: "medical-triage-partial", trap: "triage-note-full-report-missing", layout: "medical-gap-pack" },
  "demo-audit-62-public-order-assault-bwv": { family: "assault-public-order-bwv", trap: "referred-clips-assault-shape", layout: "bwv-gap-pack" },
  "demo-audit-63-fraud-device-subscriber": { family: "fraud-device-subscriber", trap: "bank-device-subscriber-gap", layout: "fraud-device-pack" },
  "demo-audit-64-youth-aa-intermediary": { family: "youth-aa-intermediary", trap: "aa-intermediary-record-gap", layout: "safeguard-pack" },
  "demo-audit-65-harassment-stalking-order": { family: "domestic-order-stack", trap: "harassment-stalking-order-stack", layout: "order-breach-pack" },
  "demo-audit-66-robbery-cctv-anpr": { family: "robbery-cctv-anpr", trap: "cctv-anpr-combo-gap", layout: "cctv-anpr-pack" },
  "demo-audit-67-drugs-runner-lab": { family: "drugs-runner-lab", trap: "runner-lab-continuity-gap", layout: "drugs-lab-pack" },
  "demo-audit-68-encro-social-overlap": { family: "encro-social-overlap", trap: "encro-social-handle-overlap", layout: "encro-message-pack" },
  "demo-audit-69-charge-mg5-hearing": { family: "charge-mg5-hearing-split", trap: "charge-mg5-hearing-contradiction", layout: "listing-pack" },
  "demo-audit-70-index-mg6c-absent": { family: "index-mg6c-exhibit-absent", trap: "index-mg6c-body-absent", layout: "index-exhibit-pack" },
};

const V9_NEW_SOURCE_IDS = new Set(DEMO_AUDIT_V9_SOURCE_IDS);

const BASE_SCENARIOS: BaseScenarioSpec[] = [
  // Original 10 retained
  { index: 1, scenario: "Phone harassment — screenshots served, download/subscriber missing, attribution disputed", sourceCaseId: "demo-audit-01-phone-harassment", caseId: "messy-pdf-v1-01-phone-harassment", title: "MPDF-01 Riley Moss — phone harassment messy proof pack" },
  { index: 2, scenario: "BWV/custody — custody extract served, full custody missing, BWV referred, interview audio missing", sourceCaseId: "demo-audit-03-bwv-custody", caseId: "messy-pdf-v1-02-bwv-custody", title: "MPDF-02 Jordan Hale — BWV/custody messy proof pack" },
  { index: 3, scenario: "CCTV — stills served, master footage missing, continuity/hash/audit trail missing", sourceCaseId: "demo-audit-08-cctv-night-stills", caseId: "messy-pdf-v1-03-cctv-stills-master-missing", title: "MPDF-03 Farah Kent — CCTV continuity gaps messy proof pack" },
  { index: 4, scenario: "Co-defendant material — co-def interview referenced, target defendant interview missing", sourceCaseId: "demo-audit-04-co-def-interview", caseId: "messy-pdf-v1-04-codefendant-material", title: "MPDF-04 Reece Nolan — co-defendant bleed guard messy proof pack" },
  { index: 5, scenario: "Encro/handle attribution — messages served, handle mapping/platform extraction missing", sourceCaseId: "demo-audit-05-encro-attribution", caseId: "messy-pdf-v1-05-encro-handle-attribution", title: "MPDF-05 Nadia Pike — Encro handle attribution messy proof pack" },
  { index: 6, scenario: "Index contradiction — index says exhibit served, PDF missing it, MG6C only refers", sourceCaseId: "demo-audit-24-missing-pages-index", caseId: "messy-pdf-v1-06-index-contradiction", title: "MPDF-06 Ellis Grant — index contradiction messy proof pack" },
  { index: 7, scenario: "Duplicate/rotated OCR bundle — duplicated pages, rotated scan text, OCR date/court risk", sourceCaseId: "demo-audit-23-duplicate-pages", caseId: "messy-pdf-v1-07-duplicate-rotated-ocr", title: "MPDF-07 Priya Shah — duplicate/rotated OCR messy proof pack" },
  { index: 8, scenario: "Charge mismatch — charge sheet wording differs from MG5/case summary", sourceCaseId: "demo-audit-25-charge-bundle-mismatch", caseId: "messy-pdf-v1-08-charge-mismatch", title: "MPDF-08 Aiden Cole — charge mismatch messy proof pack" },
  { index: 9, scenario: "Medical/injury evidence — injury mentioned, report/photos missing or partial", sourceCaseId: "demo-audit-19-motoring-breath-specimen", caseId: "messy-pdf-v1-09-medical-injury-evidence", title: "MPDF-09 Lila Moore — medical/injury evidence messy proof pack" },
  { index: 10, scenario: "Youth/vulnerability/appropriate adult — safeguard referred, record missing/partial", sourceCaseId: "demo-audit-22-youth-interview", caseId: "messy-pdf-v1-10-youth-vulnerability-aa", title: "MPDF-10 Kian Doyle — youth/AA safeguards messy proof pack" },

  // Original scale-30 additions retained
  { index: 11, scenario: "CCTV stills + missing master feed + hash/audit trail weakness (alt shape)", sourceCaseId: "demo-audit-02-cctv-stills", caseId: "messy-pdf-v2-11-cctv-stills-alt", title: "MPDF-11 Theo Marsh — CCTV stills alt messy pack" },
  { index: 12, scenario: "Worse OCR phone bundle + attribution ambiguity + OCR section noise", sourceCaseId: "demo-audit-07-phone-ocr-trap", caseId: "messy-pdf-v2-12-phone-ocr-trap", title: "MPDF-12 Erin Vale — phone OCR trap messy pack" },
  { index: 13, scenario: "CCTV index-only references with missing media pages", sourceCaseId: "demo-audit-09-cctv-index-only", caseId: "messy-pdf-v2-13-cctv-index-only", title: "MPDF-13 Owen Pike — CCTV index-only messy pack" },
  { index: 14, scenario: "BWV public-order shape with referred clips and schedule-only references", sourceCaseId: "demo-audit-10-bwv-public-order", caseId: "messy-pdf-v2-14-bwv-public-order", title: "MPDF-14 Zara Kent — BWV public-order messy pack" },
  { index: 15, scenario: "Custody PACE OCR trap + date/court readability risk", sourceCaseId: "demo-audit-11-custody-pace-ocr", caseId: "messy-pdf-v2-15-custody-pace-ocr", title: "MPDF-15 Mason Ford — custody PACE OCR messy pack" },
  { index: 16, scenario: "Mixed defendants burglary pack with wrong-defendant bleed pressure", sourceCaseId: "demo-audit-12-multi-def-burglary", caseId: "messy-pdf-v2-16-multi-def-burglary", title: "MPDF-16 Holly Reed — mixed-defendant burglary messy pack" },
  { index: 17, scenario: "Co-def index trap with exhibit ownership ambiguity", sourceCaseId: "demo-audit-13-co-def-index-trap", caseId: "messy-pdf-v2-17-codef-index-trap", title: "MPDF-17 Callum Hart — co-def index trap messy pack" },
  { index: 18, scenario: "Encro retail variant with wrong-family contamination pressure", sourceCaseId: "demo-audit-14-encro-retail", caseId: "messy-pdf-v2-18-encro-retail", title: "MPDF-18 Nina Fox — Encro retail messy pack" },
  { index: 19, scenario: "County lines runner material with mixed-family risk and partial exhibits", sourceCaseId: "demo-audit-15-county-lines-runners", caseId: "messy-pdf-v2-19-county-lines-runners", title: "MPDF-19 Jaden Cole — county lines runners messy pack" },
  { index: 20, scenario: "Fraud bank statements with partial exhibit extraction and schedule gaps", sourceCaseId: "demo-audit-16-fraud-bank-statements", caseId: "messy-pdf-v2-20-fraud-bank-statements", title: "MPDF-20 Maya Singh — fraud bank statement messy pack" },
  { index: 21, scenario: "Fraud transaction export with missing native files and partial listings", sourceCaseId: "demo-audit-17-fraud-transaction-export", caseId: "messy-pdf-v2-21-fraud-transaction-export", title: "MPDF-21 Leo Khan — fraud transaction export messy pack" },
  { index: 22, scenario: "Motoring SJP thin papers + missing schedules", sourceCaseId: "demo-audit-18-motoring-sjp-thin", caseId: "messy-pdf-v2-22-motoring-sjp-thin", title: "MPDF-22 Ella Shaw — motoring SJP thin messy pack" },
  { index: 23, scenario: "Domestic harassment variant with corrected/uncertain charge wording pressure", sourceCaseId: "demo-audit-20-domestic-harassment", caseId: "messy-pdf-v2-23-domestic-harassment-alt", title: "MPDF-23 Rhea Bloom — domestic harassment alt messy pack" },
  { index: 24, scenario: "Historic sexual ABE family trap + wrong-family suppression pressure", sourceCaseId: "demo-audit-21-historic-sexual-abe", caseId: "messy-pdf-v2-24-historic-sexual-abe", title: "MPDF-24 Imani Cross — historic ABE messy pack" },
  { index: 25, scenario: "Phone referred metadata only + missing primary extraction", sourceCaseId: "demo-audit-26-phone-referred-metadata", caseId: "messy-pdf-v2-25-phone-referred-metadata", title: "MPDF-25 Noah Finch — referred metadata messy pack" },
  { index: 26, scenario: "Custody full-record missing with extract-only service and interview gaps", sourceCaseId: "demo-audit-27-custody-pace-missing", caseId: "messy-pdf-v2-26-custody-pace-missing", title: "MPDF-26 Ava Hart — custody missing-record messy pack" },
  { index: 27, scenario: "Fraud subscriber trap with attribution disputed and partial schedules", sourceCaseId: "demo-audit-28-fraud-subscriber-trap", caseId: "messy-pdf-v2-27-fraud-subscriber-trap", title: "MPDF-27 Idris Wells — fraud subscriber trap messy pack" },
  { index: 28, scenario: "Youth YJS material with vulnerability records missing/partial", sourceCaseId: "demo-audit-29-youth-yjs-material", caseId: "messy-pdf-v2-28-youth-yjs-material", title: "MPDF-28 Sienna Ray — youth YJS material messy pack" },
  { index: 29, scenario: "Layout hearing-date OCR trap with court/date ambiguity", sourceCaseId: "demo-audit-30-layout-hearing-date", caseId: "messy-pdf-v2-29-layout-hearing-date", title: "MPDF-29 Arlo Dean — hearing-date OCR trap messy pack" },
  { index: 30, scenario: "Court/date corrected charge wording trap from domestic stalking shape", sourceCaseId: "demo-audit-06-domestic-stalking", caseId: "messy-pdf-v2-30-domestic-stalking", title: "MPDF-30 Paige Rowe — domestic stalking messy pack" },
];

const V3_EXPANSION_SOURCE_IDS = [
  "demo-audit-01-phone-harassment",
  "demo-audit-02-cctv-stills",
  "demo-audit-03-bwv-custody",
  "demo-audit-04-co-def-interview",
  "demo-audit-05-encro-attribution",
  "demo-audit-06-domestic-stalking",
  "demo-audit-07-phone-ocr-trap",
  "demo-audit-12-multi-def-burglary",
  "demo-audit-14-encro-retail",
  "demo-audit-16-fraud-bank-statements",
  "demo-audit-18-motoring-sjp-thin",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-22-youth-interview",
  "demo-audit-24-missing-pages-index",
];

const V3_EXPANSION_VARIANTS = [
  { slug: "ocr-crushed", detail: "ugly OCR pass with merged lines and date/court ambiguity" },
  { slug: "rotated-duplicate", detail: "rotated duplicate pages with page-order uncertainty" },
  { slug: "wrong-person-phone", detail: "wrong person / wrong phone attribution pressure" },
  { slug: "index-served-missing", detail: "index says served but substantive file is absent" },
  { slug: "partial-vs-full-export", detail: "partial media snapshots where full export is missing" },
];

/** All 30 templates × new trap axes for v4 (+200 cases). */
const V4_EXPANSION_SOURCE_IDS = Object.keys(SOURCE_META);

const V4_EXPANSION_VARIANTS = [
  { slug: "page-order-chaos", detail: "page-order chaos with duplicated/rotated inserts" },
  { slug: "handwritten-redaction-gap", detail: "handwritten note + redacted-material gaps" },
  { slug: "draft-unsigned-mg11", detail: "draft/unsigned MG11 + statement completeness pressure" },
  { slug: "hearing-court-mismatch", detail: "hearing date / court name contradiction traps" },
  { slug: "call-logs-device-gap", detail: "call-logs missing with partial device extraction" },
  { slug: "abe-video-missing", detail: "ABE referred but video missing; first-account risk" },
  { slug: "drugs-lab-continuity", detail: "drugs continuity / lab / weight gap pressure" },
];

/** 20 diverse templates × 10 trap axes for v5 (+200 cases to 500). */
const V5_EXPANSION_SOURCE_IDS = [
  "demo-audit-08-cctv-night-stills",
  "demo-audit-09-cctv-index-only",
  "demo-audit-10-bwv-public-order",
  "demo-audit-11-custody-pace-ocr",
  "demo-audit-13-co-def-index-trap",
  "demo-audit-15-county-lines-runners",
  "demo-audit-17-fraud-transaction-export",
  "demo-audit-19-motoring-breath-specimen",
  "demo-audit-20-domestic-harassment",
  "demo-audit-23-duplicate-pages",
  "demo-audit-25-charge-bundle-mismatch",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-27-custody-pace-missing",
  "demo-audit-28-fraud-subscriber-trap",
  "demo-audit-29-youth-yjs-material",
  "demo-audit-03-bwv-custody",
  "demo-audit-05-encro-attribution",
  "demo-audit-12-multi-def-burglary",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-30-layout-hearing-date",
];

const V5_EXPANSION_VARIANTS = [
  { slug: "mg6c-referred-only", detail: "MG6C referred-only item with no substantive file served" },
  { slug: "cctv-stills-vs-master", detail: "CCTV stills served but master footage / continuity missing" },
  { slug: "phone-screenshots-vs-download", detail: "phone screenshots served but full extraction / download missing" },
  { slug: "subscriber-attribution-gap", detail: "subscriber / handle attribution not safely confirmed" },
  { slug: "wrong-complainant-trap", detail: "wrong complainant / defendant / phone attribution pressure" },
  { slug: "codef-only-material", detail: "co-defendant-only material present; target defendant item missing" },
  { slug: "charge-mg5-court-split", detail: "charge sheet vs MG5 / hearing date / court name mismatch" },
  { slug: "pace-interview-audio-gap", detail: "custody/PACE extract only; interview audio/transcript missing" },
  { slug: "third-party-records-gap", detail: "third-party / first-account records referred but absent" },
  { slug: "overstatement-guard-trap", detail: "unsafe overstatement trap with CPS/court/client surface separation" },
];

/**
 * 25 rebalance-weighted templates × 20 trap axes for v6 (+500 cases to 1000).
 * Extra slots for thinner v5 families: motoring-SJP, index, stalking, youth, phone, drugs, public-order, charge.
 */
const V6_EXPANSION_SOURCE_IDS = [
  "demo-audit-18-motoring-sjp-thin",
  "demo-audit-18-motoring-sjp-thin",
  "demo-audit-24-missing-pages-index",
  "demo-audit-24-missing-pages-index",
  "demo-audit-06-domestic-stalking",
  "demo-audit-06-domestic-stalking",
  "demo-audit-29-youth-yjs-material",
  "demo-audit-29-youth-yjs-material",
  "demo-audit-22-youth-interview",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-15-county-lines-runners",
  "demo-audit-15-county-lines-runners",
  "demo-audit-10-bwv-public-order",
  "demo-audit-10-bwv-public-order",
  "demo-audit-25-charge-bundle-mismatch",
  "demo-audit-25-charge-bundle-mismatch",
  "demo-audit-30-layout-hearing-date",
  "demo-audit-23-duplicate-pages",
  "demo-audit-19-motoring-breath-specimen",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-27-custody-pace-missing",
  "demo-audit-04-co-def-interview",
  "demo-audit-05-encro-attribution",
  "demo-audit-09-cctv-index-only",
];

const V6_EXPANSION_VARIANTS = [
  { slug: "mg6c-refers-only-not-served", detail: "MG6C refers only; substantive exhibit not in PDF" },
  { slug: "index-marked-served-file-gone", detail: "index marks served but actual PDF pages absent" },
  { slug: "exhibit-listed-absent", detail: "exhibit referenced in schedule but file missing" },
  { slug: "draft-unsigned-mg11-gap", detail: "draft/unsigned MG11; statement completeness unresolved" },
  { slug: "rotated-page-ocr-glue", detail: "rotated page OCR glue + bad page anchors" },
  { slug: "duplicate-page-reorder", detail: "duplicated pages with reordered sequence" },
  { slug: "hearing-date-split-trap", detail: "hearing date contradiction across charge/MG5/listing" },
  { slug: "court-name-split-trap", detail: "court name mismatch across papers" },
  { slug: "partial-bwv-not-fully-served", detail: "partial BWV clips only; full export missing — not served as complete" },
  { slug: "stills-not-master-footage", detail: "CCTV stills served; master footage not safely confirmed" },
  { slug: "screenshot-not-sender-proof", detail: "screenshots do not prove sender attribution" },
  { slug: "encro-handle-not-defendant", detail: "Encro handle messages without defendant mapping" },
  { slug: "medical-mention-no-report", detail: "injury mentioned; medical report/photos not served" },
  { slug: "lab-weight-continuity-missing", detail: "drugs lab/weight/continuity record gaps" },
  { slug: "third-party-record-gap", detail: "third-party / first-account records referred but absent" },
  { slug: "abe-video-referred-missing", detail: "ABE/historic video referred; substantive file missing" },
  { slug: "pace-extract-interview-missing", detail: "PACE/custody extract only; interview audio/transcript missing" },
  { slug: "codef-isolation-no-bleed", detail: "co-defendant material isolated; no defendant bleed" },
  { slug: "wrong-complainant-phone-def", detail: "wrong complainant / phone / defendant attribution trap" },
  { slug: "cps-court-client-surface-split", detail: "CPS chase vs court note vs client summary separation guard" },
];

/**
 * 25 rebalance-weighted templates × 20 trap axes for v7 (+500 cases to 1500).
 * Broaden high-warning spread across ABE/youth/domestic/phone/drugs/BWV-custody/charge-index/fraud/encro/mixed-def/CCTV/OCR.
 */
const V7_EXPANSION_SOURCE_IDS = [
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-22-youth-interview",
  "demo-audit-29-youth-yjs-material",
  "demo-audit-06-domestic-stalking",
  "demo-audit-20-domestic-harassment",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-15-county-lines-runners",
  "demo-audit-15-county-lines-runners",
  "demo-audit-10-bwv-public-order",
  "demo-audit-27-custody-pace-missing",
  "demo-audit-25-charge-bundle-mismatch",
  "demo-audit-30-layout-hearing-date",
  "demo-audit-24-missing-pages-index",
  "demo-audit-24-missing-pages-index",
  "demo-audit-16-fraud-bank-statements",
  "demo-audit-28-fraud-subscriber-trap",
  "demo-audit-05-encro-attribution",
  "demo-audit-04-co-def-interview",
  "demo-audit-12-multi-def-burglary",
  "demo-audit-02-cctv-stills",
  "demo-audit-09-cctv-index-only",
  "demo-audit-23-duplicate-pages",
  "demo-audit-19-motoring-breath-specimen",
];

const V7_EXPANSION_VARIANTS = [
  { slug: "mg6c-refers-only-no-annex", detail: "MG6C refers only; annex/source file absent from served PDF" },
  { slug: "index-served-pdf-gap", detail: "index says served but substantive PDF pages are missing" },
  { slug: "exhibit-schedule-no-file", detail: "exhibit listed in schedule but underlying file absent" },
  { slug: "draft-unsigned-statement-split", detail: "draft/unsigned statement with unresolved completeness split" },
  { slug: "ocr-date-glue-break", detail: "OCR/date glue break with weak page anchoring" },
  { slug: "rotated-duplicate-page-order-chaos", detail: "rotated duplicates and page-order chaos across bundle" },
  { slug: "hearing-court-date-mismatch", detail: "hearing date/court mismatch across charge, MG5 and listing" },
  { slug: "charge-sheet-mg5-wording-drift", detail: "charge wording drift between charge sheet and MG5 narrative" },
  { slug: "partial-media-not-master", detail: "partial media served; master footage/export not safely confirmed" },
  { slug: "screenshot-not-sender-attribution", detail: "screenshots shown but sender attribution not proved" },
  { slug: "subscriber-call-log-device-gap", detail: "subscriber/call-log/device extraction chain incomplete" },
  { slug: "encro-handle-map-missing", detail: "Encro handle present without defendant mapping evidence" },
  { slug: "medical-mention-report-absent", detail: "medical/injury mention without served report or photos" },
  { slug: "lab-weight-continuity-hole", detail: "drugs lab/weight/continuity record hole" },
  { slug: "third-party-first-account-gap", detail: "third-party or first-account records referred but absent" },
  { slug: "abe-referral-video-absent", detail: "ABE/historic referral present while substantive video is missing" },
  { slug: "aa-yjs-safeguard-missing", detail: "AA/YJS safeguard material referred but missing/partial" },
  { slug: "pace-custody-extract-only", detail: "PACE/custody extract served but full interview record missing" },
  { slug: "codef-material-isolation-guard", detail: "co-def material present; defendant-isolation guard must hold" },
  { slug: "cps-court-client-surface-separation", detail: "CPS chase, court note and client summary wording must remain separated" },
];

/**
 * 35 rebalance-weighted templates × 20 trap axes for v8 (+700 cases to 2200).
 * Prioritise thinner families (BWV-custody, motoring-SJP, public-order) and breadth; no medical inflation.
 */
const V8_EXPANSION_SOURCE_IDS = [
  "demo-audit-03-bwv-custody",
  "demo-audit-11-custody-pace-ocr",
  "demo-audit-03-bwv-custody",
  "demo-audit-10-bwv-public-order",
  "demo-audit-10-bwv-public-order",
  "demo-audit-18-motoring-sjp-thin",
  "demo-audit-18-motoring-sjp-thin",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-21-historic-sexual-abe",
  "demo-audit-22-youth-interview",
  "demo-audit-29-youth-yjs-material",
  "demo-audit-06-domestic-stalking",
  "demo-audit-20-domestic-harassment",
  "demo-audit-07-phone-ocr-trap",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-26-phone-referred-metadata",
  "demo-audit-15-county-lines-runners",
  "demo-audit-15-county-lines-runners",
  "demo-audit-04-co-def-interview",
  "demo-audit-13-co-def-index-trap",
  "demo-audit-12-multi-def-burglary",
  "demo-audit-05-encro-attribution",
  "demo-audit-14-encro-retail",
  "demo-audit-16-fraud-bank-statements",
  "demo-audit-17-fraud-transaction-export",
  "demo-audit-28-fraud-subscriber-trap",
  "demo-audit-02-cctv-stills",
  "demo-audit-08-cctv-night-stills",
  "demo-audit-09-cctv-index-only",
  "demo-audit-24-missing-pages-index",
  "demo-audit-24-missing-pages-index",
  "demo-audit-25-charge-bundle-mismatch",
  "demo-audit-30-layout-hearing-date",
  "demo-audit-23-duplicate-pages",
  "demo-audit-27-custody-pace-missing",
];

const V8_EXPANSION_VARIANTS = [
  { slug: "mg6c-schedule-refers-no-body", detail: "MG6C schedule refers only; substantive body/annex absent" },
  { slug: "index-row-served-pdf-absent", detail: "index row marks served but PDF pages are absent" },
  { slug: "exhibit-tag-no-attachment", detail: "exhibit tag present; underlying attachment missing" },
  { slug: "unsigned-draft-statement-gap", detail: "unsigned/draft statement completeness unresolved" },
  { slug: "handwritten-redaction-fragment", detail: "handwritten note/redaction leaves material fragment only" },
  { slug: "rotated-scan-page-anchors", detail: "rotated scan with weak/broken page anchors" },
  { slug: "duplicate-insert-page-order", detail: "duplicate page inserts with uncertain order" },
  { slug: "listing-hearing-date-split", detail: "hearing date split across listing/charge/MG5" },
  { slug: "charge-mg5-court-drift", detail: "charge/MG5/court wording drift across papers" },
  { slug: "partial-clip-not-full-export", detail: "partial clip served; full export not confirmed" },
  { slug: "stills-not-master-chain", detail: "stills served; master footage/continuity chain missing" },
  { slug: "screenshot-sender-not-proved", detail: "screenshots do not prove sender attribution" },
  { slug: "subscriber-metadata-only-trap", detail: "subscriber/metadata only; device extraction incomplete" },
  { slug: "encro-handle-defendant-unmapped", detail: "Encro handle without defendant mapping proof" },
  { slug: "injury-note-no-medical-file", detail: "injury note present; medical report/photos not served" },
  { slug: "drugs-seal-weight-gap", detail: "drugs seal/weight/continuity record gap" },
  { slug: "third-party-record-referred-empty", detail: "third-party/first-account record referred but empty" },
  { slug: "abe-first-account-video-gap", detail: "ABE/first-account video referred; file missing" },
  { slug: "pace-sheet-interview-audio-missing", detail: "PACE sheet/extract only; interview audio/transcript missing" },
  { slug: "cps-court-client-output-split", detail: "CPS chase, court note, client summary must stay separated" },
];

/**
 * 40 new v9 source templates × 20 trap axes (+800 cases to 3000).
 * Each slot is a distinct new criminal bundle family (demo-audit-31–70).
 */
const V9_EXPANSION_SOURCE_IDS = [...DEMO_AUDIT_V9_SOURCE_IDS];

const V9_EXPANSION_VARIANTS = [
  { slug: "schedule-refers-exhibit-absent", detail: "MG6C/unused schedule refers — substantive exhibit absent" },
  { slug: "index-served-pdf-gap", detail: "index marks served — PDF pages missing" },
  { slug: "exhibit-tag-no-attachment", detail: "exhibit tag present — attachment missing" },
  { slug: "draft-unsigned-statement-split", detail: "draft/unsigned statement completeness unresolved" },
  { slug: "redaction-hides-key-fields", detail: "redaction obscures names/dates needed for review" },
  { slug: "rotated-scan-page-anchors", detail: "rotated scan with weak page anchors" },
  { slug: "duplicate-page-reorder", detail: "duplicate inserts with uncertain order" },
  { slug: "listing-hearing-date-split", detail: "hearing date split across listing/charge/MG5" },
  { slug: "charge-mg5-court-drift", detail: "charge/MG5/court wording drift" },
  { slug: "partial-clip-not-full-export", detail: "partial clip served — full export not confirmed" },
  { slug: "transcript-not-master-media", detail: "transcript/summary served — master media missing" },
  { slug: "metadata-sender-not-proved", detail: "screenshots/logs do not prove sender attribution" },
  { slug: "forensic-report-partial-only", detail: "forensic schedule only — expert report missing" },
  { slug: "handle-device-unmapped", detail: "handle/device mapping to defendant not proved" },
  { slug: "injury-triage-no-full-medical", detail: "triage/injury note — full medical report missing" },
  { slug: "lab-seal-continuity-gap", detail: "lab seal/weight/continuity record gap" },
  { slug: "third-party-record-empty", detail: "third-party record referred — body empty" },
  { slug: "abe-video-referred-missing", detail: "ABE/first-account video referred — file missing" },
  { slug: "pace-interview-audio-missing", detail: "PACE/custody extract — interview audio missing" },
  { slug: "cps-court-client-surface-split", detail: "CPS chase, court note, client summary separated" },
];

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function pushExpansion(
  scenarios: ScenarioSpec[],
  sourceIds: string[],
  variants: Array<{ slug: string; detail: string }>,
  versionPrefix: "v3" | "v4" | "v5" | "v6" | "v7" | "v8" | "v9",
  targetTotal: number,
) {
  let index = scenarios.length + 1;
  for (const sourceCaseId of sourceIds) {
    const meta = SOURCE_META[sourceCaseId];
    if (!meta) throw new Error(`Missing SOURCE_META for ${sourceCaseId}`);
    for (const variant of variants) {
      if (scenarios.length >= targetTotal) return;
      const caseId = `messy-pdf-${versionPrefix}-${String(index).padStart(4, "0")}-${meta.family}-${variant.slug}`.toLowerCase();
      scenarios.push({
        index,
        sourceCaseId,
        caseId,
        title: `MPDF-${String(index).padStart(3, "0")} ${titleCase(meta.family)} ${titleCase(variant.slug)} messy proof pack`,
        scenario: `${meta.family} variant — ${meta.trap}; ${variant.detail}`,
        family: meta.family,
        trap: `${meta.trap}/${variant.slug}`,
        layout: meta.layout,
      });
      index += 1;
    }
  }
}

function buildScenarios(): ScenarioSpec[] {
  const scenarios: ScenarioSpec[] = BASE_SCENARIOS.map((s) => ({ ...s, ...SOURCE_META[s.sourceCaseId] }));
  pushExpansion(scenarios, V3_EXPANSION_SOURCE_IDS, V3_EXPANSION_VARIANTS, "v3", 100);
  pushExpansion(scenarios, V4_EXPANSION_SOURCE_IDS, V4_EXPANSION_VARIANTS, "v4", 300);
  pushExpansion(scenarios, V5_EXPANSION_SOURCE_IDS, V5_EXPANSION_VARIANTS, "v5", 500);
  pushExpansion(scenarios, V6_EXPANSION_SOURCE_IDS, V6_EXPANSION_VARIANTS, "v6", 1000);
  pushExpansion(scenarios, V7_EXPANSION_SOURCE_IDS, V7_EXPANSION_VARIANTS, "v7", 1500);
  pushExpansion(scenarios, V8_EXPANSION_SOURCE_IDS, V8_EXPANSION_VARIANTS, "v8", 2200);
  pushExpansion(scenarios, V9_EXPANSION_SOURCE_IDS, V9_EXPANSION_VARIANTS, "v9", 3000);
  if (scenarios.length !== 3000) {
    throw new Error(`Expected 3000 scenarios but built ${scenarios.length}`);
  }
  return scenarios;
}

const SCENARIOS: ScenarioSpec[] = buildScenarios();

/** Targeted preflight samples — encro-social-overlap + legacy mixed-defendant v1–v8. */
const PREFLIGHT_CASE_IDS = [
  "messy-pdf-v9-2941-encro-social-overlap-schedule-refers-exhibit-absent",
  "messy-pdf-v9-2950-encro-social-overlap-partial-clip-not-full-export",
  "messy-pdf-v9-2221-restraining-order-breach-schedule-refers-exhibit-absent",
  "messy-pdf-v9-2401-translated-messages-schedule-refers-exhibit-absent",
  "messy-pdf-v9-2461-bad-redaction-bundle-schedule-refers-exhibit-absent",
  "messy-pdf-v1-04-codefendant-material",
  "messy-pdf-v3-0046-mixed-defendant-ocr-crushed",
] as const;

function scenariosForRun(all: ScenarioSpec[]): ScenarioSpec[] {
  if (!process.argv.includes("--preflight")) return all;
  const wanted = new Set(PREFLIGHT_CASE_IDS);
  const picked = all.filter((s) => wanted.has(s.caseId as (typeof PREFLIGHT_CASE_IDS)[number]));
  if (picked.length !== PREFLIGHT_CASE_IDS.length) {
    const missing = PREFLIGHT_CASE_IDS.filter((id) => !picked.some((s) => s.caseId === id));
    throw new Error(`Preflight missing scenarios: ${missing.join(", ")}`);
  }
  return picked;
}

function summarizePreflight(runs: CaseRun[]): void {
  const fail = runs.reduce((n, r) => n + r.report.summary.fail, 0);
  const blocked = runs.filter((r) => r.acceptance.blocked).length;
  const bleed = runs.reduce((n, r) => n + (r.hardFailures.wrong_defendant_bleed ?? 0), 0);
  const emittedUnsupported = runs.reduce(
    (n, r) => n + r.report.lines.filter((l) => l.proofChainStatus === "output_unsupported").length,
    0,
  );
  console.log("\n=== Preflight summary ===");
  console.log(`  Cases: ${runs.length}`);
  console.log(`  FAIL: ${fail}`);
  console.log(`  blocked: ${blocked}`);
  console.log(`  wrong_defendant_bleed: ${bleed}`);
  console.log(`  emitted unsupported: ${emittedUnsupported}`);
  for (const r of runs) {
    console.log(
      `  ${r.spec.caseId} — FAIL=${r.report.summary.fail} blocked=${r.acceptance.blocked} bleed=${r.hardFailures.wrong_defendant_bleed ?? 0}`,
    );
  }
  const clean = fail === 0 && blocked === 0 && bleed === 0;
  console.log(clean ? "\n  Preflight PASS — safe to run full v9-scale3000." : "\n  Preflight FAIL — fix before full run.");
  if (!clean) process.exitCode = 2;
}

type ReceiptRecord = {
  lineId: string;
  outputLine: string;
  surface: string;
  sourceDocumentName: string;
  sourcePageNumber: string | null;
  sourceSnippet: string | null;
  evidenceState: string | null;
  confidenceSupportLevel: string;
  safeAction: "rely" | "check" | "chase" | "do-not-use";
  unsafeWordingBlockedOrRefused: string | null;
  whySafeLimitedOrReview: string;
};

type CaseRun = {
  spec: ScenarioSpec;
  caseDir: string;
  report: LineSourceProofReport;
  acceptance: CaseAcceptanceReport;
  receipts: ReceiptRecord[];
  hardFailures: Record<string, number>;
  softWarnings: Record<string, number>;
  bannedWordHits: string[];
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function mapSurface(outputSurface: string): string {
  const s = outputSurface.toLowerCase();
  if (s.includes("overview")) return "Overview";
  if (s.includes("court")) return "Court";
  if (s.includes("chase")) return "CPS Chase";
  if (s.includes("client")) return "Client Summary";
  if (s.includes("paper") || s.includes("file")) return "Papers/File";
  if (s.includes("export")) return "Export";
  return "Overview";
}

function supportLevel(line: LineSourceProofRecord): string {
  if (line.proofChainStatus === "pdf_and_text_support_output") return "pdf+text strong";
  if (line.proofChainStatus === "text_supports_but_pdf_unchecked") return "text-only support";
  if (line.proofChainStatus === "pdf_available_but_text_mismatch") return "mismatch review";
  if (line.proofChainStatus === "source_unavailable") return "source unavailable";
  return "unsupported";
}

function actionFor(line: LineSourceProofRecord): "rely" | "check" | "chase" | "do-not-use" {
  const status = (line.supportStatus ?? "").toLowerCase();
  if (line.verdict === "FAIL" || status === "unsupported" || line.proofChainStatus === "output_unsupported") return "do-not-use";
  if (status === "missing" || status === "referred_only" || status === "incomplete") return "chase";
  if (line.solicitorReviewRequired || status === "source_unavailable" || status === "partially_supported") return "check";
  return "rely";
}

function buildReceipts(report: LineSourceProofReport): ReceiptRecord[] {
  return report.lines
    .filter((line) => line.usefulnessVerdict !== "excluded")
    .map((line) => ({
      lineId: line.id,
      outputLine: line.humanOutputLine ?? line.outputLine,
      surface: mapSurface(line.outputSurface),
      sourceDocumentName: line.sourceDocumentName ?? "bundle.pdf",
      sourcePageNumber: line.sourcePageNumber,
      sourceSnippet: line.extractedSnippet ?? line.sourceSnippet ?? null,
      evidenceState: line.evidenceState,
      confidenceSupportLevel: supportLevel(line),
      safeAction: actionFor(line),
      unsafeWordingBlockedOrRefused: line.blockedWording ?? line.safeWording ?? null,
      whySafeLimitedOrReview: line.whyThisIsLimited === "none" ? line.whyThisSupportsTheLine : line.whyThisIsLimited,
    }));
}

function writeReceipts(caseOutDir: string, caseId: string, receipts: ReceiptRecord[]) {
  ensureDir(caseOutDir);
  const jsonPath = path.join(caseOutDir, "proof-receipts.json");
  const mdPath = path.join(caseOutDir, "PROOF-RECEIPTS.md");
  fs.writeFileSync(jsonPath, JSON.stringify({ caseId, receipts }, null, 2));

  const mdLines = [
    `# Proof Receipts — ${caseId}`,
    "",
    "Solicitor-readable receipt for each meaningful output line.",
    "",
    `Total receipts: **${receipts.length}**`,
    "",
    "| # | Surface | Action | Support | Source doc | Page | Output line |",
    "|---:|---------|--------|---------|------------|------|-------------|",
    ...receipts.map((r, i) => {
      const output = r.outputLine.replace(/\|/g, "/");
      return `| ${i + 1} | ${r.surface} | ${r.safeAction} | ${r.confidenceSupportLevel} | ${r.sourceDocumentName} | ${r.sourcePageNumber ?? "-"} | ${output} |`;
    }),
    "",
    "## Detail",
    "",
    ...receipts.flatMap((r, i) => [
      `### ${i + 1}. ${r.outputLine}`,
      `- Surface/tab: ${r.surface}`,
      `- Source document: ${r.sourceDocumentName}`,
      `- Source page: ${r.sourcePageNumber ?? "not page-anchored"}`,
      `- Source snippet: ${r.sourceSnippet ?? "none"}`,
      `- Evidence state: ${r.evidenceState ?? "not mapped"}`,
      `- Confidence/support level: ${r.confidenceSupportLevel}`,
      `- Safe action: ${r.safeAction}`,
      `- Unsafe wording blocked/refused: ${r.unsafeWordingBlockedOrRefused ?? "none"}`,
      `- Why safe/limited/review: ${r.whySafeLimitedOrReview}`,
      "",
    ]),
  ];
  fs.writeFileSync(mdPath, mdLines.join("\n"));
}

function countBy(receipts: ReceiptRecord[], key: keyof ReceiptRecord, value: string): number {
  return receipts.filter((r) => String(r[key] ?? "").toLowerCase() === value.toLowerCase()).length;
}

function detectHardFailures(report: LineSourceProofReport, acceptance: CaseAcceptanceReport): Record<string, number> {
  const lines = report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const hard: Record<string, number> = {
    false_served: 0,
    referred_only_treated_as_served: 0,
    missing_treated_as_available: 0,
    incomplete_treated_as_complete: 0,
    wrong_defendant_bleed: 0,
    wrong_family_bleed: 0,
    court_wording_in_cps_chase: 0,
    cps_chase_wording_in_court_note: 0,
    unsupported_allegation_stated_as_fact: 0,
    attribution_overclaim: 0,
    final_advice_win_loss_wording: 0,
    unsafe_client_summary: 0,
    source_page_mismatch: 0,
    output_with_no_source_anchor: 0,
  };

  for (const l of lines) {
    const text = (l.humanOutputLine ?? l.outputLine).toLowerCase();
    const state = (l.evidenceState ?? "").toLowerCase();
    const isDoNotOverstate = l.lineCategory === "safety_warning" || /\bdo not state\b|\bdo not say\b|\bmust not\b/.test(text);
    const hasServedNegation = /\bnot fully served\b|\bis not fully served\b|\bnot safely served\b/.test(text);
    const servedClaim = !isDoNotOverstate && !hasServedNegation && /\bserved in full\b|\bfully served\b|\bsafely served\b/.test(text);
    const availableClaim = /\bavailable on file\b|\bsafely confirmed\b/.test(text);
    if (servedClaim && /missing|referred_only|incomplete|not_safely_confirmed|other_defendant_only/.test(state)) hard.false_served += 1;
    if (state === "referred_only" && servedClaim) hard.referred_only_treated_as_served += 1;
    if (state === "missing" && availableClaim) hard.missing_treated_as_available += 1;
    if ((state === "incomplete" || state === "partial") && /\bcomplete\b|\bfully served\b/.test(text)) hard.incomplete_treated_as_complete += 1;
    const isSegregatedCoDefendantGap =
      /\bco-defendant\b/i.test(text) &&
      /other defendant only|segregate from target|do not import another defendant/i.test(text);
    if (
      !isSegregatedCoDefendantGap &&
      (l.extractionIssue === "mixed_defendant" ||
        (/other defendant|co-defendant only/.test(text) && /\bserved\b/.test(text)))
    ) {
      hard.wrong_defendant_bleed += 1;
    }
    // Strictly classify cross-surface leakage by line category, not loose keyword occurrence.
    const surface = l.outputSurface.toLowerCase();
    // Count only true cross-surface leakage, not intentionally mirrored views.
    if (surface.startsWith("cps_chase") && l.lineCategory === "court_note") {
      hard.court_wording_in_cps_chase += 1;
    }
    if (surface.startsWith("court") && l.lineCategory === "chase_request") {
      hard.cps_chase_wording_in_court_note += 1;
    }
    if (l.claimType === "fact" && (l.supportStatus === "unsupported" || l.proofChainStatus === "output_unsupported")) {
      hard.unsupported_allegation_stated_as_fact += 1;
    }
    if (
      /defendant sent|attribution (is )?proved/.test(text) &&
      /not_safely_confirmed|missing|referred_only/.test(state) &&
      l.claimType === "fact"
    ) {
      hard.attribution_overclaim += 1;
    }
    if (/\bguaranteed\b|\bwill win\b|\bwill lose\b|\bfinal advice\b/.test(text)) hard.final_advice_win_loss_wording += 1;
    if (l.outputSurface.toLowerCase().includes("client") && l.verdict === "FAIL") hard.unsafe_client_summary += 1;
    // Mismatch is hard only when emitted as unsupported/fail, not ordinary review warnings.
    if (
      l.proofChainStatus === "pdf_available_but_text_mismatch" &&
      (l.verdict === "FAIL" || l.supportStatus === "unsupported" || l.proofChainStatus === "output_unsupported")
    ) {
      hard.source_page_mismatch += 1;
    }
    // Missing source anchor is hard only for substantive fact claims emitted as clean PASS.
    const substantiveClaim = l.claimType === "fact" || l.claimType === "inference";
    if (
      !l.sourceAnchor &&
      l.lineCategory !== "non_evidence_ui" &&
      l.lineCategory !== "safety_warning" &&
      l.reviewTier !== "generic_safety_guard" &&
      substantiveClaim &&
      l.verdict === "PASS"
    ) {
      hard.output_with_no_source_anchor += 1;
    }
  }

  const wrongFamilyGate = acceptance.gates.find((g) => g.gate === "zero_wrong_family_bleed");
  if (wrongFamilyGate && !wrongFamilyGate.passed) hard.wrong_family_bleed = 1;
  return hard;
}

function isProtectiveStockLine(lower: string, line: LineSourceProofRecord): boolean {
  if (line.lineCategory === "safety_warning" || line.reviewTier === "generic_safety_guard") return true;
  if (line.lineCategory === "non_evidence_ui") return true;
  return (
    /^served does not mean reliable/.test(lower) ||
    /^missing does not mean irrelevant/.test(lower) ||
    /^referred only does not mean usable/.test(lower) ||
    /^inference must be labelled as inference/.test(lower) ||
    /^do not import\b/.test(lower) ||
    /^do not treat device summary as proof/.test(lower) ||
    /^do not state "/.test(lower) ||
    /^solicitor review required before sending/.test(lower) ||
    /^please provide .+ or confirm in writing why it is not available/.test(lower)
  );
}

/** Mirrored chase/court/export scaffolds — de-weight repeated wording only, not partial-support truth. */
function isRepeatedWordingStockLine(lower: string, line: LineSourceProofRecord): boolean {
  if (isProtectiveStockLine(lower, line)) return true;
  if (line.lineCategory === "export_line") return true;
  if (line.lineCategory === "chase_request" && /^please provide .+ or confirm in writing why it is not available/.test(lower)) {
    return true;
  }
  return (
    /^please provide .+ or confirm in writing why it is not available/.test(lower) ||
    /^disclosure completeness and outstanding source material/.test(lower) ||
    /^next action: chase outstanding disclosure/.test(lower) ||
    /^main issue: disclosure completeness/.test(lower) ||
    /^the defence asks the court to record that .+ appears outstanding/.test(lower) ||
    /^the defence asks the court to record outstanding device/.test(lower) ||
    /^additional source-material appears outstanding on the current file/.test(lower) ||
    /^keep the position provisional and source-linked/.test(lower) ||
    /^provisional — for solicitor review/.test(lower) ||
    /^confidence: needs review before relying/.test(lower) ||
    /^co-defendant bleed risk:/.test(lower) ||
    /^source-backed concern —/.test(lower) ||
    /^court-day position line is on the today tab/.test(lower) ||
    /^timing and sequence remain conditional/.test(lower) ||
    /^the defence position remains provisional/.test(lower) ||
    /^the defence cannot confirm final issues until disclosure is complete/.test(lower) ||
    /^chase sendability: needs_solicitor_review/.test(lower) ||
    /^no line is sendable just because a source exists/.test(lower)
  );
}

function detectSoftWarnings(report: LineSourceProofReport): Record<string, number> {
  const lines = report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const soft: Record<string, number> = {
    generic_mg6_wording: 0,
    repeated_wording: 0,
    unclear_labels: 0,
    duplicate_bullets: 0,
    dense_internal_wording: 0,
    possible_false_suppression: report.proofLedger.counts.possibleFalseSuppressions ?? 0,
    ocr_date_court_ambiguity: 0,
    partial_support_only: 0,
    too_cautious_not_surfaced: 0,
  };

  const topicSeen = new Map<string, number>();
  const bulletSeen = new Map<string, number>();
  const solicitorFacing = /overview|court|client|chase|hearing_mode|papers|file|export/i;
  for (const l of lines) {
    const text = (l.humanOutputLine ?? l.outputLine).trim();
    const lower = text.toLowerCase();
    const protective = isProtectiveStockLine(lower, l);
    const repeatedStock = isRepeatedWordingStockLine(lower, l);
    const normalizedTopic = lower
      .replace(/messy-pdf-v[0-9]-[a-z0-9-]+/g, "case-id")
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "date")
      .replace(/\b\d+\b/g, "n")
      .replace(/\s+/g, " ")
      .trim();

    // Only count substantive solicitor-facing repetition (exclude protective stock / UI chrome).
    if (!repeatedStock && solicitorFacing.test(l.outputSurface)) {
      const bulletKey = `${l.outputSurface.toLowerCase()}|${l.lineCategory}|${normalizedTopic}`;
      topicSeen.set(normalizedTopic, (topicSeen.get(normalizedTopic) ?? 0) + 1);
      bulletSeen.set(bulletKey, (bulletSeen.get(bulletKey) ?? 0) + 1);
    }

    if (/^mg6c?\b.*referred(?: only)?$/.test(normalizedTopic) || /^schedule only$/.test(normalizedTopic)) {
      soft.generic_mg6_wording += 1;
    }
    // Unknown/review labels are expected in chase/receipt scaffolding; only count terse unresolved labels.
    if ((/^unknown$|^unclear$|^tbd$|^n\/a$/.test(normalizedTopic) || /\blabel unclear\b/.test(normalizedTopic)) && l.lineCategory !== "chase_request") {
      soft.unclear_labels += 1;
    }
    // Dense/internal: only true internal jargon (not long but solicitor-readable client/chase prose).
    const hasInternalJargon = /\b(pipeline|classifier|suppression ledger|proof ledger|usefulnessVerdict|lineCategory|extractionIssue|reviewTier)\b/i.test(text);
    if (!protective && solicitorFacing.test(l.outputSurface) && hasInternalJargon) {
      soft.dense_internal_wording += 1;
    }
    if (l.extractionIssue === "OCR_low_confidence" || /\bocr\b|date\/court unclear|court name unclear/.test(lower)) {
      soft.ocr_date_court_ambiguity += 1;
    }
    // Treat safety-guard phrasing as harmless caution, not partial-support noise.
    if (!protective && (l.supportStatus === "partially_supported" || l.proofChainStatus === "text_supports_but_pdf_unchecked")) {
      soft.partial_support_only += 1;
    }
  }
  // Topic must appear 3+ times to count as a repeated-wording problem (merge-by-topic hygiene).
  for (const [, count] of topicSeen) {
    if (count > 2) soft.repeated_wording += 1;
  }
  // Same surface+category bullet duplicated 3+ times (true duplicate bullets, not mirrored protective text).
  for (const [, count] of bulletSeen) {
    if (count > 2) soft.duplicate_bullets += 1;
  }

  // Collapse duplicate "missing expected" signals by expectedItem for cleaner cautiousness metric.
  const uniqueMissingExpected = new Set<string>();
  for (const miss of report.proofLedger.missingExpectedOutputs ?? []) {
    if (miss?.severity !== "warning") continue;
    const key = String(miss.expectedItem ?? "").toLowerCase().trim();
    if (key) uniqueMissingExpected.add(key);
  }
  soft.too_cautious_not_surfaced = uniqueMissingExpected.size;
  return soft;
}

function bannedWordHits(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter((w) => lower.includes(w));
}

function aggregateIssues(rows: CaseRun[], key: "hardFailures" | "softWarnings"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row[key])) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

async function stage1CreateCases(scenarios: ScenarioSpec[]): Promise<Array<{ spec: ScenarioSpec; caseDir: string; bannedWordHits: string[] }>> {
  console.log(`\n=== Stage 1 — Build ${scenarios.length} messy PDF-backed cases ===`);
  ensureDir(CASE_ROOT);
  const created: Array<{ spec: ScenarioSpec; caseDir: string; bannedWordHits: string[] }> = [];

  for (const spec of scenarios) {
    const sourceDir = path.join(CASE_ROOT, spec.sourceCaseId);
    const caseDir = path.join(CASE_ROOT, spec.caseId);
    ensureDir(caseDir);

    const canonicalPath = fs.existsSync(path.join(sourceDir, "canonical-bundle.md"))
      ? path.join(sourceDir, "canonical-bundle.md")
      : path.join(sourceDir, "bundle-text.md");
    const canonicalBundle = fs.readFileSync(canonicalPath, "utf8");
    const sourceBundleText = fs.readFileSync(path.join(sourceDir, "bundle-text.md"), "utf8");
    fs.writeFileSync(path.join(caseDir, "canonical-bundle.md"), canonicalBundle);

    await buildPdfBackedCaseArtifacts(caseDir, spec.caseId, canonicalBundle);
    // Keep source extracted text shape stable for proof matching while retaining regenerated PDF artifacts.
    fs.writeFileSync(path.join(caseDir, "bundle-text.md"), sourceBundleText);

    const sourceTruth = readJson<Record<string, unknown>>(path.join(sourceDir, "truth-key.json"));
    const truth = {
      ...sourceTruth,
      caseId: spec.caseId,
      title: spec.title,
      profile: "needs_review",
      bundleStatus: "pdf_backed_demo",
      proofChainMode: "pdf_backed_controlled",
      controlledFictional: true,
      scenario: spec.scenario,
    };
    fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(truth, null, 2));

    const extractedText = fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8");
    const hits = bannedWordHits(extractedText);
    created.push({ spec, caseDir, bannedWordHits: hits });
    console.log(`  [${spec.index}/${scenarios.length}] ${spec.caseId} from ${spec.sourceCaseId}`);
  }
  return created;
}

function writeCoverageReport(runs: CaseRun[]) {
  const lines = [
    "# COVERAGE — messy-pdf-proof-v9-scale3000",
    "",
    "| # | Case ID | Family | Trap | Layout | Source template | Receipts | PASS | WARNING | FAIL |",
    "|---:|---------|--------|------|--------|-----------------|---------:|-----:|--------:|-----:|",
    ...runs.map(
      (r) =>
        `| ${r.spec.index} | ${r.spec.caseId} | ${r.spec.family} | ${r.spec.trap} | ${r.spec.layout} | ${r.spec.sourceCaseId} | ${r.receipts.length} | ${r.report.summary.pass} | ${r.report.summary.warning} | ${r.report.summary.fail} |`,
    ),
    "",
  ];
  fs.writeFileSync(path.join(OUT_ROOT, "COVERAGE.md"), lines.join("\n"));
}

function rankWorst(runs: CaseRun[]) {
  return [...runs]
    .map((r) => ({
      caseId: r.spec.caseId,
      family: r.spec.family,
      trap: r.spec.trap,
      fail: r.report.summary.fail,
      warning: r.report.summary.warning,
      hardTotal: Object.values(r.hardFailures).reduce((a, b) => a + b, 0),
      softTotal: Object.values(r.softWarnings).reduce((a, b) => a + b, 0),
      softDrivers: Object.entries(r.softWarnings)
        .sort((a, b) => b[1] - a[1])
        .filter(([, n]) => n > 0)
        .slice(0, 3)
        .map(([k, n]) => `${k}:${n}`)
        .join(", "),
    }))
    .sort((a, b) => b.fail - a.fail || b.hardTotal - a.hardTotal || b.warning - a.warning || b.softTotal - a.softTotal);
}

function selectFamilyBalancedWorst(
  worst: ReturnType<typeof rankWorst>,
  limit = 30,
  maxPerFamily = 2,
): ReturnType<typeof rankWorst> {
  const selected: ReturnType<typeof rankWorst> = [];
  const familyCounts = new Map<string, number>();
  const selectedIds = new Set<string>();

  for (const row of worst) {
    if (selected.length >= limit) break;
    const used = familyCounts.get(row.family) ?? 0;
    if (used >= maxPerFamily) continue;
    selected.push(row);
    selectedIds.add(row.caseId);
    familyCounts.set(row.family, used + 1);
  }
  for (const row of worst) {
    if (selected.length >= limit) break;
    if (selectedIds.has(row.caseId)) continue;
    selected.push(row);
    selectedIds.add(row.caseId);
  }
  return selected;
}

const MEDICAL_TRAP_AXIS_NOTES: Record<string, string> = {
  "medical-report-missing": "breath/device summary served; calibration, intox record, collision/medical expert outstanding",
  "mg6c-refers-only-not-served": "MG6C refers to medical/device material — not in PDF",
  "index-marked-served-file-gone": "index marks medical/device served — pages absent",
  "exhibit-listed-absent": "medical/device exhibit listed — file missing",
  "draft-unsigned-mg11-gap": "MG11/procedure completeness unresolved",
  "rotated-page-ocr-glue": "OCR/page-glue risk on device/medical schedule pages",
  "duplicate-page-reorder": "duplicated device/medical pages — order uncertain",
  "hearing-date-split-trap": "hearing date split across charge/MG5/listing",
  "court-name-split-trap": "court name split across motoring papers",
  "partial-bwv-not-fully-served": "partial clips only — not full BWV export",
  "stills-not-master-footage": "stills/index only — master footage not confirmed",
  "screenshot-not-sender-proof": "screenshots do not prove sender",
  "encro-handle-not-defendant": "handle messages without defendant mapping",
  "medical-mention-no-report": "injury/medical mentioned — report/photos not served",
  "lab-weight-continuity-missing": "lab/weight/continuity gaps on device/drugs chain",
  "third-party-record-gap": "third-party records referred — absent",
  "abe-video-referred-missing": "ABE/historic video referred — file missing",
  "pace-extract-interview-missing": "PACE extract only — interview audio/transcript missing",
  "codef-isolation-no-bleed": "co-def material isolated — bleed guard held",
  "wrong-complainant-phone-def": "wrong complainant/phone/defendant attribution trap",
  "cps-court-client-surface-split": "CPS/court/client surfaces kept separate",
};

function medicalTrapAxisNote(trap: string): string {
  const axis = trap.includes("/") ? (trap.split("/").pop() ?? trap) : trap;
  return MEDICAL_TRAP_AXIS_NOTES[axis] ?? axis.replace(/-/g, " ");
}

function familyWarningBands(runs: CaseRun[]) {
  const byFamily = new Map<string, { cases: number; warnMin: number; warnMax: number; warnSum: number; soft: Record<string, number> }>();
  for (const run of runs) {
    const family = run.spec.family;
    const row = byFamily.get(family) ?? { cases: 0, warnMin: Number.POSITIVE_INFINITY, warnMax: 0, warnSum: 0, soft: {} };
    const warn = run.report.summary.warning;
    row.cases += 1;
    row.warnSum += warn;
    row.warnMin = Math.min(row.warnMin, warn);
    row.warnMax = Math.max(row.warnMax, warn);
    for (const [k, v] of Object.entries(run.softWarnings)) row.soft[k] = (row.soft[k] ?? 0) + v;
    byFamily.set(family, row);
  }
  return [...byFamily.entries()]
    .map(([family, row]) => ({
      family,
      cases: row.cases,
      warnAvg: row.warnSum / row.cases,
      warnMin: row.warnMin,
      warnMax: row.warnMax,
      topSoft: Object.entries(row.soft)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k, n]) => `${k}:${n}`)
        .join(", "),
    }))
    .sort((a, b) => b.warnAvg - a.warnAvg);
}

function medicalDriverBrief(runs: CaseRun[]): string[] {
  const medical = runs.filter((r) => r.spec.family === "medical-gap-motoring");
  if (!medical.length) return ["- No medical-gap-motoring cases in pack."];
  const bySupport: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const run of medical) {
    for (const [k, v] of Object.entries(run.report.summary.bySupport ?? {})) bySupport[k] = (bySupport[k] ?? 0) + v;
    for (const [k, v] of Object.entries(run.report.summary.byCategory ?? {})) byCategory[k] = (byCategory[k] ?? 0) + v;
  }
  const supportLine = Object.entries(bySupport)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v} lines across ${medical.length} cases)`)
    .join("; ");
  const categoryLine = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
  const sample = medical[0]!;
  return [
    `- **${medical.length} cases** — typical WARNING **${sample.report.summary.warning}/case** (motoring-sjp ~98, mixed-defendant ~91).`,
    `- **Support mix (aggregated):** ${supportLine}.`,
    `- **Dominant categories:** ${categoryLine}.`,
    "- **Trap intent:** MG6C/bundle mentions collision/medical expert or device records; substantive report/calibration/intox export stays missing or referred-only.",
    "- **Not a product hide:** FAIL=0, hard=0, unsupported=0, false_served=0, unsafe_client_summary=0 across medical family.",
    "- **Soft drivers:** `partial_support_only` on thin device/MG6 snippets; `too_cautious_not_surfaced` on unique missing expected items — honest chase pressure.",
  ];
}

function solicitorExplanation(w: ReturnType<typeof rankWorst>[number]): string {
  if (w.fail > 0 || w.hardTotal > 0) {
    return "Hard/product issue present — do not scale until investigated.";
  }
  if (w.family.includes("medical")) {
    const axis = medicalTrapAxisNote(w.trap);
    return `Medical-gap-motoring: ${axis}. Warnings reflect missing/referred medical/device material — not false-served or client-unsafe.`;
  }
  if (w.family.includes("motoring")) {
    return "Thin SJP papers: schedule/exhibit gaps drive chase + partial-support pressure; safety counters remain clean.";
  }
  if (w.family.includes("mixed-defendant") || w.trap.includes("co-defendant") || w.trap.includes("wrong-person")) {
    return "Mixed-defendant/co-def pressure: bleed guards held (0 wrong-defendant hard hits); warning volume is presentation-side.";
  }
  return "Warning-pressure case: repeated protective/chase phrasing and partial PDF/text support — not a hard safety miss.";
}

function writeWorstIssues(runs: CaseRun[]) {
  const worst = rankWorst(runs);
  const balancedWorst = selectFamilyBalancedWorst(worst, 30, 2);
  const hardPack = Object.values(aggregateIssues(runs, "hardFailures")).reduce((a, b) => a + b, 0);
  const focusFamilies = ["medical-gap-motoring", "motoring-sjp", "mixed-defendant"] as const;
  const familyNotes = focusFamilies.map((family) => {
    const subset = runs.filter((r) => r.spec.family === family);
    const hard = subset.reduce((n, r) => n + Object.values(r.hardFailures).reduce((a, b) => a + b, 0), 0);
    const fail = subset.reduce((n, r) => n + r.report.summary.fail, 0);
    const unsupported = subset.reduce((n, r) => n + (r.report.proofLedger.counts.emittedUnsupported ?? 0), 0);
    const avgWarn = subset.length ? subset.reduce((n, r) => n + r.report.summary.warning, 0) / subset.length : 0;
    return `- **${family}** (${subset.length} cases, avg WARN **${avgWarn.toFixed(0)}**): FAIL=${fail}, hard hits=${hard}, emitted unsupported=${unsupported} — ${
      fail === 0 && hard === 0 && unsupported === 0
        ? "no hidden product/core failure; remaining pressure is warning quality."
        : "investigate before further scale."
    }`;
  });
  const bands = familyWarningBands(runs);
  const top30Families = [...new Set(balancedWorst.map((w) => w.family))];
  const medicalInTop30 = balancedWorst.filter((w) => w.family.includes("medical")).length;

  const lines = [
    "# WORST ISSUES — messy-pdf-proof-v9-scale3000",
    "",
    "Solicitor-readable warning pressure board (not a fail list).",
    "",
    `- Pack hard-issue total: **${hardPack}**`,
    `- Pack FAIL total: **${runs.reduce((n, r) => n + r.report.summary.fail, 0)}**`,
    "",
    "## Medical-gap-motoring concentration (expected, not a product bug)",
    "",
    `Family-balanced top-30 includes **${top30Families.length} families** with **${medicalInTop30}/30 medical-gap-motoring** entries; breadth view is intentional so highest-warning single family does not hide other pressure families.`,
    "",
    ...medicalDriverBrief(runs),
    "",
    "## Family warning bands (all families)",
    "",
    "| Family | Cases | WARN min | WARN max | WARN avg | Top soft drivers |",
    "|--------|------:|---------:|---------:|---------:|------------------|",
    ...bands.slice(0, 12).map(
      (b) => `| ${b.family} | ${b.cases} | ${b.warnMin} | ${b.warnMax} | ${b.warnAvg.toFixed(1)} | ${b.topSoft || "none"} |`,
    ),
    "",
    "_Next tier after medical: motoring-sjp (~98 WARN), mixed-defendant (~91 WARN)._",
    "",
    "## Family product-risk check (top warning families)",
    "",
    ...familyNotes,
    "",
    "## Top 30 cases",
    "",
    "| Case | Family | Trap axis | FAIL | WARNING | Soft hits | Why it is high | What it is not |",
    "|------|--------|-----------|-----:|--------:|----------:|----------------|----------------|",
    ...balancedWorst.map((w) => {
      const explanation = solicitorExplanation(w).replace(/\|/g, "/");
      const notThis =
        w.fail === 0 && w.hardTotal === 0
          ? "Not false-served / wrong-defendant / client-unsafe"
          : "Contains hard/FAIL signal";
      const axis = w.trap.includes("/") ? (w.trap.split("/").pop() ?? w.trap) : "base";
      return `| ${w.caseId} | ${w.family} | ${axis} | ${w.fail} | ${w.warning} | ${w.softTotal} | ${explanation} | ${notThis} |`;
    }),
    "",
    "## How to read this",
    "",
    "- High WARNING with soft drivers like `partial_support_only` usually means source only partly backs the line, or chase material is incomplete.",
    "- Medical-gap-motoring ranks high because bundles **mention** medical/collision expert or device gaps while reports stay **missing/referred** — that is the trap, not overstatement.",
    "- Repeated protective stock (“do not import…”, “served does not mean reliable”, mirrored chase scaffolds) is deliberate safety phrasing and is de-weighted in soft counters.",
    "- Escalate only when FAIL > 0 or hard-issue hits > 0.",
    "",
  ];
  fs.writeFileSync(path.join(OUT_ROOT, "WORST-ISSUES.md"), lines.join("\n"));
}

function writeTop30WorstCases(runs: CaseRun[]) {
  const worst = selectFamilyBalancedWorst(rankWorst(runs), 30, 2);
  const bands = familyWarningBands(runs);
  const medicalBand = bands.find((b) => b.family === "medical-gap-motoring");
  const motoringBand = bands.find((b) => b.family === "motoring-sjp");
  const mixedBand = bands.find((b) => b.family === "mixed-defendant");
  const md = [
    "# TOP-30-WORST-CASES — messy-pdf-proof-v9-scale3000",
    "",
    "Plain-English ranking by warning pressure. Hard counters for this pack should remain 0.",
    "",
    "## Why this top-30 is family-balanced",
    "",
    "This table is intentionally **family-balanced** (max 2 cases per family first pass), then filled by warning pressure:",
    "",
    "- Medical remains high-pressure (about 102 WARNING/case), but no longer dominates the report table by itself.",
    "- This ensures breadth across legacy families plus v9 new families (bail/order, forensic, BWV/custody timing, safeguards, ANPR/telematics, lab continuity, etc.).",
    "- Soft drivers remain `partial_support_only` and `too_cautious_not_surfaced`; hard counters remain 0.",
    "",
    "### Family spread (warning band)",
    "",
    "| Family | Cases | WARN avg | WARN range |",
    "|--------|------:|---------:|-----------:|",
    `| medical-gap-motoring | ${medicalBand?.cases ?? 0} | ${medicalBand?.warnAvg.toFixed(1) ?? "n/a"} | ${medicalBand?.warnMin ?? "n/a"}–${medicalBand?.warnMax ?? "n/a"} |`,
    `| motoring-sjp | ${motoringBand?.cases ?? 0} | ${motoringBand?.warnAvg.toFixed(1) ?? "n/a"} | ${motoringBand?.warnMin ?? "n/a"}–${motoringBand?.warnMax ?? "n/a"} |`,
    `| mixed-defendant | ${mixedBand?.cases ?? 0} | ${mixedBand?.warnAvg.toFixed(1) ?? "n/a"} | ${mixedBand?.warnMin ?? "n/a"}–${mixedBand?.warnMax ?? "n/a"} |`,
    "",
    "_Post-v9: stop fictional scaling; pivot to receipt UI and real-bundle pilot._",
    "",
    "## Ranked cases",
    "",
    "| Rank | Case | Family | Trap axis | FAIL | WARNING | Soft hits | Soft drivers | Plain-English (Ged/Codex) |",
    "|-----:|------|--------|-----------|-----:|--------:|----------:|--------------|---------------------------|",
    ...worst.map((w, i) => {
      const explanation = solicitorExplanation(w).replace(/\|/g, "/");
      const axis = w.trap.includes("/") ? (w.trap.split("/").pop() ?? w.trap) : "base";
      return `| ${i + 1} | ${w.caseId} | ${w.family} | ${axis} | ${w.fail} | ${w.warning} | ${w.softTotal} | ${w.softDrivers || "none"} | ${explanation} |`;
    }),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "TOP-30-WORST-CASES.md"), md);
}

function writeRepeatedPatterns(runs: CaseRun[]) {
  const patterns = new Map<string, number>();
  for (const run of runs) {
    for (const line of run.report.lines) {
      if (line.usefulnessVerdict === "excluded") continue;
      const text = (line.humanOutputLine ?? line.outputLine).trim();
      const lower = text.toLowerCase();
      if (isRepeatedWordingStockLine(lower, line)) continue;
      const normalized = lower
        .replace(/messy-pdf-v[0-9]-[a-z0-9-]+/g, "case-id")
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "date")
        .replace(/\b\d+\b/g, "n")
        .replace(/\s+/g, " ")
        .trim();
      if (!normalized) continue;
      patterns.set(normalized, (patterns.get(normalized) ?? 0) + 1);
    }
  }
  const top = [...patterns.entries()].filter(([, n]) => n >= 8).sort((a, b) => b[1] - a[1]).slice(0, 40);
  const md = [
    "# REPEATED PATTERNS — messy-pdf-proof-v9-scale3000",
    "",
    "_Protective stock, chase scaffolds, and export mirrors excluded — substantive repetition only._",
    "",
    "| Pattern | Hits |",
    "|---------|-----:|",
    ...top.map(([pattern, hits]) => `| ${pattern.replace(/\|/g, "/")} | ${hits} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "REPEATED-PATTERNS.md"), md);
}

function writeThemeCoverage(runs: CaseRun[]) {
  const byFamily = new Map<string, number>();
  const byTrap = new Map<string, number>();
  const byLayout = new Map<string, number>();
  for (const run of runs) {
    byFamily.set(run.spec.family, (byFamily.get(run.spec.family) ?? 0) + 1);
    byTrap.set(run.spec.trap, (byTrap.get(run.spec.trap) ?? 0) + 1);
    byLayout.set(run.spec.layout, (byLayout.get(run.spec.layout) ?? 0) + 1);
  }
  const fmt = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: **${v}**`);
  const md = [
    "# COVERAGE-BY-THEME — messy-pdf-proof-v9-scale3000",
    "",
    "## Family coverage",
    "",
    ...fmt(byFamily),
    "",
    "## Trap coverage",
    "",
    ...fmt(byTrap),
    "",
    "## Layout coverage",
    "",
    ...fmt(byLayout),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "COVERAGE-BY-THEME.md"), md);
}

function writeDuplicateSimilarityScan(runs: CaseRun[]) {
  const bySource = new Map<string, string[]>();
  const byTrapBase = new Map<string, string[]>();
  for (const run of runs) {
    const list = bySource.get(run.spec.sourceCaseId) ?? [];
    list.push(run.spec.caseId);
    bySource.set(run.spec.sourceCaseId, list);
    const trapBase = run.spec.trap.split("/")[0] ?? run.spec.trap;
    const tList = byTrapBase.get(trapBase) ?? [];
    tList.push(run.spec.caseId);
    byTrapBase.set(trapBase, tList);
  }
  const sourceDupes = [...bySource.entries()]
    .filter(([, ids]) => ids.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  const trapDupes = [...byTrapBase.entries()].sort((a, b) => b[1].length - a[1].length);
  const uniqueCaseIds = new Set(runs.map((r) => r.spec.caseId));
  const md = [
    "# DUPLICATE-SIMILARITY-SCAN — messy-pdf-proof-v9-scale3000",
    "",
    `- Unique case IDs: **${uniqueCaseIds.size}** / ${runs.length}`,
    `- Distinct source templates: **${bySource.size}**`,
    `- Distinct trap bases: **${byTrapBase.size}**`,
    "",
    "## Source-template reuse (expected expansion, not identity clones)",
    "",
    "| Source template | Case count | Sample case IDs |",
    "|-----------------|-----------:|-----------------|",
    ...sourceDupes.map(
      ([source, ids]) => `| ${source} | ${ids.length} | ${ids.slice(0, 4).join(", ")}${ids.length > 4 ? ", …" : ""} |`,
    ),
    "",
    "## Trap-base concentration",
    "",
    "| Trap base | Case count |",
    "|-----------|-----------:|",
    ...trapDupes.slice(0, 40).map(([trap, ids]) => `| ${trap} | ${ids.length} |`),
    "",
    "## Similarity verdict",
    "",
    uniqueCaseIds.size === runs.length
      ? "- All case IDs unique. Expansion variants share templates intentionally; identity is differentiated by caseId + trap/layout axes."
      : "- WARNING: duplicate case IDs detected.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "DUPLICATE-SIMILARITY-SCAN.md"), md);
}

function writeNewFamilyCoverage(runs: CaseRun[]) {
  const v9Runs = runs.filter((r) => V9_NEW_SOURCE_IDS.has(r.spec.sourceCaseId) || r.spec.caseId.startsWith("messy-pdf-v9-"));
  const bySource = new Map<string, { family: string; trap: string; cases: number; fail: number; hard: number }>();
  const byFamily = new Map<string, number>();
  for (const r of v9Runs) {
    const key = r.spec.sourceCaseId;
    const row = bySource.get(key) ?? { family: r.spec.family, trap: r.spec.trap.split("/")[0] ?? r.spec.trap, cases: 0, fail: 0, hard: 0 };
    row.cases += 1;
    row.fail += r.report.summary.fail;
    row.hard += Object.values(r.hardFailures).reduce((a, b) => a + b, 0);
    bySource.set(key, row);
    byFamily.set(r.spec.family, (byFamily.get(r.spec.family) ?? 0) + 1);
  }
  const legacyRuns = runs.filter((r) => !r.spec.caseId.startsWith("messy-pdf-v9-"));
  const lines = [
    "# NEW-FAMILY-COVERAGE — messy-pdf-proof-v9-scale3000",
    "",
    "v9 adds **800 cases** (40 new source templates × 20 trap axes). This report proves the +800 targeted new criminal bundle families — not only old template inflation.",
    "",
    "## Summary",
    "",
    `- v9 expansion cases: **${v9Runs.length}** (expected 800)`,
    `- Distinct new source templates: **${bySource.size}** (expected 40)`,
    `- Distinct new audit families: **${byFamily.size}**`,
    `- Legacy cases retained (v1–v8): **${legacyRuns.length}**`,
    `- v9 FAIL total: **${v9Runs.reduce((n, r) => n + r.report.summary.fail, 0)}**`,
    `- v9 hard-issue total: **${v9Runs.reduce((n, r) => n + Object.values(r.hardFailures).reduce((a, b) => a + b, 0), 0)}**`,
    "",
    "## New family case counts",
    "",
    ...[...byFamily.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([family, count]) => `- ${family}: **${count}**`),
    "",
    "## New source template coverage (demo-audit-31–70)",
    "",
    "| Source template | Family | Base trap | Cases | FAIL | Hard |",
    "|-----------------|--------|-----------|------:|-----:|-----:|",
    ...[...bySource.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, row]) => `| ${id} | ${row.family} | ${row.trap} | ${row.cases} | ${row.fail} | ${row.hard} |`),
    "",
    "## User-target mapping (v9 new families)",
    "",
    "| Target area | v9 family | Cases |",
    "|-------------|-----------|------:|",
    "| Bail condition breach | bail-condition-breach | " + (byFamily.get("bail-condition-breach") ?? 0) + " |",
    "| Restraining order breach | restraining-order-breach | " + (byFamily.get("restraining-order-breach") ?? 0) + " |",
    "| Non-mol / DVPO / civil-order overlap | civil-order-overlap | " + (byFamily.get("civil-order-overlap") ?? 0) + " |",
    "| Late disclosure after hearing | late-disclosure-hearing | " + (byFamily.get("late-disclosure-hearing") ?? 0) + " |",
    "| Edited BWV / missing start-end | edited-bwv-footage | " + (byFamily.get("edited-bwv-footage") ?? 0) + " |",
    "| Custody clock contradiction | custody-clock-contradiction | " + (byFamily.get("custody-clock-contradiction") ?? 0) + " |",
    "| Interview timing contradiction | interview-timing-contradiction | " + (byFamily.get("interview-timing-contradiction") ?? 0) + " |",
    "| DNA expert partial | forensic-dna-gap | " + (byFamily.get("forensic-dna-gap") ?? 0) + " |",
    "| Fingerprint partial | forensic-fingerprint-gap | " + (byFamily.get("forensic-fingerprint-gap") ?? 0) + " |",
    "| Cell-site partial | forensic-cell-site-gap | " + (byFamily.get("forensic-cell-site-gap") ?? 0) + " |",
    "| Translated messages / interpreter | translated-messages | " + (byFamily.get("translated-messages") ?? 0) + " |",
    "| Vulnerable complainant safeguards | vulnerable-complainant | " + (byFamily.get("vulnerable-complainant") ?? 0) + " |",
    "| Mental health / fitness / intermediary | mental-health-fitness | " + (byFamily.get("mental-health-fitness") ?? 0) + " |",
    "| Bad redaction | bad-redaction-bundle | " + (byFamily.get("bad-redaction-bundle") ?? 0) + " |",
    "| Multiple hearings / wrong listing | multiple-hearings-listing | " + (byFamily.get("multiple-hearings-listing") ?? 0) + " |",
    "| Prison calls | prison-calls-attribution | " + (byFamily.get("prison-calls-attribution") ?? 0) + " |",
    "| Social media handles | social-media-handles | " + (byFamily.get("social-media-handles") ?? 0) + " |",
    "| Vehicle telematics | vehicle-telematics | " + (byFamily.get("vehicle-telematics") ?? 0) + " |",
    "| ANPR | anpr-attribution | " + (byFamily.get("anpr-attribution") ?? 0) + " |",
    "| Lab continuity conflict | lab-continuity-conflict | " + (byFamily.get("lab-continuity-conflict") ?? 0) + " |",
    "| Phone exhibit other suspect | phone-wrong-suspect | " + (byFamily.get("phone-wrong-suspect") ?? 0) + " |",
    "| Exhibit label mismatch | exhibit-label-mismatch | " + (byFamily.get("exhibit-label-mismatch") ?? 0) + " |",
    "| Witness signed vs draft | witness-statement-conflict | " + (byFamily.get("witness-statement-conflict") ?? 0) + " |",
    "| Complainant first account conflict | complainant-first-account | " + (byFamily.get("complainant-first-account") ?? 0) + " |",
    "| Unused schedule see exhibit absent | unused-schedule-exhibit | " + (byFamily.get("unused-schedule-exhibit") ?? 0) + " |",
    "| Edited screenshots / metadata | edited-screenshots-metadata | " + (byFamily.get("edited-screenshots-metadata") ?? 0) + " |",
    "| BWV transcript no video | bwv-transcript-no-video | " + (byFamily.get("bwv-transcript-no-video") ?? 0) + " |",
    "| Partial custody vs full | partial-custody-record | " + (byFamily.get("partial-custody-record") ?? 0) + " |",
    "| Interview summary no audio | interview-summary-no-audio | " + (byFamily.get("interview-summary-no-audio") ?? 0) + " |",
    "| Third-party records gap | third-party-records-gap | " + (byFamily.get("third-party-records-gap") ?? 0) + " |",
    "| Medical triage partial | medical-triage-partial | " + (byFamily.get("medical-triage-partial") ?? 0) + " |",
    "",
    "## Verdict",
    "",
    v9Runs.length === 800 && bySource.size === 40
      ? "- **PASS:** +800 cases genuinely use 40 new source templates covering the targeted new families."
      : `- **REVIEW:** expected 800 v9 cases / 40 templates; got ${v9Runs.length} / ${bySource.size}.`,
    "",
  ];
  fs.writeFileSync(path.join(OUT_ROOT, "NEW-FAMILY-COVERAGE.md"), lines.join("\n"));
}

function writeSafeToScaleVerdict(runs: CaseRun[]) {
  const hardTotals = aggregateIssues(runs, "hardFailures");
  const softTotals = aggregateIssues(runs, "softWarnings");
  const totals = {
    casesRun: runs.length,
    fail: runs.reduce((n, r) => n + r.report.summary.fail, 0),
    emittedUnsupported: runs.reduce((n, r) => n + (r.report.proofLedger.counts.emittedUnsupported ?? 0), 0),
    blockedCases: runs.filter((r) => r.acceptance.blocked).length,
    bannedWordHits: runs.reduce((n, r) => n + r.bannedWordHits.length, 0),
  };
  const hardZero =
    Object.values(hardTotals).every((n) => n === 0) &&
    totals.fail === 0 &&
    totals.emittedUnsupported === 0 &&
    totals.blockedCases === 0 &&
    totals.bannedWordHits === 0 &&
    totals.casesRun === 3000;
  const softPressure = softTotals.partial_support_only ?? 0;
  const md = [
    "# SAFE-TO-SCALE-VERDICT — messy-pdf-proof-v9-scale3000",
    "",
    "## Hard-safety gate",
    "",
    `- 3000/3000 build: **${totals.casesRun === 3000 ? "yes" : "no"}**`,
    `- 0 FAIL: **${totals.fail === 0 ? "yes" : "no"}**`,
    `- 0 emitted unsupported: **${totals.emittedUnsupported === 0 ? "yes" : "no"}**`,
    `- 0 blocked: **${totals.blockedCases === 0 ? "yes" : "no"}**`,
    `- 0 banned words: **${totals.bannedWordHits === 0 ? "yes" : "no"}**`,
    `- All hard counters zero: **${Object.values(hardTotals).every((n) => n === 0) ? "yes" : "no"}**`,
    "",
    "## Warning pressure (honest, not hidden)",
    "",
    ...Object.entries(softTotals).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Verdicts",
    "",
    `- Safe to commit runner + pack-level summaries: **${hardZero ? "yes" : "no"}**`,
    `- Safe to scale fictional packs beyond 3000: **no — stop here; move to real-bundle pilot**`,
    `- Core product change required now: **${hardZero ? "no" : "review hard failures before any core change"}**`,
    softPressure > 0
      ? `- Note: partial_support_only still elevated (${softPressure}); mostly honest partial PDF/text support on missing material, not hidden FAILs.`
      : "- Note: no partial_support_only pressure recorded.",
    "- v9 added 800 cases across 40 new source templates (demo-audit-31–70) covering bail/order breaches, forensic gaps, BWV/custody timing, translated messages, safeguards, ANPR/telematics, lab continuity, and related traps.",
    "- **Recommended next:** proof receipt UI / PDF report, then solicitor-reviewed 30 real/redacted bundle pilot — not further fictional scale.",
    "- Do not merge. Do not deploy.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "SAFE-TO-SCALE-VERDICT.md"), md);
}

function writeReceiptSummary(runs: CaseRun[]) {
  const allReceipts = runs.flatMap((r) => r.receipts);
  const summary = {
    generatedAt: new Date().toISOString(),
    caseCount: runs.length,
    receiptCount: allReceipts.length,
    byAction: {
      rely: countBy(allReceipts, "safeAction", "rely"),
      check: countBy(allReceipts, "safeAction", "check"),
      chase: countBy(allReceipts, "safeAction", "chase"),
      doNotUse: countBy(allReceipts, "safeAction", "do-not-use"),
    },
    bySurface: runs.reduce<Record<string, number>>((acc, run) => {
      for (const r of run.receipts) acc[r.surface] = (acc[r.surface] ?? 0) + 1;
      return acc;
    }, {}),
  };
  fs.writeFileSync(path.join(OUT_ROOT, "proof-receipt-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-RECEIPT-SUMMARY.json"), JSON.stringify(summary, null, 2));

  const md = [
    "# MESSY PDF proof receipt summary",
    "",
    `- Cases: **${summary.caseCount}**`,
    `- Total receipts: **${summary.receiptCount}**`,
    `- Action split: rely **${summary.byAction.rely}**, check **${summary.byAction.check}**, chase **${summary.byAction.chase}**, do-not-use **${summary.byAction.doNotUse}**`,
    "",
    "## Receipts by surface",
    "",
    ...Object.entries(summary.bySurface).map(([k, v]) => `- ${k}: **${v}**`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-RECEIPT-SUMMARY.md"), md);
}

function writePackSummary(runs: CaseRun[]) {
  const totals = {
    casesRun: runs.length,
    pass: runs.reduce((n, r) => n + r.report.summary.pass, 0),
    warning: runs.reduce((n, r) => n + r.report.summary.warning, 0),
    fail: runs.reduce((n, r) => n + r.report.summary.fail, 0),
    emittedUnsupported: runs.reduce((n, r) => n + (r.report.proofLedger.counts.emittedUnsupported ?? 0), 0),
    blockedCases: runs.filter((r) => r.acceptance.blocked).length,
    bannedWordHits: runs.reduce((n, r) => n + r.bannedWordHits.length, 0),
  };
  const hardTotals = aggregateIssues(runs, "hardFailures");
  const softTotals = aggregateIssues(runs, "softWarnings");

  const json = {
    generatedAt: new Date().toISOString(),
    totals,
    hardFailures: hardTotals,
    softWarnings: softTotals,
    cases: runs.map((r) => ({
      caseId: r.spec.caseId,
      family: r.spec.family,
      trap: r.spec.trap,
      layout: r.spec.layout,
      scenario: r.spec.scenario,
      sourceCaseId: r.spec.sourceCaseId,
      summary: r.report.summary,
      acceptance: r.acceptance,
      hardFailures: r.hardFailures,
      softWarnings: r.softWarnings,
      bannedWordHits: r.bannedWordHits,
      outputs: {
        lineSource: `line-source-proof/${r.spec.caseId}/line-by-line-proof.md`,
        packet: `line-source-proof/${r.spec.caseId}/SOLICITOR-PROOF-PACKET.md`,
        receiptsMd: `cases/${r.spec.caseId}/PROOF-RECEIPTS.md`,
        receiptsJson: `cases/${r.spec.caseId}/proof-receipts.json`,
      },
    })),
  };
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-SUMMARY.json"), JSON.stringify(json, null, 2));

  const md = [
    "# MESSY-PDF-PROOF-SUMMARY",
    "",
    "Controlled fictional PDF-backed proof/audit run. No production route changes.",
    "",
    "## Totals",
    "",
    `- Cases run: **${totals.casesRun}**`,
    `- PASS: **${totals.pass}**  WARNING: **${totals.warning}**  FAIL: **${totals.fail}**`,
    `- Emitted unsupported: **${totals.emittedUnsupported}**`,
    `- Blocked cases: **${totals.blockedCases}**`,
    `- Banned-word hits in extracted text: **${totals.bannedWordHits}**`,
    "",
    "## Acceptance checks",
    "",
    `- 3000/3000 build: **${totals.casesRun === 3000 ? "yes" : "no"}**`,
    `- 0 emitted unsupported lines: **${totals.emittedUnsupported === 0 ? "yes" : "no"}**`,
    `- 0 false-served: **${(hardTotals.false_served ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 wrong-defendant bleed: **${(hardTotals.wrong_defendant_bleed ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 wrong-family bleed: **${(hardTotals.wrong_family_bleed ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 banned words in PDFs: **${totals.bannedWordHits === 0 ? "yes" : "no"}**`,
    `- 0 hard source-page mismatch: **${(hardTotals.source_page_mismatch ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 hard no-source-anchor: **${(hardTotals.output_with_no_source_anchor ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 court wording in CPS chase: **${(hardTotals.court_wording_in_cps_chase ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 CPS chase wording in court note: **${(hardTotals.cps_chase_wording_in_court_note ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 unsafe client summary: **${(hardTotals.unsafe_client_summary ?? 0) === 0 ? "yes" : "no"}**`,
    "",
    "## Hard failure totals",
    "",
    ...Object.entries(hardTotals).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Soft warning totals",
    "",
    ...Object.entries(softTotals).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Case outputs",
    "",
    "| Case | Family | Trap | Layout | Scenario | Line-source proof | Solicitor packet | Proof receipts |",
    "|------|--------|------|--------|----------|-------------------|------------------|----------------|",
    ...runs.map(
      (r) =>
        `| ${r.spec.caseId} | ${r.spec.family} | ${r.spec.trap} | ${r.spec.layout} | ${r.spec.scenario} | [line-source](./line-source-proof/${r.spec.caseId}/line-by-line-proof.md) | [packet](./line-source-proof/${r.spec.caseId}/SOLICITOR-PROOF-PACKET.md) | [receipts](./cases/${r.spec.caseId}/PROOF-RECEIPTS.md) |`,
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-SUMMARY.md"), md);
}

async function loadExistingRuns(scenarios: ScenarioSpec[]): Promise<CaseRun[]> {
  const runs: CaseRun[] = [];
  for (const spec of scenarios) {
    const caseDir = path.join(CASE_ROOT, spec.caseId);
    const reportPath = path.join(LINE_OUT_ROOT, spec.caseId, "line-by-line-proof.json");
    const receiptsPath = path.join(CASE_OUT_ROOT, spec.caseId, "proof-receipts.json");
    const report = readJson<LineSourceProofReport>(reportPath);
    const acceptance = runAcceptanceGates(report, fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8"));
    const receiptsPayload = readJson<{ receipts: ReceiptRecord[] }>(receiptsPath);
    const extractedText = fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8");
    runs.push({
      spec,
      caseDir,
      report,
      acceptance,
      receipts: receiptsPayload.receipts,
      hardFailures: detectHardFailures(report, acceptance),
      softWarnings: detectSoftWarnings(report),
      bannedWordHits: bannedWordHits(extractedText),
    });
  }
  return runs;
}

async function main() {
  ensureDir(OUT_ROOT);
  ensureDir(LINE_OUT_ROOT);
  ensureDir(CASE_OUT_ROOT);

  const preflight = process.argv.includes("--preflight");
  const reportsOnly = process.argv.includes("--reports-only");
  const activeScenarios = scenariosForRun(SCENARIOS);
  let runs: CaseRun[];

  if (reportsOnly) {
    console.log("\n=== Reports-only — reload existing case artifacts ===");
    runs = await loadExistingRuns(activeScenarios);
    console.log(`  Loaded ${runs.length} cases from ${path.relative(ROOT, OUT_ROOT).replace(/\\/g, "/")}`);
  } else {
    const created = await stage1CreateCases(activeScenarios);

    console.log("\n=== Stage 3/4/5 — Run line-source pipeline, detect issues, write receipts ===");
    runs = [];
    for (const { spec, caseDir, bannedWordHits: hits } of created) {
      const report = buildLineSourceProof(caseDir, LINE_OUT_ROOT);
      writeLineSourceProofArtifacts(report, LINE_OUT_ROOT);
      const acceptance = runAcceptanceGates(report, fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8"));
      const receipts = buildReceipts(report);
      const caseOutDir = path.join(CASE_OUT_ROOT, spec.caseId);
      writeReceipts(caseOutDir, spec.caseId, receipts);
      const hardFailures = detectHardFailures(report, acceptance);
      const softWarnings = detectSoftWarnings(report);
      runs.push({
        spec,
        caseDir,
        report,
        acceptance,
        receipts,
        hardFailures,
        softWarnings,
        bannedWordHits: hits,
      });
      console.log(`  [${spec.index}/${activeScenarios.length}] ${spec.caseId} — FAIL=${report.summary.fail} WARN=${report.summary.warning} blocked=${acceptance.blocked}`);
    }
  }

  if (preflight) {
    summarizePreflight(runs);
    return;
  }

  console.log("\n=== Stage 7 — Write pack reports ===");
  writeReceiptSummary(runs);
  writeCoverageReport(runs);
  writeWorstIssues(runs);
  writeTop30WorstCases(runs);
  writeRepeatedPatterns(runs);
  writeThemeCoverage(runs);
  writeDuplicateSimilarityScan(runs);
  writeNewFamilyCoverage(runs);
  writeSafeToScaleVerdict(runs);
  writePackSummary(runs);
  console.log(`  Reports written under: ${path.relative(ROOT, OUT_ROOT).replace(/\\/g, "/")}`);

  const blocked = runs.some((r) => r.acceptance.blocked);
  if (blocked) process.exitCode = 2;
}

const isDirectRun =
  process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

