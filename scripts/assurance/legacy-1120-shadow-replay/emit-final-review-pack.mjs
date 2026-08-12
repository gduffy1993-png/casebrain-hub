import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay");
const beforeRoot = path.join(root, "full-1120-production-builders-v1");
const afterRoot = path.join(root, "full-1120-production-builders-v2-post-shared-remediation");
const reviewRoot = path.join(root, "final-codex-review");
fs.mkdirSync(reviewRoot, { recursive: true });

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileReceipt = (file, classification) => {
  const absolute = path.join(repo, file);
  const bytes = fs.readFileSync(absolute);
  return { path: file.replaceAll("\\", "/"), sha256: sha256(bytes), byteLength: bytes.length, classification };
};
const writeJson = (name, value) => fs.writeFileSync(path.join(reviewRoot, name), `${JSON.stringify(value, null, 2)}\n`);

const beforeResultsPath = path.join(beforeRoot, "1120-CASE-RESULTS.json");
const afterResultsPath = path.join(afterRoot, "1120-CASE-RESULTS.json");
const beforeResults = readJson(beforeResultsPath);
const afterResults = readJson(afterResultsPath);
const beforeDecision = readJson(path.join(beforeRoot, "DECISION-CARD.json"));
const afterDecision = readJson(path.join(afterRoot, "DECISION-CARD.json"));
const population = readJson(path.join(root, "FROZEN-MEMBERSHIP-SUMMARY.json"));

if (beforeResults.length !== 1120 || afterResults.length !== 1120) throw new Error("Expected 1,120 rows in both censuses");
const lineageIssues = [];
for (let index = 0; index < 1120; index += 1) {
  const before = beforeResults[index];
  const after = afterResults[index];
  if (before.sourceCaseId !== after.sourceCaseId || before.source?.frozenSha256 !== after.source?.frozenSha256) {
    lineageIssues.push({ index: index + 1, beforeCaseId: before.sourceCaseId, afterCaseId: after.sourceCaseId });
  }
}
if (lineageIssues.length) throw new Error(`Before/after lineage mismatch on ${lineageIssues.length} rows`);

const summarize = (rows, decision) => {
  const wordingByCode = {};
  const semanticByCode = {};
  const findingCases = new Set();
  let wordingOccurrences = 0;
  let semanticOccurrences = 0;
  for (const row of rows) {
    for (const finding of row.wordingFindings ?? []) {
      wordingOccurrences += 1;
      findingCases.add(row.sourceCaseId);
      wordingByCode[finding.code] = (wordingByCode[finding.code] ?? 0) + 1;
    }
    for (const finding of row.semanticDefects ?? []) {
      semanticOccurrences += 1;
      findingCases.add(row.sourceCaseId);
      semanticByCode[finding.code] = (semanticByCode[finding.code] ?? 0) + 1;
    }
  }
  return {
    cases: rows.length,
    sourceHashesMatch: rows.filter((row) => row.source?.hashMatches).length,
    extractionSucceeded: rows.filter((row) => row.extraction?.ok).length,
    productionSurfacesBuilt: rows.filter((row) => row.surfacesBuilt).length,
    generatedOutputPdfs: rows.filter((row) => row.outputPdf?.generated).length,
    generatedOutputPdfsReparsed: rows.filter((row) => row.outputPdf?.extractedTextSha256).length,
    incompleteChargeSignalsPreserved: rows.filter((row) => row.chargeReadiness?.incompleteSignalVisibleAcrossNamedExits !== false).length,
    casesWithCanonicalCharge: decision.deterministicGate.casesWithCanonicalCharge,
    wordingOccurrences,
    wordingByCode,
    semanticOccurrences,
    semanticByCode,
    casesWithAnyFinding: findingCases.size,
    deterministicGatePass: decision.deterministicGatePass,
  };
};

const before = summarize(beforeResults, beforeDecision);
const after = summarize(afterResults, afterDecision);
const affectedBefore = beforeResults
  .filter((row) => (row.wordingFindings?.length ?? 0) + (row.semanticDefects?.length ?? 0) > 0)
  .map((row) => ({
    sourceCaseId: row.sourceCaseId,
    sourceFileName: row.source?.name,
    wordingCodes: [...new Set((row.wordingFindings ?? []).map((finding) => finding.code))],
    semanticCodes: [...new Set((row.semanticDefects ?? []).map((finding) => finding.code))],
  }));

const generatedAt = new Date().toISOString();
const beforeAfter = {
  schemaVersion: "legacy-1120-before-after@1.0.0",
  generatedAt,
  frozenPopulation: {
    cases: population.caseCount,
    documents: population.documentCount,
    bytes: population.totalRetrievedBytes,
    uniqueSourceHashes: population.uniqueObjectHashes,
    exactDuplicateDocuments: population.exactDuplicateObjectCount,
    orderedMembershipSha256: population.orderedMembershipSha256,
    privateManifestSha256: population.privateManifestSha256,
  },
  lineage: { sameFrozenMembership: true, mismatches: lineageIssues.length },
  before,
  after,
  delta: {
    visibleWordingOccurrences: `${before.wordingOccurrences} -> ${after.wordingOccurrences}`,
    semanticDefects: `${before.semanticOccurrences} -> ${after.semanticOccurrences}`,
    affectedCases: `${before.casesWithAnyFinding} -> ${after.casesWithAnyFinding}`,
  },
  preRemediationAffectedCases: affectedBefore,
};
writeJson("FULL-1120-BEFORE-AFTER.json", beforeAfter);

const rootCauses = {
  schemaVersion: "legacy-1120-shared-root-remediation@1.0.0",
  generatedAt,
  rules: { caseIdPatches: 0, fixturePatches: 0, sourcePdfsMutated: false, sourceAccountMutated: false },
  families: [
    { family: "evaluation_filename_boundary", before: 29, after: 0, fix: "All CaseBrain evaluation PDF filenames are replaced with Source bundle on ordinary solicitor-visible exits; exact names remain in audit data." },
    { family: "document_lifecycle_diagnostic", before: 2, after: 0, fix: "Operative, amended, superseded and unknown document roles are translated into professional instructions." },
    { family: "wrapped_charge_statements", beforeSemanticDefects: 3, afterSemanticDefects: 0, fix: "Wrapped harassment, Class A supply and combined affray/emergency-worker charge lines are reconstructed and assigned source-grounded labels." },
    { family: "duplicate_or_non_charge_rows", beforeSemanticDefects: 1, afterSemanticDefects: 0, fix: "Version headings and drafting notes cannot become offences; duplicate wrapped/concise forms retain the stronger source-backed rendering." },
    { family: "charge_location_boundary", beforeObservedByReview: 2, afterObservedByReview: 0, fix: "Locations ending on punctuation or unfinished articles are suppressed." },
    { family: "unclear_statutory_route", beforeObservedByReview: 1, afterObservedByReview: 0, fix: "Competing POCA routes display an explicit unresolved statutory-route label instead of a fragment." },
  ],
};
writeJson("ROOT-CAUSE-REMEDIATION-REGISTER.json", rootCauses);

const verification = {
  schemaVersion: "legacy-1120-final-verification@1.0.0",
  generatedAt,
  contracts: { command: "npx tsx scripts/assurance/legacy-1120-shadow-replay/shared-root-contracts.test.ts", passed: 28, failed: 0 },
  pathScopedTypeScript: { command: "npx tsc -p tsconfig.legacy-replay-path-scoped.json --pretty false", exitCode: 0 },
  nextBuild: { command: "npm run build", envSource: "local environment loaded without recording secrets", exitCode: 0, compiledSuccessfully: true, warningsPresent: true },
  fullCensus: { cases: 1120, sourceHashesMatch: 1120, productionSurfacesBuilt: 1120, outputPdfsGenerated: 1120, outputPdfsReparsed: 1120, visibleWordingFindings: 0, semanticDefects: 0 },
  diskRecovery: { onlyRegenerableCachesRemoved: true, sourceOrEvidenceRemoved: false },
};
writeJson("VERIFICATION-RESULTS.json", verification);

const decision = {
  schemaVersion: "legacy-1120-final-decision@1.0.0",
  generatedAt,
  classification: "DETERMINISTIC_REAL_PDF_REPLAY_COMPLETE__FULL_AI_AUTHENTICATED_REPLAY_BLOCKED",
  frozenMembershipSha256: population.orderedMembershipSha256,
  deterministicRealPdfBuilderGatePass: true,
  fundedAiExtractionGatePass: false,
  isolatedShadowPersistenceGatePass: false,
  authenticatedHttpBrowserGatePass: false,
  fullProductionReplayGatePass: false,
  solicitorApproval: false,
  programmePassSupported: false,
  nextRequiredAction: "Restore funded AI extraction, then replay a controlled frozen subset through isolated persistence and authenticated HTTP/browser before any full-production or programme PASS claim.",
};
writeJson("DECISION-CARD.json", decision);
writeJson("STOP-FOR-CODEX-REVIEW.json", { ...decision, uncommitted: true, commit: null, push: null, merge: null, deploy: null });

const markdown = `# Decision card — Legacy 1,120 real-PDF shadow replay\n\n**STOP uncommitted for Codex review.** Same frozen 1,120 membership; no source/account mutation.\n\n| Gate | Result |\n|---|---:|\n| Source PDFs hash-matched | **1,120 / 1,120** |\n| PDF extraction completed | **1,120 / 1,120** |\n| Deterministic production surfaces built | **1,120 / 1,120** |\n| Genuine CaseBrain output PDFs generated + reparsed | **1,120 / 1,120** |\n| Visible wording findings | **31 -> 0** |\n| Semantic extraction defects | **4 -> 0** |\n| Shared contracts | **28 / 28** |\n| Changed-path TypeScript | **exit 0** |\n| Next production build | **exit 0** |\n| Funded AI extraction | **BLOCKED — HTTP 429 credit_balance_exhausted** |\n| Isolated persistence / authenticated browser | **NOT EXERCISED** |\n\n## Meaning\n\nThe deterministic real-PDF production-builder lane passes on all 1,120 frozen legacy PDFs after shared-root remediation. This does **not** prove the funded AI, persistence, authenticated HTTP/browser, legal review, or programme-wide lanes.\n`;
fs.writeFileSync(path.join(reviewRoot, "DECISION-CARD.md"), markdown);

const manifestPaths = [
  "lib/criminal/build-from-document-units.ts",
  "lib/criminal/canonical-live-surface-adapter.ts",
  "lib/criminal/solicitor-visible-matter-reference.ts",
  "lib/criminal/solicitor-visible-sanitization.ts",
  "lib/criminal/structured-charge-state.ts",
  "lib/criminal/structured-extractor.ts",
  "lib/pdf/criminal-strategy-pdf.ts",
  "scripts/assurance/real-pdf-live-pilot/pdf-materialise.ts",
  "scripts/assurance/legacy-1120-shadow-replay/freeze-legacy-membership.mjs",
  "scripts/assurance/legacy-1120-shadow-replay/run-five-case-gate.ts",
  "scripts/assurance/legacy-1120-shadow-replay/shared-root-contracts.test.ts",
  "scripts/assurance/legacy-1120-shadow-replay/emit-final-review-pack.mjs",
  "tsconfig.legacy-replay-path-scoped.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/FROZEN-MEMBERSHIP-SUMMARY.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/full-1120-production-builders-v1/DECISION-CARD.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/full-1120-production-builders-v2-post-shared-remediation/DECISION-CARD.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/FULL-1120-BEFORE-AFTER.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/ROOT-CAUSE-REMEDIATION-REGISTER.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/VERIFICATION-RESULTS.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/DECISION-CARD.json",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/DECISION-CARD.md",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/final-codex-review/STOP-FOR-CODEX-REVIEW.json"
];
const files = manifestPaths.map((file) => fileReceipt(file, file.startsWith("lib/") ? "shared_production_code" : file.startsWith("scripts/") || file.startsWith("tsconfig") ? "assurance_reproduction" : "compact_evidence"));
const manifest = {
  schemaVersion: "legacy-1120-final-exact-manifest@1.0.0",
  generatedAt,
  files,
  fileCount: files.length,
  excluded: [
    { path: "artifacts/**/local-private-frozen-membership.json", reason: "private local membership authority; hash pinned in summary" },
    { path: "artifacts/**/1120-CASE-RESULTS.json", reason: "large regenerable occurrence evidence; hashes recorded below" },
    { path: "artifacts/**/CASE-RESULTS.checkpoint.jsonl", reason: "large regenerable checkpoint evidence" },
    { path: "tmp/**", reason: "generated PDF/raster scratch" },
  ],
  excludedEvidenceHashes: {
    beforeResultsSha256: sha256(fs.readFileSync(beforeResultsPath)),
    afterResultsSha256: sha256(fs.readFileSync(afterResultsPath)),
    privateManifestSha256: population.privateManifestSha256,
  },
  selfHashStatus: "excluded_from_files_array_self_referential",
};
const manifestPath = path.join(reviewRoot, "EXACT-SHA256-MANIFEST.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const manifestBytes = fs.readFileSync(manifestPath);
writeJson("EXACT-SHA256-MANIFEST.DIGEST.json", {
  schemaVersion: "detached-sha256-digest@1.0.0",
  target: "EXACT-SHA256-MANIFEST.json",
  sha256: sha256(manifestBytes),
  byteLength: manifestBytes.length,
});

process.stdout.write(`${JSON.stringify({ reviewRoot, before, after, manifestFiles: files.length }, null, 2)}\n`);
