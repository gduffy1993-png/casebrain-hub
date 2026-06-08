/**
 * Option 3 Phase 3.4: Logging for strategy-suggest. No PII.
 * Log events: request, fallback (reason), success (offenceType only), rejected.
 */

const LOG_PREFIX = "[strategy-suggest]";

export type StrategySuggestLogEvent =
  | { event: "request"; caseId: string }
  | { event: "fallback"; caseId: string; reason: string }
  | { event: "success"; caseId: string; offenceType: string }
  | { event: "rejected"; caseId: string }
  | { event: "approved"; caseId: string };

export function logStrategySuggest(ev: StrategySuggestLogEvent): void {
  const line = `${LOG_PREFIX} ${ev.event} caseId=${ev.caseId}${"reason" in ev ? ` reason=${ev.reason}` : ""}${"offenceType" in ev ? ` offenceType=${ev.offenceType}` : ""}`;
  if (ev.event === "fallback" || ev.event === "rejected") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
