/**
 * Phase 2 — Tier A/B gate for bundle contradiction v1 (frozen core non-regression).
 * Run: npx tsx scripts/bundle-contradiction-tier-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildBundleSourcePayload } from "../lib/bundle/parse-bundle-display";
import { assembleBundleTextForContradictions } from "../lib/criminal/reasoning-v2/assemble-bundle-text";
import {
  extractBundleContradictions,
  type BundleContradictionType,
} from "../lib/criminal/extract-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { generateManifestBatch } from "../lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { renderCorpusBundleText } from "../lib/eval/casebrain-auditor/strategy-corpus-render";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "contradiction-tier-gate");

type CaseExpect = {
  id: string;
  label: string;
  text: string;
  mustInclude: BundleContradictionType[];
  mustExclude: BundleContradictionType[];
  assembly?: {
    theoryMust?: RegExp[];
    theoryMustNot?: RegExp[];
    risksMustNot?: RegExp[];
  };
};

const PAIGE_SECTIONED = `
=== SECTION: MG5 ===
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first before the injury occurred.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I did not throw anything at her.
I walked away and she followed… I felt something hit my face… I was bleeding… in the hallway.
`;

const NEIL = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant fraudulently made refunds.

=== SECTION: MG5 ===
MG5 case summary
MG5 total alleged loss is 1,280.40 for the charge period.
CCTV stills are limited to two dates, while the charge covers two months.

=== SECTION: MG11 ===
MG11 – Owen Clarke (store investigator)
My schedule totals 1,084.90.
`;

const TIER_A: CaseExpect[] = [
  {
    id: "paige-sectioned",
    label: "Paige — sectioned MG5/MG11",
    text: PAIGE_SECTIONED,
    mustInclude: ["first_contact", "location"],
    mustExclude: ["loss_figure", "cctv_window"],
    assembly: {
      theoryMust: [/who initiated|denies throwing/i],
      theoryMustNot: [/REQ-/i],
    },
  },
  {
    id: "neil-fraud",
    label: "Neil — loss + CCTV window",
    text: NEIL,
    mustInclude: ["loss_figure", "cctv_window"],
    mustExclude: ["location"],
    assembly: {
      theoryMust: [/1,280|loss figure/i, /cctv|two dates/i],
      theoryMustNot: [/REQ-/i, /appears outstanding/i],
      risksMustNot: [/^Opportunity to/i],
    },
  },
  {
    id: "thin-bundle",
    label: "Thin bundle — no contradictions",
    text: "Cover sheet only. Stage: PTPH. No MG5 body yet.",
    mustInclude: [],
    mustExclude: ["location", "first_contact", "loss_figure", "cctv_window"],
  },
];

function extractViaProdPath(text: string): ReturnType<typeof extractBundleContradictions> {
  const payload = buildBundleSourcePayload([
    { id: "gate", name: "bundle.txt", extracted_text: text },
  ]);
  const assembled = assembleBundleTextForContradictions({
    frontMatterScan: payload.frontMatterScan,
    snippets: payload.snippets,
  });
  return extractBundleContradictions(assembled);
}

function runAssemblyGate(
  c: CaseExpect,
  contra: ReturnType<typeof extractBundleContradictions>,
): string[] {
  const failures: string[] = [];
  if (!c.assembly) return failures;

  const bb = buildStrategyBattleboard({
    case_id: c.id,
    bundle_text: c.text,
    offence_label: null,
  });
  const war = buildHearingWarRoomBrief({
    caseId: c.id,
    caseTitle: c.label,
    clientLabel: "Client",
    allegation: "Test",
    stage: "PTPH",
    hearingStatus: "TBC",
    bundleHealth: "Partial",
    positionStatus: "Provisional",
    readiness: "Conditional",
    battleboard: bb,
    hasSavedPosition: false,
    chaseItems: [],
    bundleText: c.text,
  });
  const chase = buildDisclosureChaseBrief({
    caseId: c.id,
    caseTitle: c.label,
    clientLabel: "Client",
    allegation: "Test",
    stage: "PTPH",
    hearingStatus: "TBC",
    hearingDateIso: null,
    bundleHealth: "Partial",
    positionStatus: "Provisional",
    battleboard: bb,
    bundleText: c.text,
  });
  const brief = buildMatterBrief({ warRoom: { ...war, bundleContradictions: contra }, chase });
  const theory = brief.sections.find((s) => s.id === "theory")?.paragraph ?? "";
  const risks = (brief.sections.find((s) => s.id === "risks")?.bullets ?? []).join("\n");

  for (const re of c.assembly.theoryMust ?? []) {
    if (!re.test(theory)) failures.push(`assembly theory missing ${re}`);
  }
  for (const re of c.assembly.theoryMustNot ?? []) {
    if (re.test(theory)) failures.push(`assembly theory leaked ${re}`);
  }
  for (const re of c.assembly.risksMustNot ?? []) {
    if (re.test(risks)) failures.push(`assembly risks leaked ${re}`);
  }
  return failures;
}

function scoreTierA(): { pass: number; fail: number; results: unknown[] } {
  const results: unknown[] = [];
  let pass = 0;
  let fail = 0;

  for (const c of TIER_A) {
    const types = extractViaProdPath(c.text).map((x) => x.type);
    const issues: string[] = [];
    for (const m of c.mustInclude) {
      if (!types.includes(m)) issues.push(`missing ${m}`);
    }
    for (const x of c.mustExclude) {
      if (types.includes(x)) issues.push(`unexpected ${x}`);
    }
    issues.push(...runAssemblyGate(c, extractBundleContradictions(c.text)));

    const ok = issues.length === 0;
    if (ok) pass++;
    else fail++;
    results.push({ tier: "A", id: c.id, label: c.label, types, ok, issues });
  }

  return { pass, fail, results };
}

function scoreTierB(): { pass: number; fail: number; results: unknown[] } {
  const results: unknown[] = [];
  let pass = 0;
  let fail = 0;

  const goldNoContra = [
    "motoring-thin-ella-shaw",
    "generic-provisional-sam-okonkwo",
    "fictional-theft-ashleigh-merritt",
  ];

  for (const entry of loadGoldPack()) {
    const id = entry.truthKey.bundleId;
    if (!entry.bundleTextPaths.length) {
      results.push({ tier: "B", id, label: entry.truthKey.label, skipped: true, reason: "no text" });
      continue;
    }
    const text = readBundleText(entry.bundleTextPaths);
    const types = extractViaProdPath(text).map((x) => x.type);
    const expectEmpty = goldNoContra.includes(id);
    const issues: string[] = [];
    if (expectEmpty && types.length > 0) {
      issues.push(`false positive contradictions: ${types.join(", ")}`);
    }
    const ok = issues.length === 0;
    if (ok) pass++;
    else fail++;
    results.push({ tier: "B", id, label: entry.truthKey.label, types, expectEmpty, ok, issues });
  }

  // Strategy corpus sample — no false positives on thin_bundle without contradiction tags
  const manifests = generateManifestBatch(80, "discovery");
  let corpusFalsePos = 0;
  let corpusChecked = 0;
  for (const m of manifests) {
    if (m.failureModeTags.includes("thin_bundle") && m.contradictions.length === 0) {
      corpusChecked++;
      const text = renderCorpusBundleText(m);
      const types = extractViaProdPath(text);
      if (types.length > 0) corpusFalsePos++;
    }
  }
  const corpusOk = corpusFalsePos === 0;
  if (corpusOk) pass++;
  else fail++;
  results.push({
    tier: "B",
    id: "strategy-corpus-thin-80",
    label: "80 discovery manifests — thin without contradiction tags",
    corpusChecked,
    corpusFalsePos,
    ok: corpusOk,
    issues: corpusOk ? [] : [`${corpusFalsePos} false positives`],
  });

  return { pass, fail, results };
}

function main() {
  const tierA = scoreTierA();
  const tierB = scoreTierB();
  const totalPass = tierA.pass + tierB.pass;
  const totalFail = tierA.fail + tierB.fail;
  const overall = totalFail === 0 ? "PASS" : "FAIL";

  const report = {
    generatedAt: new Date().toISOString(),
    phase: "2-contradiction-v1-gate",
    module: "bundle-contradictions-v1-frozen",
    overall,
    tierA: { pass: tierA.pass, fail: tierA.fail },
    tierB: { pass: tierB.pass, fail: tierB.fail },
    results: [...tierA.results, ...tierB.results],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`bundle-contradiction-tier-gate: ${overall}`);
  console.log(`Tier A: ${tierA.pass} pass / ${tierA.fail} fail`);
  console.log(`Tier B: ${tierB.pass} pass / ${tierB.fail} fail`);
  console.log(`Report: ${outPath}`);

  for (const r of report.results as Array<{ ok?: boolean; id: string; issues?: string[] }>) {
    if (r.ok === false) {
      console.log(`FAIL ${r.id}:`, r.issues?.join("; "));
    }
  }

  if (overall !== "PASS") process.exit(1);
}

main();
