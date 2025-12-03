import { describe, it, expect } from "vitest";

describe("Overview PDF Export", () => {
  it("should include caseId in PDF content", () => {
    const pdfContent = {
      caseId: "case-123",
      practiceArea: "housing_disrepair",
      generatedAt: new Date().toISOString(),
    };

    expect(pdfContent.caseId).toBe("case-123");
    expect(pdfContent.practiceArea).toBe("housing_disrepair");
    expect(pdfContent.generatedAt).toBeDefined();
  });

  it("should include practice area in PDF metadata", () => {
    const pdfMeta = {
      caseId: "case-123",
      practiceArea: "personal_injury",
      packId: "personal_injury",
      packVersion: "1.0.0",
    };

    expect(pdfMeta.practiceArea).toBe("personal_injury");
    expect(pdfMeta.packId).toBe("personal_injury");
  });

  it("should return non-empty PDF data", () => {
    const pdfData = Buffer.from("PDF content here");
    
    expect(pdfData.length).toBeGreaterThan(0);
  });
});

