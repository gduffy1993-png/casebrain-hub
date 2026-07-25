/**
 * run-v3 → run-v4 disposition evidence for Codex blockers A–E.
 * Compares string indexes / surfaces; does not mutate either run.
 *
 *   npx tsx scripts/integrity-programme/scale3000-run-v4-disposition.ts
 */
import fs from "node:fs";
import path from "node:path";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import { assessOffenceLabelWording } from "@/lib/criminal/offence-label-registry";

const ROOT = path.resolve(__dirname, "../..");
const BASE = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation",
);

type StringEntry = { textHash: string; text: string; count: number; templateHash?: string };
type SurfaceRow = {
  caseId: string;
  surfaceId: string;
  text: string;
  textHash: string;
  canCopy: boolean;
  blockedNotRepaired?: boolean;
  gateStatus?: string;
};

function loadStringIndex(run: string): StringEntry[] {
  const p = path.join(BASE, run, "string-index.json");
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { strings?: StringEntry[] } | StringEntry[];
  return Array.isArray(raw) ? raw : (raw.strings ?? []);
}

function* readJsonl<T>(file: string): Generator<T> {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as T;
  }
}

function countAbsoluteCopyable(run: string): {
  copyableOccurrences: number;
  uniqueStrings: number;
  examples: Array<{ textHash: string; count: number; preview: string }>;
} {
  const strings = loadStringIndex(run);
  let copyableOccurrences = 0;
  const examples: Array<{ textHash: string; count: number; preview: string }> = [];
  // Prefer surfaces.jsonl for canCopy truth
  const surfacesPath = path.join(BASE, run, "surfaces.jsonl");
  const hashCopyable = new Map<string, { canCopy: boolean; count: number; text: string }>();
  for (const s of readJsonl<SurfaceRow>(surfacesPath)) {
    const cur = hashCopyable.get(s.textHash) ?? { canCopy: false, count: 0, text: s.text };
    cur.count += 1;
    cur.canCopy = cur.canCopy || s.canCopy;
    cur.text = s.text;
    hashCopyable.set(s.textHash, cur);
  }
  for (const [textHash, info] of hashCopyable) {
    if (!containsAbsoluteProofWording(info.text)) continue;
    if (info.canCopy) {
      copyableOccurrences += info.count;
      if (examples.length < 8) {
        examples.push({ textHash, count: info.count, preview: info.text.slice(0, 160) });
      }
    }
  }
  // Fallback if surfaces missing: scan string index (conservative — count all)
  if (!fs.existsSync(surfacesPath)) {
    for (const s of strings) {
      if (containsAbsoluteProofWording(s.text)) {
        copyableOccurrences += s.count;
        examples.push({ textHash: s.textHash, count: s.count, preview: s.text.slice(0, 160) });
      }
    }
  }
  return {
    copyableOccurrences,
    uniqueStrings: [...hashCopyable.values()].filter((x) => containsAbsoluteProofWording(x.text) && x.canCopy)
      .length,
    examples,
  };
}

function citationConflicts(run: string): {
  copyableConflicts: number;
  blockedConflicts: number;
  byEntry: Record<string, number>;
  examples: Array<{ surfaceId: string; preview: string; entryIds: string[] }>;
} {
  const byEntry: Record<string, number> = {};
  let copyableConflicts = 0;
  let blockedConflicts = 0;
  const examples: Array<{ surfaceId: string; preview: string; entryIds: string[] }> = [];
  for (const s of readJsonl<SurfaceRow>(path.join(BASE, run, "surfaces.jsonl"))) {
    if (s.surfaceId !== "case_header" && s.surfaceId !== "source_context") continue;
    const a = assessOffenceLabelWording(s.text);
    if (!a.conflictsWithRegistry) continue;
    for (const id of a.matchedEntryIds) byEntry[id] = (byEntry[id] ?? 0) + 1;
    if (s.canCopy) {
      copyableConflicts += 1;
      if (examples.length < 10) {
        examples.push({ surfaceId: s.surfaceId, preview: s.text.slice(0, 180), entryIds: a.matchedEntryIds });
      }
    } else blockedConflicts += 1;
  }
  return { copyableConflicts, blockedConflicts, byEntry, examples };
}

function defencePlanAbsolute(run: string): { copyable: number; blocked: number } {
  let copyable = 0;
  let blocked = 0;
  for (const s of readJsonl<SurfaceRow>(path.join(BASE, run, "surfaces.jsonl"))) {
    if (s.surfaceId !== "defence_plan_safe_wording") continue;
    if (!containsAbsoluteProofWording(s.text) && !/fully proved/i.test(s.text)) continue;
    if (s.canCopy) copyable += 1;
    else blocked += 1;
  }
  return { copyable, blocked };
}

function main() {
  const v3Abs = countAbsoluteCopyable("run-v3");
  const v4Abs = countAbsoluteCopyable("run-v4");
  const v3Cite = citationConflicts("run-v3");
  const v4Cite = citationConflicts("run-v4");
  const v3Def = defencePlanAbsolute("run-v3");
  const v4Def = defencePlanAbsolute("run-v4");

  const report = {
    generatedAt: new Date().toISOString(),
    programmePassSupported: false,
    note: "Disposition evidence for Codex blockers — not programme PASS.",
    blockerB_absoluteProof: {
      runV3: v3Abs,
      runV4: v4Abs,
      disposition:
        v4Abs.copyableOccurrences === 0
          ? "fixed_zero_copyable_absolute_proof"
          : "REGRESSION_copyable_absolute_proof_remain",
      defencePlanSurface: { runV3: v3Def, runV4: v4Def },
    },
    blockerC_citationConflicts: {
      runV3: v3Cite,
      runV4: v4Cite,
      disposition:
        v4Cite.copyableConflicts === 0
          ? "fail_closed_on_registry_conflict"
          : "REGRESSION_copyable_unsafe_citations",
    },
    requiredEvidenceChecklist: {
      full3000RunV4: fs.existsSync(path.join(BASE, "run-v4", "RUN-MANIFEST.json")),
      zeroCopyableAbsoluteProof: v4Abs.copyableOccurrences === 0,
      citationRegistryFailClosed: v4Cite.copyableConflicts === 0,
    },
  };

  const out = path.join(BASE, "run-v4", "v3-to-v4-blocker-disposition.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

main();
