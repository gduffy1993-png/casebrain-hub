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

function stableId(prefix: string, parts: string[]): string {
  const raw = parts.map((p) => normalizeSolicitorLineKey(p)).filter(Boolean).join("|");
  const hash = sha256HexSlice(raw, 16);
  return `${prefix}_${hash}`;
}

function mapExistence(raw: string): CanonicalEvidenceExistence {
  switch (raw) {
    case "served":
      return "served";
    case "referred_only":
      return "referred_only";
    case "missing":
      return "missing";
    case "not_safely_confirmed":
      return "incomplete";
    case "unknown":
      return "not_safely_confirmed";
    default:
      return "not_safely_confirmed";
  }
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
  if (mg11.some((i) => i.existence === "incomplete" || i.existence === "not_safely_confirmed")) {
    return { status: "draft_or_unsigned", label: "MG11 draft / unsigned on papers" };
  }
  if (mg11.some((i) => i.existence === "missing")) return { status: "missing", label: "MG11 missing" };
  return { status: "draft_or_unsigned", label: "MG11 needs solicitor review" };
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
};

export function buildCanonicalMatterStateV1(input: BuildCanonicalMatterInput): CanonicalMatterStateV1 {
  const allegation = input.allegation?.trim() || null;
  const chargeWording = input.chargeWording?.trim() || null;
  const bundleHay = input.bundleHay?.trim() || null;

  const offence = resolveSolicitorOffenceFamily({ allegation, chargeWording, bundleHay });

  const deduped = dedupeEvidenceAliases(input.evidenceRows);
  const evidenceItems: CanonicalEvidenceItem[] = deduped.map((row) => {
    const existence = mapExistence(row.existence);
    const id = stableId("ev", [row.label, existence]);
    return {
      id,
      label: row.label,
      existence,
      note: row.note ?? null,
      sourceDocument: null,
      sourcePage: null,
    };
  });
  const evidenceCounts = countEvidence(evidenceItems);

  const chaseItems: CanonicalChaseItem[] = (input.chaseItems ?? []).map((item) => {
    const status = mapChaseStatus(item.baseStatus ?? item.status ?? "not_started");
    const id = item.id?.trim() || stableId("ch", [item.label, status]);
    return {
      id,
      label: item.label,
      status,
      whyItMatters: item.whyItMatters ?? null,
    };
  });
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
    fingerprint,
  };
}

/** Assert two surfaces consumed the same canonical state. */
export function assertSameCanonicalFingerprint(a: string, b: string): boolean {
  return Boolean(a && b && a === b);
}
