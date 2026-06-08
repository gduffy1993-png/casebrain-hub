import { enrichGroupedFailure } from "./fix-impact";
import type { AuditorIssue, GroupedFailure } from "./types";
import { severityRank } from "./issue-fingerprints";

const MAX_EXAMPLES = 3;

export function groupFailuresByFingerprint(issues: AuditorIssue[]): GroupedFailure[] {
  const map = new Map<string, GroupedFailure>();

  for (const issue of issues.filter(
    (i) =>
      i.status === "fail" ||
      (i.status === "weak" && i.severity !== "LOW") ||
      (i.status === "warn" && i.fingerprint.startsWith("manifest.")),
  )) {
    let group = map.get(issue.fingerprint);
    if (!group) {
      group = {
        fingerprint: issue.fingerprint,
        issueFamily: issue.issueFamily,
        severity: issue.severity,
        demoBlocker: issue.demoBlocker,
        affectedCount: 0,
        affectedCases: [],
        affectedScreens: [],
        examples: [],
        expectedBehaviour: issue.expected,
        likelySharedCause: issue.suggestedSharedFix,
        suggestedCursorFix: issue.suggestedSharedFix,
        releaseBlocking: issue.releaseBlocking,
      };
      map.set(issue.fingerprint, group);
    }

    group.affectedCount += 1;
    const caseLabel = `${issue.caseTitle} (${issue.caseId})`;
    if (!group.affectedCases.includes(caseLabel)) group.affectedCases.push(caseLabel);
    const screenLabel = `${issue.caseTitle} / ${issue.screen}`;
    if (!group.affectedScreens.includes(screenLabel)) group.affectedScreens.push(screenLabel);
    if (severityRank(issue.severity) > severityRank(group.severity)) group.severity = issue.severity;
    if (issue.demoBlocker) group.demoBlocker = true;
    if (issue.releaseBlocking) group.releaseBlocking = true;

    if (issue.badText && group.examples.length < MAX_EXAMPLES) {
      const dup = group.examples.some(
        (e) => e.badText === issue.badText && e.caseTitle === issue.caseTitle && e.screen === issue.screen,
      );
      if (!dup) {
        group.examples.push({
          caseTitle: issue.caseTitle,
          screen: issue.screen,
          badText: issue.badText.slice(0, 200),
        });
      }
    }
  }

  return [...map.values()]
    .map(enrichGroupedFailure)
    .sort((a, b) => {
      const d = severityRank(b.severity) - severityRank(a.severity);
      return d !== 0 ? d : b.affectedCount - a.affectedCount;
    });
}

export function topFingerprints(issues: AuditorIssue[], limit = 10) {
  const counts = new Map<string, number>();
  for (const i of issues) counts.set(i.fingerprint, (counts.get(i.fingerprint) ?? 0) + 1);
  return [...counts.entries()]
    .map(([fingerprint, count]) => ({ fingerprint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
