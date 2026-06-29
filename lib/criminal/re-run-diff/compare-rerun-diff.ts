import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";
import { evidenceExistenceLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { dedupeLines, labelKey } from "./rerun-diff-sanitize";
import type {
  RerunDiffExportImpact,
  RerunDiffExportStamp,
  RerunDiffGroup,
  RerunDiffGroupId,
  RerunDiffModel,
  RerunDiffSnapshot,
} from "./rerun-diff-types";
import { RERUN_DIFF_GROUP_TITLES } from "./rerun-diff-types";

const REVIEW_TAIL = " — solicitor review required; do not treat as proof without source state.";

function existenceLabel(e: EvidenceExistence): string {
  return evidenceExistenceLabel(e);
}

function mapByKey<T extends { labelKey: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.labelKey, i]));
}

function pushGroup(groups: RerunDiffGroup[], id: RerunDiffGroupId, lines: string[]): void {
  const clean = dedupeLines(lines);
  if (!clean.length) return;
  const existing = groups.find((g) => g.id === id);
  if (existing) {
    existing.lines.push(...clean);
    existing.lines = dedupeLines(existing.lines, 16);
    return;
  }
  groups.push({ id, title: RERUN_DIFF_GROUP_TITLES[id], lines: clean });
}

function compareExportStamps(
  previous: RerunDiffExportStamp | null,
  current: RerunDiffExportStamp | null,
): RerunDiffExportImpact | null {
  if (!previous && !current) return null;
  const reviewLines: string[] = [];

  if (previous && current) {
    if (previous.exportId !== current.exportId) {
      reviewLines.push(
        `Export pack version changed (${previous.exportId} → ${current.exportId}) — re-review CPS chase, court note, and client summary before sending.`,
      );
    }
    if (previous.bundleVersionLabel !== current.bundleVersionLabel) {
      reviewLines.push(
        `Bundle version label changed (${previous.bundleVersionLabel} → ${current.bundleVersionLabel}) — exports may need re-copy.`,
      );
    }
    if (previous.generatedAt !== current.generatedAt && previous.exportId === current.exportId) {
      reviewLines.push("Export regenerated at new timestamp — confirm wording still matches papers.");
    }
  } else if (current && !previous) {
    reviewLines.push(
      `First export stamp on record (${current.exportId}) — save a baseline after review to track future changes.`,
    );
  }

  return {
    previous,
    current,
    reviewLines: dedupeLines(reviewLines, 6),
  };
}

export function compareRerunDiff(
  previous: RerunDiffSnapshot | null | undefined,
  current: RerunDiffSnapshot,
): RerunDiffModel {
  const reviewNotice =
    "Review-only — does not change advice, exports, or source-state gates. Compare before relying on prior wording.";

  if (!previous) {
    return {
      hasPrevious: false,
      headline: "No earlier version available yet",
      reviewNotice,
      groups: [],
      exportImpact: compareExportStamps(null, current.exportStamp),
      solicitorReviewRecommended: false,
      noChanges: false,
    };
  }

  const groups: RerunDiffGroup[] = [];
  const prevEvidence = mapByKey(previous.evidence);
  const currEvidence = mapByKey(current.evidence);

  for (const curr of current.evidence) {
    const prev = prevEvidence.get(curr.labelKey);
    if (!prev) {
      if (curr.existence === "served") {
        pushGroup(groups, "new_served", [`${curr.label}: now served on bundle.${REVIEW_TAIL}`]);
      }
      continue;
    }
    if (prev.existence === curr.existence) {
      if (curr.existence === "missing") {
        pushGroup(groups, "still_missing", [`${curr.label}: still missing after new disclosure.`]);
      }
      continue;
    }
    if (prev.existence !== "served" && curr.existence === "served") {
      pushGroup(groups, "new_served", [
        `${curr.label}: was ${existenceLabel(prev.existence)}, now served.${REVIEW_TAIL}`,
      ]);
    } else {
      pushGroup(groups, "state_changed", [
        `${curr.label}: ${existenceLabel(prev.existence)} → ${existenceLabel(curr.existence)}.${REVIEW_TAIL}`,
      ]);
    }
  }

  const prevChase = mapByKey(previous.chase);
  const currChase = mapByKey(current.chase);

  for (const curr of current.chase) {
    const prev = prevChase.get(curr.labelKey);
    if (!prev) {
      pushGroup(groups, "chase_affected", [`New chase item: ${curr.label} (${existenceLabel(curr.existence)}).`]);
      continue;
    }
    if (prev.existence !== "served" && curr.existence === "served") {
      pushGroup(groups, "chase_affected", [`Chase item may be resolved: ${curr.label} now served.${REVIEW_TAIL}`]);
    } else if (
      (prev.existence === "missing" || prev.existence === "referred_only") &&
      (curr.existence === "missing" || curr.existence === "referred_only")
    ) {
      pushGroup(groups, "chase_affected", [`Chase still outstanding: ${curr.label} (${existenceLabel(curr.existence)}).`]);
    } else if (prev.existence !== curr.existence) {
      pushGroup(groups, "chase_affected", [
        `Chase item updated: ${curr.label} ${existenceLabel(prev.existence)} → ${existenceLabel(curr.existence)}.`,
      ]);
    }
  }

  for (const prev of previous.chase) {
    if (!currChase.has(prev.labelKey)) {
      pushGroup(groups, "chase_affected", [`Chase item no longer listed: ${prev.label} — confirm if served or dropped.`]);
    }
  }

  const sendabilityLines: string[] = [];
  if (previous.chaseSendability !== current.chaseSendability && current.chaseSendability) {
    sendabilityLines.push(`CPS chase sendability: ${previous.chaseSendability ?? "—"} → ${current.chaseSendability}.`);
  }
  if (previous.summarySendability !== current.summarySendability && current.summarySendability) {
    sendabilityLines.push(
      `Client summary sendability: ${previous.summarySendability ?? "—"} → ${current.summarySendability}.`,
    );
  }
  if (previous.courtLineStatus !== current.courtLineStatus && current.courtLineStatus) {
    sendabilityLines.push(
      `Court note status: ${previous.courtLineStatus ?? "—"} → ${current.courtLineStatus} — court note needs review.`,
    );
  }
  if (previous.matterConfidenceLevel !== current.matterConfidenceLevel && current.matterConfidenceLevel) {
    sendabilityLines.push(
      `Matter confidence: ${previous.matterConfidenceLevel ?? "—"} → ${current.matterConfidenceLevel}.`,
    );
  }
  pushGroup(groups, "wording_affected", sendabilityLines);

  const prevRisks = new Set(previous.riskLabels.map(labelKey));
  for (const risk of current.riskLabels) {
    if (!prevRisks.has(labelKey(risk))) {
      pushGroup(groups, "new_risk", [`New warning on papers: ${risk}.${REVIEW_TAIL}`]);
    }
  }

  if (previous.documentCount !== current.documentCount) {
    pushGroup(groups, "new_risk", [
      `Document count on file changed (${previous.documentCount} → ${current.documentCount}) — review served vs referred material.`,
    ]);
  }

  const exportImpact = compareExportStamps(previous.exportStamp, current.exportStamp);
  if (exportImpact?.reviewLines.length) {
    pushGroup(groups, "export_impact", exportImpact.reviewLines);
  }

  const noChanges = groups.every((g) => g.lines.length === 0);
  const headline = noChanges
    ? "No material changes detected since last saved version"
    : "What changed since last version";

  return {
    hasPrevious: true,
    headline,
    reviewNotice,
    groups: groups.filter((g) => g.lines.length > 0),
    exportImpact,
    solicitorReviewRecommended: !noChanges,
    noChanges,
  };
}
