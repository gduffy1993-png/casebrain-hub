import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { tagDiscoveryIssue } from "./discovery-issue";
import { matchFingerprintRules } from "./issue-fingerprints";
import { runSourceGroundingPatternScan } from "./source-grounding-rubric";
import { collectCaseSurfaces } from "./surface-collectors";
import type {
  AuditorIssue,
  AuditorPackId,
  CaseTruthManifest,
  ScreenCollection,
} from "./types";
import { UNIVERSAL_DISCOVERY_PATTERNS } from "./issue-fingerprints";

/** Discovery scan — pattern-based only; no strict truth manifest grading. */
export function scoreDiscoverySurfaces(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  screens: ScreenCollection[],
): AuditorIssue[] {
  const issues: AuditorIssue[] = [];
  const screensToScan = screens.filter((s) => s.collectionStatus !== "missing");

  if (screens.length === 0 || screens.every((s) => s.collectionStatus === "missing")) {
    issues.push(
      tagDiscoveryIssue(manifest, {
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen: "control_room",
        status: "fail",
        severity: "HIGH",
        fingerprint: "ui.surface_not_collected",
        issueFamily: "ui",
        badText: "",
        expected: "At least one workflow surface must be collected for discovery.",
        surfaceSource: "live-builder",
        collectionStatus: "missing",
        suggestedSharedFix: "Enable NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true or fix builder collectors.",
        demoBlocker: false,
        message: "No surfaces collected",
        releaseBlocking: false,
      }),
    );
    return issues;
  }

  for (const col of screensToScan) {
    const text = col.allText;
    for (const re of UNIVERSAL_DISCOVERY_PATTERNS) {
      const m = text.match(re.pattern);
      if (!m) continue;
      issues.push(
        tagDiscoveryIssue(manifest, {
          runId,
          pack,
          caseId: manifest.caseId,
          caseTitle: manifest.caseTitle,
          screen: col.screen,
          status: "weak",
          severity: re.severity,
          fingerprint: re.fingerprint,
          issueFamily: re.issueFamily,
          badText: m[0],
          expected: re.expected,
          surfaceSource: col.surfaceSource,
          collectionStatus: col.collectionStatus,
          suggestedSharedFix: re.suggestedSharedFix,
          demoBlocker: (re.demoBlocker ?? false) && manifest.corpusBucket !== "C",
          message: `${re.fingerprint}: ${m[0]}`,
          releaseBlocking: false,
        }),
      );
    }

    for (const src of runSourceGroundingPatternScan(text)) {
      if (src.severity === "CRITICAL" && /unsupported_admission/i.test(src.fingerprint)) {
        issues.push(
          tagDiscoveryIssue(manifest, {
            runId,
            pack,
            caseId: manifest.caseId,
            caseTitle: manifest.caseTitle,
            screen: col.screen,
            status: "fail",
            severity: "CRITICAL",
            fingerprint: src.fingerprint,
            issueFamily: "source",
            badText: src.match,
            expected: src.expected,
            surfaceSource: col.surfaceSource,
            collectionStatus: col.collectionStatus,
            suggestedSharedFix: "softenSolicitorSourceWording / filterBattleboardForWorkflowPilot",
            demoBlocker: manifest.corpusBucket !== "C",
            message: src.fingerprint,
            releaseBlocking: manifest.corpusBucket !== "C",
          }),
        );
      }
    }
  }

  if (!isCriminalPilotMode()) {
    issues.push(
      tagDiscoveryIssue(manifest, {
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen: "pilot_ui",
        status: "weak",
        severity: "MEDIUM",
        fingerprint: "manifest.insufficient_truth_data",
        issueFamily: "manifest",
        badText: "NEXT_PUBLIC_CRIMINAL_PILOT_MODE not set",
        expected: "Pilot mode env for representative discovery filters.",
        surfaceSource: "synthetic",
        collectionStatus: "partial",
        suggestedSharedFix: "Set NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true in shell.",
        demoBlocker: false,
        message: "Discovery run without pilot mode",
        releaseBlocking: false,
        productionExcluded: true,
      }),
    );
  }

  return issues;
}

export function runDiscoveryCase(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  opts: { userRole: import("./types").UserRoleMode; pilotUserId: string },
) {
  const screens = collectCaseSurfaces(manifest, opts);
  const issues = scoreDiscoverySurfaces(runId, pack, manifest, screens);
  return { screens, issues };
}
