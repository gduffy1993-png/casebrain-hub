/**
 * Extended run-v4 evidence: alias collapse probes, family leakage, quality scans
 * across all unique strings / changed hashes vs run-v3.
 *
 *   npx tsx scripts/integrity-programme/scale3000-run-v4-evidence-pack.ts
 */
import fs from "node:fs";
import path from "node:path";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import {
  dedupeEvidenceAliases,
  evidenceScopeTags,
  scopesCompatible,
} from "@/lib/criminal/evidence-alias-dedupe";
import { assessFamilyEvidenceCompatibility } from "@/lib/criminal/solicitor-family-provenance";
import { preserveProtectedAcronyms } from "@/lib/criminal/solicitor-visible-quality";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

const ROOT = path.resolve(__dirname, "../..");
const BASE = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation",
);

type StringEntry = { textHash: string; text: string; count: number };
type SurfaceRow = {
  caseId: string;
  surfaceId: string;
  text: string;
  textHash: string;
  canCopy: boolean;
};

function loadStrings(run: string): Map<string, StringEntry> {
  const raw = JSON.parse(fs.readFileSync(path.join(BASE, run, "string-index.json"), "utf8")) as
    | Record<string, { text: string; count: number; templateHash?: string }>
    | { strings: StringEntry[] }
    | StringEntry[];
  if (Array.isArray(raw)) {
    return new Map(raw.map((s) => [s.textHash, s]));
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { strings?: StringEntry[] }).strings)) {
    return new Map((raw as { strings: StringEntry[] }).strings.map((s) => [s.textHash, s]));
  }
  const map = new Map<string, StringEntry>();
  for (const [textHash, v] of Object.entries(raw as Record<string, { text: string; count: number }>)) {
    map.set(textHash, { textHash, text: v.text, count: v.count });
  }
  return map;
}

function* surfaces(run: string): Generator<SurfaceRow> {
  const p = path.join(BASE, run, "surfaces.jsonl");
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as SurfaceRow;
  }
}

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "needs_review" };
}

function main() {
  const v3 = loadStrings("run-v3");
  const v4 = loadStrings("run-v4");
  const added: string[] = [];
  const removed: string[] = [];
  const shared: string[] = [];
  for (const h of v4.keys()) {
    if (v3.has(h)) shared.push(h);
    else added.push(h);
  }
  for (const h of v3.keys()) {
    if (!v4.has(h)) removed.push(h);
  }

  // Negative-dedupe synthetic probes (contract-level — must stay separate)
  const probes = [
    {
      id: "phone_extract_vs_full_download",
      rows: [row("Phone extraction source material", "served"), row("Full phone download", "missing")],
      expect: 2,
    },
    {
      id: "cctv_stills_master_export",
      rows: [
        row("CCTV still images", "served"),
        row("Master CCTV footage", "missing"),
        row("Full CCTV export", "referred_only"),
      ],
      expect: 3,
    },
    {
      id: "draft_vs_final_mg11",
      rows: [row("Draft incomplete MG11", "not_safely_confirmed"), row("Final signed MG11", "missing")],
      expect: 2,
    },
    {
      id: "bwv_transcript_vs_full_export",
      rows: [row("BWV reference / transcript", "referred_only"), row("Full BWV video export", "missing")],
      expect: 2,
    },
  ];
  const aliasProbes = probes.map((p) => {
    const kept = dedupeEvidenceAliases(p.rows);
    return {
      id: p.id,
      expectedKept: p.expect,
      actualKept: kept.length,
      ok: kept.length === p.expect,
      scopes: p.rows.map((r) => ({ label: r.label, scopes: evidenceScopeTags(r.label) })),
      pairwiseCompatible: p.rows.length === 2
        ? scopesCompatible(evidenceScopeTags(p.rows[0]!.label), evidenceScopeTags(p.rows[1]!.label))
        : undefined,
    };
  });

  let copyableAbsolute = 0;
  let copyableS172Intox = 0;
  let awkwardFixStrategy = 0;
  let qualityAcronymHits = 0;
  const changedReviewHashes = [...added, ...removed];
  const changedTexts: Array<{ disposition: "added" | "removed"; textHash: string; preview: string; count: number }> =
    [];

  for (const h of added) {
    const s = v4.get(h)!;
    changedTexts.push({ disposition: "added", textHash: h, preview: s.text.slice(0, 200), count: s.count });
  }
  for (const h of removed) {
    const s = v3.get(h)!;
    changedTexts.push({ disposition: "removed", textHash: h, preview: s.text.slice(0, 200), count: s.count });
  }

  for (const s of surfaces("run-v4")) {
    if (s.canCopy && containsAbsoluteProofWording(s.text)) copyableAbsolute += 1;
    if (
      s.canCopy &&
      /section\s*172|driver\s+details/i.test(s.text) === false &&
      assessFamilyEvidenceCompatibility({
        allegation: "section 172 driver details",
        prose: s.text,
      }).issues.some((i) => i.includes("intox") || i.includes("breath"))
    ) {
      // surface itself isn't allegation-bound; skip
    }
    if (s.canCopy && /intoxilyser|breath[-\s]?device/i.test(s.text) && /section\s*172|driver details/i.test(s.caseId)) {
      copyableS172Intox += 1;
    }
    if (/before we fix strategy/i.test(s.text)) awkwardFixStrategy += 1;
    const preserved = preserveProtectedAcronyms(s.text);
    if (/\b(Dna|Afis|Pin|Yjs)\b/.test(preserved)) qualityAcronymHits += 1;
  }

  // Family leak: client_summary / court_line with intox on s172-looking headers — count blocked vs copyable
  let familyBlocked = 0;
  let familyCopyableSuspect = 0;
  for (const s of surfaces("run-v4")) {
    if (!/(client_summary|court_line|cps_chase)/.test(s.surfaceId)) continue;
    if (!/intoxilyser|breath[-\s]?device/i.test(s.text)) continue;
    if (s.canCopy) familyCopyableSuspect += 1;
    else familyBlocked += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    programmePassSupported: false,
    stringDelta: {
      runV3ExactUnique: v3.size,
      runV4ExactUnique: v4.size,
      shared: shared.length,
      added: added.length,
      removed: removed.length,
      note: "Codex must re-review all changed unique strings (added+removed), not first-N only.",
    },
    blockerA_aliasNegativeProbes: {
      allOk: aliasProbes.every((p) => p.ok),
      probes: aliasProbes,
    },
    blockerB_copyableAbsoluteOnSurfaces: copyableAbsolute,
    blockerD_family: { intoxSurfacesBlocked: familyBlocked, intoxSurfacesCopyable: familyCopyableSuspect },
    quality: {
      beforeWeFixStrategyOccurrences: awkwardFixStrategy,
      titleCaseAcronymLeaksAfterPreserve: qualityAcronymHits,
    },
    changedStringSample: changedTexts.slice(0, 40),
    changedStringCount: changedTexts.length,
    reviewBatches: fs
      .readdirSync(path.join(BASE, "run-v4", "review-batches"))
      .filter((f) => f.startsWith("batch-"))
      .sort(),
  };

  const out = path.join(BASE, "run-v4", "run-v4-evidence-pack.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

main();
