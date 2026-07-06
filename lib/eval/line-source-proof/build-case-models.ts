import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "@/lib/criminal/strategy-battleboard";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildHearingMode } from "@/lib/criminal/hearing-mode/build-hearing-mode";
import { buildExportPack } from "@/lib/criminal/export-pack/build-export-pack";
import { buildMatterConfidence } from "@/lib/criminal/matter-confidence/build-matter-confidence";
import { buildDecisionBoard } from "@/lib/criminal/decision-board/build-decision-board";
import { loadTruthKeyFromFile } from "../evidence-state-audit/fixtures";
import type { EvidenceStateTruthKey } from "../evidence-state-audit/types";
import {
  gateChaseBrief,
  gateDoNotOverstateList,
  gateWarRoomBrief,
} from "./output-presentation-gate";
import { isDemoAuditCase, polishDemoAuditModels, polishDemoAuditExportPack } from "../demo-audit-packs/presentation-polish";
import { ProofLedgerSession, withProofLedgerSession } from "./proof-ledger-session";
import type { ProofLedgerRawModels } from "./proof-ledger-types";

export type H5CaseModels = {
  caseId: string;
  bundleText: string;
  truthKey: EvidenceStateTruthKey;
  clientLabel: string;
  allegation: string;
  chase: ReturnType<typeof buildDisclosureChaseBrief>;
  warRoom: ReturnType<typeof buildHearingWarRoomBrief>;
  briefPlan: ReturnType<typeof buildCriminalBriefPlan>;
  matterConfidence: ReturnType<typeof buildMatterConfidence>;
  five: ReturnType<typeof buildFiveAnswersView>;
  hearing: ReturnType<typeof buildHearingMode>;
  exportPack: ReturnType<typeof buildExportPack>;
  matterBrief: ReturnType<typeof buildMatterBrief>;
  decisionBoard: ReturnType<typeof buildDecisionBoard>;
};

export type H5CaseBuildResult = {
  models: H5CaseModels;
  raw: ProofLedgerRawModels;
  session: ProofLedgerSession;
};

export function loadCaseBundle(caseDir: string): { bundleText: string; truthKey: EvidenceStateTruthKey } {
  const bundlePath = path.join(caseDir, "bundle-text.md");
  const truthPath = path.join(caseDir, "truth-key.json");
  if (!fs.existsSync(bundlePath) || !fs.existsSync(truthPath)) {
    throw new Error(`Missing bundle or truth key in ${caseDir}`);
  }
  return {
    bundleText: fs.readFileSync(bundlePath, "utf8"),
    truthKey: loadTruthKeyFromFile(truthPath),
  };
}

export function buildH5CaseModels(caseDir: string): H5CaseModels {
  return buildH5CaseModelsWithLedger(caseDir).models;
}

export function buildH5CaseModelsWithLedger(caseDir: string): H5CaseBuildResult {
  const session = new ProofLedgerSession();
  const { bundleText, truthKey } = loadCaseBundle(caseDir);
  const caseId = truthKey.caseId;
  const clientLabel =
    bundleText.match(/Defendant:\s*(.+)/i)?.[1]?.trim() ??
    bundleText.match(/R v\s+([^\n]+)/i)?.[1]?.trim() ??
    "Client";
  const allegation =
    truthKey.offenceWording ??
    bundleText.match(/Statement of Offence:\s*\n?([^\n]+)/i)?.[1]?.trim() ??
    "Criminal matter";

  const ledger = buildBundleTruthLedger({ bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item),
    allegation,
  });

  const battleboard = buildStrategyBattleboard({
    case_id: caseId,
    bundle_text: bundleText,
    offence_label: allegation,
  });

  const chaseRaw = buildDisclosureChaseBrief({
    caseId,
    caseTitle: `R v ${clientLabel}`,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "thin",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    snapshotMissing: truthKey.evidenceItems
      .filter((i) => i.chase_needed)
      .map((i) => ({ label: i.evidence_item, status: "outstanding" })),
    briefPlan,
  });

  const warRoomRaw = buildHearingWarRoomBrief({
    caseId,
    caseTitle: `R v ${clientLabel}`,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "thin",
    positionStatus: "Provisional",
    readiness: "Conditional",
    battleboard,
    hasSavedPosition: false,
    chaseItems: chaseRaw.primaryItems.map((i) => i.label),
    bundleText,
    briefPlan,
  });

  const { chase: chaseGated, warRoom: warRoomGated, doNotOverstateRaw } = withProofLedgerSession(session, () => {
    const chaseGatedInner = gateChaseBrief(chaseRaw, bundleText);
    const warRoomGatedInner = gateWarRoomBrief(warRoomRaw, bundleText);
    const doNotOverstate = gateDoNotOverstateList(
      [...(truthKey.mustNotSayGlobal ?? []), ...warRoomGatedInner.doNotOverstate],
      bundleText,
    );
    return { chase: chaseGatedInner, warRoom: warRoomGatedInner, doNotOverstateRaw: doNotOverstate };
  });

  const polished = isDemoAuditCase(caseId)
    ? polishDemoAuditModels({
        chase: chaseGated,
        warRoom: warRoomGated,
        doNotOverstate: doNotOverstateRaw,
        truthKey,
        bundleText,
      })
    : { chase: chaseGated, warRoom: warRoomGated, doNotOverstate: doNotOverstateRaw };

  const chase = polished.chase;
  const warRoom = polished.warRoom;
  const doNotOverstate = polished.doNotOverstate;

  const matterConfidence = buildMatterConfidence({
    documentCount: ledger.documents?.length ?? 1,
    combinedTextLength: bundleText.length,
    bundleHealth: "thin",
    missingMaterialCount: briefPlan.missingEvidence.length,
    genericProvisional: true,
    hasSafeCourtLine: Boolean(chase.safeCourtLine?.trim()),
    mainIssue: briefPlan.summaryAngle,
  });

  const five = buildFiveAnswersView({
    allegation,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
    truthKey,
    bundleText,
  });

  const primaryRouteTitle = briefPlan.profile.replace(/_/g, " ");

  const hearing = buildHearingMode({
    allegation,
    briefPlan,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
    documentCount: ledger.documents?.length ?? 1,
  });

  const generatedAt = new Date().toISOString();
  const exportPackRaw = buildExportPack({
    caseId,
    allegation,
    warRoom,
    chase,
    briefPlan,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
    appVersion: "line-source-proof",
    generatedAt,
  });
  const exportPack = isDemoAuditCase(caseId)
    ? polishDemoAuditExportPack(exportPackRaw, truthKey, clientLabel, caseId)
    : exportPackRaw;

  const matterBrief = buildMatterBrief({
    warRoom,
    chase,
    primaryRouteTitle,
    briefPlan,
  });

  const decisionBoard = buildDecisionBoard({
    briefPlan,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
  });

  const models: H5CaseModels = {
    caseId,
    bundleText,
    truthKey,
    clientLabel,
    allegation,
    chase,
    warRoom,
    briefPlan,
    matterConfidence,
    five,
    hearing,
    exportPack,
    matterBrief,
    decisionBoard,
  };

  return {
    models,
    raw: {
      chase: chaseRaw,
      warRoom: warRoomRaw,
      doNotOverstate: [...(truthKey.mustNotSayGlobal ?? []), ...warRoomRaw.doNotOverstate],
    },
    session,
  };
}
