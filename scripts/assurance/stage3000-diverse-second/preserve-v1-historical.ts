/**
 * A. Preserve V1 as immutable historical scaffold — additive only.
 * Does not rewrite membership or original reports.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const V1 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const PRESERVE = path.join(V1, "preservation");
const GRAPHS = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs");
const SURF = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation",
);

function sha(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out.sort();
}
function rel(p: string): string {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function main(): void {
  fs.mkdirSync(PRESERVE, { recursive: true });

  const frozenPath = path.join(V1, "frozen-membership-new3000.json");
  const frozen = JSON.parse(fs.readFileSync(frozenPath, "utf8")) as {
    orderedMembershipSha256: string;
    populationCount: number;
  };

  // Hash critical compact artefacts (not rewriting them)
  const critical = [
    "frozen-membership-new3000.json",
    "freeze-receipt.json",
    "new3000-population-manifest.json",
    "uniqueness-and-semantic-cluster-report.json",
    "STOP-FOR-CODEX-REVIEW.json",
    "DECISION-CARD.md",
    "LOCKED-ACCEPTANCE-CONTRACT.json",
    "maa-pre-remediation-receipt.json",
    "before-after-remediation-map.json",
    "candidate-freeze-receipt.json",
    "technical-disposition-ledger.json",
    "shared-root-cause-graph.json",
    "exact-changed-file-manifest.json",
    "exact-changed-file-manifest.DIGEST.json",
    "performance-and-storage-report.json",
  ];

  const compactHashes: Array<{ path: string; sha256: string; byteLength: number }> = [];
  for (const c of critical) {
    const p = path.join(V1, c);
    if (!fs.existsSync(p)) continue;
    const b = fs.readFileSync(p);
    compactHashes.push({ path: rel(p), sha256: sha(b), byteLength: b.length });
  }

  // Stream hash all source packs + truth + surfaces (manifest of hashes only)
  const sourceFiles = walkFiles(path.join(GRAPHS, "sources"));
  const truthFiles = walkFiles(path.join(GRAPHS, "truth-sealed"));
  const surfFiles = walkFiles(SURF);

  const bulkManifestPath = path.join(PRESERVE, "V1-BULK-FILE-HASH-MANIFEST.jsonl");
  if (fs.existsSync(bulkManifestPath)) fs.unlinkSync(bulkManifestPath);
  const writeBulk = (rows: unknown[]) => {
    if (!rows.length) return;
    fs.appendFileSync(bulkManifestPath, `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`);
  };

  let buf: unknown[] = [];
  let sourceBytes = 0;
  for (const f of sourceFiles) {
    const b = fs.readFileSync(f);
    sourceBytes += b.length;
    buf.push({ path: rel(f), sha256: sha(b), byteLength: b.length });
    if (buf.length >= 200) {
      writeBulk(buf);
      buf = [];
    }
  }
  let truthBytes = 0;
  for (const f of truthFiles) {
    const b = fs.readFileSync(f);
    truthBytes += b.length;
    buf.push({ path: rel(f), sha256: sha(b), byteLength: b.length });
    if (buf.length >= 200) {
      writeBulk(buf);
      buf = [];
    }
  }
  let surfBytes = 0;
  for (const f of surfFiles) {
    const b = fs.readFileSync(f);
    surfBytes += b.length;
    buf.push({ path: rel(f), sha256: sha(b), byteLength: b.length });
    if (buf.length >= 200) {
      writeBulk(buf);
      buf = [];
    }
  }
  writeBulk(buf);

  const bulkSha = sha(fs.readFileSync(bulkManifestPath));

  const hashLock = {
    schemaVersion: "diverse3000-v1-hash-lock@1.0.0",
    lockedAt: new Date().toISOString(),
    authorityBaselineCommit: "308b7cb633f83d7c998bc80adf87356de346b3e9",
    headCommit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    immutable: true,
    doNotOverwrite: true,
    label:
      "synthetic thin-text corpus scaffold with narrow wording/completeness assurance — NOT semantic diversity proof and NOT a full MAA run",
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    populationCount: frozen.populationCount,
    firstCensusMembershipPreserved: "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae",
    compactArtefactHashes: compactHashes,
    bulk: {
      sourceFileCount: sourceFiles.length,
      truthFileCount: truthFiles.length,
      surfaceLaneFileCount: surfFiles.length,
      sourceBytes,
      truthBytes,
      surfaceBytes: surfBytes,
      bulkManifestPath: rel(bulkManifestPath),
      bulkManifestSha256: bulkSha,
    },
    consumerLeakEvidencePreserved: {
      preRemediationReceipt: "maa-pre-remediation-receipt.json",
      preRemediationHistorical: "pre-remediation-historical/",
      surfacesHistorical: "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1-pre-remediation-historical",
      sharedRoot: "shared-root-cause-graph.json",
      beforeAfter: "before-after-remediation-map.json",
    },
  };
  fs.writeFileSync(path.join(PRESERVE, "V1-HASH-LOCK.json"), `${JSON.stringify(hashLock, null, 2)}\n`);

  const honesty = {
    schemaVersion: "diverse3000-v1-honesty-correction@1.0.0",
    generatedAt: new Date().toISOString(),
    membershipAndOriginalReportsRewritten: false,
    accurateLabel:
      "V1 is a synthetic thin-text corpus scaffold with narrow wording/completeness assurance.",
    corrections: [
      {
        id: 1,
        issue: "3000 unique fingerprint claim is not semantic diversity proof",
        fact: "Fingerprints included case IDs, order indexes, dates, names, matter-local salts; uniqueness report states uniqueness was forced",
        correctedClaim: "V1 proves identity uniqueness under forced hashing, not substantive semantic diversity",
      },
      {
        id: 2,
        issue: "largestCluster: 1 unsupported",
        fact: "Substantive semantic clustering was not performed",
        correctedClaim: "largestCluster claim in V1 uniqueness report is not evidence of semantic isolation",
      },
      {
        id: 3,
        issue: "First 500 PDF-marked matters",
        fact: "pdfStatus was pending_stratified_render; no rendered PDFs validated",
        correctedClaim: "pdf_not_rendered / not_exercised — must not be described as PDF cases",
      },
      {
        id: 4,
        issue: "Four-document skeleton",
        fact: "Every source pack used MG05/MG06/charge_instrument/defence_note",
        correctedClaim: "Does not prove realistic bundle diversity across offence catalogue",
      },
      {
        id: 5,
        issue: "Generic structural charge wording",
        fact: "Many unusual families used FICTIONAL TEST MATERIAL structural charge strings",
        correctedClaim: "Not pinned current source-supported charge wording",
      },
      {
        id: 6,
        issue: "Fixed surface pattern / projections",
        fact: "Materialiser emitted mostly fixed 7–8 surfaces; several packet_local_projection",
        correctedClaim: "Must not describe projections as genuine CaseBrain production exits",
      },
      {
        id: 7,
        issue: "16/361 controls / zero candidates",
        fact: "Only wording/completeness lane exercised",
        correctedClaim: "Zero-candidate result is narrow-lane only — not a full Master Assurance Auditor result",
      },
      {
        id: 8,
        issue: "ELD/browser/heavy/security/cross-perspective",
        fact: "Remain not_exercised",
        correctedClaim: "Explicitly not_exercised; unavailable must not become PASS",
      },
    ],
    v1PathsImmutable: {
      assuranceRoot: rel(V1),
      graphsRoot: rel(GRAPHS),
      materialisationRoot: rel(SURF),
    },
    nextVersion: "stage3000-diverse-second-v2",
  };
  fs.writeFileSync(path.join(PRESERVE, "V1-HONESTY-CORRECTION.json"), `${JSON.stringify(honesty, null, 2)}\n`);
  fs.writeFileSync(
    path.join(PRESERVE, "V1-HONESTY-CORRECTION.md"),
    `# V1 honesty correction

**Do not treat V1 as semantic-diversity proof or a full MAA run.**

V1 is preserved immutable under hash-lock as a **synthetic thin-text corpus scaffold** with **narrow wording/completeness assurance**.

Membership SHA: \`${frozen.orderedMembershipSha256}\`

Original membership and reports were **not rewritten**. This correction is additive.

See \`V1-HONESTY-CORRECTION.json\` for the eight honesty problems and corrected claims.
`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        membership: frozen.orderedMembershipSha256,
        compactHashed: compactHashes.length,
        bulkFiles: sourceFiles.length + truthFiles.length + surfFiles.length,
        bulkManifestSha256: bulkSha,
        preserve: rel(PRESERVE),
      },
      null,
      2,
    ),
  );
}

main();
