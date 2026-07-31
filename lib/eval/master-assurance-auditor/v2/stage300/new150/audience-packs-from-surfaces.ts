/**
 * Build independent audience / perspective packs from genuine LiveProductionSurfaces.
 * Never handwritten from truth keys.
 */

import crypto from "node:crypto";
import type { LiveProductionSurfaces } from "@/lib/criminal/canonical-live-surface-adapter";
import { buildClientSafeExplanation } from "@/lib/criminal/build-client-safe-explanation";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type AudiencePack = {
  audienceId: string;
  perspectiveId: string;
  payloadText: string;
  payloadSha256: string;
  producer: string;
  comparable: true;
};

export type AudiencePackSet = {
  schemaVersion: "stage300-new150-audience-packs@1.0.0";
  caseId: string;
  independentAudiencePacksPresent: boolean;
  distinctPayloadCount: number;
  packs: AudiencePack[];
  note: string;
};

export function buildAudiencePacksFromProductionSurfaces(args: {
  caseId: string;
  allegation: string;
  clientLabel: string;
  surfaces: LiveProductionSurfaces;
}): AudiencePackSet {
  const { surfaces } = args;
  const exportSections = new Map(
    (surfaces.exportPack.sections ?? []).map((s) => [s.id, s.textForClipboard ?? ""]),
  );

  const courtText =
    surfaces.composedProse.courtLine ||
    String(exportSections.get("court_note") ?? "") ||
    "";
  const cpsText =
    surfaces.composedProse.cpsChase ||
    String(exportSections.get("cps_chase") ?? "") ||
    "";
  const clientText =
    buildClientSafeExplanation({
      clientLabel: args.clientLabel,
      allegation: args.allegation,
      hasOutstandingDisclosure: (surfaces.disclosureChase.items ?? []).length > 0,
      fallback: surfaces.composedProse.clientDisclaimer,
    }) ||
    String(exportSections.get("client_summary") ?? "") ||
    surfaces.composedProse.clientDisclaimer ||
    "";

  const supervisorText = JSON.stringify(
    {
      signals: surfaces.controlRoom.signals,
      findings: (surfaces.controlRoom.findings ?? []).slice(0, 8),
    },
    null,
    2,
  );

  const defenceText = JSON.stringify(
    {
      kind: "defence_solicitor_five_answers",
      mustNotOverstate: surfaces.truthMap.mustNotOverstate ?? [],
      evidenceRowCount: (surfaces.truthMap.evidenceState?.rows ?? []).length,
      courtLine: surfaces.composedProse.courtLine,
      limitations: surfaces.requiredLimitations,
    },
    null,
    2,
  );

  const prosecutionText = JSON.stringify(
    {
      kind: "prosecution_challenge_surface",
      chaseItems: (surfaces.disclosureChase.items ?? []).map((i) => ({
        label: i.label,
        draft: i.draftChaseWording,
      })),
      cpsChase: surfaces.composedProse.cpsChase,
    },
    null,
    2,
  );

  const judicialText = JSON.stringify(
    {
      kind: "judicial_neutrality_surface",
      courtLine: surfaces.composedProse.courtLine,
      limitations: surfaces.requiredLimitations,
      doNotOverstate: surfaces.truthMap.mustNotOverstate ?? [],
    },
    null,
    2,
  );

  const raw: Array<{ audienceId: string; perspectiveId: string; text: string; producer: string }> = [
    {
      audienceId: "court",
      perspectiveId: "court_precise",
      text: courtText,
      producer: "composeStructuredSolicitorOutput:court_line+exportPack.court_note",
    },
    {
      audienceId: "cps",
      perspectiveId: "cps_specific",
      text: cpsText,
      producer: "composeStructuredSolicitorOutput:cps_chase+exportPack.cps_chase",
    },
    {
      audienceId: "client",
      perspectiveId: "client_plain",
      text: clientText,
      producer: "buildClientSafeExplanation+clientDisclaimer+exportPack.client_summary",
    },
    {
      audienceId: "supervisor",
      perspectiveId: "supervisor_risk",
      text: supervisorText,
      producer: "buildControlRoomComputedSupervisorSignals",
    },
    {
      audienceId: "defence",
      perspectiveId: "defence_solicitor",
      text: defenceText,
      producer: "buildFiveAnswersView+composedProse.limitations",
    },
    {
      audienceId: "prosecution",
      perspectiveId: "prosecution_challenge",
      text: prosecutionText,
      producer: "buildDisclosureChaseBrief+composedProse.cpsChase",
    },
    {
      audienceId: "judicial",
      perspectiveId: "judicial_neutrality",
      text: judicialText,
      producer: "composedProse.courtLine+requiredLimitations",
    },
  ];

  const packs: AudiencePack[] = raw
    .map((r) => {
      const payloadText = (r.text || "").trim();
      return {
        audienceId: r.audienceId,
        perspectiveId: r.perspectiveId,
        payloadText,
        payloadSha256: sha256(payloadText),
        producer: r.producer,
        comparable: true as const,
      };
    })
    .filter((p) => p.payloadText.length > 0);

  const distinct = new Set(packs.map((p) => p.payloadSha256));
  const independentAudiencePacksPresent = packs.length >= 2 && distinct.size >= 2;

  return {
    schemaVersion: "stage300-new150-audience-packs@1.0.0",
    caseId: args.caseId,
    independentAudiencePacksPresent,
    distinctPayloadCount: distinct.size,
    packs,
    note: independentAudiencePacksPresent
      ? "Distinct audience/perspective payloads captured from genuine production builders"
      : "Insufficient distinct audience payloads from production surfaces",
  };
}
