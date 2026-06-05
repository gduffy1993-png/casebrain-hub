import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import { sanitizeEvidenceChangeLine } from "./evidence-change-sanitize";
import type {
  EvidenceChangeCompareOutcome,
  EvidenceChangeCompareResult,
  EvidenceChangeSnapshot,
  EvidenceChangeSourceState,
} from "./evidence-change-types";

function normKey(label: string): string {
  return label.toLowerCase().slice(0, 72);
}

function added(previous: string[], current: string[]): string[] {
  const prev = new Set(previous.map(normKey));
  return current.filter((c) => !prev.has(normKey(c)));
}

function removed(previous: string[], current: string[]): string[] {
  const curr = new Set(current.map(normKey));
  return previous.filter((p) => !curr.has(normKey(p)));
}

function changed(previous: string[], current: string[]): string[] {
  const prev = new Set(previous.map(normKey));
  const curr = new Set(current.map(normKey));
  const out: string[] = [];
  for (const c of current) {
    if (!prev.has(normKey(c))) out.push(c);
  }
  for (const p of previous) {
    if (!curr.has(normKey(p))) out.push(p);
  }
  return out;
}

function readinessLabel(level: PreHearingReadinessLevel): string {
  switch (level) {
    case "green":
      return "Ready for solicitor review";
    case "amber":
      return "Review before hearing";
    case "red":
      return "Not ready to rely on yet";
  }
}

const READINESS_RANK: Record<PreHearingReadinessLevel, number> = {
  green: 0,
  amber: 1,
  red: 2,
};

function readinessWorsened(
  previous: PreHearingReadinessLevel,
  current: PreHearingReadinessLevel,
): boolean {
  return READINESS_RANK[current] > READINESS_RANK[previous];
}

function dedupe(lines: string[], cap = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeEvidenceChangeLine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function compareSourceState(
  previous: EvidenceChangeSourceState | undefined,
  current: EvidenceChangeSourceState | undefined,
): string[] {
  if (!previous || !current) return [];

  const changes: string[] = [];

  if (previous.documentCount !== current.documentCount) {
    changes.push(
      sanitizeEvidenceChangeLine(
        `Document count on file changed (${previous.documentCount} → ${current.documentCount}).`,
      ),
    );
  }

  if (previous.combinedTextLength !== current.combinedTextLength) {
    changes.push(
      sanitizeEvidenceChangeLine(
        `Combined source text length changed (${previous.combinedTextLength.toLocaleString()} → ${current.combinedTextLength.toLocaleString()} chars).`,
      ),
    );
  }

  if (previous.sourceSnippetCount !== current.sourceSnippetCount) {
    changes.push(
      sanitizeEvidenceChangeLine(
        `Source snippet count changed (${previous.sourceSnippetCount} → ${current.sourceSnippetCount}).`,
      ),
    );
  }

  if (previous.bundleAvailabilityReason !== current.bundleAvailabilityReason) {
    changes.push(
      sanitizeEvidenceChangeLine(
        "Bundle availability on file changed — review served material before relying.",
      ),
    );
  }

  const prevMarker = previous.matterUpdatedMarker ?? "";
  const currMarker = current.matterUpdatedMarker ?? "";
  if (prevMarker !== currMarker && (prevMarker || currMarker)) {
    changes.push(
      sanitizeEvidenceChangeLine(
        "Matter update marker changed — new or revised documents may be on file.",
      ),
    );
  }

  return dedupe(changes, 6);
}

const EMPTY_RESULT = (
  hasPrevious: boolean,
  summary: string,
): EvidenceChangeCompareResult => ({
  available: true,
  hasPreviousSnapshot: hasPrevious,
  changeSummary: summary,
  closedMissingItems: [],
  newMissingItems: [],
  newOrChangedContradictions: [],
  routeImpact: [],
  readinessImpact: [],
  disclosureChaseUpdates: [],
  clientInstructionUpdates: [],
  doNotConcedeChanges: [],
  warRoomHearingLineUpdate: null,
  solicitorReviewRequired: false,
  sourceMaterialChanged: false,
  sourceStateChanges: [],
  supervisorElevationLabel: null,
  topChanges: [],
});

export function compareEvidenceChanges(
  previous: EvidenceChangeSnapshot | null | undefined,
  current: EvidenceChangeSnapshot | null | undefined,
): EvidenceChangeCompareOutcome {
  if (!current) {
    return { available: false, reason: "no_current_snapshot" };
  }

  if (!previous) {
    return EMPTY_RESULT(
      false,
      sanitizeEvidenceChangeLine(
        "No saved snapshot — save current papers state to compare after new material is added.",
      ),
    );
  }

  const sourceStateChanges = compareSourceState(previous.sourceState, current.sourceState);
  const sourceMaterialChanged = sourceStateChanges.length > 0;

  const closedMissingItems = dedupe(
    removed(previous.missingMaterialLabels, current.missingMaterialLabels).map(
      (l) => `Previously missing item appears closed: ${l}`,
    ),
    6,
  );

  const newMissingItems = dedupe(
    added(previous.missingMaterialLabels, current.missingMaterialLabels).map(
      (l) => `New missing or partial item on papers: ${l}`,
    ),
    6,
  );

  const newOrChangedContradictions = dedupe(
    changed(previous.contradictionLabels, current.contradictionLabels).map((l) =>
      previous.contradictionLabels.some((p) => normKey(p) === normKey(l))
        ? `Changed contradiction on papers: ${l}`
        : `New contradiction requires solicitor review: ${l}`,
    ),
    6,
  );

  const routeImpact: string[] = [];
  if (normKey(previous.routeLabel) !== normKey(current.routeLabel)) {
    routeImpact.push(
      sanitizeEvidenceChangeLine(
        "New material may affect the current route — primary route label changed on source-backed reasoning.",
      ),
    );
    routeImpact.push(
      sanitizeEvidenceChangeLine(
        `Route was: ${previous.routeLabel.slice(0, 120)}. Now: ${current.routeLabel.slice(0, 120)}.`,
      ),
    );
  }

  const readinessImpact: string[] = [];
  if (previous.readinessLevel !== current.readinessLevel) {
    readinessImpact.push(
      sanitizeEvidenceChangeLine(
        `Readiness changed from ${readinessLabel(previous.readinessLevel)} to ${readinessLabel(current.readinessLevel)} — solicitor review before fixing hearing position.`,
      ),
    );
  }
  if (readinessWorsened(previous.readinessLevel, current.readinessLevel)) {
    readinessImpact.push(
      sanitizeEvidenceChangeLine("Readiness changed — solicitor review required before relying."),
    );
  }

  const disclosureChaseUpdates = dedupe(
    changed(previous.disclosureChaseLabels, current.disclosureChaseLabels).map((l) =>
      added(previous.disclosureChaseLabels, current.disclosureChaseLabels).some(
        (n) => normKey(n) === normKey(l),
      )
        ? `New disclosure chase priority: ${l}`
        : `Disclosure chase should be reviewed: ${l}`,
    ),
    6,
  );

  const clientInstructionUpdates = dedupe(
    changed(previous.clientInstructionLabels, current.clientInstructionLabels).map(
      (l) => `Client instruction gap updated: ${l}`,
    ),
    6,
  );

  const doNotConcedeChanges = dedupe(
    changed(previous.doNotConcedeLabels, current.doNotConcedeLabels).map(
      (l) => `Do-not-concede risk updated: ${l}`,
    ),
    6,
  );

  let warRoomHearingLineUpdate: string | null = null;
  if (normKey(previous.warRoomHearingLine) !== normKey(current.warRoomHearingLine)) {
    warRoomHearingLineUpdate = sanitizeEvidenceChangeLine(
      "Safe hearing wording should be reviewed — War Room hearing line changed on served papers.",
    );
  }

  const proofPressureUpdates = dedupe(
    changed(previous.proofPressureLabels, current.proofPressureLabels).map(
      (l) => `Proof-map pressure changed: ${l}`,
    ),
    4,
  );

  const humanReviewChanged =
    previous.humanReviewRequired !== current.humanReviewRequired && current.humanReviewRequired;

  const paperStateChangeCount =
    closedMissingItems.length +
    newMissingItems.length +
    newOrChangedContradictions.length +
    routeImpact.length +
    readinessImpact.length +
    disclosureChaseUpdates.length +
    clientInstructionUpdates.length +
    doNotConcedeChanges.length +
    proofPressureUpdates.length +
    (warRoomHearingLineUpdate ? 1 : 0);

  const solicitorReviewRequired =
    humanReviewChanged ||
    newOrChangedContradictions.length > 0 ||
    newMissingItems.length > 0 ||
    routeImpact.length > 0 ||
    readinessImpact.length > 0 ||
    readinessWorsened(previous.readinessLevel, current.readinessLevel) ||
    doNotConcedeChanges.length > 0 ||
    warRoomHearingLineUpdate !== null ||
    sourceMaterialChanged ||
    current.humanReviewRequired;

  const supervisorElevationLabel =
    sourceMaterialChanged || solicitorReviewRequired
      ? sanitizeEvidenceChangeLine("Supervisor review suggested because material changed")
      : null;

  const topChanges = dedupe(
    [
      ...(sourceMaterialChanged
        ? [
            sanitizeEvidenceChangeLine(
              "Source material appears to have changed — compare before relying on the previous position.",
            ),
          ]
        : []),
      ...sourceStateChanges,
      ...closedMissingItems,
      ...newMissingItems,
      ...newOrChangedContradictions,
      ...routeImpact,
      ...readinessImpact,
      ...disclosureChaseUpdates,
      ...proofPressureUpdates,
      ...(warRoomHearingLineUpdate ? [warRoomHearingLineUpdate] : []),
    ],
    8,
  );

  let changeSummary: string;
  if (sourceMaterialChanged) {
    changeSummary = sanitizeEvidenceChangeLine(
      "Source material appears to have changed — compare before relying on the previous position.",
    );
  } else if (paperStateChangeCount === 0) {
    changeSummary = sanitizeEvidenceChangeLine(
      "No obvious material change since last saved snapshot — still subject to solicitor review.",
    );
  } else {
    changeSummary = sanitizeEvidenceChangeLine(
      `${topChanges.length} paper-state change(s) since last saved snapshot — solicitor review recommended before finalising hearing position.`,
    );
  }

  return {
    available: true,
    hasPreviousSnapshot: true,
    changeSummary,
    closedMissingItems,
    newMissingItems,
    newOrChangedContradictions,
    routeImpact: dedupe(routeImpact, 4),
    readinessImpact: dedupe(readinessImpact, 4),
    disclosureChaseUpdates,
    clientInstructionUpdates,
    doNotConcedeChanges,
    warRoomHearingLineUpdate,
    solicitorReviewRequired,
    sourceMaterialChanged,
    sourceStateChanges,
    supervisorElevationLabel,
    topChanges,
  };
}
