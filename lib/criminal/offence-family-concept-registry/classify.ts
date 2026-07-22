/**
 * Family activation + provenance-gated concept classification (Phase 4).
 */

import {
  resolveSolicitorOffenceFamily,
  type OffenceFamilyResolution,
  type SolicitorOffenceFamily,
  type WrongFamilyHit,
  type WrongFamilyHitKind,
} from "@/lib/criminal/solicitor-offence-family";
import {
  mapAuditScenarioFamilyToSolicitor,
  OFFENCE_FAMILY_CONCEPT_REGISTRY,
  OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
  type ConceptAllowanceTier,
  type ConceptId,
  type FamilyActivation,
  type FamilyActivationSource,
  type StructuredProvenanceRef,
} from "./schema";

export type ProvenanceContext = {
  /** Structured evidence rows — required for conditional / source-backed allowance. */
  evidence: StructuredProvenanceRef[];
  allegation?: string | null;
  chargeWording?: string | null;
  /** Free-text hay for *detection* of primary family only — NOT sufficient for conditional allowance. */
  bundleHay?: string | null;
  /** Optional audit / truth-key family string. */
  auditFamily?: string | null;
};

export type ConceptVerdict = {
  conceptId: ConceptId;
  label: string;
  tier: ConceptAllowanceTier;
  kind: WrongFamilyHitKind | "allowed" | "uncertain";
  /** Evidence IDs that satisfied conditional provenance (if any). */
  provenanceEvidenceIds: string[];
  /** Why this verdict was reached (redacted / structural). */
  reason: string;
};

export type TextFamilyClassification = {
  registryVersion: typeof OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION;
  primary: OffenceFamilyResolution;
  /** Every family activated for this matter + activation source. */
  activatedFamilies: FamilyActivation[];
  mixedFamily: boolean;
  uncertain: boolean;
  /** Concepts detected in the supplied output texts. */
  conceptVerdicts: ConceptVerdict[];
  conditionalAllowed: ConceptVerdict[];
  unsupportedBlocked: ConceptVerdict[];
  /** Per-output-line scoped results — do not nuke whole matter for one bad line. */
  perText: Array<{
    textIndex: number;
    blocked: boolean;
    blockedConcepts: string[];
    allowedConcepts: string[];
  }>;
  /** True when any substantive text has unsupported leakage. */
  hasUnsupportedLeakage: boolean;
};

function mapAuditFamily(raw: string | null | undefined): SolicitorOffenceFamily | null {
  return mapAuditScenarioFamilyToSolicitor(raw);
}

function pushActivation(
  list: FamilyActivation[],
  family: SolicitorOffenceFamily,
  source: FamilyActivationSource,
  reason: string,
  provenance: StructuredProvenanceRef[] = [],
) {
  if (family === "unknown") return;
  if (list.some((a) => a.family === family && a.source === source)) return;
  list.push({ family, source, reason, provenance });
}

/**
 * Activate families from allegation/charge/evidence IDs/audit — records every activation.
 * Keyword-only free-text without evidence IDs does not activate *secondary* families for
 * conditional concepts (primary resolution may still use hay for the main family).
 */
export function activateFamilies(ctx: ProvenanceContext): FamilyActivation[] {
  const activated: FamilyActivation[] = [];

  const primary = resolveSolicitorOffenceFamily({
    allegation: ctx.allegation,
    chargeWording: ctx.chargeWording,
    bundleHay: ctx.bundleHay,
  });
  if (primary.family !== "unknown") {
    pushActivation(activated, primary.family, "allegation", primary.reason);
  }

  const fromAudit = mapAuditFamily(ctx.auditFamily);
  if (fromAudit) {
    pushActivation(activated, fromAudit, "audit_scenario_family", `auditFamily=${ctx.auditFamily}`);
  }
  if (ctx.auditFamily && /harassment_digital|drugs_|violence|theft|motoring/i.test(ctx.auditFamily)) {
    const direct = mapAuditFamily(ctx.auditFamily);
    if (direct) {
      pushActivation(activated, direct, "truth_key_offence_family", `truthKey=${ctx.auditFamily}`);
    }
  }

  for (const ev of ctx.evidence) {
    if (!ev.evidenceId?.trim() || !ev.label?.trim()) continue;
    for (const entry of OFFENCE_FAMILY_CONCEPT_REGISTRY) {
      if (!entry.activateFromEvidenceLabel.test(ev.label)) continue;
      for (const fam of entry.nativeFamilies) {
        pushActivation(activated, fam, "evidence_item", `evidence activates ${entry.conceptId}`, [
          {
            evidenceId: ev.evidenceId,
            label: ev.label,
            existence: ev.existence,
            sourceDocument: ev.sourceDocument,
            sourcePage: ev.sourcePage,
          },
        ]);
      }
    }
  }

  return activated;
}

function evidenceIdsSupportingConcept(
  entry: (typeof OFFENCE_FAMILY_CONCEPT_REGISTRY)[number],
  evidence: StructuredProvenanceRef[],
): string[] {
  const ids: string[] = [];
  for (const ev of evidence) {
    if (!ev.evidenceId?.trim()) continue;
    if (!ev.label?.trim()) continue;
    // ID alone is insufficient — label content must support the activated concept.
    if (!entry.activateFromEvidenceLabel.test(ev.label)) continue;
    // Reject placeholder / empty-shell labels that only exist to carry an ID.
    if (/^(unknown|n\/?a|item|evidence)\s*\d*$/i.test(ev.label.trim())) continue;
    ids.push(ev.evidenceId);
  }
  return ids;
}

/**
 * Keyword presence in free-text hay alone MUST NOT satisfy conditional provenance.
 * Structured evidence rows need both a real evidenceId AND label content that supports
 * the concept (ID possession alone is insufficient).
 */
export function resolveConceptTier(
  conceptId: ConceptId,
  activatedFamilies: FamilyActivation[],
  evidence: StructuredProvenanceRef[],
): { tier: ConceptAllowanceTier; provenanceEvidenceIds: string[]; reason: string } {
  const entry = OFFENCE_FAMILY_CONCEPT_REGISTRY.find((c) => c.conceptId === conceptId);
  if (!entry) {
    return {
      tier: "uncertain_fail_closed",
      provenanceEvidenceIds: [],
      reason: "Unknown concept id",
    };
  }

  const families = new Set(activatedFamilies.map((a) => a.family));
  if (families.size === 0) {
    return {
      tier: "uncertain_fail_closed",
      provenanceEvidenceIds: [],
      reason: "No activated family — fail closed for substantive concepts",
    };
  }

  const nativeHit = entry.nativeFamilies.some((f) => families.has(f));
  if (nativeHit) {
    return {
      tier: "allowed",
      provenanceEvidenceIds: [],
      reason: "Native to an activated family",
    };
  }

  const conditionalHit = entry.conditionalFamilies.some((f) => families.has(f));
  const provenanceIds = evidenceIdsSupportingConcept(entry, evidence);
  if (conditionalHit && provenanceIds.length > 0) {
    return {
      tier: "conditional_provenance",
      provenanceEvidenceIds: provenanceIds,
      reason: "Conditional family with structured evidence IDs",
    };
  }

  if (conditionalHit && provenanceIds.length === 0) {
    return {
      tier: "forbidden",
      provenanceEvidenceIds: [],
      reason: "Conditional family but no structured evidence ID provenance (keyword hay alone insufficient)",
    };
  }

  if (entry.defaultForbiddenOutsideNative) {
    return {
      tier: "forbidden",
      provenanceEvidenceIds: [],
      reason: "Forbidden outside native/conditional+provenance",
    };
  }

  return {
    tier: "uncertain_fail_closed",
    provenanceEvidenceIds: [],
    reason: "Unmapped concept allowance",
  };
}

function hitKindFromTier(tier: ConceptAllowanceTier): WrongFamilyHitKind | "allowed" | "uncertain" {
  if (tier === "allowed" || tier === "conditional_provenance") {
    return tier === "allowed" ? "allowed" : "source_backed_ok";
  }
  if (tier === "forbidden") return "unsupported_template_leakage";
  return "uncertain";
}

/**
 * Classify solicitor output texts against activated families + structured provenance.
 */
export function classifyTextsAgainstConceptRegistry(
  texts: string[],
  ctx: ProvenanceContext,
): TextFamilyClassification {
  const activatedFamilies = activateFamilies(ctx);
  const primary = resolveSolicitorOffenceFamily({
    allegation: ctx.allegation,
    chargeWording: ctx.chargeWording,
    bundleHay: ctx.bundleHay,
  });

  const mixedFamily = new Set(activatedFamilies.map((a) => a.family)).size > 1;
  const uncertain = primary.failClosed || activatedFamilies.length === 0;

  const conceptVerdicts: ConceptVerdict[] = [];
  const seenConcept = new Set<string>();
  const perText: TextFamilyClassification["perText"] = [];

  texts.forEach((text, textIndex) => {
    const blockedConcepts: string[] = [];
    const allowedConcepts: string[] = [];
    if (!text?.trim()) {
      perText.push({ textIndex, blocked: false, blockedConcepts, allowedConcepts });
      return;
    }

    for (const entry of OFFENCE_FAMILY_CONCEPT_REGISTRY) {
      if (!entry.detectInOutput.test(text)) continue;
      const resolved = resolveConceptTier(entry.conceptId, activatedFamilies, ctx.evidence);
      const kind = hitKindFromTier(resolved.tier);
      const key = `${entry.conceptId}:${textIndex}:${resolved.tier}`;
      if (!seenConcept.has(`${entry.conceptId}:${resolved.tier}`)) {
        seenConcept.add(`${entry.conceptId}:${resolved.tier}`);
        conceptVerdicts.push({
          conceptId: entry.conceptId,
          label: entry.label,
          tier: resolved.tier,
          kind,
          provenanceEvidenceIds: resolved.provenanceEvidenceIds,
          reason: resolved.reason,
        });
      }
      if (resolved.tier === "forbidden" || resolved.tier === "uncertain_fail_closed") {
        blockedConcepts.push(entry.label);
      } else {
        allowedConcepts.push(entry.label);
      }
      // silence unused
      void key;
    }

    perText.push({
      textIndex,
      blocked: blockedConcepts.length > 0,
      blockedConcepts,
      allowedConcepts,
    });
  });

  // Promote mixed-family non-primary concepts that have structured evidence IDs
  // to conditional_provenance (source_backed_ok) for reporting + gate allowance.
  for (const v of conceptVerdicts) {
    if (v.tier !== "allowed") continue;
    const entry = OFFENCE_FAMILY_CONCEPT_REGISTRY.find((c) => c.conceptId === v.conceptId);
    if (!entry || entry.nativeFamilies.includes(primary.family)) continue;
    const ids = evidenceIdsSupportingConcept(entry, ctx.evidence);
    if (!ids.length) continue;
    v.tier = "conditional_provenance";
    v.kind = "source_backed_ok";
    v.provenanceEvidenceIds = ids;
    v.reason = "Mixed-family: non-primary concept allowed via structured evidence activation";
  }

  const conditionalAllowed = conceptVerdicts.filter((v) => v.tier === "conditional_provenance");
  const unsupportedBlocked = conceptVerdicts.filter(
    (v) => v.tier === "forbidden" || v.tier === "uncertain_fail_closed",
  );
  const hasUnsupportedLeakage = unsupportedBlocked.length > 0 || perText.some((p) => p.blocked);

  return {
    registryVersion: OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
    primary,
    activatedFamilies,
    mixedFamily,
    uncertain,
    conceptVerdicts,
    conditionalAllowed,
    unsupportedBlocked,
    perText,
    hasUnsupportedLeakage,
  };
}

/**
 * Adapter for legacy WrongFamilyHit consumers.
 * Requires ProvenanceContext — keyword-only hay is passed as empty evidence → no source_backed_ok.
 */
export function classifyWrongFamilyHitsWithProvenance(
  text: string,
  resolution: OffenceFamilyResolution,
  ctx: ProvenanceContext,
): WrongFamilyHit[] {
  const classification = classifyTextsAgainstConceptRegistry([text], {
    ...ctx,
    allegation: ctx.allegation ?? (resolution.family !== "unknown" ? resolution.family : null),
  });
  return classification.conceptVerdicts
    .filter((v) => v.kind === "unsupported_template_leakage" || v.kind === "source_backed_ok")
    .map((v) => ({
      label: v.label,
      kind: v.kind as WrongFamilyHitKind,
    }));
}

/** Scope: keep usable texts; drop only blocked lines (view / advanced surfaces). */
export function scopeFilterTextsByFamily(
  texts: string[],
  ctx: ProvenanceContext,
): { kept: string[]; blocked: string[]; classification: TextFamilyClassification } {
  const classification = classifyTextsAgainstConceptRegistry(texts, ctx);
  const kept: string[] = [];
  const blocked: string[] = [];
  texts.forEach((t, i) => {
    if (classification.perText[i]?.blocked) blocked.push(t);
    else kept.push(t);
  });
  return { kept, blocked, classification };
}
