import { describe, expect, it } from "vitest";

import {
  buildReceipt,
  classifySourceClass,
  hardBucketFor,
  inferOutputType,
  looksFactual,
  softBucketFor,
  staleAgainstFile,
} from "./case-truth-trace-receipt";
import { classifyOutput, detectCrossSurfaceDisagreements, detectStaleStateOutputs, findSourceMatch } from "./case-truth-trace";

describe("case truth trace", () => {
  it("flags served/outstanding contradictions in one solicitor-facing line", () => {
    const result = classifyOutput("Full 999 audio is served but outstanding and should be chased", "999 audio not yet served");

    expect(result.verdict).toBe("WRONG");
    expect(result.flags).toContain("served_and_outstanding_same_line");
    expect(hardBucketFor("served_and_outstanding_same_line")).toBe("incorrect_evidence_status");
  });

  it("flags phone output when the source only names stolen property", () => {
    const result = classifyOutput(
      "Full phone download / source extraction - solicitor review",
      "Property stolen: iPhone handset. No device extraction is listed.",
    );

    expect(result.verdict).toBe("WRONG");
    expect(result.flags).toContain("phone_output_without_phone_source");
    expect(hardBucketFor("phone_output_without_phone_source")).toBe("incorrect_provenance");
  });

  it("does not flag phone output when the source names extraction material", () => {
    const result = classifyOutput(
      "Full phone download / source extraction - solicitor review",
      "TEL/5 Phone extraction report - not yet served.",
    );

    expect(result.flags).not.toContain("phone_output_without_phone_source");
  });

  it("marks generic furniture as pointless rather than a root truth inversion", () => {
    const result = classifyOutput(
      "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.",
      "MG6/04 CCTV continuity outstanding.",
    );

    expect(result.verdict).toBe("POINTLESS");
    expect(result.flags).toContain("generic_solicitor_clutter");
    expect(softBucketFor("generic_solicitor_clutter")).toBe("generic_boilerplate_clutter");
    expect(hardBucketFor("generic_solicitor_clutter")).toBeNull();
  });

  it("finds a source line by schedule reference", () => {
    const match = findSourceMatch(
      "MG6/04 bank source statements Outstanding",
      "MG6/03 Custody record Served\nMG6/04 bank source statements Outstanding Not in papers supplied",
    );

    expect(match.method).toBe("ref");
    expect(match.quote).toContain("MG6/04 bank source statements Outstanding");
  });
});

describe("receipt mode", () => {
  it("builds a full receipt for a source-backed schedule row", () => {
    const { receipt, sourceClass } = buildReceipt({
      text: "MG6/04 bank source statements Outstanding",
      path: "casebrain-output.json:$.fiveAnswersEvidenceRows[0].label",
      surface: "papers",
      refs: ["MG6/04"],
      sourceMethod: "ref",
      sourceQuote: "MG6/04 bank source statements Outstanding Not in papers supplied",
      sourceText: "MG6/04 bank source statements Outstanding Not in papers supplied",
      confidence: 0.95,
    });

    expect(sourceClass).toBe("source_backed");
    expect(receipt.outputType).toBe("inventory_row");
    expect(receipt.truthState).toBe("outstanding");
    expect(receipt.sourceRef).toBe("MG6/04");
    expect(receipt.supportingText).toContain("MG6/04");
    expect(receipt.transformation).toBeTruthy();
    expect(receipt.finalWording).toBe(receipt.output);
    expect(receipt.guard).toContain("source-backed");
  });

  it("fails factual output that has no source class or explanation", () => {
    const { receipt, sourceClass } = buildReceipt({
      text: "The knife is served and proves identification.",
      path: "casebrain-output.json:$.courtNote.text",
      surface: "court",
      refs: [],
      sourceMethod: "none",
      sourceText: "Charge: theft of a bicycle. No knife is mentioned.",
      confidence: 0,
    });

    expect(looksFactual(receipt.outputType, receipt.output)).toBe(true);
    expect(sourceClass).toBe("unsupported");
    expect(receipt.sourceClass).toBe("unsupported");
    expect(receipt.guard).toMatch(/fail/i);
  });

  it("classifies a gap as derived_from_absence when the source states it is not served", () => {
    const sourceClass = classifySourceClass({
      text: "Phone extraction is outstanding",
      path: "$.evidenceStates[0].label",
      outputType: "evidence_status",
      sourceMethod: "none",
      sourceText: "TEL/5 Phone extraction report - not yet served.",
    });

    expect(sourceClass).toBe("derived_from_absence");
  });

  it("classifies Full 999 audio as generated from the schedule-backed CAD/999 gap", () => {
    const sourceClass = classifySourceClass({
      text: "Full 999 audio Not yet served",
      path: "$.overview",
      outputType: "evidence_status",
      sourceMethod: "none",
      sourceText: "EX-MUR-012 CAD and 999 summaries Original audio/log outstanding",
    });

    expect(sourceClass).toBe("generated_from_missing_expected_material");
  });

  it("classifies chase furniture as procedural_instruction", () => {
    expect(inferOutputType("ui", "chase", "Copy CPS chase")).toBe("furniture");
    expect(
      classifySourceClass({
        text: "Please provide the CCTV or confirm in writing why it is not available.",
        path: "$.copySuggestion",
        outputType: "chase_request",
        sourceMethod: "none",
        sourceText: null,
      }),
    ).toBe("procedural_instruction");
    expect(
      classifySourceClass({
        text: "Not safely confirmed",
        path: "$.baseStatus",
        outputType: "provenance",
        sourceMethod: "none",
        sourceText: null,
      }),
    ).toBe("procedural_instruction");
  });

  it("does not mix soft clutter into a hard bucket", () => {
    expect(hardBucketFor("generic_solicitor_clutter")).toBeNull();
    expect(hardBucketFor("compound_mixed_status_output")).toBeNull();
    expect(hardBucketFor("furniture_copy_button_noise")).toBeNull();
    expect(softBucketFor("compound_mixed_status_output")).toBe("weak_wording");
  });
});

describe("cross-surface and stale roots", () => {
  it("flags the same family when Overview, Papers and Chase disagree", () => {
    const lines = detectCrossSurfaceDisagreements([
      fakeLine("hale", "overview", "CAD and 999 summaries Original audio/log", "missing"),
      fakeLine("hale", "papers", "CAD and 999 summaries Original audio/log Served", "served"),
      fakeLine("hale", "chase", "CAD and 999 summaries Original audio/log Not safely confirmed", "not_safely_confirmed"),
    ]);

    expect(lines.some((line) => line.flags.includes("cross_surface_disagreement"))).toBe(true);
    expect(hardBucketFor("cross_surface_disagreement")).toBe("cross_surface_disagreement");
  });

  it("does not flag matching outstanding statuses across surfaces", () => {
    const lines = detectCrossSurfaceDisagreements([
      fakeLine("hale", "overview", "CAD and 999 summaries Original audio/log Outstanding", "outstanding"),
      fakeLine("hale", "chase", "CAD and 999 summaries Original audio/log Missing", "missing"),
    ]);

    expect(lines).toHaveLength(0);
  });

  it("flags generated wording that is stale against the current File packet", () => {
    const file = "EX-MUR-012 CAD and 999 summaries Original audio/log outstanding. Charge sheet served EX-MUR-001.";
    expect(staleAgainstFile("Outstanding phone, and, Full 999 audio Not yet served", file)).toBe(true);

    const lines = detectStaleStateOutputs([
      {
        ...fakeLine("14823d9e-1f0f-4cfc-af01-e6595d1cdfc4", "file", "EX-MUR-012 CAD and 999 summaries Original audio/log outstanding", "outstanding"),
        text: "EX-MUR-012 CAD and 999 summaries Original audio/log outstanding",
      },
      fakeLine(
        "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
        "client",
        "The defence asks the court to record that Outstanding phone, and, Full 999 audio remain outstanding.",
        "outstanding",
      ),
    ]);

    expect(lines.some((line) => line.flags.includes("stale_state_output"))).toBe(true);
  });

  it("treats a stuck Client Summary build as stale-state output", () => {
    expect(staleAgainstFile("Building matter brief…", "EX-MUR-012 CAD and 999 summaries")).toBe(true);
    expect(staleAgainstFile("Building matter brief…", null)).toBe(true);
  });
});

function fakeLine(
  caseId: string,
  surface: string,
  text: string,
  truthState: "served" | "outstanding" | "missing" | "not_safely_confirmed",
) {
  const { receipt } = buildReceipt({
    text,
    path: `${surface}.txt`,
    surface,
    refs: [],
    sourceMethod: "token",
    sourceQuote: text,
    sourceText: text,
    confidence: 0.5,
  });
  receipt.truthState = truthState;
  return {
    id: `${caseId}:${surface}:${text.slice(0, 12)}`,
    sourceKind: "live-tab-capture" as const,
    caseId,
    surface,
    path: `${surface}.txt`,
    text,
    refs: [] as string[],
    sourceMatch: { method: "token" as const, confidence: 0.5, quote: text },
    verdict: "CHECK" as const,
    flags: [] as string[],
    receipt,
    gold20: true,
  };
}
