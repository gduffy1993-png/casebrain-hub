import type {
  BlockingFailure,
  CaseBrainAuditOutput,
  EvidenceStateTruthKey,
  ItemComparison,
} from "./types";

const DEFAULT_BLOCKING_PATTERNS = [
  "BWV shows",
  "BWV confirms",
  "case collapses",
  "we win",
  "guaranteed",
  "phone extraction shows",
  "PACE safeguards were followed",
];

function pushPatternFailures(
  failures: BlockingFailure[],
  caseId: string,
  text: string,
  patterns: string[],
): void {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    const isProhibitionLine =
      lower.includes("do not ") ||
      lower.includes("don't ") ||
      lower.includes("must not ") ||
      lower.includes("do not state") ||
      lower.includes("do not say") ||
      lower.includes("do not treat") ||
      lower.includes("do not import");

    for (const pattern of patterns) {
      if (!lower.includes(pattern.toLowerCase())) continue;
      if (isProhibitionLine) continue;
      failures.push({
        code: "blocking_pattern_in_output",
        severity: "blocking",
        caseId,
        pattern,
        message: `Output contains blocking pattern "${pattern}"`,
      });
    }
  }
}

export function detectBlockingFailures(
  truthKey: EvidenceStateTruthKey,
  output: CaseBrainAuditOutput,
  comparisons: ItemComparison[],
): BlockingFailure[] {
  const failures: BlockingFailure[] = [];
  const caseId = truthKey.caseId;
  const patterns = [
    ...DEFAULT_BLOCKING_PATTERNS,
    ...(truthKey.blockingFailPatterns ?? []),
    ...(truthKey.mustNotSayGlobal ?? []),
  ];

  for (const c of comparisons) {
    if (!c.falseServed) continue;
    failures.push({
      code: "false_served",
      severity: "blocking",
      caseId,
      truthItem: c.truthItem,
      message: `False-served: truth=${c.truthState}, predicted=${c.predictedState ?? "none"}`,
    });

    if (c.truthState === "referred_only") {
      failures.push({
        code: "referred_marked_served",
        severity: "blocking",
        caseId,
        truthItem: c.truthItem,
        message: "Referred-only evidence treated as served/usable",
      });
    }
    if (c.truthState === "missing") {
      failures.push({
        code: "missing_marked_served",
        severity: "blocking",
        caseId,
        truthItem: c.truthItem,
        message: "Missing evidence treated as served/usable",
      });
    }
    if (c.truthState === "incomplete") {
      failures.push({
        code: "incomplete_treated_complete",
        severity: "blocking",
        caseId,
        truthItem: c.truthItem,
        message: "Incomplete evidence treated as complete/served",
      });
    }
    if (c.truthState === "inferred_only") {
      failures.push({
        code: "inferred_stated_as_fact",
        severity: "blocking",
        caseId,
        truthItem: c.truthItem,
        message: "Inferred-only evidence stated as served fact",
      });
    }
  }

  for (const c of comparisons) {
    if (!c.wrongDefendantBleed) continue;
    failures.push({
      code: "wrong_defendant_bleed",
      severity: "blocking",
      caseId,
      truthItem: c.truthItem,
      message: "Co-defendant / other-defendant material matched to client workflow",
    });
  }

  const exportSend = output.exportVersion?.sendability ?? "";
  if (exportSend === "safe_to_send" && truthKey.expectedSendability !== "safe_to_send") {
    failures.push({
      code: "unsafe_sendability",
      severity: "blocking",
      caseId,
      message: `Export marked safe_to_send but truth key expects ${truthKey.expectedSendability ?? "review"}`,
    });
  }

  if (output.courtNote?.canCopy && output.courtNote.sendabilityLabel?.toLowerCase().includes("safe")) {
    failures.push({
      code: "safe_line_without_source_state",
      severity: "blocking",
      caseId,
      message: "Court line marked copy-safe without solicitor review gate",
    });
  }

  const blob = output.outputTextBlob ?? "";
  pushPatternFailures(failures, caseId, blob, patterns);

  for (const pattern of ["case collapses", "we win", "guaranteed"]) {
    if (blob.toLowerCase().includes(pattern)) {
      failures.push({
        code: "unsafe_win_collapse_wording",
        severity: "blocking",
        caseId,
        pattern,
        message: `Unsafe win/collapse wording: "${pattern}"`,
      });
    }
  }

  return failures;
}
