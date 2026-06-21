import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { dedupePilotLines } from "./workflowPilotDisplay";
import {
  dedupeSimilarSummaryLines,
  dedupeTheorySentences,
  firstSafeSentence,
  isOpportunityShapedLine,
  similarityRatio,
  stripReqAndInternalCodes,
} from "./matterBriefAssembly";

export type MatterBriefSection = {
  id: string;
  title: string;
  paragraph?: string;
  bullets?: string[];
};

export type MatterBrief = {
  sections: MatterBriefSection[];
  courtDayNote: string;
  plainText: string;
};

function sectionPlain(s: MatterBriefSection): string {
  const lines = [s.title, s.paragraph ?? "", ...(s.bullets?.map((b) => `• ${b}`) ?? [])].filter(Boolean);
  return lines.join("\n");
}

function shapedOpportunityFromChase(chase: DisclosureChaseBrief): string[] {
  return chase.primaryItems
    .slice(0, 4)
    .map((item) => {
      const label = stripReqAndInternalCodes(item.label ?? "");
      const why = item.whyItMatters?.trim();
      if (!label) return "";
      if (why && !/appears outstanding|ask the court|chase or confirm|papers mark this material/i.test(why)) {
        const w = stripReqAndInternalCodes(why);
        if (/causation|injury|medical/i.test(`${label} ${w}`)) {
          return `Causation / injury leverage: ${w}`;
        }
        if (/attribution|dishonesty|cardholder|loss|receipt/i.test(`${label} ${w}`)) {
          return `Attribution / continuity leverage: ${w}`;
        }
        if (/sequence|timeline|999|cad|bwv|cctv/i.test(`${label} ${w}`)) {
          return `Sequence / coverage leverage: ${w}`;
        }
        return `Disclosure leverage: ${w}`;
      }
      return "";
    })
    .filter(Boolean);
}

function topChaseBullets(chase: DisclosureChaseBrief, labels: string[]): string[] {
  const top = chase.primaryItems.slice(0, 3).map((item, i) => {
    const why = item.whyItMatters?.trim();
    const core = stripReqAndInternalCodes(item.label?.trim() || labels[i] || "Outstanding item");
    return why ? `${core} — ${stripReqAndInternalCodes(why)}` : core;
  });
  if (top.length >= 3) return top;
  return labels.slice(0, 3).map((l, i) => top[i] ?? stripReqAndInternalCodes(l));
}

function safeLineForTheory(safePosition: string, contradictions: HearingWarRoomBrief["bundleContradictions"]): string | null {
  const line = firstSafeSentence(safePosition);
  if (!line) return null;
  const hasCctv = contradictions?.some((c) => c.type === "cctv_window");
  if (hasCctv && /\bcctv\b/i.test(line) && /\btwo dates\b|\blimited\b/i.test(line)) {
    return null;
  }
  const dup = contradictions?.some((c) => similarityRatio(c.theoryLine, line) >= 0.55);
  if (dup) return null;
  return line;
}

/** Assemble Matter Brief from existing War Room + Chase briefs — no new reasoning. */
export function buildMatterBrief(input: {
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  primaryRouteTitle?: string | null;
}): MatterBrief {
  const { warRoom, chase } = input;
  const contradictions = warRoom.bundleContradictions ?? [];
  const opportunityLines = new Set(contradictions.map((c) => c.opportunityLine));
  const primaryRoute =
    input.primaryRouteTitle?.trim() ||
    chase.linkedRoutes[0]?.trim() ||
    null;

  const chaseLabels = dedupePilotLines(
    [
      ...chase.primaryItems.map((i) => stripReqAndInternalCodes(i.label)),
      ...chase.items.slice(0, 8).map((i) => stripReqAndInternalCodes(i.label)),
    ].filter(Boolean),
  ).slice(0, 8);

  const safeLine = safeLineForTheory(warRoom.safePositionToday, contradictions);

  const caseTheory = dedupeTheorySentences([
    "The defence case remains provisional pending disclosure.",
    primaryRoute ? `Primary route on file: ${primaryRoute}.` : null,
    ...contradictions.map((c) => c.theoryLine),
    safeLine,
  ]);

  const prosecutionRisks = dedupeSimilarSummaryLines(
    [
      ...contradictions.map((c) => c.riskLine),
      ...warRoom.collapseRisks.filter(
        (r) =>
          !isOpportunityShapedLine(r) &&
          !opportunityLines.has(r) &&
          /prosecution|crown|pressure|gap|missing|not served|reconcile|differs/i.test(r),
      ),
    ],
    4,
  );

  const defenceRisks = dedupeSimilarSummaryLines(
    [
      ...contradictions.map((c) => c.riskLine),
      ...warRoom.doNotOverstate,
      ...warRoom.collapseRisks.filter((r) => !isOpportunityShapedLine(r) && !opportunityLines.has(r)),
    ],
    6,
  );

  const opportunities = dedupeSimilarSummaryLines(
    [...contradictions.map((c) => c.opportunityLine), ...shapedOpportunityFromChase(chase)],
    8,
  );

  const ptphBullets = dedupePilotLines([
    safeLine ?? firstSafeSentence(warRoom.safePositionToday),
    ...warRoom.askCourtToRecord.slice(0, 6),
    "The defence cannot confirm final issues until disclosure is complete.",
  ]).slice(0, 10);

  const clientParagraph =
    warRoom.draftWording.clientExplanation?.trim() ||
    dedupeTheorySentences([
      "We are still reviewing the papers.",
      contradictions[0]?.theoryLine,
      safeLine,
      chaseLabels.length ? "Some evidence is still outstanding on the papers." : null,
    ]);

  const sections: MatterBriefSection[] = [
    {
      id: "theory",
      title: "Provisional case theory",
      paragraph: caseTheory || "Provisional pending disclosure — solicitor review required.",
    },
    {
      id: "risks",
      title: "Risks",
      bullets: [
        ...(prosecutionRisks.length
          ? [`Prosecution pressure / gaps: ${prosecutionRisks[0]}`, ...prosecutionRisks.slice(1)]
          : ["Prosecution pressure: review served MG5/MG6 before fixing trial theory."]),
        ...(defenceRisks.length
          ? [`Defence risks: ${defenceRisks[0]}`, ...defenceRisks.slice(1, 5)]
          : ["Defence risks: confirm missing material and client instructions."]),
      ]
        .filter((b) => !isOpportunityShapedLine(b.replace(/^[^:]+:\s*/, "")))
        .slice(0, 10),
    },
    {
      id: "opportunities",
      title: "Defence opportunities",
      bullets:
        opportunities.length > 0
          ? opportunities
          : ["Review disclosure gaps and primary route once disclosure is complete."],
    },
    {
      id: "chase",
      title: "Disclosure chase",
      paragraph: chase.disclosureSummary?.trim() || undefined,
      bullets:
        chaseLabels.length > 0
          ? topChaseBullets(chase, chaseLabels)
          : ["No priority chase items on file yet."],
    },
    {
      id: "ptph",
      title: "PTPH / case management note",
      paragraph: "Provisional — for solicitor review before court.",
      bullets: ptphBullets,
    },
    {
      id: "client",
      title: "Client-safe explanation",
      paragraph: clientParagraph,
    },
  ];

  const courtDayNote =
    "Court-day position line is on the Today tab (Before court). This brief mirrors chase and theory only.";

  const plainText = [...sections.map(sectionPlain), courtDayNote].join("\n\n");

  return { sections, courtDayNote, plainText };
}
