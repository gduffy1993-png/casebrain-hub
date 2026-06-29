import type { SendabilityLevel } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export type ExportPackSectionId =
  | "cps_chase"
  | "court_note"
  | "client_summary"
  | "evidence_gaps"
  | "do_not_overstate"
  | "full_pack";

export type ExportPackSection = {
  id: ExportPackSectionId;
  title: string;
  textForClipboard: string;
  canCopy: boolean;
  sendability: SendabilityLevel;
  sendabilityLabel: string;
  footer: string;
  blockedReason: string | null;
};

export type ExportVersionStamp = {
  exportId: string;
  caseId: string;
  generatedAt: string;
  exportType: "h5_export_pack_v1";
  bundleVersionLabel: string;
  appVersion: string | null;
  sourceStatesIncluded: string[];
  sendability: SendabilityLevel;
  warningCount: number;
  blockedReason: string | null;
  reviewFooter: string;
};

export type ExportPackModel = {
  sections: ExportPackSection[];
  version: ExportVersionStamp;
  reviewNotice: string;
};
