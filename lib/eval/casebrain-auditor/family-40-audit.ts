import { isConfirmedManifest } from "./family-40-manifests";
import type { Family40CaseManifest } from "./types";
import { collectCaseSurfaces } from "./surface-collectors";
import { scoreCaseScreens } from "./scorers";
import type { AuditorIssue, AuditorPackId, UserRoleMode } from "./types";

export function buildUncertainManifestIssues(
  runId: string,
  pack: AuditorPackId,
  manifest: Family40CaseManifest,
): AuditorIssue[] {
  const fingerprint = manifest.bundleFound
    ? "manifest.case_family_uncertain"
    : "manifest.case_not_found";
  return [
    {
      runId,
      pack,
      caseId: manifest.caseId,
      caseTitle: manifest.caseTitle,
      screen: "strategy",
      status: "warn",
      severity: "MEDIUM",
      fingerprint,
      issueFamily: "manifest",
      badText: manifest.certaintyNote ?? manifest.offenceTag,
      expected: "Confirmed family assignment and bundle-backed truth manifest required for release-blocking grade.",
      surfaceSource: "synthetic",
      collectionStatus: manifest.bundleFound ? "partial" : "missing",
      suggestedSharedFix: "Approve family assignment or add full truth manifest from bundle review.",
      demoBlocker: false,
      message: `${fingerprint}: ${manifest.sourceRef}`,
      releaseBlocking: false,
      manifestConfirmed: false,
    },
  ];
}

export function auditFamily40Case(
  runId: string,
  pack: AuditorPackId,
  manifest: Family40CaseManifest,
  opts: { includeSynthetic: boolean; userRole: UserRoleMode; pilotUserId: string },
) {
  if (!isConfirmedManifest(manifest)) {
    const issues = buildUncertainManifestIssues(runId, pack, manifest);
    return { screens: [] as import("./types").ScreenCollection[], issues, confirmed: false };
  }

  const screens = collectCaseSurfaces(manifest, opts);
  const issues = scoreCaseScreens(runId, pack, manifest, screens, opts);

  return { screens, issues, confirmed: true };
}
