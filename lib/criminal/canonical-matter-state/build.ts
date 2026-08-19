/**
 * Build + fingerprint CanonicalMatterStateV1.
 */

import { sha256HexSlice } from "@/lib/shared/sha256-hex";
import {
  CANONICAL_MATTER_STATE_VERSION,
  type CanonicalAttributionState,
  type CanonicalChaseCounts,
  type CanonicalChaseItem,
  type CanonicalChaseStatus,
  type CanonicalEvidenceCounts,
  type CanonicalEvidenceExistence,
  type CanonicalEvidenceItem,
  type CanonicalHearingKind,
  type CanonicalMatterFingerprintParts,
  type CanonicalMatterStateV1,
  type CanonicalMg11Status,
} from "./schema";
import { normalizeSolicitorLineKey } from "@/lib/criminal/solicitor-display-dedupe";
import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { dedupeEvidenceAliases } from "@/lib/criminal/evidence-alias-dedupe";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  buildCanonicalPipelineFromDocumentUnits,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import { shouldChaseRequestAgainstServedAliases } from "@/lib/criminal/canonical-finding-model";
import type { SharedEvidenceState } from "@/lib/criminal/evidence-state-reconcile";

/**
 * EXISTENCE_MAPPING_POLICY (CanonicalMatterState schema 1.2.0) — intentional rule.
 *
 * Raw FiveAnswersEvidenceExistence → CanonicalEvidenceExistence:
 * - served / referred_only / missing / incomplete: identity
 * - not_safely_confirmed → not_safely_confirmed
 *   (preserved distinct from incomplete — CB-HIST-NSC-NOT-INCOMPLETE)
 * - unknown → not_safely_confirmed
 *   Intentional: unknown is not a canonical existence; solicitor strip uses
 *   "Not safely confirmed" for unresolved unknowns.
 * - default → not_safely_confirmed
 *
 * Migration from 1.1.0: removed not_safely_confirmed → incomplete collapse.
 * Do not redefine these mappings without migration evidence + fingerprint impact analysis.
 */
export const EXISTENCE_MAPPING_POLICY_ID = "canonical-existence-map@1.2.0" as const;

export function mapRawExistenceToCanonical(raw: string): CanonicalEvidenceExistence {
  switch (raw) {
    case "served":
      return "served";
    case "referred_only":
      return "referred_only";
    case "missing":
      return "missing";
    case "incomplete":
      return "incomplete";
    case "not_safely_confirmed":
      return "not_safely_confirmed";
    case "unknown":
      return "not_safely_confirmed";
    default:
      return "not_safely_confirmed";
  }
}

/** @deprecated Use mapRawExistenceToCanonical — kept as private alias name in older call sites. */
function mapExistence(raw: string): CanonicalEvidenceExistence {
  return mapRawExistenceToCanonical(raw);
}

function stableId(prefix: string, parts: string[]): string {
  const raw = parts.map((p) => normalizeSolicitorLineKey(p)).filter(Boolean).join("|");
  const hash = sha256HexSlice(raw, 16);
  return `${prefix}_${hash}`;
}

function countEvidence(items: CanonicalEvidenceItem[]): CanonicalEvidenceCounts {
  const counts: CanonicalEvidenceCounts = {
    served: 0,
    referred: 0,
    missing: 0,
    incomplete: 0,
    notSafelyConfirmed: 0,
  };
  for (const item of items) {
    switch (item.existence) {
      case "served":
        counts.served += 1;
        break;
      case "referred_only":
        counts.referred += 1;
        break;
      case "missing":
        counts.missing += 1;
        break;
      case "incomplete":
        counts.incomplete += 1;
        break;
      case "not_safely_confirmed":
        counts.notSafelyConfirmed += 1;
        break;
    }
  }
  return counts;
}

function mapChaseStatus(raw: string): CanonicalChaseStatus {
  const t = raw.toLowerCase().replace(/\s+/g, "_");
  if (t === "received") return "received";
  if (t === "chased") return "chased";
  if (t === "overdue") return "overdue";
  if (t === "due_soon" || t === "due-soon" || t === "due soon") return "due_soon";
  return "not_started";
}

function countChase(items: CanonicalChaseItem[]): CanonicalChaseCounts {
  const counts: CanonicalChaseCounts = {
    total: items.length,
    overdue: 0,
    dueSoon: 0,
    chased: 0,
    received: 0,
    notStarted: 0,
  };
  for (const item of items) {
    switch (item.status) {
      case "overdue":
        counts.overdue += 1;
        break;
      case "due_soon":
        counts.dueSoon += 1;
        break;
      case "chased":
        counts.chased += 1;
        break;
      case "received":
        counts.received += 1;
        break;
      default:
        counts.notStarted += 1;
    }
  }
  return counts;
}

function resolveMg11(items: CanonicalEvidenceItem[]): { status: CanonicalMg11Status; label: string } {
  const mg11 = items.filter((i) => /\bmg11\b|witness statement|complainant statement/i.test(i.label));
  if (!mg11.length) return { status: "not_on_file", label: "MG11 not on file" };
  if (mg11.some((i) => i.existence === "served")) return { status: "served", label: "MG11 served" };
  if (mg11.some((i) => i.existence === "referred_only")) return { status: "referred", label: "MG11 referred only" };
  // Incomplete = we have material but know it is partial — distinct from NSC.
  if (mg11.some((i) => i.existence === "incomplete")) {
    return { status: "draft_or_unsigned", label: "MG11 draft / unsigned on papers" };
  }
  if (mg11.some((i) => i.existence === "not_safely_confirmed")) {
    return { status: "not_safely_confirmed", label: "MG11 not safely confirmed on papers" };
  }
  if (mg11.some((i) => i.existence === "missing")) return { status: "missing", label: "MG11 missing" };
  return { status: "not_safely_confirmed", label: "MG11 needs solicitor review" };
}

function resolveAttribution(
  items: CanonicalEvidenceItem[],
  allegation: string | null,
  bundleHay: string | null,
): { state: CanonicalAttributionState; label: string } {
  const hay = `${allegation ?? ""} ${bundleHay ?? ""} ${items.map((i) => i.label).join(" ")}`.toLowerCase();
  if (!/attribution|subscriber|handset|who sent|sender/i.test(hay)) {
    return { state: "not_applicable", label: "Attribution not in issue on papers" };
  }
  const attr = items.filter((i) => /attribution|subscriber|handset/i.test(i.label));
  if (attr.some((i) => i.existence === "served")) {
    return { state: "source_linked", label: "Attribution material served" };
  }
  if (attr.some((i) => i.existence === "referred_only" || i.existence === "incomplete")) {
    return { state: "provisional", label: "Attribution provisional / incomplete" };
  }
  return { state: "unresolved", label: "Attribution unresolved" };
}

export function fingerprintCanonicalMatter(parts: CanonicalMatterFingerprintParts): string {
  const payload = JSON.stringify(parts);
  return `v${parts.schemaVersion}:${sha256HexSlice(payload, 24)}`;
}

export type BuildCanonicalMatterInput = {
  caseId?: string | null;
  allegation?: string | null;
  chargeWording?: string | null;
  bundleHay?: string | null;
  provisional?: boolean;
  evidenceRows: FiveAnswersEvidenceRow[];
  chaseItems: Array<{
    id?: string;
    label: string;
    baseStatus?: string;
    status?: string;
    whyItMatters?: string | null;
  }>;
  hearing?: {
    bundleNextHearingIso?: string | null;
    snapshotHearingNextAt?: string | null;
    nextHearingRaw?: string | null;
    treatAsSnapshot?: boolean;
    asOf?: Date;
  };
  /**
   * Uploaded document/page units — when provided, documentRelationships + findings
   * are built from the live pipeline and chase items are alias-suppressed.
   */
  documents?: UploadedDocumentUnit[] | null;
};

export function buildCanonicalMatterStateV1(input: BuildCanonicalMatterInput): CanonicalMatterStateV1 {
  const allegation = input.allegation?.trim() || null;
  const chargeWording = input.chargeWording?.trim() || null;
  let bundleHay = input.bundleHay?.trim() || null;

  const pipeline =
    input.documents && input.documents.length > 0
      ? buildCanonicalPipelineFromDocumentUnits(input.documents)
      : null;
  if (pipeline) {
    bundleHay = bundleHay ? `${bundleHay}\n${pipeline.bundleText}` : pipeline.bundleText;
  }

  const offence = resolveSolicitorOffenceFamily({ allegation, chargeWording, bundleHay });

  const mergedEvidenceRows: FiveAnswersEvidenceRow[] = [
    ...input.evidenceRows,
    ...(pipeline?.evidenceRows ?? []).map((r) => {
      const row: FiveAnswersEvidenceRow = {
        label: r.label,
        existence: r.existence as FiveAnswersEvidenceRow["existence"],
        reliability: "needs_review",
      };
      if (r.note) row.note = r.note;
      return row;
    }),
  ];

  const deduped = dedupeEvidenceAliases(mergedEvidenceRows);
  const evidenceItems: CanonicalEvidenceItem[] = deduped.map((row) => {
    const existence = mapExistence(row.existence);
    const id = stableId("ev", [row.label, existence]);
    const fromDerived = pipeline?.evidenceRows.find(
      (r) => r.label.toLowerCase() === row.label.toLowerCase() && r.existence === row.existence,
    );
    const fromPipeline = pipeline?.graph.nodes.find((n) =>
      n.title && row.label.toLowerCase().includes(n.title.toLowerCase().slice(0, 12)),
    );
    return {
      id,
      label: row.label,
      existence,
      note: row.note ?? fromDerived?.note ?? null,
      sourceDocument: fromDerived?.sourceDocumentTitle ?? fromPipeline?.title ?? null,
      sourcePage: fromDerived?.sourcePage ?? fromPipeline?.sourcePage ?? null,
    };
  });
  const evidenceCounts = countEvidence(evidenceItems);

  // Alias-suppress chase when pipeline knows served aliases.
  const servedForAlias: Array<{ label: string; state: SharedEvidenceState }> = evidenceItems
    .filter((i) => i.existence === "served")
    .map((i) => ({ label: i.label, state: "served" as const }));

  const rawChase = input.chaseItems ?? [];
  const chaseAfterAlias = rawChase.filter((item) => {
    if (!pipeline) return true;
    const verdict = shouldChaseRequestAgainstServedAliases(item.label, servedForAlias);
    return verdict.chase;
  });
  // Also drop labels the pipeline already marked suppressed.
  const suppressed = new Set(pipeline?.suppressedChaseLabels ?? []);
  const chaseItems: CanonicalChaseItem[] = chaseAfterAlias
    .filter((item) => !suppressed.has(item.label))
    .map((item) => {
      const status = mapChaseStatus(item.baseStatus ?? item.status ?? "not_started");
      const id = item.id?.trim() || stableId("ch", [item.label, status]);
      return {
        id,
        label: item.label,
        status,
        whyItMatters: item.whyItMatters ?? null,
      };
    });
  // Add remaining live chase labels from pipeline (missing master etc.)
  for (const label of pipeline?.chaseLabels ?? []) {
    if (chaseItems.some((c) => c.label === label)) continue;
    chaseItems.push({
      id: stableId("ch", [label, "not_started"]),
      label,
      status: "not_started",
      whyItMatters: "Outstanding on papers — chase required",
    });
  }
  const chaseCounts = countChase(chaseItems);

  const mg11 = resolveMg11(evidenceItems);
  const attribution = resolveAttribution(evidenceItems, allegation, bundleHay);
  const hearingResolved = resolveSolicitorHearingStatus({
    bundleNextHearingIso: input.hearing?.bundleNextHearingIso,
    snapshotHearingNextAt: input.hearing?.snapshotHearingNextAt,
    nextHearingRaw: input.hearing?.nextHearingRaw,
    bundleHay,
    treatAsSnapshot: input.hearing?.treatAsSnapshot,
    asOf: input.hearing?.asOf,
  });

  const provisional = Boolean(input.provisional ?? offence.failClosed);

  const documentRelationships = {
    nodes: (pipeline?.graph.nodes ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      role: n.role,
      replacesDocumentId: n.replacesDocumentId,
      documentDate: n.documentDate,
      versionNumber: n.versionNumber,
      uploadOrder: n.uploadOrder,
    })),
    operativeDocumentId: pipeline?.graph.nodes.find((n) => n.role === "operative" || n.role === "amended")?.id ?? null,
    supersededDocumentIds: (pipeline?.graph.nodes ?? [])
      .filter((n) => n.role === "superseded")
      .map((n) => n.id),
  };

  const findings = (pipeline?.findings ?? []).map((f) => ({
    kind: f.kind,
    title: f.title,
    summary: f.summary,
    unresolved: f.unresolved,
    provenanceLine: f.provenanceLine,
  }));

  const fingerprint = fingerprintCanonicalMatter({
    schemaVersion: CANONICAL_MATTER_STATE_VERSION,
    evidenceCounts,
    chaseCounts,
    mg11: mg11.status,
    attribution: attribution.state,
    hearingKind: hearingResolved.kind as CanonicalHearingKind,
    hearingDateIso: hearingResolved.dateIso,
    offenceFamily: offence.family,
    provisional,
    evidenceIds: evidenceItems.map((i) => i.id).sort(),
    chaseIds: chaseItems.map((i) => i.id).sort(),
  });

  return {
    schemaVersion: CANONICAL_MATTER_STATE_VERSION,
    matter: {
      caseId: input.caseId ?? null,
      allegation,
      chargeWording,
      provisional,
    },
    offenceFamily: {
      family: offence.family,
      confidence: offence.confidence,
      failClosed: offence.failClosed,
      reason: offence.reason,
    },
    evidence: { items: evidenceItems, counts: evidenceCounts },
    chase: { items: chaseItems, counts: chaseCounts },
    mg11,
    attribution,
    hearing: {
      kind: hearingResolved.kind as CanonicalHearingKind,
      dateIso: hearingResolved.dateIso,
      statusLabel: hearingResolved.statusLabel,
      isSnapshot: hearingResolved.isSnapshot,
    },
    documentRelationships,
    findings,
    fingerprint,
  };
}

/** Assert two surfaces consumed the same canonical state. */
export function assertSameCanonicalFingerprint(a: string, b: string): boolean {
  return Boolean(a && b && a === b);
}
