import { describe, expect, it } from "vitest";
import {
  filterEvidenceForPracticeArea,
  resolvePracticeAreaFromSignals,
  sanitizeTextForPracticeArea,
} from "@/lib/strategic/practice-area-filters";

describe("Criminal safety: practice area + sanitization", () => {
  it("forces criminal when criminal signals exist even if stored practice_area is other", () => {
    const resolved = resolvePracticeAreaFromSignals({
      storedPracticeArea: "other_litigation",
      hasCriminalSignals: true,
      context: "test",
    });
    expect(resolved).toBe("criminal");
  });

  it("does not strip criminal evidence items just because category is LIABILITY", () => {
    const items = filterEvidenceForPracticeArea(
      [
        {
          id: "criminal-disclosure",
          label: "Prosecution Disclosure",
          description: "Initial and full disclosure from prosecution",
          category: "LIABILITY",
        },
      ],
      "criminal",
      { context: "test", log: false },
    );
    expect(items.length).toBe(1);
  });

  it("sanitizes civil-only strategic text for criminal", () => {
    const cleaned = sanitizeTextForPracticeArea(
      "Administrative documentation gaps (client ID, retainer, CFA) are procedural compliance issues only.",
      "criminal",
      { context: "test", log: false },
    );
    expect(cleaned).toBeNull();
  });
});


