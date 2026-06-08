import { describe, it, expect } from "vitest";
import { extractCriminalCaseMeta } from "../structured-extractor";

describe("Criminal structured extractor (deterministic)", () => {
  it("extracts charges, hearings, bail, PACE and disclosure without throwing", () => {
    const text = `
Defendant: John Smith
Offence: Wounding with intent (Section 18 OAPA 1861)
Plea: Not guilty

Appeared before Birmingham Crown Court on 12/01/2026 for PTR.
Next hearing: 15 February 2026 Trial.

Conditional bail. Bail conditions: curfew, reporting, no contact.

Custody record not served. Interview recording missing. Legal advice log missing.

MG6 schedule referenced. MG6A not served. MG6C not served. Disclosure not served. Served by 01/03/2026.
`;

    const meta = extractCriminalCaseMeta({ text, documentName: "MG5.pdf", now: new Date("2026-01-01T00:00:00Z") });

    expect(meta.defendantName).toBe("John Smith");
    expect(meta.charges.length).toBeGreaterThan(0);
    expect(meta.charges[0].plea).toBe("not_guilty");
    expect(meta.hearings.length).toBeGreaterThan(0);
    expect(meta.nextHearing).toBeTruthy();
    expect(meta.bail.status).toBe("bailed");
    expect(meta.pace.breachesDetected.length).toBeGreaterThan(0);
    expect(meta.disclosure.missingItems.some((m) => m.includes("MG6A"))).toBe(true);
    expect(meta.keyFacts.length).toBeGreaterThan(0);
  });

  it("never throws and always returns keyFacts even on empty input", () => {
    const meta = extractCriminalCaseMeta({ text: "", documentName: "empty.txt" });
    expect(Array.isArray(meta.keyFacts)).toBe(true);
    expect(meta.keyFacts.length).toBeGreaterThan(0);
  });
});

describe("validateCourtName", () => {
  it("rejects markdown headings starting with #", () => {
    expect(validateCourtName("# CROWN COURT PROSECUTION BUNDLE")).toBeNull();
    expect(validateCourtName("# Crown Court at Manchester")).toBeNull();
  });

  it("rejects values containing BUNDLE", () => {
    expect(validateCourtName("CROWN COURT PROSECUTION BUNDLE")).toBeNull();
    expect(validateCourtName("Crown Court Bundle")).toBeNull();
  });

  it("rejects ALL CAPS headings without court keyword", () => {
    expect(validateCourtName("PROSECUTION BUNDLE")).toBeNull();
    expect(validateCourtName("CASE DETAILS")).toBeNull();
  });

  it("rejects values containing PROSECUTION BUNDLE", () => {
    expect(validateCourtName("Crown Court PROSECUTION BUNDLE")).toBeNull();
  });

  it("accepts valid court names with court keywords", () => {
    expect(validateCourtName("Crown Court at Manchester")).toBe("Crown Court at Manchester");
    expect(validateCourtName("Birmingham Magistrates' Court")).toBe("Birmingham Magistrates' Court");
    expect(validateCourtName("Manchester Crown Court")).toBe("Manchester Crown Court");
    expect(validateCourtName("CCMC")).toBe("CCMC");
    expect(validateCourtName("County Court at Birmingham")).toBe("County Court at Birmingham");
  });

  it("rejects null, undefined, and empty strings", () => {
    expect(validateCourtName(null)).toBeNull();
    expect(validateCourtName(undefined)).toBeNull();
    expect(validateCourtName("")).toBeNull();
    expect(validateCourtName("   ")).toBeNull();
  });

  it("rejects values without court keywords", () => {
    expect(validateCourtName("Manchester")).toBeNull();
    expect(validateCourtName("Birmingham")).toBeNull();
    expect(validateCourtName("Court Building")).toBeNull(); // "Court" alone is not enough
  });

  it("handles edge cases", () => {
    expect(validateCourtName("# Crown Court")).toBeNull(); // Starts with #
    expect(validateCourtName("CROWN COURT BUNDLE")).toBeNull(); // Contains BUNDLE
    expect(validateCourtName("Crown Court at Manchester")).toBe("Crown Court at Manchester"); // Valid
  });
});


