/**
 * Stage-300 v2 — combined-300 uniqueness/pin validation and membership freeze for the
 * essential-43 bridge.
 *
 * Deliberately NOT a reuse of `../calibration/input-validation.ts` / `../calibration/population-
 * freeze.ts`: those hard-block on the original heavy `sources/` tree (real PDFs / canonical
 * bundles / exit payloads), which is gitignored-and-regenerable and is not materialised in every
 * checkout (see NEW150_ARTIFACT_ROOT/sources and stage150-batch10-deficit120-sources in
 * .gitignore). The v2 essential-43 bridge reads casebrain-output.json from the already-
 * materialised historical work snapshot instead (see `../essential/inputs/load-essential-
 * inputs.ts`), so it does not need that heavy tree to exist locally. This module verifies
 * everything that IS actually checkable on disk in this environment, and reports (never
 * silently skips) what is not.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  NEW150_POPULATION_MANIFEST_REL,
  NEW150_V1_CURRENT_WORK_ROOT,
  NEW150_V1_HISTORICAL_WORK_ROOT,
  STAGE150_CANDIDATE_FREEZE_SHA256_PIN_V2,
  STAGE150_FROZEN_POPULATION_MANIFEST_REL,
  STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN_V2,
} from "./constants";

function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

type Stage150ManifestRow = {
  orderIndex: number;
  caseId: string;
  cohort: "A" | "B";
  packetRelativePath: string;
  packetSha256: string;
  sourceCasePath: string | null;
  pdfSha256: string | null;
  canonicalBundleSha256: string | null;
  casebrainOutputRelativePath: string | null;
  casebrainOutputSha256: string | null;
};

type Stage150FrozenManifest = { orderedMembershipSha256: string; populationCount: number; membership: Stage150ManifestRow[] };
type New150ManifestDoc = { schemaVersion: string; target: number; accepted: number; cases: Array<{ caseId: string; packetSha256: string; relativePath: string; coverageTag: string }> };

export type V2UniquenessAndPinsReport = {
  schemaVersion: "stage300-v2-uniqueness-and-pins-validation@1.0.0";
  validatedAt: string;
  note: string;
  stage150: {
    manifestFound: boolean;
    orderedMembershipSha256Verified: boolean;
    populationCount: number;
  };
  new150: {
    manifestFound: boolean;
    accepted: number;
    packetHashMismatches: string[];
    packetsPresentOnDisk: number;
    packetsMissingOnDisk: string[];
  };
  combinedUniqueness: { totalUniqueCaseIds: number; overlapCaseIds: string[]; ok: boolean };
  brain1GuardianDeferred: true;
  ok: boolean;
  blockers: string[];
};

export function validateCombinedUniquenessAndPinsV2(args: { repoRoot: string }): V2UniquenessAndPinsReport {
  const blockers: string[] = [];

  const stage150Abs = path.join(args.repoRoot, STAGE150_FROZEN_POPULATION_MANIFEST_REL);
  const stage150Doc: Stage150FrozenManifest | null = fs.existsSync(stage150Abs)
    ? (JSON.parse(fs.readFileSync(stage150Abs, "utf8")) as Stage150FrozenManifest)
    : null;
  if (!stage150Doc) blockers.push(`stage150_frozen_manifest_missing:${STAGE150_FROZEN_POPULATION_MANIFEST_REL}`);
  const stage150PinOk = stage150Doc?.orderedMembershipSha256 === STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN_V2;
  if (stage150Doc && !stage150PinOk) blockers.push("stage150_ordered_membership_sha_mismatch");
  if (stage150Doc && stage150Doc.membership.length !== 150) blockers.push(`stage150_population_count_not_150:${stage150Doc.membership.length}`);

  const new150Abs = path.join(args.repoRoot, NEW150_POPULATION_MANIFEST_REL);
  const new150Doc: New150ManifestDoc | null = fs.existsSync(new150Abs)
    ? (JSON.parse(fs.readFileSync(new150Abs, "utf8")) as New150ManifestDoc)
    : null;
  if (!new150Doc) blockers.push(`new150_manifest_missing:${NEW150_POPULATION_MANIFEST_REL}`);

  const packetHashMismatches: string[] = [];
  const packetsMissingOnDisk: string[] = [];
  let packetsPresentOnDisk = 0;
  for (const c of new150Doc?.cases ?? []) {
    const abs = path.join(args.repoRoot, c.relativePath);
    if (!fs.existsSync(abs)) {
      packetsMissingOnDisk.push(c.caseId);
      continue;
    }
    packetsPresentOnDisk += 1;
    const actual = sha256(fs.readFileSync(abs));
    if (actual !== c.packetSha256) packetHashMismatches.push(c.caseId);
  }
  if (new150Doc && new150Doc.accepted !== 150) blockers.push(`new150_accepted_count_not_150:${new150Doc.accepted}`);
  if (packetsMissingOnDisk.length) blockers.push(`new150_packets_missing_on_disk:${packetsMissingOnDisk.length}`);

  const stage150Ids = new Set((stage150Doc?.membership ?? []).map((m) => m.caseId));
  const new150Ids = new Set((new150Doc?.cases ?? []).map((c) => c.caseId));
  const overlap = [...stage150Ids].filter((id) => new150Ids.has(id));
  const union = new Set([...stage150Ids, ...new150Ids]);
  const combinedOk = overlap.length === 0 && union.size === 300;
  if (!combinedOk) blockers.push(`combined_uniqueness_failed:overlap=${overlap.length}:total=${union.size}`);

  return {
    schemaVersion: "stage300-v2-uniqueness-and-pins-validation@1.0.0",
    validatedAt: new Date().toISOString(),
    note:
      "v2 essential-43 bridge validator: verifies Stage-150 pins + new-150 packet hashes actually present on disk in this environment. Does not require the heavy original sources/ tree (gitignored, regenerable, not always materialised) — see module header.",
    stage150: {
      manifestFound: stage150Doc != null,
      orderedMembershipSha256Verified: !!stage150PinOk,
      populationCount: stage150Doc?.membership.length ?? 0,
    },
    new150: {
      manifestFound: new150Doc != null,
      accepted: new150Doc?.accepted ?? 0,
      packetHashMismatches,
      packetsPresentOnDisk,
      packetsMissingOnDisk,
    },
    combinedUniqueness: { totalUniqueCaseIds: union.size, overlapCaseIds: overlap, ok: combinedOk },
    brain1GuardianDeferred: true,
    ok: blockers.length === 0,
    blockers,
  };
}

export type V2MembershipRow = {
  orderIndex: number;
  caseId: string;
  cohort: "A" | "B";
  lineage: "stage150_frozen" | "stage300_new150";
  projectionOnly: boolean;
  packetRelativePath: string | null;
  packetSha256: string | null;
  sourceCasePath: string | null;
  casebrainOutputRelativePathV2: string | null;
  casebrainOutputSha256V2: string | null;
  casebrainOutputPresentV2: boolean;
};

export type V2FreezeReceipt = {
  schemaVersion: "stage300-v2-frozen-membership@1.0.0";
  runId: string;
  frozenAt: string;
  populationCount: number;
  productionOutputCases: number;
  projectionOnlyCases: number;
  orderedMembershipSha256V2: string;
  stage150OrderedMembershipSha256Pin: string;
  stage150CandidateFreezeSha256Pin: string;
  membership: V2MembershipRow[];
  note: string;
};

function rowFormula(m: V2MembershipRow): string {
  return `${m.orderIndex}|${m.caseId}|${m.cohort}|${m.lineage}|${m.packetSha256 ?? ""}|${m.casebrainOutputSha256V2 ?? ""}`;
}

export function freezeCombined300MembershipV2(args: { repoRoot: string; runId: string }): V2FreezeReceipt {
  const stage150Doc = JSON.parse(
    fs.readFileSync(path.join(args.repoRoot, STAGE150_FROZEN_POPULATION_MANIFEST_REL), "utf8"),
  ) as Stage150FrozenManifest;
  const new150Doc = JSON.parse(fs.readFileSync(path.join(args.repoRoot, NEW150_POPULATION_MANIFEST_REL), "utf8")) as New150ManifestDoc;

  const stage150Rows: V2MembershipRow[] = stage150Doc.membership.map((m) => ({
    orderIndex: 0,
    caseId: m.caseId,
    cohort: m.cohort,
    lineage: "stage150_frozen",
    projectionOnly: m.cohort === "A",
    packetRelativePath: m.packetRelativePath,
    packetSha256: m.packetSha256,
    sourceCasePath: m.sourceCasePath,
    // Stage-150 lineage: original per-case materialisation is not present on disk in this
    // environment (pin-only frozen manifest) — never fabricated.
    casebrainOutputRelativePathV2: null,
    casebrainOutputSha256V2: null,
    casebrainOutputPresentV2: false,
  }));

  const new150Rows: V2MembershipRow[] = new150Doc.cases.map((c) => {
    const historicalRel = `${NEW150_V1_HISTORICAL_WORK_ROOT}/${c.caseId}/casebrain-output.json`;
    const currentRel = `${NEW150_V1_CURRENT_WORK_ROOT}/${c.caseId}/casebrain-output.json`;
    const historicalAbs = path.join(args.repoRoot, historicalRel);
    const currentAbs = path.join(args.repoRoot, currentRel);
    const useRel = fs.existsSync(currentAbs) ? currentRel : fs.existsSync(historicalAbs) ? historicalRel : null;
    const useAbs = useRel ? path.join(args.repoRoot, useRel) : null;
    const packetAbs = path.join(args.repoRoot, c.relativePath);
    const packetSha256 = fs.existsSync(packetAbs) ? sha256(fs.readFileSync(packetAbs)) : c.packetSha256;
    return {
      orderIndex: 0,
      caseId: c.caseId,
      cohort: "B",
      lineage: "stage300_new150",
      projectionOnly: false,
      packetRelativePath: c.relativePath,
      packetSha256,
      sourceCasePath: null,
      casebrainOutputRelativePathV2: useRel,
      casebrainOutputSha256V2: useAbs ? sha256(fs.readFileSync(useAbs)) : null,
      casebrainOutputPresentV2: useAbs != null,
    };
  });

  const membership = [...stage150Rows, ...new150Rows].map((m, i) => ({ ...m, orderIndex: i }));
  const orderedMembershipSha256V2 = sha256(membership.map(rowFormula).join("\n"));

  return {
    schemaVersion: "stage300-v2-frozen-membership@1.0.0",
    runId: args.runId,
    frozenAt: new Date().toISOString(),
    populationCount: membership.length,
    productionOutputCases: membership.filter((m) => !m.projectionOnly).length,
    projectionOnlyCases: membership.filter((m) => m.projectionOnly).length,
    orderedMembershipSha256V2,
    stage150OrderedMembershipSha256Pin: STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN_V2,
    stage150CandidateFreezeSha256Pin: STAGE150_CANDIDATE_FREEZE_SHA256_PIN_V2,
    membership,
    note:
      "New v2-only orderedMembershipSha256V2 (distinct from v1's pin — v2 sources casebrain-output.json for new-150 from the historical work snapshot, not the original sources/ tree). Stage-150 pins preserved nested above, never recomputed.",
  };
}
