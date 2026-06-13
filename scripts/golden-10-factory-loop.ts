/**
 * Golden 10 PDF factory loop — assess all surfaces from PDF extract (production text path).
 * Run: npx tsx scripts/golden-10-factory-loop.ts
 * Report: artifacts/casebrain-qa/golden-10-factory/report.json (gitignored)
 */
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCaseSummarySnippet } from "../lib/criminal/build-case-summary-snippet";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  guardBattleboardOutput,
} from "../lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildProductProofMap } from "../lib/criminal/proof-map/build-product-proof-map";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { extractTextFromFileBuffer } from "../lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PDF_DIR = path.join(ROOT, "docs/fictional-golden-10");
const OUT_DIR = path.join(ROOT, "artifacts/casebrain-qa/golden-10-factory");

const GOLDEN_REFS = [
  "NS-CPS-2026-0431",
  "NS-CPS-2026-0432",
  "NS-CPS-2026-0433",
  "NS-CPS-2026-0434",
  "NS-CPS-2026-0435",
  "NS-CPS-2026-0436",
  "NS-CPS-2026-0437",
  "NS-CPS-2026-0438",
  "NS-CPS-2026-0439",
  "NS-CPS-2026-0440",
];

const FORBIDDEN_RES: Array<{ id: string; re: RegExp }> = [
  { id: "full_cctv_confirms", re: /Full CCTV confirms Crown timing/i },
  { id: "mg11_served", re: /\bMG11 is consistent and served\b/i },
  { id: "cad_999_sequence", re: /CAD\/999 timing supports Crown sequence/i },
  { id: "injury_consistent", re: /Complainant injury account is consistent across MG11 and medical material/i },
  { id: "scanned_continuation", re: /SCANNED CONTINUATION/i },
  { id: "pace_emoji", re: /✅\s*Appropriate adult not required/i },
  { id: "internal_eval", re: /\b(fictional training data|gold\s*7|eval\s+pack|pilot\s+mode|gauntlet|CB-TEST|CB-GOLD|stress\s+pack|sam\.pilot|primary eval hook)\b/i },
  { id: "offence_as_tag_ocr", re: /\(s\)\s*as\s*tag:/i },
  { id: "mg6c_glue", re: /\bMG6C\/\d{3}[A-Za-z]/ },
];

type ExpectedSource = {
  ref: string;
  defendant: string | null;
  offenceTag: string | null;
  stage: string | null;
};

type SurfaceResult = {
  surface: string;
  status: "pass" | "weak" | "fail" | "amber";
  issues: string[];
  samples: string[];
};

type PdfResult = {
  ref: string;
  pdfPath: string;
  extractLen: number;
  expected: ExpectedSource;
  overall: "pass" | "weak" | "fail" | "amber";
  surfaces: SurfaceResult[];
  forbiddenHits: string[];
  metadata: Record<string, string | null>;
};

function parseExpectedFromText(text: string, ref: string): ExpectedSource {
  const accused = text.match(/\bAccused:\s*([A-Z][A-Z\s'’.\-]+?)(?:\s*\(DOB|\s*\n)/i)?.[1]?.trim() ?? null;
  const defLine = text.match(/\bDefendant:\s*([A-Z][A-Z\s'’.\-]+)/i)?.[1]?.trim();
  const shortTitle = text.match(/\bShort title:\s*(.+)/i)?.[1]?.trim() ?? null;
  const stage = text.match(/\bStage:\s*([^|\n]+)/i)?.[1]?.trim() ?? null;
  return {
    ref,
    defendant: (accused ?? defLine)?.replace(/\s+/g, " ").trim() ?? null,
    offenceTag: shortTitle,
    stage,
  };
}

function collectForbidden(text: string): string[] {
  const hits: string[] = [];
  for (const { id, re } of FORBIDDEN_RES) {
    if (re.test(text)) hits.push(id);
  }
  return hits;
}

function policeQuoteInSummary(summary: string): boolean {
  return /\b(?:PC|DS|DC|DI|Sgt|Insp)\s+[A-Z][a-z]+:\s*"/.test(summary) || /identified you from CCTV stills/i.test(summary);
}

function normName(s: string | null): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function assessPdf(ref: string): PdfResult {
  const pdfPath = path.join(PDF_DIR, `${ref}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    return {
      ref,
      pdfPath,
      extractLen: 0,
      expected: parseExpectedFromText("", ref),
      overall: "fail",
      surfaces: [{ surface: "extract", status: "fail", issues: ["PDF missing"], samples: [] }],
      forbiddenHits: [],
      metadata: {},
    };
  }

  const buffer = fs.readFileSync(pdfPath);
  let bundleText = "";
  try {
    bundleText = ""; // sync placeholder — filled below in async main
  } catch {
    /* async */
  }

  return {
    ref,
    pdfPath,
    extractLen: 0,
    expected: parseExpectedFromText("", ref),
    overall: "fail",
    surfaces: [],
    forbiddenHits: [],
    metadata: {},
  };
}

async function assessPdfAsync(ref: string): Promise<PdfResult> {
  const pdfPath = path.join(PDF_DIR, `${ref}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    return {
      ref,
      pdfPath,
      extractLen: 0,
      expected: parseExpectedFromText("", ref),
      overall: "fail",
      surfaces: [{ surface: "extract", status: "fail", issues: ["PDF missing"], samples: [] }],
      forbiddenHits: [],
      metadata: {},
    };
  }

  const buffer = fs.readFileSync(pdfPath);
  let bundleText = "";
  let extractIssue: string | null = null;
  try {
    bundleText = await extractTextFromFileBuffer(`${ref}.pdf`, "application/pdf", buffer);
    if (!bundleText.trim() || bundleText.length < 80) {
      extractIssue = `thin extract (${bundleText.length} chars)`;
    }
  } catch (e) {
    extractIssue = e instanceof Error ? e.message : String(e);
  }

  const surfaces: SurfaceResult[] = [];
  const forbiddenHits: string[] = [];

  if (extractIssue) {
    surfaces.push({
      surface: "extract",
      status: "amber",
      issues: [extractIssue],
      samples: [bundleText.slice(0, 200)],
    });
    return {
      ref,
      pdfPath,
      extractLen: bundleText.length,
      expected: parseExpectedFromText(bundleText, ref),
      overall: "amber",
      surfaces,
      forbiddenHits,
      metadata: {},
    };
  }

  const expected = parseExpectedFromText(bundleText, ref);
  const meta = extractBundleCaseMetadata(bundleText);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const rawBattleboard = buildStrategyBattleboard({
    case_id: ref,
    bundle_text: bundleText,
    offence_label: header.allegation,
  });
  const battleboard = guardBattleboardOutput(rawBattleboard, { ledger, bundleText });
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const disclosureChase = buildDisclosureChaseBrief({
    caseId: ref,
    caseTitle: `R v ${expected.defendant ?? "Unknown"}`,
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
    caseId: ref,
    caseTitle: `R v ${expected.defendant ?? "Unknown"}`,
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
    matterLabel: `R v ${expected.defendant ?? "Unknown"}`,
    allegation: header.allegation,
  });

  const qaMd = buildCaseQaPackMarkdown({
    caseId: ref,
    caseLabel: ref,
    exportedAt: new Date().toISOString(),
    header,
    caseTitle: `R v ${expected.defendant ?? "Unknown"}`,
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
    documents: { count: 1, combinedTextLength: bundleText.length, rows: [{ name: `${ref}.pdf` }] },
    bundleText,
  });

  const allText = [summary, qaMd, warRoom.safePositionToday, battleboard.solicitor_safe_summary].join("\n");
  forbiddenHits.push(...collectForbidden(allText));

  // --- surface checks ---
  const headerIssues: string[] = [];
  if (expected.defendant) {
    const exp = normName(expected.defendant);
    const got = normName(meta.defendantName ?? header.clientLabel);
    if (!got.includes(exp.split(" ")[0]!) && !exp.includes(got.split(" ")[0]!)) {
      headerIssues.push(`defendant mismatch: expected ${expected.defendant}, got ${meta.defendantName ?? header.clientLabel}`);
    }
  }
  if (!meta.offenceDisplay && !meta.offenceWording) {
    headerIssues.push("offence not extracted");
  }
  if (expected.offenceTag && meta.offenceDisplay) {
    const tagWord = expected.offenceTag.split(/\s+/)[0]!.toLowerCase();
    if (tagWord.length >= 4 && !meta.offenceDisplay.toLowerCase().includes(tagWord.slice(0, 4))) {
      headerIssues.push(`offence may not match tag: ${expected.offenceTag} vs ${meta.offenceDisplay}`);
    }
  }
  surfaces.push({
    surface: "header_metadata",
    status: headerIssues.length ? "fail" : "pass",
    issues: headerIssues,
    samples: [meta.offenceDisplay ?? meta.offenceWording ?? "", meta.defendantName ?? ""],
  });

  const crIssues: string[] = [];
  if (forbiddenHits.length) crIssues.push(...forbiddenHits.map((h) => `forbidden:${h}`));
  if (policeQuoteInSummary(summary)) crIssues.push("raw_police_quote_in_summary");
  if (/not safely extracted/i.test(summary) && meta.defendantName) {
    crIssues.push("summary_thin_despite_metadata");
  }
  surfaces.push({
    surface: "control_room_summary",
    status: crIssues.length ? "fail" : "pass",
    issues: crIssues,
    samples: [summary.slice(0, 400)],
  });

  const bbIssues: string[] = [];
  const bbText = JSON.stringify(battleboard);
  for (const { id, re } of FORBIDDEN_RES) {
    if (re.test(bbText)) bbIssues.push(`forbidden:${id}`);
  }
  surfaces.push({
    surface: "battleboard",
    status: bbIssues.length ? "fail" : battleboard.primary_route ? "pass" : "weak",
    issues: bbIssues,
    samples: [battleboard.primary_route?.title ?? "", ...(battleboard.primary_route?.why_it_helps ?? []).slice(0, 2)],
  });

  const wrIssues: string[] = [];
  if (!warRoom.safePositionToday?.trim()) wrIssues.push("missing safe court line");
  if (forbiddenHits.some((h) => warRoom.safePositionToday.includes(h))) wrIssues.push("unsafe war room line");
  if (header.allegation && warRoom.allegation && normName(header.allegation) !== normName(warRoom.allegation)) {
    wrIssues.push("allegation mismatch vs header");
  }
  surfaces.push({
    surface: "hearing_war_room",
    status: wrIssues.length ? "fail" : "pass",
    issues: wrIssues,
    samples: [warRoom.safePositionToday?.slice(0, 200) ?? "", hearing ?? ""],
  });

  const dcIssues: string[] = [];
  if ((disclosureChase.primaryItems?.length ?? 0) === 0) dcIssues.push("no chase items");
  surfaces.push({
    surface: "disclosure_chase",
    status: dcIssues.length ? "weak" : "pass",
    issues: dcIssues,
    samples: disclosureChase.primaryItems.map((i) => i.label).slice(0, 4),
  });

  const pmIssues: string[] = [];
  if (!proofMap.available || !proofMap.proofPoints?.length) pmIssues.push("proof map empty");
  const pmCharge = proofMap.available ? proofMap.charge : "";
  const pmCount = proofMap.available ? String(proofMap.proofPoints.length) : "0";
  surfaces.push({
    surface: "proof_map",
    status: pmIssues.length ? "weak" : "pass",
    issues: pmIssues,
    samples: [pmCharge, pmCount],
  });

  const qaIssues: string[] = [];
  for (const { id, re } of FORBIDDEN_RES) {
    if (re.test(qaMd)) qaIssues.push(`forbidden:${id}`);
  }
  surfaces.push({
    surface: "qa_export",
    status: qaIssues.length ? "fail" : "pass",
    issues: qaIssues,
    samples: [qaMd.slice(0, 300)],
  });

  // Court today / cases — simulated from hearing extraction
  const ctIssues: string[] = [];
  if (!hearing || /not safely extracted/i.test(hearing)) {
    ctIssues.push("hearing not extracted — would land in review bucket");
  }
  surfaces.push({
    surface: "court_today_sim",
    status: ctIssues.length ? "amber" : "pass",
    issues: ctIssues,
    samples: [hearing ?? "none"],
  });

  surfaces.push({
    surface: "cases_list_sim",
    status:
      expected.defendant &&
      header.clientLabel.toLowerCase().includes(expected.defendant.split(" ")[0]!.toLowerCase())
        ? "pass"
        : "weak",
    issues:
      expected.defendant &&
      !header.clientLabel.toLowerCase().includes(expected.defendant.split(" ")[0]!.toLowerCase())
        ? [`case card would not show ${expected.defendant}`]
        : [],
    samples: [header.clientLabel, `R v ${expected.defendant ?? "?"}`],
  });

  const failCount = surfaces.filter((s) => s.status === "fail").length;
  const amberCount = surfaces.filter((s) => s.status === "amber").length;
  const overall: PdfResult["overall"] =
    failCount > 0 ? "fail" : amberCount > 0 ? "amber" : surfaces.some((s) => s.status === "weak") ? "weak" : "pass";

  return {
    ref,
    pdfPath,
    extractLen: bundleText.length,
    expected,
    overall,
    surfaces,
    forbiddenHits: [...new Set(forbiddenHits)],
    metadata: {
      defendant: meta.defendantName,
      offence: meta.offenceDisplay ?? meta.offenceWording,
      court: meta.court,
      hearing: meta.nextHearingRaw ?? hearing,
      stage: meta.stage ?? header.stage,
    },
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results: PdfResult[] = [];
  for (const ref of GOLDEN_REFS) {
    console.log(`Assessing ${ref}...`);
    results.push(await assessPdfAsync(ref));
  }

  const report = {
    generatedAt: new Date().toISOString(),
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
    console.log(`  ${r.overall.toUpperCase().padEnd(5)} ${r.ref} (${r.extractLen} chars)`);
    for (const s of r.surfaces.filter((x) => x.status !== "pass")) {
      console.log(`         ${s.surface}: ${s.issues.join("; ")}`);
    }
  }
  process.exit(report.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
