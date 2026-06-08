import { describe, it, expect } from "vitest";
import { detectViolentChargeCandidates } from "../detectChargeCandidates";
import { selectViolentEvidenceProfiles } from "../evidenceMapsViolent";
import { buildCriminalViolentBeastMode } from "../violentBeastMode";
import { getEvidenceMap } from "@/lib/strategic/evidence-maps";

describe("Criminal — Violent Offences Beast Mode", () => {
  it("detects knife/stabbing signals as soft charge candidates and procedural signals", () => {
    const out = detectViolentChargeCandidates({
      documents: [
        {
          id: "d1",
          name: "Police report",
          created_at: "2025-11-01T10:00:00Z",
          extracted_json: "Victim was stabbed with a knife. CCTV available. BWV attended. MG6 schedule referenced.",
        },
      ],
      timeline: [{ date: "2025-10-31", description: "999 call reporting stabbing" }],
    });

    expect(out.candidates.some((c) => c.chargeId === "possession_bladed_article")).toBe(true);
    expect(out.candidates.some((c) => c.chargeId === "gbh_s20")).toBe(true);
    expect(out.proceduralSignals.some((s) => s.id === "cctv")).toBe(true);
    expect(out.proceduralSignals.some((s) => s.id === "bwv")).toBe(true);
    expect(out.proceduralSignals.some((s) => s.id === "disclosure_schedule")).toBe(true);
  });

  it("detects non-fatal strangulation and domestic context as soft signals", () => {
    const out = detectViolentChargeCandidates({
      documents: [
        {
          id: "d1",
          name: "Statement",
          created_at: "2025-10-01T10:00:00Z",
          extracted_json: "He strangled me, I couldn't breathe. Domestic incident. Neck pain and voice change noted.",
        },
      ],
      timeline: [{ date: "2025-10-01", description: "Police attended domestic incident" }],
    });

    expect(out.candidates.some((c) => c.chargeId === "non_fatal_strangulation")).toBe(true);
    expect(out.contextTags.some((t) => t.tag === "domestic_context" && t.confidence > 0)).toBe(true);
  });

  it("selects offence-aware evidence profiles for knife violence", () => {
    const out = detectViolentChargeCandidates({
      documents: [
        {
          id: "d1",
          name: "Stabbing summary",
          created_at: "2025-11-01T10:00:00Z",
          extracted_json: "Stab wound. Knife used. CCTV footage mentioned.",
        },
      ],
    });

    const selected = selectViolentEvidenceProfiles({
      candidates: out.candidates,
      contextTags: out.contextTags,
    });

    expect(selected.profiles.length).toBeGreaterThan(0);
    expect(selected.profiles.some((p) => p.key === "knife_violence")).toBe(true);
    expect(selected.expectedEvidence.length).toBeGreaterThan(0);
  });

  it("builds criminal Beast Mode output with completeness + advanced safety gates", () => {
    const input = {
      caseId: "case-1",
      practiceArea: "criminal",
      documents: [
        {
          id: "d1",
          name: "CCTV note",
          created_at: "2025-11-01T10:00:00Z",
          extracted_json: "CCTV footage exists but only clip served. Continuity log not provided.",
        },
        {
          id: "d2",
          name: "Custody log reference",
          created_at: "2025-11-02T10:00:00Z",
          extracted_json: "Custody record requested. Interview recording pending. MG6A schedule awaited.",
        },
      ],
      timeline: [{ date: "2025-10-31", description: "999 call reporting stabbing with a knife" }],
    } as const;

    const built = buildCriminalViolentBeastMode({
      input: input as any,
      evidenceMap: getEvidenceMap("criminal"),
    });

    expect(built.beastMode.confidenceAndCompletenessLine.length).toBeGreaterThan(10);
    expect(built.beastMode.bundleCompleteness.band).toBeDefined();
    expect(built.beastMode.chargeStabilityIndex.guardrail.toLowerCase()).toContain("not a prediction");
    expect(built.beastMode.advanced?.expertPrematurityGate).toBeDefined();
    expect(built.beastMode.advanced?.ifIWereTheJudgeSummary.length).toBeGreaterThan(20);
  });
});


