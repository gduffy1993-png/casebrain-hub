import { describe, expect, it, vi } from "vitest";

import { selectDefaultRole } from "../default-role";
import { normalizePracticeArea } from "@/lib/types/casebrain";

// Prove role lenses don’t re-extract: buildLayeredSummary should call buildDomainSummaries once.
vi.mock("../domain-engine", async () => {
  const actual = await vi.importActual<typeof import("../domain-engine")>("../domain-engine");
  return {
    ...actual,
    buildDomainSummaries: vi.fn(actual.buildDomainSummaries),
  };
});

describe("Layered Summary System", () => {
  it("selectDefaultRole uses query param > practice area > fallback", () => {
    expect(
      selectDefaultRole({ roleParam: "criminal_solicitor", practiceArea: "housing_disrepair" })
    ).toBe("criminal_solicitor");

    expect(
      selectDefaultRole({ roleParam: "not_a_role", practiceArea: "criminal" })
    ).toBe("criminal_solicitor");

    expect(
      selectDefaultRole({ roleParam: null, practiceArea: "clinical_negligence" })
    ).toBe("clinical_neg_solicitor");

    expect(
      selectDefaultRole({ roleParam: null, practiceArea: "unknown_area" })
    ).toBe("general_litigation_solicitor");
  });

  it("buildDomainSummaries is stable and only emits triggered domains", async () => {
    const { buildDomainSummaries } = await import("../domain-engine");
    const practiceArea = normalizePracticeArea("personal_injury");
    const documents = [
      {
        id: "doc-1",
        name: "A&E Attendance Note",
        type: "medical",
        extracted_json: {
          summary: "Attended A&E following RTA collision. X-ray ordered. Discharged with advice.",
          dates: [{ label: "A&E attendance", isoDate: "2025-01-02" }],
        },
        created_at: "2025-01-03T00:00:00.000Z",
      },
      {
        id: "doc-2",
        name: "CCTV Request Email",
        type: "email",
        extracted_json: {
          summary: "Requested CCTV footage from premises. Disclosure not yet received.",
          dates: [{ label: "CCTV requested", isoDate: "2025-01-05" }],
        },
        created_at: "2025-01-06T00:00:00.000Z",
      },
      {
        id: "doc-3",
        name: "Orthopaedic expert report",
        type: "report",
        extracted_json: {
          summary: "Orthopaedic expert opinion on injury severity and prognosis.",
          dates: [{ label: "Expert report date", isoDate: "2025-02-10" }],
        },
        created_at: "2025-02-11T00:00:00.000Z",
      },
      {
        id: "doc-4",
        name: "Schedule of Loss (draft)",
        type: "draft",
        extracted_json: {
          summary: "Damages and loss of earnings schedule draft. Rehab needs noted.",
          dates: [{ label: "Schedule drafted", isoDate: "2025-03-01" }],
        },
        created_at: "2025-03-02T00:00:00.000Z",
      },
    ];

    const versionMissingEvidence = [
      { area: "expert", label: "Engineering report (liability)", priority: "HIGH" },
      { area: "admin", label: "CCTV native export + metadata", priority: "CRITICAL" },
    ];

    const out1 = buildDomainSummaries({
      practiceArea,
      documents,
      keyDates: [{ label: "Instructions", date: "2025-01-01", isPast: true }],
      versionMissingEvidence,
    });
    const out2 = buildDomainSummaries({
      practiceArea,
      documents,
      keyDates: [{ label: "Instructions", date: "2025-01-01", isPast: true }],
      versionMissingEvidence,
    });

    expect(out1).toEqual(out2);
    expect(out1.length).toBeGreaterThan(0);

    // Triggered domains should include medical, disclosure/integrity, expert, damages
    const domains = out1.map((d) => d.domain);
    expect(domains).toContain("hospital_medical");
    expect(domains).toContain("disclosure_integrity");
    expect(domains).toContain("expert_opinion");
    expect(domains).toContain("damages_impact");
  });

  it("buildLayeredSummary calls domain extraction once (role lenses derive from domain outputs)", async () => {
    const { buildDomainSummaries } = await import("../domain-engine");
    const mocked = vi.mocked(buildDomainSummaries);
    mocked.mockClear();

    const { buildLayeredSummary } = await import("../engine");

    const practiceArea = normalizePracticeArea("criminal");
    const layered = buildLayeredSummary({
      practiceArea,
      documents: [
        {
          id: "doc-1",
          name: "MG6 schedule",
          type: "form",
          extracted_json: { summary: "MG6 schedule referenced. Disclosure outstanding." },
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "doc-2",
          name: "Police interview transcript",
          type: "transcript",
          extracted_json: { summary: "PACE interview recorded. Caution given. No solicitor present." },
          created_at: "2025-01-02T00:00:00.000Z",
        },
      ],
      totalPages: 600,
      latestAnalysisVersion: 2,
      keyDates: [{ label: "Next hearing", date: "2025-02-01", isPast: false, isUrgent: true }],
      mainRisks: ["Disclosure delay risk"],
      versionMissingEvidence: [{ area: "admin", label: "Custody record", priority: "HIGH" }],
    });

    expect(mocked).toHaveBeenCalledTimes(1);
    expect(layered.isLargeBundleMode).toBe(true);
    expect(layered.roleLenses.criminal_solicitor.recommendedNextMove.length).toBeGreaterThan(0);
  });
});


