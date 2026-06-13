/**
 * CB-TB-01 Ryan Hale local smoke — validates extraction + surfaces (production text path).
 * Run: npx tsx scripts/batch-1-cb-tb-01-local-smoke.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCaseSummarySnippet } from "../lib/criminal/build-case-summary-snippet";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  guardBattleboardOutput,
} from "../lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { buildCaseQaPackMarkdown } from "../lib/criminal/export-case-qa-pack";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildProductProofMap } from "../lib/criminal/proof-map/build-product-proof-map";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { extractTextFromFileBuffer } from "../lib/upload/extract-text-from-file";

const PDF = path.join(
  process.cwd(),
  "docs/public-style-bundles/batch-1/CB-TB-01_Ryan_Hale.pdf",
);

const EXPECT = {
  defendant: "Ryan Thomas Hale",
  caseTitle: "R v Ryan Hale",
  court: "Northbridge Magistrates Court",
  hearing: "16 June 2026 at 10:00",
  stage: "First appearance - police charge",
  offence: /robbery.*section\s*8|robbery.*s\.?\s*8/i,
  mustNot: [
    /HaleDOB/i,
    /Theft, contrary to s\.1 Theft Act 1968/i,
    /CourtHearing/i,
    /fictional training|eval pack|CaseBrain check focus|TRAINING \/ TEST BUNDLE/i,
    /Full CCTV confirms Crown timing/i,
    /CAD\/999 timing supports Crown sequence/i,
  ],
};

type Check = { surface: string; pass: boolean; detail: string };

async function main(): Promise<void> {
  if (!fs.existsSync(PDF)) {
    console.error(`Missing PDF: ${PDF}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(PDF);
  const bundleText = await extractTextFromFileBuffer("CB-TB-01_Ryan_Hale.pdf", "application/pdf", buffer);
  const meta = extractBundleCaseMetadata(bundleText);
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const ledger = buildBundleTruthLedger({ bundleText });
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: "cb-tb-01-smoke",
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const disclosureChase = buildDisclosureChaseBrief({
    caseId: "cb-tb-01-smoke",
    caseTitle: "R v Ryan Hale",
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    hearingDateIso: ledger.hearing.dateIso,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
  });
  const warRoom = buildHearingWarRoomBrief({
    caseId: "cb-tb-01-smoke",
    caseTitle: "R v Ryan Hale",
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    readiness: disclosureChase.disclosureSummary,
    battleboard,
    hasSavedPosition: false,
    chaseItems: [],
    bundleText,
  });
  const summary = buildCaseSummarySnippet({
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    court: header.court,
    battleboard,
    chaseItems: disclosureChase.primaryItems.map((i) => i.label).slice(0, 4),
    bundleCombinedText: bundleText.slice(0, 80_000),
  });
  const proofMap = buildProductProofMap({
    frontMatterScan: bundleText,
    combinedTextLength: bundleText.length,
    matterLabel: "R v Ryan Hale",
    allegation: header.allegation,
  });
  const qaMd = buildCaseQaPackMarkdown({
    caseId: "cb-tb-01-smoke",
    caseLabel: "CB-TB-01",
    exportedAt: new Date().toISOString(),
    header,
    caseTitle: "R v Ryan Hale",
    clientLabel: header.clientLabel,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Provisional",
    positionStatus: "Provisional",
    controlRoom: {
      bestRouteTitle: battleboard.primary_route?.title ?? null,
      routeStatus: battleboard.primary_route?.status ?? null,
      prosecutionWeakness: battleboard.primary_route?.why_it_helps?.slice(0, 3) ?? [],
      defenceRisks: battleboard.primary_route?.collapse_risks?.slice(0, 3) ?? [],
      immediateActions: battleboard.urgent_next_moves?.slice(0, 3) ?? [],
      safeCourtLine: warRoom.safePositionToday,
      chaseItems: disclosureChase.primaryItems.map((i) => i.label).slice(0, 4),
    },
    battleboard,
    warRoom,
    disclosureChase,
    positionNotes: { savedPosition: null, clientInstructions: null },
    documents: { count: 1, combinedTextLength: bundleText.length, rows: [{ name: "CB-TB-01_Ryan_Hale.pdf" }] },
    bundleText,
  });

  const surfaces: Record<string, string> = {
    court_today: `${hearing ?? ""} ${header.court ?? meta.court ?? ""}`,
    cases_list: `${header.clientLabel} R v Ryan Hale`,
    control_room: summary,
    proof_map: proofMap.available ? `${proofMap.charge} ${proofMap.proofPoints.length} points` : "unavailable",
    battleboard: JSON.stringify(battleboard.primary_route ?? {}),
    hearing_war_room: `${warRoom.safePositionToday} ${warRoom.allegation ?? ""}`,
    disclosure_chase: disclosureChase.primaryItems.map((i) => i.label).join("; "),
    documents: "CB-TB-01_Ryan_Hale.pdf",
    qa_export: qaMd,
  };

  const checks: Check[] = [];

  const defGot = meta.defendantName ?? header.clientLabel ?? "";
  checks.push({
    surface: "header_defendant",
    pass: defGot.includes("Ryan Thomas Hale") && !/HaleDOB/i.test(defGot),
    detail: `got: ${defGot}`,
  });

  const offenceGot = meta.offenceDisplay ?? header.allegation ?? "";
  checks.push({
    surface: "header_offence",
    pass: EXPECT.offence.test(offenceGot) && !/Theft, contrary to s\.1/i.test(offenceGot),
    detail: `got: ${offenceGot}`,
  });

  checks.push({
    surface: "header_court",
    pass: (meta.court ?? header.court ?? "").includes("Northbridge Magistrates") && !/CourtHearing/i.test(meta.court ?? ""),
    detail: `got: ${meta.court ?? header.court}`,
  });

  checks.push({
    surface: "header_hearing",
    pass: (meta.nextHearingRaw ?? hearing ?? "").includes("16 June 2026"),
    detail: `got: ${meta.nextHearingRaw ?? hearing}`,
  });

  checks.push({
    surface: "court_today",
    pass: /16\s+Jun(?:e)?\s+2026/i.test(surfaces.court_today),
    detail: surfaces.court_today.slice(0, 120),
  });

  checks.push({
    surface: "cases_list",
    pass: header.clientLabel.includes("Ryan") && header.clientLabel.includes("Hale"),
    detail: header.clientLabel,
  });

  checks.push({
    surface: "control_room",
    pass: /robbery/i.test(summary) && /provisional|conditional/i.test(summary),
    detail: summary.slice(0, 200),
  });

  checks.push({
    surface: "proof_map",
    pass: proofMap.available === true && (proofMap.proofPoints?.length ?? 0) > 0 && /robbery|theft act/i.test(proofMap.charge ?? ""),
    detail: proofMap.available ? `${proofMap.charge} (${proofMap.proofPoints.length})` : "empty",
  });

  checks.push({
    surface: "battleboard",
    pass: Boolean(battleboard.primary_route) && !/Full CCTV confirms/i.test(JSON.stringify(battleboard)),
    detail: battleboard.primary_route?.title ?? "none",
  });

  checks.push({
    surface: "hearing_war_room",
    pass: Boolean(warRoom.safePositionToday?.trim()) && /conditional|provisional|outstanding/i.test(warRoom.safePositionToday),
    detail: warRoom.safePositionToday?.slice(0, 120) ?? "",
  });

  checks.push({
    surface: "disclosure_chase",
    pass: (disclosureChase.primaryItems?.length ?? 0) > 0,
    detail: `${disclosureChase.primaryItems?.length ?? 0} items`,
  });

  checks.push({
    surface: "qa_export",
    pass: /Robbery/i.test(qaMd) && /Ryan Thomas Hale/i.test(qaMd),
    detail: qaMd.slice(0, 150),
  });

  const allText = Object.values(surfaces).join("\n");
  for (const re of EXPECT.mustNot) {
    checks.push({
      surface: `forbidden_${re.source.slice(0, 24)}`,
      pass: !re.test(allText),
      detail: re.test(allText) ? `HIT: ${re.source}` : "ok",
    });
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(JSON.stringify({ pass: checks.length - failed.length, fail: failed.length, checks }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
