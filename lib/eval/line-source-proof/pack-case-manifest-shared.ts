/**
 * Shared case manifest helpers for proof-ledger packs (100 / 500 scale).
 */
import fs from "node:fs";
import path from "node:path";

import type { PackCaseSpec } from "./build-pack-summary";

export const CASE_ROOT = "artifacts/evidence-state-audit-local/cases";

/** Excluded from unique-coverage counts — duplicate truth-key of cb-found-2007-morrison */
export const DUPLICATE_COVERAGE_EXCLUDED = new Set(["cb-found-2001-ellis"]);

export function profileToCategory(profile: string | undefined, offenceFamily?: string): string {
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

export function readTruthMeta(caseDir: string): {
  profile?: string;
  offenceFamily?: string;
  title?: string;
  trap?: string;
} {
  const truthPath = path.join(caseDir, "truth-key.json");
  if (!fs.existsSync(truthPath)) return {};
  try {
    const t = JSON.parse(fs.readFileSync(truthPath, "utf8")) as {
      profile?: string;
      offenceFamily?: string;
      title?: string;
      redTeamTrapType?: string;
    };
    return {
      profile: t.profile,
      offenceFamily: t.offenceFamily,
      title: t.title,
      trap: t.redTeamTrapType ?? t.profile,
    };
  } catch {
    return {};
  }
}

export function listBundleCases(options: { excludeDuplicates?: boolean } = {}): PackCaseSpec[] {
  const { excludeDuplicates = false } = options;
  const root = path.join(process.cwd(), CASE_ROOT);
  const out: PackCaseSpec[] = [];
  for (const id of fs.readdirSync(root).sort()) {
    if (excludeDuplicates && DUPLICATE_COVERAGE_EXCLUDED.has(id)) continue;
    const caseDir = path.join(root, id);
    if (!fs.statSync(caseDir).isDirectory()) continue;
    if (!fs.existsSync(path.join(caseDir, "bundle-text.md"))) continue;
    const meta = readTruthMeta(caseDir);
    out.push({
      id,
      shape: meta.title ?? meta.profile ?? id,
      category: profileToCategory(meta.profile, meta.offenceFamily),
      dir: `${CASE_ROOT}/${id}`,
    });
  }
  return out;
}
