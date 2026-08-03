/**
 * Sections 3–5 scaffolding: authority freeze stub (filled after fetch), coverage catalogue,
 * composition allocation, storage preflight, LOCKED acceptance contract.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const BASE = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const FIRST_HASH = "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";
const BASELINE = "308b7cb633f83d7c998bc80adf87356de346b3e9";

function writeJson(rel: string, data: unknown): string {
  const p = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const body = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(p, body, "utf8");
  return crypto.createHash("sha256").update(body).digest("hex");
}

function freeDiskBytes(): number {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "(Get-PSDrive C).Free"`,
      { encoding: "utf8" },
    ).trim();
    return Number(out);
  } catch {
    return 0;
  }
}

/** Exhaustive family catalogue — mark representation status honestly. */
const FAMILY_CATALOGUE: Array<{
  id: string;
  group: string;
  label: string;
  status:
    | "represented_substantively"
    | "represented_structurally_only"
    | "awaiting_qualified_legal_review"
    | "deferred_specialist"
    | "not_applicable_with_reason";
  reason?: string;
}> = [
  // A violence
  ...[
    "common_assault_battery",
    "assault_emergency_worker",
    "abh",
    "s20_gbh_wounding",
    "s18_gbh_wounding",
    "strangulation_suffocation",
    "poisoning",
    "child_cruelty",
    "murder",
    "attempted_murder",
    "voluntary_manslaughter",
    "involuntary_manslaughter",
    "gross_negligence_manslaughter",
    "corporate_manslaughter",
    "infanticide",
    "causing_allowing_death_or_serious_injury",
    "deaths_in_custody_or_police_contact",
    "non_accidental_head_injury",
  ].map((id) => ({
    id,
    group: "violence_homicide",
    label: id,
    status: (id.includes("corporate") || id.includes("infanticide") || id.includes("custody")
      ? "deferred_specialist"
      : id.includes("murder") || id.includes("manslaughter")
        ? "awaiting_qualified_legal_review"
        : "represented_substantively") as
      | "represented_substantively"
      | "awaiting_qualified_legal_review"
      | "deferred_specialist",
  })),
  // B acquisitive
  ...[
    "shoplifting_theft",
    "employee_theft",
    "handling_stolen_goods",
    "going_equipped",
    "burglary_dwelling",
    "burglary_non_dwelling",
    "aggravated_burglary",
    "robbery",
    "blackmail",
    "criminal_damage",
    "arson",
    "twoc",
    "fraud_false_representation",
    "fraud_failing_to_disclose",
    "fraud_abuse_of_position",
    "false_accounting",
    "forgery_counterfeit",
    "conspiracy_to_defraud",
    "benefit_welfare_fraud",
    "bribery",
    "corporate_offending",
  ].map((id) => ({
    id,
    group: "acquisitive_property_dishonesty",
    label: id,
    status: (["bribery", "corporate_offending", "conspiracy_to_defraud"].includes(id)
      ? "deferred_specialist"
      : "represented_substantively") as "represented_substantively" | "deferred_specialist",
  })),
  // C drugs
  ...[
    "drugs_possession",
    "drugs_pwits",
    "drugs_supply",
    "drugs_conspiracy_supply",
    "drugs_production_cultivation",
    "drugs_importation",
    "controlled_drug_lab",
    "psychoactive_substances",
    "county_lines",
    "modern_slavery_indicators",
    "trafficking",
    "nrm_lifecycle",
    "s45_defence",
    "gang_secondary_liability",
  ].map((id) => ({
    id,
    group: "drugs_gangs_exploitation",
    label: id,
    status: (["nrm_lifecycle", "s45_defence", "trafficking", "modern_slavery_indicators"].includes(id)
      ? "awaiting_qualified_legal_review"
      : "represented_substantively") as
      | "represented_substantively"
      | "awaiting_qualified_legal_review",
  })),
  // D firearms
  ...[
    "firearm_possession",
    "prohibited_weapons",
    "firearm_with_intent",
    "ammunition",
    "imitation_firearms",
    "firearm_conversion",
    "firearm_conspiracy",
    "offensive_weapons",
    "bladed_articles",
    "threatening_with_weapons",
    "explosives",
    "forensic_firearms_gsr_limits",
  ].map((id) => ({
    id,
    group: "firearms_weapons_explosives",
    label: id,
    status: (id.includes("explosives") || id.includes("conspiracy")
      ? "deferred_specialist"
      : "represented_substantively") as "represented_substantively" | "deferred_specialist",
  })),
  // E sexual
  ...[
    "rape",
    "assault_by_penetration",
    "sexual_assault",
    "historic_sexual",
    "child_sexual_abuse",
    "grooming",
    "indecent_prohibited_images",
    "online_sexual_offending",
    "exposure",
    "voyeurism",
    "intimate_image_offending",
    "sexual_harm_orders",
    "complainant_sexual_history_s41",
    "abe_sarc_counselling_third_party",
  ].map((id) => ({
    id,
    group: "sexual_child_related",
    label: id,
    status: "awaiting_qualified_legal_review" as const,
  })),
  // F domestic
  ...[
    "coercive_control",
    "stalking",
    "harassment",
    "strangulation_da",
    "retraction",
    "hearsay_res_gestae",
    "restraining_order_breach",
    "bail_breach",
    "dvpn_dvpo_dapo",
    "civil_family_criminal_overlap",
    "interpreter_lifecycle",
    "discontinuance_victim_non_attendance",
  ].map((id) => ({
    id,
    group: "domestic_abuse_protective_orders",
    label: id,
    status: "represented_substantively" as const,
  })),
  // G public order
  ...[
    "affray",
    "violent_disorder",
    "riot",
    "public_order_harassment_fear",
    "racially_religiously_aggravated",
    "disability_hate",
    "homophobic_transphobic_hate",
    "protest_offences",
    "serious_disruption_orders",
    "trespass_nuisance",
    "football_offences_banning",
  ].map((id) => ({
    id,
    group: "public_order_hate_protest",
    label: id,
    status: (["riot", "serious_disruption_orders"].includes(id)
      ? "deferred_specialist"
      : "represented_substantively") as "represented_substantively" | "deferred_specialist",
  })),
  // H digital
  ...[
    "cma_unauthorised_access",
    "data_theft",
    "service_disruption",
    "malware_ransomware",
    "malicious_communications",
    "cyberstalking",
    "social_media_attribution",
    "online_markets",
    "cryptocurrency_records",
    "intimate_image_abuse_digital",
    "online_child_abuse_digital",
    "cross_border_jurisdiction",
    "cloud_evidence",
    "device_account_user_sender_author_separation",
  ].map((id) => ({
    id,
    group: "digital_communications_cyber",
    label: id,
    status: (["cross_border_jurisdiction", "malware_ransomware"].includes(id)
      ? "deferred_specialist"
      : "represented_substantively") as "represented_substantively" | "deferred_specialist",
  })),
  // I road
  ...[
    "speeding_sjp",
    "section_172",
    "no_insurance_licence",
    "mobile_phone",
    "excess_alcohol",
    "drug_driving",
    "careless_driving",
    "dangerous_driving",
    "fail_to_stop_report",
    "disqualified_driving",
    "vehicle_taking_road",
    "causing_serious_injury_by_driving",
    "causing_death_by_driving",
    "edr_ecu_telematics_tachograph",
    "anpr",
    "collision_reconstruction",
    "foreign_disqualification",
    "statutory_declarations",
  ].map((id) => ({
    id,
    group: "road_traffic",
    label: id,
    status: (["causing_death_by_driving", "collision_reconstruction"].includes(id)
      ? "awaiting_qualified_legal_review"
      : "represented_substantively") as
      | "represented_substantively"
      | "awaiting_qualified_legal_review",
  })),
  // J public justice
  ...[
    "perverting_course_of_justice",
    "wasting_police_time",
    "witness_intimidation",
    "assisting_offender",
    "escape_absconding",
    "contempt",
    "juror_misconduct",
    "misconduct_in_public_office",
    "allegations_against_police",
    "prison_offences",
    "prohibited_prison_articles",
    "official_secrets_national_security",
    "terrorism_structures",
    "immigration_offending",
    "election_offending",
    "diplomatic_immunity",
    "international_cooperation",
  ].map((id) => ({
    id,
    group: "public_justice_state",
    label: id,
    status: ([
      "official_secrets_national_security",
      "terrorism_structures",
      "diplomatic_immunity",
      "international_cooperation",
      "election_offending",
    ].includes(id)
      ? "deferred_specialist"
      : "represented_structurally_only") as
      | "deferred_specialist"
      | "represented_structurally_only",
  })),
  // K specialist
  ...[
    "dangerous_dogs",
    "animal_offences",
    "hunting_hare_coursing",
    "fgm",
    "forced_marriage",
    "honour_based_abuse",
    "prostitution_exploitation",
    "obscene_publications",
    "media_public_interest",
    "private_prosecutions",
    "extradition",
    "education_prosecutions",
    "assisted_suicide",
    "corporate_regulatory",
    "retrial_after_acquittal",
    "abuse_of_process",
    "non_jury_trial",
    "deceased_suspect",
    "double_jeopardy_retrial",
  ].map((id) => ({
    id,
    group: "specialist_other",
    label: id,
    status: "deferred_specialist" as const,
    reason: "Structurally representable; substantive legal conclusions require specialist/qualified review",
  })),
];

function buildComposition(): {
  tiers: Record<string, number>;
  allocations: Array<{ familyId: string; tier: string; count: number }>;
} {
  const substantive = FAMILY_CATALOGUE.filter((f) => f.status === "represented_substantively");
  const structural = FAMILY_CATALOGUE.filter((f) => f.status === "represented_structurally_only");
  const awaiting = FAMILY_CATALOGUE.filter((f) => f.status === "awaiting_qualified_legal_review");
  const deferred = FAMILY_CATALOGUE.filter((f) => f.status === "deferred_specialist");

  // Risk-weighted: routine volume heavy on high-frequency families
  const routineFamilies = substantive.filter((f) =>
    [
      "shoplifting_theft",
      "common_assault_battery",
      "abh",
      "harassment",
      "stalking",
      "drugs_possession",
      "drugs_pwits",
      "bladed_articles",
      "criminal_damage",
      "burglary_dwelling",
      "speeding_sjp",
      "excess_alcohol",
      "no_insurance_licence",
      "mobile_phone",
      "affray",
      "public_order_harassment_fear",
      "fraud_false_representation",
      "handling_stolen_goods",
      "twoc",
      "assault_emergency_worker",
      "bail_breach",
      "restraining_order_breach",
      "malicious_communications",
      "careless_driving",
      "drug_driving",
      "going_equipped",
      "employee_theft",
      "burglary_non_dwelling",
      "coercive_control",
      "section_172",
    ].includes(f.id),
  );
  const seriousFamilies = [
    ...substantive.filter((f) =>
      [
        "robbery",
        "s20_gbh_wounding",
        "s18_gbh_wounding",
        "strangulation_suffocation",
        "drugs_supply",
        "drugs_conspiracy_supply",
        "county_lines",
        "firearm_possession",
        "aggravated_burglary",
        "arson",
        "blackmail",
        "dangerous_driving",
        "causing_serious_injury_by_driving",
        "violent_disorder",
        "fraud_abuse_of_position",
        "cma_unauthorised_access",
        "social_media_attribution",
        "cloud_evidence",
      ].includes(f.id),
    ),
    ...awaiting.filter((f) =>
      ["rape", "sexual_assault", "historic_sexual", "child_sexual_abuse", "murder", "attempted_murder"].includes(
        f.id,
      ),
    ),
  ];
  const procedureFamilies = [
    ...structural,
    ...substantive.filter((f) =>
      [
        "hearsay_res_gestae",
        "discontinuance_victim_non_attendance",
        "interpreter_lifecycle",
        "dvpn_dvpo_dapo",
        "civil_family_criminal_overlap",
        "retraction",
        "statutory_declarations",
        "anpr",
        "device_account_user_sender_author_separation",
      ].includes(f.id),
    ),
  ];
  const specialistFamilies = deferred;

  function allocate(
    tier: string,
    total: number,
    fams: typeof FAMILY_CATALOGUE,
  ): Array<{ familyId: string; tier: string; count: number }> {
    if (!fams.length) return [];
    const base = Math.floor(total / fams.length);
    let rem = total - base * fams.length;
    return fams.map((f, i) => {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      // Weight first families slightly higher for volume realism
      const boost = i < Math.min(8, fams.length) && tier === "routine_volume" ? Math.min(extra + 2, rem + extra) : extra;
      return { familyId: f.id, tier, count: base + (i < rem + extra ? 1 : 0) };
    }).map((row, i) => {
      // simpler: distribute remainder to earliest
      return row;
    });
  }

  // Recompute clean distribution
  function distribute(
    tier: string,
    total: number,
    fams: typeof FAMILY_CATALOGUE,
  ): Array<{ familyId: string; tier: string; count: number }> {
    if (fams.length === 0 || total <= 0) return [];
    const weights = fams.map((_, i) => (tier === "routine_volume" ? Math.max(1, 12 - Math.floor(i / 3)) : Math.max(1, 6 - Math.floor(i / 4))));
    const sumW = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sumW) * total);
    const floors = raw.map((x) => Math.floor(x));
    let left = total - floors.reduce((a, b) => a + b, 0);
    const frac = raw.map((x, i) => ({ i, f: x - floors[i] })).sort((a, b) => b.f - a.f);
    for (let k = 0; k < left; k++) floors[frac[k % frac.length].i] += 1;
    return fams.map((f, i) => ({ familyId: f.id, tier, count: floors[i] }));
  }

  const allocations = [
    ...distribute("routine_volume", 1600, routineFamilies.length ? routineFamilies : substantive.slice(0, 40)),
    ...distribute("serious_complex_crown", 800, seriousFamilies.length ? seriousFamilies : substantive.slice(0, 30)),
    ...distribute("procedure_focused", 400, procedureFamilies.length ? procedureFamilies : structural.concat(substantive.slice(0, 20))),
    ...distribute("specialist_structural", 200, specialistFamilies),
  ];

  const sum = allocations.reduce((a, b) => a + b.count, 0);
  if (sum !== 3000) {
    const delta = 3000 - sum;
    allocations[0].count += delta;
  }

  return {
    tiers: {
      routine_volume: 1600,
      serious_complex_crown: 800,
      procedure_focused: 400,
      specialist_structural: 200,
    },
    allocations,
  };
}

function main(): void {
  const free = freeDiskBytes();
  const freeGb = free / (1024 ** 3);

  const composition = buildComposition();
  const compositionHash = writeJson("catalogues/new3000-composition-allocation.json", {
    schemaVersion: "new3000-composition-allocation@1.0.0",
    generatedAt: new Date().toISOString(),
    tiers: composition.tiers,
    total: composition.allocations.reduce((a, b) => a + b.count, 0),
    allocations: composition.allocations,
    riskWeighted: true,
    equalTenPerChargeForbidden: true,
  });

  const offenceCatHash = writeJson("catalogues/offence-and-procedure-coverage-catalogue.json", {
    schemaVersion: "offence-and-procedure-coverage-catalogue@1.0.0",
    generatedAt: new Date().toISOString(),
    jurisdiction: "England and Wales",
    families: FAMILY_CATALOGUE,
    statusCounts: FAMILY_CATALOGUE.reduce(
      (acc, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    note: "No family omitted because difficult. Specialist/deferred remain visible.",
  });

  writeJson("catalogues/deferred-specialist-register.json", {
    schemaVersion: "deferred-specialist-register@1.0.0",
    families: FAMILY_CATALOGUE.filter((f) => f.status === "deferred_specialist" || f.status === "awaiting_qualified_legal_review"),
  });

  writeJson("catalogues/document-and-layout-coverage-catalogue.json", {
    schemaVersion: "document-and-layout-coverage-catalogue@1.0.0",
    mgForms: [
      "MG02","MG03","MG03A","MG04","MG05","MG06","MG06A","MG06B","MG06C","MG06D","MG06E",
      "MG07","MG08","MG09","MG10","MG11","MG12","MG14","MG15","MG16","MG18","MG19","MG20","MG21","MG21A","MG22",
    ],
    instruments: [
      "written_charge","summons_requisition","charge_sheet","indictment_draft","indictment_amended",
      "indictment_superseded","indictment_operative","idpc","gap","ngap","crown_court_file",
      "magistrates_pet","crown_ptph","defence_statement","s8_disclosure","hearsay_notice",
      "bad_character","s41_state","s76_s78","newton","psr","vps","restraint_confiscation",
    ],
    layouts: [
      "born_digital_pdf","scanned_pdf","mixed_pdf","searchable_ocr","poor_ocr","handwriting",
      "redactions","rotated_skewed","multi_column","table_heavy","missing_pages","duplicate_pages",
      "docx","csv","eml","jpg_png","synthetic_audio_video_metadata",
    ],
    note: "Layout defects must be coherent and document-specific; not random damage on every matter.",
  });

  // Storage preflight — stratified approach required under local disk pressure
  const projection = {
    schemaVersion: "performance-and-storage-preflight@1.0.0",
    generatedAt: new Date().toISOString(),
    freeBytes: free,
    freeGiB: Number(freeGb.toFixed(2)),
    stopThresholdGiB: 2.0,
    estimatesGiB: {
      matterGraphsJsonAll3000: 0.15,
      thinSourcePacksAll3000: 0.6,
      stratifiedRenderedPdfSubset500: 0.35,
      solicitorSurfacesMaterialisation: 1.2,
      maaLedgersReceipts: 0.25,
      truthSealedSeparate: 0.2,
      peakTotalApprox: 2.75,
      fullHeavyPdfAll3000Unsafe: 12.0,
    },
    decision:
      freeGb < 8
        ? "STRATIFIED_RENDER_REQUIRED"
        : "FULL_RENDER_ALLOWED_WITH_MONITORING",
    plan: {
      all3000StructuredMatterGraphs: true,
      all3000UniqueSourceDocumentRelationshipFingerprints: true,
      renderedPdfNativeSubset: 500,
      thinTextSourcePacksForRemainder: 2500,
      doNotFabricateCompletedPdfs: true,
      heavyBundleLane: "separately_reportable_not_default",
    },
    gate:
      freeGb < 2
        ? "STOP_EXHAUSTED_RESOURCES"
        : "CONTINUE_WITH_STRATIFIED_PLAN",
  };
  writeJson("performance-and-storage-report.json", projection);

  if (projection.gate === "STOP_EXHAUSTED_RESOURCES") {
    writeJson("STOP-FOR-CODEX-REVIEW.json", {
      stoppedAt: new Date().toISOString(),
      reason: "exhausted_disk_resources_before_bulk_generation",
      freeGiB: projection.freeGiB,
      programmePassSupported: false,
    });
    console.error(JSON.stringify({ stop: true, projection }, null, 2));
    process.exit(2);
  }

  // Authority register placeholder — freeze once fetch agent results merged
  const authorityPath = path.join(BASE, "authority/official-source-authority-register.json");
  if (!fs.existsSync(authorityPath)) {
    writeJson("authority/official-source-authority-register.json", {
      schemaVersion: "official-source-authority-register@1.0.0",
      frozen: false,
      pendingFetch: true,
      retrievalDate: "2026-08-02",
      jurisdiction: "England and Wales",
      records: [],
      note: "Will be frozen before case generation once official pages are retrieved.",
    });
  }

  const contract = {
    schemaVersion: "stage3000-diverse-second-LOCKED-ACCEPTANCE-CONTRACT@1.0.0",
    frozenAt: new Date().toISOString(),
    authorityBaselineCommit: BASELINE,
    programmePassSupported: false,
    stage3000CompletionAllowed: false,
    corpusPassSupported: false,
    claimsForbidden: [
      "programme_PASS",
      "corpus_PASS",
      "stage3000_completion_merely_because_3000_ran",
      "model_trained",
      "qualified_solicitor_approval",
      "legal_authority_approval",
      "every_possible_criminal_case_covered",
    ],
    protectedAssets: {
      firstFrozen3000MembershipSha256: FIRST_HASH,
      brain1: "unchanged_required",
      guardian: "unchanged_required",
      phase11: "unchanged_required",
      malikPrice: "unchanged_required",
      integrityLedger: "unchanged_required",
      sealedHoldouts: "do_not_access",
      core18Blueprints: "do_not_mutate",
    },
    population: {
      exactMatterCount: 3000,
      tiers: composition.tiers,
      uniquenessRequired: {
        caseIds: 3000,
        substantiveTruthFingerprints: 3000,
        documentRelationshipFingerprints: 3000,
        sourceFingerprints: 3000,
        caseBoundOutputFingerprints: 3000,
      },
      rejectParameterSubstitutionClones: true,
      firstCensusContentCollapseMustNotRecur: true,
      maxAllowedLargestSemanticClusterTarget: 25,
    },
    sourceCompleteness: [
      "complete_source_packet",
      "deliberate_truth_keyed_missing_source",
      "unsupported_native_input_not_exercised",
    ],
    generationOrder: [
      "freeze_acceptance_contract",
      "freeze_coverage_allocation",
      "freeze_authority_register",
      "generate_source_packs",
      "generate_truth_keys_separately",
      "hash_seal_truth",
      "materialise_with_truth_inaccessible",
      "freeze_outputs",
      "run_controls_source_output_only",
      "freeze_candidates",
      "open_truth",
      "triage",
      "repair_shared_causes",
      "rerun_same_frozen_membership",
    ],
    checkpoints: [5, 20, 50, 150, 300, 500, 1000, 2000, 3000],
    storagePlan: projection.plan,
    storageGate: projection.gate,
    compositionAllocationSha256: compositionHash,
    offenceCatalogueSha256: offenceCatHash,
    stopUncommittedAfterPostRemediationRerun: true,
  };
  writeJson("LOCKED-ACCEPTANCE-CONTRACT.json", contract);

  console.log(
    JSON.stringify(
      {
        ok: true,
        freeGiB: projection.freeGiB,
        storageGate: projection.gate,
        familyCount: FAMILY_CATALOGUE.length,
        compositionTotal: composition.allocations.reduce((a, b) => a + b.count, 0),
      },
      null,
      2,
    ),
  );
}

main();
