/**
 * Violent Offences Evidence Maps (UK)
 *
 * Offence-aware expected evidence sets for violent offences.
 * This is used to:
 * - generate offence-specific missing evidence (CPIA/continuity driven)
 * - drive procedural integrity and judicial irritation scoring
 *
 * Deterministic: evidence is "expected" based on detected offence candidates + keywords,
 * never asserted as fact. Absence is framed as an evidential/procedural gap to chase.
 */

import type { Severity } from "@/lib/types/casebrain";
import type { DetectedChargeCandidate, DetectedContextTag } from "./detectChargeCandidates";
import type { ViolentOffenceCategory, ViolentOffenceId } from "./violentCharges";

export type EvidenceHolder = "Police" | "CPS" | "ThirdParty" | "Unknown";

export type ViolentEvidenceItem = {
  id: string;
  label: string;
  whyItMatters: string;
  priority: Severity;
  whoUsuallyHoldsIt: EvidenceHolder;
  disclosureHook: string; // plain language OK: CPIA/MG6 etc
  typicalFailureModes: string[];
  detectPatterns: string[];
};

export type ViolentEvidenceMapKey =
  | "knife_violence"
  | "strangulation"
  | "abh_gbh_non_knife"
  | "robbery"
  | "public_order"
  | "weapons_only";

export type OffenceEvidenceProfile = {
  key: ViolentEvidenceMapKey;
  label: string;
  appliesTo: Array<ViolentOffenceId | ViolentOffenceCategory>;
  expectedEvidence: ViolentEvidenceItem[];
};

const COMMON_PROCEDURAL_CORE: ViolentEvidenceItem[] = [
  {
    id: "mg6-schedules",
    label: "Disclosure schedules (MG6A/MG6C) + disclosure management documents",
    whyItMatters:
      "Disclosure is often the pressure point in serious violence cases. Missing or incomplete schedules undermine case management and can trigger judicial intervention.",
    priority: "CRITICAL",
    whoUsuallyHoldsIt: "CPS",
    disclosureHook: "CPIA disclosure: MG6 schedules (unused material) and disclosure reviews",
    typicalFailureModes: ["late", "partial", "no schedule produced", "wrong time window", "no audit trail"],
    detectPatterns: ["mg6", "mg6a", "mg6c", "mg6d", "disclosure schedule", "unused material"],
  },
  {
    id: "custody-record",
    label: "Custody record (PACE) incl. reviews + legal advice log",
    whyItMatters:
      "PACE compliance and contemporaneous custody documentation can affect admissibility and fairness arguments.",
    priority: "CRITICAL",
    whoUsuallyHoldsIt: "Police",
    disclosureHook: "PACE/CPIA: custody record is routinely disclosable and relevant to procedural integrity",
    typicalFailureModes: ["missing pages", "late production", "redactions without explanation", "no legal advice record"],
    detectPatterns: ["custody record", "pace", "detention", "custody review", "legal advice"],
  },
  {
    id: "interview-recording-transcript",
    label: "Interview recording(s) + transcript / log (PACE)",
    whyItMatters:
      "Recording integrity and access to transcript/log is essential for accuracy and admissibility arguments.",
    priority: "HIGH",
    whoUsuallyHoldsIt: "Police",
    disclosureHook: "PACE/CPIA: interview records and tapes/recordings",
    typicalFailureModes: ["lost", "partial", "poor audio", "no transcript", "late disclosure"],
    detectPatterns: ["interview recording", "audio interview", "video interview", "tape", "transcript"],
  },
];

const KNIFE_VIOLENCE: OffenceEvidenceProfile = {
  key: "knife_violence",
  label: "Stabbing / knife violence",
  appliesTo: ["gbh_s20", "gbh_s18_intent", "possession_bladed_article", "threatening_with_weapon_or_blade"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "cctv-native-export",
      label: "CCTV (full time window) + native/original export + exhibit continuity",
      whyItMatters:
        "Video integrity and continuity are routinely contested. Native export and continuity logs reduce disputes about editing, timestamps, and missing segments.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: disclose primary footage + continuity/audit trail where relevant",
      typicalFailureModes: ["wrong time window", "edited clip only", "exported as screen recording", "missing continuity log", "poor quality copy"],
      detectPatterns: ["cctv", "footage", "camera", "export", "native", "dvr", "nvr", "continuity"],
    },
    {
      id: "bwv-attending-officers",
      label: "Body-worn video (BWV) from attending officers (full)",
      whyItMatters:
        "BWV often captures first accounts, demeanour, injury presentation, and scene context. Missing BWV is frequently a case-management friction point.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: BWV is potentially relevant unused/used material",
      typicalFailureModes: ["not downloaded", "partial", "no audio", "late", "missing early attendance"],
      detectPatterns: ["bwv", "body worn", "body-worn", "bodycam", "body cam"],
    },
    {
      id: "999-audio-cad",
      label: "999 audio + CAD log / incident log",
      whyItMatters:
        "First report timing and content matters for identification, urgency, and consistency. CAD helps anchor timings and call taker prompts.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: call recordings and CAD logs (time-critical events)",
      typicalFailureModes: ["wrong call", "partial audio", "no CAD entries", "late production"],
      detectPatterns: ["999", "999 audio", "call recording", "cad", "computer aided dispatch"],
    },
    {
      id: "scene-photos-seizure",
      label: "Scene photos / sketch + seizure logs + weapon search logs",
      whyItMatters:
        "Supports continuity, location, and the plausibility of accounts. Weapon search logs matter where weapon recovery is disputed.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: scene exhibits and logs",
      typicalFailureModes: ["missing photos", "no exhibit numbers", "no search log", "poor chain of custody"],
      detectPatterns: ["scene photo", "scene photographs", "sketch", "seizure log", "search log", "exhibit"],
    },
    {
      id: "forensics-dna-blood",
      label: "Forensic reports (DNA/blood) + clothing seizure logs",
      whyItMatters:
        "Forensics can confirm handling/contact and challenge identification narratives. Clothing seizure logs anchor continuity and contamination risk.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: forensic reports and exhibit continuity",
      typicalFailureModes: ["no continuity", "samples contaminated", "partial testing", "late report"],
      detectPatterns: ["dna", "blood", "forensic", "swab", "lab report", "clothing seized"],
    },
    {
      id: "medical-summary-seriousness",
      label: "Medical records / clinical summary (injury seriousness + causation)",
      whyItMatters:
        "Injury seriousness and causation are central to s.20/s.18. Medical notes can also undermine or support timelines and mechanism.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "ThirdParty",
      disclosureHook: "Medical disclosure (A&E/GP) often needed for seriousness/causation",
      typicalFailureModes: ["partial extract", "missing imaging notes", "no time stamps", "late request"],
      detectPatterns: ["a&e", "hospital", "medical", "clinical summary", "discharge", "surgery", "fracture"],
    },
  ],
};

const STRANGULATION: OffenceEvidenceProfile = {
  key: "strangulation",
  label: "Strangulation / suffocation",
  appliesTo: ["non_fatal_strangulation"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "bwv-dv-callout",
      label: "BWV (domestic callout) + full attendance footage",
      whyItMatters:
        "First accounts, demeanour, scene condition, and immediate injury presentation are often pivotal. BWV gaps raise obvious questions.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: BWV and call logs where relevant",
      typicalFailureModes: ["not downloaded", "partial", "late", "missing early account"],
      detectPatterns: ["bwv", "body worn", "bodycam", "domestic", "callout"],
    },
    {
      id: "999-audio-cad",
      label: "999 audio + CAD log",
      whyItMatters:
        "Anchors first disclosure account and timing; often used to test consistency and urgency.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: call recordings and CAD logs",
      typicalFailureModes: ["wrong call", "partial", "late"],
      detectPatterns: ["999", "call recording", "cad", "computer aided dispatch"],
    },
    {
      id: "medical-exam-strangulation",
      label: "Medical exam notes (voice change, neck pain, swallowing pain, petechiae) + time-stamped injury photos",
      whyItMatters:
        "Clinical signs and timing are central to proof/disproof. Photos/time-stamps and contemporaneous notes matter more than later descriptions.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "ThirdParty",
      disclosureHook: "Medical disclosure; relevance to injury and causation",
      typicalFailureModes: ["no photos", "late exam", "notes lack time stamps", "incomplete symptom documentation"],
      detectPatterns: ["voice change", "petechiae", "neck pain", "swallowing", "strangle", "choke", "bruise", "photo"],
    },
    {
      id: "first-account-consistency",
      label: "First account(s) + subsequent statement(s) (consistency trail)",
      whyItMatters:
        "Consistency is often the battleground: first disclosure vs later elaboration. The defence/prosecution both need the full trail.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: witness statements and initial accounts",
      typicalFailureModes: ["missing first account", "partial statements", "late addendum"],
      detectPatterns: ["first account", "initial account", "statement", "addendum", "mg11"],
    },
    {
      id: "digital-messages-calls",
      label: "Digital messages / call logs (if relied upon)",
      whyItMatters:
        "Context and intent can hinge on communications. If alleged threats exist, the native extracts matter.",
      priority: "MEDIUM",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: digital downloads where relevant",
      typicalFailureModes: ["partial extraction", "missing time window", "screenshots only"],
      detectPatterns: ["messages", "whatsapp", "sms", "call log", "phone download"],
    },
  ],
};

const ABH_GBH_NON_KNIFE: OffenceEvidenceProfile = {
  key: "abh_gbh_non_knife",
  label: "ABH / GBH (non-knife)",
  appliesTo: ["abh_s47", "gbh_s20", "gbh_s18_intent", "common_assault_battery"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "medical-records-injury-photos",
      label: "Medical records + injury photos (time-stamped where possible)",
      whyItMatters:
        "Injury severity and causation are central and can be overstated/understated without contemporaneous medical evidence.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "ThirdParty",
      disclosureHook: "Medical disclosure; relevance to injury/cause",
      typicalFailureModes: ["late request", "partial records", "no photos", "no time stamps"],
      detectPatterns: ["medical", "a&e", "hospital", "photos", "injury", "bruise", "fracture"],
    },
    {
      id: "cctv-bwv-if-public",
      label: "CCTV/BWV (if public setting) across the full time window",
      whyItMatters:
        "Visual evidence often resolves identification and self-defence plausibility. Clips without the lead-in/out are a known failure mode.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: CCTV/BWV as used/unused material",
      typicalFailureModes: ["clip only", "wrong time window", "poor export", "missing continuity"],
      detectPatterns: ["cctv", "footage", "bwv", "body worn", "camera"],
    },
    {
      id: "witness-statements-first-accounts",
      label: "Witness statements + first account trail",
      whyItMatters:
        "Credibility and consistency are frequently decisive in violence cases. First accounts matter.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: witness statements / MG11 where relevant",
      typicalFailureModes: ["missing first account", "late addendum", "hearsay-only summaries"],
      detectPatterns: ["witness statement", "mg11", "statement", "first account"],
    },
  ],
};

const ROBBERY: OffenceEvidenceProfile = {
  key: "robbery",
  label: "Robbery / violent theft",
  appliesTo: ["robbery_violent_theft"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "id-evidence-cctv-stills",
      label: "Identification evidence (CCTV full + stills) + continuity",
      whyItMatters:
        "Identification disputes are common. Stills without the underlying footage/continuity are weak and create challenge points.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: identification evidence and continuity",
      typicalFailureModes: ["stills only", "edited montage", "missing time window", "no continuity"],
      detectPatterns: ["cctv", "stills", "identification", "id procedure", "video"],
    },
    {
      id: "phone-download-location",
      label: "Phone download / location evidence (if relied upon) + extraction notes",
      whyItMatters:
        "Location can corroborate or undermine identification/alibi narratives. Native extraction matters more than screenshots.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: digital downloads where relied upon",
      typicalFailureModes: ["partial extraction", "no extraction notes", "wrong time window"],
      detectPatterns: ["phone download", "cellebrite", "location", "gps", "cell site", "call data"],
    },
    {
      id: "property-recovery-chain",
      label: "Property recovery chain (exhibit continuity) + recovery statements",
      whyItMatters:
        "Continuity and recovery narrative often decide whether recovery supports guilt or alternative explanation.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: exhibits and continuity",
      typicalFailureModes: ["no exhibit numbers", "missing recovery statement", "continuity gaps"],
      detectPatterns: ["recovered", "property", "exhibit", "continuity", "seized"],
    },
  ],
};

const PUBLIC_ORDER: OffenceEvidenceProfile = {
  key: "public_order",
  label: "Public order violence (affray / violent disorder)",
  appliesTo: ["affray", "violent_disorder"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "multi-angle-cctv-bwv",
      label: "CCTV/BWV across angles + crowd identification methodology notes",
      whyItMatters:
        "Public order cases often turn on identification methodology. Missing notes or footage gaps can be decisive at case management.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: large unused material sets are common; MG6 schedules matter",
      typicalFailureModes: ["missing angles", "no ID methodology", "partial downloads", "late disclosure"],
      detectPatterns: ["cctv", "bwv", "body worn", "identification", "crowd"],
    },
    {
      id: "unused-material-scope",
      label: "Unused material scope summary (what exists, retention window, search terms)",
      whyItMatters:
        "Bench impatience rises when unused material is unmanaged. A clear scope statement reduces friction and forces accountability.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "CPS",
      disclosureHook: "CPIA: unused material management",
      typicalFailureModes: ["no schedule", "search not done", "unclear retention", "late production"],
      detectPatterns: ["unused material", "mg6", "disclosure", "schedule", "retention", "search terms"],
    },
  ],
};

const WEAPONS_ONLY: OffenceEvidenceProfile = {
  key: "weapons_only",
  label: "Weapons possession / threatening with weapon",
  appliesTo: ["possession_bladed_article", "possession_offensive_weapon", "threatening_with_weapon_or_blade"],
  expectedEvidence: [
    ...COMMON_PROCEDURAL_CORE,
    {
      id: "seizure-search-logs",
      label: "Seizure logs + search authority notes + exhibit continuity (weapon)",
      whyItMatters:
        "Possession offences are continuity-heavy. Search authority and seizure logging often decide admissibility and credibility.",
      priority: "CRITICAL",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "PACE/CPIA: search/seizure and exhibit logs",
      typicalFailureModes: ["missing authority", "no exhibit label", "continuity gap", "late disclosure"],
      detectPatterns: ["seizure", "search", "stop and search", "authority", "exhibit", "continuity"],
    },
    {
      id: "weapon-photos-measurements",
      label: "Weapon photos + measurements + packaging/label details",
      whyItMatters:
        "Blade length/description and packaging detail often matters to charge selection and factual dispute resolution.",
      priority: "HIGH",
      whoUsuallyHoldsIt: "Police",
      disclosureHook: "CPIA: exhibit description and photos",
      typicalFailureModes: ["no measurements", "poor photos", "no packaging record"],
      detectPatterns: ["blade length", "measure", "photo", "packaging", "sealed"],
    },
  ],
};

export const VIOLENT_EVIDENCE_PROFILES: OffenceEvidenceProfile[] = [
  KNIFE_VIOLENCE,
  STRANGULATION,
  ABH_GBH_NON_KNIFE,
  ROBBERY,
  PUBLIC_ORDER,
  WEAPONS_ONLY,
];

export type SelectedEvidenceProfile = {
  profiles: Array<{ key: ViolentEvidenceMapKey; label: string; whySelected: string[] }>;
  expectedEvidence: ViolentEvidenceItem[];
};

/**
 * Select offence-aware evidence sets based on detected charge candidates and context tags.
 */
export function selectViolentEvidenceProfiles(params: {
  candidates: DetectedChargeCandidate[];
  contextTags: DetectedContextTag[];
}): SelectedEvidenceProfile {
  const { candidates, contextTags } = params;
  const byId = new Set(candidates.filter((c) => c.confidence >= 0.35).map((c) => c.chargeId));
  const byCategory = new Set(candidates.filter((c) => c.confidence >= 0.6).map((c) => c.category));

  const selected: SelectedEvidenceProfile["profiles"] = [];
  const evidence = new Map<string, ViolentEvidenceItem>();

  for (const profile of VIOLENT_EVIDENCE_PROFILES) {
    const applies = profile.appliesTo.some((a) => (typeof a === "string" ? byId.has(a as ViolentOffenceId) : byCategory.has(a as ViolentOffenceCategory)));
    if (!applies) continue;

    const why: string[] = [];
    const hitIds = candidates.filter((c) => profile.appliesTo.includes(c.chargeId) && c.confidence >= 0.35);
    if (hitIds.length > 0) {
      why.push(...hitIds.slice(0, 2).map((c) => `Charge candidate: ${c.label} (${Math.round(c.confidence * 100)}%)`));
    } else {
      // category-level selection
      const catHits = candidates.filter((c) => (profile.appliesTo as string[]).includes(c.category) && c.confidence >= 0.6);
      why.push(...catHits.slice(0, 2).map((c) => `Category signal: ${c.category} via ${c.label}`));
    }

    // Context-based escalator (DV for strangulation)
    if (profile.key === "strangulation" && contextTags.some((t) => t.tag === "domestic_context" && t.confidence >= 0.45)) {
      why.push("Context: domestic abuse markers detected");
    }

    selected.push({ key: profile.key, label: profile.label, whySelected: why.length > 0 ? why : ["Selected by offence profile match"] });
    for (const item of profile.expectedEvidence) {
      evidence.set(item.id, item);
    }
  }

  // If nothing selected but we have candidates, fall back to core procedural set
  if (selected.length === 0 && candidates.length > 0) {
    selected.push({
      key: "abh_gbh_non_knife",
      label: "Core violence bundle (fallback)",
      whySelected: ["No specific offence profile matched confidently; using core procedural + injury bundle."],
    });
    for (const item of ABH_GBH_NON_KNIFE.expectedEvidence) {
      evidence.set(item.id, item);
    }
  }

  // If still nothing selected (no candidates), default to core procedural set for criminal case management
  if (selected.length === 0) {
    selected.push({
      key: "abh_gbh_non_knife",
      label: "Core procedural bundle (default)",
      whySelected: ["No specific violent offence signals detected yet; defaulting to core PACE/CPIA/disclosure bundle until bundle clarifies offence type."],
    });
    for (const item of COMMON_PROCEDURAL_CORE) {
      evidence.set(item.id, item);
    }
  }

  return {
    profiles: selected,
    expectedEvidence: Array.from(evidence.values()),
  };
}


