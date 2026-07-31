/**
 * Final honesty correction — do NOT regenerate the 150 cases.
 * Strip harness specialty bags from CaseBrain outputs; keep them as independent expectations only.
 * Rescan and emit three-denominator readiness.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  FROZEN_150_CANDIDATE_FREEZE_SHA256,
  FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
  NEW150_ARTIFACT_ROOT,
  NEW150_BASELINE,
  NEW150_CANDIDATE_ROOT,
  NEW150_SOURCE_ROOT,
  PRODUCTION_EXITS,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";
import { buildNew150Catalog } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/coverage-catalog";
import {
  buildPerControlDenominatorReport,
  scanCaseCapability,
  type CaseCapabilitySnapshot,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/named-prerequisite-scan";
import type { New150CaptureResult } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/production-capture";

const ROOT = process.cwd();
const OUT = path.join(ROOT, NEW150_ARTIFACT_ROOT);
const HONESTY = path.join(OUT, "honesty-correction-v1");
const SOURCE = path.join(ROOT, NEW150_SOURCE_ROOT);
const CANDIDATE = path.join(ROOT, NEW150_CANDIDATE_ROOT);

const SPECIALTY_CONTROLS = [
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
  "MAA2-PRC-03-YOUTH-STATE",
  "MAA2-PRC-04-FITNESS-PARTICIPATION",
  "MAA2-PRC-07-DISCLOSURE-PII-STATE",
] as const;

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function verifyFrozen150(): boolean {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json",
      ),
      "utf8",
    ),
  ) as { orderedMembershipSha256?: string };
  const freeze = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json",
      ),
      "utf8",
    ),
  ) as { freezeSha256?: string };
  return (
    manifest.orderedMembershipSha256 === FROZEN_150_ORDERED_MEMBERSHIP_SHA256 &&
    freeze.freezeSha256 === FROZEN_150_CANDIDATE_FREEZE_SHA256
  );
}

function brain1GuardianUnchanged(baseline: string, head: string): boolean {
  const files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  return files.every((p) => {
    try {
      const a = execSync(`git rev-parse ${baseline}:${p}`, { encoding: "utf8", cwd: ROOT }).trim();
      const b = execSync(`git rev-parse ${head}:${p}`, { encoding: "utf8", cwd: ROOT }).trim();
      return a === b;
    } catch {
      return false;
    }
  });
}

function stripSpecialtyFromCasebrainOutput(cbPath: string): {
  stripped: boolean;
  beforeSha: string;
  afterSha: string;
} {
  const before = fs.readFileSync(cbPath);
  const beforeSha = sha256(before);
  const cb = JSON.parse(before.toString("utf8")) as Record<string, unknown>;
  const had =
    isObj(cb.legalStateTaxonomy) ||
    isObj(cb.dobAgeCalcLedger) ||
    isObj(cb.proceduralPartyState) ||
    Array.isArray(cb.derivedNumericClaims);

  // Never label harness bags as CaseBrain output.
  cb.legalStateTaxonomy = null;
  cb.dobAgeCalcLedger = null;
  cb.derivedNumericClaims = null;
  cb.proceduralPartyState = null;
  cb.specialtyBagHonesty = {
    inventedIntoCasebrainOutputFromTruth: false,
    caseBrainProductionEmitter: false,
    harnessBagsWrittenIntoCasebrainOutput: false,
    independentExpectationsArtefact: "specialty-bags-harness.json",
    roleOfHarnessBags: "independent_source_side_expectations_for_auditor_testing_only",
    productGap:
      "CaseBrain does not emit legalStateTaxonomy / dobAgeCalcLedger / proceduralPartyState / derivedNumericClaims",
  };

  const text = `${JSON.stringify(cb, null, 2)}\n`;
  fs.writeFileSync(cbPath, text, "utf8");
  return { stripped: had, beforeSha, afterSha: sha256(text) };
}

function stripSpecialtyFromPacket(packetPath: string): boolean {
  if (!fs.existsSync(packetPath)) return false;
  const pkt = JSON.parse(fs.readFileSync(packetPath, "utf8")) as Record<string, unknown>;
  const had =
    isObj(pkt.legalStateTaxonomy) ||
    isObj(pkt.dobAgeCalcLedger) ||
    isObj(pkt.proceduralPartyState) ||
    Array.isArray(pkt.derivedNumericClaims);
  delete pkt.legalStateTaxonomy;
  delete pkt.dobAgeCalcLedger;
  delete pkt.derivedNumericClaims;
  delete pkt.proceduralPartyState;
  pkt.specialtyBagProvenance = {
    notOnCaseBrainOutput: true,
    notOnStructuredPacketAsProduction: true,
    independentExpectationsArtefact: "specialty-bags-harness.json",
    role: "independent_source_side_expectations_only",
  };
  fs.writeFileSync(packetPath, `${JSON.stringify(pkt, null, 2)}\n`, "utf8");
  return had;
}

function ensureHarnessExpectationLabel(harnessPath: string): void {
  if (!fs.existsSync(harnessPath)) return;
  const h = JSON.parse(fs.readFileSync(harnessPath, "utf8")) as Record<string, unknown>;
  h.role = "independent_source_side_expectations_for_auditor_testing_only";
  h.notCaseBrainOutput = true;
  h.notFromTruthKey = true;
  h.notFromCaseBrainProductionEmitter = true;
  h.producer = "source_document_parse_harness";
  fs.writeFileSync(harnessPath, `${JSON.stringify(h, null, 2)}\n`, "utf8");
}

function auditAudienceDistinctness(sourceRoot: string): {
  casesChecked: number;
  casesWithGenuinelyDistinctPacks: number;
  casesWithIdenticalOrInsufficientPacks: number;
  minDistinctPayloads: number;
  maxDistinctPayloads: number;
  sampleFailures: string[];
} {
  let checked = 0;
  let ok = 0;
  let bad = 0;
  let minD = Number.POSITIVE_INFINITY;
  let maxD = 0;
  const failures: string[] = [];
  for (const ent of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.startsWith("s300-n150-")) continue;
    const p = path.join(sourceRoot, ent.name, "audience-packs.json");
    if (!fs.existsSync(p)) continue;
    checked += 1;
    const a = JSON.parse(fs.readFileSync(p, "utf8")) as {
      packs?: Array<{ audienceId: string; payloadSha256: string; payloadText: string }>;
      distinctPayloadCount?: number;
    };
    const packs = a.packs ?? [];
    const hashes = new Set(packs.map((x) => x.payloadSha256).filter(Boolean));
    const distinct = hashes.size;
    minD = Math.min(minD, distinct);
    maxD = Math.max(maxD, distinct);
    // Require ≥4 distinct audience payloads among court/cps/client/supervisor/defence at minimum.
    const required = ["court", "cps", "client", "supervisor"];
    const byId = new Map(packs.map((x) => [x.audienceId, x.payloadSha256]));
    const requiredHashes = required.map((id) => byId.get(id)).filter(Boolean) as string[];
    const requiredDistinct = new Set(requiredHashes).size;
    if (distinct >= 4 && requiredDistinct >= 3) ok += 1;
    else {
      bad += 1;
      if (failures.length < 8) failures.push(`${ent.name}: distinct=${distinct} requiredDistinct=${requiredDistinct}`);
    }
  }
  return {
    casesChecked: checked,
    casesWithGenuinelyDistinctPacks: ok,
    casesWithIdenticalOrInsufficientPacks: bad,
    minDistinctPayloads: Number.isFinite(minD) ? minD : 0,
    maxDistinctPayloads: maxD,
    sampleFailures: failures,
  };
}

async function main() {
  const head = headCommit();
  fs.mkdirSync(HONESTY, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "new-150-population-manifest.json"), "utf8")) as {
    cases: Array<{ caseId: string; coverageTag: string }>;
  };
  const catalog = buildNew150Catalog(150);
  const byId = new Map(catalog.map((c) => [c.caseId, c]));

  let strippedCb = 0;
  let strippedPkt = 0;
  const hashLedger: Array<{
    caseId: string;
    casebrainBeforeSha256: string;
    casebrainAfterSha256: string;
    specialtyHarnessSha256: string | null;
    canonicalUnchanged: boolean;
    truthUnchanged: boolean;
  }> = [];

  for (const row of manifest.cases) {
    const sourceDir = path.join(SOURCE, row.caseId);
    const cbPath = path.join(sourceDir, "casebrain-output.json");
    if (!fs.existsSync(cbPath)) continue;

    const canonBefore = fs.existsSync(path.join(sourceDir, "canonical-bundle.md"))
      ? sha256(fs.readFileSync(path.join(sourceDir, "canonical-bundle.md")))
      : null;
    const truthBefore = fs.existsSync(path.join(sourceDir, "truth-key.json"))
      ? sha256(fs.readFileSync(path.join(sourceDir, "truth-key.json")))
      : null;

    const strip = stripSpecialtyFromCasebrainOutput(cbPath);
    if (strip.stripped) strippedCb += 1;

    // Also strip gap-close copy if present
    const gapCb = path.join(sourceDir, "gap-close-v1", "casebrain-output.json");
    if (fs.existsSync(gapCb)) stripSpecialtyFromCasebrainOutput(gapCb);

    const harnessPath = path.join(sourceDir, "specialty-bags-harness.json");
    ensureHarnessExpectationLabel(harnessPath);
    const gapHarness = path.join(sourceDir, "gap-close-v1", "specialty-bags-harness.json");
    if (fs.existsSync(gapHarness)) ensureHarnessExpectationLabel(gapHarness);

    const pktPath = path.join(CANDIDATE, row.caseId, "structured-case-packet.json");
    if (stripSpecialtyFromPacket(pktPath)) strippedPkt += 1;
    const gapPkt = path.join(sourceDir, "gap-close-v1", "structured-case-packet.json");
    if (fs.existsSync(gapPkt)) stripSpecialtyFromPacket(gapPkt);

    const canonAfter = fs.existsSync(path.join(sourceDir, "canonical-bundle.md"))
      ? sha256(fs.readFileSync(path.join(sourceDir, "canonical-bundle.md")))
      : null;
    const truthAfter = fs.existsSync(path.join(sourceDir, "truth-key.json"))
      ? sha256(fs.readFileSync(path.join(sourceDir, "truth-key.json")))
      : null;

    hashLedger.push({
      caseId: row.caseId,
      casebrainBeforeSha256: strip.beforeSha,
      casebrainAfterSha256: strip.afterSha,
      specialtyHarnessSha256: fs.existsSync(harnessPath) ? sha256(fs.readFileSync(harnessPath)) : null,
      canonicalUnchanged: canonBefore === canonAfter,
      truthUnchanged: truthBefore === truthAfter,
    });
  }

  // Rescan
  const snapshots: CaseCapabilitySnapshot[] = [];
  for (const row of manifest.cases) {
    const spec = byId.get(row.caseId);
    if (!spec) continue;
    const sourceDir = path.join(SOURCE, row.caseId);
    const exitHashes: Record<string, string> = {};
    for (const e of PRODUCTION_EXITS) {
      if (fs.existsSync(path.join(sourceDir, "exits", e, "payload.json"))) exitHashes[e] = "present";
    }
    const lineage = fs.existsSync(path.join(sourceDir, "lineage.json"))
      ? (JSON.parse(fs.readFileSync(path.join(sourceDir, "lineage.json"), "utf8")) as {
          ocrReceiptSha256?: string | null;
          vdrReceiptSha256?: string;
          sourceCapabilityInventorySha256?: string;
          truthKeySha256?: string;
        })
      : {};
    const capture = {
      caseId: row.caseId,
      sourceDir,
      exitHashes,
      casebrainOutputSha256: sha256(fs.readFileSync(path.join(sourceDir, "casebrain-output.json"))),
      bundlePdfSha256: "x",
      truthKeySha256: lineage.truthKeySha256 ?? "",
      ocrReceiptSha256: lineage.ocrReceiptSha256 ?? null,
      vdrReceiptSha256: lineage.vdrReceiptSha256 ?? "",
      sourceCapabilityInventorySha256: lineage.sourceCapabilityInventorySha256 ?? "",
      truthOpenedDuringOutput: false as const,
      productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits" as const,
      authenticatedBrowserAvailable: false as const,
      productionSpecialtyBagsPresent: {
        legalStateTaxonomy: false as const,
        dobAgeCalcLedger: false as const,
        proceduralPartyState: false as const,
      },
      audiencePacksPresent: fs.existsSync(path.join(sourceDir, "audience-packs.json")),
      eldVersionPairsFromProduction: fs.existsSync(path.join(sourceDir, "eld-version-pair.json")),
    } satisfies New150CaptureResult;
    snapshots.push(scanCaseCapability({ spec, capture, sourceDir }));
  }

  const perControl = buildPerControlDenominatorReport({ repoRoot: ROOT, snapshots });

  const auditorTestable = perControl.filter((r) => r.achievedDenominator >= 1).length;
  const harnessOnly = perControl.filter(
    (r) =>
      (SPECIALTY_CONTROLS as readonly string[]).includes(r.controlId) && r.achievedDenominator >= 1,
  );
  const productionBacked = perControl.filter(
    (r) =>
      !(SPECIALTY_CONTROLS as readonly string[]).includes(r.controlId) && r.achievedDenominator >= 1,
  ).length;

  const audAudit = auditAudienceDistinctness(SOURCE);
  const frozenOk = verifyFrozen150();
  const brainOk = brain1GuardianUnchanged(NEW150_BASELINE, head);

  writeJson(HONESTY, "casebrain-strip-ledger.json", {
    schemaVersion: "stage300-new150-honesty-strip-ledger@1.0.0",
    strippedCasebrainOutputs: strippedCb,
    strippedPackets: strippedPkt,
    rows: hashLedger,
  });

  writeJson(HONESTY, "three-denominator-readiness-matrix.json", {
    schemaVersion: "stage300-new150-three-denominator-readiness@1.0.0",
    totals: {
      auditorTestableControlsWithDenomGe1: auditorTestable,
      productionBackedControlsWithDenomGe1: productionBacked,
      harnessOnlySpecialtyControlsWithDenomGe1: harnessOnly.length,
      essentialControlCount: 43,
    },
    headline: {
      auditorTestable: `${auditorTestable}/43`,
      productionBacked: `${productionBacked}/43`,
      harnessOnlySpecialty: `${harnessOnly.length}/43`,
    },
    harnessOnlySpecialtyControlIds: harnessOnly.map((r) => r.controlId),
    productionBackedControlIds: perControl
      .filter(
        (r) =>
          !(SPECIALTY_CONTROLS as readonly string[]).includes(r.controlId) && r.achievedDenominator >= 1,
      )
      .map((r) => r.controlId),
    productGaps: {
      missingCaseBrainSpecialtyEmitters: [
        "legalStateTaxonomy",
        "dobAgeCalcLedger",
        "proceduralPartyState",
        "derivedNumericClaims",
      ],
      note: "Harness specialty bags are independent source-side expectations only — never CaseBrain output.",
    },
    rows: perControl.map((r) => {
      const harnessOnlyCtrl = (SPECIALTY_CONTROLS as readonly string[]).includes(r.controlId);
      return {
        controlId: r.controlId,
        auditorTestableAchieved: r.achievedDenominator,
        productionBackedAchieved: harnessOnlyCtrl ? 0 : r.achievedDenominator,
        backing:
          harnessOnlyCtrl && r.achievedDenominator >= 1
            ? "independent_source_parse_harness_expectations_only"
            : r.achievedDenominator >= 1
              ? "genuine_casebrain_production_or_authorised_non_specialty_harness"
              : "unavailable",
        ownership: r.ownership,
      };
    }),
  });

  writeJson(HONESTY, "audience-distinctness-audit.json", {
    schemaVersion: "stage300-new150-audience-distinctness-audit@1.0.0",
    ...audAudit,
    rule: "Genuinely distinct requires ≥4 distinct payloadSha256 values and ≥3 distinct among court/cps/client/supervisor — not identical wording with relabelled audiences.",
  });

  writeJson(HONESTY, "product-gap-register-specialty-emitters.json", {
    schemaVersion: "stage300-new150-specialty-product-gaps@1.0.0",
    gaps: SPECIALTY_CONTROLS.map((controlId) => ({
      controlId,
      gapClass: "production_does_not_emit",
      missingEmitter: "CaseBrain specialty bag emitter",
      exactMissingFields:
        controlId.startsWith("MAA2-LSL")
          ? ["legalStateTaxonomy"]
          : controlId.startsWith("MAA2-CHR")
            ? ["dobAgeCalcLedger", "derivedNumericClaims"]
            : ["proceduralPartyState"],
      independentExpectationAvailable: true,
      expectationArtefact: "specialty-bags-harness.json",
      liveProductWorkEventuallyRequired: true,
    })),
  });

  // Update live denominator report with honesty split metadata
  writeJson(OUT, "per-control-denominator-report.json", {
    schemaVersion: "stage300-new-150-per-control-denominator@1.2.0",
    honestyCorrection: "honesty-correction-v1",
    controlCount: 43,
    readyForCalibrationCount: auditorTestable,
    controlsWithAchievedDenominatorGt0: auditorTestable,
    threeDenominatorHeadline: {
      auditorTestable: `${auditorTestable}/43`,
      productionBacked: `${productionBacked}/43`,
      harnessOnlySpecialty: `${harnessOnly.length}/43`,
    },
    rows: perControl,
  });

  writeJson(OUT, "capability-snapshot-summary.json", {
    schemaVersion: "stage300-new-150-capability-snapshot-summary@1.2.0",
    honestyCorrection: "honesty-correction-v1",
    rows: snapshots.map((s) => ({
      caseId: s.caseId,
      coverageTag: s.coverageTag,
      sixProductionExitsComplete: s.sixProductionExitsComplete,
      ocrReceiptsPresent: s.ocrReceiptsPresent,
      vdrReceiptPresent: s.vdrReceiptPresent,
      productionSpecialtyBags: s.productionSpecialtyBags,
      audiencePacksPresent: s.audiencePacksPresent,
      eldProductionPairsPresent: s.eldProductionPairsPresent,
      namedCompleteControlIds: Object.entries(s.namedCompleteByControl)
        .filter(([, v]) => v)
        .map(([k]) => k),
      corpusDesignControlIds: Object.entries(s.corpusDesignByControl)
        .filter(([, v]) => v)
        .map(([k]) => k),
    })),
  });

  const decision = `# Stage-300 New-150 Honesty Correction Decision Card

**Status:** HONESTY CORRECTION COMPLETE (stop uncommitted)  
**Baseline:** \`${NEW150_BASELINE}\`  
**Head:** \`${head}\`  
**Population:** same 150 — no regeneration

## Three denominators (do not collapse)

| Denominator | Count |
|---|---|
| Auditor-testable (named prerequisite present for testing) | **${auditorTestable}/43** |
| Backed by genuine CaseBrain production output (or non-specialty authorised capture) | **${productionBacked}/43** |
| LSL/CHR/PRC backed only by independent source-parse harness expectations | **${harnessOnly.length}/43** |

## What changed
1. Harness specialty bags **removed** from \`casebrain-output.json\` and structured packets (stripped ${strippedCb} CB outputs / ${strippedPkt} packets).
2. Bags retained only in \`specialty-bags-harness.json\` as **independent source-side expectations**.
3. Explicit product gap recorded: CaseBrain does not emit specialty bags.
4. AUD/XPP distinctness audit: ${audAudit.casesWithGenuinelyDistinctPacks}/${audAudit.casesChecked} cases have genuinely distinct payloads (min distinct=${audAudit.minDistinctPayloads}, max=${audAudit.maxDistinctPayloads}).

## What is not claimed
- No 43/43 “production-backed PASS”
- No CaseBrain specialty emitter existence
- No Stage-300 freeze/run, commit, push, merge, deploy, or PASS

## Preservation
- Canonical sources + truth keys unchanged: ${hashLedger.every((r) => r.canonicalUnchanged && r.truthUnchanged)}
- Frozen Stage-150 unchanged: ${frozenOk}
- Brain1/Guardian unchanged: ${brainOk}
`;

  fs.writeFileSync(path.join(HONESTY, "DECISION-CARD.md"), decision, "utf8");
  fs.writeFileSync(path.join(OUT, "DECISION-CARD.md"), decision, "utf8");

  let contractsOk = false;
  let buildOk = false;
  try {
    execSync("npx tsx --test scripts/maa-v2-stage300-new-150-contracts.test.ts", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    contractsOk = true;
  } catch {
    contractsOk = false;
  }
  try {
    execSync("npm run build", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
    });
    buildOk = true;
  } catch {
    buildOk = false;
  }

  writeJson(HONESTY, "verification-results.json", {
    schemaVersion: "stage300-new150-honesty-correction-verification@1.0.0",
    contractsOk,
    buildOk,
    frozen150Unchanged: frozenOk,
    brain1GuardianUnchanged: brainOk,
  });

  writeJson(HONESTY, "STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage300-new150-honesty-correction-stop@1.0.0",
    status: "STOP_UNCOMMITTED_HONESTY_CORRECTION",
    baselineCommit: NEW150_BASELINE,
    headCommit: head,
    threeDenominatorHeadline: {
      auditorTestable: `${auditorTestable}/43`,
      productionBacked: `${productionBacked}/43`,
      harnessOnlySpecialty: `${harnessOnly.length}/43`,
    },
    strippedCasebrainOutputs: strippedCb,
    audienceDistinctOk: audAudit.casesWithIdenticalOrInsufficientPacks === 0,
    frozen150Unchanged: frozenOk,
    brain1GuardianUnchanged: brainOk,
    contractsOk,
    buildOk,
    doNot: ["freeze_or_run_stage_300", "commit_push_merge_deploy", "claim_PASS", "collapse_three_denominators"],
  });

  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage300-new-150-stop@1.2.0",
    status: "STOP_UNCOMMITTED_HONESTY_CORRECTION",
    threeDenominatorHeadline: {
      auditorTestable: `${auditorTestable}/43`,
      productionBacked: `${productionBacked}/43`,
      harnessOnlySpecialty: `${harnessOnly.length}/43`,
    },
    frozen150Unchanged: frozenOk,
    brain1GuardianUnchanged: brainOk,
    contractsOk,
    buildOk,
    doNot: ["freeze_or_run_stage_300", "commit_push_merge_deploy", "claim_PASS"],
  });

  console.log(
    JSON.stringify(
      {
        auditorTestable: `${auditorTestable}/43`,
        productionBacked: `${productionBacked}/43`,
        harnessOnlySpecialty: `${harnessOnly.length}/43`,
        strippedCb,
        strippedPkt,
        audDistinct: `${audAudit.casesWithGenuinelyDistinctPacks}/${audAudit.casesChecked}`,
        contractsOk,
        buildOk,
        frozenOk,
        brainOk,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
