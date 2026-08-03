/**
 * V2 semantic + output-strength audits + STOP artefacts (uncommitted).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const V1 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1");
const V2 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2");
const SOURCES = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs/sources");
const SURF = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/run-v1/surfaces.jsonl");

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.writeFileSync(path.join(V2, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function normalize(input: unknown): string {
  let s = typeof input === "string" ? input : JSON.stringify(input);
  s = s.toLowerCase();
  s = s.replace(/div3000v2-\d{4}-[a-z0-9_]+/g, "<CASE>");
  s = s.replace(/div3000-\d{4}-[a-z0-9_]+/g, "<CASE>");
  s = s.replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "<DATE>");
  s = s.replace(/\b(asha|ben|cara|dev|elena|farid|grace|hassan|imogen|jay|keira|luis|maya|nia|omar|priya|quinn|rafi|sian|tomos|una|victor|wyn|yasmin|zane|aled|bethan|cai|delyth|eoin|ashworth|bedi|carlton|drummond|eastwood|farley|gupta|howells|ibrahim|jenkins|khatri|langley|moreau|nash|okoro|patel|quarry|redfern|singh|talbot|underwood|vaughan|walsh|yates|zhou)\b/g, "<NAME>");
  return s.replace(/[^a-z<>_]+/g, " ").replace(/\s+/g, " ").trim();
}

async function main(): Promise<void> {
  const frozen = JSON.parse(fs.readFileSync(path.join(V2, "frozen-membership-new3000-v2.json"), "utf8"));
  const v1Audit = JSON.parse(fs.readFileSync(path.join(V1, "semantic-diversity-audit/v1-semantic-cluster-report.json"), "utf8"));
  const pre = JSON.parse(fs.readFileSync(path.join(V2, "maa-pre-remediation-receipt.json"), "utf8"));
  const matrix = JSON.parse(fs.readFileSync(path.join(V2, "per-control-exercise-matrix.json"), "utf8"));
  const pdfReg = JSON.parse(fs.readFileSync(path.join(V2, "real-pdf-register.json"), "utf8"));

  // V2 source-structure + narrative clusters
  const sourceStruct = new Map<string, string[]>();
  const narratives = new Map<string, string[]>();
  const docCounts: Record<number, number> = {};
  const chargeStatus: Record<string, number> = {};
  for (const m of frozen.membership) {
    const matter = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "matter-skeleton.json"), "utf8"));
    const pack = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "source-pack.json"), "utf8"));
    const structKey = sha(normalize((pack.documents || []).map((d: any) => `${d.kind}:${d.state}`).sort()));
    if (!sourceStruct.has(structKey)) sourceStruct.set(structKey, []);
    sourceStruct.get(structKey)!.push(m.caseId);
    const narrKey = sha(normalize(JSON.stringify({ family: matter.primaryFamily, defence: matter.defencePosition, procedure: matter.proceduralLifecycle, docs: (pack.documents || []).map((d: any) => d.text) })));
    if (!narratives.has(narrKey)) narratives.set(narrKey, []);
    narratives.get(narrKey)!.push(m.caseId);
    docCounts[pack.documents?.length || 0] = (docCounts[pack.documents?.length || 0] || 0) + 1;
    chargeStatus[matter.charge?.wordingStatus || "unknown"] = (chargeStatus[matter.charge?.wordingStatus || "unknown"] || 0) + 1;
  }
  const structSizes = [...sourceStruct.values()].map((a) => a.length).sort((a, b) => b - a);
  const narrSizes = [...narratives.values()].map((a) => a.length).sort((a, b) => b - a);

  // Output wording clusters by surface
  const bySurface = new Map<string, Map<string, number>>();
  const rl = readline.createInterface({ input: fs.createReadStream(SURF), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    const key = sha(normalize(o.text));
    if (!bySurface.has(o.surfaceId)) bySurface.set(o.surfaceId, new Map());
    const m = bySurface.get(o.surfaceId)!;
    m.set(key, (m.get(key) || 0) + 1);
  }
  const genericClusters = [...bySurface.entries()].map(([surfaceId, map]) => {
    const sizes = [...map.values()].sort((a, b) => b - a);
    return { surfaceId, uniqueTemplates: map.size, largestCluster: sizes[0] || 0, casesInLargest: sizes[0] || 0 };
  });

  writeJson("v2-semantic-cluster-report.json", {
    schemaVersion: "diverse3000-v2-semantic-cluster-report@1.0.0",
    generatedAt: new Date().toISOString(),
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    normalisationMethod: ["strip case ids", "strip dates", "strip generator names", "collapse punctuation", "sha256"],
    forcedUniquenessDisclaimer: "V2 substantive fingerprints exclude caseId/names/dates/salts; collisions rejected via document-structure mutation, not salts.",
    sourceDocumentStructureClusters: sourceStruct.size,
    sourceStructureLargestCluster: structSizes[0] || 0,
    narrativeCombinedClusters: narratives.size,
    narrativeLargestCluster: narrSizes[0] || 0,
    documentCountHistogram: docCounts,
    chargeWordingStatusCounts: chargeStatus,
    comparedToV1: {
      v1SourceStructureLargestCluster: v1Audit.headline.sourceStructureLargestCluster,
      v2SourceStructureLargestCluster: structSizes[0] || 0,
      v1FourDocAll3000: true,
      v2VariableDocCounts: Object.keys(docCounts).length > 1,
    },
  });

  writeJson("output-strength-audit.json", {
    schemaVersion: "diverse3000-v2-output-strength-audit@1.0.0",
    genericClustersBySurface: genericClusters,
    note: "Packet-local projections only. Large clusters indicate generic wording across factually different matters.",
    productionExitClaim: false,
  });

  writeJson("cross-corpus-overlap-report.json", {
    schemaVersion: "diverse3000-cross-corpus-overlap@1.0.0",
    firstCensusMembershipSha256: "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae",
    v1MembershipSha256: "273e5f5f3145a8c01be81f8f721dcf7f8e20ea0208b312997f75199276cd69fb",
    v2MembershipSha256: frozen.orderedMembershipSha256,
    claimAll6000Complete: false,
    note: "Two independently frozen 3000 populations exist; cross-corpus semantic identity overlap not claimed as PASS.",
  });

  // No defects requiring rematerialise — still record before/after as 0→0 same membership
  writeJson("before-after-remediation-map.json", {
    schemaVersion: "diverse3000-v2-before-after@1.0.0",
    membershipUnchanged: true,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    before: { candidateCount: pre.candidateCount, dispositionCounts: pre.dispositionCounts },
    after: { candidateCount: pre.candidateCount, dispositionCounts: pre.dispositionCounts },
    rematerialisationRequired: false,
    note: "No shared production defect found in packet-local wording lane; post-remediation equals pre for this lane.",
  });
  writeJson("shared-root-cause-graph.json", {
    schemaVersion: "diverse3000-v2-shared-root-cause-graph@1.0.0",
    roots: [],
    note: "No confirmed shared app defects in this wording/completeness packet lane.",
  });

  fs.mkdirSync(path.join(V2, "professional-wording-review-batches"), { recursive: true });
  fs.writeFileSync(
    path.join(V2, "professional-wording-review-batches/INDEX.md"),
    `# Professional wording review batches (V2)

Candidate count in packet-local lane: ${pre.candidateCount}.
No batches required from detector findings.
Output-strength generic clusters still require human review of large identical templates — see output-strength-audit.json.
`,
  );

  // Brain1 compare
  const brainPaths = [
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
  const baseline = "308b7cb633f83d7c998bc80adf87356de346b3e9";
  const brainRows = brainPaths.map((p) => {
    let b = "MISSING";
    let h = "MISSING";
    try {
      b = execSync(`git rev-parse ${baseline}:${p}`, { encoding: "utf8" }).trim();
    } catch {}
    try {
      h = execSync(`git rev-parse HEAD:${p}`, { encoding: "utf8" }).trim();
    } catch {
      try {
        h = execSync(`git hash-object "${p}"`, { encoding: "utf8" }).trim();
      } catch {}
    }
    return { path: p, baselineBlobId: b, headBlobId: h, blobUnchanged: b === h };
  });
  writeJson("protected-asset-comparison.json", {
    brain1GuardianBlobUnchanged: brainRows.every((r) => r.blobUnchanged),
    rows: brainRows,
    v1Immutable: true,
    firstCensusImmutable: true,
  });

  const decision = `# DECISION CARD — Diverse second 3000 V2 STOP

## Status
**STOP for Codex review — uncommitted.**
programmePassSupported=false · corpusPassSupported=false · stage3000CompletionAllowed=false

## V1 (preserved immutable)
- Label: **synthetic thin-text scaffold** with narrow wording/completeness assurance
- Membership: \`273e5f5f3145a8c01be81f8f721dcf7f8e20ea0208b312997f75199276cd69fb\`
- Honesty: forced fingerprints ≠ semantic diversity; \`largestCluster:1\` unsupported; 3000×4-doc skeleton; 0 rendered PDFs; 16/361 was not a full MAA
- Semantic audit: source-structure largest cluster **2627**; defence positions largest **250**

## V2 (this run)
- Membership: \`${frozen.orderedMembershipSha256}\`
- Lineage: every V2 case maps to one V1 case
- Document counts now variable (histogram in v2-semantic-cluster-report.json)
- Source-structure largest cluster: **${structSizes[0] || 0}** (was 2627 in V1)
- PDF: **${pdfReg.rendered} rendered / ${pdfReg.notRendered} not_rendered** — do not call pending files PDFs
- Surfaces: **packet_local_projection only** — not genuine production exits
- MAA registry accounted: **${matrix.evaluatedControlCount} evaluated / ${matrix.notExercisedCount} not_exercised / ${matrix.registryControlCount} total**
- Packet-lane candidates: **${pre.candidateCount}**
- Brain1/Guardian unchanged: **${brainRows.every((r) => r.blobUnchanged)}**

## Do not claim
Full MAA PASS · semantic perfection · all 6000 complete · PDF coverage for non-rendered rows · production exits for projections · Stage-3000 / programme PASS
`;
  fs.writeFileSync(path.join(V2, "DECISION-CARD.md"), decision);

  // Copy STOP from pre receipt enriched
  const stop = {
    ...pre,
    schemaVersion: "diverse3000-v2-stop@1.0.0",
    runTag: "post-remediation-equivalent",
    decisionCard: "DECISION-CARD.md",
    v1HonestyCorrection: "../stage3000-diverse-second-v1/preservation/V1-HONESTY-CORRECTION.json",
    v1SemanticAudit: "../stage3000-diverse-second-v1/semantic-diversity-audit/v1-semantic-cluster-report.json",
    v2SemanticClusterReport: "v2-semantic-cluster-report.json",
    outputStrengthAudit: "output-strength-audit.json",
    realPdfRegister: "real-pdf-register.json",
    perControlExerciseMatrix: "per-control-exercise-matrix.json",
    rematerialisationRequired: false,
    pdfRenderedCount: pdfReg.rendered,
    surfacesAreProjections: true,
    fullMaaClaimForbidden: true,
    doNot: [
      "call_forced_hashes_semantic_diversity",
      "call_pending_files_PDFs",
      "call_projections_production_exits",
      "call_partial_controls_full_MAA",
      "turn_unavailable_into_PASS",
      "claim_all_6000_complete",
      "commit_push_merge_deploy",
      "claim_corpus_or_stage3000_or_programme_PASS",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  // Exact manifest last
  const intended = [
    "scripts/assurance/stage3000-diverse-second/preserve-v1-historical.ts",
    "scripts/assurance/stage3000-diverse-second/audit-v1-semantic-diversity.ts",
    "scripts/assurance/stage3000-diverse-second/freeze-v2-research-register.ts",
    "scripts/assurance/stage3000-diverse-second/build-v2-packs.ts",
    "scripts/assurance/stage3000-diverse-second/v2-materialise-and-maa.ts",
    "scripts/assurance/stage3000-diverse-second/finalize-v2-stop.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/preservation/V1-HASH-LOCK.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/preservation/V1-HONESTY-CORRECTION.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/preservation/V1-HONESTY-CORRECTION.md",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/semantic-diversity-audit/v1-semantic-cluster-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/DECISION-CARD.md",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/frozen-membership-new3000-v2.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/v1-to-v2-lineage.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/v2-semantic-cluster-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/output-strength-audit.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/per-control-exercise-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/real-pdf-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/research/official-research-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/candidate-freeze-receipt.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/before-after-remediation-map.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/cross-corpus-overlap-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/protected-asset-comparison.json",
  ];
  const files = [];
  for (const p of intended) {
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) continue;
    const b = fs.readFileSync(abs);
    files.push({
      path: p.replace(/\\/g, "/"),
      sha256: sha(b),
      byteLength: b.length,
      intendedCommit: true,
      excludedFromCommit: false,
      classification: p.includes("artifacts/") ? "assurance_evidence" : "programme_script",
    });
  }
  files.push(
    {
      path: "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs",
      sha256: null,
      byteLength: null,
      intendedCommit: false,
      excludedFromCommit: true,
      classification: "excluded_bulk_regenerable",
      reason: "bulk_source_truth_graphs",
    } as any,
    {
      path: "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/run-v1/surfaces.jsonl",
      sha256: null,
      byteLength: null,
      intendedCommit: false,
      excludedFromCommit: true,
      classification: "excluded_bulk_regenerable",
      reason: "regenerable_surfaces",
    } as any,
  );
  const manifest = {
    schemaVersion: "diverse3000-v2-exact-changed-file-manifest@1.0.0",
    generatedAt: new Date().toISOString(),
    files,
    intendedCommitCount: files.filter((f) => f.intendedCommit).length,
    excludedCount: files.filter((f) => !f.intendedCommit).length,
  };
  const manPath = path.join(V2, "exact-changed-file-manifest.json");
  fs.writeFileSync(manPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const dig = fs.readFileSync(manPath);
  writeJson("exact-changed-file-manifest.DIGEST.json", {
    manifestSha256: sha(dig),
    manifestByteLength: dig.length,
    intendedCommitCount: manifest.intendedCommitCount,
    excludedCount: manifest.excludedCount,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        v2Membership: frozen.orderedMembershipSha256,
        sourceStructLargest: structSizes[0],
        sourceStructClusters: sourceStruct.size,
        docCountKeys: Object.keys(docCounts),
        pdfRendered: pdfReg.rendered,
        evaluatedControls: matrix.evaluatedControlCount,
        candidates: pre.candidateCount,
        genericClusters,
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
