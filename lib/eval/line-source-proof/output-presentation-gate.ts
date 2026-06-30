/**
 * H5 output presentation gate — source-gate string outputs after builders run.
 * Presentation/filtering only; does not change chase/battleboard core logic.
 */
import type { DisclosureChaseBrief, DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  gatePresentationLine,
  gatePresentationLines,
  gateProseAgainstSource,
  shouldEmitOutputLine,
} from "@/lib/criminal/chase-source-gate";
import { setGateSurfaceContext } from "./proof-ledger-session";

export function gateDisclosureItem(item: DisclosureChaseItem, bundleText: string): DisclosureChaseItem | null {
  const probe = `${item.label} ${item.draftChaseWording} ${item.whyItMatters} ${item.courtLine ?? ""}`;
  setGateSurfaceContext({ surface: "disclosure_chase.item", field: "probe" });
  if (!shouldEmitOutputLine(probe, bundleText)) return null;

  setGateSurfaceContext({ surface: "disclosure_chase.label", field: "label" });
  const label = gatePresentationLine(item.label, bundleText);
  if (!label) return null;

  setGateSurfaceContext({ surface: "disclosure_chase.why_it_matters", field: "whyItMatters" });
  const whyItMatters =
    gatePresentationLine(item.whyItMatters, bundleText) ??
    gateProseAgainstSource(item.whyItMatters, bundleText);

  setGateSurfaceContext({ surface: "disclosure_chase.cps_chase", field: "draftChaseWording" });
  const draftChaseWording =
    gatePresentationLine(item.draftChaseWording, bundleText) ??
    gateProseAgainstSource(item.draftChaseWording, bundleText);

  setGateSurfaceContext({ surface: "disclosure_chase.court_note", field: "courtLine" });
  const courtLine = item.courtLine ? (gatePresentationLine(item.courtLine, bundleText) ?? undefined) : item.courtLine;

  return {
    ...item,
    label,
    whyItMatters,
    draftChaseWording,
    courtLine,
  };
}

export function gateChaseBrief(chase: DisclosureChaseBrief, bundleText: string): DisclosureChaseBrief {
  const mapItems = (items: DisclosureChaseItem[]) =>
    items
      .map((item) => gateDisclosureItem(item, bundleText))
      .filter((item): item is DisclosureChaseItem => item !== null);

  const primaryItems = mapItems(chase.primaryItems);
  const additionalItems = mapItems(chase.additionalItems);
  const allItems = chase.items?.length ? mapItems(chase.items) : [...primaryItems, ...additionalItems];

  return {
    ...chase,
    items: allItems,
    primaryItems,
    additionalItems,
    safeCourtLine: chase.safeCourtLine
      ? (() => {
          setGateSurfaceContext({ surface: "disclosure_chase.safe_court_line" });
          return gatePresentationLine(chase.safeCourtLine, bundleText) ?? chase.safeCourtLine;
        })()
      : chase.safeCourtLine,
    disclosureSummary: (() => {
      setGateSurfaceContext({ surface: "disclosure_chase.summary" });
      return gatePresentationLine(chase.disclosureSummary, bundleText) ?? chase.disclosureSummary;
    })(),
  };
}

export function gateWarRoomBrief(warRoom: HearingWarRoomBrief, bundleText: string): HearingWarRoomBrief {
  const gateField = (line: string, surface: string) => {
    setGateSurfaceContext({ surface });
    return gatePresentationLine(line, bundleText) ?? line;
  };
  const gateList = (lines: string[] | undefined, surface: string) => {
    setGateSurfaceContext({ surface });
    return gatePresentationLines(lines ?? [], bundleText);
  };

  return {
    ...warRoom,
    safePositionToday: gateField(warRoom.safePositionToday, "war_room.safe_position"),
    sayThis: gateList(warRoom.sayThis, "war_room.say_this"),
    doNotOverstate: gateList(warRoom.doNotOverstate, "war_room.do_not_overstate"),
    askCourtToRecord: gateList(warRoom.askCourtToRecord, "war_room.ask_court"),
    instructionsNeeded: gateList(warRoom.instructionsNeeded, "war_room.instructions"),
    nextHearingMoves: gateList(warRoom.nextHearingMoves, "war_room.next_moves"),
    collapseRisks: gateList(warRoom.collapseRisks, "war_room.collapse_risks"),
    evidenceAnchors: gateList(warRoom.evidenceAnchors, "war_room.evidence_anchors"),
    draftWording: {
      disclosureTimetable: gateField(warRoom.draftWording.disclosureTimetable, "war_room.draft_timetable"),
      adjournment: gateField(warRoom.draftWording.adjournment, "war_room.draft_adjournment"),
      clientExplanation: gateField(warRoom.draftWording.clientExplanation, "war_room.client_explanation"),
    },
  };
}

export function gateDoNotOverstateList(lines: string[], bundleText: string): string[] {
  setGateSurfaceContext({ surface: "do_not_overstate" });
  return gatePresentationLines(lines, bundleText);
}
