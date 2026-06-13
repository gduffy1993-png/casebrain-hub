/**
 * Batch 1 public-style PDF factory loop (CB-TB packs).
 * Run: npx tsx scripts/batch-1-factory-loop.ts
 * PDF dir: BATCH1_PDF_DIR env or docs/public-style-bundles/batch-1
 * Report: artifacts/casebrain-qa/batch-1-factory/report.json (gitignored)
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
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildProductProofMap } from "../lib/criminal/proof-map/build-product-proof-map";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { extractTextFromFileBuffer } from "../lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PDF_DIR =
  process.env.BATCH1_PDF_DIR ??
  path.join(ROOT, "docs/public-style-bundles/batch-1");
const OUT_DIR = path.join(ROOT, "artifacts/casebrain-qa/batch-1-factory");

/** Manifest: ref + filename only — expected fields parsed from PDF text. */
const BATCH1_PACKS: Array<{ ref: string; file: string; label: string }> = [
  { ref: "CB-TB-01", file: "CB-TB-01_Ryan_Hale.pdf", label: "Ryan Hale — robbery / first appearance" },
  { ref: "CB-TB-02", file: "CB-TB-02_Liam_Parker.pdf", label: "Liam Parker — theft / cafe" },
  { ref: "CB-TB-03", file: "CB-TB-03_Ashleigh_Merritt.pdf", label: "Ashleigh Merritt — shop theft" },
  { ref: "CB-TB-04", file: "CB-TB-04_Paige_Thornton.pdf", label: "Paige Thornton — ABH / domestic" },
  { ref: "CB-TB-08", file: "CB-TB-08_Aaron_Ross.pdf", label: "Aaron Ross — affray + emergency worker assault" },
  { ref: "CB-TB-10", file: "CB-TB-10_Neil_Mitchell.pdf", label: "Neil Mitchell — fraud by false representation" },
  { ref: "CB-TB-14", file: "CB-TB-14_James_Patterson.pdf", label: "James Patterson — s18 Crown Court" },
  { ref: "CB-TB-16", file: "CB-TB-16_Kian_Doyle.pdf", label: "Kian Doyle — PWITS / phone attribution" },
  { ref: "CB-TB-19", file: "CB-TB-19_Ella_Shaw.pdf", label: "Ella Shaw — dangerous driving" },
  { ref: "CB-TB-22", file: "CB-TB-22_Sam_Okonkwo.pdf", label: "Sam Okonkwo — unclear POCA / criminal property" },
];

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
  { id: "training_banner", re: /\b(TRAINING\s*\/\s*TEST\s+BUNDLE|NO REAL CASE|not a real disclosure|test bundle)\b/i },
  { id: "offence_as_tag_ocr", re: /\(s\)\s*as\s*tag:/i },
  { id: "mg6c_glue", re: /\bMG6C\/\d{3}[A-Za-z]/ },
];

type ExpectedSource = {
  ref: string;
  defendant: string | null;
  offenceHint: string | null;
  court: string | null;
  hearing: string | null;
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
  label: string;
  pdfPath: string;
  extractLen: number;
  expected: ExpectedSource;
  overall: "pass" | "weak" | "fail" | "amber";
  surfaces: SurfaceResult[];
  forbiddenHits: string[];
  metadata: Record<string, string | null>;
};

function parseExpectedFromText(text: string, ref: string): ExpectedSource {
  const defLine =
    text.match(/\bDefendant:\s*([A-Z][A-Za-z'’.\-]+(?:\s+[A-Z][A-Za-z'’.\-]+){0,3})/i)?.[1]?.trim() ??
    text.match(/\bClient:\s*([A-Z][A-Za-z'’.\-]+(?:\s+[A-Z][A-Za-z'’.\-]+){0,3})/i)?.[1]?.trim() ??
    text.match(/\bR v\s+([A-Z][A-Za-z'’.\-]+(?:\s+[A-Z][A-Za-z'’.\-]+){0,3})/i)?.[1]?.trim() ??
    null;

  const matterLabel = text.match(/\bMatter Label:\s*(.+)/i)?.[1]?.trim() ?? null;
  const chargeBlock =
    text.match(/\b(?:Statement of offence|Charge|Offence)\s*:?\s*([^\n]{8,180})/i)?.[1]?.trim() ?? matterLabel;

  const court =
    text.match(/\b(?:Court|Venue|Listing court)\s*:?\s*([^\n|]{6,120})/i)?.[1]?.trim() ??
    text.match(/\b(?:Magistrates|Crown Court)[^\n]{0,80}/i)?.[0]?.trim() ??
    null;

  const hearing =
    text.match(/\b(?:Next hearing|Hearing date|Date of hearing|Listed for)\s*:?\s*([^\n|]{6,80})/i)?.[1]?.trim() ??
    text.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2})?)/i)?.[1]?.trim() ??
    null;

  const stage =
    text.match(/\b(?:Stage|Current Stage|Stage Signal)\s*:?\s*([^\n|]{4,80})/i)?.[1]?.trim() ??
    text.match(/\b(first appearance|IDPC|PTPH|trial preparation|Crown Court)\b/i)?.[0]?.trim() ??
    null;

  return {
    ref,
    defendant: defLine?.replace(/\s+/g, " ").trim() ?? null,
    offenceHint: chargeBlock?.replace(/\s+/g, " ").trim() ?? null,
    court,
    hearing,
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

function firstName(s: string | null): string {
  return normName(s).split(" ")[0] ?? "";
}

function offenceWordMatch(expected: string | null, got: string | null): boolean {
  if (!expected || !got) return true;
  if (/^(plea|and hearing|not yet|matter reference)/i.test(expected.trim())) return true;
  const words = expected.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const key = words.find(
    (w) =>
      !/contrary|section|theft|act|1861|1968|2006|oapa|court|first|appearance|plea|hearing|indicated|property|proceeds/.test(
        w,
      ),
  );
  if (!key) return true;
  return got.toLowerCase().includes(key.slice(0, Math.min(5, key.length)));
}

async function assessPdfAsync(pack: (typeof BATCH1_PACKS)[number]): Promise<PdfResult> {
  const pdfPath = path.join(PDF_DIR, pack.file);
  if (!fs.existsSync(pdfPath)) {
    return {
      ref: pack.ref,
      label: pack.label,
      pdfPath,
      extractLen: 0,
      expected: parseExpectedFromText("", pack.ref),
      overall: "fail",
      surfaces: [{ surface: "extract", status: "fail", issues: [`PDF missing: ${pack.file}`], samples: [] }],
      forbiddenHits: [],
      metadata: {},
    };
  }

  const buffer = fs.readFileSync(pdfPath);
  let bundleText = "";
  let extractIssue: string | null = null;
  try {
    bundleText = await extractTextFromFileBuffer(pack.file, "application/pdf", buffer);
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
      ref: pack.ref,
      label: pack.label,
      pdfPath,
      extractLen: bundleText.length,
      expected: parseExpectedFromText(bundleText, pack.ref),
      overall: "amber",
      surfaces,
      forbiddenHits,
      metadata: {},
    };
  }

  const expected = parseExpectedFromText(bundleText, pack.ref);
  const meta = extractBundleCaseMetadata(bundleText);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const rawBattleboard = buildStrategyBattleboard({
    case_id: pack.ref,
    bundle_text: bundleText,
    offence_label: header.allegation,
  });
  const battleboard = guardBattleboardOutput(rawBattleboard, { ledger, bundleText });
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const disclosureChase = buildDisclosureChaseBrief({
    caseId: pack.ref,
    caseTitle: header.clientLabel ? `R v ${header.clientLabel}` : pack.ref,
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
    caseId: pack.ref,
    caseTitle: header.clientLabel ? `R v ${header.clientLabel}` : pack.ref,
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
    matterLabel: header.clientLabel ? `R v ${header.clientLabel}` : pack.ref,
    allegation: header.allegation,
  });

  const qaMd = buildCaseQaPackMarkdown({
    caseId: pack.ref,
    caseLabel: pack.ref,
    exportedAt: new Date().toISOString(),
    header,
    caseTitle: header.clientLabel ? `R v ${header.clientLabel}` : pack.ref,
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
    documents: { count: 1, combinedTextLength: bundleText.length, rows: [{ name: pack.file }] },
    bundleText,
  });

  const allText = [summary, qaMd, warRoom.safePositionToday, battleboard.solicitor_safe_summary ?? ""].join("\n");
  forbiddenHits.push(...collectForbidden(allText));

  const headerIssues: string[] = [];
  if (expected.defendant) {
    const expFn = firstName(expected.defendant);
    const gotFn = firstName(meta.defendantName ?? header.clientLabel);
    if (expFn && gotFn && expFn !== gotFn && !normName(meta.defendantName ?? header.clientLabel).includes(expFn)) {
      headerIssues.push(`defendant mismatch: expected ${expected.defendant}, got ${meta.defendantName ?? header.clientLabel}`);
    }
  }
  if (!meta.offenceDisplay && !meta.offenceWording) {
    headerIssues.push("offence not extracted");
  }
  const offenceGot = meta.offenceDisplay ?? meta.offenceWording ?? header.allegation ?? "";
  if (expected.offenceHint && offenceGot && !offenceWordMatch(expected.offenceHint, offenceGot)) {
    headerIssues.push(`offence may not match papers: ${expected.offenceHint.slice(0, 60)} vs ${offenceGot.slice(0, 60)}`);
  }
  if (expected.court && !meta.court && !header.court) {
    headerIssues.push("court on papers but not extracted");
  }
  surfaces.push({
    surface: "header_metadata",
    status: headerIssues.length ? "fail" : "pass",
    issues: headerIssues,
    samples: [offenceGot, meta.defendantName ?? header.clientLabel ?? "", meta.court ?? header.court ?? ""],
  });

  const crIssues: string[] = [];
  if (forbiddenHits.length) crIssues.push(...forbiddenHits.map((h) => `forbidden:${h}`));
  if (policeQuoteInSummary(summary)) crIssues.push("raw_police_quote_in_summary");
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

  const ctIssues: string[] = [];
  if (expected.hearing) {
    if (!hearing || /not safely extracted|no hearing date/i.test(hearing)) {
      ctIssues.push(`hearing on papers (${expected.hearing}) but not extracted`);
    }
  } else if (!hearing || /not safely extracted/i.test(hearing)) {
    ctIssues.push("hearing not extracted — review bucket");
  }
  surfaces.push({
    surface: "court_today_sim",
    status: ctIssues.length ? (expected.hearing ? "fail" : "amber") : "pass",
    issues: ctIssues,
    samples: [hearing ?? "none", expected.hearing ?? "none on papers"],
  });

  const clIssues: string[] = [];
  if (expected.defendant && !header.clientLabel.toLowerCase().includes(firstName(expected.defendant))) {
    clIssues.push(`case card would not show ${expected.defendant}`);
  }
  surfaces.push({
    surface: "cases_list_sim",
    status: clIssues.length ? "fail" : "pass",
    issues: clIssues,
    samples: [header.clientLabel, expected.defendant ?? ""],
  });

  const failCount = surfaces.filter((s) => s.status === "fail").length;
  const amberCount = surfaces.filter((s) => s.status === "amber").length;
  const overall: PdfResult["overall"] =
    failCount > 0 ? "fail" : amberCount > 0 ? "amber" : surfaces.some((s) => s.status === "weak") ? "weak" : "pass";

  return {
    ref: pack.ref,
    label: pack.label,
    pdfPath,
    extractLen: bundleText.length,
    expected,
    overall,
    surfaces,
    forbiddenHits: [...new Set(forbiddenHits)],
    metadata: {
      defendant: meta.defendantName ?? header.clientLabel,
      offence: offenceGot,
      court: meta.court ?? header.court,
      hearing: meta.nextHearingRaw ?? hearing,
      stage: meta.stage ?? header.stage ?? expected.stage,
    },
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results: PdfResult[] = [];
  for (const pack of BATCH1_PACKS) {
    console.log(`Assessing ${pack.ref}...`);
    results.push(await assessPdfAsync(pack));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    pdfDir: PDF_DIR,
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
