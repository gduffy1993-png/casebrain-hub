/**
 * Legal intelligence recovery — permanent regression wall.
 * Proves: old knowledge preserved as advisory; unsafe authority not restored;
 * canonical wins; explicit source facts not over-conservatively lost.
 */
import { describe, expect, it } from "vitest";
import {
  attemptSafePromotion,
  buildLegalIntelligence,
  considerationsForSurface,
  offenceTypeCannotCreateEvidenceTruth,
} from "../lib/criminal/legal-intelligence";
import { PATEL_SOURCE_BUNDLE } from "../lib/criminal/legal-intelligence/fixtures/patel-source";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { familySupport } from "../lib/criminal/chase-source-gate";
import { buildCaseMoves } from "../lib/criminal/case-moves-engine";

describe("legal-intelligence recovery regression wall", () => {
  it("Patel: establishes source facts and keeps unsafe claims NOT established", () => {
    const li = buildLegalIntelligence({
      caseId: "7e763777-94a8-4958-a190-a35ef6ddb259",
      allegation: "Affray",
      offenceType: "Affray",
      currentStage: "First Appearance",
      bundleText: PATEL_SOURCE_BUNDLE,
      outstandingEvidence: [
        "Full CCTV master footage/export log outstanding",
        "Custody record pages 3-5 outstanding",
        "Final signed MG11 outstanding",
        "Full interview recording/transcript outstanding",
      ],
      servedEvidence: ["Interview summary", "CCTV stills referred"],
    });

    const establishedText = li.established.map((f) => `${f.label}:${f.value}`).join("\n");
    expect(establishedText).toMatch(/Affray/i);
    expect(establishedText).toMatch(/Southford Magistrates/i);
    expect(establishedText).toMatch(/25 August 2026/i);
    expect(establishedText).toMatch(/CCTV master/i);
    expect(establishedText).toMatch(/Custody record pages 3-5/i);
    expect(establishedText).toMatch(/signed MG11/i);
    expect(establishedText).toMatch(/interview recording|transcript/i);

    const notLabels = li.notEstablished.map((n) => n.label).join(" | ");
    expect(notLabels).toMatch(/999 audio outstanding/i);
    expect(notLabels).toMatch(/medical evidence missing/i);
    expect(notLabels).toMatch(/BWV missing/i);
    expect(notLabels).toMatch(/CCTV continuity missing/i);
    expect(notLabels).toMatch(/self-defence as established live case position/i);

    // Sensible considerations still present
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/self-defence|first-contact/i);
    expect(what).toMatch(/CAD|call or control-room|control-room/i);
    expect(what).toMatch(/BWV/i);
    expect(what).toMatch(/clip|master|stills/i);
    expect(what).toMatch(/interview/i);

    // All considerations are advisory
    expect(li.considerations.every((c) => c.supportClass === "PRACTITIONER_CONSIDERATION")).toBe(
      true,
    );
    expect(li.firewall.mayAutoCreateChaseItems).toBe(false);
    expect(li.firewall.mayChangeCanonicalEvidenceState).toBe(false);
  });

  it("Patel: advisory never becomes CPS chase items; chase stays source-gated", () => {
    const li = buildLegalIntelligence({
      caseId: "CB-PATEL-LI",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    expect(considerationsForSurface(li, "cps_chase")).toEqual([]);

    const brief = buildDisclosureChaseBrief({
      caseId: "CB-PATEL-LI",
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
        "Full CCTV master footage/export log outstanding",
        "Full phone download outstanding",
        "Medical/injury material outstanding",
        "BWV outstanding",
        "999 audio outstanding",
      ],
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    const labels = brief.items.map((i) => i.label).join("\n");
    expect(labels).toMatch(/CCTV/i);
    expect(labels).not.toMatch(/\bphone download\b/i);
    expect(labels).not.toMatch(/\bmedical\b/i);
    expect(labels).not.toMatch(/\bBWV\b/i);
    // CAD may appear (source-backed). 999 audio must not be a standalone chase label.
    expect(labels).not.toMatch(/^999 audio/im);
    expect(li.notEstablished.some((n) => /999 audio outstanding/i.test(n.label))).toBe(true);
  });

  it("OLD KNOWLEDGE: case moves engine still generates structured moves", () => {
    const moves = buildCaseMoves({
      caseId: "CB-MOVES",
      allegation: "Assault occasioning actual bodily harm",
      offenceType: "ABH",
      outstandingEvidence: ["Full CCTV outstanding", "MG11 outstanding"],
      servedEvidence: ["Partial CCTV clip"],
      strategySummary: "Self-defence raised; identification in issue",
      interviewSummary: "No comment interview",
    });
    expect(moves.moves.length).toBeGreaterThan(0);
    expect(moves.moves.some((m) => m.category === "disclosure" || m.category === "self_defence")).toBe(
      true,
    );
    const li = buildLegalIntelligence({
      caseId: "CB-MOVES",
      allegation: "Assault occasioning actual bodily harm",
      outstandingEvidence: ["Full CCTV outstanding", "MG11 outstanding"],
      strategySummary: "Self-defence raised",
      bundleText: "ABH. Self-defence raised. Full CCTV outstanding. MG11 outstanding.",
    });
    expect(li.considerations.some((c) => c.recoverySource === "case_moves_engine_6de1c4c24")).toBe(
      true,
    );
  });

  it("OLD UNSAFE AUTHORITY: offence type alone cannot create evidence truth", () => {
    expect(offenceTypeCannotCreateEvidenceTruth("Affray", "BWV missing")).toBe(true);
    const promo = attemptSafePromotion({
      considerationId: "consider:bwv-may-exist",
      sourceText: "Charge: Affray",
      proposedFactLabel: "BWV outstanding",
    });
    expect(promo.promoted).toBe(false);
    expect(promo.supportClass).toBe("PRACTITIONER_CONSIDERATION");
  });

  it("SAFE PROMOTION: source support promotes consideration to fact class", () => {
    const promo = attemptSafePromotion({
      considerationId: "consider:bwv-source-mentioned",
      sourceText: "BWV from PC Smith remains outstanding and has not been served.",
      proposedFactLabel: "BWV outstanding",
    });
    expect(promo.promoted).toBe(true);
    if (promo.promoted) {
      expect(promo.supportClass).toBe("SOURCE_FACT");
    }
  });

  it("CANONICAL WINS: absent families stay absent despite offence-shape considerations", () => {
    expect(familySupport("bwv", PATEL_SOURCE_BUNDLE)).toBe("absent");
    expect(familySupport("medical", PATEL_SOURCE_BUNDLE)).toBe("absent");
    expect(familySupport("phone", PATEL_SOURCE_BUNDLE)).toBe("absent");
    const li = buildLegalIntelligence({
      caseId: "CB-PATEL",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    // Considerations may mention BWV/medical as questions — not as established outstanding
    const notEst = li.notEstablished.map((n) => n.label);
    expect(notEst.some((l) => /BWV missing/i.test(l))).toBe(true);
    expect(notEst.some((l) => /medical evidence missing/i.test(l))).toBe(true);
  });

  it("EXPLICIT FACTS NOT LOST: CCTV master outstanding remains established", () => {
    const li = buildLegalIntelligence({
      caseId: "CB-PATEL",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    expect(
      li.established.some((f) => /CCTV master|full CCTV master/i.test(f.value)),
    ).toBe(true);
    expect(familySupport("cctv", PATEL_SOURCE_BUNDLE)).toBe("mentioned");
    expect(familySupport("interview", PATEL_SOURCE_BUNDLE)).toBe("mentioned");
  });
});
