import { describe, expect, it } from "vitest";

import {
  buildClientPacketFacts,
  buildClientPacketSummary,
  buildFamilyStatusOwner,
  classifyEvidenceSubFamily,
} from "../lib/criminal/evidence-family-owner";

describe("evidence family owner", () => {
  it("splits interview summary from full interview recording/transcript", () => {
    expect(classifyEvidenceSubFamily("Interview summary served")).toBe("interview_summary");
    expect(classifyEvidenceSubFamily("full interview records remain outstanding")).toBe("interview_full");
    expect(classifyEvidenceSubFamily("Interview summary Full recording/transcript outstanding")).toBe(
      "interview_full",
    );
    expect(
      classifyEvidenceSubFamily("until the full custody and interview material is served"),
    ).toBe("interview_summary");
  });

  it("splits CCTV stills from master/continuity", () => {
    expect(classifyEvidenceSubFamily("EX-MUR-010 CCTV Still Stairwell Served")).toBe("cctv_stills");
    expect(classifyEvidenceSubFamily("CCTV stills and timing note Master footage outstanding")).toBe(
      "cctv_master",
    );
  });

  it("splits CAD summary from 999 audio", () => {
    expect(classifyEvidenceSubFamily("O02 CAD log full print outstanding")).toBe("cad_summary");
    expect(classifyEvidenceSubFamily("Full 999 audio Not yet served")).toBe("cad_999_audio");
    expect(classifyEvidenceSubFamily("CAD and 999 summaries Original audio/log outstanding")).toBe(
      "cad_999_audio",
    );
    expect(classifyEvidenceSubFamily("CAD / 999 material is not safely confirmed")).toBe("cad_summary");
  });

  it("splits phone contact/property from phone download/subscriber", () => {
    expect(classifyEvidenceSubFamily("Property stolen: iPhone handset")).toBe("phone_contact");
    expect(classifyEvidenceSubFamily("Full phone download / source extraction outstanding")).toBe(
      "phone_download",
    );
  });

  it("rebuilds client summary from the current packet instead of leftover brief text", () => {
    const text = buildClientPacketSummary({
      allegation: "Murder, contrary to common law",
      rows: [
        { label: "EX-MUR-012 CAD and 999 summaries Original audio/log", status: "outstanding", scheduleRef: "EX-MUR-012" },
        { label: "Charge sheet extract", status: "served", scheduleRef: "EX-MUR-001" },
      ],
    });
    expect(text).toMatch(/provisional client update from the current papers/i);
    expect(text).not.toMatch(/Building matter brief/i);
    expect(text).toMatch(/CAD and 999 summaries/i);
  });

  it("lets a served or outstanding row own the family over a vague review row", () => {
    const owner = buildFamilyStatusOwner([
      { label: "This bundle contains interview summary", status: "unclear", scheduleRef: null },
      { label: "Interview summary", status: "served", scheduleRef: "MG15/01" },
      { label: "Full phone download referred only", status: "unclear", scheduleRef: null },
      { label: "Full phone download / source extraction", status: "outstanding", scheduleRef: "TEL/5" },
    ]);
    expect(owner.get("interview_summary")?.status).toBe("served");
    expect(owner.get("phone_download")?.status).toBe("outstanding");
    const facts = buildClientPacketFacts([
      { label: "This bundle contains interview summary", status: "unclear", scheduleRef: null },
      { label: "Interview summary", status: "served", scheduleRef: "MG15/01" },
    ]);
    expect(facts.join(" ")).toMatch(/Interview summary — on the papers/i);
    expect(facts.join(" ")).not.toMatch(/This bundle contains/i);
  });
});
