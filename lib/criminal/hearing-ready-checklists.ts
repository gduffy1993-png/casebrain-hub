/**
 * Phase 4/6: Hearing-Ready Strategy checklists (shared by UI and export).
 */

export const HEARING_CHECKLISTS: Record<string, string[]> = {
  "first hearing": [
    "Confirm basis of plea (or reserve position)",
    "Request key disclosure (CCTV, MG11s, medical if relevant)",
    "No indication of plea unless instructed",
    "Note bail conditions and return date",
  ],
  "plea hearing": [
    "Confirm plea (guilty / not guilty / indication)",
    "If not guilty: confirm trial window and disclosure timetable",
    "If guilty: mitigation outline and adjourn for PSR if needed",
  ],
  ptph: [
    "Confirm trial window and listing",
    "Confirm disclosure timetable and defence statement deadline",
    "Request directions for any outstanding disclosure",
    "Confirm issues in dispute and prosecution case summary",
  ],
  pcmh: [
    "Confirm trial date and time estimate",
    "Disclosure compliance and any applications",
    "Witness requirements and special measures",
    "Defence case statement and trial readiness",
  ],
  "case management": [
    "Confirm next steps and deadlines",
    "Disclosure and unused material",
    "Any case management directions",
  ],
  trial: [
    "Cross-examination themes and defence narrative",
    "Exhibits and agreed facts",
    "Legal directions (Turnbull if ID in issue)",
    "Defence closing points",
  ],
  sentencing: [
    "Mitigation bundle and personal circumstances",
    "Sentencing guidelines and starting point",
    "Pre-sentence report (if ordered) – read and respond",
    "Remorse and character evidence",
  ],
  "bail review": [
    "Confirm grounds for bail / conditions",
    "Address any breach or change of circumstances",
    "Propose conditions if opposing remand",
  ],
  default: [
    "Confirm issues in dispute",
    "Confirm disclosure status",
    "Note next steps and deadlines",
  ],
};

export function getChecklistForHearingType(hearingType: string | null): string[] {
  if (!hearingType) return HEARING_CHECKLISTS.default;
  const key = hearingType.toLowerCase();
  if (HEARING_CHECKLISTS[key]) return HEARING_CHECKLISTS[key];
  if (key.includes("trial")) return HEARING_CHECKLISTS.trial;
  if (key.includes("sentenc")) return HEARING_CHECKLISTS.sentencing;
  if (key.includes("ptph")) return HEARING_CHECKLISTS.ptph;
  if (key.includes("pcmh") || key.includes("case management")) return HEARING_CHECKLISTS.pcmh;
  if (key.includes("first") || key.includes("mention")) return HEARING_CHECKLISTS["first hearing"];
  if (key.includes("plea")) return HEARING_CHECKLISTS["plea hearing"];
  if (key.includes("bail")) return HEARING_CHECKLISTS["bail review"];
  return HEARING_CHECKLISTS.default;
}
