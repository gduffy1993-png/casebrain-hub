import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import {
  buildOffenceCoverage,
  writeOffenceCoverageReports,
} from "./offence-coverage";
import {
  collectRealCaseDiscoverySurfaces,
  fetchRealCaseRows,
  inferAuditorFamilyFromOffence,
  mergeOffenceSignals,
  type RealCaseRow,
} from "./real-case-collector";
import { getAuditorSupabaseAdmin } from "./script-supabase";
import type { UserRoleMode } from "./types";

export type UnknownGenericInvestigation = {
  caseId: string;
  caseTitle: string;
  corpusBucket: string;
  allegedOffence: string | null;
  chargeOffences: string[];
  inferenceText: string;
  inferredFamily: string | null;
  workflowProfile: string;
  documentCount: number;
  likelyCause: string;
  suggestedSharedFix: string | null;
};

function bucketForRow(row: RealCaseRow): string {
  if (row.auditorFamily) return row.auditorFamily;
  if (row.workflowProfile !== "generic") return `workflow:${row.workflowProfile}`;
  if (row.evalPackName) return `eval:${row.evalPackName}`;
  return "unknown/generic";
}

function likelyCauseForUnknown(row: RealCaseRow, inferenceText: string): string {
  if (!inferenceText.trim()) {
    return "No alleged_offence and no criminal_charges — metadata empty (often test/placeholder cases; not a routing bug).";
  }
  if (/\b(dangerous driving|driving whilst|no insurance|fail to stop|motoring|speeding|drink drive|drug drive)\b/i.test(inferenceText)) {
    return "Motoring offence — no workflow profile family (by design returns null).";
  }
  if (/\b(breach|contempt|warrant|bail|recall|committal)\b/i.test(inferenceText)) {
    return "Procedural/bail matter — not mapped to criminal workflow families.";
  }
  if (row.workflowProfile !== "generic" && !row.auditorFamily) {
    return "Workflow profile resolved from signals but auditorFamily not set — mapping gap.";
  }
  return "Offence text present but keyword inference did not match any family pack.";
}

function suggestedFixForCause(cause: string): string | null {
  if (cause.includes("metadata empty")) return null;
  if (cause.includes("Motoring offence")) return null;
  if (cause.includes("Procedural/bail")) return null;
  if (cause.includes("mapping gap")) {
    return "Set auditorFamily from workflowProfile when profile !== generic in fetchRealCaseRows.";
  }
  return "Extend inferAuditorFamilyFromOffence with shared conservative keywords if pattern repeats.";
}

export async function fetchAllRealCaseRows(orgId: string, max = 1000): Promise<RealCaseRow[]> {
  const all: RealCaseRow[] = [];
  const page = 50;
  for (let offset = 0; offset < max; offset += page) {
    const { rows } = await fetchRealCaseRows(orgId, {
      limit: Math.min(page, max - offset),
      offset,
      criminalOnly: true,
    });
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export function filterProductionRows(rows: RealCaseRow[]): RealCaseRow[] {
  return rows.filter((r) => isProductionScoredBucket(r.corpusBucket));
}

export function listUnknownGenericRows(rows: RealCaseRow[]): RealCaseRow[] {
  return rows.filter((r) => bucketForRow(r) === "unknown/generic");
}

export function buildUnknownGenericInvestigations(rows: RealCaseRow[]): UnknownGenericInvestigation[] {
  return listUnknownGenericRows(rows).map((row) => {
    const inferenceText = mergeOffenceSignals(row.allegedOffence, row.chargeOffences).inferenceText;
    const cause = likelyCauseForUnknown(row, inferenceText);
    return {
      caseId: row.caseId,
      caseTitle: row.caseTitle,
      corpusBucket: row.corpusBucket,
      allegedOffence: row.allegedOffence,
      chargeOffences: row.chargeOffences,
      inferenceText,
      inferredFamily: inferAuditorFamilyFromOffence(inferenceText),
      workflowProfile: row.workflowProfile,
      documentCount: row.documentCount,
      likelyCause: cause,
      suggestedSharedFix: suggestedFixForCause(cause),
    };
  });
}

export type ProductionCaseBrief = {
  caseId: string;
  caseTitle: string;
  corpusBucket: string;
  offenceBucket: string;
  workflowProfile: string;
  auditorFamily: string | null;
  documentCount: number;
  primaryRoute: string | null;
  overallStatus: string | null;
  issueFingerprints: string[];
  pass: boolean;
};

export async function buildProductionCaseBriefs(
  rows: RealCaseRow[],
  orgId: string,
  opts: { userRole: UserRoleMode },
): Promise<ProductionCaseBrief[]> {
  const briefs: ProductionCaseBrief[] = [];
  for (const row of rows) {
    const screens = await collectRealCaseDiscoverySurfaces(row, orgId, { userRole: opts.userRole });
    const control = screens.find((s) => s.screen === "control_room");
    const strategy = screens.find((s) => s.screen === "strategy");
    const fingerprints = screens.flatMap((s) => {
      const issues: string[] = [];
      const text = s.allText;
      if (/\b(proves|establishes guilt|confirms participation)\b/i.test(text)) {
        issues.push("wording.thin_bundle_overconfident?");
      }
      return issues;
    });

    briefs.push({
      caseId: row.caseId,
      caseTitle: row.caseTitle,
      corpusBucket: row.corpusBucket,
      offenceBucket: bucketForRow(row),
      workflowProfile: row.workflowProfile,
      auditorFamily: row.auditorFamily,
      documentCount: row.documentCount,
      primaryRoute:
        typeof control?.payload?.primaryRoute === "string" ? control.payload.primaryRoute : null,
      overallStatus:
        typeof strategy?.payload?.overallStatus === "string" ? strategy.payload.overallStatus : null,
      issueFingerprints: [...new Set(fingerprints)],
      pass: fingerprints.length === 0,
    });
  }
  return briefs;
}

export function writeProductionOnlyOffenceCoverage(outDir: string, rows: RealCaseRow[]): void {
  const productionRows = filterProductionRows(rows);
  fs.mkdirSync(outDir, { recursive: true });
  const coverage = buildOffenceCoverage(productionRows);
  const unknownCount = listUnknownGenericRows(productionRows).length;

  fs.writeFileSync(
    path.join(outDir, "production-offence-coverage.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalProductionCases: productionRows.length,
        unknownGenericCount: unknownCount,
        coverage,
      },
      null,
      2,
    ),
    "utf8",
  );

  const lines = [
    "# Production offence coverage (A+B only)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Production cases: **${productionRows.length}**`,
    `Unknown/generic: **${unknownCount}**`,
    "",
    "| Bucket | Count | Generic profile | Sample IDs |",
    "|--------|------:|----------------:|------------|",
  ];
  for (const c of coverage) {
    lines.push(`| ${c.bucket} | ${c.count} | ${c.genericProfileCount} | ${c.sampleCaseIds.join(", ")} |`);
  }
  lines.push("", "_Not committed — review routing gaps only._", "");
  fs.writeFileSync(path.join(outDir, "production-offence-coverage.md"), lines.join("\n"), "utf8");
}

export async function runProductionDeepPassArtifacts(
  outDir: string,
  opts: { userRole: UserRoleMode; maxCases?: number },
): Promise<{
  productionCount: number;
  unknownGenericBefore: number;
  unknownGenericAfter: number;
  investigations: UnknownGenericInvestigation[];
  briefs: ProductionCaseBrief[];
}> {
  const orgId = process.env.EVAL_ORG_ID?.trim();
  if (!orgId) throw new Error("EVAL_ORG_ID required for production deep pass.");

  const allRows = await fetchAllRealCaseRows(orgId, opts.maxCases ?? 1000);
  const productionRows = filterProductionRows(allRows);
  const unknownBefore = listUnknownGenericRows(productionRows).length;

  writeProductionOnlyOffenceCoverage(outDir, allRows);
  writeOffenceCoverageReports(path.join(outDir, "full-corpus-reference"), allRows);

  const investigations = buildUnknownGenericInvestigations(productionRows);
  fs.writeFileSync(
    path.join(outDir, "unknown-generic-investigation.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), investigations }, null, 2),
    "utf8",
  );

  const invLines = [
    "# Unknown/generic investigation (production A+B)",
    "",
    `Cases: **${investigations.length}**`,
    "",
  ];
  for (const inv of investigations) {
    invLines.push(`## ${inv.caseTitle}`, "");
    invLines.push(`- **caseId:** ${inv.caseId} (${inv.corpusBucket})`);
    invLines.push(`- **alleged:** ${inv.allegedOffence ?? "—"}`);
    invLines.push(`- **charges:** ${inv.chargeOffences.length ? inv.chargeOffences.join("; ") : "—"}`);
    invLines.push(`- **inference:** ${inv.inferenceText || "—"}`);
    invLines.push(`- **workflowProfile:** ${inv.workflowProfile}`);
    invLines.push(`- **likelyCause:** ${inv.likelyCause}`);
    invLines.push(`- **suggestedFix:** ${inv.suggestedSharedFix ?? "— (no auto-fix)"}`, "");
  }
  fs.writeFileSync(path.join(outDir, "unknown-generic-investigation.md"), invLines.join("\n"), "utf8");

  const briefs = await buildProductionCaseBriefs(productionRows, orgId, {
    userRole: opts.userRole,
  });
  fs.writeFileSync(
    path.join(outDir, "production-ab-briefs.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), briefs }, null, 2),
    "utf8",
  );

  const briefMd = [
    "# Production A+B deep pass",
    "",
    `Cases: **${briefs.length}**`,
    "",
    "| Title | Bucket | Offence bucket | Profile | Docs | Route | Status | Flags |",
    "|-------|--------|----------------|---------|-----:|-------|--------|-------|",
  ];
  for (const b of briefs) {
    briefMd.push(
      `| ${b.caseTitle.slice(0, 40)} | ${b.corpusBucket} | ${b.offenceBucket} | ${b.workflowProfile} | ${b.documentCount} | ${(b.primaryRoute ?? "—").slice(0, 30)} | ${b.overallStatus ?? "—"} | ${b.issueFingerprints.join(", ") || "—"} |`,
    );
  }
  fs.writeFileSync(path.join(outDir, "production-ab-briefs.md"), briefMd.join("\n"), "utf8");

  const unknownAfter = listUnknownGenericRows(productionRows).length;

  return {
    productionCount: productionRows.length,
    unknownGenericBefore: unknownBefore,
    unknownGenericAfter: unknownAfter,
    investigations,
    briefs,
  };
}

/** Read-only: extra title/allegation peek for investigation (no PII export file). */
export async function peekCaseMetadata(caseIds: string[], orgId: string) {
  const supabase = getAuditorSupabaseAdmin();
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, practice_area")
    .eq("org_id", orgId)
    .in("id", caseIds);
  const { data: criminal } = await supabase
    .from("criminal_cases")
    .select("id, alleged_offence, offence_override, defendant_name")
    .eq("org_id", orgId)
    .in("id", caseIds);
  const { data: charges } = await supabase
    .from("criminal_charges")
    .select("case_id, offence, section")
    .eq("org_id", orgId)
    .in("case_id", caseIds);
  return { cases: cases ?? [], criminal: criminal ?? [], charges: charges ?? [] };
}
