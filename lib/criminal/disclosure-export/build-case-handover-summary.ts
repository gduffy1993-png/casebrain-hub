import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeExportLine, truncateExportBasis } from "./export-sanitize";
import type { CaseHandoverSummary, SolicitorExportContext } from "./export-types";
import { SOLICITOR_REVIEW_FOOTER } from "./export-types";

function dedupeLines(lines: string[], cap = 10): string[] {
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

function nextHearingAction(ctx: SolicitorExportContext, reasoning: ReasoningV2ViewModel): string {
  const parts: string[] = [];
  if (ctx.hearingDateIso) {
    const d = new Date(ctx.hearingDateIso);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`Next hearing date on file: ${d.toLocaleDateString("en-GB")}.`);
    }
  }
  if (ctx.stage) parts.push(`Stage: ${sanitizeExportLine(ctx.stage)}.`);
  parts.push(
    sanitizeExportLine(
      reasoning.safeNextAction ||
        "Review served papers, chase outstanding disclosure, and take further client instructions before fixing hearing position.",
    ),
  );
  return parts.join(" ");
}

function assembleFullText(summary: Omit<CaseHandoverSummary, "fullText">): string {
  const lines: string[] = [
    summary.heading,
    "",
    `Matter: ${summary.matterLabel}`,
  ];
  if (summary.clientLabel) lines.push(`Client: ${summary.clientLabel}`);
  if (summary.chargeLabel) lines.push(`Charge (on papers): ${summary.chargeLabel}`);
  lines.push("");

  lines.push("Provisional route (on served papers)");
  lines.push(summary.provisionalRoute);
  lines.push("");

  lines.push("Safe position / hearing line (provisional)");
  lines.push(summary.safePositionHearingLine);
  lines.push("");

  if (summary.clientAccountPoints.length) {
    lines.push("Client account (structured — provisional)");
    summary.clientAccountPoints.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (summary.servedMaterialLabels.length) {
    lines.push("Served material referenced on papers (labels only)");
    summary.servedMaterialLabels.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }

  if (summary.missingMaterial.length) {
    lines.push("Missing / partial material");
    summary.missingMaterial.forEach((m) => lines.push(`- ${m}`));
    lines.push("");
  }

  if (summary.disclosureChasePriorities.length) {
    lines.push("Disclosure chase priorities");
    summary.disclosureChasePriorities.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
  }

  if (summary.contradictions.length) {
    lines.push("Contradictions / unresolved conflicts");
    summary.contradictions.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  if (summary.clientInstructionGaps.length) {
    lines.push("Client instruction gaps");
    summary.clientInstructionGaps.forEach((g) => lines.push(`- ${g}`));
    lines.push("");
  }

  if (summary.doNotConcedePoints.length) {
    lines.push("Do not concede yet");
    summary.doNotConcedePoints.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  lines.push("Pre-hearing readiness");
  lines.push(`${summary.readinessLevel}${summary.readinessBlockers.length ? ` — Blockers: ${summary.readinessBlockers.join("; ")}` : ""}`);
  lines.push("");

  if (summary.evidenceChangesSummary) {
    lines.push("Evidence changes since last saved snapshot");
    lines.push(summary.evidenceChangesSummary);
    lines.push("");
  }

  lines.push("Next action");
  lines.push(summary.nextAction);
  lines.push("");
  lines.push(
    summary.solicitorReviewRequired
      ? "Solicitor review required before relying on this handover."
      : "Subject to solicitor judgment.",
  );
  lines.push("", summary.solicitorReviewFooter);
  return lines.join("\n");
}

export function buildCaseHandoverSummary(
  reasoning: ReasoningV2ViewModel,
  ctx: SolicitorExportContext,
  options: {
    clientStress?: ClientStressResult | null;
    readinessInput?: PreHearingReadinessInput;
    evidenceChanges?: EvidenceChangeCompareResult | null;
  } = {},
): CaseHandoverSummary {
  const { clientStress = null, readinessInput = {}, evidenceChanges = null } = options;
  const readiness = buildPreHearingReadiness(reasoning, clientStress, readinessInput);

  const servedMaterialLabels = dedupeLines(
    [
      ...reasoning.evidenceHelpingDefence.map(
        (e) => `${e.label} (${e.sourceSection}) — on served papers`,
      ),
      ...reasoning.evidenceHurtingDefence.map(
        (e) => `${e.label} (${e.sourceSection}) — on served papers`,
      ),
    ],
    10,
  );

  const missingMaterial = dedupeLines(
    reasoning.missingMaterial.map((m) =>
      truncateExportBasis(`${m.label} — ${m.sourceSection}`),
    ),
    10,
  );

  const disclosureChasePriorities = dedupeLines(
    reasoning.disclosureChasePriorities.map((d) =>
      d.safeAction ? `${d.label} — ${d.safeAction}` : d.label,
    ),
    8,
  );

  const contradictions = dedupeLines(
    reasoning.contradictions.map((c) =>
      truncateExportBasis(`${c.label} — ${c.sourceSection}`),
    ),
    6,
  );

  const clientInstructionGaps = dedupeLines([
    ...(clientStress?.clientInstructionChecklist.map((c) => c.questionText) ?? []),
    ...(readiness.available ? readiness.clientInstructionGaps : []),
  ]);

  const doNotConcedePoints = dedupeLines([
    ...reasoning.warRoom.doNotConcede,
    reasoning.doNotOverstateWarning,
    ...(clientStress?.doNotConcedeGuards.map(
      (g) => `${g.concessionRiskLabel}: ${g.safeWordingAlternative}`,
    ) ?? []),
  ]);

  const clientAccountPoints = dedupeLines(
    clientStress
      ? [
          clientStress.accountSummary,
          ...clientStress.supportsAccount.slice(0, 2),
          ...clientStress.sourceConflicts.slice(0, 2),
        ]
      : ["No structured client account saved — take instructions before aligning to papers."],
    5,
  );

  let evidenceChangesSummary: string | null = null;
  if (evidenceChanges?.available) {
    if (evidenceChanges.hasPreviousSnapshot) {
      evidenceChangesSummary = sanitizeExportLine(
        evidenceChanges.changeSummary +
          (evidenceChanges.topChanges.length
            ? ` Top changes: ${evidenceChanges.topChanges.slice(0, 4).join("; ")}`
            : ""),
      );
    } else {
      evidenceChangesSummary = sanitizeExportLine(
        "No saved snapshot — save current papers state to compare after new material.",
      );
    }
  }

  const readinessLevel = readiness.available ? readiness.label : "Not computed";
  const readinessBlockers = readiness.available ? readiness.topBlockers.slice(0, 5) : [];

  const solicitorReviewRequired =
    reasoning.humanReviewRequired ||
    reasoning.warRoom.solicitorReviewRequired ||
    (readiness.available && readiness.solicitorReviewRequired) ||
    (evidenceChanges?.available && evidenceChanges.solicitorReviewRequired) ||
    Boolean(clientStress?.solicitorReviewRequired);

  const partial: Omit<CaseHandoverSummary, "fullText"> = {
    exportType: "case_handover",
    heading: "Case handover summary — draft for solicitor review",
    matterLabel: sanitizeExportLine(ctx.caseLabel) || "Matter",
    clientLabel: ctx.clientLabel ? sanitizeExportLine(ctx.clientLabel) : null,
    chargeLabel: sanitizeExportLine(reasoning.charge) || null,
    provisionalRoute: sanitizeExportLine(
      `${reasoning.primaryRoute} — ${reasoning.whyRouteIsLive.slice(0, 280)}`,
    ),
    safePositionHearingLine: sanitizeExportLine(
      reasoning.warRoom.safeHearingLine ||
        "Hearing position remains provisional on served papers.",
    ),
    servedMaterialLabels,
    missingMaterial,
    disclosureChasePriorities,
    contradictions,
    clientAccountPoints,
    clientInstructionGaps,
    doNotConcedePoints,
    readinessLevel,
    readinessBlockers,
    evidenceChangesSummary,
    nextAction: nextHearingAction(ctx, reasoning),
    solicitorReviewRequired,
    solicitorReviewFooter: SOLICITOR_REVIEW_FOOTER,
  };

  return { ...partial, fullText: assembleFullText(partial) };
}
