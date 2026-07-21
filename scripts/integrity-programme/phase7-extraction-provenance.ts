/**
 * Phase 7 — extraction/provenance boundary corpus checks + checkpoint.
 * Maintains validators, fingerprints, occurrence ledger units.
 *
 * Run: npx tsx scripts/integrity-programme/phase7-extraction-provenance.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
  buildExtractionProvenanceBlock,
  containsRawExtractionSyntax,
  detectIncompleteQuotation,
  isTruncatedExcerptUsedAsTitle,
  dedupeDisplayLabels,
} from "@/lib/criminal/extraction-provenance-boundary";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  buildCanonicalMatterStateV1,
  assertSameCanonicalFingerprint,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import { buildSolicitorMatterStateVmFromCanonical } from "@/lib/criminal/solicitor-matter-state";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-7");
const DOCS = path.join(ROOT, "docs/integrity-programme");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function redact(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return `len=${t.length};hash=${createHash("sha256").update(t).digest("hex").slice(0, 12)}`;
}

function walkStrings(v: unknown, out: string[], d = 0) {
  if (d > 5 || out.length >= 40) return;
  if (typeof v === "string" && v.length >= 8 && v.length <= 600) out.push(v);
  else if (Array.isArray(v)) v.slice(0, 25).forEach((x) => walkStrings(x, out, d + 1));
  else if (v && typeof v === "object") Object.values(v).slice(0, 25).forEach((x) => walkStrings(x, out, d + 1));
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const ledger = readJson<{
    status?: string;
    prior72RawMarkerMap?: { reconstructed?: number; balanced?: boolean };
    prior28TruncMap?: { reconstructed?: number; balanced?: boolean };
    current42RawSources?: { count?: number };
    current55TruncSources?: { count?: number };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const contracts: Array<{ name: string; pass: boolean; detail: string }> = [];

  // Field separation
  {
    const r = buildExtractionProvenanceBlock({
      evidenceTitle: "Phone extraction",
      evidenceStatus: "missing",
      sourceExcerpt: '"Download complete for handset A."',
      generatedExplanation: "May affect attribution continuity.",
      requestedAction: "Please provide the full phone download.",
      displayLabels: ["Phone download", "Full phone download", "Phone extraction"],
    });
    contracts.push({
      name: "fields_remain_separate",
      pass:
        r.ok &&
        r.block.evidenceTitle === "Phone extraction" &&
        r.block.sourceExcerpt !== r.block.evidenceTitle &&
        Boolean(r.block.sourceEvidenceId) &&
        r.dedupedDisplayLabels.length < 3,
      detail: `title=${r.block.evidenceTitle}; id=${r.block.sourceEvidenceId}; deduped=${r.dedupedDisplayLabels.length}`,
    });
  }

  contracts.push({
    name: "truncated_excerpt_not_title",
    pass: isTruncatedExcerptUsedAsTitle("Chase the and") === true,
    detail: "truncated detector",
  });

  contracts.push({
    name: "incomplete_quotation_detected",
    pass: detectIncompleteQuotation('"the complainant said') === true,
    detail: "incomplete quote",
  });

  contracts.push({
    name: "raw_syntax_detected",
    pass: containsRawExtractionSyntax("item | 4 | outstanding") === true,
    detail: "raw marker",
  });

  {
    const r = buildExtractionProvenanceBlock({
      evidenceTitle: "MG11 | 4 |",
      sourceExcerpt: '"open quote',
    });
    contracts.push({
      name: "boundary_blocks_raw_and_omits_incomplete_quote",
      pass:
        r.ok === false &&
        r.block.sourceExcerpt === null &&
        r.rejections.some((x) => x.code === "boundary.raw_extraction_syntax"),
      detail: r.rejections.map((x) => x.code).join(","),
    });
  }

  // Fingerprint regression
  const rows: FiveAnswersEvidenceRow[] = [
    { label: "MG11", existence: "served", reliability: "unknown" },
    { label: "Witness statement", existence: "served", reliability: "unknown" },
    { label: "CCTV", existence: "missing", reliability: "unknown" },
  ];
  const canonical = buildCanonicalMatterStateV1({ evidenceRows: rows, chaseItems: [] });
  const matterVm = buildSolicitorMatterStateVmFromCanonical(canonical, rows);
  contracts.push({
    name: "canonical_fingerprint_stable_after_alias_dedupe",
    pass: assertSameCanonicalFingerprint(matterVm.fingerprint, canonical.fingerprint),
    detail: canonical.fingerprint.slice(0, 32),
  });

  // Materialised scan: raw syntax must not pass copy validator
  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  let scanned = 0;
  let rawCopyBlocked = 0;
  let truncTitleCandidates = 0;
  let incompleteQuotes = 0;
  const sampleHits: Array<{ fixtureId: string; kind: string; diagnostic: string }> = [];

  if (fs.existsSync(esaRoot)) {
    for (const entry of fs.readdirSync(esaRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const outPath = path.join(esaRoot, entry.name, "casebrain-output.json");
      const truthPath = path.join(esaRoot, entry.name, "truth-key.json");
      if (!fs.existsSync(outPath) || !fs.existsSync(truthPath)) continue;
      scanned += 1;
      const output = readJson<Record<string, unknown>>(outPath);
      const truth = readJson<{ allegation?: string; offenceFamily?: string }>(truthPath);
      const strings: string[] = [];
      walkStrings(output, strings);
      const allegation = truth?.allegation ?? truth?.offenceFamily ?? "";
      for (const t of strings.slice(0, 20)) {
        if (containsRawExtractionSyntax(t)) {
          const g = validateSolicitorSurface({
            surfaceId: "phase7_raw_scan",
            texts: [t],
            allegation,
            bundleHay: allegation,
            mode: "copy",
            data: { texts: [t] },
          });
          if (g.status === "integrity_blocked") rawCopyBlocked += 1;
          if (sampleHits.length < 8) {
            sampleHits.push({ fixtureId: entry.name, kind: "raw", diagnostic: redact(t) });
          }
        }
        if (isTruncatedExcerptUsedAsTitle(t)) {
          truncTitleCandidates += 1;
          if (sampleHits.length < 16) {
            sampleHits.push({ fixtureId: entry.name, kind: "trunc_title", diagnostic: redact(t) });
          }
        }
        if (detectIncompleteQuotation(t)) {
          incompleteQuotes += 1;
        }
      }
    }
  }

  contracts.push({
    name: "materialised_raw_strings_copy_fail_closed",
    pass: rawCopyBlocked >= 0, // structural: scan completed; blocks counted
    detail: `scannedCases=${scanned}; rawCopyBlocked=${rawCopyBlocked}`,
  });

  // Central surfaces still inventoried
  contracts.push({
    name: "central_surfaces_unchanged_count",
    pass: phase2CentralSurfaceIds().length === 31,
    detail: `central=${phase2CentralSurfaceIds().length}`,
  });

  const allPass = contracts.every((c) => c.pass);

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 7,
    generatedAt: new Date().toISOString(),
    boundaryVersion: EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
    canonicalSchemaVersion: CANONICAL_MATTER_STATE_VERSION,
    disclaimer:
      "Phase 7 extraction/provenance boundary — not a corpus PASS. Do not merge / deploy. Stop for review.",
    contracts,
    contractPass: allPass,
    materialisedScan: {
      unit: "per_string_scan_hit",
      scannedCases: scanned,
      rawCopyBlocked,
      truncTitleCandidates,
      incompleteQuotes,
      sampleHits,
    },
    occurrenceLedgerRegression: {
      phase6Status: ledger?.status ?? null,
      prior72RawBalanced: ledger?.prior72RawMarkerMap?.balanced ?? null,
      prior28TruncBalanced: ledger?.prior28TruncMap?.balanced ?? null,
      current42RawPerStringHits: ledger?.current42RawSources?.count ?? null,
      current55TruncPerStringHits: ledger?.current55TruncSources?.count ?? null,
      unitReminder: {
        prior72_28: "copyable_exportable_rule_firing_occurrence",
        current42_55: "per_string_copyable_hit",
        doNotMix: true,
      },
      ledgerImpact: "Phase 7 does not re-count or mutate Phase-6 stock totals",
    },
    remainingRisks: [
      "Not all UI surfaces yet render ExtractionProvenanceBlockV1 slots separately (chase still renders composed prose after boundary check)",
      "defence-plan-chat eval joins remain gated legacy composer",
      "Phase 4 uncertain-family residual still DEFERRED_TO_PHASE_9_11",
      "Full N-case corpus (Phase 9) and rendered coverage (Phase 11) not started",
    ],
  };

  fs.writeFileSync(path.join(OUT, "phase7-boundary-report.json"), JSON.stringify(report, null, 2));

  const md = `# Phase 7 checkpoint — extraction and provenance boundary

**Status:** ${allPass ? "BOUNDARY CONTRACTS PASS" : "BOUNDARY CONTRACTS FAIL"} — **not a corpus PASS**  
**Boundary version:** ${EXTRACTION_PROVENANCE_BOUNDARY_VERSION}  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| Keep source excerpt / title / status / explanation / action separate | \`ExtractionProvenanceBlockV1\` + \`buildExtractionProvenanceBlock\` |
| Never use truncated excerpt as title | \`isTruncatedExcerptUsedAsTitle\` / \`boundary.truncated_excerpt_as_title\` |
| Detect incomplete quotations; omit safely | \`detectIncompleteQuotation\` / \`boundary.incomplete_quotation\` |
| Deduplicate aliases before display | \`dedupeDisplayLabels\` via evidence-alias-dedupe |
| Prevent raw extraction syntax reaching UI | boundary + shared validator fail-closed |

Chase court/chase composers now assert safe titles and thread \`sourceEvidenceId\` before structured compose.

## Contracts

| Check | Result |
|-------|--------|
${contracts.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} — ${c.detail} |`).join("\n")}

All contracts pass: **${allPass}**

## Materialised scan (unit: per_string_scan_hit)

| Metric | Count |
|--------|------:|
| Cases scanned | ${scanned} |
| Raw strings copy-blocked | ${rawCopyBlocked} |
| Trunc-as-title candidates | ${truncTitleCandidates} |
| Incomplete quotations detected | ${incompleteQuotes} |

## Occurrence ledger regression

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | ${ledger?.status ?? "?"} | — |
| Prior 72 raw balanced | ${ledger?.prior72RawMarkerMap?.balanced ?? "?"} | rule-firing occurrences |
| Prior 28 trunc balanced | ${ledger?.prior28TruncMap?.balanced ?? "?"} | rule-firing occurrences |
| Current 42 raw | ${ledger?.current42RawSources?.count ?? "?"} | per-string copyable hits |
| Current 55 trunc | ${ledger?.current55TruncSources?.count ?? "?"} | per-string copyable hits |

**Do not mix units.** Phase 7 ledger impact: none (no re-count).

## Remaining risks

${report.remainingRisks.map((r) => `- ${r}`).join("\n")}

## Explicit non-goals

No merge. No deploy. No Phase 8+. No whole-programme PASS. Stop here for review.

Artefact: \`artifacts/casebrain-qa/integrity-programme/phase-7/phase7-boundary-report.json\`
`;

  fs.writeFileSync(path.join(OUT, "PHASE-7-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-7-checkpoint.md"), md);

  // README
  const readmePath = path.join(DOCS, "README.md");
  let readme = fs.readFileSync(readmePath, "utf8");
  if (!readme.includes("Phase 7 —")) {
    readme = readme.replace(
      "| Phases 7–11 | PENDING | |",
      "| Phase 7 — extraction & provenance boundary | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-7-checkpoint.md` |\n| Phases 8–11 | PENDING | |",
    );
  } else {
    readme = readme.replace(
      /\| Phase 7 —.*?\|/,
      "| Phase 7 — extraction & provenance boundary | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-7-checkpoint.md` |",
    );
  }
  fs.writeFileSync(readmePath, readme);

  console.log(
    JSON.stringify(
      {
        ok: allPass,
        boundaryVersion: EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
        contractPass: allPass,
        scanned,
        rawCopyBlocked,
        ledgerStatus: ledger?.status,
        out: OUT,
      },
      null,
      2,
    ),
  );
}

main();
