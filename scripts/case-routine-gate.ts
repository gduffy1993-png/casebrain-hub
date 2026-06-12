/**
 * Case Routine Gate — factory checklist on every runnable gold shape.
 * Run: npx tsx scripts/case-routine-gate.ts
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
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import {
  loadGoldPack,
  readBundleText,
  type BundleFidelityGoldEntry,
} from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";
import { runBundleFidelityCheck } from "../lib/eval/casebrain-auditor/bundle-fidelity-run";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "case-routine-gate");
const SHAPES_PATH = path.join(process.cwd(), "docs", "case-routine-gate", "shapes.json");
const DEMO_BAR_MIN = 8;

const FORBIDDEN_PHRASE_RES = [
  /Full CCTV confirms Crown timing/i,
  /\bMG11 is consistent and served\b/i,
  /CAD\/999 timing supports Crown sequence/i,
  /Complainant injury account is consistent across MG11 and medical material/i,
  /SCANNED CONTINUATION/i,
  /\bMG6C\/\d{3}[A-Za-z]/,
  /\bnot servedMay\b/i,
  /\babsentInjury\b/i,
  /✅\s*Appropriate adult not required/i,
];

type RoutineCheck = {
  id: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
};

type GateResult = {
  bundleId: string;
  label: string;
  skipped: boolean;
  skipReason?: string;
  fidelityOverall: string;
  routinePass: boolean;
  checks: RoutineCheck[];
  forbiddenHits: string[];
  outfile?: string;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function chargeLooksOk(truth: BundleFidelityTruthKey, md: string): string | null {
  const keywords = truth.chargeKeywords ?? [];
  const chargeStr = typeof truth.charge === "string" ? truth.charge : "";
  const body = norm(md);
  const hits = keywords.filter((k) => body.includes(norm(k)));
  if (chargeStr && body.includes(norm(chargeStr).slice(0, 24))) return null;
  if (hits.length >= Math.min(2, keywords.length) || hits.length >= 1) return null;
  return `charge keywords missing in QA pack (${keywords.join(", ")})`;
}

function defendantInPack(truth: BundleFidelityTruthKey, md: string): boolean {
  const names = [truth.defendant, ...(truth.aliases ?? [])].map(norm);
  const body = norm(md);
  return names.some((n) => n.length >= 3 && body.includes(n));
}

function offenceNotTruncated(meta: ReturnType<typeof extractBundleCaseMetadata>): string | null {
  const o = meta.offenceDisplay ?? meta.offenceWording ?? "";
  if (!o) return "offence not extracted";
  if (/\bwounding with intent to cause grievous\b/i.test(o) && !/\bbodily harm\b/i.test(o)) {
    return `offence truncated: ${o}`;
  }
  return null;
}

function hearingExtracted(
  truth: BundleFidelityTruthKey,
  meta: ReturnType<typeof extractBundleCaseMetadata>,
  header: ReturnType<typeof resolveCaseHeaderMetadata>,
): string | null {
  if (!truth.hearingDate) return null;
  if (meta.nextHearingRaw || meta.nextHearingIso) return null;
  if (header.nextHearing && !/not safely extracted/i.test(header.nextHearing)) return null;
  return `hearing expected (${truth.hearingDate}) but not extracted`;
}

function runCase(entry: BundleFidelityGoldEntry): GateResult {
  const truth = entry.truthKey;
  const checks: RoutineCheck[] = [];

  if (!entry.bundleTextPaths.length) {
    return {
      bundleId: truth.bundleId,
      label: truth.label ?? truth.bundleId,
      skipped: true,
      skipReason: "no bundle text (linked-only shape)",
      fidelityOverall: "skipped",
      routinePass: true,
      checks: [{ id: "link", status: "skip", detail: "linked-only" }],
      forbiddenHits: [],
    };
  }

  const bundleText = readBundleText(entry.bundleTextPaths);
  const meta = extractBundleCaseMetadata(bundleText);
  const fidelity = runBundleFidelityCheck(entry);

  checks.push({
    id: "fidelity",
    status: fidelity.overall === "pass" ? "pass" : fidelity.overall === "needs_review" ? "pass" : "fail",
    detail: fidelity.overall,
  });

  const truncIssue = offenceNotTruncated(meta);
  checks.push({
    id: "offence_complete",
    status: truncIssue ? "fail" : meta.offenceDisplay || meta.offenceWording ? "pass" : "fail",
    detail: truncIssue ?? meta.offenceDisplay ?? meta.offenceWording ?? "missing",
  });

  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const hearingIssue = hearingExtracted(truth, meta, header);
  checks.push({
    id: "hearing",
    status: hearingIssue ? "fail" : truth.hearingDate ? "pass" : "skip",
    detail: hearingIssue ?? meta.nextHearingRaw ?? header.nextHearing ?? "n/a",
  });

  checks.push({
    id: "defendant",
    status: meta.defendantName ? "pass" : "fail",
    detail: meta.defendantName ?? "missing",
  });

  const rawBattleboard = buildStrategyBattleboard({
    case_id: truth.bundleId,
    bundle_text: bundleText,
    offence_label: header.allegation,
  });
  const battleboard = guardBattleboardOutput(rawBattleboard, { ledger, bundleText });
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const disclosureChase = buildDisclosureChaseBrief({
    caseId: truth.bundleId,
    caseTitle: truth.label ?? `R v ${truth.defendant}`,
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
    caseId: truth.bundleId,
    caseTitle: truth.label ?? `R v ${truth.defendant}`,
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

  const paceInSummary = /✅\s*Appropriate adult not required/i.test(summary);
  checks.push({
    id: "summary_safe",
    status: paceInSummary ? "fail" : "pass",
    detail: paceInSummary ? "PACE tick line in summary" : "ok",
  });

  const primary = battleboard.primary_route;
  const md = buildCaseQaPackMarkdown({
    caseId: truth.bundleId,
    caseLabel: truth.label ?? truth.bundleId,
    exportedAt: new Date().toISOString(),
    header,
    caseTitle: truth.label ?? `R v ${truth.defendant}`,
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    controlRoom: {
      bestRouteTitle: primary?.title ?? null,
      routeStatus: primary?.status ?? null,
      prosecutionWeakness: primary?.why_it_helps?.slice(0, 4) ?? [],
      defenceRisks: [
        ...(primary?.collapse_risks ?? []),
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
    documents: {
      count: 1,
      combinedTextLength: bundleText.length,
      rows: [{ name: `${truth.bundleId}.md` }],
    },
    bundleText,
  });

  const forbiddenHits: string[] = [];
  for (const re of FORBIDDEN_PHRASE_RES) {
    if (re.test(md) || re.test(summary)) forbiddenHits.push(re.source);
  }

  const chargeIssue = chargeLooksOk(truth, md);
  if (chargeIssue) forbiddenHits.push(chargeIssue);
  if (!defendantInPack(truth, md)) forbiddenHits.push(`defendant not found: ${truth.defendant}`);

  checks.push({
    id: "qa_safety",
    status: forbiddenHits.length ? "fail" : "pass",
    detail: forbiddenHits.length ? forbiddenHits.join("; ") : "ok",
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = truth.bundleId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const outfile = path.join(OUT_DIR, `${slug}.md`);
  fs.writeFileSync(outfile, md);

  const failedChecks = checks.filter((c) => c.status === "fail");
  const routinePass = failedChecks.length === 0 && forbiddenHits.length === 0;

  return {
    bundleId: truth.bundleId,
    label: truth.label ?? truth.bundleId,
    skipped: false,
    fidelityOverall: fidelity.overall,
    routinePass,
    checks,
    forbiddenHits,
    outfile,
  };
}

function main(): void {
  const shapes = fs.existsSync(SHAPES_PATH)
    ? (JSON.parse(fs.readFileSync(SHAPES_PATH, "utf8")) as { demoBarMinPass?: number })
    : { demoBarMinPass: DEMO_BAR_MIN };
  const demoBar = shapes.demoBarMinPass ?? DEMO_BAR_MIN;

  const results = loadGoldPack().map(runCase);
  const runnable = results.filter((r) => !r.skipped);
  const passed = runnable.filter((r) => r.routinePass);
  const failed = runnable.filter((r) => !r.routinePass);

  const report = {
    generatedAt: new Date().toISOString(),
    demoBarMinPass: demoBar,
    demoBarMet: passed.length >= demoBar,
    total: results.length,
    runnable: runnable.length,
    routinePass: passed.length,
    routineFail: failed.length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  console.log("");
  console.log("Case Routine Gate");
  console.log("=================");
  for (const r of results) {
    if (r.skipped) {
      console.log(`  SKIP  ${r.bundleId} — ${r.skipReason}`);
      continue;
    }
    const tag = r.routinePass ? "PASS" : "FAIL";
    console.log(`  ${tag}  ${r.bundleId} (fidelity: ${r.fidelityOverall})`);
    for (const c of r.checks.filter((x) => x.status === "fail")) {
      console.log(`         ↳ ${c.id}: ${c.detail}`);
    }
    for (const h of r.forbiddenHits) console.log(`         ↳ ${h}`);
  }
  console.log("");
  console.log(`Routine pass: ${passed.length}/${runnable.length} runnable shapes`);
  console.log(`Demo bar (${demoBar} green): ${report.demoBarMet ? "MET" : "NOT MET"}`);
  console.log("Reports:", OUT_DIR);
  console.log("");

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
