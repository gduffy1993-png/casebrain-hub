import {
  buildDiscoveryManifestFromRealCase,
  collectRealCaseDiscoverySurfaces,
  exportRealCaseList,
  fetchRealCaseRows,
  type RealCaseRow,
} from "./real-case-collector";
import { scoreDiscoverySurfaces } from "./discovery-mode";
import { tagDiscoveryIssue } from "./discovery-issue";
import type { AuditorIssue, AuditorPackId, CaseAuditResult, UserRoleMode } from "./types";

export const DEFAULT_REAL_CASE_COLLECT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${label}`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function auditFull960RealCorpus(
  runId: string,
  orgId: string,
  opts: {
    userRole: UserRoleMode;
    limit: number;
    offset: number;
    caseTimeoutMs?: number;
  },
): Promise<{
  realRows: RealCaseRow[];
  caseResults: CaseAuditResult[];
  issues: AuditorIssue[];
  totalSurfaces: number;
}> {
  const { rows } = await fetchRealCaseRows(orgId, {
    limit: opts.limit,
    offset: opts.offset,
    criminalOnly: true,
  });

  const caseResults: CaseAuditResult[] = [];
  const issues: AuditorIssue[] = [];
  let totalSurfaces = 0;
  const pack: AuditorPackId = "full-960";
  const caseTimeoutMs = opts.caseTimeoutMs ?? DEFAULT_REAL_CASE_COLLECT_TIMEOUT_MS;

  for (const row of rows) {
    const manifest = buildDiscoveryManifestFromRealCase(row);
    let screens;
    try {
      screens = await withTimeout(
        collectRealCaseDiscoverySurfaces(row, orgId, { userRole: opts.userRole }),
        caseTimeoutMs,
        row.caseId,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const timeoutIssue = tagDiscoveryIssue(manifest, {
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen: "control_room",
        status: "warn",
        severity: "MEDIUM",
        fingerprint: "collector.case_timeout",
        issueFamily: "manifest",
        badText: msg,
        expected: "Case should complete read-only collect within timeout.",
        surfaceSource: "api-output",
        collectionStatus: "partial",
        suggestedSharedFix: "Investigate heavy bundle or increase batchCaseTimeoutMs; batch continues.",
        demoBlocker: false,
        message: `collector.case_timeout: ${msg}`,
        releaseBlocking: false,
      });
      issues.push(timeoutIssue);
      caseResults.push({
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        profile: manifest.profile,
        auditorFamily: manifest.auditorFamily,
        manifestCertainty: manifest.manifestCertainty,
        sourceRef: manifest.sourceRef,
        screens: [
          {
            screen: "control_room",
            collectionStatus: "partial",
            surfaceSource: "api-output",
            payload: { error: msg },
            allText: msg,
          },
        ],
        issues: [timeoutIssue],
        pass: false,
        failCount: 0,
        weakCount: 0,
      });
      continue;
    }

    const caseIssues = scoreDiscoverySurfaces(runId, pack, manifest, screens);

    totalSurfaces += screens.length;
    issues.push(...caseIssues);

    caseResults.push({
      caseId: manifest.caseId,
      caseTitle: manifest.caseTitle,
      profile: manifest.profile,
      auditorFamily: manifest.auditorFamily,
      manifestCertainty: manifest.manifestCertainty,
      sourceRef: manifest.sourceRef,
      screens,
      issues: caseIssues,
      pass: false,
      failCount: caseIssues.filter((i) => i.status === "fail" && i.releaseBlocking).length,
      weakCount: caseIssues.filter((i) => i.status === "weak").length,
    });
  }

  return { realRows: rows, caseResults, issues, totalSurfaces };
}

export async function buildRealCaseListExport(orgId: string, limit: number, offset: number) {
  return exportRealCaseList(orgId, { limit, offset });
}
