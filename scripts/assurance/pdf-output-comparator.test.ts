import { describe, expect, it } from "vitest";
import { compareTruthToApp, extractSourceTruth } from "./pdf-output-comparator";

const ahmedSource = [
  "Defendant: Holly Ahmed",
  "Court: Crown Court at Preston",
  "Next hearing: 20 July 2026 at 12:30",
  "Stage: Trial prep",
  "Charge: Possession of a bladed article.",
  "Interview summary is on file. This is not a full transcript. Transcript: not in this section.",
  "Custody record extract: arrival and risk assessment opened. Appropriate adult / interpreter entry unclear.",
  "MG6: complete CAD/999 log outstanding — not attached.",
  "Medical / forensic note: short note records injury or forensic issue. Final report not included.",
  "Exhibit list: CCTV export log short note. Continuity label unclear.",
  "MG6C: phone subscriber data outstanding — not attached.",
].join("\n");

describe("pdf output comparator", () => {
  it("flags unsupported app family promotion against source truth", () => {
    const truth = extractSourceTruth("ahmed", ahmedSource, {
      expectedChaseItems: ["Final medical/forensic report"],
    });

    const compared = compareTruthToApp(truth, {
      caseIdentity: { clientLabel: "Holly Ahmed" },
      caseTitle: "Holly Ahmed",
      evidenceStates: [
        { label: "Full phone download / source export", baseStatus: "Outstanding" },
        { label: "CAD / 999 audio / control-room material", baseStatus: "Overdue" },
        { label: "Interview transcript", baseStatus: "served" },
        { label: "CCTV Continuity / provenance", baseStatus: "Overdue" },
      ],
    });

    expect(compared.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        "UNSUPPORTED_EVIDENCE_FAMILY",
        "SUMMARY_TREATED_AS_FULL_RECORD",
        "UNCLEAR_PROMOTED_TO_MISSING_OR_DEADLINE",
        "EXPECTED_MISSING_NOT_CHASED",
      ]),
    );
    expect(compared.findings.some((f) => f.severity === "P0")).toBe(true);
  });

  it("does not flag the source-bound corrected version", () => {
    const truth = extractSourceTruth("ahmed", ahmedSource, {
      expectedChaseItems: ["Final medical/forensic report"],
    });

    const compared = compareTruthToApp(truth, {
      caseIdentity: { clientLabel: "Holly Ahmed" },
      caseTitle: "Holly Ahmed",
      evidenceStates: [
        { label: "Subscriber / account data", baseStatus: "Outstanding" },
        { label: "Complete CAD/999 log", baseStatus: "Overdue" },
        { label: "Interview transcript", baseStatus: "Outstanding" },
        { label: "CCTV Continuity / provenance", baseStatus: "Not safely confirmed" },
        { label: "Final medical/forensic report", baseStatus: "Outstanding" },
      ],
    });

    const serious = compared.findings.filter((f) => f.severity === "P0" || f.severity === "P1");
    expect(serious).toEqual([]);
  });

  it("treats missing app output as coverage only, not identity failure", () => {
    const truth = extractSourceTruth(
      "no-output",
      ["Defendant: Morgan Ellis", "Charge: Theft", "MG6: CCTV master outstanding."].join("\n"),
      {},
    );

    const compared = compareTruthToApp(truth, null);

    expect(compared.digest.outputHash).toBeNull();
    expect(compared.findings).toHaveLength(1);
    expect(compared.findings[0]?.code).toBe("APP_OUTPUT_NOT_ON_DISK");
  });

  it("normalises markdown defendant labels before identity comparison", () => {
    const truth = extractSourceTruth(
      "markdown-defendant",
      ["**Defendant:** James Patterson (DOB: 15/03/1987)", "Charge: Assault"].join("\n"),
      {},
    );

    const compared = compareTruthToApp(truth, {
      caseIdentity: { clientLabel: "James Patterson", caseTitle: "R v James Patterson" },
    });

    expect(compared.findings.some((f) => f.code === "DEFENDANT_NOT_SHOWN_OR_CHANGED")).toBe(false);
  });

  it("treats stale pre-identity app output as coverage, not a live identity defect", () => {
    const truth = extractSourceTruth(
      "stale-output",
      ["Defendant: Aiden Croft", "Charge: Burglary", "MG6: CCTV master outstanding."].join("\n"),
      {},
    );

    const compared = compareTruthToApp(truth, {
      caseId: "stale-output",
      generatedAt: "2026-06-29T17:37:55.000Z",
      evidenceStates: [{ label: "CCTV master", baseStatus: "Outstanding" }],
    });

    expect(compared.findings).toHaveLength(1);
    expect(compared.findings[0]?.code).toBe("APP_OUTPUT_STALE_SCHEMA");
    expect(compared.findings.some((f) => f.code === "DEFENDANT_NOT_SHOWN_OR_CHANGED")).toBe(false);
  });

  it("recognises full CCTV export wording without letting stills stand in for full media", () => {
    const truth = extractSourceTruth(
      "cctv-export",
      ["Defendant: Priya Shah", "MG6C: full CCTV export outstanding — not on bundle."].join("\n"),
      {},
    );

    const onlyStills = compareTruthToApp(truth, {
      caseIdentity: { clientLabel: "Priya Shah" },
      evidenceStates: [{ label: "CCTV stills", baseStatus: "served" }],
    });
    expect(onlyStills.findings.some((f) => f.code === "EXPECTED_MISSING_NOT_CHASED")).toBe(true);

    const fullExport = compareTruthToApp(truth, {
      caseIdentity: { clientLabel: "Priya Shah" },
      evidenceStates: [{ label: "Full CCTV export", baseStatus: "Outstanding" }],
    });
    expect(fullExport.findings.some((f) => f.code === "EXPECTED_MISSING_NOT_CHASED")).toBe(false);
  });
});
