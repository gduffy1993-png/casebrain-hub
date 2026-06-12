/**
 * Gold 7 — QA pack export gate (normal-user path from bundle text).
 * Run: npx tsx scripts/gold-7-qa-pack-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
} from "../lib/criminal/bundle-truth-ledger";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import {
  loadGoldPack,
  readBundleText,
} from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";
import { runBundleFidelityCheck } from "../lib/eval/casebrain-auditor/bundle-fidelity-run";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "gold-7");

const FORBIDDEN_PHRASE_RES = [
  /Full CCTV confirms Crown timing/i,
  /\bMG11 is consistent and served\b/i,
  /CAD\/999 timing supports Crown sequence/i,
  /Complainant injury account is consistent across MG11 and medical material/i,
  /SCANNED CONTINUATION/i,
  /\bMG6C\/\d{3}[A-Za-z]/,
  /\bnot servedMay\b/i,
  /\babsentInjury\b/i,
];

type GateResult = {
  bundleId: string;
  label: string;
  skipped: boolean;
  skipReason?: string;
  fidelityOverall: string;
  qaSafety: "pass" | "fail";
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

function runCase(entry: {
  truthKey: BundleFidelityTruthKey;
  bundleTextPaths: string[];
}): GateResult {
  const truth = entry.truthKey;
  if (!entry.bundleTextPaths.length) {
    return {
      bundleId: truth.bundleId,
      label: truth.label ?? truth.bundleId,
      skipped: true,
      skipReason: "no bundle text",
      fidelityOverall: "skipped",
      qaSafety: "pass",
      forbiddenHits: [],
    };
  }

  const bundleText = readBundleText(entry.bundleTextPaths);
  const fidelity = runBundleFidelityCheck(entry);

  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const battleboard = buildStrategyBattleboard({
    case_id: truth.bundleId,
    bundle_text: bundleText,
    offence_label: header.allegation,
  });
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
    if (re.test(md)) forbiddenHits.push(re.source);
  }

  const chargeIssue = chargeLooksOk(truth, md);
  if (chargeIssue) forbiddenHits.push(chargeIssue);
  if (!defendantInPack(truth, md)) forbiddenHits.push(`defendant not found: ${truth.defendant}`);

  if (!truth.expectedProvisionalStatus && truth.expectedRouteFamily) {
    const battleboardSection = md.match(/## 2\. Battleboard[\s\S]*?(?=## 3\.)/)?.[0] ?? "";
    const prosecutionWeakness =
      md.match(/\*\*Prosecution weakness:\*\*[\s\S]*?(?=\*\*Defence risks)/)?.[0] ?? "";
    const strategySlice = `${battleboardSection}\n${prosecutionWeakness}`;
    for (const fam of truth.prohibitedFamilies ?? []) {
      const re =
        fam === "fraud_account_control"
          ? /\bfraud\b.*\b(account|bank|device)\b/i
          : fam === "pwits_phone_attribution"
            ? /\bpwits\b/i
            : fam === "robbery_identification"
              ? /\brobbery\b.*\bidentification\b/i
              : fam === "violence_domestic_assault"
                ? /\bdomestic assault\b/i
                : null;
      if (re?.test(strategySlice) && /\*\*Primary route:\*\*/i.test(strategySlice)) {
        forbiddenHits.push(`prohibited family drift: ${fam}`);
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = truth.bundleId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const outfile = path.join(OUT_DIR, `${slug}.md`);
  fs.writeFileSync(outfile, md);

  return {
    bundleId: truth.bundleId,
    label: truth.label ?? truth.bundleId,
    skipped: false,
    fidelityOverall: fidelity.overall,
    qaSafety: forbiddenHits.length ? "fail" : "pass",
    forbiddenHits,
    outfile,
  };
}

function main(): void {
  const results = loadGoldPack().map(runCase);
  const passed = results.filter((r) => !r.skipped && r.qaSafety === "pass" && r.fidelityOverall === "pass");
  const failed = results.filter((r) => !r.skipped && (r.qaSafety === "fail" || r.fidelityOverall !== "pass"));

  const report = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    qaPass: passed.length,
    qaFail: failed.length,
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  console.log("");
  console.log("Gold 7 QA pack gate");
  console.log("==================");
  for (const r of results) {
    if (r.skipped) {
      console.log(`  SKIP  ${r.bundleId} — ${r.skipReason}`);
      continue;
    }
    const tag = r.qaSafety === "pass" && r.fidelityOverall === "pass" ? "PASS" : "FAIL";
    console.log(`  ${tag}  ${r.bundleId} (fidelity: ${r.fidelityOverall}, qa: ${r.qaSafety})`);
    for (const h of r.forbiddenHits) console.log(`         ↳ ${h}`);
  }
  console.log("");
  console.log(`Summary: ${passed.length}/${results.length} full pass`);
  console.log("Reports:", OUT_DIR);
  console.log("");

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
