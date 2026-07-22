import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import {
  CLIENT_EXPLANATION_REVIEW_FOOTER,
  sanitizeClientExplanationLine,
} from "./client-explanation-sanitize";
import type {
  ClientExplanationContext,
  ClientExplanationOutcome,
  ClientExplanationResult,
} from "./client-explanation-types";
import { assessStructuredField } from "@/lib/criminal/structured-solicitor-output";

function dedupe(lines: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeClientExplanationLine(line);
    if (!s) continue;
    const assessed = assessStructuredField(s, "rendered");
    if (!assessed.ok || !assessed.text) continue;
    const key = assessed.text.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(assessed.text);
    if (out.length >= cap) break;
  }
  return out;
}

function assembleFullText(
  sections: Omit<ClientExplanationResult, "available" | "fullText">,
): string {
  // Structured section render — never pipe-join bullets; one bullet per line.
  const lines: string[] = [
    "Client explanation — draft for solicitor review",
    "",
    "Plain-English case position",
    sections.plainEnglishCasePosition,
    "",
    "What the papers currently say (on the papers currently available)",
    ...sections.whatPapersCurrentlySay.map((l) => `- ${l}`),
    "",
    "What is missing or still needs checking",
    ...sections.missingOrNeedsChecking.map((l) => `- ${l}`),
    "",
    "What is disputed or unresolved",
    ...sections.disputedOrUnresolved.map((l) => `- ${l}`),
    "",
    "Questions your solicitor needs from you",
    ...sections.questionsForClient.map((l) => `- ${l}`),
    "",
    "What happens next",
    sections.whatHappensNext,
    "",
    "What not to overstate",
    ...sections.whatNotToOverstate.map((l) => `- ${l}`),
    "",
    sections.solicitorReviewFooter,
  ];
  return lines.join("\n");
}

export type BuildClientExplanationOptions = {
  clientStress?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput;
  evidenceChanges?: EvidenceChangeCompareResult | null;
};

export function buildClientExplanation(
  reasoning: ReasoningV2ViewModel | null | undefined,
  ctx: ClientExplanationContext = {},
  options: BuildClientExplanationOptions = {},
): ClientExplanationOutcome {
  if (!reasoning) {
    return { available: false, reason: "no_reasoning" };
  }

  const { clientStress = null, readinessInput = {}, evidenceChanges = null } = options;
  const readiness = buildPreHearingReadiness(reasoning, clientStress, readinessInput);

  const whatPapersCurrentlySay = dedupe(
    [
      sanitizeClientExplanationLine(
        `The charge on the papers is: ${reasoning.charge}. This remains provisional until your solicitor has reviewed all material.`,
      ),
      sanitizeClientExplanationLine(
        `On the papers currently available, the main issue being looked at is: ${reasoning.primaryRoute}.`,
      ),
      ...reasoning.evidenceHelpingDefence.slice(0, 3).map((e) =>
        sanitizeClientExplanationLine(
          `${e.label} — mentioned on served papers (${e.sourceSection}). Your solicitor will explain what this means for you.`,
        ),
      ),
      ...reasoning.evidenceHurtingDefence.slice(0, 3).map((e) =>
        sanitizeClientExplanationLine(
          `${e.label} — also on served papers (${e.sourceSection}). This needs solicitor review with you.`,
        ),
      ),
      sanitizeClientExplanationLine(reasoning.warRoom.safeHearingLine),
    ],
    8,
  );

  const missingOrNeedsChecking = dedupe(
    [
      ...reasoning.missingMaterial.map((m) =>
        sanitizeClientExplanationLine(
          `${m.label} — not yet fully on the papers or still outstanding. Further material is needed before the position can be finalised.`,
        ),
      ),
      ...reasoning.disclosureChasePriorities.map((d) =>
        sanitizeClientExplanationLine(
          d.chaseNote
            ? `${d.label} — ${d.chaseNote}`
            : `${d.label} — your solicitor may need to chase this.`,
        ),
      ),
    ],
    8,
  );

  const disputedOrUnresolved = dedupe(
    [
      ...reasoning.contradictions.map((c) =>
        sanitizeClientExplanationLine(
          `${c.label} — not agreed on the papers yet. Your solicitor will need to review this with you.`,
        ),
      ),
      ...(clientStress?.sourceConflicts ?? []).map((c) =>
        sanitizeClientExplanationLine(
          `Your account and the papers may not align on: ${c.slice(0, 120)}. This needs to be checked — not decided here.`,
        ),
      ),
    ],
    6,
  );

  const questionsForClient = dedupe(
    [
      ...(clientStress?.clientInstructionChecklist.map((c) => c.questionText) ?? []),
      ...(clientStress?.clientInstructionQuestions ?? []),
      ...(readiness.available ? readiness.clientInstructionGaps : []),
      ...(missingOrNeedsChecking.length
        ? [
            "What can you tell your solicitor about the events, in your own words, to help check the papers?",
          ]
        : []),
    ],
    8,
  );

  const whatNotToOverstate = dedupe(
    [
      reasoning.doNotOverstateWarning,
      reasoning.warRoom.doNotOverstate,
      ...reasoning.warRoom.doNotConcede.map((d) =>
        sanitizeClientExplanationLine(`Do not assume: ${d}`),
      ),
      ...(clientStress?.doNotConcedeGuards.map((g) => g.safeWordingAlternative) ?? []),
      "This explanation does not mean the case is won or lost — it describes the papers only.",
      "Your solicitor will advise you after reviewing all material and taking your instructions.",
    ],
    8,
  );

  let positionParts = [
    "This is a draft explanation for solicitor review — not legal advice and not a prediction.",
    `On the papers currently available, your solicitor is reviewing ${ctx.caseLabel ?? "your matter"}.`,
    sanitizeClientExplanationLine(reasoning.whyRouteIsLive.slice(0, 280)),
  ];

  if (readiness.available) {
    if (readiness.level === "red" || readiness.level === "amber") {
      positionParts.push(
        sanitizeClientExplanationLine(
          `${readiness.label} — further material and solicitor review are needed before your hearing position can be finalised.`,
        ),
      );
      if (readiness.topBlockers.length) {
        positionParts.push(
          `Key points still being checked: ${readiness.topBlockers.slice(0, 3).join("; ")}.`,
        );
      }
    } else {
      positionParts.push(
        "No obvious blocker flagged on current papers — your solicitor will still review everything with you.",
      );
    }
  }

  if (evidenceChanges?.available && evidenceChanges.hasPreviousSnapshot && evidenceChanges.topChanges.length) {
    positionParts.push(
      sanitizeClientExplanationLine(
        "New or changed material may affect how your solicitor reads the papers — your solicitor will review this with you.",
      ),
    );
  }

  const nextParts: string[] = [];
  if (ctx.hearingDateIso) {
    const d = new Date(ctx.hearingDateIso);
    if (!Number.isNaN(d.getTime())) {
      nextParts.push(`Next court date on file: ${d.toLocaleDateString("en-GB")}.`);
    }
  }
  if (ctx.stage) nextParts.push(`Stage: ${sanitizeClientExplanationLine(ctx.stage)}.`);
  nextParts.push(
    sanitizeClientExplanationLine(
      reasoning.safeNextAction ||
        "Your solicitor will chase outstanding material, take your instructions, and explain next steps after review.",
    ),
  );
  if (missingOrNeedsChecking.length) {
    nextParts.push(
      "Further material is needed before the position can be finalised — your solicitor will update you when it arrives.",
    );
  }

  const partial: Omit<ClientExplanationResult, "fullText" | "available"> = {
    plainEnglishCasePosition: sanitizeClientExplanationLine(positionParts.join(" ")),
    whatPapersCurrentlySay,
    missingOrNeedsChecking,
    disputedOrUnresolved:
      disputedOrUnresolved.length > 0
        ? disputedOrUnresolved
        : [
            sanitizeClientExplanationLine(
              "No major dispute flagged on current papers — your solicitor will confirm after review.",
            ),
          ],
    questionsForClient:
      questionsForClient.length > 0
        ? questionsForClient
        : [
            sanitizeClientExplanationLine(
              "Your solicitor may need further instructions from you after reviewing the papers.",
            ),
          ],
    whatHappensNext: sanitizeClientExplanationLine(nextParts.join(" ")),
    whatNotToOverstate,
    solicitorReviewFooter: CLIENT_EXPLANATION_REVIEW_FOOTER,
  };

  return {
    available: true,
    ...partial,
    fullText: assembleFullText(partial),
  };
}
