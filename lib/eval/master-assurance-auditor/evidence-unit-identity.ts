/**
 * Evidence-unit identity — distinct siblings must not collapse.
 *
 * custody extract ≠ full custody record
 * draft MG11 ≠ final signed MG11
 * recording ≠ transcript
 * clip/still ≠ master
 * extract/summary ≠ full download
 */

import {
  evidenceMaySatisfyRequest,
  inferEvidenceModality,
  type EvidenceStateRow,
} from "@/lib/criminal/evidence-state-reconcile";

export type UnitDiscriminator =
  | "extract_vs_full"
  | "draft_vs_signed"
  | "recording_vs_transcript"
  | "clip_vs_master"
  | "summary_vs_download";

function hasExtract(label: string): boolean {
  return /\bextract\b|\bexcerpt\b|\bsnapshot\b/i.test(label);
}
function hasFull(label: string): boolean {
  return /\bfull\b|\bcomplete\b|\bentire\b/i.test(label);
}
function hasDraft(label: string): boolean {
  return /\bdraft\b|\bunsigned\b/i.test(label);
}
function hasSigned(label: string): boolean {
  return /\bsigned\b|\bfinal\b/i.test(label);
}
function hasRecording(label: string): boolean {
  return /\brecording\b|\baudio\b/i.test(label) && !/\btranscript\b/i.test(label);
}
function hasTranscript(label: string): boolean {
  return /\btranscript\b/i.test(label);
}
function hasClip(label: string): boolean {
  return /\bclips?\b|\bstills?\b|\bscreenshots?\b/i.test(label);
}
function hasMaster(label: string): boolean {
  return /\bmaster\b/i.test(label);
}
function hasSummary(label: string): boolean {
  return /\bsummary\b|\bextraction summary\b/i.test(label);
}
function hasDownload(label: string): boolean {
  return /\bdownload\b|\bfull (?:phone |message )?export\b/i.test(label);
}

export function discriminatorsSeparating(a: string, b: string): UnitDiscriminator[] {
  const out: UnitDiscriminator[] = [];
  if ((hasExtract(a) && hasFull(b)) || (hasFull(a) && hasExtract(b))) out.push("extract_vs_full");
  if ((hasDraft(a) && hasSigned(b)) || (hasSigned(a) && hasDraft(b))) out.push("draft_vs_signed");
  if ((hasRecording(a) && hasTranscript(b)) || (hasTranscript(a) && hasRecording(b))) {
    out.push("recording_vs_transcript");
  }
  if ((hasClip(a) && hasMaster(b)) || (hasMaster(a) && hasClip(b))) out.push("clip_vs_master");
  if ((hasSummary(a) && hasDownload(b)) || (hasDownload(a) && hasSummary(b))) {
    out.push("summary_vs_download");
  }
  return out;
}

export function evidenceUnitsAreDistinct(a: string, b: string): boolean {
  return discriminatorsSeparating(a, b).length > 0;
}

/**
 * True when chase label and truth-map row refer to the same unit under
 * canonical identity / relationship rules — not broad token overlap.
 */
export function sameEvidenceUnitIdentity(chaseLabel: string, rowLabel: string): boolean {
  if (evidenceUnitsAreDistinct(chaseLabel, rowLabel)) return false;
  const row: EvidenceStateRow = {
    label: rowLabel,
    state: "served",
    modality: inferEvidenceModality(rowLabel),
  };
  const { match, basis } = evidenceMaySatisfyRequest(chaseLabel, row);
  if (!match) return false;
  // Same-modality alone is insufficient when labels are only loosely related
  // (e.g. two different custody documents). Prefer exact/alias.
  if (basis === "exact_or_alias") return true;
  if (basis === "same_modality") {
    // Require substantial token overlap beyond modality family words.
    const stop = new Set([
      "record",
      "records",
      "material",
      "evidence",
      "document",
      "file",
      "copy",
      "full",
      "final",
    ]);
    const tokens = (s: string) =>
      s
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4 && !stop.has(t));
    const a = new Set(tokens(chaseLabel));
    const b = tokens(rowLabel);
    const overlap = b.filter((t) => a.has(t)).length;
    return overlap >= 2;
  }
  return false;
}

export function servedRowSatisfiesChase(input: {
  chaseLabel: string;
  servedRows: Array<{ label: string; existence: string }>;
}): { satisfied: boolean; byLabel: string | null; reason: string | null } {
  for (const row of input.servedRows) {
    if (row.existence !== "served") continue;
    if (evidenceUnitsAreDistinct(input.chaseLabel, row.label)) continue;
    if (!sameEvidenceUnitIdentity(input.chaseLabel, row.label)) continue;
    return {
      satisfied: true,
      byLabel: row.label,
      reason: `chase "${input.chaseLabel}" collides with served unit "${row.label}"`,
    };
  }
  return { satisfied: false, byLabel: null, reason: null };
}
