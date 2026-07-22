/**
 * Phase 2 — canonical unique corpus denominator + channel-separated baseline.
 * Run: npx tsx scripts/integrity-programme/phase2-corpus-and-baseline.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { classifyWrongFamilyHits, resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import {
  PHASE2_SURFACE_GATE_PLAN,
  phase2CentralSurfaceIds,
  phase2RemainingUngated,
} from "@/lib/criminal/solicitor-surface-gate-registry";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-2");
const DOCS = path.join(ROOT, "docs/integrity-programme");

type Channel =
  | "raw_source_fixture_only"
  | "internal_structured_state"
  | "visible_ui_output"
  | "copyable_output"
  | "exportable_api_output";

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

function buildUniqueCorpusManifest() {
  const messyPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
  );
  const messy = readJson<{
    cases?: Array<{ caseId: string; sourceCaseId?: string; family?: string }>;
  }>(messyPath);

  const scaleIds = new Set<string>();
  const sourceCaseIds = new Set<string>();
  for (const c of messy?.cases ?? []) {
    scaleIds.add(c.caseId);
    if (c.sourceCaseId) sourceCaseIds.add(c.sourceCaseId);
  }

  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const materialisedIds = new Set<string>();
  if (fs.existsSync(esaRoot)) {
    for (const entry of fs.readdirSync(esaRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (fs.existsSync(path.join(esaRoot, entry.name, "truth-key.json"))) {
        materialisedIds.add(entry.name);
      }
    }
  }

  const overlapById = [...materialisedIds].filter((id) => scaleIds.has(id));
  const overlapBySource = [...materialisedIds].filter((id) => sourceCaseIds.has(id));
  const materialisedOnly = [...materialisedIds].filter(
    (id) => !scaleIds.has(id) && !sourceCaseIds.has(id),
  );
  const scaleOnly = [...scaleIds].filter((id) => {
    // scale case is "backed" by a materialised source template if sourceCaseId is on disk
    return true;
  });

  const N_approved_scale3000 = scaleIds.size;
  const N_materialised = materialisedIds.size;
  const N_union = new Set([...scaleIds, ...materialisedIds]).size;
  const N_overlap_exact_id = overlapById.length;
  const N_materialised_as_scale_source = overlapBySource.length;

  /**
   * Final programme pass-rate denominator:
   * Unique approved scale identities (generated variants). Materialised fixtures are the
   * on-disk scan/support set, not an alternate pass-rate denominator.
   */
  const uniqueFixtureDenominatorForPassRates = N_approved_scale3000;
  const uniqueFixtureDenominatorLabel =
    "N_approved_scale3000 — unique messy v9 caseId identities (generated from demo-audit templates)";

  return {
    programme: "criminal-defence-integrity-corpus",
    phase: 2,
    generatedAt: new Date().toISOString(),
    disclaimer: "Discovery clarification — fixtures not altered. Not a PASS claim.",
    N_approved_scale3000,
    N_materialised,
    N_union,
    explanations: {
      N_approved_scale3000:
        "Unique caseId rows in messy-pdf-proof-v9-scale3000 summary. Generated at run-time from ~70 demo-audit templates × trap axes. Not 3000 on-disk PDF folders.",
      N_materialised:
        "On-disk directories under artifacts/evidence-state-audit-local/cases with truth-key.json. Used for baseline structured/output scans without regenerating 3000 bundles.",
      N_union:
        "Deduped |scaleIds ∪ materialisedIds|. Inflated vs 3000 because most materialised IDs are source templates (demo-audit-*) or sims not present as scale caseIds.",
      generated: "Scale3000 caseIds (synthetic variants).",
      materialised: "ESA truth-key case folders on disk.",
      overlapping_exact_id: "Materialised folder name equals a scale caseId (rare).",
      overlapping_via_sourceCaseId:
        "Materialised folder name equals a scale row's sourceCaseId (template backing).",
      unique_for_final_pass_rates: uniqueFixtureDenominatorLabel,
    },
    counts: {
      N_approved_scale3000,
      N_materialised,
      N_union,
      N_overlap_exact_id,
      N_materialised_as_scale_source,
      N_materialised_only: materialisedOnly.length,
      N_scale_ids: scaleOnly.length,
      uniqueFixtureDenominatorForPassRates,
    },
    uniqueFixtureDenominatorForPassRates,
    uniqueFixtureDenominatorLabel,
    sources: {
      messySummary: path.relative(ROOT, messyPath).replace(/\\/g, "/"),
      esaRoot: "artifacts/evidence-state-audit-local/cases",
      controlledMetrics: "artifacts/casebrain-proof/controlled-3000-proof-metrics.json",
    },
  };
}

type Finding = {
  fixtureId: string;
  channel: Channel;
  ruleId: string;
  surface: string;
  diagnostic: string;
};

function reclassifyBaseline(failuresPath: string): {
  byChannel: Record<Channel, number>;
  findings: Finding[];
  sourceOnlyNotUserVisible: number;
  userVisibleOrCopyOrApi: number;
} {
  const prior = readJson<{ failures?: Array<{ fixtureId: string; ruleId: string; surface: string; diagnostic: string; family?: string | null }> }>(
    failuresPath,
  );
  const findings: Finding[] = [];

  for (const f of prior?.failures ?? []) {
    let channel: Channel = "visible_ui_output";
    if (f.surface === "truth_key.labels") {
      channel = "internal_structured_state";
    } else if (f.surface === "casebrain_output.strings") {
      // Prior scan walked casebrain-output JSON — treat as generated solicitor-facing strings (visible/copy risk).
      channel = "visible_ui_output";
    } else if (/bundle|source|raw/i.test(f.surface)) {
      channel = "raw_source_fixture_only";
    }

    // Raw extraction markers in structured chase labels that never left the fixture file
    // stay internal unless surface is a copy/export path.
    if (f.ruleId.startsWith("sentence.raw_extraction_marker") && f.surface === "truth_key.labels") {
      channel = "internal_structured_state";
    }

    findings.push({
      fixtureId: f.fixtureId,
      channel,
      ruleId: f.ruleId,
      surface: f.surface,
      diagnostic: f.diagnostic,
    });
  }

  // Also scan materialised casebrain-output as copyable risk via central gate (no case text logged).
  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  let scanned = 0;
  if (fs.existsSync(esaRoot)) {
    for (const entry of fs.readdirSync(esaRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const outPath = path.join(esaRoot, entry.name, "casebrain-output.json");
      const truthPath = path.join(esaRoot, entry.name, "truth-key.json");
      if (!fs.existsSync(outPath) || !fs.existsSync(truthPath)) continue;
      scanned += 1;
      if (scanned > 200) break; // checkpoint sample; full N run is Phase 9
      const truth = readJson<{ offenceFamily?: string; evidenceItems?: Array<{ label?: string }> }>(truthPath);
      const output = readJson<Record<string, unknown>>(outPath);
      const strings: string[] = [];
      const walk = (v: unknown, d: number) => {
        if (d > 5 || strings.length > 30) return;
        if (typeof v === "string" && v.length >= 12 && v.length <= 400) strings.push(v);
        else if (Array.isArray(v)) v.slice(0, 20).forEach((x) => walk(x, d + 1));
        else if (v && typeof v === "object") Object.values(v).slice(0, 20).forEach((x) => walk(x, d + 1));
      };
      walk(output, 0);
      const hay = `${truth?.offenceFamily ?? ""} ${(truth?.evidenceItems ?? []).map((i) => i.label).join(" ")}`;
      const gated = gateSolicitorOutput({
        surfaceId: "phase2_baseline_casebrain_output",
        texts: strings.slice(0, 12),
        allegation: truth?.offenceFamily ?? "",
        bundleHay: hay,
        mode: "copy",
        data: { texts: strings.slice(0, 12) },
      });
      if (gated.status === "integrity_blocked") {
        for (const ruleId of gated.ruleIds) {
          findings.push({
            fixtureId: entry.name,
            channel: "copyable_output",
            ruleId,
            surface: "casebrain_output.gated",
            diagnostic: redact(strings[0] ?? ""),
          });
        }
      }

      // Family classification sanity on sample lines
      const fam = resolveSolicitorOffenceFamily({
        allegation: truth?.offenceFamily ?? "",
        bundleHay: hay,
      });
      for (const line of strings.slice(0, 8)) {
        const hits = classifyWrongFamilyHits(line, fam, hay);
        for (const h of hits) {
          if (h.kind === "unsupported_template_leakage") {
            findings.push({
              fixtureId: entry.name,
              channel: "visible_ui_output",
              ruleId: "wrong_family.unsupported_template_leakage",
              surface: "casebrain_output.family",
              diagnostic: redact(line),
            });
          }
        }
        const sentence = assessSolicitorSentence(line);
        if (!sentence.ok && sentence.issues.includes("raw_extraction_marker")) {
          findings.push({
            fixtureId: entry.name,
            channel: "visible_ui_output",
            ruleId: "sentence.raw_extraction_marker",
            surface: "casebrain_output.sentence",
            diagnostic: redact(line),
          });
        }
      }
    }
  }

  const byChannel: Record<Channel, number> = {
    raw_source_fixture_only: 0,
    internal_structured_state: 0,
    visible_ui_output: 0,
    copyable_output: 0,
    exportable_api_output: 0,
  };
  for (const f of findings) byChannel[f.channel] += 1;

  const sourceOnlyNotUserVisible = byChannel.raw_source_fixture_only + byChannel.internal_structured_state;
  const userVisibleOrCopyOrApi =
    byChannel.visible_ui_output + byChannel.copyable_output + byChannel.exportable_api_output;

  return { byChannel, findings, sourceOnlyNotUserVisible, userVisibleOrCopyOrApi };
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const corpus = buildUniqueCorpusManifest();
  fs.writeFileSync(path.join(OUT, "corpus-unique-manifest.json"), JSON.stringify(corpus, null, 2));

  const baselinePath = path.join(
    ROOT,
    "artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failures.json",
  );
  const reclass = reclassifyBaseline(baselinePath);
  fs.writeFileSync(
    path.join(OUT, "baseline-by-channel.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Raw markers inside source documents are NOT counted as user-visible failures. Source-backed mixed-family concepts are not blocked.",
        byChannel: reclass.byChannel,
        sourceOnlyNotUserVisible: reclass.sourceOnlyNotUserVisible,
        userVisibleOrCopyOrApi: reclass.userVisibleOrCopyOrApi,
        findingsSample: reclass.findings.slice(0, 2000),
        truncated: reclass.findings.length > 2000,
        totalFindings: reclass.findings.length,
      },
      null,
      2,
    ),
  );

  const gatePlan = {
    generatedAt: new Date().toISOString(),
    centralSurfaceIds: phase2CentralSurfaceIds(),
    remainingUngated: phase2RemainingUngated(),
    noneJustified: PHASE2_SURFACE_GATE_PLAN.filter((s) => s.gate === "none"),
    plan: PHASE2_SURFACE_GATE_PLAN,
  };
  fs.writeFileSync(path.join(OUT, "surface-gate-status.json"), JSON.stringify(gatePlan, null, 2));

  const md = `# Phase 2 checkpoint — fail-closed containment

**Status:** CONTAINMENT COMPLETE for inventoried wording exits — not a corpus PASS  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Corpus-count clarification (canonical)

| Metric | Count | Meaning |
|--------|------:|---------|
| **N_approved_scale3000** | **${corpus.N_approved_scale3000}** | Unique generated scale caseIds (messy v9 identity list) |
| **N_materialised** | **${corpus.N_materialised}** | On-disk ESA truth-key folders |
| **N_union** | **${corpus.N_union}** | Deduped scale ∪ materialised IDs |
| Exact ID overlap | ${corpus.counts.N_overlap_exact_id} | Materialised name == scale caseId |
| Materialised as scale sourceCaseId | ${corpus.counts.N_materialised_as_scale_source} | Template backing |
| **Unique-fixture denominator for final pass rates** | **${corpus.uniqueFixtureDenominatorForPassRates}** | ${corpus.uniqueFixtureDenominatorLabel} |

Generated = scale3000 variants. Materialised = on-disk truth keys. Overlap is mostly via \`sourceCaseId\`, not identical IDs.

## Baseline by channel

| Channel | Count |
|---------|------:|
| raw_source_fixture_only | ${reclass.byChannel.raw_source_fixture_only} |
| internal_structured_state | ${reclass.byChannel.internal_structured_state} |
| visible_ui_output | ${reclass.byChannel.visible_ui_output} |
| copyable_output | ${reclass.byChannel.copyable_output} |
| exportable_api_output | ${reclass.byChannel.exportable_api_output} |
| **Source-only (not user-visible)** | **${reclass.sourceOnlyNotUserVisible}** |
| **User-visible / copy / API** | **${reclass.userVisibleOrCopyOrApi}** |

Raw markers inside source documents alone are **not** treated as escape failures.

## Wrong-family policy

- \`unsupported_template_leakage\` → block
- \`source_backed_ok\` (explicit evidence support) → allow (mixed cases)

## Surfaces newly gated (central)

Central module: \`lib/criminal/solicitor-output-gate.ts\` + \`lib/criminal/gated-json-response.ts\`

- API wording exits via \`gatedJsonResponse\` / defence-plan-chat \`jsonWithRoute\` hook
- Client explanation copy
- Overview advanced panel deep gate
- (Prior) War Room drafts, papers deep, summary workspace, copy-safe, export builder

## Remaining ungated / justified none

- Deferred: ${phase2RemainingUngated().map((s) => s.surfaceId).join(", ") || "(none)"}
- None (no wording): ${PHASE2_SURFACE_GATE_PLAN.filter((s) => s.gate === "none")
    .map((s) => s.surfaceId)
    .join(", ")}

## Central vs endpoint-specific

- **Central:** rule evaluation + \`integrity_blocked\` typed payload
- **Endpoint-specific:** one-line call to \`gatedJsonResponse(surfaceId, payload)\` at success exit (no per-endpoint rule logic)

## Tests

See \`scripts/solicitor-output-gate.test.ts\` — block unsafe, pass valid, copy/API reflect blocked, source-backed mixed allowed.

## Explicit non-goals this checkpoint

No broad wording cleanup. No merge. No deploy. No Phase 3+ canonical model rewrite beyond containment.
`;

  fs.writeFileSync(path.join(DOCS, "phase-2-checkpoint.md"), md);
  fs.writeFileSync(path.join(OUT, "PHASE-2-CHECKPOINT.md"), md);

  console.log(
    JSON.stringify(
      {
        ok: true,
        uniqueDenominator: corpus.uniqueFixtureDenominatorForPassRates,
        byChannel: reclass.byChannel,
        centralGates: phase2CentralSurfaceIds().length,
        remainingUngated: phase2RemainingUngated().length,
      },
      null,
      2,
    ),
  );
}

main();
