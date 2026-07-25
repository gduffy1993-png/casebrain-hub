/**
 * Reclassify immutable run-v1 findings with surface-aware profiles into run-v2 map.
 * Does not modify run-v1. Run: npx tsx scripts/integrity-programme/scale3000-reclassify-v1-findings.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  assessSolicitorVisibleBoundaryForSurface,
  resolveSolicitorBoundaryProfile,
} from "@/lib/criminal/solicitor-visible-boundary-profiles";
import { normaliseSolicitorTemplate, sha256Hex } from "@/lib/criminal/solicitor-visible-materialise";

const ROOT = path.resolve(__dirname, "../..");
const V1 = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v1");
const V2 = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v2");

type Disp =
  | "confirmed_defect"
  | "detector_false_positive"
  | "needs_human_review"
  | "duplicate_occurrence_of_shared_string"
  | "unresolved";

function fileHash(abs: string): string | null {
  if (!fs.existsSync(abs)) return null;
  return createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

const findings = fs
  .readFileSync(path.join(V1, "findings.jsonl"), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as {
    findingId: string;
    code: string;
    caseId: string;
    surfaceId: string;
    textHash: string;
    evidenceRef: string;
  });
const stringIndex = JSON.parse(fs.readFileSync(path.join(V1, "string-index.json"), "utf8")) as Record<
  string,
  { text: string; templateHash?: string }
>;

const byDisposition: Record<string, number> = {};
const bySurfaceProfile: Record<string, number> = {};
const primaryByHash = new Map<string, string>();
const rows: Array<Record<string, unknown>> = [];
const cases = new Set<string>();
const uniqueExact = new Set<string>();
const templates = new Set<string>();

for (const f of findings) {
  cases.add(f.caseId);
  const profile = resolveSolicitorBoundaryProfile(f.surfaceId);
  bySurfaceProfile[profile] = (bySurfaceProfile[profile] || 0) + 1;
  const text = stringIndex[f.textHash]?.text ?? null;
  const templateHash = text ? sha256Hex(normaliseSolicitorTemplate(text)) : null;
  if (text) uniqueExact.add(f.textHash);
  if (templateHash) templates.add(templateHash);

  let disposition: Disp = "unresolved";
  let reason = "text_not_found";
  if (text != null) {
    const primaryId = primaryByHash.get(f.textHash);
    if (primaryId && primaryId !== f.findingId) {
      disposition = "duplicate_occurrence_of_shared_string";
      reason = `shared_string_primary=${primaryId}; original_code=${f.code}`;
    } else {
      if (!primaryId) primaryByHash.set(f.textHash, f.findingId);
      const reassessment = assessSolicitorVisibleBoundaryForSurface(text, f.surfaceId);
      if (reassessment.ok) {
        disposition = "detector_false_positive";
        reason = `surface_grammar=${reassessment.profile}; punctuation_heuristic_not_applicable`;
      } else {
        const codeBare = f.code.replace(/^boundary_/, "");
        if (reassessment.issues.includes(codeBare as (typeof reassessment.issues)[number])) {
          disposition = "confirmed_defect";
          reason = `profile=${reassessment.profile}; issues=${reassessment.issues.join(",")}`;
        } else {
          disposition = "needs_human_review";
          reason = `profile=${reassessment.profile}; original=${f.code}; now=${reassessment.issues.join(",")}`;
        }
      }
    }
  }
  byDisposition[disposition] = (byDisposition[disposition] || 0) + 1;
  rows.push({
    findingId: f.findingId,
    v1Code: f.code,
    caseId: f.caseId,
    surfaceId: f.surfaceId,
    textHash: f.textHash,
    templateHash,
    surfaceProfile: profile,
    disposition,
    reason,
    evidenceRef: f.evidenceRef,
  });
}

fs.writeFileSync(path.join(V2, "v1-finding-disposition-map.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

const uniqueRollup: Record<string, number> = {};
for (const r of rows) {
  if (r.disposition === "duplicate_occurrence_of_shared_string") continue;
  // first primary wins (already ordered)
}
const seenHash = new Set<string>();
for (const r of rows) {
  if (r.disposition === "duplicate_occurrence_of_shared_string") continue;
  const h = String(r.textHash);
  if (seenHash.has(h)) continue;
  seenHash.add(h);
  const d = String(r.disposition);
  uniqueRollup[d] = (uniqueRollup[d] || 0) + 1;
}

const summary = {
  v1FindingCount: findings.length,
  dispositionOccurrenceCounts: byDisposition,
  uniqueExactStringCount: uniqueExact.size,
  normalisedTemplateCount: templates.size,
  occurrenceCount: findings.length,
  affectedCaseCount: cases.size,
  occurrenceCountsBySurfaceProfile: bySurfaceProfile,
  uniqueExactDispositionRollup: uniqueRollup,
  note: "Counts are reported separately by unit — never combined. dispositionOccurrenceCounts sum to v1FindingCount.",
};
fs.writeFileSync(path.join(V2, "v1-finding-disposition-summary.json"), JSON.stringify(summary, null, 2) + "\n");

const findingsPath = path.join(V2, "findings.jsonl");
if (!fs.existsSync(findingsPath)) fs.writeFileSync(findingsPath, "", "utf8");

const hashesPath = path.join(V2, "hashes.json");
const hashes = JSON.parse(fs.readFileSync(hashesPath, "utf8")) as Record<string, string | null>;
hashes.findings = fileHash(findingsPath);
hashes.v1FindingDispositionMap = fileHash(path.join(V2, "v1-finding-disposition-map.jsonl"));
fs.writeFileSync(hashesPath, JSON.stringify(hashes, null, 2) + "\n");

console.log(JSON.stringify({ ok: true, summary, findingsHash: hashes.findings }, null, 2));
