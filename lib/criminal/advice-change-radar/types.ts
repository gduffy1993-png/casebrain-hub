export type PressureDirection = "may_strengthen" | "may_weaken" | "review_needed";

export type AdviceRadarItemKind = "material_change" | "watch_point";

export type AdviceRadarItem = {
  id: string;
  kind: AdviceRadarItemKind;
  whatChanged: string;
  whyItMatters: string;
  affectedOutput: string;
  reviewNeeded: string;
  doNotRelyOnYet: string;
  pressureDirection?: PressureDirection;
  currentSourceState?: string;
  safeNextAction: string;
  solicitorReviewRequired: boolean;
};

export type AdviceChangeRadarModel = {
  items: AdviceRadarItem[];
  hasBaseline: boolean;
  changeSummary: string;
  reviewNotice: string;
  solicitorReviewRequired: boolean;
};
