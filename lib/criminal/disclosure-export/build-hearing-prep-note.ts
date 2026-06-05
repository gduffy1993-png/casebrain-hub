import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeExportLine } from "./export-sanitize";
import type { HearingPrepNote, SolicitorExportContext } from "./export-types";
import { SOLICITOR_REVIEW_FOOTER } from "./export-types";

function dedupeLines(lines: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeExportLine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function assembleFullText(note: Omit<HearingPrepNote, "fullText">): string {
  const lines: string[] = [
    note.heading,
    "",
    `Matter: ${note.caseLabel}`,
    "",
    "Safe hearing line (provisional)",
    note.safeHearingLine,
    "",
    "Readiness",
    note.readinessSection,
    "",
  ];

  if (note.disclosureAsks.length) {
    lines.push("Disclosure asks");
    note.disclosureAsks.forEach((a) => lines.push(`- ${a}`));
    lines.push("");
  }

  if (note.doNotConcedePoints.length) {
    lines.push("Do not concede yet");
    note.doNotConcedePoints.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (note.clientInstructionGaps.length) {
    lines.push("Client instruction gaps");
    note.clientInstructionGaps.forEach((g) => lines.push(`- ${g}`));
    lines.push("");
  }

  if (note.evidenceChangesSummary) {
    lines.push("Evidence changes since last saved snapshot");
    lines.push(note.evidenceChangesSummary);
    lines.push("");
  }

  lines.push(
    note.solicitorReviewRequired
      ? "Solicitor review required before relying on this note for hearing."
      : "Subject to solicitor judgment before hearing.",
  );
  lines.push("", note.solicitorReviewFooter);
  return lines.join("\n");
}

export function buildHearingPrepNote(
  reasoning: ReasoningV2ViewModel,
  ctx: SolicitorExportContext,
  options: {
    clientStress?: ClientStressResult | null;
    readinessInput?: PreHearingReadinessInput;
    evidenceChanges?: EvidenceChangeCompareResult | null;
  } = {},
): HearingPrepNote {
  const { clientStress = null, readinessInput = {}, evidenceChanges = null } = options;
  const readiness = buildPreHearingReadiness(reasoning, clientStress, readinessInput);

  const readinessSection = readiness.available
    ? sanitizeExportLine(
        `${readiness.label} — ${readiness.explanation.slice(0, 400)}${
          readiness.topBlockers.length
            ? ` Blockers: ${readiness.topBlockers.slice(0, 3).join("; ")}`
            : ""
        }`,
      )
    : "Readiness not computed — review served papers before hearing.";

  const disclosureAsks = dedupeLines([
    ...reasoning.warRoom.disclosureTimetableRequests,
    ...reasoning.warRoom.courtRecordRequests,
    ...reasoning.disclosureChasePriorities.map((d) =>
      d.safeAction ? `${d.label} — ${d.safeAction}` : d.label,
    ),
  ]);

  const doNotConcedePoints = dedupeLines([
    ...reasoning.warRoom.doNotConcede,
    reasoning.doNotOverstateWarning,
    ...(clientStress?.doNotConcedeGuards.map(
      (g) => `${g.concessionRiskLabel}: ${g.safeWordingAlternative}`,
    ) ?? []),
  ]);

  const clientInstructionGaps = dedupeLines([
    ...(clientStress?.clientInstructionChecklist.map((c) => c.questionText) ?? []),
    ...(readiness.available ? readiness.clientInstructionGaps : []),
  ]);

  let evidenceChangesSummary: string | null = null;
  if (evidenceChanges?.available && evidenceChanges.hasPreviousSnapshot) {
    evidenceChangesSummary = sanitizeExportLine(
      evidenceChanges.changeSummary +
        (evidenceChanges.topChanges.length
          ? ` Changes: ${evidenceChanges.topChanges.slice(0, 4).join("; ")}`
          : ""),
    );
  }

  const solicitorReviewRequired =
    reasoning.humanReviewRequired ||
    reasoning.warRoom.solicitorReviewRequired ||
    (readiness.available && readiness.solicitorReviewRequired) ||
    (evidenceChanges?.available && evidenceChanges.solicitorReviewRequired) ||
    Boolean(clientStress?.solicitorReviewRequired);

  const partial: Omit<HearingPrepNote, "fullText"> = {
    exportType: "hearing_prep",
    heading: "Hearing prep note — draft for solicitor review",
    caseLabel: sanitizeExportLine(ctx.caseLabel) || "Matter",
    safeHearingLine: sanitizeExportLine(
      reasoning.warRoom.safeHearingLine ||
        reasoning.primaryRoute ||
        "Hearing position remains provisional on served papers.",
    ),
    readinessSection,
    disclosureAsks,
    doNotConcedePoints,
    clientInstructionGaps,
    evidenceChangesSummary,
    solicitorReviewRequired,
    solicitorReviewFooter: SOLICITOR_REVIEW_FOOTER,
  };

  return { ...partial, fullText: assembleFullText(partial) };
}
