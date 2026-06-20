import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { dedupePilotLines } from "./workflowPilotDisplay";

export type MatterBriefSection = {
  id: string;
  title: string;
  paragraph?: string;
  bullets?: string[];
};

export type MatterBrief = {
  sections: MatterBriefSection[];
  /** Court-day line lives on Today — pointer only. */
  courtDayNote: string;
  plainText: string;
};

function trimParagraph(parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionPlain(s: MatterBriefSection): string {
  const lines = [s.title, s.paragraph ?? "", ...(s.bullets?.map((b) => `• ${b}`) ?? [])].filter(Boolean);
  return lines.join("\n");
}

/** Assemble Matter Brief from existing War Room + Chase briefs — no new reasoning. */
export function buildMatterBrief(input: {
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  primaryRouteTitle?: string | null;
}): MatterBrief {
  const { warRoom, chase } = input;
  const primaryRoute =
    input.primaryRouteTitle?.trim() ||
    chase.linkedRoutes[0]?.trim() ||
    null;

  const chaseLabels = dedupePilotLines(
    [
      ...chase.primaryItems.map((i) => i.label),
      ...chase.items.slice(0, 8).map((i) => i.label),
    ],
  ).slice(0, 8);

  const caseTheory = trimParagraph([
    "The defence case remains provisional pending disclosure.",
    primaryRoute ? `Primary route on file: ${primaryRoute}.` : null,
    warRoom.safePositionToday,
    chaseLabels.length
      ? `Outstanding material includes: ${chaseLabels.slice(0, 3).join("; ")}.`
      : null,
  ]);

  const risksToDefence = dedupePilotLines([
    ...warRoom.doNotOverstate,
    ...warRoom.collapseRisks,
    ...chaseLabels,
  ]).slice(0, 8);

  const risksToProsecution = dedupePilotLines([
    ...warRoom.nextHearingMoves.filter((m) => /outstanding|missing|not served|continuity|reconcile/i.test(m)),
    ...chase.primaryItems.map((i) => i.whyItMatters).filter(Boolean),
  ]).slice(0, 6);

  const opportunities = dedupePilotLines([
    ...chaseLabels.map((l) => `Chase: ${l}`),
    ...warRoom.nextHearingMoves,
    ...warRoom.evidenceAnchors.slice(0, 4),
  ]).slice(0, 10);

  const ptphBullets = dedupePilotLines([
    warRoom.safePositionToday,
    ...warRoom.askCourtToRecord,
    ...chaseLabels.map((l) => `Outstanding: ${l}`),
    "The defence cannot confirm final issues until disclosure is complete.",
  ]).slice(0, 10);

  const clientParagraph =
    warRoom.draftWording.clientExplanation?.trim() ||
    trimParagraph([
      "We are still reviewing the papers.",
      warRoom.safePositionToday,
      chaseLabels.length ? "Some evidence is still outstanding." : null,
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
        ...(risksToProsecution.length
          ? [`Prosecution pressure / gaps: ${risksToProsecution[0]}`, ...risksToProsecution.slice(1)]
          : ["Prosecution pressure: review served MG5/MG6 before fixing trial theory."]),
        ...(risksToDefence.length
          ? [`Defence risks: ${risksToDefence[0]}`, ...risksToDefence.slice(1, 5)]
          : ["Defence risks: confirm missing material and client instructions."]),
      ].slice(0, 10),
    },
    {
      id: "opportunities",
      title: "Defence opportunities",
      bullets:
        opportunities.length > 0
          ? opportunities
          : ["Review chase items and primary route once disclosure is complete."],
    },
    {
      id: "chase",
      title: "Disclosure chase",
      paragraph: chase.disclosureSummary?.trim() || undefined,
      bullets:
        chaseLabels.length > 0
          ? chaseLabels.slice(0, 3)
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
