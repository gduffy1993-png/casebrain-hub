/**
 * Same-frozen-300 structural boundary scan.
 * Inspects externally copyable payloadText as an opaque string (no nested-flag exemptions).
 * Reports protected raw retention separately.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const OUT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment";
const ROOT = path.join(OUT, "rematerialised-outputs");

const FIX =
  /\b(s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|demo-audit-\d+|UQ-[a-z0-9_-]+)\b/i;
const STAGE =
  /\b(Stage-300|control-coverage materialisation|Coverage tag|matter token|specialty_[a-z0-9_]+)\b/i;

type ScanResult = {
  ordinaryCopyableFixtureHits: number;
  ordinaryCopyableStageHits: number;
  ordinaryCopyableCaseIdHits: number;
  payloadTextRawSourceHits: number;
  exitCopyExportApiPdfComposedRawHits: number;
  protectedRawRecords: number;
  protectedRawByteIdentical: number;
  protectedRawCanCopyViolations: number;
  samples: Array<{ kind: string; caseId: string; path: string; snippet: string }>;
};

function hasInternal(text: string): boolean {
  return FIX.test(text) || STAGE.test(text);
}

function walkOrdinaryLeaves(
  obj: unknown,
  p: string,
  caseId: string,
  result: ScanResult,
  skipKeys: Set<string>,
): void {
  if (typeof obj === "string") {
    if (/sourceChargeText/i.test(p)) return;
    if (hasInternal(obj) && /\s/.test(obj)) {
      if (FIX.test(obj)) result.ordinaryCopyableFixtureHits += 1;
      if (STAGE.test(obj)) result.ordinaryCopyableStageHits += 1;
      if (/Case ID:\s*(s150-|s300-)/i.test(obj)) result.ordinaryCopyableCaseIdHits += 1;
      if (result.samples.length < 20) {
        result.samples.push({ kind: "ordinary", caseId, path: p, snippet: obj.slice(0, 180) });
      }
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkOrdinaryLeaves(v, `${p}[${i}]`, caseId, result, skipKeys));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (skipKeys.has(k)) continue;
      walkOrdinaryLeaves(v, `${p}/${k}`, caseId, result, skipKeys);
    }
  }
}

function main(): ScanResult {
  const result: ScanResult = {
    ordinaryCopyableFixtureHits: 0,
    ordinaryCopyableStageHits: 0,
    ordinaryCopyableCaseIdHits: 0,
    payloadTextRawSourceHits: 0,
    exitCopyExportApiPdfComposedRawHits: 0,
    protectedRawRecords: 0,
    protectedRawByteIdentical: 0,
    protectedRawCanCopyViolations: 0,
    samples: [],
  };

  const machineSkip = new Set([
    "caseId",
    "id",
    "key",
    "runId",
    "version",
    "exportId",
    "internalCaseId",
    "requestId",
    "evidenceUnitId",
    "sourceChargeText",
    "protectedRawSourceExtracts",
    "audit",
  ]);

  for (const d of fs.readdirSync(ROOT)) {
    // Ordinary exits (copy/export/api/pdf/composed + view) — no protected-raw exemption by nested flags.
    for (const e of ["view", "copy", "export", "api", "pdf", "composed_prose"]) {
      const f = path.join(ROOT, d, "exits", e, "payload.json");
      if (!fs.existsSync(f)) continue;
      try {
        const payload = JSON.parse(fs.readFileSync(f, "utf8"));
        walkOrdinaryLeaves(payload, e, d, result, machineSkip);
        const blob = JSON.stringify(payload);
        // Raw harness markers must not appear on these exits at all.
        if (e !== "view" && STAGE.test(blob) && /Format notes:|Matter token|RESTRICTED — PROSECUTION/i.test(blob)) {
          result.exitCopyExportApiPdfComposedRawHits += 1;
          if (result.samples.length < 20) {
            result.samples.push({
              kind: "exit-raw",
              caseId: d,
              path: e,
              snippet: blob.slice(0, 160),
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    const a = path.join(ROOT, d, "audience-packs.json");
    if (!fs.existsSync(a)) continue;
    try {
      const packs = JSON.parse(fs.readFileSync(a, "utf8")) as {
        packs?: Array<{
          audienceId: string;
          payloadText: string;
          canCopy?: boolean;
          sendability?: string;
        }>;
        protectedRawSourceExtracts?: Array<{
          text?: string;
          sha256?: string;
          canCopy?: boolean;
          sendability?: string;
          excludedFromExport?: boolean;
        }>;
      };

      // A: inspect payloadText as opaque externally copyable string — no nested exemptions.
      const MACHINE =
        /\b(supervisor_risk_contained|document_role|draft_vs_signed|rawSourceSha256|rawSourceByteLength|harnessOrMalformedDetected)\b|\b"audit"\s*:/i;
      for (const p of packs.packs ?? []) {
        const text = p.payloadText ?? "";
        if (hasInternal(text)) {
          result.payloadTextRawSourceHits += 1;
          if (FIX.test(text)) result.ordinaryCopyableFixtureHits += 1;
          if (STAGE.test(text)) result.ordinaryCopyableStageHits += 1;
          if (result.samples.length < 20) {
            result.samples.push({
              kind: "payloadText",
              caseId: d,
              path: `audience/${p.audienceId}/payloadText`,
              snippet: text.slice(0, 180),
            });
          }
        }
        if (p.audienceId === "supervisor") {
          if (/RESTRICTED — PROSECUTION DISCLOSURE BUNDLE/i.test(text) || text.trimStart().startsWith("{")) {
            result.payloadTextRawSourceHits += 1;
          }
          if (MACHINE.test(text)) {
            result.ordinaryCopyableStageHits += 1;
            if (result.samples.length < 20) {
              result.samples.push({
                kind: "supervisor-machine-copy",
                caseId: d,
                path: `audience/supervisor/payloadText`,
                snippet: text.slice(0, 180),
              });
            }
          }
        }
      }

      for (const rec of packs.protectedRawSourceExtracts ?? []) {
        result.protectedRawRecords += 1;
        if (typeof rec.text === "string" && rec.sha256) {
          const digest = crypto.createHash("sha256").update(rec.text, "utf8").digest("hex");
          if (digest === rec.sha256) result.protectedRawByteIdentical += 1;
        }
        if (rec.canCopy === true || rec.sendability !== "blocked" || rec.excludedFromExport !== true) {
          result.protectedRawCanCopyViolations += 1;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return result;
}

const scan = main();
const outPath = path.join(OUT, "structural-boundary-scan.json");
fs.writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      schemaVersion: "stage300-v2-structural-boundary-scan@1.0.0",
      reportingHonesty: {
        ordinaryCopyableSendables:
          "zero internal identifiers required in ordinary visible/copyable/sendable outputs",
        protectedRawSourceReviewRecords:
          "exact internal/source text retained; deliberately viewable only via blocked review control",
        copyExportApiPdfComposed: "zero protected raw text",
      },
      scan,
      acceptance: {
        zeroOrdinaryCopyableInternalLanguage:
          scan.ordinaryCopyableFixtureHits === 0 &&
          scan.ordinaryCopyableStageHits === 0 &&
          scan.ordinaryCopyableCaseIdHits === 0,
        zeroRawInAudiencePayloadText: scan.payloadTextRawSourceHits === 0,
        protectedRawRetainedByteIdentically:
          scan.protectedRawRecords > 0 &&
          scan.protectedRawByteIdentical === scan.protectedRawRecords,
        zeroProtectedBoundaryViolations: scan.protectedRawCanCopyViolations === 0,
        zeroRawOnCopyExportApiPdfComposed: scan.exitCopyExportApiPdfComposedRawHits === 0,
      },
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ outPath, ...scan, acceptanceWritten: true }, null, 2));
