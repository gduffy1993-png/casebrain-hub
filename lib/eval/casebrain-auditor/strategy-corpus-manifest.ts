import {
  buildRecipeId,
  FICTIONAL_DEFENDANT_NAMES,
  templateForFamily,
} from "./strategy-corpus-recipes";
import { mulberry32, pickInt, pickMany, pickOne } from "./strategy-corpus-seed";
import type {
  ContradictionSpec,
  DocumentInventoryItem,
  EvidenceState,
  FailureModeTag,
  MaterialisationMode,
  OffenceFamily,
  StrategyCorpusExpectations,
  StrategyCorpusManifest,
  StrategyCorpusSplit,
} from "./strategy-corpus-types";
import {
  FAILURE_MODE_TAGS,
  OFFENCE_FAMILIES,
  STRATEGY_CORPUS_GENERATOR_VERSION,
} from "./strategy-corpus-types";

function defendantName(seed: number): string {
  return FICTIONAL_DEFENDANT_NAMES[seed % FICTIONAL_DEFENDANT_NAMES.length]!;
}

function missingForTags(tags: FailureModeTag[], templateMissing: string[]): string[] {
  const items = new Set<string>(templateMissing);
  const tagMissing: Partial<Record<FailureModeTag, string[]>> = {
    partial_cctv: ["CCTV partial extract only"],
    cctv_stills_no_master: ["CCTV stills without master export log"],
    cad_summary_no_full_cad: ["CAD summary without full CAD log"],
    "999_summary_no_audio": ["999 summary without audio recording"],
    bwv_outstanding: ["Body worn video download outstanding"],
    interview_summary_no_transcript: ["Interview summary without full transcript"],
    custody_pace_limited: ["Custody / PACE material limited on export"],
    incomplete_mg6: ["MG6 schedule incomplete"],
    missing_mg5: ["MG5 case summary not served"],
    lab_continuity_gap: ["Lab continuity / chain note outstanding"],
    phone_device_attribution_dispute: ["Phone/device attribution material outstanding"],
  };
  for (const tag of tags) {
    for (const m of tagMissing[tag] ?? []) items.add(m);
  }
  return [...items].slice(0, 10);
}

function contradictionsForTags(
  tags: FailureModeTag[],
  rng: () => number,
): ContradictionSpec[] {
  const out: ContradictionSpec[] = [];
  if (tags.includes("timing_contradiction")) {
    out.push({
      label: "incident timing — charge particulars vs MG5 narrative",
      sourceA: "Charge sheet particulars",
      sourceB: "MG5 narrative",
    });
  }
  if (tags.includes("causation_dispute")) {
    out.push({
      label: "injury mechanism — witness account vs medical summary",
      sourceA: "Witness MG11",
      sourceB: "Medical summary",
    });
  }
  if (tags.includes("identity_dispute")) {
    out.push({
      label: "identification — CCTV still vs witness description",
      sourceA: "CCTV still description",
      sourceB: "Witness MG11",
    });
  }
  if (tags.includes("weapon_provenance_conflict")) {
    out.push({
      label: "weapon provenance — scene log vs exhibit schedule",
      sourceA: "Scene log",
      sourceB: "Exhibit schedule",
    });
  }
  if (tags.includes("phone_device_attribution_dispute")) {
    out.push({
      label: "device attribution — handset notes vs subscriber record",
      sourceA: "Handset seizure notes",
      sourceB: "Subscriber / IMEI material",
    });
  }
  if (tags.includes("corrected_charge_sheet") && out.length === 0) {
    out.push({
      label: "charge wording — original sheet vs corrected sheet",
      sourceA: "Original charge sheet",
      sourceB: "Corrected charge sheet",
    });
  }
  if (out.length === 0 && rng() > 0.7) {
    out.push({
      label: "sequence timing — CAD extract vs officer attendance",
      sourceA: "Partial CAD extract",
      sourceB: "Officer MG11",
    });
  }
  return out.slice(0, 4);
}

function documentInventory(
  tags: FailureModeTag[],
  missing: string[],
): DocumentInventoryItem[] {
  const docs: DocumentInventoryItem[] = [
    { docType: "Cover / index", status: tags.includes("duplicate_noisy_docs") ? "duplicate" : "served" },
    {
      docType: "Charge sheet",
      status: tags.includes("corrected_charge_sheet") ? "partial" : "served",
      notes: tags.includes("corrected_charge_sheet") ? "Corrected sheet on file" : undefined,
    },
    {
      docType: "MG5",
      status: tags.includes("missing_mg5") ? "outstanding" : "partial",
    },
    {
      docType: "MG6",
      status: tags.includes("incomplete_mg6") ? "partial" : "served",
    },
    { docType: "MG11 officer", status: "partial" },
    { docType: "MG11 witness", status: "partial" },
  ];
  if (tags.includes("multi_count")) {
    docs.push({ docType: "Additional count sheet", status: "served" });
  }
  if (tags.includes("multi_defendant")) {
    docs.push({ docType: "Co-defendant MG5", status: "outstanding" });
  }
  for (const m of missing.slice(0, 4)) {
    docs.push({ docType: m, status: "outstanding" });
  }
  return docs;
}

function evidenceStates(missing: string[], contradictions: ContradictionSpec[]): EvidenceState[] {
  const states: EvidenceState[] = missing.map((m) => ({
    category: m,
    state: "outstanding" as const,
  }));
  for (const c of contradictions) {
    states.push({ category: c.label, state: "contradicted" });
  }
  states.push({ category: "MG5 narrative", state: "partial" });
  return states.slice(0, 12);
}

function fingerprintTags(family: OffenceFamily, tags: FailureModeTag[]): string[] {
  return [`family:${family}`, ...tags.map((t) => `tag:${t}`), "source:fictional-corpus"];
}

function expectationsFor(
  template: ReturnType<typeof templateForFamily>,
): StrategyCorpusExpectations {
  return {
    minProofPoints: template.minProofPoints,
    expectedOffenceLens: template.expectedOffenceLens,
    requiresSafeHearingLine: true,
    requiresHumanReviewWhenSerious: template.requiresHumanReviewWhenSerious,
    requiresDisclosureChaseWhenMissing: true,
  };
}

export function offenceFamilyForIndex(index: number): OffenceFamily {
  return OFFENCE_FAMILIES[index % OFFENCE_FAMILIES.length]!;
}

export function generateManifestFromSeed(
  seed: number,
  split: StrategyCorpusSplit,
  materialisationMode: MaterialisationMode = "text-rendered",
): StrategyCorpusManifest {
  const rng = mulberry32(seed);
  const family = offenceFamilyForIndex(seed);
  const template = templateForFamily(family);

  const tagPool = template.compatibleTags.filter((t) => FAILURE_MODE_TAGS.includes(t));
  const tagCount = pickInt(rng, 2, Math.min(5, tagPool.length));
  const failureModeTags = pickMany(rng, tagPool, tagCount);
  if (!failureModeTags.includes("thin_bundle") && rng() > 0.35) {
    failureModeTags.unshift("thin_bundle");
  }

  const chargeWording = pickOne(rng, template.chargeVariants);
  const stage = pickOne(rng, template.stageVariants);
  const defendantCount = failureModeTags.includes("multi_defendant") ? pickInt(rng, 2, 3) : 1;
  const countNumber = failureModeTags.includes("multi_count") ? pickInt(rng, 2, 4) : 1;
  const missingMaterial = missingForTags(failureModeTags, template.defaultMissing);
  const contradictions = contradictionsForTags(failureModeTags, rng);
  const recipeId = buildRecipeId(family, failureModeTags);
  const caseId = `sc-${seed.toString(16).padStart(5, "0")}`;

  return {
    caseId,
    seed,
    recipeId,
    generatorVersion: STRATEGY_CORPUS_GENERATOR_VERSION,
    split,
    splitFrozen: split === "holdout",
    tuneAllowed: split !== "holdout",
    offenceFamily: family,
    stage,
    chargeWording,
    defendantName: defendantName(seed),
    defendantCount,
    countNumber,
    documentInventory: documentInventory(failureModeTags, missingMaterial),
    evidenceStates: evidenceStates(missingMaterial, contradictions),
    missingMaterial,
    contradictions,
    failureModeTags: [...new Set(failureModeTags)],
    fingerprintTags: fingerprintTags(family, failureModeTags),
    materialisationMode,
    expectations: expectationsFor(template),
    fictional: true,
  };
}

export function generateManifestBatch(
  count: number,
  split: StrategyCorpusSplit | "all",
  materialisationMode: MaterialisationMode = "text-rendered",
): StrategyCorpusManifest[] {
  const manifests: StrategyCorpusManifest[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i + 1;
    const assignedSplit =
      split === "all" ? ("discovery" as StrategyCorpusSplit) : split;
    manifests.push(generateManifestFromSeed(seed, assignedSplit, materialisationMode));
  }
  return manifests;
}
