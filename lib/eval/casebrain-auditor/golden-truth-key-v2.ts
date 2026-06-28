import type { BundleFidelityTruthKey } from "./bundle-fidelity-types";
import type { OffenceFamily, StrategyCorpusManifest } from "./strategy-corpus-types";

/** H2 verification fields — optional extension on gold truth keys. */
export type GoldenVerificationTruthKey = BundleFidelityTruthKey & {
  truthKeyVersion?: "h2-v1";
  offenceFamily?: string;
  mainIssueExpected?: string;
  servedEvidenceExpected?: string[];
  referredOnlyEvidenceExpected?: string[];
  mustNotSayExpected?: string[];
  expectedChaseItems?: string[];
  expectedSummaryRisk?: string;
};

export const H2_TRUTH_KEY_FIELDS = [
  "defendant",
  "offenceFamily",
  "mainIssueExpected",
  "servedEvidenceExpected",
  "referredOnlyEvidenceExpected",
  "missingMaterialExpected",
  "mustNotSayExpected",
  "expectedChaseItems",
  "expectedSummaryRisk",
] as const;

export type TruthKeyCoverageField = (typeof H2_TRUTH_KEY_FIELDS)[number];

export type TruthKeyCoverageResult = {
  bundleId: string;
  covered: TruthKeyCoverageField[];
  missing: TruthKeyCoverageField[];
  coveragePct: number;
};

export function mainIssueForFamily(family: string): string {
  switch (family) {
    case "fraud_account_control":
      return "Account access, dishonesty, and source bank/device material";
    case "pwits_phone_attribution":
    case "pwits_phone":
      return "Phone attribution, extraction, and possession linkage";
    case "robbery_identification":
    case "robbery_id":
      return "Identification, CCTV/CAD timing, and complainant account";
    case "violence_domestic_assault":
    case "violence_gbh_s18":
      return "Complainant account, injury/causation, and participation";
    case "generic_motoring_provisional":
    case "motoring":
      return "Procedure, breath/device calibration, and service material";
    case "needs_review":
      return "Attribution, source material, and course of conduct";
    default:
      return "Disclosure completeness and source-material pressure";
  }
}

export function mustNotSayFromProhibited(prohibited: string[] | undefined): string[] {
  const families = prohibited ?? [];
  const lines = families.map((f) => `Do not import ${f.replace(/_/g, " ")} unless the papers support it.`);
  return [...new Set(lines)];
}

export function deriveVerificationFromManifest(
  manifest: StrategyCorpusManifest,
  base: BundleFidelityTruthKey,
): GoldenVerificationTruthKey {
  const served = manifest.evidenceStates
    .filter((e) => e.state === "served")
    .map((e) => e.category);
  const referred = manifest.evidenceStates
    .filter((e) => e.state === "partial" || e.state === "outstanding")
    .map((e) => e.category);

  return {
    ...base,
    truthKeyVersion: "h2-v1",
    offenceFamily: manifest.offenceFamily,
    mainIssueExpected: mainIssueForFamily(manifest.offenceFamily),
    servedEvidenceExpected: served.length ? served : undefined,
    referredOnlyEvidenceExpected: referred.length ? referred : undefined,
    missingMaterialExpected: base.missingMaterialExpected?.length
      ? base.missingMaterialExpected
      : manifest.missingMaterial,
    mustNotSayExpected: mustNotSayFromProhibited(base.prohibitedFamilies),
    expectedChaseItems: (base.missingMaterialExpected?.length
      ? base.missingMaterialExpected
      : manifest.missingMaterial
    ).slice(0, 6),
    expectedSummaryRisk:
      manifest.failureModeTags.includes("thin_bundle")
        ? "Thin bundle — provisional strategy only until disclosure complete"
        : "Provisional pending served material and solicitor review",
  };
}

export function auditTruthKeyCoverage(truth: GoldenVerificationTruthKey): TruthKeyCoverageResult {
  const covered: TruthKeyCoverageField[] = [];
  const missing: TruthKeyCoverageField[] = [];

  const has = (field: TruthKeyCoverageField, ok: boolean) => {
    if (ok) covered.push(field);
    else missing.push(field);
  };

  has("defendant", Boolean(truth.defendant?.trim()));
  has("offenceFamily", Boolean(truth.offenceFamily?.trim() || truth.expectedRouteFamily?.trim() || truth.expectedWorkflowProfile?.trim()));
  has("mainIssueExpected", Boolean(truth.mainIssueExpected?.trim()));
  has(
    "servedEvidenceExpected",
    (truth.servedEvidenceExpected?.length ?? 0) > 0 ||
      (truth.evidenceSignalsExpected?.length ?? 0) > 0 ||
      (truth.documentTypesExpected?.length ?? 0) > 0,
  );
  has(
    "referredOnlyEvidenceExpected",
    (truth.referredOnlyEvidenceExpected?.length ?? 0) > 0 ||
      (truth.missingMaterialExpected?.length ?? 0) > 0,
  );
  has(
    "missingMaterialExpected",
    (truth.missingMaterialExpected?.length ?? 0) > 0 ||
      truth.thinBundleExpected ||
      ((truth.servedEvidenceExpected?.length ?? 0) > 0 && truth.thinBundleExpected === false),
  );
  has("mustNotSayExpected", (truth.mustNotSayExpected?.length ?? 0) > 0 || (truth.prohibitedFamilies?.length ?? 0) > 0);
  has(
    "expectedChaseItems",
    (truth.expectedChaseItems?.length ?? 0) > 0 || (truth.missingMaterialExpected?.length ?? 0) > 0,
  );
  has("expectedSummaryRisk", Boolean(truth.expectedSummaryRisk?.trim()));

  const coveragePct = Math.round((covered.length / H2_TRUTH_KEY_FIELDS.length) * 100);
  return { bundleId: truth.bundleId, covered, missing, coveragePct };
}

export function manualVerificationForAnchor(
  bundleId: string,
  base: BundleFidelityTruthKey,
): GoldenVerificationTruthKey {
  const family =
    base.expectedRouteFamily ??
    (typeof base.expectedWorkflowProfile === "string" ? base.expectedWorkflowProfile : "generic_provisional");

  const patch: GoldenVerificationTruthKey = {
    ...base,
    truthKeyVersion: "h2-v1",
    offenceFamily: family,
    mainIssueExpected: mainIssueForFamily(family),
    mustNotSayExpected: mustNotSayFromProhibited(base.prohibitedFamilies),
    expectedChaseItems: (base.missingMaterialExpected ?? []).slice(0, 6),
    expectedSummaryRisk: base.thinBundleExpected
      ? "Thin bundle — provisional strategy only until disclosure complete"
      : "Provisional pending served material and solicitor review",
  };

  if (bundleId.includes("taylor-brookes")) {
    patch.offenceFamily = "harassment_digital";
    patch.mainIssueExpected = "Relationship context, attribution, and message/account source material";
    patch.referredOnlyEvidenceExpected = ["phone extraction", "message export", "complainant MG11"];
    patch.mustNotSayExpected = [
      "Do not import BWV unless the papers support it.",
      "Do not import custody safeguards unless the papers support it.",
      "Do not import drugs continuity unless the papers support it.",
    ];
    patch.expectedChaseItems = [
      "Phone extraction source material",
      "Message export / screenshot pack",
      "Complainant MG11",
      "Subscriber / account data",
    ];
  }

  if (bundleId.includes("jordan-hale")) {
    patch.offenceFamily = "assault_emergency_worker";
    patch.mainIssueExpected = "BWV coverage, custody/PACE safeguards, and complainant account";
    patch.referredOnlyEvidenceExpected = ["body-worn video (BWV)", "custody record / PACE material"];
    patch.mustNotSayExpected = [
      "Do not import drugs continuity unless the papers support it.",
      "Do not import ABE unless the papers support it.",
    ];
    patch.expectedChaseItems = ["Body-worn video (BWV)", "Interview recording / transcript", "Complainant MG11"];
  }

  if ((base.evidenceSignalsExpected?.length ?? 0) > 0) {
    patch.servedEvidenceExpected = base.evidenceSignalsExpected?.filter((s) =>
      /mg5|mg11|charge|mg6/i.test(s),
    );
  }

  if (bundleId.includes("fictional-theft") || bundleId.includes("ashleigh-merritt")) {
    patch.expectedChaseItems = ["Retail CCTV continuity"];
    patch.referredOnlyEvidenceExpected = ["CCTV / continuity material if referred"];
    patch.servedEvidenceExpected = ["charge_sheet", "mg5"];
  }

  if (!(patch.missingMaterialExpected?.length ?? 0)) {
    const chaseFromSignals = (base.evidenceSignalsExpected ?? []).filter((s) =>
      /cctv|bwv|medical|lab|mg6|cad|999|interview|continuity/i.test(s),
    );
    if (chaseFromSignals.length) {
      patch.expectedChaseItems = chaseFromSignals.slice(0, 4);
      patch.referredOnlyEvidenceExpected = chaseFromSignals.slice(0, 3);
    }
  } else if (!(patch.expectedChaseItems?.length ?? 0)) {
    patch.expectedChaseItems = patch.missingMaterialExpected!.slice(0, 6);
  }

  if (!(patch.referredOnlyEvidenceExpected?.length ?? 0) && (patch.missingMaterialExpected?.length ?? 0) > 0) {
    patch.referredOnlyEvidenceExpected = patch.missingMaterialExpected!.slice(0, 4);
  }

  return patch;
}
