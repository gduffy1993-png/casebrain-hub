/**
 * Gold Manual Proof Set v1 — 20 solicitor-grade review cases.
 * Maps each gold slot to an existing controlled/PDF-backed demo-audit family.
 * Spec: docs/gold-manual-proof-pack/
 */

export type GoldManualSourceKind = "evidence_state_local" | "v9_catalog" | "thirty_catalog" | "five_catalog";

export type GoldManualCaseSpec = {
  /** CASE-01 … CASE-20 */
  goldId: string;
  familySlot: number;
  familyLabel: string;
  /** Underlying controlled case id */
  sourceCaseId: string;
  sourceKind: GoldManualSourceKind;
  riskFocus: string;
  reviewMinutesTarget: number;
};

/** Breadth + risk selection for the minimum viable 20-pack. */
export const GOLD_MANUAL_PROOF_SET_V1: GoldManualCaseSpec[] = [
  {
    goldId: "CASE-01",
    familySlot: 1,
    familyLabel: "phone harassment / attribution",
    sourceCaseId: "demo-audit-01-phone-harassment",
    sourceKind: "evidence_state_local",
    riskFocus: "Screenshots served vs full download / subscriber gap; attribution overstatement",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-02",
    familySlot: 2,
    familyLabel: "BWV referred-only",
    sourceCaseId: "demo-audit-03-bwv-custody",
    sourceKind: "evidence_state_local",
    riskFocus: "BWV referred on schedule but not served; custody extract only",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-03",
    familySlot: 3,
    familyLabel: "custody extract vs full custody",
    sourceCaseId: "demo-audit-27-custody-pace-missing",
    sourceKind: "evidence_state_local",
    riskFocus: "Partial custody / PACE record vs full custody outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-04",
    familySlot: 4,
    familyLabel: "CCTV stills vs master footage",
    sourceCaseId: "demo-audit-02-cctv-stills",
    sourceKind: "evidence_state_local",
    riskFocus: "Stills served; master export / continuity outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-05",
    familySlot: 5,
    familyLabel: "Encro handle attribution",
    sourceCaseId: "demo-audit-05-encro-attribution",
    sourceKind: "evidence_state_local",
    riskFocus: "Message extracts vs handle-to-defendant mapping not proved",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-06",
    familySlot: 6,
    familyLabel: "mixed-defendant material",
    sourceCaseId: "demo-audit-04-co-def-interview",
    sourceKind: "evidence_state_local",
    riskFocus: "Co-defendant interview served; target defendant interview missing",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-07",
    familySlot: 7,
    familyLabel: "bad redaction",
    sourceCaseId: "demo-audit-44-bad-redaction",
    sourceKind: "v9_catalog",
    riskFocus: "Heavy redaction obscuring names/dates; unredacted MG11 outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-08",
    familySlot: 8,
    familyLabel: "charge mismatch",
    sourceCaseId: "demo-audit-25-charge-bundle-mismatch",
    sourceKind: "evidence_state_local",
    riskFocus: "Charge sheet vs MG5 / bundle narrative drift",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-09",
    familySlot: 9,
    familyLabel: "domestic order / restraining order breach",
    sourceCaseId: "demo-audit-32-restraining-order-breach",
    sourceKind: "v9_catalog",
    riskFocus: "Order extract only; sealed order / service proof outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-10",
    familySlot: 10,
    familyLabel: "translated messages",
    sourceCaseId: "demo-audit-41-translated-messages",
    sourceKind: "v9_catalog",
    riskFocus: "Screenshots served; certified translation / interpreter note outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-11",
    familySlot: 11,
    familyLabel: "youth / appropriate adult / intermediary",
    sourceCaseId: "demo-audit-22-youth-interview",
    sourceKind: "evidence_state_local",
    riskFocus: "YJS extract served; youth interview / AA safeguards incomplete",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-12",
    familySlot: 12,
    familyLabel: "ABE / first account / third-party records",
    sourceCaseId: "demo-audit-21-historic-sexual-abe",
    sourceKind: "evidence_state_local",
    riskFocus: "Draft MG11 served; ABE video / transcript referred missing",
    reviewMinutesTarget: 9,
  },
  {
    goldId: "CASE-13",
    familySlot: 13,
    familyLabel: "drugs lab / continuity",
    sourceCaseId: "demo-audit-50-lab-continuity-conflict",
    sourceKind: "v9_catalog",
    riskFocus: "Drugs schedule served; lab intake / continuity / SFR outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-14",
    familySlot: 14,
    familyLabel: "fraud bank/device attribution",
    sourceCaseId: "demo-audit-16-fraud-bank-statements",
    sourceKind: "evidence_state_local",
    riskFocus: "Bank summaries served; full transaction export / device ownership gap",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-15",
    familySlot: 15,
    familyLabel: "motoring SJP thin evidence",
    sourceCaseId: "demo-audit-18-motoring-sjp-thin",
    sourceKind: "evidence_state_local",
    riskFocus: "Thin SJP file; device / CCTV export outstanding",
    reviewMinutesTarget: 7,
  },
  {
    goldId: "CASE-16",
    familySlot: 16,
    familyLabel: "ANPR / vehicle ID",
    sourceCaseId: "demo-audit-49-anpr-trap",
    sourceKind: "v9_catalog",
    riskFocus: "ANPR hit table served; images / national audit trail outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-17",
    familySlot: 17,
    familyLabel: "medical injury report missing",
    sourceCaseId: "demo-audit-61-medical-triage-partial",
    sourceKind: "v9_catalog",
    riskFocus: "Triage / injury note partial; consultant medical report referred missing",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-18",
    familySlot: 18,
    familyLabel: "prison calls / call logs",
    sourceCaseId: "demo-audit-46-prison-calls",
    sourceKind: "v9_catalog",
    riskFocus: "Call log summary served; recordings / PIN attribution outstanding",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-19",
    familySlot: 19,
    familyLabel: "social handles / subscriber gap",
    sourceCaseId: "demo-audit-47-social-media-handles",
    sourceKind: "v9_catalog",
    riskFocus: "Handle / social material vs subscriber / account attribution gap",
    reviewMinutesTarget: 8,
  },
  {
    goldId: "CASE-20",
    familySlot: 20,
    familyLabel: "OCR/date/court mismatch",
    sourceCaseId: "demo-audit-30-layout-hearing-date",
    sourceKind: "evidence_state_local",
    riskFocus: "Layout / hearing date / court listing drift across papers",
    reviewMinutesTarget: 8,
  },
];
