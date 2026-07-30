/**
 * Stage-150 / 300 / 3000 evidence retention policy.
 * Large regenerable corpora stay out of Git; hashes + indexes + summaries are committed.
 * Never delete or rewrite already-frozen evidence.
 */

export const EVIDENCE_RETENTION_SCHEMA = "maa-v2-evidence-retention@1.0.0" as const;

export type EvidenceArtefactClass =
  | "raw_receipts_jsonl"
  | "compressed_receipts"
  | "hash_index"
  | "summary_report"
  | "checkpoint"
  | "frozen_immutable"
  | "regenerable_corpus_local_only";

export type RetentionRule = {
  artefactClass: EvidenceArtefactClass;
  gitPolicy: "commit" | "commit_if_under_limit" | "gitignore_regenerate" | "never_rewrite";
  format: string;
  notes: string;
};

export const EVIDENCE_RETENTION_POLICY = {
  schemaVersion: EVIDENCE_RETENTION_SCHEMA,
  baselineCommitPinned: "da98277c3038b40b2408a7af6a41475e88b21e17",
  hardRules: [
    "Never delete or rewrite already-frozen evidence (Stage-50 freeze, FID-10 freeze receipts, Brain1/Guardian blobs).",
    "Raw per-case receipts are deterministic JSONL (one object per line, stable key order where emitted).",
    "Prefer compression only when tooling yields deterministic bytes (documented codec + level).",
    "Commit hashes, indexes, and summary reports; exclude large regenerable corpora from Git.",
    "Estimate Stage-150/300/3000 sizes before running; do not freeze/run Stage-150 in Batch-4.",
  ],
  rules: [
    {
      artefactClass: "raw_receipts_jsonl",
      gitPolicy: "gitignore_regenerate",
      format: "application/x-ndjson",
      notes:
        "Per-case eligibility/control receipts as *.jsonl. Reproduce via emit scripts; commit only sha256 + lineCount index.",
    },
    {
      artefactClass: "compressed_receipts",
      gitPolicy: "gitignore_regenerate",
      format: "application/gzip",
      notes:
        "Optional gzip -n (no timestamp/name) for deterministic bytes when repository tooling supports it. Not required for Batch-4 readiness artefacts.",
    },
    {
      artefactClass: "hash_index",
      gitPolicy: "commit",
      format: "application/json",
      notes: "relativePath → sha256 + byteLength + lineCount indexes for JSONL corpora.",
    },
    {
      artefactClass: "summary_report",
      gitPolicy: "commit",
      format: "application/json",
      notes: "Aggregated totals, readiness gates, disposition matrices, STOP checkpoints.",
    },
    {
      artefactClass: "checkpoint",
      gitPolicy: "commit",
      format: "application/json",
      notes: "STOP-FOR-CODEX-REVIEW and gate JSON — small, authoritative.",
    },
    {
      artefactClass: "frozen_immutable",
      gitPolicy: "never_rewrite",
      format: "application/json",
      notes: "Stage-50 freeze hash, FID-10 freeze receipts, Brain1/Guardian blob-compare — append-only references.",
    },
    {
      artefactClass: "regenerable_corpus_local_only",
      gitPolicy: "gitignore_regenerate",
      format: "application/json",
      notes:
        "Monolithic stage150-*-control-receipts.json blobs (>50MB) must not be re-committed. Prefer JSONL + summary.",
    },
  ] as RetentionRule[],
  gitignoreGlobs: [
    "artifacts/casebrain-qa/assurance/master-auditor-v2/**/stage150-*-control-receipts.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/**/stage150-*-eligibility-receipts.jsonl",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/**/stage150-*-eligibility-receipts.jsonl.gz",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/**/raw-receipts/",
  ],
  reproductionCommands: [
    "npx tsx scripts/assurance/emit-maa-v2-stage150-batch4.ts",
    "npx tsx --test scripts/maa-v2-stage150-batch4-contracts.test.ts",
    "npx tsx --test scripts/maa-v2-eld-foundation-contracts.test.ts scripts/maa-v2-execution-readiness-contracts.test.ts",
  ],
  sizeProjectionMethod: {
    formula:
      "projectedBytes ≈ cases × controls × avgReceiptBytes (+ indexes/summaries). Stage-150 selection not run in Batch-4.",
    avgReceiptBytesObservedBatch3: 1525,
    notes:
      "Batch-3 monolithic 499×106 receipts ≈ 77MB. Batch-4 switches new large artefacts to JSONL+index; does not rewrite frozen Batch-3 evidence.",
  },
} as const;

export type SizeProjectionRow = {
  stage: "150" | "300" | "3000";
  assumedCases: number;
  assumedControls: number;
  avgReceiptBytes: number;
  projectedRawReceiptBytes: number;
  projectedRawReceiptMiB: number;
  projectedGzipMiBEstimate: number;
  gitCommitAdvice: string;
  /** Explicit: these figures are planning estimates, not measured Stage-150/300/3000 output. */
  measurementKind: "estimate";
  estimateAssumptions: string;
};

export function projectEvidenceSizes(args?: {
  avgReceiptBytes?: number;
  stage150Cases?: number;
  stage150Controls?: number;
}): SizeProjectionRow[] {
  const avg = args?.avgReceiptBytes ?? EVIDENCE_RETENTION_POLICY.sizeProjectionMethod.avgReceiptBytesObservedBatch3;
  const rows: Array<{
    stage: "150" | "300" | "3000";
    assumedCases: number;
    assumedControls: number;
    avgReceiptBytes: number;
    projectedRawReceiptBytes: number;
    gitCommitAdvice: string;
  }> = [
    {
      stage: "150",
      assumedCases: args?.stage150Cases ?? 150,
      assumedControls: args?.stage150Controls ?? 161,
      avgReceiptBytes: avg,
      projectedRawReceiptBytes: 0,
      gitCommitAdvice: "JSONL local-only + commit hash index + summary; do not commit monolithic JSON.",
    },
    {
      stage: "300",
      assumedCases: 300,
      assumedControls: 200,
      avgReceiptBytes: avg,
      projectedRawReceiptBytes: 0,
      gitCommitAdvice: "Same retention; heavy/binary artefacts stay local with hash receipts only.",
    },
    {
      stage: "3000",
      assumedCases: 3000,
      assumedControls: 250,
      avgReceiptBytes: avg,
      projectedRawReceiptBytes: 0,
      gitCommitAdvice: "Must be JSONL(+optional deterministic gzip) outside Git; commit indexes only.",
    },
  ];
  return rows.map((r) => {
    const projectedRawReceiptBytes = r.assumedCases * r.assumedControls * r.avgReceiptBytes;
    const projectedRawReceiptMiB = projectedRawReceiptBytes / (1024 * 1024);
    return {
      ...r,
      projectedRawReceiptBytes,
      projectedRawReceiptMiB: Math.round(projectedRawReceiptMiB * 10) / 10,
      // gzip text typically ~15–25% of JSON; use 0.2 as planning estimate only — NOT measured
      projectedGzipMiBEstimate: Math.round(projectedRawReceiptMiB * 0.2 * 10) / 10,
      measurementKind: "estimate" as const,
      estimateAssumptions:
        `cases=${r.assumedCases} × controls=${r.assumedControls} × avgReceiptBytes=${avg} (Batch-3 observed avg). Gzip factor 0.2 planning-only. Not measured Stage-${r.stage} output.`,
    };
  });
}

export function buildReceiptIndexEntry(args: {
  relativePath: string;
  sha256: string;
  byteLength: number;
  lineCount: number;
  regenerable: true;
}): {
  relativePath: string;
  sha256: string;
  byteLength: number;
  lineCount: number;
  regenerable: true;
  gitPolicy: "gitignore_regenerate";
} {
  return { ...args, gitPolicy: "gitignore_regenerate" };
}
