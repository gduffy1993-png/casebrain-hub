import { describe, it, expect } from "vitest";
import { assessHousingStage, getRecommendedActions } from "../stage";
import type { HousingCaseRecord, HousingDefect, HousingLandlordResponse } from "@/types";

describe("Housing Stage Assessment", () => {
  const baseHousingCase: HousingCaseRecord = {
    id: "test-case",
    org_id: "test-org",
    tenant_name: "Test Tenant",
    tenant_dob: null,
    tenant_vulnerability: [],
    property_address: "123 Test Street",
    landlord_name: "Test Landlord",
    landlord_type: "private",
    first_report_date: "2024-01-01",
    repair_attempts_count: 0,
    no_access_count: 0,
    no_access_days_total: 0,
    unfit_for_habitation: false,
    hhsrs_category_1_hazards: [],
    hhsrs_category_2_hazards: [],
    limitation_risk: null,
    limitation_date: null,
    stage: "intake",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  describe("Stage Assessment", () => {
    it("should assess as 'intake' for new case", () => {
      const assessment = assessHousingStage(
        baseHousingCase,
        [],
        [],
        false, // hasPreActionLetter
        false, // hasCourtAction
        false, // hasSettlement
      );

      expect(assessment.stage).toBe("intake");
      expect(assessment.confidence).toBe("high");
      expect(assessment.indicators).toContain("Initial case intake");
    });

    it("should assess as 'investigation' when repair attempts exist", () => {
      const caseWithRepairs = {
        ...baseHousingCase,
        repair_attempts_count: 2,
      };

      const assessment = assessHousingStage(
        caseWithRepairs,
        [],
        [],
        false,
        false,
        false,
      );

      expect(assessment.stage).toBe("investigation");
      expect(assessment.confidence).toBe("high");
      expect(assessment.indicators.some((i) => i.includes("repair attempt"))).toBe(true);
    });

    it("should assess as 'investigation' when landlord has responded", () => {
      const responses: HousingLandlordResponse[] = [
        {
          id: "resp1",
          case_id: "test-case",
          org_id: "test-org",
          response_date: "2024-01-10",
          response_type: "acknowledgement",
          response_text: "We acknowledge your complaint",
          repair_scheduled_date: null,
          contractor_name: null,
          no_access_reason: null,
          source_document_id: null,
          created_at: "2024-01-10T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
        },
      ];

      const assessment = assessHousingStage(
        baseHousingCase,
        [],
        responses,
        false,
        false,
        false,
      );

      expect(assessment.stage).toBe("investigation");
      expect(assessment.indicators.some((i) => i.includes("Landlord"))).toBe(true);
    });

    it("should assess as 'pre_action' when pre-action letter sent", () => {
      const assessment = assessHousingStage(
        baseHousingCase,
        [],
        [],
        true, // hasPreActionLetter
        false,
        false,
      );

      expect(assessment.stage).toBe("pre_action");
      expect(assessment.confidence).toBe("high");
      expect(assessment.indicators).toContain("Pre-action protocol letter sent");
    });

    it("should assess as 'litigation' when court action commenced", () => {
      const assessment = assessHousingStage(
        baseHousingCase,
        [],
        [],
        false,
        true, // hasCourtAction
        false,
      );

      expect(assessment.stage).toBe("litigation");
      expect(assessment.confidence).toBe("high");
      expect(assessment.indicators).toContain("Court action commenced");
    });

    it("should assess as 'settlement' when settlement reached", () => {
      const assessment = assessHousingStage(
        baseHousingCase,
        [],
        [],
        false,
        false,
        true, // hasSettlement
      );

      expect(assessment.stage).toBe("settlement");
      expect(assessment.confidence).toBe("high");
    });

    it("should assess as 'investigation' when >14 days since first report", () => {
      const oldCase = {
        ...baseHousingCase,
        first_report_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 20 days ago
      };

      const assessment = assessHousingStage(oldCase, [], [], false, false, false);

      expect(assessment.stage).toBe("investigation");
      expect(assessment.indicators.some((i) => i.includes("days since first report"))).toBe(
        true,
      );
    });
  });

  describe("Recommended Actions", () => {
    it("should recommend repair request for intake stage", () => {
      const actions = getRecommendedActions("intake", baseHousingCase, []);

      const repairRequest = actions.find((a) => a.action.includes("repair request"));
      expect(repairRequest).toBeDefined();
      expect(repairRequest?.priority).toBe("high");
    });

    it("should recommend Awaab's Law monitoring for social landlords in intake", () => {
      const socialCase = {
        ...baseHousingCase,
        landlord_type: "social",
      };

      const actions = getRecommendedActions("intake", socialCase, []);

      const awaabsAction = actions.find((a) => a.action.includes("Awaab"));
      expect(awaabsAction).toBeDefined();
      expect(awaabsAction?.priority).toBe("urgent");
    });

    it("should recommend urgent action for Category 1 hazards", () => {
      const defects: HousingDefect[] = [
        {
          id: "def1",
          case_id: "test-case",
          org_id: "test-org",
          defect_type: "damp",
          location: "Bedroom",
          severity: "severe",
          first_reported_date: "2024-01-01",
          last_reported_date: null,
          repair_attempted: false,
          repair_date: null,
          repair_successful: null,
          hhsrs_category: "category_1",
          photos_count: 0,
          notes: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const actions = getRecommendedActions("intake", baseHousingCase, defects);

      const category1Action = actions.find((a) => a.action.includes("Category 1"));
      expect(category1Action).toBeDefined();
      expect(category1Action?.priority).toBe("urgent");
    });

    it("should recommend no-access investigation for investigation stage", () => {
      const caseWithNoAccess = {
        ...baseHousingCase,
        no_access_days_total: 45,
      };

      const actions = getRecommendedActions("investigation", caseWithNoAccess, []);

      const noAccessAction = actions.find((a) => a.action.includes("no-access"));
      expect(noAccessAction).toBeDefined();
      expect(noAccessAction?.priority).toBe("high");
    });

    it("should recommend pre-action letter for pre_action stage", () => {
      const actions = getRecommendedActions("pre_action", baseHousingCase, []);

      const preActionLetter = actions.find((a) => a.action.includes("pre-action protocol"));
      expect(preActionLetter).toBeDefined();
      expect(preActionLetter?.priority).toBe("high");
    });

    it("should recommend disclosure for litigation stage", () => {
      const actions = getRecommendedActions("litigation", baseHousingCase, []);

      const disclosureAction = actions.find((a) => a.action.includes("disclosure"));
      expect(disclosureAction).toBeDefined();
      expect(disclosureAction?.priority).toBe("high");
    });

    it("should recommend urgent limitation action when risk is critical", () => {
      const caseWithLimitationRisk = {
        ...baseHousingCase,
        limitation_risk: "critical",
        limitation_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 10 days from now
      };

      const actions = getRecommendedActions("intake", caseWithLimitationRisk, []);

      const limitationAction = actions.find((a) => a.action.includes("Limitation"));
      expect(limitationAction).toBeDefined();
      expect(limitationAction?.priority).toBe("urgent");
    });
  });
});

