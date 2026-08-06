/**
 * Solicitor-facing disclosure for filtered / quarantined evidence and chase views.
 * Safety must travel with the copyable string — not depend on a separate panel.
 */

export function formatCompatibleEvidenceCounts(input: {
  overviewCountsLine: string;
  quarantinedCount: number;
  rawSourceCount: number;
  compatibleCount: number;
}): string {
  const q = input.quarantinedCount;
  const m = input.overviewCountsLine.match(
    /Served\s+(\d+)\s*·\s*Referred\s+(\d+)\s*·\s*Missing\s+(\d+)\s*·\s*Incomplete\s+(\d+)(?:\s*·\s*Not safely confirmed\s+(\d+))?/i,
  );
  const line = m
    ? `${m[1]} served · ${m[2]} referred · ${m[3]} missing · ${m[4]} incomplete · ${m[5] ?? "0"} not safely confirmed`
    : input.overviewCountsLine;

  if (q <= 0) {
    return `Evidence currently compatible with this matter:\n${line}`;
  }

  const qWord = q === 1 ? "One additional source row conflicts" : `${q} additional source rows conflict`;
  return [
    "Evidence currently compatible with this matter:",
    line,
    "",
    "Review warning:",
    `${qWord} with the recorded allegation and ${q === 1 ? "has" : "have"} been quarantined. These figures must not be treated as complete disclosure totals.`,
    `Reconciliation: ${input.compatibleCount} compatible + ${q} quarantined = ${input.rawSourceCount} raw source rows.`,
  ].join("\n");
}

export function formatCompatibleTruthMap(input: {
  truthMapText: string;
  quarantinedCount: number;
  quarantinedLabels: string[];
  rawSourceCount: number;
  compatibleCount: number;
}): string {
  const q = input.quarantinedCount;
  const body = input.truthMapText.trim()
    ? `Evidence currently compatible with this matter:\n${input.truthMapText}`
    : "Evidence currently compatible with this matter:\n(none)";

  if (q <= 0) return body;

  const qWord = q === 1 ? "One additional source row was" : `${q} additional source rows were`;
  return [
    body,
    "",
    "Review warning:",
    `${qWord} quarantined because ${q === 1 ? "it conflicts" : "they conflict"} with the recorded allegation. This map is not a complete bundle inventory.`,
    `Reconciliation: ${input.compatibleCount} compatible + ${q} quarantined = ${input.rawSourceCount} raw source rows.`,
  ].join("\n");
}

export function formatQuarantineReviewSection(input: {
  quarantinedLabels: string[];
  reason: string;
}): string {
  if (!input.quarantinedLabels.length) return "(no quarantined evidence rows)";
  return [
    "Quarantined source rows (for solicitor review — not for copy as a complete evidence list):",
    ...input.quarantinedLabels.map((l) => `• ${l}`),
    "",
    `Why excluded: ${input.reason}`,
  ].join("\n");
}

export function formatCompatibleChaseBrief(input: {
  supportedLabels: string[];
  quarantinedLabels: string[];
}): string {
  const supported = input.supportedLabels;
  const excluded = input.quarantinedLabels;
  const body =
    supported.length > 0
      ? `Disclosure chase (supported requests):\nTotal ${supported.length}\n` +
        supported.map((l) => `• ${l}`).join("\n")
      : "Disclosure chase (supported requests):\n(none)";

  if (!excluded.length) return body;

  return [
    body,
    "",
    "Review warning:",
    `${excluded.length} source request${excluded.length === 1 ? " was" : "s were"} excluded because ${
      excluded.length === 1 ? "it conflicts" : "they conflict"
    } with the recorded allegation and require solicitor review.`,
    `Excluded: ${excluded.join("; ")}.`,
    "Do not treat this chase total as complete outstanding disclosure.",
  ].join("\n");
}

export function missingCompatibleEvidenceDisclosure(text: string, quarantinedCount: number): boolean {
  if (quarantinedCount <= 0) return false;
  return !/quarantined|must not be treated as complete disclosure/i.test(text);
}
