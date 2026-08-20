/**
 * Overview live-proof + intelligence cleanup regressions.
 * Covers negation, interview over-trigger, order-breach, motoring,
 * ranking/dedupe, Overview epistemic split, advisory≠factual, advisory≠Chase.
 */
import { describe, expect, it } from "vitest";
import {
  buildLegalIntelligence,
  considerationsForSurface,
  familyPositivelyMentioned,
  evidenceMentionStatus,
} from "../lib/criminal/legal-intelligence";
import { buildCaseMoves, detectSignals } from "../lib/criminal/case-moves-engine";
import { familySupport } from "@/lib/criminal/chase-source-gate";
import { PATEL_SOURCE_BUNDLE } from "../lib/criminal/legal-intelligence/fixtures/patel-source";
import { countAuthoritativeEvidenceRows } from "../lib/criminal/overview-presentation";
import type { FiveAnswersEvidenceRow } from "../lib/criminal/five-answers/types";
import { evidenceMentionStatus } from "../lib/criminal/legal-intelligence/evidence-mention";

describe("negation-aware evidence mentions", () => {
  const negated = "Screenshots served.\nFull phone download outstanding.\nNo BWV. No CCTV.";

  it("NEGATED_EVIDENCE_MENTION_MUST_NOT_TRIGGER_POSITIVE_FAMILY_CONSIDERATION", () => {
    expect(evidenceMentionStatus("bwv", negated)).toBe("negated");
    expect(evidenceMentionStatus("cctv", negated)).toBe("negated");
    expect(familyPositivelyMentioned("bwv", negated)).toBe(false);
    expect(familyPositivelyMentioned("cctv", negated)).toBe(false);

    const li = buildLegalIntelligence({
      caseId: "PROOF-02",
      allegation: "Harassment",
      bundleText: negated,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/attribution|download|screenshot/i);
    expect(what).not.toMatch(/confirm(?:ing)? BWV status|BWV will be used|clip\/master|CCTV stills/i);
    expect(what).not.toMatch(/Consider distinguishing CCTV/i);
    expect(li.notEstablished.some((n) => /BWV missing/i.test(n.label))).toBe(true);
  });

  it("positive BWV/CCTV mentions still fire considerations", () => {
    const positive =
      "Charge: Affray\nBWV referred on schedule but not served — outstanding.\nCCTV stills served; master outstanding.";
    expect(familySupport("bwv", positive)).toBe("mentioned");
    expect(familySupport("cctv", positive)).toBe("mentioned");
    const li = buildLegalIntelligence({
      caseId: "POS-MEDIA",
      allegation: "Affray",
      bundleText: positive,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/BWV/i);
    expect(what).toMatch(/CCTV|clip|master/i);
  });

  it("NEGATED_SERVICE_STATUS_MUST_NOT_HIDE_EXISTING_EVIDENCE", () => {
    const mixed =
      "No BWV.\nFull CCTV master footage/export log outstanding.\nCharge: Theft";
    expect(familySupport("bwv", mixed)).toBe("negated");
    expect(familySupport("cctv", mixed)).toBe("mentioned");
    const li = buildLegalIntelligence({
      caseId: "MIX-MEDIA",
      allegation: "Theft",
      bundleText: mixed,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/CCTV|clip|master/i);
    expect(what).not.toMatch(/confirm(?:ing)? BWV status/i);
    expect(li.established.some((f) => /CCTV master/i.test(f.value))).toBe(true);
  });
});

describe("interview Case Moves over-trigger", () => {
  it("does not fire interview disclosure from custody/offence alone", () => {
    const signals = detectSignals({
      caseId: "NO-INT",
      allegation: "Assault on emergency worker",
      offenceType: "Assault emergency worker",
      bundleTextPreview: [
        "Jordan Hale",
        "Charge: Assault on emergency worker",
        "Custody extract served (PACE clock summary).",
        "BWV referred on schedule but not served — outstanding.",
        "Interview recording not mentioned.",
      ].join("\n"),
      outstandingEvidence: ["BWV outstanding"],
      servedEvidence: ["Custody extract"],
    });
    expect(signals.some((s) => s.id === "signal:interview-missing")).toBe(false);

    const moves = buildCaseMoves({
      caseId: "NO-INT",
      allegation: "Assault on emergency worker",
      bundleTextPreview: "Custody extract served. BWV outstanding. Interview recording not mentioned.",
      outstandingEvidence: ["BWV outstanding"],
    });
    expect(moves.moves.some((m) => m.id === "move:disclosure-interview")).toBe(false);
  });

  it("does fire when interview recording/transcript is indicated outstanding", () => {
    const signals = detectSignals({
      caseId: "YES-INT",
      allegation: "Affray",
      outstandingEvidence: ["Full interview recording/transcript outstanding"],
      servedEvidence: ["Interview summary"],
      bundleTextPreview: PATEL_SOURCE_BUNDLE.slice(0, 1500),
    });
    expect(signals.some((s) => s.id === "signal:interview-missing")).toBe(true);
  });

  it("does not treat 'Interview recording not mentioned' as positive interview engagement", () => {
    const text =
      "Custody extract served.\nBWV outstanding.\nInterview recording not mentioned.";
    expect(evidenceMentionStatus("interview", text)).toBe("absent");
    const li = buildLegalIntelligence({
      caseId: "NO-INT-MENTION",
      allegation: "Assault emergency worker",
      bundleText: text,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).not.toMatch(/separating interview summary vs full recording/i);
    expect(what).not.toMatch(/full interview record \(recording \+ ROTI/i);
  });
});

describe("order-breach and motoring intelligence", () => {
  it("PROOF-08: emits order/service/MG11 considerations without inventing media", () => {
    const bundle = [
      "Elena Marsh",
      "Charge: Breach of restraining order",
      "Order extract served.",
      "Sealed order / proof of service outstanding.",
      "Complainant MG11 outstanding.",
    ].join("\n");
    const li = buildLegalIntelligence({
      caseId: "PROOF-08",
      allegation: "Breach of restraining order",
      bundleText: bundle,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/order|prohibition|service|knowledge|MG11/i);
    expect(what).toMatch(/service|sealed|knowledge/i);
    expect(familySupport("bwv", bundle)).toBe("absent");
    expect(familySupport("cctv", bundle)).toBe("absent");
    expect(li.considerations.every((c) => c.supportClass === "PRACTITIONER_CONSIDERATION")).toBe(true);
    // No generic interview disclosure when interview unmentioned
    expect(what).not.toMatch(/full interview record \(recording \+ ROTI/i);
  });

  it("PROOF-11: emits driving-standard / dashcam advisory from facts", () => {
    const bundle = [
      "Ella Shaw",
      "Charge: Dangerous driving",
      "NIP / s.172 notice served.",
      "Dashcam clip referred; full export outstanding.",
    ].join("\n");
    const li = buildLegalIntelligence({
      caseId: "PROOF-11",
      allegation: "Dangerous driving",
      bundleText: bundle,
    });
    const what = li.considerations.map((c) => c.what).join("\n");
    expect(what).toMatch(/driving|careful and competent|dashcam|export|NIP|s\.?\s*172/i);
    expect(familySupport("interview", bundle)).toBe("absent");
    expect(what).not.toMatch(/full interview record \(recording \+ ROTI/i);
  });
});

describe("generic Case Moves ranking / dedupe", () => {
  it("ranks case-specific considerations before generic boilerplate", () => {
    const li = buildLegalIntelligence({
      caseId: "RANK",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
      outstandingEvidence: [
        "Full CCTV master footage/export log outstanding",
        "Custody record pages 3-5 outstanding",
        "Final signed MG11 outstanding",
        "Full interview recording/transcript outstanding",
      ],
      servedEvidence: ["Interview summary", "CCTV stills referred"],
    });
    const ids = li.considerations.map((c) => c.id);
    const firstGeneric = ids.findIndex((id) =>
      /no-safe-strategy|disclosure-exhibit-list/.test(id),
    );
    const firstSpecific = ids.findIndex(
      (id) =>
        id.startsWith("consider:") ||
        id.startsWith("rls:") ||
        id.startsWith("fight:") ||
        /disclosure-cctv|self-defence|interview-modality|clip/.test(id),
    );
    if (firstGeneric >= 0 && firstSpecific >= 0) {
      expect(firstSpecific).toBeLessThan(firstGeneric);
    }
    // Semantic dedupe: not multiple clip/master variants
    const clipish = li.considerations.filter((c) =>
      /clip|master|stills/i.test(c.what),
    );
    expect(clipish.length).toBeLessThanOrEqual(2);
  });
});

describe("CPS Chase hard-gate + advisory ≠ factual counters", () => {
  it("considerationsForSurface cps_chase is always empty", () => {
    const li = buildLegalIntelligence({
      caseId: "CHASE",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    expect(considerationsForSurface(li, "cps_chase")).toEqual([]);
  });

  it("advisory on does not change canonical evidence row counts", () => {
    const rows: FiveAnswersEvidenceRow[] = [
      { label: "CCTV stills", existence: "served", reliability: "needs_review" },
      { label: "CCTV master", existence: "missing", reliability: "needs_review" },
      { label: "Interview summary", existence: "served", reliability: "needs_review" },
      { label: "Interview transcript", existence: "incomplete", reliability: "needs_review" },
      { label: "MG11", existence: "referred_only", reliability: "needs_review" },
    ];
    const before = countAuthoritativeEvidenceRows(rows);
    // Building LI must not mutate rows / counts
    buildLegalIntelligence({
      caseId: "COUNTS",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
      servedEvidence: rows.filter((r) => r.existence === "served").map((r) => r.label),
      outstandingEvidence: rows
        .filter((r) => r.existence !== "served")
        .map((r) => r.label),
    });
    const after = countAuthoritativeEvidenceRows(rows);
    expect(after).toEqual(before);
    expect(after.served).toBe(2);
    expect(after.missing + after.incomplete + after.referred + after.notSafelyConfirmed).toBeGreaterThan(0);
  });
});

describe("Overview epistemic wiring contract", () => {
  it("exposes overview considerations with PRACTITIONER_CONSIDERATION only", () => {
    const li = buildLegalIntelligence({
      caseId: "OV",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    const overview = considerationsForSurface(li, "overview");
    expect(overview.length).toBeGreaterThan(0);
    expect(overview.every((c) => c.supportClass === "PRACTITIONER_CONSIDERATION")).toBe(true);
    expect(overview.every((c) => c.allowedSurfaces.includes("overview"))).toBe(true);
    // Patel-labelled themes still present
    const what = overview.map((c) => c.what).join("\n");
    expect(what).toMatch(/self-defence|first-contact/i);
    expect(what).toMatch(/CAD|control-room/i);
    expect(what).toMatch(/clip|master|stills|interview/i);
  });
});
