/**
 * Shared case header hydration for Control Room, Hearing War Room, Disclosure Chase, Court Today.
 * Prefers exact bundle wording over generic offence classifier labels when safely extracted.
 */

import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { sanitizePublicDisplayLine } from "@/lib/criminal/dev-ref-scrub";
import type { ExtractedBundleCaseMetadata, MetadataFieldSource } from "@/lib/criminal/extract-bundle-case-metadata";
import {
  isGluedHearingCourtOffenceLabel,
  parseUkHearingDateTime,
  repairGluedOffenceLabel,
  sanitizeComplainantName,
} from "@/lib/criminal/extract-bundle-case-metadata";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  ledgerChargeDisplay,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

export type BundleSourceHeaderInput = {
  shortTitle?: string | null;
  stage?: string | null;
  accused?: string | null;
};

export type BundleCaseMetadataInput = ExtractedBundleCaseMetadata | null | undefined;

export type MatterHeaderInput = {
  clientInitials?: string | null;
  defendantName?: string | null;
  allegedOffence?: string | null;
  stageDetected?: string | null;
  bailStatus?: string | null;
  bailOutcome?: string | null;
} | null;

export type CaseHeaderMetadata = {
  clientLabel: string;
  clientSource: MetadataFieldSource;
  allegation: string;
  allegationSource: MetadataFieldSource;
  stage: string;
  stageSource: MetadataFieldSource;
  nextHearing: string;
  nextHearingSource: MetadataFieldSource;
  court: string | null;
  courtSource: MetadataFieldSource;
  complainant: string | null;
  bailStatus: string | null;
  defencePosition: string | null;
  defencePositionSource: MetadataFieldSource;
  /** Compact debug line for optional UI footnote */
  metadataNote: string;
};

const NOT_EXTRACTED_CLIENT = "Client name not safely extracted";
const NOT_EXTRACTED_OFFENCE = "Offence wording not safely extracted";
const NOT_EXTRACTED_HEARING = "No hearing date safely extracted";

function formatGbDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function isUnknownOffenceLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return true;
  const l = label.trim().toLowerCase();
  return (
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l.includes("offence-specific strategy") ||
    l.includes("generic – add charge sheet") ||
    l.startsWith("offence wording not safely extracted") ||
    l === "allegation not recorded"
  );
}

/** Generic taxonomy / mis-ranked charge labels — prefer bundle extract over these for display. */
function isGenericClassifierOffenceLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return true;
  const l = label.trim().toLowerCase();
  if (isUnknownOffenceLabel(label)) return true;
  if (l === "assault / oapa (s.18, s.20, gbh, abh)") return true;
  if (/^unlawful wounding\b/.test(l) && !/\bs\.?\s*47\b|\bactual bodily harm\b|\babh\b/i.test(l)) {
    return true;
  }
  return false;
}

function looksLikePersonName(value: string): boolean {
  const t = value.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/^client\b/i.test(t)) return false;
  if (/not safely extracted/i.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (/^[A-Z]{2,4}$/.test(t) && !/\s/.test(t)) return false;
  return /[A-Za-z]{2,}/.test(t);
}

function resolveClientLabel(
  matter: MatterHeaderInput,
  bundle: BundleCaseMetadataInput,
  header: BundleSourceHeaderInput | null | undefined,
): { label: string; source: MetadataFieldSource } {
  if (bundle?.defendantName && looksLikePersonName(bundle.defendantName)) {
    return { label: bundle.defendantName.trim(), source: bundle.defendantSource };
  }
  if (matter?.defendantName && looksLikePersonName(matter.defendantName)) {
    return { label: matter.defendantName.trim(), source: "structured_field" };
  }
  const initials = matter?.clientInitials?.trim();
  if (initials && initials.length >= 2 && !/^client\b/i.test(initials)) {
    if (/\s/.test(initials) && looksLikePersonName(initials)) {
      return { label: initials, source: "structured_field" };
    }
    if (initials.length >= 3 && /[A-Za-z]/.test(initials)) {
      return { label: initials, source: "structured_field" };
    }
  }
  if (header?.accused?.trim() && looksLikePersonName(header.accused)) {
    return { label: header.accused.trim(), source: "extracted_cover_fallback" };
  }
  return { label: NOT_EXTRACTED_CLIENT, source: "unavailable" };
}

function resolveAllegation(
  snapshot: CaseSnapshot | null,
  matter: MatterHeaderInput,
  bundle: BundleCaseMetadataInput,
  header: BundleSourceHeaderInput | null | undefined,
  truthLedger?: BundleTruthLedger | null,
): { label: string; source: MetadataFieldSource } {
  const ledgerCharge = truthLedger ? ledgerChargeDisplay(truthLedger) : null;
  if (ledgerCharge?.trim()) {
    return { label: ledgerCharge.trim(), source: truthLedger?.charge.sourceAnchor ? "extracted_charge_fallback" : bundle?.offenceSource ?? "extracted_charge_fallback" };
  }

  if (bundle?.offenceDisplay?.trim()) {
    return { label: bundle.offenceDisplay.trim(), source: bundle.offenceSource };
  }
  if (bundle?.offenceWording?.trim()) {
    return { label: bundle.offenceWording.trim(), source: bundle.offenceSource };
  }

  const chargeOffence = snapshot?.charges?.[0]?.offence?.trim();
  const chargeSection = snapshot?.charges?.[0]?.section?.trim();
  const chargeCombined =
    chargeOffence && chargeSection
      ? `${chargeOffence} (${chargeSection})`
      : chargeOffence ?? chargeSection ?? null;
  if (chargeCombined && !isGenericClassifierOffenceLabel(chargeCombined)) {
    if (!/^unlawful wounding\b/i.test(chargeCombined) || /\bs\.?\s*47\b|\babh\b/i.test(chargeCombined)) {
      return { label: chargeCombined, source: "structured_field" };
    }
  }

  const matterOffence = matter?.allegedOffence?.trim();
  if (matterOffence && !isUnknownOffenceLabel(matterOffence)) {
    return { label: matterOffence, source: "structured_field" };
  }

  const resolved = snapshot?.resolvedOffence?.label?.trim();
  if (resolved && !isGenericClassifierOffenceLabel(resolved)) {
    return { label: resolved, source: "structured_field" };
  }

  const shortTitle = header?.shortTitle?.trim();
  if (shortTitle && /contrary to section|oapa|abh|assault occasioning/i.test(shortTitle)) {
    return { label: shortTitle, source: "extracted_cover_fallback" };
  }

  if ((bundle?.offenceWording || bundle?.offenceDisplay) && (snapshot?.evidence.documents?.length ?? 0) > 0) {
    return {
      label: "Offence wording not safely extracted yet — check charge sheet / MG5 header on file.",
      source: "unavailable",
    };
  }

  return { label: NOT_EXTRACTED_OFFENCE, source: "unavailable" };
}

function resolveStage(
  snapshot: CaseSnapshot | null,
  matter: MatterHeaderInput,
  bundle: BundleCaseMetadataInput,
  header: BundleSourceHeaderInput | null | undefined,
  matterState?: string | null,
): { label: string; source: MetadataFieldSource } {
  if (bundle?.stage?.trim() && !/^unknown|not recorded|—$/i.test(bundle.stage)) {
    return { label: bundle.stage.trim(), source: bundle.stageSource };
  }
  if (header?.stage?.trim() && !/^unknown|not recorded|—$/i.test(header.stage)) {
    return { label: header.stage.trim(), source: "extracted_cover_fallback" };
  }
  const fromMatter =
    matter?.stageDetected?.replace(/_/g, " ") ??
    snapshot?.caseMeta?.caseStage?.replace(/_/g, " ") ??
    matterState?.replace(/_/g, " ") ??
    null;
  if (fromMatter && !/^unknown|stage not recorded|—$/i.test(fromMatter)) {
    return { label: fromMatter, source: "structured_field" };
  }
  return { label: "Stage not recorded", source: "unavailable" };
}

function formatHearingFromIso(iso: string, hearingType: string | null | undefined): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
    const timePart = hasTime
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
      : null;
    const display = timePart ? `${datePart} at ${timePart}` : datePart;
    const type = hearingType?.trim();
    return type ? `${type} · ${display}` : display;
  } catch {
    return null;
  }
}

function resolveNextHearing(
  snapshot: CaseSnapshot | null,
  bundle: BundleCaseMetadataInput,
  truthLedger?: BundleTruthLedger | null,
): { label: string; source: MetadataFieldSource } {
  if (truthLedger) {
    const fromLedger = formatHearingDisplayFromLedger(
      truthLedger,
      snapshot?.caseMeta?.hearingNextType,
    );
    if (fromLedger) {
      return { label: fromLedger, source: truthLedger.hearing.sourceAnchor ? "extracted_procedural_fallback" : bundle?.nextHearingSource ?? "extracted_procedural_fallback" };
    }
  }

  if (bundle?.nextHearingRaw?.trim()) {
    const parsed = parseUkHearingDateTime(bundle.nextHearingRaw);
    const type = snapshot?.caseMeta?.hearingNextType?.trim();
    const display = parsed?.display ?? bundle.nextHearingRaw.trim();
    const label = type ? `${type} · ${display}` : display;
    return { label, source: bundle.nextHearingSource };
  }

  if (bundle?.nextHearingIso) {
    const fromIso = formatHearingFromIso(
      bundle.nextHearingIso,
      snapshot?.caseMeta?.hearingNextType,
    );
    if (fromIso) {
      return { label: fromIso, source: bundle.nextHearingSource };
    }
  }

  const at = snapshot?.caseMeta?.hearingNextAt;
  if (at) {
    const datePart = formatGbDate(at);
    if (datePart) {
      const type = snapshot?.caseMeta?.hearingNextType?.trim();
      return {
        label: type ? `${type} · ${datePart}` : datePart,
        source: "structured_field",
      };
    }
  }

  return { label: NOT_EXTRACTED_HEARING, source: "unavailable" };
}

function buildMetadataNote(parts: Array<{ field: string; source: MetadataFieldSource }>): string {
  const labels = parts
    .filter((p) => p.source !== "unavailable")
    .map((p) => `${p.field}: ${p.source.replace(/_/g, " ")}`);
  if (labels.length === 0) return "Metadata source: mostly unavailable — upload bundle text";
  return `Metadata source: ${labels.join("; ")}`;
}

export function resolveCaseHeaderMetadata(input: {
  snapshot: CaseSnapshot | null;
  matter?: MatterHeaderInput;
  bundleMetadata?: BundleCaseMetadataInput;
  bundleHeader?: BundleSourceHeaderInput | null;
  matterState?: string | null;
  bundleText?: string | null;
  truthLedger?: BundleTruthLedger | null;
}): CaseHeaderMetadata {
  const { snapshot, matter, bundleMetadata, bundleHeader, matterState, bundleText, truthLedger: ledgerInput } = input;

  const truthLedger =
    ledgerInput ??
    (bundleText?.trim() ? buildBundleTruthLedger({ bundleText, parsedHeader: bundleHeader ?? undefined }) : null);

  const client =
    truthLedger?.defendant.defendant && looksLikePersonName(truthLedger.defendant.defendant)
      ? { label: truthLedger.defendant.defendant, source: "extracted_cover_fallback" as MetadataFieldSource }
      : resolveClientLabel(matter ?? null, bundleMetadata, bundleHeader);
  const allegation = resolveAllegation(snapshot, matter ?? null, bundleMetadata, bundleHeader, truthLedger);
  const stage = resolveStage(snapshot, matter ?? null, bundleMetadata, bundleHeader, matterState);
  const nextHearing = resolveNextHearing(snapshot, bundleMetadata, truthLedger);

  const court =
    truthLedger?.court?.trim() ??
    bundleMetadata?.court?.trim() ??
    null;
  const courtSource = bundleMetadata?.courtSource ?? "unavailable";

  const complainant = sanitizeComplainantName(bundleMetadata?.complainant);

  const bailStatus =
    bundleMetadata?.bailStatus?.trim() ??
    matter?.bailStatus?.trim() ??
    matter?.bailOutcome?.trim() ??
    null;

  const defencePosition = bundleMetadata?.defencePosition?.trim() ?? null;
  const defencePositionSource = bundleMetadata?.defencePositionSource ?? "unavailable";

  const metadataNote = buildMetadataNote([
    { field: "client", source: client.source },
    { field: "offence", source: allegation.source },
    { field: "stage", source: stage.source },
    { field: "hearing", source: nextHearing.source },
  ]);

  return {
    clientLabel: client.label,
    clientSource: client.source,
    allegation: allegation.label,
    allegationSource: allegation.source,
    stage: stage.label,
    stageSource: stage.source,
    nextHearing: nextHearing.label,
    nextHearingSource: nextHearing.source,
    court,
    courtSource,
    complainant,
    bailStatus: bailStatus || null,
    defencePosition,
    defencePositionSource,
    metadataNote,
  };
}

export function sanitizeHeaderClient(label: string): string {
  const t = label
    .trim()
    .replace(/\.$/, "")
    .replace(/\bPrimary allegation\b.*$/i, "")
    .replace(/\bPrimary\b.*$/i, "")
    .replace(/\b(sheet\s*\/\s*indictment|indictment|extract)\b.*$/i, "")
    .trim();
  if (!t || /^client\b/i.test(t) || /not safely extracted/i.test(t)) {
    return NOT_EXTRACTED_CLIENT;
  }
  return t;
}

export function sanitizeHeaderAllegation(raw: string): string {
  let t = raw
    .trim()
    .replace(/^(?:primary allegation)\s*/i, "")
    .replace(/\b(sheet\s*\/\s*indictment|indictment|extract)\b.*$/i, "")
    .trim();
  if (isGluedHearingCourtOffenceLabel(t)) {
    const repaired = repairGluedOffenceLabel(t);
    if (repaired) t = repaired;
    else return NOT_EXTRACTED_OFFENCE;
  }
  if (!t) return NOT_EXTRACTED_OFFENCE;
  const l = t.toLowerCase();
  if (
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l.includes("offence-specific strategy") ||
    l.includes("check charge sheet") ||
    l.includes("not safely extracted")
  ) {
    return NOT_EXTRACTED_OFFENCE;
  }
  if (isCriminalPilotMode()) {
    const scrubbed = sanitizePublicDisplayLine(t);
    if (scrubbed) return scrubbed;
  }
  return t;
}
