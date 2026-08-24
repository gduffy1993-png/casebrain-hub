import { describe, expect, it } from "vitest";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  workflowDisclosureChaseLabels,
  workflowProfileFallbackRisks,
  workflowTopNextActions,
} from "../lib/criminal/pilot-workflow";
import {
  canonicalEvidenceStateRowsForBuilder,
  canonicalRowsForBuilder,
} from "../lib/criminal/canonical-evidence-status-bridge";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import type { BattleboardOutput } from "../lib/criminal/strategy-battleboard";

function battleboard(lines: Partial<BattleboardOutput["primary_route"]>): BattleboardOutput {
  const route = {
    id: "primary",
    route_type: "timeline" as const,
    title: "Provisional source-led route",
    status: "conditional" as const,
    why_it_helps: [],
    what_hurts_us: [],
    evidence_anchors: [],
    collapse_risks: [],
    next_moves: [],
    hearing_line: "The defence position remains provisional pending served source material.",
    safety_note: "Provisional — solicitor review required.",
    ...lines,
  };
  return {
    case_id: "CB-FRESH-TEST",
    generated_at: "2026-06-23T00:00:00.000Z",
    overall_status: "needs_review",
    solicitor_safe_summary: route.hearing_line,
    primary_route: route,
    routes: [route],
    global_collapse_risks: route.collapse_risks,
    urgent_next_moves: route.next_moves,
  };
}

const digitalBundle = [
  "=== SECTION: CHARGE ===",
  "Harassment by messages.",
  "=== SECTION: MG5 ===",
  "The prosecution relies on screenshots and a phone download summary.",
  "=== SECTION: MG6 ===",
  "MG6C/001 — Phone extraction — summary only, source download outstanding.",
  "MG6C/002 — Screenshot pack — served.",
].join("\n");

const custodyBundle = [
  "=== SECTION: CHARGE ===",
  "Assault emergency worker.",
  "=== SECTION: MG5 ===",
  "Officer account and custody reference are summarised.",
  "=== SECTION: MG6 ===",
  "BWV reference | 7 |",
  "MG6C/010 — BWV — referred to but not attached.",
  "I activated BWV at the scene. The defendant grabbed my vest before I took hold of his arm. Full clip not on this",
  "referred to on the schedule but not attached. Custody record is extract only.",
  "MG6C/011 — Custody record — extract only.",
  "Custody record extract — detention authorised. Safeguards checklist referenced; full record outstanding.",
  "MG6C/012 — MG11 officer statement — draft unsigned.",
].join("\n");

const patelAffrayBundle = [
  "Isaac Patel",
  "Charge: Affray",
  "Court: Southford Magistrates' Court",
  "Hearing: First Appearance on 25 August 2026",
  "MG5 summary: CCTV stills are referred to. Full CCTV master footage is outstanding.",
  "Interview summary is on file. Full interview recording/transcript is not served and remains outstanding.",
].join("\n");

const ahmedBladedArticleBundle = [
  "Defendant: Holly Ahmed",
  "Court: Crown Court at Preston",
  "Next hearing: 20 July 2026 at 12:30",
  "Stage: Trial prep",
  "Charge: Possession of a bladed article, contrary to section 139 Criminal Justice Act 1988.",
  "MG5: search record and reasonable excuse referred. Material still needed: search record; reasonable excuse; full interview transcript.",
  "Interview summary is on file. This is not a full transcript. Transcript: not in this section.",
  "Custody record extract: arrival and risk assessment opened. Legal advice requested. Interview proposed. Appropriate adult / interpreter entry unclear.",
  "MG6: complete CAD/999 log outstanding — not attached.",
  "Medical / forensic note: short note records injury or forensic issue. Final report not included.",
  "Exhibit list: CCTV export log short note. Continuity label unclear.",
  "MG6C: phone subscriber data outstanding — not attached.",
].join("\n");

describe("source truth guardian", () => {
  it("blocks Taylor-style BWV/drugs bleed on a digital bundle without flattening safe output", () => {
    const brief = buildHearingWarRoomBrief({
      caseId: "CB-FRESH-001",
      caseTitle: "Taylor",
      clientLabel: "Taylor",
      allegation: "Harassment by messages",
      stage: "PTPH",
      hearingStatus: "Listed",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      readiness: "",
      battleboard: battleboard({
        hearing_line: "The defence position remains provisional pending served phone material.",
        collapse_risks: [
          "BWV confirms Crown sequence.",
          "Drug continuity may close the route.",
          "The defence cannot fix attribution until the phone extraction source is served.",
        ],
        evidence_anchors: ["BWV clip 2", "Phone extraction summary only"],
      }),
      hasSavedPosition: false,
      chaseItems: ["Phone extraction source download"],
      bundleText: digitalBundle,
    });

    const text = JSON.stringify(brief);
    expect(text).not.toMatch(/\bBWV confirms\b/i);
    expect(text).not.toMatch(/drug continuity/i);
    expect(text).toMatch(/phone material|phone extraction/i);
    expect(brief.sourceTruthGuardian?.flags.some((f) =>
      ["wrong_modality", "state_contradiction", "template_bleed"].includes(f),
    )).toBe(true);
  });

  it("handles Jordan-style custody/BWV state contradictions and relabels defence account", () => {
    const brief = buildHearingWarRoomBrief({
      caseId: "CB-FRESH-002",
      caseTitle: "Jordan",
      clientLabel: "Jordan",
      allegation: "Assault emergency worker",
      stage: "PTPH",
      hearingStatus: "Listed",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      readiness: "",
      battleboard: battleboard({
        hearing_line: "The defence position remains provisional pending served BWV and custody material.",
        collapse_risks: [
          "Safeguards were followed.",
          "Officer grabbed first.",
          "Witness confirms he pushed her.",
        ],
      }),
      hasSavedPosition: false,
      chaseItems: ["BWV full clip", "Custody record"],
      bundleText: custodyBundle,
    });

    const text = JSON.stringify(brief);
    const unsafeSurfaces = [
      brief.safePositionToday,
      ...brief.sayThis,
      ...brief.collapseRisks,
      ...brief.evidenceAnchors,
    ].join("\n");
    expect(unsafeSurfaces).not.toMatch(/Safeguards were followed/i);
    expect(unsafeSurfaces).not.toMatch(/Witness confirms he pushed her/i);
    expect(text).toMatch(/DEFENCE ACCOUNT:/);
    expect(brief.sourceTruthGuardian?.flags).toContain("state_contradiction");
    expect(brief.sourceTruthGuardian?.flags).toContain("defence_account_relabelled");
  });

  it("removes MG6C headers as chase items and keeps useful chase wording", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-001",
      caseTitle: "Taylor",
      clientLabel: "Taylor",
      allegation: "Harassment by messages",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-07-01T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["MG6C: Unused Material Schedule", "Phone extraction source download"],
      bundleText: digitalBundle,
    });

    expect(chase.items.every((item) => !/Unused Material Schedule/i.test(item.label))).toBe(true);
    expect(JSON.stringify(chase.items.map((item) => item.mergedFrom))).not.toMatch(/Unused Material Schedule/i);
    expect(JSON.stringify(chase)).toMatch(/Phone extraction/i);
    expect(chase.items.some((item) => item.familyId === "mg6_unused")).toBe(false);
  });

  it("collapses Jordan-style referred-only BWV/custody fragments into clean chase items", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-002",
      caseTitle: "Jordan",
      clientLabel: "Jordan",
      allegation: "Assault emergency worker",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-03-12T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      snapshotMissing: [
        { label: "Body Worn Video (BWV)", status: "outstanding" },
        { label: "Interview Recording", status: "outstanding" },
      ],
      bundleText: custodyBundle,
    });

    const labels = chase.items.map((item) => item.label).join("\n");
    expect(labels).toMatch(/Body-worn video \(BWV\)/i);
    expect(labels).toMatch(/Full custody record \/ PACE material/i);
    expect(labels).not.toMatch(/BWV reference \| 7 \|/i);
    expect(labels).not.toMatch(/I activated BWV at the scene/i);
    expect(labels).not.toMatch(/referred to on the schedule but not attached/i);
  });

  it("does not attach phone/source-export provenance to CCTV chase items", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-003",
      caseTitle: "Isaac",
      clientLabel: "Isaac Patel",
      allegation: "Affray",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: battleboard({
        route_type: "identity",
        evidence_anchors: ["full phone download / source export"],
      }),
      proceduralOutstanding: ["CCTV full window / master footage"],
      bundleText: [
        "MG5 summary refers to CCTV stills and a CCTV clip.",
        "The full CCTV window/master footage is not served.",
      ].join("\n"),
    });

    const cctv = chase.items.find((item) => item.familyId === "cctv_master");
    expect(cctv).toBeTruthy();
    expect(cctv?.label).toMatch(/CCTV full window|master footage/i);
    expect(cctv?.evidenceAnchor ?? "").not.toMatch(/phone|source export|download/i);
  });

  it("does not promote a stolen-phone fact into a phone-download chase", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-003B",
      caseTitle: "No phone extraction",
      clientLabel: "No phone extraction",
      allegation: "Robbery involving a stolen phone",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["Full phone download / source export"],
      bundleText: [
        "Charge: robbery. The allegation is that a phone was stolen.",
        "No phone extraction, download report, source export, SIM, IMEI or subscriber material is identified in the papers.",
      ].join("\n"),
    });

    const visibleText = JSON.stringify(chase.items);
    expect(chase.items.some((item) => item.familyId === "other" && /phone/i.test(item.label))).toBe(false);
    expect(visibleText).not.toMatch(/Full phone download|source export|source extraction/i);
  });

  it("keeps unclear CCTV continuity as confirmation wording, not asserted outstanding", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-003C",
      caseTitle: "Unclear CCTV continuity",
      clientLabel: "Unclear CCTV continuity",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["CCTV continuity / provenance"],
      bundleText: "Continuity of CCTV sources: to be checked.",
    });

    const cctv = chase.items.find((item) => item.familyId === "cctv_continuity");
    expect(cctv).toBeTruthy();
    expect(cctv?.baseStatus).toBe("Not safely confirmed");
    expect([cctv?.whyItMatters, cctv?.draftChaseWording, cctv?.courtLine].join("\n")).not.toMatch(
      /appears outstanding|remains outstanding/i,
    );
    expect(cctv?.courtLine).toMatch(/needs confirmation|confirm/i);
  });

  it("does not let a hearing date promote canonical review-only evidence into due/outstanding", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-003D",
      caseTitle: "Canonical review state",
      clientLabel: "Canonical review state",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      snapshotMissing: [
        { label: "CCTV continuity / provenance", status: "UNASSESSED" },
        { label: "Interview transcript", status: "referred_only" },
      ],
      bundleText: [
        "Continuity of CCTV sources: to be checked.",
        "Interview summary is on file. Full interview recording/transcript is not served and remains outstanding.",
      ].join("\n"),
    });

    const continuity = chase.items.find((item) => item.familyId === "cctv_continuity");
    expect(continuity).toBeTruthy();
    expect(continuity?.baseStatus).toBe("Not safely confirmed");
    expect(continuity?.deadlineLabel).toMatch(/confirm status/i);
    expect([continuity?.whyItMatters, continuity?.draftChaseWording, continuity?.courtLine].join("\n")).not.toMatch(
      /due soon|overdue|appears outstanding|remains outstanding/i,
    );

    const interview = chase.items.find((item) => item.familyId === "interview");
    expect(interview).toBeTruthy();
    expect(interview?.baseStatus).toBe("Not safely confirmed");
  });

  it("bridges canonical evidence states once, without flattening review-only rows into outstanding", () => {
    const bridged = canonicalRowsForBuilder({
      evidenceRows: [
        { label: "CCTV continuity / provenance", existence: "not_safely_confirmed" },
        { label: "Interview transcript", existence: "referred_only" },
        { label: "CCTV master footage", existence: "missing" },
        { label: "Served MG5", existence: "served" },
      ],
      chaseLabels: ["CCTV master footage"],
    } as any);

    expect(bridged).toEqual([
      { label: "CCTV continuity / provenance", status: "UNASSESSED" },
      { label: "Interview transcript", status: "UNASSESSED" },
      { label: "CCTV master footage", status: "MISSING" },
    ]);
    expect(bridged).not.toContainEqual({ label: "Served MG5", status: "SERVED" });
    expect(bridged).not.toContainEqual({ label: "CCTV continuity / provenance", status: "MISSING" });
    expect(bridged).not.toContainEqual({ label: "Interview transcript", status: "MISSING" });
  });

  it("bridges live pipeline evidence state for output builders without turning every chase label outstanding", () => {
    const bridged = canonicalEvidenceStateRowsForBuilder({
      items: [
        {
          label: "CCTV continuity / provenance",
          key: "cctv-continuity",
          modality: "clip_or_still",
          state: "not_safely_confirmed",
          aliases: [],
          defendants: [],
          observations: [],
          contradiction: null,
          unresolved: true,
          limitation: "Continuity source needs checking.",
        },
        {
          label: "CCTV master footage",
          key: "cctv-master",
          modality: "master_media",
          state: "missing",
          aliases: [],
          defendants: [],
          observations: [],
          contradiction: null,
          unresolved: false,
          limitation: null,
        },
        {
          label: "Served MG5",
          key: "mg5",
          modality: "document",
          state: "served",
          aliases: [],
          defendants: [],
          observations: [],
          contradiction: null,
          unresolved: false,
          limitation: null,
        },
      ],
      contradictions: [],
      chaseRequests: [
        {
          label: "CCTV continuity / provenance",
          key: "cctv-continuity",
          modality: "clip_or_still",
          state: "not_safely_confirmed",
          defendants: [],
          reason: "Confirm continuity.",
          unresolved: true,
        },
      ],
      suppressed: [],
    });

    expect(bridged).toEqual([
      { label: "CCTV continuity / provenance", status: "UNASSESSED" },
      { label: "CCTV master footage", status: "MISSING" },
    ]);
    expect(bridged).not.toContainEqual({ label: "CCTV continuity / provenance", status: "MISSING" });
    expect(bridged).not.toContainEqual({ label: "Served MG5", status: "SERVED" });
  });

  it("does not promote unsupported violence-profile prompts into Patel-style affray chases", () => {
    const context = {
      caseTitle: "Isaac Patel",
      clientLabel: "Isaac Patel",
      allegation: "Affray",
      stage: "First Appearance",
      bundleText: patelAffrayBundle,
    };

    const visible = [
      ...(workflowDisclosureChaseLabels(context) ?? []),
      ...(workflowTopNextActions(context) ?? []),
      ...workflowProfileFallbackRisks(context),
    ].join("\n");

    expect(visible).not.toMatch(/\b(?:medical|injury|hospital|BWV|body[-\s]?worn|999|CAD|retraction|further statement|domestic|safeguarding|self[-\s]?defence|causation)\b/i);
  });

  it("keeps Patel-style interview transcript outstanding without calling it served", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FRESH-004",
      caseTitle: "Isaac Patel",
      clientLabel: "Isaac Patel",
      allegation: "Affray",
      stage: "First Appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: [
        "Full interview recording/transcript outstanding",
        "Full CCTV master footage outstanding",
      ],
      bundleText: patelAffrayBundle,
    });

    const visibleText = [
      chase.disclosureSummary,
      ...chase.items.flatMap((item) => [
        item.label,
        item.whyItMatters,
        item.evidenceAnchor ?? "",
        item.draftChaseWording,
        item.courtLine,
        ...(item.mergedFrom ?? []),
      ]),
    ].join("\n");
    const text = JSON.stringify(chase);
    expect(text).toMatch(/interview recording|transcript/i);
    expect(text).toMatch(/CCTV/i);
    expect(text).toMatch(/\b(?:interview recording|transcript)[^.!?]{0,100}\bnot served\b/i);
    expect(text).not.toMatch(/\b(?:interview recording|transcript)\s+(?:is\s+)?served\b/i);
    expect(text).not.toMatch(/\bserved\s+(?:interview recording|transcript)\b/i);
    expect(visibleText).not.toMatch(/\bmedical|injury|BWV|body[-\s]?worn|999|CAD|retraction|domestic|self[-\s]?defence|causation\b/i);
    expect(visibleText).not.toMatch(/\bviolence assault\b/i);
    expect(visibleText).not.toMatch(/\bPTPH\b/i);
  });

  it("keeps Ahmed-style disclosure modalities in their own families", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FAMILY-MODALITY-001",
      caseTitle: "Holly Ahmed",
      clientLabel: "Holly Ahmed",
      allegation: "Possession of a bladed article",
      stage: "Trial prep",
      hearingStatus: "Listed",
      hearingDateIso: "2026-07-20T12:30:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: [
        "CAD / 999 audio / control-room material",
        "Full custody record / PACE material",
        "Interview recording",
        "Full phone download / source export",
        "Medical / expert source report",
        "CCTV continuity / provenance",
      ],
      bundleText: ahmedBladedArticleBundle,
    });

    const visibleText = [
      chase.disclosureSummary,
      chase.safeCourtLine,
      ...chase.items.flatMap((item) => [
        item.label,
        item.baseStatus,
        item.whyItMatters,
        item.evidenceAnchor ?? "",
        item.draftChaseWording,
        item.courtLine,
        ...(item.mergedFrom ?? []),
      ]),
    ].join("\n");

    expect(visibleText).toMatch(/Complete CAD\/999 log/i);
    expect(visibleText).not.toMatch(/999 audio|control-room material/i);

    expect(visibleText).toMatch(/Subscriber \/ account data/i);
    expect(visibleText).not.toMatch(/Full phone download|source export|source extraction|phone extraction/i);

    expect(visibleText).toMatch(/Interview transcript/i);
    expect(visibleText).not.toMatch(/\bInterview recording\b/i);

    expect(visibleText).toMatch(/Final medical\/forensic report/i);
    expect(visibleText).not.toMatch(/Medical \/ expert source report/i);
    expect(visibleText).not.toMatch(/Further papers on the file/i);
    expect(visibleText).not.toMatch(/outstanding source material remains/i);

    const custody = chase.items.find((item) => /custody|PACE/i.test(item.label));
    expect(custody?.baseStatus).toBe("Not safely confirmed");
    expect([custody?.draftChaseWording, custody?.courtLine, custody?.whyItMatters].join("\n")).not.toMatch(
      /full custody record.*(?:outstanding|provide the full custody record|remains missing|remains outstanding)/i,
    );

    const cctvContinuity = chase.items.find((item) => item.familyId === "cctv_continuity");
    if (cctvContinuity) {
      expect(cctvContinuity.baseStatus).toBe("Not safely confirmed");
      expect([cctvContinuity.draftChaseWording, cctvContinuity.courtLine, cctvContinuity.whyItMatters].join("\n")).not.toMatch(
        /appears outstanding|remains outstanding/i,
      );
    }
  });

  it("does not promote CAD or dispatch-only source gaps into 999 audio", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FAMILY-MODALITY-CAD-DISPATCH",
      caseTitle: "CAD dispatch only",
      clientLabel: "CAD dispatch only",
      allegation: "Affray",
      stage: "First appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: ["CAD / 999 audio / control-room material"],
      bundleText: [
        "MG6: CAD / dispatch | not served | fuller narrative attachment.",
        "No 999 audio file or emergency-call recording is listed as served or missing.",
      ].join("\n"),
    });

    const visibleText = [
      chase.disclosureSummary,
      chase.safeCourtLine,
      ...chase.items.flatMap((item) => [
        item.label,
        item.baseStatus,
        item.whyItMatters,
        item.draftChaseWording,
        item.courtLine,
        ...(item.mergedFrom ?? []),
      ]),
    ].join("\n");
    expect(visibleText).toMatch(/CAD \/ dispatch log material/i);
    expect(visibleText).not.toMatch(/999 audio|emergency-call material|control-room material/i);
  });

  it("keeps opposite-direction modalities when the PDF actually establishes them", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-FAMILY-MODALITY-002",
      caseTitle: "Opposite modality pack",
      clientLabel: "Opposite modality pack",
      allegation: "Harassment",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: "2026-07-20T12:30:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: [
        "CAD / 999 audio / control-room material",
        "Full custody record / PACE material",
        "Interview recording",
        "Full phone download / source export",
      ],
      bundleText: [
        "MG6: 999 audio outstanding — not attached.",
        "MG6C: full CAD log print outstanding — not attached.",
        "MG6C: full custody record outstanding — not attached.",
        "MG6C: interview recording outstanding — not attached.",
        "MG6C: full phone download / source export outstanding — not attached.",
      ].join("\n"),
    });

    const visibleText = JSON.stringify(chase);
    expect(visibleText).toMatch(/999 audio/i);
    expect(visibleText).toMatch(/CAD log full print|full CAD log print/i);
    expect(visibleText).toMatch(/Full custody record \/ PACE material/i);
    expect(visibleText).toMatch(/\bInterview recording\b/i);
    expect(visibleText).toMatch(/Full phone download \/ source extraction/i);
  });

  it("freezes buildDisclosureChaseBrief as the single solicitor shortlist owner", () => {
    const chase = buildDisclosureChaseBrief({
      caseId: "CB-SHORTLIST-AUTHORITY",
      caseTitle: "Shortlist authority",
      clientLabel: "Shortlist authority",
      allegation: "Robbery",
      stage: "First appearance",
      hearingStatus: "Listed",
      hearingDateIso: "2026-08-25T10:00:00",
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      proceduralOutstanding: [
        "CCTV continuity / provenance",
        "CCTV full window / master footage",
        "Exhibit mapping / provenance",
        "MG6 / unused / schedule clarification",
      ],
      bundleText: [
        "MG5 summary refers to CCTV stills and a CCTV clip.",
        "Continuity of CCTV sources: to be checked.",
        "The full CCTV window/master footage is not served.",
      ].join("\n"),
    });

    expect(chase.additionalItems).toEqual([]);
    expect(chase.items).toEqual(chase.primaryItems);
    expect(chase.primaryItems.length).toBeGreaterThan(0);
    expect(chase.primaryItems.every((item) => item.baseStatus !== "Received")).toBe(true);
    expect(chase.primaryItems.some((item) => item.baseStatus === "Not safely confirmed")).toBe(true);
    expect(chase.primaryItems.some((item) => item.baseStatus === "Overdue")).toBe(false);
  });

  it("lets source-backed charge wording outrank stale structured matter offence", () => {
    const header = resolveCaseHeaderMetadata({
      snapshot: null,
      matter: {
        defendantName: "Leon Hale",
        allegedOffence: "Fraud by false representation",
        stageDetected: "First appearance",
      },
      sourceCharges: [
        {
          offence: "Murder, contrary to common law",
          statute: null,
          documentRole: "operative",
          confidence: 0.8,
          extracted: true,
          confirmationLabel: "pending",
        },
      ],
    });

    expect(header.allegation).toBe("Murder, contrary to common law");
    expect(header.allegation).not.toMatch(/fraud/i);
  });

  it("keeps genuine structured-only matter offence when no source charge is available", () => {
    const header = resolveCaseHeaderMetadata({
      snapshot: null,
      matter: {
        defendantName: "Layla Davies",
        allegedOffence: "Fraud by false representation",
        stageDetected: "First appearance",
      },
      sourceCharges: [],
    });

    expect(header.allegation).toBe("Fraud by false representation");
  });

  it("does not let a superseded source charge overwrite the current structured offence", () => {
    const header = resolveCaseHeaderMetadata({
      snapshot: null,
      matter: {
        defendantName: "Priya Shah",
        allegedOffence: "Theft from shop",
        stageDetected: "First appearance",
      },
      sourceCharges: [
        {
          offence: "Earlier fraud allegation",
          statute: null,
          documentRole: "superseded",
          confidence: 0.9,
          extracted: true,
          confirmationLabel: "confirmed",
        },
      ],
    });

    expect(header.allegation).toBe("Theft from shop");
    expect(header.allegation).not.toMatch(/fraud/i);
  });
});
