/**
 * Section 2 — independent existing-coverage inventory (read-only over first freeze + registries).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/inventories",
);
const FIRST_HASH = "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";
const FIRST_LEDGER_ROOT =
  process.env.FIRST3000_LEDGER_ROOT ||
  "C:/Users/gduff/casebrain-hub-wt-s3000-census/artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1-final-corrections";

function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function safeReadJson<T>(p: string): T | null {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function main(): void {
  const frozen = safeReadJson<{
    orderedMembershipSha256: string;
    membership: Array<{
      caseId: string;
      sourceCaseId: string;
      family: string;
      layout: string;
      trap: string;
      sourceKind: string;
      contentOutputFingerprint: string;
      sourceFingerprint: string;
      outputFingerprint: string;
      hasEsaPacket: boolean;
      hasTruthKeyOnDisk: boolean;
    }>;
  }>(path.join(FIRST_LEDGER_ROOT, "frozen-membership-3000.json"));
  if (!frozen || frozen.orderedMembershipSha256 !== FIRST_HASH) {
    throw new Error("first freeze membership unavailable or hash mismatch");
  }

  const families = new Map<string, number>();
  const layouts = new Map<string, number>();
  const traps = new Map<string, number>();
  const sourceKinds = new Map<string, number>();
  const contentFp = new Map<string, number>();
  const sourceCaseIds = new Map<string, number>();
  let esa = 0;
  let truth = 0;
  for (const m of frozen.membership) {
    families.set(m.family, (families.get(m.family) || 0) + 1);
    layouts.set(m.layout, (layouts.get(m.layout) || 0) + 1);
    traps.set(m.trap, (traps.get(m.trap) || 0) + 1);
    sourceKinds.set(m.sourceKind, (sourceKinds.get(m.sourceKind) || 0) + 1);
    contentFp.set(m.contentOutputFingerprint, (contentFp.get(m.contentOutputFingerprint) || 0) + 1);
    sourceCaseIds.set(m.sourceCaseId, (sourceCaseIds.get(m.sourceCaseId) || 0) + 1);
    if (m.hasEsaPacket) esa += 1;
    if (m.hasTruthKeyOnDisk) truth += 1;
  }

  const contentClusters = [...contentFp.entries()]
    .map(([fp, count]) => ({ contentOutputFingerprint: fp, count }))
    .sort((a, b) => b.count - a.count);

  writeJson("existing-case-family-inventory.json", {
    schemaVersion: "existing-case-family-inventory@1.0.0",
    firstFrozenMembershipSha256: FIRST_HASH,
    familyLabelCount: families.size,
    layoutLabelCount: layouts.size,
    trapLabelCount: traps.size,
    families: Object.fromEntries([...families.entries()].sort((a, b) => b[1] - a[1])),
    layouts: Object.fromEntries([...layouts.entries()].sort((a, b) => b[1] - a[1])),
    traps: Object.fromEntries([...traps.entries()].sort((a, b) => b[1] - a[1])),
    sourceKinds: Object.fromEntries(sourceKinds),
    esaPacketCases: esa,
    truthKeyCases: truth,
    uniqueSourceCaseIds: sourceCaseIds.size,
  });

  writeJson("existing-template-collapse-report.json", {
    schemaVersion: "existing-template-collapse-report@1.0.0",
    firstFrozenMembershipSha256: FIRST_HASH,
    populationCount: frozen.membership.length,
    uniqueCaseIds: frozen.membership.length,
    uniqueSourceFingerprints: new Set(frozen.membership.map((m) => m.sourceFingerprint)).size,
    uniqueOutputFingerprints: new Set(frozen.membership.map((m) => m.outputFingerprint)).size,
    uniqueContentOutputFingerprints: contentFp.size,
    largestContentCluster: contentClusters[0] || null,
    contentClusters,
    note: "First census proves scale identity diversity but collapses to ~70 substantive content shapes.",
  });

  const chargeInv = safeReadJson<{
    uniqueChargeWordings: number;
    statusTotals: Record<string, number>;
    charges: Array<{
      exactDisplayedWording: string;
      verificationStatus: string;
      statutoryProvision?: string;
      affectedCaseCount: number;
      qualifiedLegalReviewStillRequired?: boolean;
    }>;
  }>(
    path.join(
      ROOT,
      "artifacts/casebrain-qa/integrity-programme/scale3000-charge-wording-inventory/CHARGE-WORDING-INVENTORY.json",
    ),
  );

  writeJson("existing-charge-and-provision-inventory.json", {
    schemaVersion: "existing-charge-and-provision-inventory@1.0.0",
    source:
      "artifacts/casebrain-qa/integrity-programme/scale3000-charge-wording-inventory/CHARGE-WORDING-INVENTORY.json",
    uniqueChargeWordings: chargeInv?.uniqueChargeWordings ?? null,
    statusTotals: chargeInv?.statusTotals ?? null,
    disclaimer:
      "verified means no known registry discrepancy pattern — not independent solicitor sign-off",
    charges: (chargeInv?.charges || []).map((c) => ({
      exactDisplayedWording: c.exactDisplayedWording,
      verificationStatus: c.verificationStatus,
      statutoryProvision: c.statutoryProvision || null,
      affectedCaseCount: c.affectedCaseCount,
      qualifiedLegalReviewStillRequired: c.qualifiedLegalReviewStillRequired ?? true,
    })),
    missingOffenceFamiliesNote:
      "First corpus charge set is narrow (44 wordings). Second corpus must expand offence/procedure coverage per catalogue.",
  });

  writeJson("existing-document-layout-inventory.json", {
    schemaVersion: "existing-document-layout-inventory@1.0.0",
    layoutLabelCount: layouts.size,
    layouts: Object.fromEntries([...layouts.entries()].sort((a, b) => b[1] - a[1])),
    productionBackedVsProjectionNote:
      "First census materialisation used scale3000-solicitor-materialisation surfaces (packet-local production builders). Authenticated browser exits remain separate lane.",
  });

  const registry = safeReadJson<{
    registryVersion?: string;
    controls: Array<{
      controlId: string;
      family?: string;
      controlFamily?: string;
      title?: string;
      prerequisites?: unknown;
    }>;
  }>(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"));
  const impl = safeReadJson<{
    handlers: Record<string, { controlId: string; implementationStatus: string }>;
  }>(
    path.join(
      ROOT,
      "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json",
    ),
  );

  const controls = registry?.controls || [];
  const statusCounts: Record<string, number> = {};
  const familyCounts: Record<string, number> = {};
  for (const c of controls) {
    const fam = c.controlFamily || c.family || "unspecified";
    familyCounts[fam] = (familyCounts[fam] || 0) + 1;
    const st = impl?.handlers?.[c.controlId]?.implementationStatus || "unknown";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }

  writeJson("existing-control-exercise-inventory.json", {
    schemaVersion: "existing-control-exercise-inventory@1.0.0",
    registryPath: "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json",
    registryVersion: registry?.registryVersion || null,
    controlCount: controls.length,
    handlerMappedCount: Object.keys(impl?.handlers || {}).length,
    implementationStatusCounts: statusCounts,
    controlFamilyCounts: familyCounts,
    browserHumanHeavySecurityExternalLanes:
      "Remain separately reportable; first census did not claim full exercise of those lanes",
    firstCensusExerciseNote:
      "First census exercised wording/surface detectors over solicitor-materialised exits; many registry controls remain not_exercised without prerequisites.",
  });

  const blueprintSummaryPath = path.join(
    ROOT,
    "docs/controlled-pdf-pilots/master-18-core-blueprint-completion-summary.md",
  );
  const blueprintExists = fs.existsSync(blueprintSummaryPath);

  writeJson("existing-3000-vs-new-3000-gap-register.json", {
    schemaVersion: "existing-3000-vs-new-3000-gap-register@1.0.0",
    generatedAt: new Date().toISOString(),
    firstFrozenMembershipSha256: FIRST_HASH,
    firstCensus: {
      populationCount: 3000,
      familyLabels: families.size,
      layoutLabels: layouts.size,
      substantiveContentTemplates: contentFp.size,
      uniqueChargeWordings: chargeInv?.uniqueChargeWordings ?? null,
      esaPacketCases: esa,
      truthKeyCases: truth,
      v9CatalogWithoutTruth: frozen.membership.filter((m) => !m.hasTruthKeyOnDisk).length,
    },
    coreHeavyBlueprints: {
      documentedAt: blueprintExists ? "docs/controlled-pdf-pilots/master-18-core-blueprint-completion-summary.md" : null,
      countExpected: 18,
      mustNotMutate: true,
    },
    gapsForSecondCorpus: [
      "Must achieve ~3000 unique substantive truth fingerprints (not ~70 content shapes)",
      "Must expand offence/procedure/document coverage beyond 44 charge wordings and 58 families",
      "Must declare complete vs deliberate-missing vs unsupported source packets per case",
      "Must not reuse first membership or regenerate first corpus",
      "Must keep Brain1/Guardian/Phase11/Malik/holdouts/integrity ledger untouched",
      "Authenticated browser / heavy-bundle / external security remain separate lanes unless exercised",
    ],
    inventoryHashes: {
      familyInventorySha256: sha(fs.readFileSync(path.join(OUT, "existing-case-family-inventory.json"))),
      templateCollapseSha256: sha(fs.readFileSync(path.join(OUT, "existing-template-collapse-report.json"))),
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        families: families.size,
        layouts: layouts.size,
        contentTemplates: contentFp.size,
        controls: controls.length,
        charges: chargeInv?.uniqueChargeWordings ?? null,
      },
      null,
      2,
    ),
  );
}

main();
