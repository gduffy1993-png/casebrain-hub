/**
 * Disclosure Pressure — "why it matters" and "pressure steps" for missing disclosure items.
 * Used by the Disclosure Pressure Dashboard. Single source of truth for chase guidance.
 */

import type { DisclosureState } from "./disclosure-state";

export type PressureItem = {
  key: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  whyItMatters: string;
  pressureStep: string;
};

/** By disclosure item key: why it matters + suggested pressure step (CPIA / practice). */
const PRESSURE_MAP: Record<
  string,
  { whyItMatters: string; pressureStep: string }
> = {
  cctv_full_window: {
    whyItMatters: "Essential for continuity and full picture of the incident; gaps can undermine prosecution or support defence.",
    pressureStep: "Request full unedited window; cite CPIA s.3 and R v Stratford. Chase in writing with 14-day deadline.",
  },
  cctv_continuity: {
    whyItMatters: "Chain of custody for footage must be established; without it, admissibility and weight are at risk.",
    pressureStep: "Request continuity statement and any edits log. Note CPIA Code 8.2 and continuity as a disclosure duty.",
  },
  bwv: {
    whyItMatters: "Body-worn footage often captures key moments and officer conduct; central to fairness and PACE compliance.",
    pressureStep: "Request all BWV from officers present; cite CPIA and PACE. Escalate to disclosure officer if not provided.",
  },
  call_999_audio: {
    whyItMatters: "999 recording can show timeline, demeanour and consistency with later accounts.",
    pressureStep: "Request 999 call recording and CAD reference. Follow force disclosure process; chase after 14 days.",
  },
  cad_log: {
    whyItMatters: "Dispatch log shows deployment, timing and what was known when; relevant to reasonableness and narrative.",
    pressureStep: "Request CAD/incident log. Include in standard disclosure request; chase via disclosure officer.",
  },
  interview_recording: {
    whyItMatters: "Interview is core evidence; defence must have full recording to test fairness and accuracy of any summary.",
    pressureStep: "Request full interview recording and any summary. Cite PACE Code E and CPIA. Essential before trial.",
  },
  custody_record_or_custody_cctv: {
    whyItMatters: "Custody record and custody CCTV show treatment and timing; relevant to admissibility and abuse of process.",
    pressureStep: "Request custody record and custody suite CCTV. Standard disclosure; chase if not on initial schedule.",
  },
  fire_cause_report: {
    whyItMatters: "Cause of fire is central to intent and recklessness in fire-related charges.",
    pressureStep: "Request fire cause report and any expert material. Include in disclosure request; escalate if withheld.",
  },
  forensic_report: {
    whyItMatters: "Forensic evidence can make or break identification or link to scene; defence must be able to test it.",
    pressureStep: "Request forensic report and underlying data. Cite CPIA and expert disclosure; consider defence expert if delayed.",
  },
  footwear_comparison: {
    whyItMatters: "Footwear comparison may link or exclude defendant; delay or absence can support disclosure arguments.",
    pressureStep: "Request footwear comparison report or confirmation it is not yet done. Chase and note any delay.",
  },
};

const DEFAULT_PRESSURE = {
  whyItMatters: "Relevant to the case and should be disclosed under CPIA.",
  pressureStep: "Request in writing; cite CPIA s.3 and chase after 14 days. Escalate to disclosure officer if needed.",
};

/**
 * Enrich missing_items from computeDisclosureState with why-it-matters and pressure steps.
 */
export function enrichMissingItemsWithPressure(
  missingItems: DisclosureState["missing_items"]
): PressureItem[] {
  return missingItems.map((item) => {
    const mapped = PRESSURE_MAP[item.key];
    return {
      key: item.key,
      label: item.label,
      severity: item.severity,
      whyItMatters: mapped?.whyItMatters ?? DEFAULT_PRESSURE.whyItMatters,
      pressureStep: mapped?.pressureStep ?? DEFAULT_PRESSURE.pressureStep,
    };
  });
}
