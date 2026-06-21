import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { dedupePilotLines } from "./workflowPilotDisplay";
import {
  dedupeSimilarSummaryLines,
  firstSafeSentence,
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
  /** Court-day line lives on Today — pointer only. */
  courtDayNote: string;
  plainText: string;
};

function trimParagraph(parts: (string | null | undefined)[]): string {
  return stripReqAndInternalCodes(
    parts
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function sectionPlain(s: MatterBriefSection): string {
  const lines = [s.title, s.paragraph ?? "", ...(s.bullets?.map((b) => `• ${b}`) ?? [])].filter(Boolean);
  return lines.join("\n");
}

function shapedOpportunityFromChase(chase: DisclosureChaseBrief): string[] {
  return chase.primaryItems
    .slice(0, 5)
    .map((item) => {
      const label = stripReqAndInternalCodes(item.label ?? "");
      const why = item.whyItMatters?.trim();
      if (!label) return "";
      if (why && !/appears outstanding|ask the court/i.test(why)) {
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
      if (/medical|injury|causation/i.test(label)) {
        return `Causation / injury challenge pending served medical material.`;
      }
      if (/cctv|bwv|999|cad|timeline|audio/i.test(label)) {
        return `Sequence / coverage challenge pending served footage or CAD material.`;
      }
      if (/receipt|cardholder|bank|loss|continuity/i.test(label)) {
        return `Attribution / continuity challenge pending served accounting material.`;
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

/** Assemble Matter Brief from existing War Room + Chase briefs — no new reasoning. */
export function buildMatterBrief(input: {
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  primaryRouteTitle?: string | null;
}): MatterBrief {
  const { warRoom, chase } = input;
  const contradictions = warRoom.bundleContradictions ?? [];
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

  const safeLine = firstSafeSentence(warRoom.safePositionToday);

  const caseTheory = trimParagraph([
    "The defence case remains provisional pending disclosure.",
    primaryRoute ? `Primary route on file: ${primaryRoute}.` : null,
    ...contradictions.map((c) => c.theoryLine),
    safeLine,
  ]);

  const prosecutionRisks = dedupeSimilarSummaryLines(
    [
      ...contradictions.map((c) => `Prosecution papers differ on ${c.type.replace(/_/g, " ")} — reconciliation outstanding.`),
      ...warRoom.collapseRisks.filter((r) => /prosecution|crown|pressure|gap|missing|not served|reconcile|differs/i.test(r)),
    ],
    4,
  );

  const defenceRisks = dedupeSimilarSummaryLines(
    [
      ...contradictions.map((c) => c.riskLine),
      ...warRoom.doNotOverstate,
      ...warRoom.collapseRisks,
    ],
    6,
  );

  const opportunities = dedupeSimilarSummaryLines(
    [
      ...contradictions.map((c) => c.opportunityLine),
      ...shapedOpportunityFromChase(chase),
    ],
    8,
  );

  const ptphBullets = dedupePilotLines([
    safeLine,
    ...warRoom.askCourtToRecord.slice(0, 6),
    "The defence cannot confirm final issues until disclosure is complete.",
  ]).slice(0, 10);

  const clientParagraph =
    warRoom.draftWording.clientExplanation?.trim() ||
    trimParagraph([
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
      ].slice(0, 10),
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
