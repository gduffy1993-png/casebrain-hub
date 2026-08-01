/**
 * Build independent audience / perspective packs from genuine LiveProductionSurfaces.
 * Never handwritten from truth keys.
 *
 * Supervisor exact raw source is NEVER embedded in AudiencePack.payloadText.
 * It is stored only in AudiencePackSet.protectedRawSourceExtracts (audit-only).
 */

import crypto from "node:crypto";
import type { LiveProductionSurfaces } from "@/lib/criminal/canonical-live-surface-adapter";
import { buildClientSafeExplanation } from "@/lib/criminal/build-client-safe-explanation";
import {
  audiencePackCopyablePayloadText,
  buildContainedSupervisorAudienceBundle,
  formatSupervisorProfessionalCopyText,
  type ContainedSupervisorAudiencePayload,
  type ProtectedRawSourceExtract,
} from "@/lib/criminal/supervisor-raw-source-containment";
import { stripInternalCorpusIdentifiers } from "@/lib/criminal/solicitor-visible-matter-reference";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type AudiencePackSendability = "ok" | "provisional_check_source" | "blocked";

export type AudiencePack = {
  audienceId: string;
  perspectiveId: string;
  /** Ordinary copyable/sendable professional text only — never exact raw source or machine JSON. */
  payloadText: string;
  payloadSha256: string;
  /** Outer pack boundary — consumers must honour these; do not rely on nested JSON flags. */
  canCopy: boolean;
  sendability: AudiencePackSendability;
  sendabilityLabel: string;
  excludedFromExport: boolean;
  /** Pointer into protectedRawSourceExtracts when a labelled review extract exists. */
  protectedRawSourcePointer: string | null;
  /**
   * Machine-only structured supervisor fields (hashes, audit flags, finding kinds).
   * Not solicitor-copyable; never merged into payloadText / clipboard.
   */
  machineMetadata?: ContainedSupervisorAudiencePayload | null;
  producer: string;
  comparable: true;
};

export type AudiencePackSet = {
  schemaVersion: "stage300-new150-audience-packs@2.0.0";
  caseId: string;
  independentAudiencePacksPresent: boolean;
  distinctPayloadCount: number;
  packs: AudiencePack[];
  /** Audit-only exact raw extracts — never merged into payloadText or copy/export APIs. */
  protectedRawSourceExtracts: ProtectedRawSourceExtract[];
  note: string;
};

export { audiencePackCopyablePayloadText };

function packBoundary(args: {
  audienceId: string;
  text: string;
  protectedPointer: string | null;
}): Pick<
  AudiencePack,
  "canCopy" | "sendability" | "sendabilityLabel" | "excludedFromExport" | "protectedRawSourcePointer"
> {
  if (args.audienceId === "supervisor") {
    return {
      canCopy: true,
      sendability: args.protectedPointer ? "provisional_check_source" : "ok",
      sendabilityLabel: args.protectedPointer
        ? "Professional summary only — raw source blocked from copy/export"
        : "Ready for solicitor review",
      excludedFromExport: false,
      protectedRawSourcePointer: args.protectedPointer,
    };
  }
  return {
    canCopy: true,
    sendability: "ok",
    sendabilityLabel: "Ready for solicitor review",
    excludedFromExport: false,
    protectedRawSourcePointer: null,
  };
}

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

  const courtText = stripInternalCorpusIdentifiers(
    surfaces.composedProse.courtLine ||
      String(exportSections.get("court_note") ?? "") ||
      "",
  );
  const cpsText = stripInternalCorpusIdentifiers(
    surfaces.composedProse.cpsChase ||
      String(exportSections.get("cps_chase") ?? "") ||
      "",
  );
  const clientText = stripInternalCorpusIdentifiers(
    buildClientSafeExplanation({
      clientLabel: args.clientLabel,
      allegation: args.allegation,
      hasOutstandingDisclosure: (surfaces.disclosureChase.items ?? []).length > 0,
      fallback: surfaces.composedProse.clientDisclaimer,
    }) ||
      String(exportSections.get("client_summary") ?? "") ||
      surfaces.composedProse.clientDisclaimer ||
      "",
  );

  const supervisorBundle = buildContainedSupervisorAudienceBundle({
    exactRawSource:
      surfaces.controlRoom.signals?.payload?.frontMatterScan ??
      surfaces.controlRoom.signals?.payload?.combinedText ??
      null,
    findings: (surfaces.controlRoom.findings ?? []).map((f) => ({
      kind: (f as { kind?: string }).kind,
      summary: (f as { summary?: string }).summary ?? null,
    })),
    readinessLabel: surfaces.controlRoom.signals?.readiness?.available
      ? surfaces.controlRoom.signals.readiness.label
      : null,
    qaStatus: surfaces.controlRoom.signals?.qa?.available
      ? surfaces.controlRoom.signals.qa.status
      : null,
  });
  const supervisorText = formatSupervisorProfessionalCopyText(supervisorBundle.professionalPayload);
  const protectedRawSourceExtracts: ProtectedRawSourceExtract[] = supervisorBundle.protectedRawSource
    ? [supervisorBundle.protectedRawSource]
    : [];

  const defenceText = JSON.stringify(
    {
      kind: "defence_solicitor_five_answers",
      mustNotOverstate: (surfaces.truthMap.mustNotOverstate ?? []).map(stripInternalCorpusIdentifiers),
      evidenceRowCount: (surfaces.truthMap.evidenceState?.rows ?? []).length,
      courtLine: stripInternalCorpusIdentifiers(surfaces.composedProse.courtLine ?? ""),
      limitations: (surfaces.requiredLimitations ?? []).map(stripInternalCorpusIdentifiers),
    },
    null,
    2,
  );

  const prosecutionText = JSON.stringify(
    {
      kind: "prosecution_challenge_surface",
      chaseItems: (surfaces.disclosureChase.items ?? []).map((i) => ({
        label: stripInternalCorpusIdentifiers(i.label ?? ""),
        draft: stripInternalCorpusIdentifiers(i.draftChaseWording ?? ""),
      })),
      cpsChase: stripInternalCorpusIdentifiers(surfaces.composedProse.cpsChase ?? ""),
    },
    null,
    2,
  );

  const judicialText = JSON.stringify(
    {
      kind: "judicial_neutrality_surface",
      courtLine: stripInternalCorpusIdentifiers(surfaces.composedProse.courtLine ?? ""),
      limitations: (surfaces.requiredLimitations ?? []).map(stripInternalCorpusIdentifiers),
      doNotOverstate: (surfaces.truthMap.mustNotOverstate ?? []).map(stripInternalCorpusIdentifiers),
    },
    null,
    2,
  );

  const raw: Array<{
    audienceId: string;
    perspectiveId: string;
    text: string;
    producer: string;
    protectedPointer: string | null;
    machineMetadata?: ContainedSupervisorAudiencePayload | null;
  }> = [
    {
      audienceId: "court",
      perspectiveId: "court_precise",
      text: courtText,
      producer: "composeStructuredSolicitorOutput:court_line+exportPack.court_note",
      protectedPointer: null,
    },
    {
      audienceId: "cps",
      perspectiveId: "cps_specific",
      text: cpsText,
      producer: "composeStructuredSolicitorOutput:cps_chase+exportPack.cps_chase",
      protectedPointer: null,
    },
    {
      audienceId: "client",
      perspectiveId: "client_plain",
      text: clientText,
      producer: "buildClientSafeExplanation+clientDisclaimer+exportPack.client_summary",
      protectedPointer: null,
    },
    {
      audienceId: "supervisor",
      perspectiveId: "supervisor_risk",
      text: supervisorText,
      producer: "buildContainedSupervisorAudienceBundle:formatSupervisorProfessionalCopyText",
      protectedPointer: supervisorBundle.professionalPayload.protectedRawSourcePointer,
      machineMetadata: supervisorBundle.professionalPayload,
    },
    {
      audienceId: "defence",
      perspectiveId: "defence_solicitor",
      text: defenceText,
      producer: "buildFiveAnswersView+composedProse.limitations",
      protectedPointer: null,
    },
    {
      audienceId: "prosecution",
      perspectiveId: "prosecution_challenge",
      text: prosecutionText,
      producer: "buildDisclosureChaseBrief+composedProse.cpsChase",
      protectedPointer: null,
    },
    {
      audienceId: "judicial",
      perspectiveId: "judicial_neutrality",
      text: judicialText,
      producer: "composedProse.courtLine+requiredLimitations",
      protectedPointer: null,
    },
  ];

  const packs: AudiencePack[] = raw
    .map((r) => {
      const payloadText = (r.text || "").trim();
      const boundary = packBoundary({
        audienceId: r.audienceId,
        text: payloadText,
        protectedPointer: r.protectedPointer,
      });
      return {
        audienceId: r.audienceId,
        perspectiveId: r.perspectiveId,
        payloadText,
        payloadSha256: sha256(payloadText),
        ...boundary,
        machineMetadata: r.machineMetadata ?? null,
        producer: r.producer,
        comparable: true as const,
      };
    })
    .filter((p) => p.payloadText.length > 0);

  const distinct = new Set(packs.map((p) => p.payloadSha256));
  const independentAudiencePacksPresent = packs.length >= 2 && distinct.size >= 2;

  return {
    schemaVersion: "stage300-new150-audience-packs@2.0.0",
    caseId: args.caseId,
    independentAudiencePacksPresent,
    distinctPayloadCount: distinct.size,
    packs,
    protectedRawSourceExtracts,
    note: independentAudiencePacksPresent
      ? "Distinct audience/perspective payloads captured from genuine production builders; supervisor raw stored only in protectedRawSourceExtracts"
      : "Insufficient distinct audience payloads from production surfaces",
  };
}
