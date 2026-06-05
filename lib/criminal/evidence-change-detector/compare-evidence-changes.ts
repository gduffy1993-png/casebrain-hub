import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import { sanitizeEvidenceChangeLine } from "./evidence-change-sanitize";
import type {
  EvidenceChangeCompareOutcome,
  EvidenceChangeCompareResult,
  EvidenceChangeSnapshot,
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

  const disclosureChaseUpdates = dedupe(
    changed(previous.disclosureChaseLabels, current.disclosureChaseLabels).map((l) =>
      added(previous.disclosureChaseLabels, current.disclosureChaseLabels).some(
        (n) => normKey(n) === normKey(l),
      )
        ? `New disclosure chase priority: ${l}`
        : `Disclosure chase priority removed or changed: ${l}`,
    ),
    6,
  );

  const clientInstructionUpdates = dedupe(
    changed(previous.clientInstructionLabels, current.clientInstructionLabels).map((l) =>
      `Client instruction gap updated: ${l}`,
    ),
    6,
  );

  const doNotConcedeChanges = dedupe(
    changed(previous.doNotConcedeLabels, current.doNotConcedeLabels).map((l) =>
      `Do-not-concede risk updated: ${l}`,
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

  const solicitorReviewRequired =
    humanReviewChanged ||
    newOrChangedContradictions.length > 0 ||
    newMissingItems.length > 0 ||
    routeImpact.length > 0 ||
    readinessImpact.length > 0 ||
    doNotConcedeChanges.length > 0 ||
    warRoomHearingLineUpdate !== null ||
    current.humanReviewRequired;

  const topChanges = dedupe(
    [
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

  const changeCount = topChanges.length;
  const changeSummary =
    changeCount === 0
      ? sanitizeEvidenceChangeLine(
          "No material label changes since last saved snapshot — still subject to solicitor review.",
        )
      : sanitizeEvidenceChangeLine(
          `${changeCount} paper-state change(s) since last saved snapshot — solicitor review recommended before finalising hearing position.`,
        );

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
    topChanges,
  };
}
