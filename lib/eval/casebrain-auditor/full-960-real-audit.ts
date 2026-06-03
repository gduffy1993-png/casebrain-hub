import {
  buildDiscoveryManifestFromRealCase,
  collectRealCaseDiscoverySurfaces,
  exportRealCaseList,
  fetchRealCaseRows,
  type RealCaseRow,
} from "./real-case-collector";
import { scoreDiscoverySurfaces } from "./discovery-mode";
import type { AuditorIssue, AuditorPackId, CaseAuditResult, UserRoleMode } from "./types";

export async function auditFull960RealCorpus(
  runId: string,
  orgId: string,
  opts: {
    userRole: UserRoleMode;
    limit: number;
    offset: number;
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

  for (const row of rows) {
    const manifest = buildDiscoveryManifestFromRealCase(row);
    const screens = await collectRealCaseDiscoverySurfaces(row, orgId, { userRole: opts.userRole });
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
