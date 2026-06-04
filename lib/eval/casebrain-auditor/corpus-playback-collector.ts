import {
  dedupeWorkflowChaseLabels,
  filterBattleboardForWorkflowPilot,
  filterWorkflowPilotLines,
  isMalformedPilotEvidenceAnchor,
  workflowDisclosureCaseWideLine,
  workflowPrimaryRouteTitle,
  workflowSafeCourtLine,
} from "@/lib/criminal/pilot-workflow";
import {
  inferAuditorFamilyFromOffence,
  loadRealCaseBattleboardInputs,
  mergeOffenceSignals,
  type RealCaseRow,
} from "./real-case-collector";
import { inferFamilyFromRouteTitle, runCorpusPlaybackChecks } from "./corpus-playback-checks";
import type { CorpusCasePlayback } from "./corpus-playback-types";
import type { UserRoleMode } from "./types";

const POLICE_STATION_RE =
  /\b(police station|custody|PACE|detention|interview under caution|interview record|solicitor at station)\b/i;

function uniqueLines(lines: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function linesMatching(texts: string[], re: RegExp): string[] {
  return uniqueLines(texts.filter((t) => re.test(t)));
}

export async function collectCorpusCasePlayback(
  row: RealCaseRow,
  orgId: string,
  _opts: { userRole: UserRoleMode },
): Promise<CorpusCasePlayback | null> {
  const loaded = await loadRealCaseBattleboardInputs(row.caseId, orgId);
  if (!loaded) return null;

  const { battleboard } = loaded;
  const ctx = {
    caseTitle: row.caseTitle,
    clientLabel: row.defendantName ?? "Client",
    allegation: mergeOffenceSignals(row.allegedOffence, row.chargeOffences).inferenceText,
    profileHint: row.workflowProfile !== "generic" ? row.workflowProfile : row.auditorFamily ?? null,
  };

  const filtered = filterBattleboardForWorkflowPilot(battleboard, ctx);
  const bb = filtered ?? battleboard;
  const primary = bb.primary_route;

  const inferenceText = mergeOffenceSignals(row.allegedOffence, row.chargeOffences).inferenceText;
  const inferredChargeFamily = inferAuditorFamilyFromOffence(inferenceText);
  const primaryRouteTitle = primary?.title ?? workflowPrimaryRouteTitle(ctx);
  const routeFamily = inferFamilyFromRouteTitle(primaryRouteTitle);

  const rawChase = battleboard.routes.flatMap((r) => r.next_moves ?? []);
  const filteredChase = filterWorkflowPilotLines(rawChase, ctx, { max: 12 });
  const disclosureChaseLabels = dedupeWorkflowChaseLabels(filteredChase).slice(0, 8);

  const courtLines = uniqueLines([
    workflowSafeCourtLine(ctx) ?? "",
    workflowDisclosureCaseWideLine(ctx) ?? "",
    bb.position_notice ?? "",
  ]);

  const hearingLines = uniqueLines([primary?.hearing_line ?? ""]);
  const prosePool = [
    bb.solicitor_safe_summary ?? "",
    ...(primary?.why_it_helps ?? []),
    ...(primary?.collapse_risks ?? []),
    ...(bb.global_collapse_risks ?? []),
    ...bb.routes.flatMap((r) => r.next_moves ?? []),
  ];
  const policeStationAdjacentLines = linesMatching(prosePool, POLICE_STATION_RE);

  const collapseRisks = uniqueLines([
    ...(primary?.collapse_risks ?? []),
    ...(bb.global_collapse_risks ?? []),
  ]);
  const evidenceAnchors = uniqueLines(
    (primary?.evidence_anchors ?? []).map((a) => a.slice(0, 120)),
  );

  const malformedLineCandidates = uniqueLines(
    [...evidenceAnchors, ...disclosureChaseLabels, ...collapseRisks].filter((l) =>
      isMalformedPilotEvidenceAnchor(l),
    ),
  );

  const playback: CorpusCasePlayback = {
    caseId: row.caseId,
    caseTitle: row.caseTitle,
    corpusBucket: row.corpusBucket,
    documentCount: row.documentCount,
    allegedOffence: row.allegedOffence,
    charges: row.chargeOffences,
    inferenceText,
    inferredChargeFamily,
    workflowProfile: row.workflowProfile,
    auditorFamily: row.auditorFamily,
    primaryRouteTitle: primaryRouteTitle ?? null,
    routeFamily,
    courtLines,
    hearingLines,
    policeStationAdjacentLines,
    disclosureChaseLabels,
    collapseRisks,
    evidenceAnchors,
    malformedLineCandidates,
    thinBundleStatus: bb.overall_status === "thin_bundle",
    overallStatus: bb.overall_status ?? null,
    solicitorSafeSummary: bb.solicitor_safe_summary ?? null,
    findings: [],
  };

  playback.findings = runCorpusPlaybackChecks(playback);
  return playback;
}
