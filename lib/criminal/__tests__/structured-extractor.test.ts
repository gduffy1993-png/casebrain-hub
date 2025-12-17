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


