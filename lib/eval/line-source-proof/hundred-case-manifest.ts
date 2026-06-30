/**
 * 100-case controlled proof-ledger pack — 30 curated + 70 diversity-selected sim/gold cases.
 */
import fs from "node:fs";
import path from "node:path";

import type { PackCaseSpec } from "./build-pack-summary";
import { THIRTY_CASE_MANIFEST } from "./thirty-case-manifest";

const CASE_ROOT = "artifacts/evidence-state-audit-local/cases";

/** Excluded from 100-pack — duplicate truth-key of cb-found-2007-morrison */
export const DUPLICATE_COVERAGE_EXCLUDED = new Set(["cb-found-2001-ellis"]);

const GOLD_AND_PILOT_EXTRA: PackCaseSpec[] = [
  { id: "generic-provisional-sam-okonkwo", shape: "Generic provisional", category: "generic_provisional", dir: `${CASE_ROOT}/generic-provisional-sam-okonkwo` },
  // cb-found-2001-ellis excluded — duplicate truth-key of cb-found-2007-morrison (see closeout report)
  { id: "sc-00008", shape: "Structured corpus", category: "robbery_id", dir: `${CASE_ROOT}/sc-00008` },
  { id: "cb-found-2002-smith", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2002-smith` },
  { id: "cb-found-2003-nguyen", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2003-nguyen` },
  { id: "cb-found-2004-clarke", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2004-clarke` },
  { id: "cb-found-2005-okafor", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2005-okafor` },
  { id: "cb-found-2006-carter", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2006-carter` },
  { id: "cb-found-2007-morrison", shape: "Found corpus", category: "found_corpus", dir: `${CASE_ROOT}/cb-found-2007-morrison` },
];

function profileToCategory(profile: string | undefined, offenceFamily?: string): string {
  const p = (profile ?? "").toLowerCase();
  const o = (offenceFamily ?? "").toLowerCase();
  if (/bwv|custody|pace/.test(p)) return "bwv_custody_pace";
  if (/phone|screenshot|attribution|subscriber|extraction|ufed/.test(p)) return "phone_attribution";
  if (/encro|handle|co-?def/.test(p)) return "encro_handle_codef";
  if (/cctv|stills|master/.test(p)) return "cctv_stills_master";
  if (/abe|historic|sexual|first account/.test(p)) return "historic_sexual_abe";
  if (/county|exploit|vulnerab|youth/.test(p)) return "county_lines_exploitation";
  if (/drug|pwits|conspiracy/.test(p)) return "drugs_conspiracy_multidef";
  if (/assault|gbh|s18|participation/.test(p)) return "multi_handed_assault";
  if (/domestic|harass|breach/.test(p)) return "domestic_harassment";
  if (/fraud|bank|account/.test(p)) return "fraud_banking";
  if (/motoring|sjp|device/.test(p)) return "motoring_sjp";
  if (/ocr|rotat|duplicate|index|messy|layout|out.of.order/.test(p)) return "messy_index_layout";
  if (/mg6|schedule|charge/.test(p)) return "mg6_schedule_trap";
  if (o.includes("robbery")) return "robbery_id";
  if (o.includes("youth")) return "youth_vulnerability";
  return profile ? profile.slice(0, 32) : "sim_controlled";
}

function readTruthMeta(caseDir: string): { profile?: string; offenceFamily?: string; title?: string } {
  const truthPath = path.join(caseDir, "truth-key.json");
  if (!fs.existsSync(truthPath)) return {};
  try {
    const t = JSON.parse(fs.readFileSync(truthPath, "utf8")) as {
      profile?: string;
      offenceFamily?: string;
      title?: string;
    };
    return { profile: t.profile, offenceFamily: t.offenceFamily, title: t.title };
  } catch {
    return {};
  }
}

function listSelectableCases(): PackCaseSpec[] {
  const root = path.join(process.cwd(), CASE_ROOT);
  const out: PackCaseSpec[] = [];
  for (const id of fs.readdirSync(root)) {
    if (id === "cb-fresh-002-jordan-hale-pdf-proof") continue;
    if (DUPLICATE_COVERAGE_EXCLUDED.has(id)) continue;
    const caseDir = path.join(root, id);
    if (!fs.existsSync(path.join(caseDir, "bundle-text.md"))) continue;
    const meta = readTruthMeta(caseDir);
    const category = profileToCategory(meta.profile, meta.offenceFamily);
    out.push({
      id,
      shape: meta.title ?? meta.profile ?? id,
      category,
      dir: `${CASE_ROOT}/${id}`,
    });
  }
  return out;
}

/** Build 100-case manifest: 30 curated + gold/pilot extras + profile-diverse sim fill. */
export function buildHundredCaseManifest(): PackCaseSpec[] {
  const thirtyIds = new Set(THIRTY_CASE_MANIFEST.map((c) => c.id));
  const picked = new Map<string, PackCaseSpec>();

  for (const c of THIRTY_CASE_MANIFEST) picked.set(c.id, c);
  for (const c of GOLD_AND_PILOT_EXTRA) {
    if (!thirtyIds.has(c.id)) picked.set(c.id, c);
  }

  const candidates = listSelectableCases().filter((c) => !picked.has(c.id));
  const byProfile: Record<string, PackCaseSpec[]> = {};
  for (const c of candidates) {
    const key = c.category;
    byProfile[key] = byProfile[key] ?? [];
    byProfile[key].push(c);
  }

  const profileKeys = Object.keys(byProfile).sort();
  let round = 0;
  while (picked.size < 100 && round < 500) {
    for (const key of profileKeys) {
      const pool = byProfile[key];
      if (!pool?.length) continue;
      const next = pool.shift();
      if (next && !picked.has(next.id)) picked.set(next.id, next);
      if (picked.size >= 100) break;
    }
    round += 1;
  }

  // Stable order: thirty first, then rest alpha
  const thirty = THIRTY_CASE_MANIFEST.map((c) => picked.get(c.id)!);
  const rest = [...picked.values()]
    .filter((c) => !thirtyIds.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  return [...thirty, ...rest].slice(0, 100);
}

export const HUNDRED_CASE_MANIFEST: PackCaseSpec[] = buildHundredCaseManifest();
