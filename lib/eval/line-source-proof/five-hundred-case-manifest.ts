/**
 * 500-case controlled proof-ledger pack — all bundle-text audit cases (500 dirs).
 */
import { HUNDRED_CASE_MANIFEST } from "./hundred-case-manifest";
import { listBundleCases } from "./pack-case-manifest-shared";
import type { PackCaseSpec } from "./build-pack-summary";

/** All cases with bundle-text.md (500). Ellis included; flagged in duplicate coverage only. */
export function buildFiveHundredCaseManifest(): PackCaseSpec[] {
  const hundredIds = new Set(HUNDRED_CASE_MANIFEST.map((c) => c.id));
  const all = listBundleCases({ excludeDuplicates: false });
  const byId = new Map(all.map((c) => [c.id, c]));

  const ordered: PackCaseSpec[] = [];
  for (const c of HUNDRED_CASE_MANIFEST) {
    const spec = byId.get(c.id);
    if (spec) ordered.push(spec);
  }
  const rest = all
    .filter((c) => !hundredIds.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  return [...ordered, ...rest].slice(0, 500);
}

export const FIVE_HUNDRED_CASE_MANIFEST: PackCaseSpec[] = buildFiveHundredCaseManifest();
