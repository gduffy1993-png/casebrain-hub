import { extractBundleCaseMetadata, parseUkHearingDateTime, type ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { learnedFields, type ApprovedRule, type LearningField } from "./core";

export function metadataValue(metadata: ExtractedBundleCaseMetadata, field: LearningField): string | null {
  switch (field) {
    case "defendant": return metadata.defendantName;
    case "charge": return metadata.offenceWording;
    case "court": return metadata.court;
    case "hearing": return metadata.nextHearingRaw;
  }
}

/** Baseline extractor sees only source text. Approved rules fill missing fields only. */
export function extractMetadataWithLessons(text: string, rules: ApprovedRule[], originalMetadata?: ExtractedBundleCaseMetadata) {
  const baseline = originalMetadata ?? extractBundleCaseMetadata(text);
  const metadata = { ...baseline };
  const matches = learnedFields(text, rules);
  const applied: Array<{ field: LearningField; ruleId: string; line: string; lineNumber: number; compiledPage: number | null }> = [];
  for (const field of Object.keys(matches) as LearningField[]) {
    const match = matches[field]!;
    if (metadataValue(baseline, field)) continue;
    if (field === "defendant") { metadata.defendantName = match.value; metadata.defendantSource = "extracted_cover_fallback"; }
    if (field === "charge") { metadata.offenceWording = match.value; metadata.offenceDisplay = match.value; metadata.offenceSource = "extracted_charge_fallback"; }
    if (field === "court") { metadata.court = match.value; metadata.courtSource = "extracted_procedural_fallback"; }
    if (field === "hearing") {
      const hearing = parseUkHearingDateTime(match.value);
      if (!hearing?.iso) continue;
      metadata.nextHearingRaw = match.value; metadata.nextHearingIso = hearing.iso; metadata.nextHearingSource = "extracted_procedural_fallback";
    }
    applied.push({ field, ruleId: match.ruleId, line: match.line, lineNumber: match.lineNumber, compiledPage: match.compiledPage });
  }
  return { baseline, metadata, applied };
}
