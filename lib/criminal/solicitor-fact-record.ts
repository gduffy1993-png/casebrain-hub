/**
 * One locked fact record for solicitor mouths.
 * A field is either confirmed (value + source) or unknown. Unknown is a valid answer.
 * Surfaces must not invent a charge, family, count, hearing, or MG11 status.
 */

import { resolveSolicitorOffenceFamily, type OffenceFamilyResolution } from "@/lib/criminal/solicitor-offence-family";
import { isPoisonedHearingIso } from "@/lib/criminal/solicitor-hearing-display";
import type { SolicitorMatterStateVm } from "@/lib/criminal/solicitor-matter-state";
import type { SolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";

export const SOLICITOR_FACT_RECORD_VERSION = "1.0.0" as const;

export type FactSlotStatus = "confirmed" | "unknown";

export type SolicitorFactSlot = {
  key: string;
  status: FactSlotStatus;
  value: string | null;
  source: string;
};

export type SolicitorFactRecord = {
  version: typeof SOLICITOR_FACT_RECORD_VERSION;
  fingerprint: string | null;
  slots: {
    charge: SolicitorFactSlot;
    family: SolicitorFactSlot;
    hearing: SolicitorFactSlot;
    evidenceServed: SolicitorFactSlot;
    evidenceReferred: SolicitorFactSlot;
    evidenceMissing: SolicitorFactSlot;
    evidenceIncomplete: SolicitorFactSlot;
    evidenceNotSafelyConfirmed: SolicitorFactSlot;
    chaseTotal: SolicitorFactSlot;
    chaseOverdue: SolicitorFactSlot;
    mg11: SolicitorFactSlot;
  };
};

const FAMILY_LABEL: Record<string, string> = {
  harassment_digital: "Harassment (digital / phone)",
  harassment_other: "Harassment",
  violence: "Violence",
  drugs_possession: "Drug possession",
  drugs_supply: "Drug supply / PWITS",
  theft: "Theft",
  motoring: "Motoring",
};

function confirmed(key: string, value: string, source: string): SolicitorFactSlot {
  const trimmed = value.trim();
  if (!trimmed) {
    return { key, status: "unknown", value: null, source };
  }
  return { key, status: "confirmed", value: trimmed, source };
}

function unknown(key: string, source: string): SolicitorFactSlot {
  return { key, status: "unknown", value: null, source };
}

function countSlot(
  key: string,
  n: number | null | undefined,
  source: string,
  haveState: boolean,
): SolicitorFactSlot {
  if (!haveState || n == null || !Number.isFinite(n)) {
    return unknown(key, source);
  }
  return confirmed(key, String(n), source);
}

/**
 * Sexual-only hay must not become a confirmed "violence" fact.
 * The legacy resolver still maps those cases for older gates; this record does not.
 */
function familyLooksSexualMappedToViolence(hay: string, family: string): boolean {
  if (family !== "violence") return false;
  const h = hay.toLowerCase().replace(/\bno\s+(?:gbh|abh)\b/g, "");
  const sexual = /sexual (?:assault|offence)|sexual offences act|\babe\b|indecent assault/.test(h);
  const violenceCore = /\bgbh\b|\babh\b|s\.?\s*18|s\.?\s*20|assault occasioning|wounding/.test(h);
  return sexual && !violenceCore;
}

export function resolveFamilyFactSlot(input: {
  allegation?: string | null;
  chargeWording?: string | null;
  bundleHay?: string | null;
  offenceFamily?: OffenceFamilyResolution | null;
}): SolicitorFactSlot {
  const hay = `${input.allegation ?? ""} ${input.chargeWording ?? ""} ${input.bundleHay ?? ""}`;
  const resolution =
    input.offenceFamily ??
    resolveSolicitorOffenceFamily({
      allegation: input.allegation,
      chargeWording: input.chargeWording,
      bundleHay: input.bundleHay,
    });

  if (
    resolution.failClosed ||
    resolution.family === "unknown" ||
    resolution.confidence === "uncertain"
  ) {
    // Charge-sheet assaults the legacy resolver does not name (AEW / s.39).
    if (
      /assaults? on emergency workers|assault an emergency worker|common assault.*criminal justice act/i.test(
        hay,
      )
    ) {
      return confirmed("family", FAMILY_LABEL.violence, "charge_sheet_assault");
    }
    return unknown("family", resolution.reason || "offence_family_uncertain");
  }

  if (familyLooksSexualMappedToViolence(hay, resolution.family)) {
    return unknown("family", "sexual_offence_not_confirmed_as_violence");
  }

  const label = FAMILY_LABEL[resolution.family];
  if (!label) return unknown("family", "offence_family_unlabelled");
  return confirmed("family", label, `solicitor_offence_family:${resolution.family}`);
}

export function buildSolicitorFactRecord(input: {
  allegation?: string | null;
  chargeWording?: string | null;
  bundleHay?: string | null;
  matterState?: SolicitorMatterStateVm | null;
  hearing?: SolicitorHearingStatus | null;
  offenceFamily?: OffenceFamilyResolution | null;
}): SolicitorFactRecord {
  const chargeRaw = (input.chargeWording ?? input.allegation ?? "").trim();
  const charge = chargeRaw
    ? confirmed("charge", chargeRaw.slice(0, 240), input.chargeWording ? "charge_wording" : "allegation")
    : unknown("charge", "no_charge_or_allegation");

  const family = resolveFamilyFactSlot(input);

  const hearingPoisoned = Boolean(
    input.hearing?.dateIso &&
      input.bundleHay &&
      isPoisonedHearingIso(input.hearing.dateIso, input.bundleHay),
  );
  const hearing =
    input.hearing &&
    input.hearing.kind !== "unknown" &&
    input.hearing.statusLabel.trim() &&
    !hearingPoisoned
      ? confirmed("hearing", input.hearing.statusLabel.trim(), `hearing:${input.hearing.kind}`)
      : unknown(
          "hearing",
          hearingPoisoned ? "date_is_dob_or_offence_not_listing" : input.hearing?.statusLabel || "hearing_unknown",
        );

  const haveState = Boolean(input.matterState);
  const ev = input.matterState?.evidence.counts;
  const ch = input.matterState?.chase.counts;

  return {
    version: SOLICITOR_FACT_RECORD_VERSION,
    fingerprint: input.matterState?.fingerprint ?? null,
    slots: {
      charge,
      family,
      hearing,
      evidenceServed: countSlot("evidenceServed", ev?.served, "canonical.evidence.counts", haveState),
      evidenceReferred: countSlot("evidenceReferred", ev?.referred, "canonical.evidence.counts", haveState),
      evidenceMissing: countSlot("evidenceMissing", ev?.missing, "canonical.evidence.counts", haveState),
      evidenceIncomplete: countSlot("evidenceIncomplete", ev?.incomplete, "canonical.evidence.counts", haveState),
      evidenceNotSafelyConfirmed: countSlot(
        "evidenceNotSafelyConfirmed",
        ev?.notSafelyConfirmed,
        "canonical.evidence.counts",
        haveState,
      ),
      chaseTotal: countSlot("chaseTotal", ch?.total, "canonical.chase.counts", haveState),
      chaseOverdue: countSlot("chaseOverdue", ch?.overdue, "canonical.chase.counts", haveState),
      mg11: input.matterState?.mg11.label
        ? confirmed("mg11", input.matterState.mg11.label, `canonical.mg11:${input.matterState.mg11.status}`)
        : unknown("mg11", "mg11_not_on_state"),
    },
  };
}

export function confirmedSlotValues(record: SolicitorFactRecord): string[] {
  return Object.values(record.slots)
    .filter((s) => s.status === "confirmed" && s.value)
    .map((s) => s.value as string);
}

const FACT_SLOT_KEYS: Array<keyof SolicitorFactRecord["slots"]> = [
  "charge",
  "family",
  "hearing",
  "evidenceServed",
  "evidenceReferred",
  "evidenceMissing",
  "evidenceIncomplete",
  "evidenceNotSafelyConfirmed",
  "chaseTotal",
  "chaseOverdue",
  "mg11",
];

function isFactSlot(value: unknown): value is SolicitorFactSlot {
  if (!value || typeof value !== "object") return false;
  const slot = value as SolicitorFactSlot;
  return (
    (slot.status === "confirmed" || slot.status === "unknown") &&
    typeof slot.key === "string" &&
    typeof slot.source === "string" &&
    (slot.value === null || typeof slot.value === "string")
  );
}

/** Accept a desk-built record from chat so counts match the solicitor tabs. */
export function parseSolicitorFactRecordInput(raw: unknown): SolicitorFactRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as SolicitorFactRecord;
  if (rec.version !== SOLICITOR_FACT_RECORD_VERSION) return null;
  if (!rec.slots || typeof rec.slots !== "object") return null;
  for (const key of FACT_SLOT_KEYS) {
    if (!isFactSlot(rec.slots[key])) return null;
  }
  return {
    version: SOLICITOR_FACT_RECORD_VERSION,
    fingerprint: typeof rec.fingerprint === "string" ? rec.fingerprint : null,
    slots: rec.slots,
  };
}
