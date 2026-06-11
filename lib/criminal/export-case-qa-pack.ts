/**
 * Client-side CaseBrain QA pack — one Markdown download for solicitor review.
 * No server storage, no new API routes.
 */

import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import {
  buildDisclosureChaseBrief,
  type DisclosureChaseBrief,
} from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
  type HearingWarRoomBrief,
} from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import { buildCaseSnapshot, type CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
  type CaseHeaderMetadata,
} from "@/lib/criminal/resolve-case-header-metadata";
import { safeSolicitorCaseTitle } from "@/lib/criminal/dev-ref-scrub";
import {
  buildBundleTruthLedger,
  guardSolicitorLine,
  guardSolicitorLines,
  type TruthSurfaceGuardContext,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

const NOT_AVAILABLE = "Not available on this view";

export type CaseQaPackInput = {
  caseId: string;
  caseLabel: string;
  exportedAt: string;
  header: CaseHeaderMetadata;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  controlRoom: {
    bestRouteTitle: string | null;
    routeStatus: string | null;
    prosecutionWeakness: string[];
    defenceRisks: string[];
    immediateActions: string[];
    safeCourtLine: string | null;
    chaseItems: string[];
  };
  battleboard: BattleboardOutput | null;
  warRoom: HearingWarRoomBrief | null;
  disclosureChase: DisclosureChaseBrief | null;
  positionNotes: {
    savedPosition: string | null;
    clientInstructions: string | null;
  };
  documents: {
    count: number;
    combinedTextLength: number;
    rows: Array<{ name: string; type?: string | null }>;
  };
  /** Bundle scan text — used only for truth-surface guard at export (not written into markdown). */
  bundleText?: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength: number;
  documentRows?: DocumentRowMeta[];
  frontMatterScan?: string | null;
  header?: {
    shortTitle: string | null;
    stage: string | null;
    accused?: string | null;
  };
  caseMetadata?: ExtractedBundleCaseMetadata | null;
};

type MatterSummary = {
  clientInitials?: string | null;
  defendantName?: string | null;
  allegedOffence?: string | null;
  stageDetected?: string | null;
  bailOutcome?: string | null;
};

function deriveBundleHealth(
  snapshot: CaseSnapshot | null,
  bundleSource: BundleSourceSummary | null,
  battleboard: BattleboardOutput | null,
): string {
  return formatCaseBundleHealthLabel({
    documentCount: Math.max(
      snapshot?.analysis.docCount ?? 0,
      bundleSource?.documentCount ?? 0,
      snapshot?.evidence.documents?.length ?? 0,
    ),
    combinedTextLength: bundleSource?.combinedTextLength ?? 0,
    capabilityTier: snapshot?.analysis.capabilityTier,
    battleboard,
    documentRows: bundleSource?.documentRows,
  });
}

function slugifyFilename(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "case"
  );
}

export function buildCaseQaPackFilename(caseLabel: string, exportedAt: Date): string {
  const date = exportedAt.toISOString().slice(0, 10);
  return `casebrain-qa-pack-${slugifyFilename(caseLabel)}-${date}.md`;
}

function mdSection(title: string, body: string): string {
  return `## ${title}\n\n${body.trim() || NOT_AVAILABLE}\n`;
}

function bulletList(items: string[] | null | undefined, empty = NOT_AVAILABLE): string {
  if (!items?.length) return empty;
  return items.map((i) => `- ${i.replace(/\s+/g, " ").trim()}`).join("\n");
}

function qaGuardCtx(bundleText?: string | null): TruthSurfaceGuardContext {
  const text = bundleText?.trim() ?? "";
  return {
    ledger: text ? buildBundleTruthLedger({ bundleText: text }) : null,
    bundleText: text || null,
  };
}

function formatBattleboardSection(bb: BattleboardOutput | null, guard: TruthSurfaceGuardContext): string {
  if (!bb) return NOT_AVAILABLE;
  const lines: string[] = [];
  const summary = bb.solicitor_safe_summary?.trim()
    ? guardSolicitorLine(bb.solicitor_safe_summary, guard)
    : null;
  if (summary) {
    lines.push(`**Summary:** ${summary}`);
  }
  const primary = bb.primary_route;
  if (primary) {
    lines.push(`**Primary route:** ${primary.title} (${primary.status})`);
    if (primary.hearing_line?.trim()) lines.push(`**Hearing line:** ${primary.hearing_line.trim()}`);
    const collapseRisks = guardSolicitorLines(primary.collapse_risks ?? [], guard, 6);
    if (collapseRisks.length) {
      lines.push("**Collapse risks:**");
      lines.push(bulletList(collapseRisks));
    }
    const whyHelps = guardSolicitorLines(primary.why_it_helps ?? [], guard, 4);
    if (whyHelps.length) {
      lines.push("**Why it helps:**");
      lines.push(bulletList(whyHelps));
    }
  }
  const backups = bb.routes.filter((r) => r.id !== primary?.id);
  if (backups.length) {
    lines.push("**Backup routes:**");
    lines.push(
      bulletList(
        backups.slice(0, 6).map((r) => `${r.title} (${r.status})`),
      ),
    );
  }
  const globalRisks = guardSolicitorLines(bb.global_collapse_risks ?? [], guard, 6);
  if (globalRisks.length) {
    lines.push("**Global collapse risks:**");
    lines.push(bulletList(globalRisks));
  }
  return lines.join("\n\n") || NOT_AVAILABLE;
}

function formatWarRoomSection(brief: HearingWarRoomBrief | null): string {
  if (!brief) return NOT_AVAILABLE;
  return [
    `**Readiness:** ${brief.readiness}`,
    `**Safe position today:** ${brief.safePositionToday}`,
    "**Say this:**",
    bulletList(brief.sayThis),
    "**Do not overstate:**",
    bulletList(brief.doNotOverstate),
    "**Ask court to record:**",
    bulletList(brief.askCourtToRecord),
    "**Instructions needed:**",
    bulletList(brief.instructionsNeeded),
    "**Evidence anchors:**",
    bulletList(brief.evidenceAnchors),
  ].join("\n\n");
}

function formatDisclosureSection(brief: DisclosureChaseBrief | null): string {
  if (!brief) return NOT_AVAILABLE;
  const items = brief.primaryItems.length ? brief.primaryItems : brief.items;
  const itemLines =
    items.length > 0
      ? items
          .slice(0, 12)
          .map(
            (i) =>
              `- **${i.label}** (${i.baseStatus})${i.evidenceAnchor ? ` — ${i.evidenceAnchor}` : ""}`,
          )
          .join("\n")
      : NOT_AVAILABLE;
  return [
    `**Summary:** ${brief.disclosureSummary}`,
    `**Safe court line:** ${brief.safeCourtLine}`,
    "**Priority chase items:**",
    itemLines,
  ].join("\n\n");
}

function formatDocumentsSection(documents: CaseQaPackInput["documents"]): string {
  if (!documents.count && !documents.rows.length) return NOT_AVAILABLE;
  const lines = [
    `**Document count:** ${documents.count}`,
    `**Combined text length:** ${documents.combinedTextLength.toLocaleString()} characters`,
  ];
  if (documents.rows.length) {
    lines.push("**Files on file:**");
    lines.push(
      bulletList(
        documents.rows.slice(0, 20).map((r) => `${r.name}${r.type ? ` (${r.type})` : ""}`),
      ),
    );
  }
  return lines.join("\n\n");
}

export function buildCaseQaPackMarkdown(input: CaseQaPackInput): string {
  const guard = qaGuardCtx(input.bundleText);
  const control = input.controlRoom;
  const prosecutionWeakness = guardSolicitorLines(control.prosecutionWeakness, guard, 6);
  const defenceRisks = guardSolicitorLines(control.defenceRisks, guard, 6);
  const immediateActions = guardSolicitorLines(control.immediateActions, guard, 8);
  const chaseItems = guardSolicitorLines(control.chaseItems, guard, 8);
  const safeCourtLine = control.safeCourtLine
    ? guardSolicitorLine(control.safeCourtLine, guard)
    : null;
  const controlBody = [
    `**Case:** ${input.caseTitle}`,
    `**Client:** ${input.clientLabel}`,
    `**Offence:** ${input.allegation}`,
    `**Stage:** ${input.stage}`,
    `**Next hearing:** ${input.hearingStatus}`,
    `**Bundle health:** ${input.bundleHealth}`,
    `**Position:** ${input.positionStatus}`,
    control.bestRouteTitle
      ? `**Best route:** ${control.bestRouteTitle}${control.routeStatus ? ` (${control.routeStatus})` : ""}`
      : null,
    safeCourtLine ? `**Safe court line:** ${safeCourtLine}` : null,
    "**Prosecution weakness:**",
    bulletList(prosecutionWeakness),
    "**Defence risks:**",
    bulletList(defenceRisks),
    "**Immediate actions:**",
    bulletList(immediateActions),
    "**Chase items:**",
    bulletList(chaseItems),
  ]
    .filter(Boolean)
    .join("\n\n");

  const positionBody = [
    input.positionNotes.savedPosition
      ? `**Recorded position:** ${input.positionNotes.savedPosition}`
      : "**Recorded position:** Not recorded on file",
    input.positionNotes.clientInstructions
      ? `**Client instructions:** ${input.positionNotes.clientInstructions}`
      : "**Client instructions:** None recorded",
  ].join("\n\n");

  return [
    "# CaseBrain QA pack",
    "",
    `**Exported:** ${input.exportedAt}`,
    `**Case ID:** ${input.caseId}`,
    `**Case label:** ${input.caseLabel}`,
    "",
    "_Solicitor-facing workspace snapshot. Provisional where stated._",
    "",
    mdSection("1. Control Room", controlBody),
    mdSection("2. Battleboard", formatBattleboardSection(input.battleboard, guard)),
    mdSection("3. Hearing War Room", formatWarRoomSection(input.warRoom)),
    mdSection("4. Disclosure Chase", formatDisclosureSection(input.disclosureChase)),
    mdSection("5. Position / Notes", positionBody),
    mdSection("6. Documents summary/header", formatDocumentsSection(input.documents)),
  ].join("\n");
}

export function downloadCaseQaPackMarkdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function loadCaseQaPackInput(caseId: string): Promise<CaseQaPackInput> {
  const exportedAt = new Date().toISOString();

  const [snapshot, bundleRes, battleboardRes, matterRes, positionRes, instructionsRes] =
    await Promise.all([
      buildCaseSnapshot(caseId).catch(() => null),
      fetchJson<{ ok?: boolean; data?: BundleSourceSummary & { frontMatterScan?: string } }>(
        `/api/criminal/${caseId}/bundle-source`,
      ),
      fetchJson<{ ok?: boolean; data?: BattleboardOutput }>(
        `/api/criminal/${caseId}/strategy-battleboard`,
      ),
      fetchJson<MatterSummary & { clientInitials?: string; matterState?: string; stage?: string }>(
        `/api/criminal/${caseId}/matter`,
      ),
      fetchJson<{ ok?: boolean; data?: { position_text?: string }; position?: { position_text?: string } }>(
        `/api/criminal/${caseId}/position`,
      ),
      fetchJson<{ instructions?: string; text?: string; data?: { instructions?: string } }>(
        `/api/criminal/${caseId}/client-instructions`,
      ),
    ]);

  const bundleSource: BundleSourceSummary | null =
    bundleRes?.ok && bundleRes.data
      ? {
          documentCount: bundleRes.data.documentCount ?? 0,
          combinedTextLength: bundleRes.data.combinedTextLength ?? 0,
          documentRows: bundleRes.data.documentRows,
          frontMatterScan: bundleRes.data.frontMatterScan ?? null,
          header: bundleRes.data.header,
          caseMetadata: bundleRes.data.caseMetadata ?? null,
        }
      : null;

  const battleboard = battleboardRes?.ok && battleboardRes.data ? battleboardRes.data : null;

  const matter: MatterSummary | null = matterRes
    ? {
        clientInitials: matterRes.clientInitials ?? null,
        defendantName: matterRes.defendantName ?? null,
        allegedOffence: matterRes.allegedOffence ?? null,
        stageDetected: matterRes.matterState ?? matterRes.stage ?? null,
        bailOutcome: matterRes.bailOutcome ?? null,
      }
    : null;

  const headerMeta = resolveCaseHeaderMetadata({
    snapshot,
    matter,
    bundleMetadata: bundleSource?.caseMetadata,
    bundleHeader: bundleSource?.header ?? null,
    matterState: matter?.stageDetected ?? null,
    bundleText: bundleSource?.frontMatterScan ?? null,
  });

  const caseTitle = safeSolicitorCaseTitle(snapshot?.caseMeta?.title?.trim() || "Criminal case");
  const clientLabel = sanitizeHeaderClient(headerMeta.clientLabel);
  const allegation = sanitizeHeaderAllegation(headerMeta.allegation);
  const stage = headerMeta.stage;
  const hearingStatus = headerMeta.nextHearing;
  const bundleHealth = deriveBundleHealth(snapshot, bundleSource, battleboard);

  const savedPositionText =
    positionRes?.data?.position_text?.trim() ??
    positionRes?.position?.position_text?.trim() ??
    null;
  const hasSavedPosition = Boolean(savedPositionText);
  const positionStatus = hasSavedPosition
    ? savedPositionText!.split(/[.!?]/)[0]?.trim() + (savedPositionText!.includes(".") ? "." : "")
    : headerMeta.defencePosition?.trim() || "Position not safely recorded yet";

  const chaseItems = collectChaseItems({
    snapshotMissing: snapshot?.evidence.missingEvidence,
    battleboard,
    bundleText: bundleSource?.frontMatterScan ?? null,
  });

  const hearingDateIso =
    bundleSource?.caseMetadata?.nextHearingIso ?? snapshot?.caseMeta?.hearingNextAt ?? null;

  const disclosureChase = buildDisclosureChaseBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage,
    hearingStatus,
    hearingDateIso,
    bundleHealth,
    positionStatus,
    battleboard,
    snapshotMissing: snapshot?.evidence.missingEvidence,
    bundleText: bundleSource?.frontMatterScan ?? null,
  });

  const warRoom = buildHearingWarRoomBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage,
    hearingStatus,
    bundleHealth,
    positionStatus,
    readiness: disclosureChase.disclosureSummary,
    battleboard,
    hasSavedPosition,
    chaseItems: buildChaseItemsForHearing({
      snapshotMissing: snapshot?.evidence.missingEvidence,
      battleboard,
    }),
    bundleText: bundleSource?.frontMatterScan ?? null,
  });

  const bundleText = bundleSource?.frontMatterScan ?? null;
  const guard = qaGuardCtx(bundleText);
  const primary = battleboard?.primary_route;
  const prosecutionWeakness = guardSolicitorLines(primary?.why_it_helps ?? [], guard, 3);
  const defenceRisks = guardSolicitorLines(
    [...(primary?.collapse_risks ?? []), ...(battleboard?.global_collapse_risks ?? [])],
    guard,
    4,
  );
  const immediateActions = guardSolicitorLines(
    [...(battleboard?.urgent_next_moves ?? []), ...chaseItems.slice(0, 4)],
    guard,
    6,
  );

  const clientInstructions =
    instructionsRes?.instructions?.trim() ??
    instructionsRes?.text?.trim() ??
    instructionsRes?.data?.instructions?.trim() ??
    null;

  const docRows =
    bundleSource?.documentRows?.map((r) => ({
      name: r.name ?? r.id ?? "Document",
      type: null as string | null,
    })) ??
    snapshot?.evidence.documents?.map((d) => ({ name: d.name, type: d.type ?? null })) ??
    [];

  return {
    caseId,
    caseLabel: caseTitle,
    exportedAt,
    header: headerMeta,
    caseTitle,
    clientLabel,
    allegation,
    stage,
    hearingStatus,
    bundleHealth,
    positionStatus,
    controlRoom: {
      bestRouteTitle: primary?.title ?? null,
      routeStatus: primary?.status ?? null,
      prosecutionWeakness,
      defenceRisks,
      immediateActions,
      safeCourtLine: warRoom.safePositionToday,
      chaseItems,
    },
    battleboard,
    warRoom,
    disclosureChase,
    positionNotes: {
      savedPosition: savedPositionText,
      clientInstructions,
    },
    documents: {
      count: Math.max(bundleSource?.documentCount ?? 0, docRows.length),
      combinedTextLength: bundleSource?.combinedTextLength ?? 0,
      rows: docRows,
    },
    bundleText,
  };
}
