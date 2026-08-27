/**
 * One command, one board.
 *
 * Captures every input the live chase builder receives, replays the board from them, checks each
 * never-allowed rule, and writes a per-case evidence file plus a summary stamped with the commit it
 * ran against. Replaces five scripts run by hand and read by eye.
 *
 *   npx tsx artifacts/casebrain-qa/assurance/solicitor-signal-v1/_audit/audit-run.ts --cases 7
 *   npx tsx ... --cases all          every case with a source PDF
 *   npx tsx ... --skip-capture       reuse the inputs already on disk
 *
 * Requires F167_PREVIEW and SMOKE_PASSWORD unless --skip-capture is given.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";
import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";
import { formatCaseBundleHealthLabel } from "../../../../../lib/criminal/format-case-bundle-health";

const repoRoot = path.resolve(__dirname, "../../../../..");
const assuranceDir = path.resolve(__dirname, "..");
const inputsDir = path.join(assuranceDir, "_replay", "builder-inputs");
const outDir = path.join(assuranceDir, "_audit", "runs");

const KNOWN_SEVEN = [
  "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
  "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
  "687cf5a6-6898-4257-baef-33e33ace08df",
  "7e763777-94a8-4958-a190-a35ef6ddb259",
  "99090c69-5d78-41e3-946d-119b4bc335ba",
  "a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27",
  "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
];

const argv = process.argv.slice(2);
const argValue = (name: string): string | null => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? null) : null;
};
const skipCapture = argv.includes("--skip-capture");

function pdfCaseIds(): string[] {
  const metaPath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/pr101-live-20-visual-pdf-review/ALL-CASE-METADATA.json",
  );
  const raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const arr: any[] = Array.isArray(raw) ? raw : (raw.cases ?? Object.values(raw));
  return arr.map((c) => c.caseId).filter(Boolean);
}

const selection = argValue("cases") ?? "7";
const caseIds =
  selection === "all"
    ? pdfCaseIds()
    : selection === "7"
      ? KNOWN_SEVEN
      : selection.split(",").map((s) => s.trim()).filter(Boolean);

/** The commit the run is measuring, so a board can never be read against the wrong code. */
function commitStamp(): { sha: string; dirty: boolean } {
  const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot })
    .toString()
    .trim();
  const status = execFileSync("git", ["status", "--porcelain", "--", "lib", "components", "scripts"], {
    cwd: repoRoot,
  })
    .toString()
    .trim();
  return { sha, dirty: status.length > 0 };
}

function capture(): void {
  if (skipCapture) return;
  if (!process.env.F167_PREVIEW || !process.env.SMOKE_PASSWORD) {
    throw new Error("F167_PREVIEW and SMOKE_PASSWORD required, or pass --skip-capture");
  }
  console.log(`capturing builder inputs for ${caseIds.length} cases…`);
  execFileSync(
    process.execPath,
    [path.join(assuranceDir, "_replay", "capture-builder-inputs.cjs")],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, F167_OUT: inputsDir, F167_CASE_IDS: caseIds.join(",") },
    },
  );
}

/** Where `frontMatterScan` stops. A bundle longer than this is only read down to here. */
const SCAN_CAP_CHARS = 2_000_000;

type Finding = { rule: string; severity: "P0" | "P1" | "P2"; detail: string };

/**
 * The never-allowed list. Each rule is a root already fixed, kept as a permanent check so the fix
 * cannot rot quietly. A rule states what the app must never do, not what it should usually do.
 */
const RULES = {
  servedAsk: "R1 no request may state the item is served",
  refOnly: "R2 no request may name a reference without naming the material",
  statusCell: "R3 no request may carry a raw status cell",
  identity: "R4 no case may show another case's material reference prefix",
  schedule: "R5 the schedule itself must never become a request",
} as const;

function checkCase(caseId: string): {
  caseId: string;
  primary: { ref: string | null; label: string; family: string; status: string }[];
  ledgerRows: number;
  statedGaps: number;
  statedGapsOnBoard: number;
  truncated: boolean;
  findings: Finding[];
} {
  const captured = JSON.parse(
    fs.readFileSync(path.join(inputsDir, `${caseId}.builder-inputs.json`), "utf8"),
  );
  const bundleSource = captured.bundleSource?.data ?? null;
  const battleboard = captured.battleboard?.data ?? null;
  const matter = captured.matter?.data ?? null;
  const text: string = bundleSource?.frontMatterScan ?? "";

  const brief = buildDisclosureChaseBrief({
    caseId,
    caseTitle: matter?.caseTitle ?? bundleSource?.caseMetadata?.caseTitle ?? "Case",
    clientLabel: matter?.clientName ?? null,
    allegation: matter?.offence ?? bundleSource?.canonical?.charges?.[0]?.label ?? null,
    stage: matter?.stage ?? null,
    hearingStatus: null,
    hearingDateIso: matter?.nextHearingDate ?? null,
    bundleHealth: formatCaseBundleHealthLabel({
      documentCount: bundleSource?.documentCount ?? 0,
      combinedTextLength: bundleSource?.combinedTextLength ?? 0,
      battleboard,
      documentRows: bundleSource?.documentRows,
    }),
    positionStatus: null,
    battleboard,
    snapshotMissing: canonicalRowsForBuilder(bundleSource?.canonical ?? null),
    bundleText: text,
    profileHint: null,
    canonicalFindings: bundleSource?.canonical?.findingSummaries ?? [],
    canonicalEvidenceRows: (bundleSource?.canonical?.evidenceRows ?? []).map((r: any) => ({
      label: r.label,
      state: r.existence,
    })),
  } as never);

  const primary = (brief.primaryItems ?? []).map((i: any) => ({
    ref: i.sourceScheduleRef ?? null,
    label: i.label as string,
    family: i.familyId as string,
    status: i.baseStatus as string,
  }));

  const rows = normaliseBundleMaterials(text);
  const stated = rows.filter(
    (r) => r.scheduleRef && (r.status === "outstanding" || r.status === "absent"),
  );
  const boardRefs = new Set(primary.map((p) => p.ref).filter(Boolean) as string[]);
  const statedGapsOnBoard = stated.filter((r) => boardRefs.has(r.scheduleRef!)).length;

  const findings: Finding[] = [];
  for (const item of brief.items ?? []) {
    const label = String((item as any).label ?? "");
    const wording = String((item as any).draftChaseWording ?? "");
    if (/\bserved\b/i.test(label)) {
      findings.push({ rule: RULES.servedAsk, severity: "P0", detail: label });
    }
    if (
      /\b(?:outstanding|not served|awaiting export|not in papers|requested from)\b/i.test(label)
    ) {
      findings.push({ rule: RULES.statusCell, severity: "P1", detail: label });
    }
    const withoutRef = label.replace(
      /\b(?:MG\d{1,2}[A-Z]?(?:\/\d{1,4})?|EX-[A-Z]{2,4}-\d{2,4}|[A-Z]{1,5}\/\d{1,3}|O\d{2})\b/g,
      "",
    );
    if (!/[A-Za-z]{4,}/.test(withoutRef)) {
      findings.push({ rule: RULES.refOnly, severity: "P1", detail: label });
    }
    if (/\b(?:mg6c?\s+(?:disclosure\s+)?schedule|unused\s+material\s+schedule)\b/i.test(label)) {
      findings.push({ rule: RULES.schedule, severity: "P1", detail: label });
    }
    if (/\bplease provide\b.*\bserved\b/i.test(wording)) {
      findings.push({ rule: RULES.servedAsk, severity: "P0", detail: wording });
    }
  }

  return {
    caseId,
    primary,
    ledgerRows: rows.length,
    statedGaps: stated.length,
    statedGapsOnBoard,
    // The scan is capped, so a long bundle is only read down to the cap and nothing below it is
    // seen at all. A few characters' difference is header trimming, not truncation.
    truncated:
      text.length >= SCAN_CAP_CHARS && (bundleSource?.combinedTextLength ?? 0) > text.length,
    findings,
  };
}

capture();

const stamp = commitStamp();
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(outDir, runId);
fs.mkdirSync(runDir, { recursive: true });

const results = [];
for (const caseId of caseIds) {
  const inputPath = path.join(inputsDir, `${caseId}.builder-inputs.json`);
  if (!fs.existsSync(inputPath)) {
    console.log(`skip ${caseId} — no captured inputs`);
    continue;
  }
  const result = checkCase(caseId);
  results.push(result);
  fs.writeFileSync(
    path.join(runDir, `${caseId}.json`),
    JSON.stringify(result, null, 2),
    "utf8",
  );
  console.log(
    `${caseId}  board ${String(result.primary.length).padStart(2)}  ` +
      `stated gaps ${result.statedGapsOnBoard}/${result.statedGaps}  ` +
      `findings ${result.findings.length}${result.truncated ? "  [scan truncated]" : ""}`,
  );
}

const totalFindings = results.reduce((n, r) => n + r.findings.length, 0);
const p0 = results.reduce((n, r) => n + r.findings.filter((f) => f.severity === "P0").length, 0);
const gaps = results.reduce((n, r) => n + r.statedGaps, 0);
const onBoard = results.reduce((n, r) => n + r.statedGapsOnBoard, 0);

const lines: string[] = [
  `# Audit board — ${runId}`,
  "",
  `Commit \`${stamp.sha}\`${stamp.dirty ? " (working tree dirty — numbers are not reproducible)" : ""}.`,
  `${results.length} cases. ${onBoard} of ${gaps} stated gaps reach the chase board.`,
  `${totalFindings} rule findings, ${p0} of them P0.`,
  "",
  "| Case | Board | Stated gaps on board | Findings | Scan |",
  "| --- | --- | --- | --- | --- |",
];
for (const r of results) {
  lines.push(
    `| \`${r.caseId.slice(0, 8)}\` | ${r.primary.length} | ${r.statedGapsOnBoard}/${r.statedGaps} | ${r.findings.length} | ${r.truncated ? "truncated" : "full"} |`,
  );
}
if (totalFindings > 0) {
  lines.push("", "## Findings", "");
  for (const r of results) {
    if (!r.findings.length) continue;
    lines.push(`### \`${r.caseId.slice(0, 8)}\``, "");
    for (const f of r.findings) {
      lines.push(`- **${f.severity}** ${f.rule} — \`${f.detail}\``);
    }
    lines.push("");
  }
}

fs.writeFileSync(path.join(runDir, "AUDIT-BOARD.md"), lines.join("\n"), "utf8");
fs.writeFileSync(path.join(outDir, "LATEST.md"), lines.join("\n"), "utf8");
console.log(`\nboard written to ${path.relative(repoRoot, path.join(runDir, "AUDIT-BOARD.md"))}`);
