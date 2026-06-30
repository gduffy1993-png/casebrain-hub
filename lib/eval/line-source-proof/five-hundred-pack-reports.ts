/**
 * 500-case proof-packet scale reports: phrase scan, weak packets, coverage, duplicates.
 */
import fs from "node:fs";
import path from "node:path";

import { fingerprintAuditCase, findDuplicates } from "../evidence-state-audit/diversity";
import type { PackRow } from "./build-pack-summary";
import { PROOF_OUT_DIR } from "./build-pack-summary";
import { DUPLICATE_COVERAGE_EXCLUDED, readTruthMeta } from "./pack-case-manifest-shared";
import {
  buildSolicitorProofPacketModel,
  type SolicitorProofPacketModel,
} from "./render-solicitor-proof-packet";
import { suppressionFamilyDisplayName, type ExtendedSuppressionFamily } from "./suppression-families";

export const PHRASE_SCAN_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "MG6 / unused schedule clarification", re: /MG6\s*\/\s*unused schedule clarification/i },
  { id: "unknown / needs_review", re: /\bunknown\b|\bneeds_review\b/i },
  { id: "Do not say", re: /\bDo not say\b/i },
  { id: "Why unsafe", re: /\bWhy unsafe\b/i },
  { id: "source_unavailable", re: /\bsource_unavailable\b/i },
  { id: "meaningful_line_without_anchor", re: /\bmeaningful_line_without_anchor\b/i },
  { id: "Please provide MG6", re: /Please provide MG6/i },
  { id: "no source anchor found", re: /no source anchor found/i },
  { id: "generic source only", re: /generic source only/i },
  { id: "solicitor review required", re: /solicitor review required/i },
  { id: "evidence_item_not_in_snippet", re: /evidence_item_not_in_snippet/i },
  { id: "clipped court wording", re: /\bthe court is asked\b(?![^.]*\.)|\bthe defence cannot safely advance\b(?![^.]*\.)/i },
];

export type PhraseScanHit = { caseId: string; pattern: string; excerpt: string };

export type WeakPacketFlag =
  | "no_top_finding"
  | "no_missing_item"
  | "generic_refused"
  | "duplicate_story"
  | "weak_review"
  | "low_material_signal";

export type WeakPacketRow = {
  caseId: string;
  category: string;
  shape: string;
  verdict: string;
  proofMode: string;
  flags: WeakPacketFlag[];
  weakScore: number;
  model: SolicitorProofPacketModel;
};

const GENERIC_REFUSED_RE =
  /record defence position|take instructions|confirm whether any positive defence|check whether client account conflicts/i;

function packetText(caseId: string): string {
  const p = path.join(PROOF_OUT_DIR, caseId, "SOLICITOR-PROOF-PACKET.md");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export function scanPacketPhrases(caseIds: string[]): {
  hits: PhraseScanHit[];
  missingPackets: string[];
  byPattern: Record<string, number>;
} {
  const hits: PhraseScanHit[] = [];
  const missingPackets: string[] = [];
  const byPattern: Record<string, number> = {};

  for (const caseId of caseIds) {
    const text = packetText(caseId);
    if (!text) {
      missingPackets.push(caseId);
      continue;
    }
    for (const { id, re } of PHRASE_SCAN_PATTERNS) {
      const m = text.match(re);
      if (m) {
        byPattern[id] = (byPattern[id] ?? 0) + 1;
        const idx = m.index ?? 0;
        hits.push({
          caseId,
          pattern: id,
          excerpt: text.slice(Math.max(0, idx - 20), idx + 80).replace(/\n/g, " "),
        });
      }
    }
  }
  return { hits, missingPackets, byPattern };
}

function storySignature(model: SolicitorProofPacketModel): string {
  const parts = [
    model.gotRight[0]?.text ?? "",
    model.refused[0]?.text ?? "",
    model.missing[0]?.text ?? "",
    model.review[0]?.text ?? "",
  ];
  return parts.join("|").toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

export function scoreWeakPacket(row: PackRow, model: SolicitorProofPacketModel, storyCounts: Map<string, number>): WeakPacketRow {
  const flags: WeakPacketFlag[] = [];
  let weakScore = 0;

  if (!model.gotRight.length) {
    flags.push("no_top_finding");
    weakScore += 40;
  }
  if (!model.missing.length) {
    flags.push("no_missing_item");
    weakScore += 25;
  }
  if (model.refused.some((r) => GENERIC_REFUSED_RE.test(r.text))) {
    flags.push("generic_refused");
    weakScore += 20;
  }
  if (!model.refused.length) weakScore += 5;

  const sig = storySignature(model);
  if (sig && (storyCounts.get(sig) ?? 0) > 3) {
    flags.push("duplicate_story");
    weakScore += 30;
  }
  if (model.review.length === 0) {
    flags.push("weak_review");
    weakScore += 10;
  }
  if (!/\bbwv\b|cctv|phone|custody|encro|platform|mg11|abe|medical|forensic/i.test(sig)) {
    flags.push("low_material_signal");
    weakScore += 15;
  }
  if (row.summary.fail > 0 || row.proofLedger.counts.emittedUnsupported > 0) weakScore += 100;
  if (row.acceptance.blocked) weakScore += 100;

  return {
    caseId: row.caseId,
    category: row.category,
    shape: model.caseShape,
    verdict: model.verdict,
    proofMode: model.proofMode,
    flags,
    weakScore,
    model,
  };
}

export function buildWeakPacketRows(rows: PackRow[]): WeakPacketRow[] {
  const models = rows.map((r) => ({ row: r, model: buildSolicitorProofPacketModel(r) }));
  const storyCounts = new Map<string, number>();
  for (const { model } of models) {
    const sig = storySignature(model);
    if (!sig) continue;
    storyCounts.set(sig, (storyCounts.get(sig) ?? 0) + 1);
  }
  return models
    .map(({ row, model }) => scoreWeakPacket(row, model, storyCounts))
    .sort((a, b) => b.weakScore - a.weakScore);
}

export function renderPhraseScanReport(caseIds: string[], scan: ReturnType<typeof scanPacketPhrases>): string {
  const lines = [
    "# 500-PROOF-PACKET-PHRASE-SCAN",
    "",
    `- Cases scanned: **${caseIds.length}**`,
    `- Missing packets: **${scan.missingPackets.length}**`,
    `- Total hits: **${scan.hits.length}**`,
    `- Result: **${scan.hits.length === 0 && scan.missingPackets.length === 0 ? "PASS" : "FAIL"}**`,
    "",
    "## Hits by pattern",
    "",
    ...Object.entries(scan.byPattern)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- ${k}: **${n}**`),
    ...(Object.keys(scan.byPattern).length === 0 ? ["- none"] : []),
    "",
    "## Sample hits",
    "",
    ...(scan.hits.length
      ? scan.hits.slice(0, 40).map((h, i) => `${i + 1}. **${h.caseId}** — ${h.pattern}\n   - \`${h.excerpt.slice(0, 100)}\``)
      : ["- none"]),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];
  return lines.join("\n");
}

export function renderWorst20Report(weak: WeakPacketRow[]): string {
  const top = weak.slice(0, 20);
  const lines = [
    "# 500-PROOF-PACKET-WORST20",
    "",
    "Weak solicitor packets ranked for Ged review. Full packets remain in each case folder.",
    "",
  ];
  for (const [i, w] of top.entries()) {
    lines.push(`## ${i + 1}. ${w.caseId}`, "");
    lines.push(`- Category: **${w.category}**`);
    lines.push(`- Shape: ${w.shape}`);
    lines.push(`- Verdict: **${w.verdict}** | Proof mode: ${w.proofMode}`);
    lines.push(`- Weak score: **${w.weakScore}**`);
    lines.push(`- Flags: ${w.flags.join(", ") || "none"}`);
    lines.push(`- Packet: [SOLICITOR-PROOF-PACKET.md](./${w.caseId}/SOLICITOR-PROOF-PACKET.md)`);
    lines.push("");
    lines.push("**Got right (top):**", w.model.gotRight[0]?.text ?? "_none_", "");
    lines.push("**Refused (top):**", w.model.refused[0]?.text ?? "_none_", "");
    lines.push("**Missing (top):**", w.model.missing[0]?.text ?? "_none_", "");
    lines.push("**Review (top):**", w.model.review[0]?.text ?? "_none_", "");
    lines.push("");
  }
  lines.push(`Generated: ${new Date().toISOString()}`, "");
  return lines.join("\n");
}

export function renderCoverageReport(rows: PackRow[]): string {
  const byCategory: Record<string, number> = {};
  const byTrap: Record<string, number> = {};
  const byOffence: Record<string, number> = {};
  const suppressFamilies: Record<string, number> = {};
  const proofModes: Record<string, number> = {};

  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    const meta = readTruthMeta(r.caseDir);
    const trap = meta.trap ?? meta.profile ?? "unknown";
    byTrap[trap] = (byTrap[trap] ?? 0) + 1;
    const offence = meta.offenceFamily ?? "unknown";
    byOffence[offence] = (byOffence[offence] ?? 0) + 1;
    const mode = r.proofChainAppendix.caseProofMode;
    proofModes[mode] = (proofModes[mode] ?? 0) + 1;
    for (const s of r.proofLedger.suppressedCandidates) {
      const label = suppressionFamilyDisplayName(s.sourceFamily as ExtendedSuppressionFamily);
      suppressFamilies[label] = (suppressFamilies[label] ?? 0) + 1;
    }
  }

  const uniqueCoverage = rows.filter((r) => !DUPLICATE_COVERAGE_EXCLUDED.has(r.caseId)).length;

  const lines = [
    "# 500-PROOF-PACKET-COVERAGE",
    "",
    `- Cases run: **${rows.length}**`,
    `- Unique coverage (Ellis excluded from count): **${uniqueCoverage}**`,
    `- PDF-backed cases: **${proofModes.pdf_and_text ?? 0}**`,
    `- Text-only controlled: **${proofModes.text_only_controlled ?? 0}**`,
    "",
    "## By category (case family)",
    "",
    ...Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- ${k}: **${n}**`),
    "",
    "## By trap / profile type",
    "",
    ...Object.entries(byTrap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([k, n]) => `- ${k}: **${n}**`),
    "",
    "## By offence family",
    "",
    ...Object.entries(byOffence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([k, n]) => `- ${k}: **${n}**`),
    "",
    "## Suppression families (aggregate)",
    "",
    ...Object.entries(suppressFamilies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, n]) => `- ${k}: **${n}**`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];
  return lines.join("\n");
}

export function renderDuplicatePacketScan(rows: PackRow[]): string {
  const fingerprints = rows
    .map((r) => fingerprintAuditCase(r.caseDir, r.caseId))
    .filter(Boolean) as NonNullable<ReturnType<typeof fingerprintAuditCase>>[];
  const dupes = findDuplicates(fingerprints);

  const storyMap = new Map<string, string[]>();
  for (const r of rows) {
    const model = buildSolicitorProofPacketModel(r);
    const sig = storySignature(model);
    if (!sig) continue;
    const list = storyMap.get(sig) ?? [];
    list.push(r.caseId);
    storyMap.set(sig, list);
  }
  const repeatedStories = [...storyMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 25);

  const lines = [
    "## Duplicate / similar packet scan",
    "",
    "### Truth-key duplicates",
    "",
    ...(dupes.length
      ? dupes.map((d) => `- **${d.severity}** ${d.caseA} ↔ ${d.caseB}: ${d.reason}`)
      : ["- none flagged"]),
    "",
    "### Repeated packet story signatures (>1 case)",
    "",
    ...(repeatedStories.length
      ? repeatedStories.map(([sig, ids]) => `- **${ids.length} cases** — ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? "…" : ""}\n  - sig: ${sig.slice(0, 120)}`)
      : ["- none"]),
    "",
  ];
  return lines.join("\n");
}

export function writeFiveHundredPackReports(options: {
  rows: PackRow[];
  totals: ReturnType<typeof import("./build-pack-summary").aggregatePackTotals>;
  stoppedEarly: boolean;
  caseIds: string[];
}): {
  phraseScan: ReturnType<typeof scanPacketPhrases>;
  weak: WeakPacketRow[];
  passed: boolean;
} {
  const { rows, totals, stoppedEarly, caseIds } = options;
  const phraseScan = scanPacketPhrases(caseIds);
  const weak = buildWeakPacketRows(rows);

  const summaryMd = [
    "# 500-PROOF-PACKET-SUMMARY",
    "",
    stoppedEarly ? "> **STOPPED EARLY** due to blocking gate." : "",
    "",
    "## Headline",
    "",
    `- Cases run: **${rows.length}** / 500`,
    `- Unique coverage: **${rows.filter((r) => !DUPLICATE_COVERAGE_EXCLUDED.has(r.caseId)).length}**`,
    `- Meaningful lines: **${totals.meaningfulLines}**`,
    `- Emitted FAIL: **${totals.fail}**`,
    `- Emitted unsupported: **${totals.emittedUnsupported}**`,
    `- BLOCKED cases: **${totals.blocked}**`,
    `- Phrase scan hits: **${phraseScan.hits.length}**`,
    `- Missing packets: **${phraseScan.missingPackets.length}**`,
    `- Weak packets (score>0): **${weak.filter((w) => w.weakScore > 0).length}**`,
    "",
    renderDuplicatePacketScan(rows),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-SUMMARY.md"), summaryMd);
  fs.writeFileSync(path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-PHRASE-SCAN.md"), renderPhraseScanReport(caseIds, phraseScan));
  fs.writeFileSync(path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-WORST20.md"), renderWorst20Report(weak));
  fs.writeFileSync(path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-COVERAGE.md"), renderCoverageReport(rows));
  fs.writeFileSync(
    path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-SUMMARY.json"),
    JSON.stringify(
      {
        caseIds,
        totals,
        stoppedEarly,
        phraseScan: { hitCount: phraseScan.hits.length, missing: phraseScan.missingPackets, byPattern: phraseScan.byPattern },
        weakTop20: weak.slice(0, 20).map((w) => ({ caseId: w.caseId, weakScore: w.weakScore, flags: w.flags })),
      },
      null,
      2,
    ),
  );

  const passed =
    !stoppedEarly &&
    rows.length === 500 &&
    totals.fail === 0 &&
    totals.emittedUnsupported === 0 &&
    totals.blocked === 0 &&
    phraseScan.hits.length === 0 &&
    phraseScan.missingPackets.length === 0;

  return { phraseScan, weak, passed };
}
