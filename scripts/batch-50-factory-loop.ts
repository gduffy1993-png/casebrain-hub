/**
 * Batch 2 — CB-TB-001…050 v3 factory loop (tracker-driven).
 * Run: npx tsx scripts/batch-50-factory-loop.ts
 * Env: BATCH50_PDF_DIR, BATCH50_TRACKER_CSV
 * Report: artifacts/casebrain-qa/batch-50-factory/report.json (gitignored)
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCaseSummarySnippet } from "../lib/criminal/build-case-summary-snippet";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  guardBattleboardOutput,
} from "../lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata, parseUkHearingDateTime } from "../lib/criminal/extract-bundle-case-metadata";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildProductProofMap } from "../lib/criminal/proof-map/build-product-proof-map";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { extractTextFromFileBuffer } from "../lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PDF_DIR =
  process.env.BATCH50_PDF_DIR ??
  "C:/Users/gduff/Downloads/cb-tb-001-050-v3/pdfs";
const TRACKER_CSV =
  process.env.BATCH50_TRACKER_CSV ??
  "C:/Users/gduff/Downloads/cb-tb-001-050-v3/tracker/cb-tb-001-050-tracker.csv";
const OUT_DIR = path.join(ROOT, "artifacts/casebrain-qa/batch-50-factory");

export type TrackerRow = {
  ref: string;
  pdf_filename: string;
  primary_defendant: string;
  case_title: string;
  offence_family: string;
  correct_offence_wording: string;
  correct_court: string;
  correct_hearing: string;
  stage: string;
  expected_status: string;
  must_not_say: string;
  regression_anchor: string;
  intentional_ocr_glue: string;
};

const FORBIDDEN_RES: Array<{ id: string; re: RegExp }> = [
  { id: "full_cctv_confirms", re: /Full CCTV confirms Crown timing/i },
  { id: "mg11_served", re: /\bMG11 is consistent and served\b/i },
  { id: "cad_999_sequence", re: /CAD\/999 timing supports Crown sequence/i },
  { id: "injury_consistent", re: /Complainant injury account is consistent across MG11 and medical material/i },
  { id: "scanned_continuation", re: /SCANNED CONTINUATION/i },
  { id: "pace_emoji", re: /✅\s*Appropriate adult not required/i },
  {
    id: "internal_eval",
    re: /\b(fictional training data|gold\s*7|eval\s+pack|pilot\s+mode|gauntlet|CB-TEST|CB-GOLD|stress\s+pack|sam\.pilot|primary eval hook|casebrain check focus)\b/i,
  },
  { id: "training_banner", re: /\b(TRAINING\s*\/\s*TEST BUNDLE|NO REAL CASE|not a real disclosure|test bundle)\b/i },
  { id: "offence_as_tag_ocr", re: /\(s\)\s*as\s*tag:/i },
  { id: "dob_glue_out", re: /[A-Za-z]DOB\d/i },
  { id: "court_hearing_glue_out", re: /CourtHearing/i },
];

const MUST_NOT_PATTERNS: Array<{ label: string; re: RegExp; blobNeedle: RegExp }> = [
  { label: "theft_when_robbery", re: /\bTheft, contrary to s\.?1 Theft Act 1968\b/i, blobNeedle: /theft when charge is robbery/i },
  { label: "cctv_proves", re: /\b(?:Full CCTV confirms|CCTV proves|CCTV confirms)\b/i, blobNeedle: /cctv proves|confirms crown case/i },
  { label: "mg11_fully_served", re: /MG11 is consistent and fully served|MG11 consistent and fully served/i, blobNeedle: /mg11 consistent and fully served/i },
  { label: "cad_999_supports", re: /CAD\/999 timing supports Crown sequence|CAD\/999 supports Crown sequence/i, blobNeedle: /cad\/999 supports crown sequence/i },
  { label: "injury_proves_without_report", re: /medical report confirms|injury proves ABH|proves s\.?18/i, blobNeedle: /injury\/medical proves/i },
  { label: "interview_admission_no_transcript", re: /interview admission confirms|admitted in interview that/i, blobNeedle: /interview admission without transcript/i },
  { label: "final_loss_conflict", re: /loss is (?:GBP|£)\s*\d[\d,]+(?:\.\d+)?(?: and is (?:final|proved))?/i, blobNeedle: /final loss figure/i },
  { label: "invented_supply", re: /\b(?:PWITS|with intent to supply|concerned in the supply)\b/i, blobNeedle: /invented supply/i },
];

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i]!;
    const next = content[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
      if (c === "\r") i++;
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  const headers = rows[0] ?? [];
  return rows.slice(1).map((cells) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => {
      o[h.trim()] = (cells[idx] ?? "").trim();
    });
    return o;
  });
}

function loadTracker(): TrackerRow[] {
  const raw = parseCsv(fs.readFileSync(TRACKER_CSV, "utf8"));
  return raw.map((r) => ({
    ref: r.ref ?? "",
    pdf_filename: r.pdf_filename ?? "",
    primary_defendant: r.primary_defendant ?? "",
    case_title: r.case_title ?? "",
    offence_family: r.offence_family ?? "",
    correct_offence_wording: r.correct_offence_wording ?? "",
    correct_court: r.correct_court ?? "",
    correct_hearing: r.correct_hearing ?? "",
    stage: r.stage ?? "",
    expected_status: (r.expected_status ?? "pass").toLowerCase(),
    must_not_say: r.must_not_say ?? "",
    regression_anchor: r.regression_anchor ?? "",
    intentional_ocr_glue: (r.intentional_ocr_glue ?? "").toLowerCase(),
  }));
}

function normName(s: string | null): string {
  return (s ?? "").toLowerCase().replace(/['']/g, "'").replace(/\s+/g, " ").trim();
}

function firstName(s: string | null): string {
  return normName(s).split(" ")[0] ?? "";
}

function offenceKeyToken(family: string, wording: string): string | null {
  const src = `${family} ${wording}`.toLowerCase();
  if (/unclear|provisional|wording unclear/i.test(wording)) return null;
  const m = src.match(
    /\b(robbery|burglary|theft|fraud|affray|wounding|assault|drugs|possession|pwits|motoring|dangerous|harassment|stalking|weapon|handling|pervert|conspiracy|damage|affray|coercive|intimidat|bladed|poaca|criminal property|emergency worker)\b/,
  );
  return m?.[1] ?? null;
}

function offenceMatchesTracker(tracker: TrackerRow, got: string): boolean {
  if (/unclear|wording unclear|requires review/i.test(tracker.correct_offence_wording)) {
    return true;
  }
  const g = got.toLowerCase();
  const family = tracker.offence_family.toLowerCase();
  if (family.includes("pwit") || family.includes("supply")) {
    if (/intent to supply|concerned in the supply|pwits/i.test(g)) return true;
  }
  const key = offenceKeyToken(tracker.offence_family, tracker.correct_offence_wording);
  if (!key) return got.trim().length > 0 || tracker.expected_status !== "pass";
  if (key === "robbery" && /\btheft, contrary to s\.?1\b/i.test(got)) return false;
  if (key === "theft" && family.includes("theft") && /\brobbery\b/i.test(g)) {
    return false;
  }
  if (key === "burglary" && /\btheft, contrary to s\.?1\b/i.test(got)) return false;
  if (family.includes("public order") && /threatening|public order|section 4/i.test(g)) return true;
  if (family.includes("criminal damage") && /criminal damage|section 1/i.test(g)) return true;
  return g.includes(key.slice(0, Math.min(6, key.length)));
}

function normalizeHearingForMatch(value: string | null): string {
  return (value ?? "")
    .replace(/^Stage not recorded\s*·\s*/i, "")
    .replace(/^No hearing date safely extracted\s*·\s*/i, "")
    .trim();
}

function hearingMatches(expected: string, got: string | null): boolean {
  if (!expected.trim()) return true;
  const g = normalizeHearingForMatch(got);
  if (!g || /not safely extracted|no hearing date/i.test(g)) return false;
  const expParsed = parseUkHearingDateTime(expected);
  const gotParsed = parseUkHearingDateTime(g);
  if (expParsed?.iso && gotParsed?.iso) {
    return expParsed.iso.slice(0, 16) === gotParsed.iso.slice(0, 16);
  }
  const day = expected.match(/\b(\d{1,2})\b/)?.[1];
  const month = expected.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i)?.[1];
  if (day && !new RegExp(`\\b0?${day}\\b`).test(g)) return false;
  if (month && !new RegExp(month.slice(0, 3), "i").test(g)) return false;
  return true;
}

function textHasUnsafeLine(text: string, re: RegExp): boolean {
  return text.split(/\n/).some((line) => {
    if (/do not state|wording suppressed|must not say|forbidden claim/i.test(line)) return false;
    return re.test(line);
  });
}

function courtMatches(expected: string, got: string | null): boolean {
  if (!expected.trim()) return true;
  if (!got) return false;
  const e = normName(expected.replace(/'/g, ""));
  const g = normName(got.replace(/'/g, ""));
  if (g.includes(e) || e.includes(g)) return true;
  const town = e.match(/^([a-z]+)/)?.[1];
  return town ? g.includes(town) : false;
}

function checkMustNotSay(tracker: TrackerRow, text: string): string[] {
  const issues: string[] = [];
  const blob = tracker.must_not_say.toLowerCase();
  const isLegitimateSupplyCharge = /pwit|intent to supply|concerned in the supply/i.test(
    `${tracker.offence_family} ${tracker.correct_offence_wording}`,
  );
  for (const { label, re, blobNeedle } of MUST_NOT_PATTERNS) {
    if (!blobNeedle.test(blob)) continue;
    if (label === "theft_when_robbery" && !/robbery/i.test(tracker.offence_family)) continue;
    if (label === "invented_supply" && isLegitimateSupplyCharge) continue;
    if (label === "cctv_proves") {
      if (textHasUnsafeLine(text, re)) issues.push(`must_not_say:${label}`);
      continue;
    }
    if (re.test(text)) issues.push(`must_not_say:${label}`);
  }
  if (/robbery/i.test(tracker.offence_family) && /\bTheft, contrary to s\.?1 Theft Act 1968\b/i.test(text)) {
    issues.push("must_not_say:robbery_as_theft");
  }
  return issues;
}

function collectForbidden(text: string): string[] {
  const hits: string[] = [];
  for (const { id, re } of FORBIDDEN_RES) {
    if (re.test(text)) hits.push(id);
  }
  return hits;
}

function isProvisionalText(text: string): boolean {
  return /\b(provisional|conditional|not safely|outstanding|missing|chase|limited|unclear|review required|served material)\b/i.test(
    text,
  );
}

type SurfaceResult = {
  surface: string;
  status: "pass" | "weak" | "fail" | "amber";
  issues: string[];
  badLines: string[];
  samples: string[];
};

type PdfResult = {
  ref: string;
  label: string;
  pdfPath: string;
  extractLen: number;
  trackerStatus: string;
  overall: "pass" | "weak" | "fail" | "amber";
  surfaces: SurfaceResult[];
  metadata: Record<string, string | null>;
};

function lineHits(text: string, re: RegExp): string[] {
  return text
    .split(/\n/)
    .filter((l) => re.test(l))
    .slice(0, 3);
}

async function assessPdf(tracker: TrackerRow): Promise<PdfResult> {
  const pdfPath = path.join(PDF_DIR, tracker.pdf_filename);
  const label = `${tracker.primary_defendant} — ${tracker.offence_family}`;
  const surfaces: SurfaceResult[] = [];

  if (!fs.existsSync(pdfPath)) {
    return {
      ref: tracker.ref,
      label,
      pdfPath,
      extractLen: 0,
      trackerStatus: tracker.expected_status,
      overall: "fail",
      surfaces: [
        {
          surface: "extract",
          status: "fail",
          issues: [`PDF missing: ${tracker.pdf_filename}`],
          badLines: [],
          samples: [],
        },
      ],
      metadata: {},
    };
  }

  const buffer = fs.readFileSync(pdfPath);
  let bundleText = "";
  try {
    bundleText = await extractTextFromFileBuffer(tracker.pdf_filename, "application/pdf", buffer);
  } catch (e) {
    return {
      ref: tracker.ref,
      label,
      pdfPath,
      extractLen: 0,
      trackerStatus: tracker.expected_status,
      overall: "fail",
      surfaces: [
        {
          surface: "extract",
          status: "fail",
          issues: [e instanceof Error ? e.message : String(e)],
          badLines: [],
          samples: [],
        },
      ],
      metadata: {},
    };
  }

  if (bundleText.length < 80) {
    surfaces.push({
      surface: "extract",
      status: "amber",
      issues: [`thin extract (${bundleText.length} chars)`],
      badLines: [bundleText.slice(0, 120)],
      samples: [],
    });
  }

  const meta = extractBundleCaseMetadata(bundleText);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: tracker.ref,
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const hearing =
    formatHearingDisplayFromLedger(ledger, ledger.hearing.hearingType) ?? header.nextHearing;
  const disclosureChase = buildDisclosureChaseBrief({
    caseId: tracker.ref,
    caseTitle: tracker.case_title,
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    hearingDateIso: ledger.hearing.dateIso,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
  });
  const warRoom = buildHearingWarRoomBrief({
    caseId: tracker.ref,
    caseTitle: tracker.case_title,
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    readiness: disclosureChase.disclosureSummary,
    battleboard,
    hasSavedPosition: false,
    chaseItems: [],
    bundleText,
  });
  const summary = buildCaseSummarySnippet({
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    defencePosition: header.defencePosition,
    complainant: header.complainant,
    court: header.court,
    battleboard,
    chaseItems: disclosureChase.primaryItems.map((i) => i.label).slice(0, 6),
    bundleCombinedText: bundleText.slice(0, 80_000),
  });
  const proofMap = buildProductProofMap({
    frontMatterScan: bundleText,
    combinedTextLength: bundleText.length,
    matterLabel: tracker.case_title,
    allegation: header.allegation,
  });
  const qaMd = buildCaseQaPackMarkdown({
    caseId: tracker.ref,
    caseLabel: tracker.ref,
    exportedAt: new Date().toISOString(),
    header,
    caseTitle: tracker.case_title,
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    controlRoom: {
      bestRouteTitle: battleboard.primary_route?.title ?? null,
      routeStatus: battleboard.primary_route?.status ?? null,
      prosecutionWeakness: battleboard.primary_route?.why_it_helps?.slice(0, 4) ?? [],
      defenceRisks: [
        ...(battleboard.primary_route?.collapse_risks ?? []),
        ...(battleboard.global_collapse_risks ?? []),
      ].slice(0, 4),
      immediateActions: battleboard.urgent_next_moves?.slice(0, 4) ?? [],
      safeCourtLine: warRoom.safePositionToday,
      chaseItems: disclosureChase.primaryItems.map((i) => i.label).slice(0, 6),
    },
    battleboard,
    warRoom,
    disclosureChase,
    positionNotes: { savedPosition: null, clientInstructions: null },
    documents: { count: 1, combinedTextLength: bundleText.length, rows: [{ name: tracker.pdf_filename }] },
    bundleText,
  });

  const defendantGot = meta.defendantName ?? header.clientLabel ?? "";
  const offenceGot = meta.offenceDisplay ?? meta.offenceWording ?? header.allegation ?? "";
  const courtGot = meta.court ?? header.court ?? "";
  const isAmberExpected = /amber|provisional/.test(tracker.expected_status);
  const unclearOffence = /unclear|requires review|wording unclear/i.test(tracker.correct_offence_wording);

  const headerIssues: string[] = [];
  const headerBad: string[] = [];
  if (tracker.primary_defendant) {
    const expFn = firstName(tracker.primary_defendant);
    if (expFn && !normName(defendantGot).includes(expFn)) {
      headerIssues.push(`defendant: expected ${tracker.primary_defendant}, got ${defendantGot}`);
      headerBad.push(defendantGot);
    }
  }
  if (/DOB/i.test(defendantGot.replace(/\s+DOB\s+/i, " ")) && !/\sDOB\s/i.test(defendantGot)) {
    headerIssues.push("defendant DOB glue");
    headerBad.push(...lineHits(defendantGot, /DOB/i));
  }
  if (/CourtHearing/i.test(courtGot)) {
    headerIssues.push("court/hearing glue");
    headerBad.push(courtGot);
  }
  if (!unclearOffence && tracker.expected_status === "pass" && offenceGot && !offenceMatchesTracker(tracker, offenceGot)) {
    headerIssues.push(`offence: expected ${tracker.offence_family}, got ${offenceGot.slice(0, 80)}`);
    headerBad.push(offenceGot);
  }
  if (tracker.correct_court && !courtMatches(tracker.correct_court, courtGot) && tracker.expected_status === "pass") {
    headerIssues.push(`court: expected ${tracker.correct_court}, got ${courtGot}`);
    headerBad.push(courtGot);
  }
  if (tracker.correct_hearing && !hearingMatches(tracker.correct_hearing, hearing ?? null) && tracker.expected_status === "pass") {
    headerIssues.push(`hearing: expected ${tracker.correct_hearing}, got ${hearing ?? "none"}`);
    headerBad.push(hearing ?? "");
  }
  surfaces.push({
    surface: "header_metadata",
    status: headerIssues.length ? "fail" : "pass",
    issues: headerIssues,
    badLines: headerBad,
    samples: [offenceGot, defendantGot, courtGot, hearing ?? ""],
  });

  const crText = summary;
  const crIssues = [
    ...collectForbidden(crText).map((h) => `forbidden:${h}`),
    ...checkMustNotSay(tracker, crText),
  ];
  if (isAmberExpected && !isProvisionalText(crText) && !unclearOffence) {
    crIssues.push("amber_expected_but_summary_not_provisional");
  }
  surfaces.push({
    surface: "control_room",
    status: crIssues.length ? "fail" : "pass",
    issues: crIssues,
    badLines: lineHits(crText, /CCTV confirms|MG11 is consistent|Theft, contrary to s\.1/i),
    samples: [crText.slice(0, 350)],
  });

  const bbText = JSON.stringify(battleboard);
  const bbIssues = [
    ...collectForbidden(bbText).map((h) => `forbidden:${h}`),
    ...checkMustNotSay(tracker, bbText),
  ];
  surfaces.push({
    surface: "battleboard",
    status: bbIssues.length ? "fail" : battleboard.primary_route ? "pass" : isAmberExpected ? "amber" : "weak",
    issues: bbIssues,
    badLines: lineHits(bbText, /CCTV confirms|robbery|Theft Act/i).slice(0, 2),
    samples: [battleboard.primary_route?.title ?? ""],
  });

  const wrText = [warRoom.safePositionToday, JSON.stringify(warRoom)].join("\n");
  const wrIssues = [
    ...checkMustNotSay(tracker, wrText),
    ...collectForbidden(wrText).map((h) => `forbidden:${h}`),
  ];
  if (!warRoom.safePositionToday?.trim() && tracker.expected_status === "pass") {
    wrIssues.push("missing safe court line");
  }
  surfaces.push({
    surface: "hearing_war_room",
    status: wrIssues.length ? "fail" : "pass",
    issues: wrIssues,
    badLines: lineHits(wrText, /CCTV confirms|not safely extracted/i),
    samples: [warRoom.safePositionToday?.slice(0, 200) ?? ""],
  });

  const dcText = JSON.stringify(disclosureChase);
  const dcIssues = [
    ...checkMustNotSay(tracker, dcText),
    ...collectForbidden(dcText).map((h) => `forbidden:${h}`),
  ];
  if ((disclosureChase.primaryItems?.length ?? 0) === 0 && !isAmberExpected) {
    dcIssues.push("no chase items");
  }
  surfaces.push({
    surface: "disclosure_chase",
    status: dcIssues.length ? "fail" : (disclosureChase.primaryItems?.length ?? 0) === 0 ? "weak" : "pass",
    issues: dcIssues,
    badLines: [],
    samples: disclosureChase.primaryItems.map((i) => i.label).slice(0, 4),
  });

  const pmIssues: string[] = [];
  if (!proofMap.available && tracker.expected_status === "pass") pmIssues.push("proof map empty");
  const pmText = JSON.stringify(proofMap);
  pmIssues.push(...checkMustNotSay(tracker, pmText));
  const pmStatus: SurfaceResult["status"] =
    pmIssues.length && /invented_supply/.test(pmIssues.join(" ")) && /amber|provisional/.test(tracker.expected_status)
      ? "amber"
      : pmIssues.length
        ? pmIssues.includes("proof map empty")
          ? "weak"
          : "fail"
        : "pass";
  surfaces.push({
    surface: "proof_map",
    status: pmStatus,
    issues: pmIssues,
    badLines: [],
    samples: [proofMap.available ? proofMap.charge : ""],
  });

  const qaIssues = [
    ...collectForbidden(qaMd).map((h) => `forbidden:${h}`),
    ...checkMustNotSay(tracker, qaMd),
  ];
  surfaces.push({
    surface: "qa_export",
    status: qaIssues.length ? "fail" : "pass",
    issues: qaIssues,
    badLines: lineHits(qaMd, /CCTV confirms|MG11 is consistent|fictional/i),
    samples: [qaMd.slice(0, 280)],
  });

  const ctIssues: string[] = [];
  if (tracker.correct_hearing && tracker.expected_status === "pass") {
    if (!hearingMatches(tracker.correct_hearing, hearing ?? null)) {
      ctIssues.push(`hearing not extracted for court today: ${hearing ?? "none"}`);
    }
  }
  surfaces.push({
    surface: "court_today",
    status: ctIssues.length ? "fail" : "pass",
    issues: ctIssues,
    badLines: [hearing ?? ""],
    samples: [hearing ?? ""],
  });

  const clIssues: string[] = [];
  const caseCard = header.clientLabel || tracker.case_title;
  if (tracker.primary_defendant && !normName(caseCard).includes(firstName(tracker.primary_defendant))) {
    clIssues.push(`cases list would not show ${tracker.primary_defendant}`);
  }
  surfaces.push({
    surface: "cases_list",
    status: clIssues.length ? "fail" : "pass",
    issues: clIssues,
    badLines: [caseCard],
    samples: [caseCard],
  });

  const docIssues: string[] = [];
  if (bundleText.length < 80) docIssues.push("thin bundle text");
  if (tracker.correct_hearing && tracker.expected_status === "pass" && !hearingMatches(tracker.correct_hearing, hearing ?? null)) {
    docIssues.push("hearing not on documents path");
  }
  surfaces.push({
    surface: "documents",
    status: docIssues.length ? "fail" : "pass",
    issues: docIssues,
    badLines: [],
    samples: [String(bundleText.length), hearing ?? ""],
  });

  const failCount = surfaces.filter((s) => s.status === "fail").length;
  const amberCount = surfaces.filter((s) => s.status === "amber").length;
  let overall: PdfResult["overall"];
  if (failCount > 0) {
    overall = isAmberExpected && failCount <= 2 && surfaces.every((s) => s.status !== "fail" || s.surface === "header_metadata")
      ? "amber"
      : "fail";
  } else if (amberCount > 0 || isAmberExpected) {
    overall = "amber";
  } else if (surfaces.some((s) => s.status === "weak")) {
    overall = "weak";
  } else {
    overall = "pass";
  }

  if (isAmberExpected && failCount === 0) overall = "amber";

  return {
    ref: tracker.ref,
    label,
    pdfPath,
    extractLen: bundleText.length,
    trackerStatus: tracker.expected_status,
    overall,
    surfaces,
    metadata: {
      defendant: defendantGot,
      offence: offenceGot,
      court: courtGot,
      hearing: hearing ?? "",
      stage: meta.stage ?? header.stage ?? tracker.stage,
    },
  };
}

async function main(): Promise<void> {
  const tracker = loadTracker();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results: PdfResult[] = [];
  for (const row of tracker) {
    process.stdout.write(`Assessing ${row.ref}...\n`);
    results.push(await assessPdf(row));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    pdfDir: PDF_DIR,
    trackerCsv: TRACKER_CSV,
    total: results.length,
    pass: results.filter((r) => r.overall === "pass").length,
    weak: results.filter((r) => r.overall === "weak").length,
    amber: results.filter((r) => r.overall === "amber").length,
    fail: results.filter((r) => r.overall === "fail").length,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, weak: report.weak, amber: report.amber, fail: report.fail }, null, 2));
  for (const r of results) {
    console.log(`  ${r.overall.toUpperCase().padEnd(5)} ${r.ref} tracker=${r.trackerStatus}`);
    for (const s of r.surfaces.filter((x) => x.status === "fail")) {
      console.log(`         FAIL ${s.surface}: ${s.issues.join("; ")}`);
    }
  }
  process.exit(report.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
