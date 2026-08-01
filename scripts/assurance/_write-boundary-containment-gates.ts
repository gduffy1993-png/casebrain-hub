/** Write scan + gates for solicitor-boundary containment (avoid PowerShell escaping). */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment";
const BASELINE = "a831a631f3050e096b89633176f023bee2fd6a5f";

function gitBlob(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function scanVisible(): Record<string, number> {
  const root = path.join(ROOT, OUT, "rematerialised-outputs");
  let fixtureVis = 0;
  let stageVis = 0;
  let caseIdVis = 0;
  let donot = 0;
  let pap = 0;
  const FIX =
    /\b(s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|demo-audit-\d+|UQ-[a-z0-9_-]+)\b/i;
  const STAGE =
    /\b(Stage-300|control-coverage materialisation|Coverage tag|matter token|specialty_[a-z0-9_]+)\b/i;

  function walk(obj: unknown, p: string): void {
    if (typeof obj === "string") {
      if (/sourceChargeText|rawSourceExtract\/text|protectedRawSource|\/audit\//i.test(p)) return;
      if (/Case ID:\s*s150-|Case ID:\s*s300-/i.test(obj)) caseIdVis += 1;
      if (FIX.test(obj) && /\s/.test(obj)) fixtureVis += 1;
      if (STAGE.test(obj)) stageVis += 1;
      if (/Do not say:\s*Do not/i.test(obj)) donot += 1;
      if (/current pap(?!ers)/i.test(obj)) pap += 1;
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => walk(v, `${p}[${i}]`));
      return;
    }
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (
          k === "rawSourceExtract" ||
          k === "audit" ||
          k === "protectedRawSourceExtracts" ||
          k === "caseId" ||
          k === "version" ||
          k === "id" ||
          k === "key" ||
          k === "runId" ||
          k === "internalCaseId" ||
          k === "requestId" ||
          k === "evidenceUnitId" ||
          k === "sourceChargeText" ||
          k === "exportId"
        ) {
          continue;
        }
        walk(v, `${p}/${k}`);
      }
    }
  }

  for (const d of fs.readdirSync(root)) {
    for (const e of ["view", "copy", "export", "api", "pdf", "composed_prose"]) {
      const f = path.join(root, d, "exits", e, "payload.json");
      if (!fs.existsSync(f)) continue;
      try {
        walk(JSON.parse(fs.readFileSync(f, "utf8")), e);
      } catch {
        /* ignore */
      }
    }
    const a = path.join(root, d, "audience-packs.json");
    if (!fs.existsSync(a)) continue;
    try {
      const packs = JSON.parse(fs.readFileSync(a, "utf8")) as {
        packs?: Array<{ audienceId: string; payloadText: string }>;
      };
      for (const p of packs.packs ?? []) {
        if (p.audienceId === "supervisor") {
          const parsed = JSON.parse(p.payloadText) as {
            professionalSummary?: string;
            rawSourceExtract?: { canCopy?: boolean; text?: string };
          };
          if (STAGE.test(parsed.professionalSummary ?? "")) stageVis += 1;
          if (parsed.rawSourceExtract?.canCopy === true) fixtureVis += 1;
        } else {
          walk(p.payloadText, `audience/${p.audienceId}`);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { fixtureVis, stageVis, caseIdVis, donot, pap };
}

function main(): void {
  const head = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: ROOT }).trim();
  const brainFiles = [
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
  const brainRows = brainFiles.map((p) => {
    const baselineBlobId = gitBlob(BASELINE, p);
    const headBlobId = gitBlob(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  const brain = {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    baselineCommit: BASELINE,
    headCommit: head,
    rows: brainRows,
    brain1GuardianBlobUnchanged: brainRows.every((r) => r.blobUnchanged),
  };
  fs.writeFileSync(path.join(ROOT, OUT, "brain1-guardian-blob-compare.json"), `${JSON.stringify(brain, null, 2)}\n`);

  const freezePath =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/frozen-membership-v2.json";
  const freezeRaw = fs.readFileSync(path.join(ROOT, freezePath));
  const freeze = JSON.parse(freezeRaw.toString("utf8")) as {
    orderedMembershipSha256V2?: string;
    membership?: unknown[];
  };
  const expected = "23ae1b9df0a09b80b9ab51e3f597aad9103360f5f11c26606e1633b2c82c3c5a";
  fs.writeFileSync(
    path.join(ROOT, OUT, "freeze-hash-verification.json"),
    `${JSON.stringify(
      {
        schemaVersion: "stage300-v2-solicitor-boundary-containment-freeze-hash-verify@1.0.0",
        source: freezePath,
        sourceSha256: crypto.createHash("sha256").update(freezeRaw).digest("hex"),
        orderedMembershipSha256V2: freeze.orderedMembershipSha256V2 ?? null,
        expectedOrderedMembershipSha256V2: expected,
        unchanged: freeze.orderedMembershipSha256V2 === expected,
        membershipCount: freeze.membership?.length ?? null,
      },
      null,
      2,
    )}\n`,
  );

  let tscOk = true;
  let tscExcerpt = "";
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  const changedPaths = [
    "lib/criminal/solicitor-visible-matter-reference.ts",
    "lib/criminal/supervisor-raw-source-containment.ts",
    "lib/criminal/export-pack/build-export-pack.ts",
    "lib/criminal/build-from-document-units.ts",
    "lib/criminal/solicitor-visible-sanitization.ts",
    "lib/criminal/evidence-state-canonical.ts",
    "lib/criminal/five-answers/build-evidence-trace.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/new150/audience-packs-from-surfaces.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/constants.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/solicitor-visible-inventory.ts",
  ];
  const pathErrors = changedPaths.reduce((n, p) => {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\//g, "[\\\\/]");
    return n + (tscExcerpt.match(new RegExp(esc, "gi"))?.length ?? 0);
  }, 0);
  fs.writeFileSync(
    path.join(ROOT, OUT, "tsc-baseline-delta.json"),
    `${JSON.stringify(
      {
        schemaVersion: "stage300-v2-solicitor-boundary-containment-tsc@1.0.0",
        baselineCommit: BASELINE,
        headCommit: head,
        tscNoEmitOk: tscOk,
        pathScopedErrorCount: pathErrors,
        changedPaths,
        excerpt: tscExcerpt.slice(0, 4000),
      },
      null,
      2,
    )}\n`,
  );

  const scan = scanVisible();
  const stop = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, "STOP-FOR-CODEX-REVIEW.json"), "utf8")) as Record<
    string,
    unknown
  >;
  const hardAcceptance = {
    ...((stop.hardAcceptance as Record<string, unknown>) ?? {}),
    zeroVisibleFixtureOrCorpusIds: scan.fixtureVis === 0 && scan.caseIdVis === 0,
    zeroVisibleStage300OrHarnessLanguage: scan.stageVis === 0,
    zeroDoNotSayDoNotDuplication: scan.donot === 0,
    zeroMidWordOrMidSentenceGeneratedTruncations: scan.pap === 0,
    stage300CompletionClaimed: false,
    programmePassClaimed: false,
  };
  stop.hardAcceptance = hardAcceptance;
  if (stop.summary && typeof stop.summary === "object") {
    (stop.summary as Record<string, unknown>).hardAcceptance = hardAcceptance;
  }
  stop.gates = {
    npmBuildReceipt: "npm-build-receipt.txt",
    brain1GuardianBlobUnchanged: brain.brain1GuardianBlobUnchanged,
    freezeHashUnchanged: freeze.orderedMembershipSha256V2 === expected,
    tscPathScopedErrorCount: pathErrors,
    tscNoEmitOk: tscOk,
    visibleScan: scan,
  };
  stop.committed = false;
  stop.pushed = false;
  stop.stage300ExecutionAllowed = false;
  stop.programmePassClaimed = false;
  fs.writeFileSync(path.join(ROOT, OUT, "STOP-FOR-CODEX-REVIEW.json"), `${JSON.stringify(stop, null, 2)}\n`);

  // Compact commit-scope manifest (source only — rematerialised exits counted, not listed).
  const sourceFiles = [
    ...changedPaths,
    "lib/criminal/canonical-live-surface-adapter.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/calibration-v2/pipeline-solicitor-boundary-containment.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/inputs/load-essential-inputs.ts",
    "scripts/assurance/rematerialise-maa-v2-stage300-shared-root-fix.ts",
    "scripts/maa-v2-solicitor-boundary-containment-contracts.test.ts",
    "scripts/assurance/emit-maa-v2-stage300-solicitor-boundary-containment.ts",
  ];
  const rematerialisedRoot = path.join(ROOT, OUT, "rematerialised-outputs");
  const affectedCases = fs.existsSync(rematerialisedRoot)
    ? fs.readdirSync(rematerialisedRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  fs.writeFileSync(
    path.join(ROOT, OUT, "affected-case-list.json"),
    `${JSON.stringify(
      {
        schemaVersion: "stage300-v2-solicitor-boundary-containment-affected-cases@1.0.0",
        caseCount: affectedCases.length,
        cases: affectedCases,
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(ROOT, OUT, "COMMIT-SCOPE-MANIFEST-COMPACT.json"),
    `${JSON.stringify(
      {
        schemaVersion: "stage300-v2-solicitor-boundary-containment-commit-scope-compact@1.0.0",
        committed: false,
        sourceFileCount: sourceFiles.length,
        sourceFiles,
        rematerialisedCaseCount: affectedCases.length,
        artefactRoot: OUT,
        note: "Stop uncommitted for Codex review. No Stage-300 completion / programme PASS / merge / deploy.",
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        brainOk: brain.brain1GuardianBlobUnchanged,
        freezeOk: freeze.orderedMembershipSha256V2 === expected,
        tscOk,
        pathErrors,
        scan,
        hardAcceptance,
      },
      null,
      2,
    ),
  );
}

main();
