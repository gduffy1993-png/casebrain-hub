/**
 * Structured solicitor charge model — useful, honest, complete.
 * Audit-materialisation only; not a silent rewrite of source wording.
 *
 * Internal audit may record blocked≠repaired; that phrase must never appear
 * on primary solicitor-facing surfaces.
 */

import {
  OFFENCE_LABEL_REGISTRY,
  OFFENCE_LABEL_REGISTRY_VERSION,
  type OffenceLabelRegistryEntry,
} from "@/lib/criminal/offence-label-registry";
import {
  resolveSolicitorChargeProvenance,
  type ChargeProvenanceQuality,
  type SolicitorChargeProvenance,
} from "@/lib/criminal/solicitor-charge-provenance";

export { OFFENCE_LABEL_REGISTRY_VERSION };
export {
  GENERAL_SUPPLIED_PAPERS_PROVENANCE,
  containsSolicitorForbiddenInternalLanguage,
  resolveSolicitorChargeProvenance,
  SOLICITOR_FORBIDDEN_INTERNAL_LANGUAGE_RE,
} from "@/lib/criminal/solicitor-charge-provenance";

export type ChargeVerificationStatus = "verified" | "discrepancy" | "unresolved";

export type SolicitorChargeModel = {
  sourceChargeText: string;
  sourceReference: string;
  verificationStatus: ChargeVerificationStatus;
  /** Only when independently established (no registry conflict). */
  verifiedProvision: string | null;
  discrepancyExplanation: string | null;
  requiredAction: string | null;
  matchedRegistryIds: string[];
  /** Primary solicitor display (always shows recorded charge when present). */
  displayText: string;
  /** Copy/export/API: charge + warning inseparable when discrepancy. */
  copyText: string;
  /** Internal-only: corrected wording is not offered until solicitor confirms. */
  verifiedWordingAvailable: boolean;
  provenanceQuality: ChargeProvenanceQuality;
  /** Internal audit only — never rendered. */
  internalAuditReference: string | null;
};

const COPY_WARNING_PREFIX =
  "Citation discrepancy — the quoted charge is the wording recorded on the papers; it has not been corrected.";

function conflictPlainEnglish(entry: OffenceLabelRegistryEntry): string {
  switch (entry.id) {
    case "fraud_false_representation_s2":
      return "The offence description corresponds to section 2 of the Fraud Act 2006, while the source cites section 1.";
    case "mda_concerned_in_supply_s4_3_b":
      return "Being concerned in supplying is section 4(3)(b) of the Misuse of Drugs Act 1971; the source cites section 4(2)(b), which concerns production.";
    case "conspiracy_supply_or_import_not_bare_s4_3":
      return "Conspiracy requires treatment under section 1 of the Criminal Law Act 1977, with the intended substantive offence identified separately. The source cites bare section 4(3).";
    case "bladed_article_not_cja1988_s1":
      return "Public-place bladed article wording ordinarily concerns section 139 of the Criminal Justice Act 1988; the source cites section 1.";
    case "bail_generic_breach_not_s6_3":
      return "Section 6 of the Bail Act 1976 concerns failure to surrender, not a generic breach of bail conditions. The source cites section 6(3).";
    case "dvpn_breach_qualified_review":
      return "DVPN/DVPO breach wording and the cited provision require solicitor review under the Crime and Security Act 2010 scheme.";
    default:
      return "The statutory citation on the papers does not safely match the expected provision for this offence description.";
  }
}

function clientLine(client: string): string | null {
  return client ? `Client: ${client}` : null;
}

function resolveProvenance(input: {
  sourceReference?: string | null;
  documentTitle?: string | null;
  documentId?: string | null;
  pageOrSection?: string | null;
  extractionReference?: string | null;
}): SolicitorChargeProvenance {
  return resolveSolicitorChargeProvenance({
    documentTitle: input.documentTitle,
    documentId: input.documentId,
    pageOrSection: input.pageOrSection,
    extractionReference: input.extractionReference,
    rawSourceReference: input.sourceReference,
  });
}

/**
 * Build the structured charge model from source allegation wording.
 * Never silently substitutes registry text as the operative charge.
 * Never renders fixture IDs / audit lane names as provenance.
 */
export function buildSolicitorChargeModel(input: {
  sourceChargeText: string | null | undefined;
  sourceReference?: string | null;
  clientLabel?: string | null;
  documentTitle?: string | null;
  documentId?: string | null;
  pageOrSection?: string | null;
  extractionReference?: string | null;
}): SolicitorChargeModel {
  const source = (input.sourceChargeText ?? "").trim();
  const client = (input.clientLabel ?? "").trim();
  const provenance = resolveProvenance(input);
  const sourceReference = provenance.solicitorReference;

  if (!source) {
    const displayText = [
      clientLine(client),
      "Charge recorded on the papers:",
      "“(no charge wording recorded)”",
      "",
      `Source: ${sourceReference}`,
      "",
      "Status:",
      "The statutory citation could not be safely verified from the available material.",
      "",
      "Action:",
      "Check the operative charge sheet.",
    ]
      .filter(Boolean)
      .join("\n");
    return {
      sourceChargeText: "",
      sourceReference,
      verificationStatus: "unresolved",
      verifiedProvision: null,
      discrepancyExplanation: "No charge wording is recorded on the available source material.",
      requiredAction: "Check the operative charge sheet.",
      matchedRegistryIds: [],
      displayText,
      copyText: displayText,
      verifiedWordingAvailable: false,
      provenanceQuality: provenance.provenanceQuality,
      internalAuditReference: provenance.internalAuditReference,
    };
  }

  const matched = OFFENCE_LABEL_REGISTRY.filter((e) => e.detect.test(source));
  if (!matched.length) {
    const body = [clientLine(client), `Charge: ${source}`, `Source: ${sourceReference}`]
      .filter(Boolean)
      .join("\n");
    return {
      sourceChargeText: source,
      sourceReference,
      verificationStatus: "verified",
      verifiedProvision: source,
      discrepancyExplanation: null,
      requiredAction: null,
      matchedRegistryIds: [],
      displayText: body,
      copyText: body,
      verifiedWordingAvailable: true,
      provenanceQuality: provenance.provenanceQuality,
      internalAuditReference: provenance.internalAuditReference,
    };
  }

  const explanation = matched.map((e) => conflictPlainEnglish(e)).join(" ");
  const requiredAction =
    "Check the operative charge sheet or amendment record before relying on the citation.";
  const chargeBlock = [
    clientLine(client),
    "Charge recorded on the papers:",
    `“${source}”`,
    "",
    `Source: ${sourceReference}`,
    "",
    "Possible citation discrepancy:",
    explanation,
    "",
    "Action:",
    requiredAction,
  ]
    .filter(Boolean)
    .join("\n");

  const copyText = [COPY_WARNING_PREFIX, "", chargeBlock].join("\n");

  return {
    sourceChargeText: source,
    sourceReference,
    verificationStatus: "discrepancy",
    verifiedProvision: null,
    discrepancyExplanation: explanation,
    requiredAction,
    matchedRegistryIds: matched.map((e) => e.id),
    displayText: chargeBlock,
    copyText,
    verifiedWordingAvailable: false,
    provenanceQuality: provenance.provenanceQuality,
    internalAuditReference: provenance.internalAuditReference,
  };
}

/** True when copy text would detach a disputed charge from its warning. */
export function isDetachedDisputedChargeCopy(text: string): boolean {
  const t = text ?? "";
  const matched = OFFENCE_LABEL_REGISTRY.some((e) => e.detect.test(t));
  if (!matched) return false;
  return !/Citation discrepancy|Possible citation discrepancy|Charge recorded on the papers/i.test(t);
}
