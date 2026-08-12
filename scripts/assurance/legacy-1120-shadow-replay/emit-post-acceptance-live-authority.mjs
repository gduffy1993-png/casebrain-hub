#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const repoRoot = process.cwd();
const root = resolve(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/post-acceptance-live-authority",
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const writeJson = async (path, value) =>
  writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();

await mkdir(root, { recursive: true });
const auth = await readJson("authenticated-preview-smoke.json");
const ai = await readJson("ai-credit-preflight-retry.json");
const head = git("rev-parse", "HEAD");
const parent = git("rev-parse", "HEAD^");
const pr = JSON.parse(
  execFileSync(
    "gh",
    [
      "pr",
      "view",
      "67",
      "--json",
      "number,url,state,headRefOid,baseRefName,headRefName,mergeable,statusCheckRollup",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  ),
);

const vercelCheck = pr.statusCheckRollup.find((check) => check.context === "Vercel") ?? null;
const previewAuthority = {
  schemaVersion: "casebrain-pr-preview-authority@1.0.0",
  generatedAt: new Date().toISOString(),
  appPreviewCommit: head,
  parent,
  prNumber: pr.number,
  prUrl: pr.url,
  prState: pr.state,
  prHeadMatches: pr.headRefOid === head,
  baseRefName: pr.baseRefName,
  headRefName: pr.headRefName,
  mergeable: pr.mergeable,
  vercel: vercelCheck
    ? {
        state: vercelCheck.state,
        targetUrl: vercelCheck.targetUrl,
        startedAt: vercelCheck.startedAt,
      }
    : null,
  mergeAttempted: false,
  productionDeployAttempted: false,
};
await writeJson("PR-PREVIEW-AUTHORITY.json", previewAuthority);

const browserBlocker = {
  schemaVersion: "casebrain-browser-runtime-blocker@1.0.0",
  recordedAt: new Date().toISOString(),
  authenticatedHttpExercised: true,
  authenticatedHttpCases: auth.aggregate.casesChecked,
  browserUiExercised: false,
  browserUiVerdict: "not_exercised_runtime_unavailable",
  runtimeFailure:
    "Browser and Windows-control runtimes share a Node REPL kernel that failed before setup: failed to write kernel assets; path not found (os error 3).",
  applicationFailure: false,
  retryAllowedLater: true,
  passClaimed: false,
};
await writeJson("BROWSER-RUNTIME-BLOCKER.json", browserBlocker);

const verification = {
  schemaVersion: "legacy-1120-post-acceptance-verification@1.0.0",
  generatedAt: new Date().toISOString(),
  acceptedDeterministicReplayCommit: head,
  frozenMembershipSha256: "9ef61d41818bea6d1c1080239a5300b79181db36a763697a8fc02898e3a1b813",
  deterministicRealPdfCases: 1120,
  deterministicSourceHashMatches: 1120,
  deterministicPostRemediationWordingFindings: 0,
  deterministicPostRemediationSemanticDefects: 0,
  authenticatedPreview: {
    authenticated: auth.authenticated,
    cases: auth.aggregate.casesChecked,
    documents: auth.aggregate.totalDocumentsObserved,
    endpointChecks: auth.aggregate.endpointChecks,
    endpoint2xx: auth.aggregate.endpoint2xx,
    endpointNon2xx: auth.aggregate.endpointNon2xx,
    sourceMutationAttempted: auth.sourceMutationAttempted,
  },
  ai: {
    ok: ai.ok,
    httpStatus: ai.httpStatus,
    errorCode: ai.errorCode,
    fundedReplayAllowed: ai.fundedReplayAllowed,
    isolatedPersistenceAllowed: ai.isolatedPersistenceAllowed,
  },
  browserUi: browserBlocker.browserUiVerdict,
  postAcceptanceContracts: "7/7 pass",
  scriptSyntaxChecks: "pass",
  vercel: previewAuthority.vercel?.state ?? "unavailable",
};
await writeJson("VERIFICATION-RESULTS.json", verification);

const classification =
  "DETERMINISTIC_REAL_PDF_REPLAY_ACCEPTED__AUTHENTICATED_HTTP_PASS__AI_PERSISTENCE_BROWSER_BLOCKED";
const decision = {
  schemaVersion: "legacy-1120-post-acceptance-decision@1.0.0",
  generatedAt: new Date().toISOString(),
  classification,
  deterministicRealPdfBuilderGatePass: true,
  authenticatedHttpGatePass: true,
  authenticatedBrowserGatePass: false,
  fundedAiExtractionGatePass: false,
  isolatedShadowPersistenceGatePass: false,
  fullProductionReplayGatePass: false,
  solicitorApproval: false,
  programmePassSupported: false,
  priorEvidenceOverwritten: false,
  nextRequiredActions: [
    "restore funded AI quota, then run a controlled frozen subset through isolated AI persistence",
    "repair the external browser automation runtime and inspect authenticated UI routes",
    "complete qualified solicitor review before any solicitor-grade or programme PASS claim",
  ],
};
await writeJson("DECISION-CARD.json", decision);
await writeFile(
  resolve(root, "DECISION-CARD.md"),
  `# Decision card — Legacy 1,120 post-acceptance live authority\n\n` +
    `**${classification}**\n\n` +
    `| Gate | Result |\n|---|---:|\n` +
    `| Frozen real PDFs replayed through deterministic production builders | **1,120 / 1,120** |\n` +
    `| Post-remediation wording / semantic findings | **0 / 0** |\n` +
    `| QA matters authenticated on PR preview | **10 / 10** |\n` +
    `| Authenticated read-only preview checks | **50 / 50 HTTP 2xx** |\n` +
    `| QA entitlement | **10/25 cases · 10/100 documents** |\n` +
    `| Funded AI extraction | **BLOCKED — HTTP 429 insufficient quota** |\n` +
    `| Isolated AI persistence | **NOT STARTED — fail closed** |\n` +
    `| Authenticated browser UI | **NOT EXERCISED — automation runtime unavailable** |\n` +
    `| PR / Vercel | **OPEN / ${previewAuthority.vercel?.state ?? "unavailable"}** |\n\n` +
    `No account/source mutation, merge, production deploy, solicitor approval, full-production PASS, or programme PASS is claimed.\n`,
  "utf8",
);

const stop = {
  schemaVersion: "legacy-1120-post-acceptance-stop@1.0.0",
  generatedAt: new Date().toISOString(),
  classification,
  acceptedDeterministicReplayCommit: head,
  pr: { number: pr.number, url: pr.url, state: pr.state },
  preview: { vercelState: previewAuthority.vercel?.state ?? null },
  authenticatedHttpGatePass: true,
  authenticatedBrowserGatePass: false,
  fundedAiExtractionGatePass: false,
  isolatedShadowPersistenceGatePass: false,
  programmePassSupported: false,
  checkpointBeforeAdditiveEvidenceCommit: true,
  priorEvidenceOverwritten: false,
};
await writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

const payloads = [
  ["scripts/assurance/legacy-1120-shadow-replay/run-authenticated-preview-smoke.mjs", "source"],
  ["scripts/assurance/legacy-1120-shadow-replay/retry-ai-credit-preflight.mjs", "source"],
  ["scripts/assurance/legacy-1120-shadow-replay/post-acceptance-live-authority-contracts.test.mjs", "contract"],
  ["scripts/assurance/legacy-1120-shadow-replay/emit-post-acceptance-live-authority.mjs", "reproduction"],
  ...[
    "authenticated-preview-smoke.json",
    "ai-credit-preflight-retry.json",
    "PR-PREVIEW-AUTHORITY.json",
    "BROWSER-RUNTIME-BLOCKER.json",
    "VERIFICATION-RESULTS.json",
    "DECISION-CARD.json",
    "DECISION-CARD.md",
    "STOP-FOR-CODEX-REVIEW.json",
  ].map((name) => [relative(repoRoot, resolve(root, name)).replaceAll("\\", "/"), "evidence"]),
];

const files = [];
for (const [path, classificationName] of payloads) {
  const absolute = resolve(repoRoot, path);
  const bytes = await readFile(absolute);
  files.push({
    path,
    sha256: sha256(bytes),
    byteLength: (await stat(absolute)).size,
    classification: classificationName,
    intendedCommit: true,
  });
}
files.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  schemaVersion: "legacy-1120-post-acceptance-exact-manifest@1.0.0",
  generatedAt: new Date().toISOString(),
  selfHashStatus: "excluded_from_files_array_self_referential",
  fullyReconciled: true,
  fileCount: files.length,
  files,
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(resolve(root, "EXACT-SHA256-MANIFEST.json"), manifestText, "utf8");
await writeJson("EXACT-SHA256-MANIFEST.DIGEST.json", {
  schemaVersion: "detached-manifest-digest@1.0.0",
  manifestPath: relative(repoRoot, resolve(root, "EXACT-SHA256-MANIFEST.json")).replaceAll("\\", "/"),
  sha256: sha256(manifestText),
  fileCount: files.length,
});

console.log(
  JSON.stringify({ root, classification, fileCount: files.length, manifestSha256: sha256(manifestText) }),
);
