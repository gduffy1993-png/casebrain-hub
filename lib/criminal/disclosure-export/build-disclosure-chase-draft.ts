import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeExportLine, truncateExportBasis } from "./export-sanitize";
import type { DisclosureChaseDraft, DisclosureChaseDraftItem, SolicitorExportContext } from "./export-types";
import { SOLICITOR_REVIEW_FOOTER } from "./export-types";

function deadlineWording(hearingDateIso: string | null | undefined): string {
  if (!hearingDateIso) {
    return "Service requested in accordance with disclosure timetable and before next hearing where practicable.";
  }
  const d = new Date(hearingDateIso);
  if (Number.isNaN(d.getTime())) {
    return "Service requested in accordance with disclosure timetable and before next hearing where practicable.";
  }
  return `Service requested before next hearing (${d.toLocaleDateString("en-GB")}) where practicable, subject to disclosure timetable.`;
}

function chaseForLabel(
  label: string,
  reasoning: ReasoningV2ViewModel,
): { chaseNote?: string; safeAction?: string } {
  const key = label.toLowerCase().slice(0, 48);
  const hit = reasoning.disclosureChasePriorities.find(
    (d) => d.label.toLowerCase().slice(0, 48) === key || d.label.toLowerCase().includes(key),
  );
  return hit ?? {};
}

function whyItMatters(label: string, chaseNote?: string): string {
  if (chaseNote) return sanitizeExportLine(chaseNote);
  const lower = label.toLowerCase();
  if (/cctv|master|export|bwv/i.test(lower)) {
    return "Required to assess identification, sequence, and continuity on served papers — do not finalise route from stills or summaries alone.";
  }
  if (/cad|999/i.test(lower)) {
    return "Required to verify timing, deployment, and emergency call context on served papers.";
  }
  if (/interview|transcript|audio|pace/i.test(lower)) {
    return "Required before any interview position is recorded — summary alone may be insufficient.";
  }
  if (/mg6|unused/i.test(lower)) {
    return "Required to confirm unused material schedule and chase outstanding third-party material.";
  }
  if (/lab|medical|expert/i.test(lower)) {
    return "Required to assess injury, causation, attribution, or expert opinion on served papers.";
  }
  if (/continuity|exhibit|chain/i.test(lower)) {
    return "Required to assess exhibit integrity before relying on physical or digital material.";
  }
  if (/phone|extraction|download|sim|message/i.test(lower)) {
    return "Required to assess attribution, knowledge, and supply inference on served papers.";
  }
  if (/identif|vip|turnbull|complainant/i.test(lower)) {
    return "Required to assess identification or complainant account before fixing hearing position.";
  }
  return "Outstanding on served papers — required before hearing position is finalised.";
}

function buildItems(
  reasoning: ReasoningV2ViewModel,
  hearingDateIso: string | null | undefined,
): DisclosureChaseDraftItem[] {
  const seen = new Set<string>();
  const items: DisclosureChaseDraftItem[] = [];
  const deadline = deadlineWording(hearingDateIso);

  const sources = [
    ...reasoning.missingMaterial.map((m) => ({
      label: m.label,
      section: m.sourceSection,
      basis: m.sourceBasis,
    })),
    ...reasoning.disclosureChasePriorities.map((d) => ({
      label: d.label,
      section: "Disclosure chase",
      basis: d.chaseNote ?? "",
    })),
  ];

  for (const src of sources) {
    const label = sanitizeExportLine(src.label);
    if (!label) continue;
    const key = label.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);

    const chase = chaseForLabel(label, reasoning);
    items.push({
      materialLabel: label,
      whyItMatters: whyItMatters(label, chase.chaseNote),
      sourceBasis: truncateExportBasis(
        src.section ? `${src.section} — ${src.basis || "on served papers"}` : src.basis || "On served papers",
      ),
      requestedAction: sanitizeExportLine(
        chase.safeAction ||
          `Request service/copy of ${label} under the disclosure timetable.`,
      ),
      deadlineWording: deadline,
    });
    if (items.length >= 12) break;
  }

  return items;
}

function assembleFullText(draft: Omit<DisclosureChaseDraft, "fullText">): string {
  const lines: string[] = [
    draft.heading,
    "",
    `Matter: ${draft.caseLabel}`,
  ];
  if (draft.clientLabel) lines.push(`Client: ${draft.clientLabel}`);
  lines.push("", "Disclosure chase — draft for solicitor review", "");

  draft.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.materialLabel}`);
    lines.push(`   Why it matters: ${item.whyItMatters}`);
    lines.push(`   Source basis: ${item.sourceBasis}`);
    lines.push(`   Requested action: ${item.requestedAction}`);
    if (item.deadlineWording) lines.push(`   Deadline: ${item.deadlineWording}`);
    lines.push("");
  });

  lines.push(`Do not overstate: ${draft.doNotOverstateNote}`);
  lines.push("", draft.solicitorReviewFooter);
  return lines.join("\n");
}

export function buildDisclosureChaseDraft(
  reasoning: ReasoningV2ViewModel,
  ctx: SolicitorExportContext,
  _clientStress?: ClientStressResult | null,
): DisclosureChaseDraft {
  const items = buildItems(reasoning, ctx.hearingDateIso);
  const doNotOverstateNote = sanitizeExportLine(
    reasoning.doNotOverstateWarning ||
      reasoning.warRoom.doNotOverstate ||
      "Do not state missing material is irrelevant; do not finalise route from partial disclosure.",
  );

  const partial: Omit<DisclosureChaseDraft, "fullText"> = {
    exportType: "disclosure_chase",
    heading: "Disclosure chase letter — draft for solicitor review",
    caseLabel: sanitizeExportLine(ctx.caseLabel) || "Matter",
    clientLabel: ctx.clientLabel ? sanitizeExportLine(ctx.clientLabel) : null,
    items,
    doNotOverstateNote,
    solicitorReviewFooter: SOLICITOR_REVIEW_FOOTER,
  };

  return { ...partial, fullText: assembleFullText(partial) };
}
