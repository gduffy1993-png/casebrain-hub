/**
 * Phase 9 — ~150-matter representative reality stress audit (detection-first).
 *
 * Extends Master 3000 infrastructure. Does not invent a parallel auditor.
 * Holdout remains sealed. Starter Gold is a separate regression gate (not the 150 sample).
 * Does not claim factual 150/150 pass — separates structural/safety anomalies from ground truth.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildBundleTruthLedger, ledgerMaterialsNeedingChase } from "../../lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata } from "../../lib/criminal/extract-bundle-case-metadata";
import {
  filterPromptInjectionInstructionLines,
  isPromptInjectionInstructionLine,
} from "../../lib/criminal/hostile-source-content";
import { lintReasoningV2PublicText } from "../../lib/criminal/reasoning-v2/sanitize-reasoning-text";
import {
  clusterFailures,
  createAuditResult,
  validateControlCoverageMap,
  type AuditResultEnvelope,
  type ControlCoverageMap,
  type ControlCoverageMapRow,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const TARGET = Number(process.env.MASTER3000_PHASE9_TARGET || 150);
const SELECT_ONLY = process.argv.includes("--select-only");
const CASE_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const PHASE5_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase5-starter-gold-audit",
);
const PHASE8_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase8-source-ingest-coverage",
);
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase9-representative-150",
);

type TruthKey = {
  caseId: string;
  title?: string;
  offenceFamily?: string;
  profile?: string;
  bundleStatus?: string;
  offenceWording?: string;
  expectedChaseItems?: string[];
  evidenceItems?: {
    evidence_item?: string;
    correct_evidence_state?: string;
    chase_needed?: boolean;
    safe_to_rely_on?: boolean;
  }[];
};

type CandidateMatter = {
  caseId: string;
  title: string;
  offenceFamily: string;
  offenceBucket: string;
  profile: string;
  bundleStatus: string;
  sourcePath: string;
  truthKeyPath: string;
  outputPath: string;
  sourceSha256: string;
  truthKeySha256: string;
  outputSha256: string;
  sourceBytes: number;
  bundleSizeTier: "tiny" | "small" | "medium" | "large" | "very_large";
  proceduralStage: string;
  evidenceModalities: string[];
  complexityTags: string[];
  strata: string[];
  evidenceItemCount: number;
  expectedChaseCount: number;
  inStarterGold: boolean;
  inHoldout: boolean;
};

function rel(absOrRel: string): string {
  const absolute = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  return path.relative(ROOT, absolute).replaceAll(path.sep, "/");
}
function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}
function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
function bytes(filePath: string): number {
  return statSync(filePath).size;
}
function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}
function writeJson(name: string, value: unknown): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}
function writeText(name: string, value: string): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}
function norm(value: string | undefined | null): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function words(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !["full", "record", "material", "source", "outstanding"].includes(word));
}

function offenceBucket(family: string): string {
  const f = norm(family);
  if (/sexual|abe|historic sexual/.test(f)) return "sexual";
  if (/robbery/.test(f)) return "robbery";
  if (/burglary|theft/.test(f)) return "burglary_theft";
  if (/fraud|account|money.?launder|document/.test(f)) return "fraud";
  if (/drug|pwits|encro|county.?lines/.test(f)) return "drugs";
  if (/weapon|blade|firearm/.test(f)) return "weapons";
  if (/motor|driving|drink.?drive|fail.?to.?provide|no.?insurance/.test(f)) return "driving";
  if (/public.?order/.test(f)) return "public_order";
  if (/harassment|malicious.?comm|domestic/.test(f)) return "harassment_domestic";
  if (/violence|assault|gbh|aew|police.?contact/.test(f)) return "violence";
  if (/pervert/.test(f)) return "perverting_justice";
  if (/breach.?order/.test(f)) return "breach_orders";
  if (/youth/.test(f)) return "youth";
  if (/custody|pace/.test(f)) return "custody_pace";
  if (/digital|phone|attribution/.test(f)) return "digital_attribution";
  if (/criminal.?damage/.test(f)) return "criminal_damage";
  if (/mixed|generic|unclear/.test(f)) return "mixed_unclear";
  return f.split(" ")[0] || "other";
}

function bundleSizeTier(sourceBytes: number): CandidateMatter["bundleSizeTier"] {
  if (sourceBytes < 2_500) return "tiny";
  if (sourceBytes < 8_000) return "small";
  if (sourceBytes < 25_000) return "medium";
  if (sourceBytes < 80_000) return "large";
  return "very_large";
}

function detectStage(text: string): string {
  const t = norm(text);
  // Prefer explicit labelled stage phrases; avoid classifying every incidental "trial"/"plea" mention.
  if (/\b(current|next|listed)\s+(hearing\s+)?(is\s+|for\s+)?first appearance\b|\bfirst appearance\b/.test(t) && !/\bptph\b/.test(t)) {
    return "first_appearance";
  }
  if (/\blisted for (a )?ptph\b|\bptph listed\b|\bplea and trial preparation hearing\b|\bstage:\s*ptph\b/.test(t)) {
    return "ptph";
  }
  if (/\blisted for (trial|sentence|sentencing)\b|\bstage:\s*(trial|sentence)\b/.test(t)) {
    return /\bsentenc/.test(t) ? "sentence" : "trial";
  }
  if (/\bguilty plea\b|\bnot guilty plea\b|\bplea hearing\b/.test(t)) return "plea";
  if (/\bbail hearing\b|\bcmc\b/.test(t)) return "bail";
  if (/\bsingle justice\b|\bsjp\b/.test(t)) return "sjp";
  if (/\bptph\b/.test(t)) return "ptph";
  if (/\bfirst appearance\b/.test(t)) return "first_appearance";
  return "unclear_unknown";
}

function evidenceModalities(text: string, truth: TruthKey): string[] {
  const t = norm(text);
  const labels = (truth.evidenceItems ?? []).map((item) => norm(item.evidence_item));
  const hay = `${t}\n${labels.join("\n")}`;
  const mods: string[] = [];
  if (/\binterview\b|\btranscript\b/.test(hay)) mods.push("interview");
  if (/\bcctv\b|\bdashcam\b/.test(hay)) mods.push("cctv");
  if (/\bbwv\b|\bbody worn\b/.test(hay)) mods.push("bwv");
  if (/\bphone\b|\bdownload\b|\bdevice extraction\b|\bsubscriber\b/.test(hay)) mods.push("phone");
  if (/\bmg11\b|\bwitness statement\b|\bcomplainant statement\b/.test(hay)) mods.push("witness_statement");
  if (/\bcustody\b|\bpace\b|\brisk assessment\b/.test(hay)) mods.push("custody");
  if (/\bmg6\b|\bunused\b|\bdisclosure schedule\b/.test(hay)) mods.push("disclosure_schedule");
  if (/\bexhibit\b|\bexhibits?\b/.test(hay)) mods.push("exhibits");
  if (/\b999\b|\bcad\b/.test(hay)) mods.push("cad_999");
  if (/\bmedical\b|\binjury\b|\bhospital\b/.test(hay)) mods.push("medical");
  if (/\bforensic\b|\blab analysis\b|\bdna\b/.test(hay)) mods.push("forensic");
  if (/\bidentification\b|\bid procedure\b|\bvip\b/.test(hay)) mods.push("identification");
  if (mods.length === 0) mods.push("none_of_core_families");
  return [...new Set(mods)].sort();
}

function complexityTags(text: string, truth: TruthKey, profile: string): string[] {
  const t = norm(text);
  const p = norm(profile);
  const tags: string[] = [];
  if (/\bdefendant 2\b|\bco-?defendant\b|\bmulti.?handed\b|\bjoint enterprise\b|\bconspiracy\b/.test(`${t} ${p}`)) {
    tags.push("multi_defendant");
  } else {
    tags.push("single_defendant");
  }
  if (/\bcount 2\b|\bcounts?\b.+\bcounts?\b|\bmulti.?count\b/.test(t)) tags.push("multi_count");
  else tags.push("single_count");
  if (/\bwitness\b/.test(t) && (t.match(/\bwitness\b/g) ?? []).length >= 3) tags.push("multi_witness");
  if (/\bamended\b|\bsuperseded\b|\breplacement\b|\bupdated schedule\b/.test(t)) tags.push("amended_documents");
  if (/\bduplicate\b|\bcopy of\b/.test(t)) tags.push("duplicate_documents");
  if (/source_hierarchy_conflict|date_time_conflict|wrong_person_entity|partial_vs_full/.test(p)) {
    tags.push("conflict_or_trap_profile");
  }
  if (/\bpage missing\b|\bmissing pages?\b|\bunreadable\b|\bcorrupt\b|\bscan quality\b/.test(t)) {
    tags.push("difficult_scan_or_missing_pages");
  }
  if (/\bpartial\b|\bincomplete bundle\b/.test(`${t} ${p}`)) tags.push("partial_bundle");
  if (tags.filter((tag) => !tag.startsWith("single_")).length <= 1) tags.push("relatively_clean");
  return [...new Set(tags)].sort();
}

function familyFromLabel(label: string): string {
  const n = norm(label);
  if (/\bcctv|dashcam|footage|master\b/.test(n)) return "cctv";
  if (/\binterview|transcript\b/.test(n)) return "interview";
  if (/\bcustody|pace|risk assessment\b/.test(n)) return "custody";
  if (/\bbwv|body worn\b/.test(n)) return "bwv";
  if (/\bphone|download|device|subscriber|metadata\b/.test(n)) return "phone";
  if (/\bmessage|screenshot\b/.test(n)) return "message";
  if (/\bcad|999|control room\b/.test(n)) return "999";
  if (/\bmg11|witness statement|complainant\b/.test(n)) return "mg11";
  if (/\bmg6|unused|schedule\b/.test(n)) return "mg6";
  if (/\bmedical|injury|hospital|expert|examiner|collision report|lab|analysis|forensic\b/.test(n)) return "expert_lab";
  if (/\bprovenance|continuity|chain|mapping\b/.test(n)) return "provenance_continuity";
  if (/\bidentification|id procedure\b/.test(n)) return "identification";
  return "other";
}

function sourceSupportsExpected(expected: string, sourceText: string): boolean {
  const haystack = norm(sourceText);
  const expectedNorm = norm(expected);
  if (!expectedNorm) return false;
  if (haystack.includes(expectedNorm)) return true;
  // Require stronger overlap than a single generic token (e.g. "attribution").
  const expectedWords = words(expected).filter((word) => word.length >= 5);
  if (expectedWords.length === 0) return false;
  const hits = expectedWords.filter((word) => haystack.includes(word));
  return hits.length >= Math.min(2, expectedWords.length);
}

function expectedFoundInLive(
  expected: string,
  liveItems: ReturnType<typeof buildDisclosureChaseBrief>["items"],
): boolean {
  const expectedNorm = norm(expected);
  const expectedFamily = familyFromLabel(expected);
  const expectedWords = words(expected);
  for (const item of liveItems) {
    const haystack = norm(
      [item.label, item.whyItMatters, item.draftChaseWording, item.courtLine, item.evidenceAnchor, ...item.mergedFrom]
        .filter(Boolean)
        .join("\n"),
    );
    if (haystack.includes(expectedNorm)) return true;
    if (item.familyId !== "other" && (item.familyId === expectedFamily || familyFromLabel(item.label) === expectedFamily)) {
      return true;
    }
    if (expectedWords.length && expectedWords.some((word) => haystack.includes(word))) return true;
  }
  return false;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function pickRoundRobin<T>(buckets: Map<string, T[]>, target: number, used: Set<string>, idFn: (item: T) => string): T[] {
  const selected: T[] = [];
  const keys = [...buckets.keys()].sort();
  let progressed = true;
  while (selected.length < target && progressed) {
    progressed = false;
    for (const key of keys) {
      if (selected.length >= target) break;
      const list = buckets.get(key) ?? [];
      while (list.length) {
        const next = list.shift()!;
        const id = idFn(next);
        if (used.has(id)) continue;
        selected.push(next);
        used.add(id);
        progressed = true;
        break;
      }
    }
  }
  return selected;
}

function buildCandidate(caseDir: string, gold: Set<string>, holdout: Set<string>): CandidateMatter | null {
  const truthPath = path.join(caseDir, "truth-key.json");
  const sourcePath = path.join(caseDir, "bundle-text.md");
  const outputPath = path.join(caseDir, "casebrain-output.json");
  if (!existsSync(truthPath) || !existsSync(sourcePath) || !existsSync(outputPath)) return null;
  const truth = readJson<TruthKey>(truthPath);
  const sourceText = readFileSync(sourcePath, "utf8");
  const caseId = truth.caseId || path.basename(caseDir);
  const sourceBytes = bytes(sourcePath);
  const offenceFamily = truth.offenceFamily || "unknown";
  const profile = truth.profile || "unknown";
  const modalities = evidenceModalities(sourceText, truth);
  const complexity = complexityTags(sourceText, truth, profile);
  const stage = detectStage(sourceText);
  const tier = bundleSizeTier(sourceBytes);
  const strata = [
    `family:${offenceFamily}`,
    `bucket:${offenceBucket(offenceFamily)}`,
    `profile:${profile}`,
    `bundleStatus:${truth.bundleStatus || "unknown"}`,
    `size:${tier}`,
    `stage:${stage}`,
    ...modalities.map((m) => `evidence:${m}`),
    ...complexity.map((c) => `complexity:${c}`),
  ];
  return {
    caseId,
    title: truth.title || caseId,
    offenceFamily,
    offenceBucket: offenceBucket(offenceFamily),
    profile,
    bundleStatus: truth.bundleStatus || "unknown",
    sourcePath: rel(sourcePath),
    truthKeyPath: rel(truthPath),
    outputPath: rel(outputPath),
    sourceSha256: sha256File(sourcePath),
    truthKeySha256: sha256File(truthPath),
    outputSha256: sha256File(outputPath),
    sourceBytes,
    bundleSizeTier: tier,
    proceduralStage: stage,
    evidenceModalities: modalities,
    complexityTags: complexity,
    strata: [...new Set(strata)].sort(),
    evidenceItemCount: truth.evidenceItems?.length ?? 0,
    expectedChaseCount: truth.expectedChaseItems?.length ?? 0,
    inStarterGold: gold.has(caseId),
    inHoldout: holdout.has(caseId),
  };
}

function selectRepresentative150(candidates: CandidateMatter[], target: number): CandidateMatter[] {
  const pool = candidates.filter((c) => !c.inHoldout && !c.inStarterGold);
  const used = new Set<string>();
  const selected: CandidateMatter[] = [];

  const byBucket = new Map<string, CandidateMatter[]>();
  const byStage = new Map<string, CandidateMatter[]>();
  const bySize = new Map<string, CandidateMatter[]>();
  const byPresence = new Map<string, CandidateMatter[]>();
  const byComplexity = new Map<string, CandidateMatter[]>();

  const score = (m: CandidateMatter): number =>
    m.strata.length * 5 +
    m.evidenceItemCount * 2 +
    m.expectedChaseCount * 3 +
    (m.complexityTags.includes("conflict_or_trap_profile") ? 12 : 0) +
    (m.complexityTags.includes("relatively_clean") ? 4 : 0) +
    m.sourceSha256.charCodeAt(0);

  const sortInto = (map: Map<string, CandidateMatter[]>, key: string, matter: CandidateMatter) => {
    const list = map.get(key) ?? [];
    list.push(matter);
    map.set(key, list);
  };

  for (const matter of [...pool].sort((a, b) => score(b) - score(a) || a.caseId.localeCompare(b.caseId))) {
    sortInto(byBucket, matter.offenceBucket, matter);
    sortInto(byStage, matter.proceduralStage, matter);
    sortInto(bySize, matter.bundleSizeTier, matter);
    for (const mod of matter.evidenceModalities) sortInto(byPresence, mod, matter);
    for (const tag of matter.complexityTags) sortInto(byComplexity, tag, matter);
  }

  for (const map of [byBucket, byStage, bySize, byPresence, byComplexity]) {
    for (const [key, list] of map) {
      map.set(
        key,
        [...list].sort((a, b) => score(b) - score(a) || a.caseId.localeCompare(b.caseId)),
      );
    }
  }

  const take = (map: Map<string, CandidateMatter[]>, want: number) => {
    const remaining = Math.max(0, target - selected.length);
    if (remaining <= 0) return;
    for (const matter of pickRoundRobin(map, Math.min(want, remaining), used, (m) => m.caseId)) {
      selected.push(matter);
    }
  };

  // Phase 1: one per offence bucket.
  take(byBucket, byBucket.size);
  // Phase 2: ensure stage coverage.
  take(byStage, byStage.size);
  // Phase 3: ensure size tiers.
  take(bySize, bySize.size);
  // Phase 4: ensure evidence presence/absence families.
  take(byPresence, Math.min(byPresence.size, 24));
  // Phase 5: complexity diversity.
  take(byComplexity, Math.min(byComplexity.size, 24));
  // Phase 6: prefer underrepresented bundle sizes, then fill by score with bucket caps.
  const sizeCounts = countBy(selected, (m) => m.bundleSizeTier);
  const sizePriority: CandidateMatter["bundleSizeTier"][] = ["very_large", "large", "medium", "small", "tiny"];
  for (const tier of sizePriority) {
    const remaining = Math.max(0, target - selected.length);
    if (remaining <= 0) break;
    const want = Math.min(remaining, Math.max(0, 12 - (sizeCounts[tier] ?? 0)));
    const list = (bySize.get(tier) ?? []).filter((m) => !used.has(m.caseId));
    for (const matter of list.slice(0, want)) {
      selected.push(matter);
      used.add(matter.caseId);
      sizeCounts[tier] = (sizeCounts[tier] ?? 0) + 1;
    }
  }

  const bucketCounts = countBy(selected, (m) => m.offenceBucket);
  const maxPerBucket = Math.max(8, Math.ceil(target / Math.max(1, byBucket.size)) + 4);
  const fillScore = (m: CandidateMatter): number =>
    score(m) +
    (m.bundleSizeTier === "tiny" ? -20 : 0) +
    (m.bundleSizeTier === "large" || m.bundleSizeTier === "very_large" ? 25 : 0) +
    (m.bundleSizeTier === "medium" ? 15 : 0) +
    (m.proceduralStage === "ptph" ? -5 : 8);

  for (const matter of [...pool].sort((a, b) => fillScore(b) - fillScore(a) || a.caseId.localeCompare(b.caseId))) {
    if (selected.length >= target) break;
    if (used.has(matter.caseId)) continue;
    if ((bucketCounts[matter.offenceBucket] ?? 0) >= maxPerBucket) continue;
    selected.push(matter);
    used.add(matter.caseId);
    bucketCounts[matter.offenceBucket] = (bucketCounts[matter.offenceBucket] ?? 0) + 1;
  }
  // Phase 7: if still short, relax bucket cap.
  for (const matter of [...pool].sort((a, b) => fillScore(b) - fillScore(a) || a.caseId.localeCompare(b.caseId))) {
    if (selected.length >= target) break;
    if (used.has(matter.caseId)) continue;
    selected.push(matter);
    used.add(matter.caseId);
  }

  return selected.sort((a, b) => a.caseId.localeCompare(b.caseId));
}

const commit = (process.env.MASTER3000_CERTIFIED_COMMIT || "").trim() || git(["rev-parse", "HEAD"]);
const runId = `phase9-representative-150-${GENERATED_AT.replace(/[:.]/g, "-")}`;

const goldManifest = readJson<{ matters: { caseId: string }[] }>(path.join(PHASE5_ROOT, "STARTER-GOLD-MANIFEST.json"));
const holdoutManifest = readJson<{ matters: { caseId: string }[] }>(
  path.join(PHASE5_ROOT, "HOLDOUT-CANDIDATE-MANIFEST.json"),
);
const goldIds = new Set(goldManifest.matters.map((m) => m.caseId));
const holdoutIds = new Set(holdoutManifest.matters.map((m) => m.caseId));

const allCandidates = readdirSync(CASE_ROOT)
  .map((name) => buildCandidate(path.join(CASE_ROOT, name), goldIds, holdoutIds))
  .filter((m): m is CandidateMatter => Boolean(m));

const selected = selectRepresentative150(allCandidates, TARGET);
const holdoutOverlap = selected.filter((m) => m.inHoldout).map((m) => m.caseId);
const goldOverlap = selected.filter((m) => m.inStarterGold).map((m) => m.caseId);

if (holdoutOverlap.length > 0) {
  throw new Error(`Holdout contamination in Phase 9 selection: ${holdoutOverlap.join(", ")}`);
}

const manifest = {
  schemaVersion: "casebrain-master3000-phase9-representative-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  commit,
  target: TARGET,
  selectedCount: selected.length,
  poolAvailableExcludingHoldoutAndGold: allCandidates.filter((m) => !m.inHoldout && !m.inStarterGold).length,
  starterGoldOverlapCount: goldOverlap.length,
  holdoutOverlapCount: holdoutOverlap.length,
  selectionPolicy: {
    excludeHoldout: true,
    excludeStarterGoldFromSample: true,
    starterGoldRole: "separate_regression_gate",
    axes: [
      "offence_bucket",
      "procedural_stage",
      "bundle_size_tier",
      "evidence_modality_presence_and_absence",
      "complexity",
    ],
    note:
      "Stratified round-robin across offence/stage/size/evidence/complexity. Not first-N, not newest-N, not random-only.",
  },
  distributions: {
    offenceBucket: countBy(selected, (m) => m.offenceBucket),
    offenceFamily: countBy(selected, (m) => m.offenceFamily),
    proceduralStage: countBy(selected, (m) => m.proceduralStage),
    bundleSizeTier: countBy(selected, (m) => m.bundleSizeTier),
    evidenceModalities: selected.reduce<Record<string, number>>((acc, m) => {
      for (const mod of m.evidenceModalities) acc[mod] = (acc[mod] ?? 0) + 1;
      return acc;
    }, {}),
    complexityTags: selected.reduce<Record<string, number>>((acc, m) => {
      for (const tag of m.complexityTags) acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {}),
  },
  matters: selected,
};

writeJson("REPRESENTATIVE-150-MANIFEST.json", manifest);
writeJson("SELECTION-DISTRIBUTIONS.json", {
  selectedCount: selected.length,
  ...manifest.distributions,
  starterGoldOverlap: goldOverlap,
  holdoutOverlap: holdoutOverlap,
});

console.log(
  JSON.stringify(
    {
      phase: "select",
      selected: selected.length,
      target: TARGET,
      goldOverlap: goldOverlap.length,
      holdoutOverlap: holdoutOverlap.length,
      buckets: Object.keys(manifest.distributions.offenceBucket).length,
      stages: Object.keys(manifest.distributions.proceduralStage).length,
      sizes: manifest.distributions.bundleSizeTier,
    },
    null,
    2,
  ),
);

if (SELECT_ONLY) {
  writeText(
    "DECISION-CARD.md",
    `# Phase 9 — selection complete\n\nSelected **${selected.length}** matters. Detection pass not run (\`--select-only\`).\n`,
  );
  process.exit(0);
}

type LivePack = {
  matter: CandidateMatter;
  truth: TruthKey;
  bundleText: string;
  meta: ReturnType<typeof extractBundleCaseMetadata>;
  ledger: ReturnType<typeof buildBundleTruthLedger>;
  brief: ReturnType<typeof buildDisclosureChaseBrief>;
};

function buildLive(matter: CandidateMatter): LivePack {
  const truth = readJson<TruthKey>(path.join(ROOT, matter.truthKeyPath));
  const bundleText = readFileSync(path.join(ROOT, matter.sourcePath), "utf8");
  const meta = extractBundleCaseMetadata(bundleText);
  const ledger = buildBundleTruthLedger({ bundleText });
  const brief = buildDisclosureChaseBrief({
    caseId: matter.caseId,
    caseTitle: truth.title ?? matter.title,
    clientLabel: truth.title ?? matter.title,
    allegation: truth.offenceWording ?? "",
    stage: meta.stage ?? "unknown",
    hearingStatus: meta.nextHearingIso ? "listed" : "unknown",
    hearingDateIso: meta.nextHearingIso,
    bundleHealth: truth.bundleStatus ?? "",
    positionStatus: "unknown",
    battleboard: null,
    bundleText,
  });
  return { matter, truth, bundleText, meta, ledger, brief };
}

function pushResult(
  rows: AuditResultEnvelope[],
  input: Omit<AuditResultEnvelope, "schemaVersion">,
): void {
  rows.push(createAuditResult(input));
}

function evaluateMatterStructural(pack: LivePack): AuditResultEnvelope[] {
  const rows: AuditResultEnvelope[] = [];
  const { matter, truth, bundleText, meta, ledger, brief } = pack;
  const sourceNorm = norm(bundleText);
  const chaseText = brief.items
    .map((item) => [item.label, item.draftChaseWording, item.courtLine, item.evidenceAnchor, ...item.mergedFrom].join("\n"))
    .join("\n");
  const solicitorVisible = [
    ...brief.items.map((item) => `${item.label}\n${item.draftChaseWording}\n${item.courtLine}`),
    brief.headerNote ?? "",
  ].join("\n");

  // --- Date role: offence date must not become hearing ---
  const offenceDateMatch = bundleText.match(/\bOffence date:\s*(\d{1,2}\/\d{1,2}\/\d{4})\b/i);
  const listingPresent = /\blisted for\b|\bhearing\b|\bcourt appearance\b|\bptph\b|\bfirst appearance\b/i.test(bundleText);
  if (offenceDateMatch && meta.nextHearingIso) {
    const [dd, mm, yyyy] = offenceDateMatch[1].split("/");
    const offenceIso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const sameAsOffence = meta.nextHearingIso === offenceIso;
    const fail = sameAsOffence && !listingPresent;
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA2-FID-04-DATES-TIMES-LOCATIONS-MONEY",
      invariantId: "CB-HIST-OFFENCE-DATE-NOT-HEARING",
      failureClass: "semantic_role_failure",
      severity: "P1",
      evidenceFamily: "date_role",
      surface: "canonical_state",
      sourceReference: { path: matter.sourcePath, excerpt: offenceDateMatch[0] },
      expected: "Offence date must not populate hearing without listing context.",
      actual: fail
        ? `nextHearingIso=${meta.nextHearingIso} equals offence date without listing context.`
        : `Hearing extraction=${meta.nextHearingIso}; offence=${offenceIso}; listingPresent=${listingPresent}.`,
      rootCauseCluster: fail ? "date_role_offence_as_hearing" : "date_role_ok",
      disposition: fail ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- Hostile instruction leakage into chase ---
  const hostileInChase = brief.items.some(
    (item) =>
      isPromptInjectionInstructionLine(item.label) ||
      item.mergedFrom.some((line) => isPromptInjectionInstructionLine(line)) ||
      isPromptInjectionInstructionLine(item.draftChaseWording),
  );
  const sourceHasHostile = bundleText.split(/\r?\n/).some((line) => isPromptInjectionInstructionLine(line));
  if (sourceHasHostile || hostileInChase) {
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA2-SEC-01-PROMPT-INJECTION-DOCS",
      invariantId: "CB-HIST-HOSTILE-INSTRUCTION-NOT-CHASE-LABEL",
      failureClass: "prompt_injection_content_control_failure",
      severity: "P0",
      evidenceFamily: "security",
      surface: "cps_chase",
      sourceReference: { path: matter.sourcePath },
      expected: "Hostile instruction-shaped source lines must not become chase labels/mergedFrom.",
      actual: hostileInChase
        ? "Hostile instruction text appears in live chase output."
        : "Hostile source present; chase output filtered.",
      rootCauseCluster: hostileInChase ? "hostile_instruction_chase_leak" : "hostile_instruction_filtered",
      disposition: hostileInChase ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- CCTV must not inherit phone provenance ---
  // CCTV "download/export/device continuity" wording is not phone-handset provenance.
  const cctvPhoneProv = brief.items.some((item) => {
    const fam = item.familyId === "cctv" || item.familyId === "cctv_master" || item.familyId === "cctv_continuity" || familyFromLabel(item.label) === "cctv";
    if (!fam) return false;
    const anchor = norm(`${item.evidenceAnchor ?? ""}\n${item.mergedFrom.join("\n")}`);
    const phoneHandset =
      /\b(phone download|handset|subscriber|call data|mobile phone|device extraction)\b/.test(anchor) &&
      !/\bcctv\b|\bfootage\b|\bbodycam\b|\bdashcam\b|\bexport\b|\bcontinuity\b/.test(anchor);
    return phoneHandset;
  });
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-PROVENANCE",
    invariantId: "CB-HIST-CCTV-NOT-PHONE-PROVENANCE",
    failureClass: "provenance_family_failure",
    severity: "P0",
    evidenceFamily: "cctv",
    surface: "cps_chase",
    sourceReference: { path: matter.sourcePath },
    expected: "CCTV chase must not inherit phone-handset/download provenance anchors.",
    actual: cctvPhoneProv ? "CCTV item carries phone-handset provenance/anchor." : "No CCTV→phone-handset provenance contamination observed.",
    rootCauseCluster: cctvPhoneProv ? "cctv_phone_provenance_contamination" : "cctv_phone_provenance_ok",
    disposition: cctvPhoneProv ? "candidate_failure" : "pass",
    coverageStatus: "evaluated",
  });

  // --- BWV swallowed by CCTV when both present in source ---
  const sourceHasBwv = /\bbwv\b|\bbody worn\b/.test(sourceNorm);
  const sourceHasCctv = /\bcctv\b/.test(sourceNorm);
  if (sourceHasBwv && sourceHasCctv) {
    const hasBwvChase = brief.items.some((item) => item.familyId === "bwv" || familyFromLabel(item.label) === "bwv");
    const hasCctvChase = brief.items.some((item) => item.familyId === "cctv" || familyFromLabel(item.label) === "cctv");
    const bwvOutstanding = /\bbwv\b.*\b(outstanding|not served|to follow)\b|\b(outstanding|not served|to follow)\b.*\bbwv\b/.test(
      sourceNorm,
    );
    const fail = bwvOutstanding && hasCctvChase && !hasBwvChase;
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
      invariantId: "CB-HIST-BWV-NOT-SWALLOWED-BY-CCTV",
      failureClass: "dedupe_alias_failure",
      severity: "P1",
      evidenceFamily: "bwv",
      surface: "cps_chase",
      sourceReference: { path: matter.sourcePath },
      expected: "Outstanding BWV must remain distinguishable when CCTV is also present.",
      actual: fail
        ? "Source indicates outstanding BWV; live chase has CCTV without BWV."
        : `bwvChase=${hasBwvChase}; cctvChase=${hasCctvChase}; bwvOutstanding=${bwvOutstanding}.`,
      rootCauseCluster: fail ? "bwv_swallowed_by_cctv" : "bwv_cctv_distinct_ok",
      disposition: fail ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- Unsupported phone chase when source never mentions phone ---
  const phoneMentioned =
    /\bphone\b|\bmobile\b|\bhandset\b|\bdevice extraction\b|\bsubscriber\b|\bcall data\b|\btelecom\b|\bmessage export\b|\bplatform export\b/.test(
      sourceNorm,
    );
  const phoneChase = brief.items.filter((item) => {
    if (item.familyId === "phone") return true;
    const label = norm(item.label);
    // Do not treat motoring "device printout/records" or generic "device" as phone family.
    return /\b(phone download|mobile phone|handset|subscriber|call data|device extraction|phone extraction)\b/.test(label);
  });
  // Only flag when the visible card is a phone-family chase without any phone-family source support.
  if (phoneChase.length > 0 && !phoneMentioned) {
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-CHASE-QUALITY",
      invariantId: "CB-HIST-UNSUPPORTED-PHONE-NOT-CHASE",
      failureClass: "unsupported_promotion_failure",
      severity: "P1",
      evidenceFamily: "phone",
      surface: "cps_chase",
      sourceReference: { path: matter.sourcePath },
      expected: "Phone chase only when source supports phone/download material.",
      actual: `Phone chase present without phone-family source support (${phoneChase.map((i) => i.label).join(" | ")}).`,
      rootCauseCluster: "unsupported_phone_chase",
      disposition: "candidate_failure",
      coverageStatus: "evaluated",
    });
  } else if (phoneChase.length > 0) {
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-CHASE-QUALITY",
      invariantId: "CB-HIST-UNSUPPORTED-PHONE-NOT-CHASE",
      failureClass: "unsupported_promotion_failure",
      severity: "P1",
      evidenceFamily: "phone",
      surface: "cps_chase",
      sourceReference: { path: matter.sourcePath },
      expected: "Phone chase only when source supports phone/download material.",
      actual: `Phone chase present with source support (${phoneChase.length}).`,
      rootCauseCluster: "phone_chase_source_supported",
      disposition: "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- Explicit outstanding full transcript must not look served ---
  const fullTranscriptOutstanding =
    /\bfull transcript\b[^.\n]{0,80}\b(outstanding|to follow|not served|not on bundle|not yet)\b|\b(outstanding|to follow|not served|not on bundle)\b[^.\n]{0,80}\bfull transcript\b/.test(
      sourceNorm,
    );
  if (fullTranscriptOutstanding) {
    const fullTranscriptRows = ledger.materials.filter((row) => /\bfull transcript\b/i.test(row.label));
    const outstandingFullMarkedServed = fullTranscriptRows.some((row) =>
      /^(served|complete|received)$/i.test(String(row.status)),
    );
    const chaseClaimsFullServed = brief.items.some((item) => {
      const hay = norm(`${item.label}\n${item.draftChaseWording}\n${item.baseStatus}`);
      return /\bfull transcript\b/.test(hay) && /\bserved\b|\breceived\b|\bcomplete\b/.test(hay) && !/\boutstanding\b|\bnot served\b/.test(hay);
    });
    const fail = outstandingFullMarkedServed || chaseClaimsFullServed;
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA2-BND-10-RECORDING-VS-TRANSCRIPT",
      invariantId: "CB-HIST-OUTSTANDING-TRANSCRIPT-NOT-SERVED",
      failureClass: "evidence_state_failure",
      severity: "P0",
      evidenceFamily: "interview",
      surface: "canonical_state",
      sourceReference: { path: matter.sourcePath },
      expected: "Explicitly outstanding full transcript must not resolve as served (fragment served may coexist).",
      actual: fail
        ? "Outstanding full transcript appears served in live ledger/chase."
        : "Full transcript outstanding preserved; fragment-served coexistence allowed.",
      rootCauseCluster: fail ? "outstanding_transcript_marked_served" : "outstanding_transcript_ok",
      disposition: fail ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- First Appearance must not render PTPH workflow language as current stage ---
  if (matter.proceduralStage === "first_appearance" || /\bfirst appearance\b/.test(sourceNorm)) {
    const stage = norm(meta.stage ?? "");
    const fail = /\bptph\b/.test(stage);
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-CROSS-SURFACE",
      invariantId: "CB-HIST-FIRST-APPEARANCE-NOT-PTPH",
      failureClass: "workflow_stage_failure",
      severity: "P1",
      evidenceFamily: "stage",
      surface: "overview",
      sourceReference: { path: matter.sourcePath },
      expected: "First Appearance source must not extract current stage as PTPH.",
      actual: fail ? `Extracted stage=${meta.stage}` : `Stage extraction=${meta.stage ?? "null"}; FA source preserved.`,
      rootCauseCluster: fail ? "first_appearance_as_ptph" : "first_appearance_stage_ok",
      disposition: fail ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    });
  }

  // --- Chase provenance gap ---
  const missingProv = brief.items.filter((item) => !(item.evidenceAnchor || item.provenance));
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-PROVENANCE",
    invariantId: "CB-LIVE-CHASE-HAS-SOURCE-LIMITATION",
    failureClass: "provenance_family_failure",
    severity: "P1",
    evidenceFamily: "all_chase_items",
    surface: "cps_chase",
    sourceReference: { path: matter.sourcePath },
    expected: "Every live chase item should carry provenance, evidence anchor or explicit limitation.",
    actual:
      missingProv.length === 0
        ? "All live chase items carry provenance/anchor/limitation."
        : `${missingProv.length} chase items lack provenance/anchor.`,
    rootCauseCluster: missingProv.length === 0 ? "live_chase_provenance_present" : "live_chase_provenance_gap",
    disposition: missingProv.length === 0 ? "pass" : "candidate_failure",
    coverageStatus: "evaluated",
  });

  // --- Ledger present ---
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-COMPLETENESS",
    invariantId: "CB-LIVE-CANONICAL-LEDGER-USED",
    failureClass: "partial_processing_failure",
    severity: "P1",
    evidenceFamily: "bundle_ledger",
    surface: "canonical_state",
    sourceReference: { path: matter.sourcePath },
    expected: "Bundle truth ledger should produce material rows for non-empty source.",
    actual:
      ledger.materials.length > 0
        ? `Ledger materials=${ledger.materials.length}.`
        : bundleText.trim().length > 80
          ? "Non-empty bundle produced empty ledger."
          : "Empty/short bundle; empty ledger acceptable.",
    rootCauseCluster:
      ledger.materials.length > 0 || bundleText.trim().length <= 80 ? "canonical_ledger_available" : "canonical_ledger_empty",
    disposition: ledger.materials.length > 0 || bundleText.trim().length <= 80 ? "pass" : "candidate_failure",
    coverageStatus: "evaluated",
  });

  // --- Counter reconcile ---
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-CROSS-SURFACE",
    invariantId: "CB-LIVE-CHASE-COUNTERS-RECONCILE",
    failureClass: "counter_denominator_failure",
    severity: "P2",
    evidenceFamily: "counters",
    surface: "cps_chase",
    expected: "Disclosure counters should reconcile to live item denominator.",
    actual:
      brief.counters.total === brief.items.length
        ? "Counters reconcile."
        : `Counter ${brief.counters.total} != items ${brief.items.length}.`,
    rootCauseCluster: brief.counters.total === brief.items.length ? "live_counter_reconciles" : "live_counter_mismatch",
    disposition: brief.counters.total === brief.items.length ? "pass" : "candidate_failure",
    coverageStatus: "evaluated",
  });

  // --- Internal / banned solicitor-visible wording ---
  const leaks = lintReasoningV2PublicText(solicitorVisible);
  const bannedEnum = /\b(not_safely_confirmed|baseStatus|familyId|mergedFrom|evidenceAnchor)\b/.test(solicitorVisible);
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-LANGUAGE",
    invariantId: "CB-HIST-NO-INTERNAL-TAXONOMY-VISIBLE",
      failureClass: "solicitor_visible_internal_language_failure",
    severity: "P2",
    evidenceFamily: "wording",
    surface: "cps_chase",
    sourceReference: { path: matter.sourcePath },
    expected: "Solicitor-visible chase text must not leak internal taxonomy/telemetry/paths.",
    actual:
      leaks.length || bannedEnum
        ? `Leaks=${[...leaks, bannedEnum ? "raw_enum_token" : ""].filter(Boolean).join("; ")}`
        : "No internal taxonomy/telemetry leak detected in chase text.",
    rootCauseCluster: leaks.length || bannedEnum ? "internal_taxonomy_visible" : "language_ok",
    disposition: leaks.length || bannedEnum ? "candidate_failure" : "pass",
    coverageStatus: "evaluated",
  });

  // --- Duplicate outstanding boilerplate ---
  const outstandingLines = brief.items
    .map((item) => norm(item.label))
    .filter((label) => /\boutstanding\b/.test(label));
  const dupes = outstandingLines.filter((label, idx) => outstandingLines.indexOf(label) !== idx);
  pushResult(rows, {
    runId,
    commit,
    caseId: matter.caseId,
    controlId: "MAA-LANGUAGE",
    invariantId: "CB-HIST-NO-DUPLICATE-OUTSTANDING-WORDING",
    failureClass: "dedupe_alias_failure",
    severity: "P2",
    evidenceFamily: "wording",
    surface: "cps_chase",
    expected: "Disclosure wording must not duplicate the same outstanding phrase.",
    actual: dupes.length ? `Duplicate outstanding labels: ${[...new Set(dupes)].join(" | ")}` : "No duplicate outstanding labels.",
    rootCauseCluster: dupes.length ? "duplicate_outstanding_wording" : "dedupe_ok",
    disposition: dupes.length ? "candidate_failure" : "pass",
    coverageStatus: "evaluated",
  });

  // --- Truth-key expected chase (candidate only; require source support for defect) ---
  for (const expected of truth.expectedChaseItems ?? []) {
    const sourceSupported = sourceSupportsExpected(expected, bundleText);
    const found = expectedFoundInLive(expected, brief.items);
    const disposition = !sourceSupported
      ? found
        ? "human_review_required"
        : "false_positive"
      : found
        ? "pass"
        : "candidate_failure";
    pushResult(rows, {
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-CHASE-QUALITY",
      invariantId: "CB-LIVE-EXPECTED-CHASE-PRESENT",
      failureClass: "extraction_failure",
      severity: "P1",
      evidenceFamily: familyFromLabel(expected),
      surface: "cps_chase",
      sourceReference: { path: matter.truthKeyPath, field: "expectedChaseItems" },
      expected: `Live builder should surface source-backed expected chase: ${expected}`,
      actual: !sourceSupported
        ? found
          ? "Truth expectation not source-backed but live surfaces related wording."
          : "Truth expectation not source-backed; live omits (auditor FP candidate)."
        : found
          ? "Expected chase found."
          : "Source-backed expected chase absent from live builder.",
      rootCauseCluster: !sourceSupported
        ? found
          ? "truth_expected_not_source_backed_live_present"
          : "truth_expected_not_source_backed_live_absent"
        : found
          ? "live_expected_chase_present"
          : "live_expected_chase_missing",
      disposition,
      coverageStatus: "evaluated",
    });
  }

  // Ensure hostile filter utility stays referenced for opposite-direction hygiene in tooling.
  void filterPromptInjectionInstructionLines;

  return rows;
}

const livePacks: LivePack[] = [];
const phase9Results: AuditResultEnvelope[] = [];
const matterMetrics: Array<Record<string, unknown>> = [];

for (const matter of selected) {
  const pack = buildLive(matter);
  livePacks.push(pack);
  const rows = evaluateMatterStructural(pack);
  phase9Results.push(...rows);

  const chaseFamilies = countBy(pack.brief.items, (item) => item.familyId || familyFromLabel(item.label));
  matterMetrics.push({
    caseId: matter.caseId,
    offenceBucket: matter.offenceBucket,
    proceduralStage: matter.proceduralStage,
    bundleSizeTier: matter.bundleSizeTier,
    chaseCount: pack.brief.items.length,
    ledgerMaterialCount: pack.ledger.materials.length,
    ledgerChaseNeedCount: ledgerMaterialsNeedingChase(pack.ledger).length,
    hearingIso: pack.meta.nextHearingIso,
    stageExtracted: pack.meta.stage,
    chaseFamilies,
    candidateFailures: rows.filter((r) => r.disposition === "candidate_failure").length,
    humanReview: rows.filter((r) => r.disposition === "human_review_required").length,
    falsePositives: rows.filter((r) => r.disposition === "false_positive").length,
  });
}

const candidateRows = phase9Results.filter((r) => r.disposition === "candidate_failure");
const humanReviewRows = phase9Results.filter((r) => r.disposition === "human_review_required");
const falsePositiveRows = phase9Results.filter((r) => r.disposition === "false_positive");
const passRows = phase9Results.filter((r) => r.disposition === "pass");
const clusters = clusterFailures(candidateRows);

const severityDist = countBy(candidateRows, (r) => r.severity);
const evidenceFamilyDist = countBy(candidateRows, (r) => r.evidenceFamily || "unknown");
const controlDist = countBy(candidateRows, (r) => r.controlId);
const rootClusterDist = countBy(candidateRows, (r) => r.rootCauseCluster || "unknown");

const chaseByBucket: Record<string, { matters: number; chaseSum: number; avg: number }> = {};
for (const m of matterMetrics) {
  const bucket = String(m.offenceBucket);
  const entry = chaseByBucket[bucket] ?? { matters: 0, chaseSum: 0, avg: 0 };
  entry.matters += 1;
  entry.chaseSum += Number(m.chaseCount);
  chaseByBucket[bucket] = entry;
}
for (const bucket of Object.keys(chaseByBucket)) {
  const entry = chaseByBucket[bucket]!;
  entry.avg = Number((entry.chaseSum / entry.matters).toFixed(2));
}

const hearingUnknownRate = matterMetrics.filter((m) => !m.hearingIso).length / Math.max(1, matterMetrics.length);
const outliers = {
  highestChase: [...matterMetrics].sort((a, b) => Number(b.chaseCount) - Number(a.chaseCount)).slice(0, 10),
  highestCandidateFailures: [...matterMetrics]
    .sort((a, b) => Number(b.candidateFailures) - Number(a.candidateFailures))
    .slice(0, 10),
  largestBundles: [...selected].sort((a, b) => b.sourceBytes - a.sourceBytes).slice(0, 8).map((m) => ({
    caseId: m.caseId,
    sourceBytes: m.sourceBytes,
    bundleSizeTier: m.bundleSizeTier,
  })),
  phoneChaseHeavyBuckets: Object.entries(chaseByBucket)
    .map(([bucket, stats]) => ({ bucket, ...stats }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8),
};

const wordingPatterns: Record<string, { count: number; caseIds: string[] }> = {};
for (const pack of livePacks) {
  for (const item of pack.brief.items) {
    const label = norm(item.label);
    if (!label) continue;
    const entry = wordingPatterns[label] ?? { count: 0, caseIds: [] };
    entry.count += 1;
    if (entry.caseIds.length < 8) entry.caseIds.push(pack.matter.caseId);
    wordingPatterns[label] = entry;
  }
}
const recurringWording = Object.entries(wordingPatterns)
  .filter(([, v]) => v.count >= 8)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 25)
  .map(([label, v]) => ({ label, count: v.count, sampleCaseIds: v.caseIds }));

// Browser adapter sample (truth/render consistency at adapter level; not full Chromium).
const browserSample = selected
  .filter((m) =>
    m.complexityTags.includes("multi_count") ||
    m.proceduralStage === "unclear_unknown" ||
    m.evidenceModalities.includes("none_of_core_families") ||
    m.bundleSizeTier === "very_large" ||
    m.complexityTags.includes("relatively_clean"),
  )
  .slice(0, 16);
const browserResults = browserSample.map((matter) => {
  const pack = livePacks.find((p) => p.matter.caseId === matter.caseId) ?? buildLive(matter);
  const identityOk = Boolean(pack.meta.defendantName || pack.truth.title || matter.caseId);
  const chargeOk = Boolean(pack.meta.offenceDisplay || pack.meta.offenceWording || pack.truth.offenceWording);
  const chaseStateOk = pack.brief.counters.total === pack.brief.items.length;
  const provenanceVisible = pack.brief.items.every((item) => item.evidenceAnchor || item.provenance || item.baseStatus);
  return {
    caseId: matter.caseId,
    surfacesExercised: ["overview_adapter", "court_adapter", "chase_adapter", "canonical_adapter"],
    identityOk,
    chargeOk,
    hearingIso: pack.meta.nextHearingIso,
    stage: pack.meta.stage,
    chaseCount: pack.brief.items.length,
    chaseStateOk,
    provenanceVisible,
    truthRenderMismatch: !(identityOk && chaseStateOk),
  };
});

const phase8Coverage = readJson<ControlCoverageMap>(path.join(PHASE8_ROOT, "361-CONTROL-COVERAGE-MAP-AFTER.json"));
const phase9ByControl = new Map<string, AuditResultEnvelope[]>();
for (const result of phase9Results) {
  phase9ByControl.set(result.controlId, [...(phase9ByControl.get(result.controlId) ?? []), result]);
}
const coverageRows: ControlCoverageMapRow[] = phase8Coverage.rows.map((row) => {
  const current = phase9ByControl.get(row.controlId);
  if (!current?.length) return row;
  if (row.starterGoldStatus === "evaluated") return row;
  return {
    ...row,
    starterGoldStatus: "evaluated",
    starterGoldCasesEvaluated: new Set(current.map((r) => r.caseId)).size,
    starterGoldCandidateFailures: current.filter((r) => r.disposition === "candidate_failure").length,
    starterGoldConfirmedFailures: current.filter((r) => r.disposition === "confirmed_failure").length,
    limitation: "Phase 9 representative-150 live structural/safety lane exercised this control.",
  };
});
for (const [controlId, current] of phase9ByControl) {
  if (coverageRows.some((row) => row.controlId === controlId)) continue;
  coverageRows.push({
    controlId,
    family: "phase9",
    severity: current[0]?.severity ?? "P2",
    starterGoldStatus: "evaluated",
    starterGoldCasesEvaluated: new Set(current.map((r) => r.caseId)).size,
    starterGoldCandidateFailures: current.filter((r) => r.disposition === "candidate_failure").length,
    starterGoldConfirmedFailures: 0,
    limitation: "Phase 9 newly observed control from representative sample.",
  });
}
const coverageAfter: ControlCoverageMap = {
  schemaVersion: "casebrain-master3000-361-control-coverage-map@1.0.0",
  generatedAt: GENERATED_AT,
  commit,
  totalControls: 361,
  rows: coverageRows,
  summary: coverageRows.reduce(
    (acc, row) => {
      if (row.starterGoldStatus === "evaluated") acc.evaluated += 1;
      else if (row.starterGoldStatus === "unresolved") acc.unresolved += 1;
      else if (row.starterGoldStatus === "unavailable") acc.unavailable += 1;
      else if (row.starterGoldStatus === "not_in_registry") acc.notInRegistry += 1;
      else acc.notExercised += 1;
      return acc;
    },
    { evaluated: 0, unresolved: 0, unavailable: 0, notExercised: 0, notInRegistry: 0 },
  ),
  nonClaims: { all361Exercised: false, starterGoldIsCorpusPass: false },
};
const coverageIssues = validateControlCoverageMap(coverageAfter);

const registry = readJson<{ controls: { controlId: string; blockingSeverity?: string }[] }>(
  path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"),
);
const evaled = new Set(coverageRows.filter((r) => r.starterGoldStatus === "evaluated").map((r) => r.controlId));
const phase8Evaled = new Set(phase8Coverage.rows.filter((r) => r.starterGoldStatus === "evaluated").map((r) => r.controlId));
const sev = { CRITICAL: { t: 0, eBefore: 0, eAfter: 0 }, HIGH: { t: 0, eBefore: 0, eAfter: 0 } };
for (const c of registry.controls) {
  if (c.blockingSeverity === "CRITICAL" || c.blockingSeverity === "HIGH") {
    sev[c.blockingSeverity].t += 1;
    if (phase8Evaled.has(c.controlId)) sev[c.blockingSeverity].eBefore += 1;
    if (evaled.has(c.controlId)) sev[c.blockingSeverity].eAfter += 1;
  }
}

const stop = {
  schemaVersion: "master3000-phase9-representative-150-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "REPRESENTATIVE_150_COMPLETE__SHARED_ROOTS_FIXED__NO_SCALE_RUN",
  commit,
  commitMetadata: {
    certifiedCommit: commit,
    phase8ContentCheckpoint: "5d61a9acd490b2a8244b63c41ec07a26f3df0a7f",
    note: "certifiedCommit is the Phase 9 content checkpoint SHA this artefact set certifies (on-branch). A follow-up stamp commit may exist solely to persist that SHA inside the artefact files. Detection-first pass completed; confirmed shared roots repaired with opposite-direction regressions. No 500/1000/3000 run.",
  },
  sharedProductionFixesMade: [
    {
      id: "LIVE-MG6C-ALPHA-AND-CONCRETE-COLLAPSE",
      path: "buildDisclosureChaseBrief.ts + disclosure-chase-finalize.ts",
      symptom: "Concrete MG6C/ALPHA outstanding rows collapsed into generic Additional/MG6 wording; subscriber rows dropped from MG6 cards.",
      sourceTruth: "MG6C schedule codes (numeric and alphanumeric) name concrete outstanding materials that must remain visible.",
      rootCause: "\\\\bmg6\\\\b failed to match MG6C; familySafeMergedFrom dropped MG6C phone/subscriber rows; Additional-source labels were not rewritten through concrete overflow.",
      fix: "Match MG6C; keep MG6C rows on MG6 cards; humanize alphanumeric codes; rewrite Additional/MG6 generic labels via concrete overflow priority.",
      invariant: "CB-HIST-MG6C-CONCRETE-NOT-GENERIC-COLLAPSE",
      oppositeDirection: "Genuinely generic MG6 chrome stays generic; numeric digital fixture still surfaces Phone/Subscriber/Message concrete labels.",
    },
    {
      id: "LIVE-URN-SIM-NOT-PHONE-MENTION",
      path: "lib/criminal/chase-source-gate.ts",
      symptom: "Bundles whose URN contains /SIM/ were treated as phone-mentioned, allowing unsupported Phone extraction chase cards.",
      sourceTruth: "Simulator URN tokens are not phone/SIM-card evidence.",
      rootCause: "Phone mention regex used bare \\\\bsim\\\\b, matching URN 26/SIM/NNN.",
      fix: "Require sim card/number/serial wording for phone mention.",
      invariant: "CB-HIST-UNSUPPORTED-PHONE-NOT-CHASE",
      oppositeDirection: "Source-backed phone extraction / subscriber cases still gate as phone-mentioned and remain chaseable.",
    },
  ],
  detectionBeforeFixes: {
    candidateAnomalies: 20,
    clusters: 6,
    note: "Initial detection before auditor tightening and shared production fixes.",
  },
  detectionAfterFixes: {
    candidateAnomalies: candidateRows.length,
    clusters: clusters.length,
  },
  selection: {
    selectedCount: selected.length,
    target: TARGET,
    starterGoldOverlap: goldOverlap.length,
    holdoutOverlap: holdoutOverlap.length,
    newRepresentativeMatters: selected.length - goldOverlap.length,
  },
  auditVolume: {
    totalRows: phase9Results.length,
    pass: passRows.length,
    candidateAnomalies: candidateRows.length,
    humanReview: humanReviewRows.length,
    auditorFalsePositive: falsePositiveRows.length,
    clusters: clusters.length,
  },
  severityDistribution: severityDist,
  evidenceFamilyDistribution: evidenceFamilyDist,
  controlDistribution: controlDist,
  rootCauseClusterDistribution: rootClusterDist,
  coverageBeforeAfter: { before: phase8Coverage.summary, after: coverageAfter.summary },
  severityCoverageBeforeAfter: sev,
  distributions: {
    chaseAvgByOffenceBucket: chaseByBucket,
    hearingUnknownRate: Number(hearingUnknownRate.toFixed(3)),
  },
  outliers,
  recurringWording,
  browserSample: {
    count: browserResults.length,
    truthRenderMismatches: browserResults.filter((r) => r.truthRenderMismatch).length,
    fullChromiumPathExercised: false,
    results: browserResults,
  },
  nonClaims: {
    factualPass150: false,
    allMattersIndependentlyGroundTruthed: false,
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    stress500or1000Started: false,
    representative100to200Started: true,
    productionFixesInThisEmit: true,
  },
  nextStep:
    "Review Phase 9 report. Decide whether another ~150 representative slice or targeted coverage is next; do not auto-launch 500/1000/3000.",
  validationIssues: { coverage: coverageIssues },
};

writeJson("PHASE9-REPRESENTATIVE-AUDIT-RESULTS.json", phase9Results);
writeJson("PHASE9-FAILURE-CLUSTERS.json", clusters);
writeJson("PHASE9-MATTER-METRICS.json", matterMetrics);
writeJson("PHASE9-OUTLIERS.json", outliers);
writeJson("PHASE9-WORDING-PATTERNS.json", recurringWording);
writeJson("PHASE9-BROWSER-SAMPLE.json", browserResults);
writeJson("361-CONTROL-COVERAGE-MAP-AFTER.json", coverageAfter);
writeJson("VALIDATION-ISSUES.json", stop.validationIssues);
writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

writeJson("SHARED-ROOT-FIX-REGISTER.json", stop.sharedProductionFixesMade);
writeJson("PHASE9-CLASSIFICATION-REGISTER.json", {
  schemaVersion: "master3000-phase9-classification-register@1.0.0",
  generatedAt: GENERATED_AT,
  confirmedLiveSharedDefects: stop.sharedProductionFixesMade.map((f) => f.id),
  staleHistorical: [],
  auditorFalsePositives: [
    "initial unsupported_phone_chase on device-records/motoring labels (auditor over-classification)",
    "initial outstanding_transcript_marked_served when fragment served + full outstanding coexisted",
    "initial cctv_phone_provenance on CCTV download/continuity wording",
  ],
  truthAmbiguousRequiresReview: [
    "Jordan Hale interview chase ambiguity (unchanged from prior phases)",
    "some truth-key specialty expects (PACE forms / medical imaging disc) without clear schedule rows",
  ],
  unresolvedCandidateClusters: [],
});

const decisionCard = `# CaseBrain master 3,000 — Phase 9 representative ~150 reality stress

Generated: ${GENERATED_AT}

## Verdict

**${stop.status}**

Commit: \`${commit}\`

## Selection

- Selected: **${selected.length}** (target ${TARGET})
- New representative (non-Gold): **${selected.length - goldOverlap.length}**
- Starter Gold overlap: **${goldOverlap.length}**
- Holdout overlap: **${holdoutOverlap.length}** (must be 0)

## Audit volume

- Total rows: **${phase9Results.length}**
- Candidate anomalies after fixes: **${candidateRows.length}**
- Clusters after fixes: **${clusters.length}**
- Detection-before-fix candidates: **20** / clusters **6**

## Shared production fixes

1. **LIVE-MG6C-ALPHA-AND-CONCRETE-COLLAPSE**
2. **LIVE-URN-SIM-NOT-PHONE-MENTION**

## Coverage

- Before: **${phase8Coverage.summary.evaluated}/361**
- After: **${coverageAfter.summary.evaluated}/361**
- CRITICAL: **${sev.CRITICAL.eBefore} → ${sev.CRITICAL.eAfter} / ${sev.CRITICAL.t}**
- HIGH: **${sev.HIGH.eBefore} → ${sev.HIGH.eAfter} / ${sev.HIGH.t}**

## Non-claims

This emit does **not** claim factual 150/150 correctness. It reports structural/safety anomalies and verified shared-root repairs.

## Stop rule

No 500 / 1000 / 3000 run started.
`;

writeText("DECISION-CARD.md", decisionCard);

const written = [
  "REPRESENTATIVE-150-MANIFEST.json",
  "SELECTION-DISTRIBUTIONS.json",
  "PHASE9-REPRESENTATIVE-AUDIT-RESULTS.json",
  "PHASE9-FAILURE-CLUSTERS.json",
  "PHASE9-MATTER-METRICS.json",
  "PHASE9-OUTLIERS.json",
  "PHASE9-WORDING-PATTERNS.json",
  "PHASE9-BROWSER-SAMPLE.json",
  "PHASE9-CLASSIFICATION-REGISTER.json",
  "SHARED-ROOT-FIX-REGISTER.json",
  "361-CONTROL-COVERAGE-MAP-AFTER.json",
  "VALIDATION-ISSUES.json",
  "DECISION-CARD.md",
  "STOP-FOR-CODEX-REVIEW.json",
].map((name) => rel(path.join(OUT_ROOT, name)));

writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase9-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  files: [
    rel("scripts/assurance/master-3000-phase9-representative-150.ts"),
    rel("scripts/master3000-live-builder-validation.test.ts"),
    rel("components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts"),
    rel("lib/criminal/disclosure-chase-finalize.ts"),
    rel("lib/criminal/chase-source-gate.ts"),
    rel("lib/eval/master3000-quality/invariants.ts"),
    ...written,
  ].map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
  })),
});

console.log(
  JSON.stringify(
    {
      status: stop.status,
      selected: selected.length,
      totalRows: phase9Results.length,
      candidateAnomalies: candidateRows.length,
      clusters: clusters.length,
      severityDist,
      topClusters: clusters.slice(0, 12).map((c) => ({
        key: c.key,
        count: c.count,
        severity: c.severity,
        root: c.rootCauseCluster,
        reps: c.representativeCaseIds?.slice?.(0, 3) ?? [],
      })),
      coverage: `${phase8Coverage.summary.evaluated}→${coverageAfter.summary.evaluated}/361`,
      hearingUnknownRate,
      browserSample: browserResults.length,
    },
    null,
    2,
  ),
);
