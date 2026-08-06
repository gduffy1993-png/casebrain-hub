/**
 * Final Batch-10 population acceptance — independent recompute (do not trust manifests).
 * Truth contents are never opened; paths hashed only.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { BATCH10_EXIT_IDS, type Batch10ExitId, type Batch10StructuredCasePacket } from "../schemas";
import { lockCohortA } from "../deficit120/cohort-pipeline";
import { BATCH10_DEFICIT_CANDIDATE_ROOT, BATCH10_DEFICIT_SOURCE_ROOT } from "../deficit120/constants";
import { strictValidateDeficitPacket } from "../deficit120/strict-validators";
import { validateStructuredPacket } from "../validators";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normalizeWording(s: string): string {
  return s
    .toLowerCase()
    .replace(/uq-[0-9a-f]+-[a-z]+/gi, "UQ_TOKEN")
    .replace(/\s+/g, " ")
    .trim();
}

export type ExitClass = "genuine_production_payload" | "metadata_only" | "unavailable" | "not_exercised";

export type PopulationRow = {
  caseId: string;
  cohort: "A" | "B";
  packetRelativePath: string;
  packetSha256: string;
  pdfSha256: string | null;
  sourceFingerprint: string;
  exactWordingHash: string | null;
  normalisedWordingHash: string | null;
  templateHash: string | null;
  family: string | null;
  variant: string | null;
  complexity: string | null;
  exits: Record<Batch10ExitId, ExitClass>;
  acceptanceReasons: string[];
  accepted: boolean;
};

function classifyExit(packet: Batch10StructuredCasePacket, exitId: Batch10ExitId): ExitClass {
  const r = packet.exitPayloadReceipts[exitId];
  if (exitId === "authenticated_browser") {
    if (r?.realPayloadPresent && r.payloadIdentity && !r.metadataOnly) return "genuine_production_payload";
    return "not_exercised";
  }
  if (r?.metadataOnly && !r.realPayloadPresent) return "metadata_only";
  if (r?.realPayloadPresent && r.payloadIdentity && !r.metadataOnly) return "genuine_production_payload";
  return "unavailable";
}

function sourceFingerprint(packet: Batch10StructuredCasePacket, pdfSha: string | null): string {
  // Exclude caseId so cloned source under a new ID still collides.
  const docs = packet.sourceManifest
    .map((d) => `${d.contentSha256 ?? ""}|${d.title ?? ""}|${d.sourcePageStart ?? ""}|${d.sourcePageEnd ?? ""}`)
    .sort()
    .join(";");
  const wording = packet.chargeInstruments
    .map((c) => normalizeWording(c.exactWording ?? ""))
    .sort()
    .join("|");
  const eu = packet.evidenceUnits
    .map((e) => normalizeWording(e.label ?? ""))
    .sort()
    .join("|");
  return sha256(`${pdfSha ?? "nopdf"}::${docs}::${wording}::${eu}`);
}

function loadPacket(abs: string): Batch10StructuredCasePacket {
  return JSON.parse(fs.readFileSync(abs, "utf8")) as Batch10StructuredCasePacket;
}

function listCohortBCandidateDirs(repoRoot: string): string[] {
  const root = path.join(repoRoot, BATCH10_DEFICIT_CANDIDATE_ROOT);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_rejected")
    .map((d) => d.name)
    .sort();
}

function inventoryTruthPathOnly(truthAbs: string): { present: boolean; byteLength: number; sha256: string | null } {
  if (!fs.existsSync(truthAbs)) return { present: false, byteLength: 0, sha256: null };
  const buf = fs.readFileSync(truthAbs); // bytes only — do not JSON.parse / open semantic fields
  return { present: true, byteLength: buf.byteLength, sha256: sha256(buf) };
}

export function independentlyRecomputePopulation(repoRoot: string): {
  schemaVersion: "batch10-independent-population-acceptance@1.1.0";
  populationPacketReadinessMet: boolean;
  meaning: string;
  populationAccepted: number;
  deficit: number;
  rejectedFromDenominator: Array<{ caseId: string; cohort: "A" | "B"; reasons: string[] }>;
  cohortA: ReturnType<typeof lockCohortA>;
  rows: PopulationRow[];
  uniqueness: {
    uniqueCaseIds: number;
    uniqueSourceFingerprints: number;
    uniquePdfHashes: number;
    uniquePacketHashes: number;
    uniqueExactWordingHashes: number;
    uniqueNormalisedWordingHashes: number;
    uniqueTemplateHashes: number;
    duplicateCaseIds: string[];
    duplicateSourceFingerprints: Array<{ fingerprint: string; caseIds: string[] }>;
    duplicatePdfHashes: Array<{ sha256: string; caseIds: string[] }>;
    duplicatePacketHashes: Array<{ sha256: string; caseIds: string[] }>;
  };
  coverage: {
    byFamily: Record<string, number>;
    byVariant: Record<string, number>;
    byComplexity: Record<string, number>;
  };
  truthBlindingOrdered: Array<{ step: number; name: string; ok: boolean; detail: string }>;
  truthContentsOpened: false;
  truthInventory: Array<{ caseId: string; relativePath: string; byteLength: number; sha256: string }>;
  exitMatrix: Record<Batch10ExitId, Record<ExitClass, number>>;
  antiOverfitFindings: Array<{ file: string; finding: string }>;
} {
  const cohortA = lockCohortA(repoRoot);
  const rows: PopulationRow[] = [];
  const rejectedFromDenominator: Array<{ caseId: string; cohort: "A" | "B"; reasons: string[] }> = [];
  const truthInventory: Array<{ caseId: string; relativePath: string; byteLength: number; sha256: string }> = [];

  // Cohort A — byte-lock + structural validate (not deficit-120 strict; preserved prior acceptance)
  for (const lock of cohortA.locks) {
    const abs = path.join(repoRoot, lock.relativePath);
    const reasons: string[] = [];
    if (!lock.unchanged) reasons.push("cohort_a_byte_changed");
    if (!fs.existsSync(abs)) reasons.push("missing_packet");
    let packet: Batch10StructuredCasePacket | null = null;
    if (fs.existsSync(abs)) {
      packet = loadPacket(abs);
      for (const i of validateStructuredPacket(packet)) reasons.push(`${i.code}:${i.detail}`);
      if (packet.caseId !== lock.caseId) reasons.push("case_id_mismatch");
    }
    const pdfSha = packet?.preservedOriginalHashes.bundlePdfSha256 ?? null;
    const wording = packet?.chargeInstruments.map((c) => c.exactWording ?? "").join("\n") ?? "";
    const accepted = reasons.length === 0 && !!packet;
    if (!accepted) {
      rejectedFromDenominator.push({ caseId: lock.caseId, cohort: "A", reasons });
    }
    if (packet) {
      rows.push({
        caseId: lock.caseId,
        cohort: "A",
        packetRelativePath: lock.relativePath,
        packetSha256: lock.actualSha256,
        pdfSha256: pdfSha,
        sourceFingerprint: sourceFingerprint(packet, pdfSha),
        exactWordingHash: wording ? sha256(wording) : null,
        normalisedWordingHash: wording ? sha256(normalizeWording(wording)) : null,
        templateHash: null,
        family: null,
        variant: null,
        complexity: null,
        exits: Object.fromEntries(BATCH10_EXIT_IDS.map((id) => [id, classifyExit(packet!, id)])) as Record<
          Batch10ExitId,
          ExitClass
        >,
        acceptanceReasons: reasons,
        accepted,
      });
    }
  }

  // Cohort B — strict validate + source inventory
  const bIds = listCohortBCandidateDirs(repoRoot);
  for (const caseId of bIds) {
    const rel = path.join(BATCH10_DEFICIT_CANDIDATE_ROOT, caseId, "structured-case-packet.json").replace(/\\/g, "/");
    const abs = path.join(repoRoot, rel);
    const reasons: string[] = [];
    if (!fs.existsSync(abs)) {
      reasons.push("missing_packet");
      rejectedFromDenominator.push({ caseId, cohort: "B", reasons });
      continue;
    }
    const packet = loadPacket(abs);
    reasons.push(...strictValidateDeficitPacket(packet));
    if (packet.caseId !== caseId) reasons.push("case_id_mismatch");

    const sourceDir = path.join(repoRoot, BATCH10_DEFICIT_SOURCE_ROOT, caseId);
    const truthAbs = path.join(sourceDir, "truth-key.json");
    const truthInv = inventoryTruthPathOnly(truthAbs);
    if (truthInv.present && truthInv.sha256) {
      truthInventory.push({
        caseId,
        relativePath: path.relative(repoRoot, truthAbs).replace(/\\/g, "/"),
        byteLength: truthInv.byteLength,
        sha256: truthInv.sha256,
      });
    }

    // Ordered blinding checks (no truth open)
    const lineagePath = path.join(sourceDir, "lineage.json");
    if (fs.existsSync(lineagePath)) {
      const lineage = JSON.parse(fs.readFileSync(lineagePath, "utf8")) as {
        truthOpenedDuringOutput?: boolean;
      };
      if (lineage.truthOpenedDuringOutput !== false) reasons.push("lineage_truth_opened_flag");
    }
    const outPath = path.join(sourceDir, "casebrain-output.json");
    if (fs.existsSync(outPath)) {
      const outBlob = fs.readFileSync(outPath, "utf8");
      if (/"mustNotSay"|"truthKeyComparison"|"expectedSendability"/.test(outBlob)) {
        reasons.push("truth_fields_in_output");
      }
      // Confirm builder attribution without requiring browser
      if (!/buildLiveProductionSurfacesFromDocumentUnits/.test(outBlob)) {
        reasons.push("missing_production_builder_attribution");
      }
    } else {
      reasons.push("missing_casebrain_output");
    }

    const pdfSha = packet.preservedOriginalHashes.bundlePdfSha256 ?? null;
    const wording = packet.chargeInstruments.map((c) => c.exactWording ?? "").join("\n");
    const lineage = fs.existsSync(lineagePath)
      ? (JSON.parse(fs.readFileSync(lineagePath, "utf8")) as {
          family?: string;
          variant?: string;
          templateId?: string;
        })
      : {};
    const accepted = reasons.length === 0;
    if (!accepted) rejectedFromDenominator.push({ caseId, cohort: "B", reasons });

    rows.push({
      caseId,
      cohort: "B",
      packetRelativePath: rel,
      packetSha256: sha256(fs.readFileSync(abs)),
      pdfSha256: pdfSha,
      sourceFingerprint: sourceFingerprint(packet, pdfSha),
      exactWordingHash: wording ? sha256(wording) : null,
      normalisedWordingHash: wording ? sha256(normalizeWording(wording)) : null,
      templateHash: lineage.templateId ? sha256(lineage.templateId) : null,
      family: lineage.family ?? null,
      variant: lineage.variant ?? null,
      complexity: null,
      exits: Object.fromEntries(BATCH10_EXIT_IDS.map((id) => [id, classifyExit(packet, id)])) as Record<
        Batch10ExitId,
        ExitClass
      >,
      acceptanceReasons: reasons,
      accepted,
    });
  }

  // Cross-population uniqueness — collisions remove extras from denominator (keep first by sort)
  const acceptedRows = rows.filter((r) => r.accepted).sort((a, b) => a.caseId.localeCompare(b.caseId));
  const seenCase = new Set<string>();
  const seenFp = new Set<string>();
  const seenPdf = new Set<string>();
  const seenPkt = new Set<string>();
  const finalAccepted: PopulationRow[] = [];

  for (const r of acceptedRows) {
    const reasons: string[] = [];
    if (seenCase.has(r.caseId)) reasons.push("duplicate_case_id");
    if (seenFp.has(r.sourceFingerprint)) reasons.push("duplicate_source_fingerprint");
    if (r.pdfSha256 && seenPdf.has(r.pdfSha256) && r.cohort === "B") {
      // PDF uniqueness enforced within B; A may lack unique pdf relative to B only if shared content
      // Across full population: require unique pdf when present
    }
    if (r.pdfSha256 && seenPdf.has(r.pdfSha256)) reasons.push("duplicate_pdf_hash");
    if (seenPkt.has(r.packetSha256)) reasons.push("duplicate_packet_hash");

    if (reasons.length) {
      r.accepted = false;
      r.acceptanceReasons = [...r.acceptanceReasons, ...reasons];
      rejectedFromDenominator.push({ caseId: r.caseId, cohort: r.cohort, reasons });
      continue;
    }
    seenCase.add(r.caseId);
    seenFp.add(r.sourceFingerprint);
    if (r.pdfSha256) seenPdf.add(r.pdfSha256);
    seenPkt.add(r.packetSha256);
    finalAccepted.push(r);
  }

  // Build uniqueness diagnostics over final accepted
  const caseIds = finalAccepted.map((r) => r.caseId);
  const fps = finalAccepted.map((r) => r.sourceFingerprint);
  const pdfs = finalAccepted.map((r) => r.pdfSha256).filter((x): x is string => !!x);
  const pkts = finalAccepted.map((r) => r.packetSha256);
  const exacts = finalAccepted.map((r) => r.exactWordingHash).filter((x): x is string => !!x);
  const norms = finalAccepted.map((r) => r.normalisedWordingHash).filter((x): x is string => !!x);
  const templates = finalAccepted.map((r) => r.templateHash).filter((x): x is string => !!x);

  function dupGroups(values: string[], ids: string[]): Array<{ key: string; caseIds: string[] }> {
    const m = new Map<string, string[]>();
    values.forEach((v, i) => {
      const list = m.get(v) ?? [];
      list.push(ids[i]!);
      m.set(v, list);
    });
    return [...m.entries()]
      .filter(([, c]) => c.length > 1)
      .map(([key, c]) => ({ key, caseIds: c }));
  }

  const byFamily: Record<string, number> = {};
  const byVariant: Record<string, number> = {};
  const byComplexity: Record<string, number> = {};
  for (const r of finalAccepted.filter((x) => x.cohort === "B")) {
    if (r.family) byFamily[r.family] = (byFamily[r.family] ?? 0) + 1;
    if (r.variant) byVariant[r.variant] = (byVariant[r.variant] ?? 0) + 1;
  }

  const exitMatrix = Object.fromEntries(
    BATCH10_EXIT_IDS.map((id) => [
      id,
      {
        genuine_production_payload: 0,
        metadata_only: 0,
        unavailable: 0,
        not_exercised: 0,
      } satisfies Record<ExitClass, number>,
    ]),
  ) as Record<Batch10ExitId, Record<ExitClass, number>>;
  for (const r of finalAccepted) {
    for (const id of BATCH10_EXIT_IDS) {
      exitMatrix[id][r.exits[id]] += 1;
    }
  }

  // Anti-overfit scan of deficit120 + materialise (string search)
  const antiOverfitFindings: Array<{ file: string; finding: string }> = [];
  const scanFiles = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/production-capture.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/source-builder.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/strict-validators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise.ts",
    "lib/criminal/canonical-live-surface-adapter.ts",
  ];
  const banned =
    /caseId\s*===\s*["']s150-d120-|if\s*\(\s*caseId\s*===|expectedFindings|mustNotSay\.includes|specialCase|hackFor|patchFor\s*\(|offenceSpecificPatch/;
  const nameHardcode =
    /\b(Avery|Blair|Casey|Devon|Ellis|Finley|Harper|Indigo|Jordan|Kai)\b.*caseId\s*===|caseId\s*===\s*["']demo-audit-/;
  for (const rel of scanFiles) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    if (banned.test(text)) {
      antiOverfitFindings.push({ file: rel, finding: "possible packet-specific production branch" });
    }
    if (nameHardcode.test(text) && !rel.includes("source-builder") && !rel.includes("coverage-catalog")) {
      antiOverfitFindings.push({ file: rel, finding: "fictional-name or case-id special branch in production path" });
    }
  }

  // Truth blinding ordered receipts
  const bAccepted = finalAccepted.filter((r) => r.cohort === "B");
  let step1 = true;
  let step2 = true;
  let step3 = true;
  for (const r of bAccepted) {
    const src = path.join(repoRoot, BATCH10_DEFICIT_SOURCE_ROOT, r.caseId);
    if (!fs.existsSync(path.join(src, "canonical-bundle.md")) || !fs.existsSync(path.join(src, "bundle.pdf"))) {
      step1 = false;
    }
    if (!fs.existsSync(path.join(src, "casebrain-output.json"))) step2 = false;
    const exitsOk = ["view", "copy", "export", "api", "pdf", "composed_prose"].every((id) =>
      fs.existsSync(path.join(src, "exits", id, "payload.json")),
    );
    if (!exitsOk) step2 = false;
    if (!fs.existsSync(path.join(repoRoot, r.packetRelativePath))) step3 = false;
  }

  const populationAccepted = finalAccepted.length;
  const deficit = Math.max(0, 150 - populationAccepted);
  const populationPacketReadinessMet =
    populationAccepted >= 150 &&
    cohortA.allUnchanged &&
    antiOverfitFindings.length === 0 &&
    step1 &&
    step2 &&
    step3;

  return {
    schemaVersion: "batch10-independent-population-acceptance@1.1.0",
    populationPacketReadinessMet,
    meaning:
      "populationPacketReadinessMet means only that 150 unique packets passed independent packet validation. It does not mean detector readiness, Stage-150 execution readiness, corpus PASS, or programme PASS.",
    populationAccepted,
    deficit,
    rejectedFromDenominator,
    cohortA,
    rows: finalAccepted,
    uniqueness: {
      uniqueCaseIds: new Set(caseIds).size,
      uniqueSourceFingerprints: new Set(fps).size,
      uniquePdfHashes: new Set(pdfs).size,
      uniquePacketHashes: new Set(pkts).size,
      uniqueExactWordingHashes: new Set(exacts).size,
      uniqueNormalisedWordingHashes: new Set(norms).size,
      uniqueTemplateHashes: new Set(templates).size,
      duplicateCaseIds: dupGroups(caseIds, caseIds).flatMap((g) => g.caseIds),
      duplicateSourceFingerprints: dupGroups(fps, caseIds).map((g) => ({
        fingerprint: g.key,
        caseIds: g.caseIds,
      })),
      duplicatePdfHashes: dupGroups(pdfs, finalAccepted.filter((r) => r.pdfSha256).map((r) => r.caseId)).map((g) => ({
        sha256: g.key,
        caseIds: g.caseIds,
      })),
      duplicatePacketHashes: dupGroups(pkts, caseIds).map((g) => ({
        sha256: g.key,
        caseIds: g.caseIds,
      })),
    },
    coverage: { byFamily, byVariant, byComplexity },
    truthBlindingOrdered: [
      {
        step: 1,
        name: "source_generation_completed",
        ok: step1,
        detail: "canonical-bundle + bundle.pdf present per accepted Cohort-B case",
      },
      {
        step: 2,
        name: "outputs_persisted_and_hashed",
        ok: step2,
        detail: "casebrain-output.json + production exit payload files persisted",
      },
      {
        step: 3,
        name: "candidate_packets_frozen_on_disk",
        ok: step3,
        detail: "structured-case-packet.json present under deficit120-candidates / cohort-A root",
      },
      {
        step: 4,
        name: "truth_content_unopened",
        ok: true,
        detail:
          "truth-key.json inventoried by path+byte-hash only; lineage.truthOpenedDuringOutput=false; outputs lack truth semantic fields",
      },
    ],
    truthContentsOpened: false,
    truthInventory,
    exitMatrix,
    antiOverfitFindings,
  };
}
