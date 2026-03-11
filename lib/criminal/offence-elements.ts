/**
 * Offence Elements Library
 *
 * Deterministic offence detection and element mapping for all criminal case types.
 * No predictions — only canonical element definitions.
 */

export type OffenceCode =
  // Violence / assault
  | "s18_oapa"
  | "s20_oapa"
  | "s47_oapa"
  | "common_assault"
  | "assault_resist_arrest"
  | "affray"
  | "violent_disorder"
  | "riot"
  | "harassment"
  | "stalking"
  | "coercive_control"
  | "threat_to_kill"
  | "attempted_murder"
  | "murder"
  | "manslaughter"
  // Theft / property
  | "theft"
  | "burglary"
  | "robbery"
  | "handling_stolen_goods"
  | "going_equipped"
  | "twoc"
  | "agg_vehicle_taking"
  | "blackmail"
  | "making_off_without_payment"
  // Damage
  | "criminal_damage_arson"
  | "agg_criminal_damage"
  // Fraud / dishonesty
  | "fraud"
  | "false_accounting"
  | "money_laundering"
  | "bribery"
  // Drugs
  | "drug_possession"
  | "drug_pwits"
  | "drug_supply"
  | "drug_production"
  // Public order
  | "poa_s5"
  | "poa_s4"
  | "obstruction"
  | "resisting_arrest"
  | "assault_emergency_worker"
  | "perverting_justice"
  | "perjury"
  // Sexual
  | "rape"
  | "assault_by_penetration"
  | "sexual_assault"
  | "indecent_images"
  | "exposure"
  | "voyeurism"
  // Road traffic
  | "dangerous_driving"
  | "careless_driving"
  | "drink_drive"
  | "fail_to_provide"
  | "drive_disqualified"
  | "fail_to_stop"
  | "death_by_dangerous"
  | "death_by_careless"
  // Weapons
  | "offensive_weapon"
  | "bladed_article"
  | "firearm"
  // Other
  | "breach_restraining_order"
  | "breach_bail"
  | "benefit_fraud"
  | "unknown";

export type OffenceElement = { id: string; label: string };

export type OffenceDef = {
  code: OffenceCode;
  label: string;
  elements: OffenceElement[];
};

const OFFENCE_DEFS: Record<Exclude<OffenceCode, "unknown">, { label: string; elements: OffenceElement[] }> = {
  s18_oapa: {
    label: "s.18 OAPA 1861 - Wounding with Intent / GBH with Intent",
    elements: [
      { id: "injury_threshold", label: "Injury Threshold (Wound/GBH)" },
      { id: "causation", label: "Causation" },
      { id: "unlawfulness", label: "Unlawfulness" },
      { id: "identification", label: "Identification" },
      { id: "specific_intent", label: "Specific Intent (s18)" },
    ],
  },
  s20_oapa: {
    label: "s.20 OAPA 1861 - Unlawful Wounding / Inflicting GBH",
    elements: [
      { id: "injury_threshold", label: "Injury Threshold (Wound/GBH)" },
      { id: "causation", label: "Causation" },
      { id: "unlawfulness", label: "Unlawfulness" },
      { id: "identification", label: "Identification" },
      { id: "recklessness", label: "Recklessness (s20)" },
    ],
  },
  s47_oapa: {
    label: "s.47 OAPA 1861 - Assault occasioning ABH",
    elements: [
      { id: "assault_or_battery", label: "Assault or battery" },
      { id: "actual_bodily_harm", label: "Actual bodily harm" },
      { id: "causation", label: "Causation" },
      { id: "identification", label: "Identification" },
    ],
  },
  common_assault: {
    label: "Common assault / Battery (s.39 CJA 1988)",
    elements: [
      { id: "assault_or_battery", label: "Assault or battery" },
      { id: "identification", label: "Identification" },
    ],
  },
  assault_resist_arrest: {
    label: "Assault with intent to resist arrest (s.38 OAPA 1861)",
    elements: [
      { id: "assault", label: "Assault" },
      { id: "intent_to_resist", label: "Intent to resist arrest" },
      { id: "identification", label: "Identification" },
    ],
  },
  affray: {
    label: "Affray (s.3 Public Order Act 1986)",
    elements: [
      { id: "unlawful_violence", label: "Unlawful violence towards another" },
      { id: "conduct", label: "Conduct such as would cause person of reasonable firmness to fear for safety" },
      { id: "identification", label: "Identification" },
    ],
  },
  violent_disorder: {
    label: "Violent disorder (s.2 Public Order Act 1986)",
    elements: [
      { id: "three_or_more", label: "3+ persons present" },
      { id: "unlawful_violence", label: "Unlawful violence" },
      { id: "identification", label: "Identification" },
    ],
  },
  riot: {
    label: "Riot (s.1 Public Order Act 1986)",
    elements: [
      { id: "twelve_or_more", label: "12+ persons" },
      { id: "common_purpose", label: "Common purpose of violence" },
      { id: "identification", label: "Identification" },
    ],
  },
  harassment: {
    label: "Harassment (s.2/4 Protection from Harassment Act 1997)",
    elements: [
      { id: "course_of_conduct", label: "Course of conduct" },
      { id: "harassment", label: "Harassment / fear of violence" },
      { id: "identification", label: "Identification" },
    ],
  },
  stalking: {
    label: "Stalking (s.2A PHA 1997)",
    elements: [
      { id: "course_of_conduct", label: "Course of conduct" },
      { id: "stalking", label: "Stalking (associated with harassment)" },
      { id: "identification", label: "Identification" },
    ],
  },
  coercive_control: {
    label: "Controlling or coercive behaviour (s.76 Serious Crime Act 2015)",
    elements: [
      { id: "repeated_conduct", label: "Repeated or continuous behaviour" },
      { id: "controlling_or_coercive", label: "Controlling or coercive" },
      { id: "serious_effect", label: "Serious effect on victim" },
      { id: "identification", label: "Identification" },
    ],
  },
  threat_to_kill: {
    label: "Threat to kill (s.16 OAPA 1861)",
    elements: [
      { id: "threat", label: "Threat to kill" },
      { id: "intent", label: "Intent that fear would be caused" },
      { id: "identification", label: "Identification" },
    ],
  },
  attempted_murder: {
    label: "Attempted murder (s.1 Criminal Attempts Act 1981)",
    elements: [
      { id: "intent_to_kill", label: "Intent to kill" },
      { id: "act_more_than_preparatory", label: "Act more than merely preparatory" },
      { id: "identification", label: "Identification" },
    ],
  },
  murder: {
    label: "Murder (common law)",
    elements: [
      { id: "unlawful_killing", label: "Unlawful killing" },
      { id: "malice_aforethought", label: "Malice aforethought (intent to kill or cause GBH)" },
      { id: "identification", label: "Identification" },
    ],
  },
  manslaughter: {
    label: "Manslaughter (common law)",
    elements: [
      { id: "unlawful_killing", label: "Unlawful killing" },
      { id: "mens_rea", label: "Recklessness or unlawful act" },
      { id: "identification", label: "Identification" },
    ],
  },
  theft: {
    label: "Theft (s.1 Theft Act 1968)",
    elements: [
      { id: "appropriation", label: "Appropriation" },
      { id: "property_belonging_to_another", label: "Property belonging to another" },
      { id: "dishonesty", label: "Dishonesty" },
      { id: "intention_to_permanently_deprive", label: "Intention to permanently deprive" },
      { id: "identification", label: "Identification" },
    ],
  },
  burglary: {
    label: "Burglary (s.9 Theft Act 1968)",
    elements: [
      { id: "entry", label: "Entry as trespasser" },
      { id: "building_or_part", label: "Building or part of a building" },
      { id: "intent_or_ulterior", label: "Intent to steal/damage/commit GBH or ulterior offence" },
      { id: "identification", label: "Identification" },
    ],
  },
  robbery: {
    label: "Robbery (s.8 Theft Act 1968)",
    elements: [
      { id: "theft", label: "Theft (all elements)" },
      { id: "force_or_threat", label: "Force or threat of force" },
      { id: "timing", label: "Immediately before or at the time of theft" },
      { id: "identification", label: "Identification" },
    ],
  },
  handling_stolen_goods: {
    label: "Handling stolen goods (s.22 Theft Act 1968)",
    elements: [
      { id: "receiving_or_undertaking", label: "Receiving or undertaking retention/removal/disposal" },
      { id: "stolen_goods", label: "Goods stolen" },
      { id: "dishonesty", label: "Dishonesty" },
      { id: "knowledge_or_belief", label: "Knowledge or belief that goods stolen" },
      { id: "identification", label: "Identification" },
    ],
  },
  going_equipped: {
    label: "Going equipped to steal (s.25 Theft Act 1968)",
    elements: [
      { id: "away_from_place", label: "Away from place of abode" },
      { id: "possession", label: "Possession of article for use in course of or in connection with theft/burglary" },
      { id: "identification", label: "Identification" },
    ],
  },
  twoc: {
    label: "Taking a conveyance without authority (s.12 Theft Act 1968)",
    elements: [
      { id: "taking", label: "Taking conveyance" },
      { id: "without_authority", label: "Without consent of owner or lawful authority" },
      { id: "identification", label: "Identification" },
    ],
  },
  agg_vehicle_taking: {
    label: "Aggravated vehicle-taking (s.12A Theft Act 1968)",
    elements: [
      { id: "twoc", label: "Taking conveyance without authority" },
      { id: "dangerous_driving_or_damage_or_injury", label: "Dangerous driving / damage / injury" },
      { id: "identification", label: "Identification" },
    ],
  },
  blackmail: {
    label: "Blackmail (s.21 Theft Act 1968)",
    elements: [
      { id: "unwarranted_demand", label: "Unwarranted demand with menaces" },
      { id: "view_to_gain_or_cause_loss", label: "View to gain or cause loss" },
      { id: "identification", label: "Identification" },
    ],
  },
  making_off_without_payment: {
    label: "Making off without payment (s.3 Theft Act 1978)",
    elements: [
      { id: "knowledge", label: "Knowledge that payment required on the spot" },
      { id: "dishonesty", label: "Dishonesty" },
      { id: "intent_to_avoid_payment", label: "Intent to avoid payment" },
      { id: "identification", label: "Identification" },
    ],
  },
  criminal_damage_arson: {
    label: "Criminal damage / Arson (s.1(1) CDA 1971)",
    elements: [
      { id: "property_belonging_to_another", label: "Property belonging to another" },
      { id: "damage_by_fire", label: "Damage/Destruction by fire" },
      { id: "intent_or_recklessness", label: "Intent or recklessness" },
      { id: "lawful_excuse", label: "Lawful excuse (s.5 CDA)" },
      { id: "identification", label: "Identification" },
    ],
  },
  agg_criminal_damage: {
    label: "Aggravated criminal damage (s.1(2) CDA 1971)",
    elements: [
      { id: "damage", label: "Damage/destruction of property" },
      { id: "intent_or_recklessness", label: "Intent or recklessness" },
      { id: "endangerment", label: "Endangerment of life" },
      { id: "identification", label: "Identification" },
    ],
  },
  fraud: {
    label: "Fraud (Fraud Act 2006)",
    elements: [
      { id: "dishonesty", label: "Dishonesty" },
      { id: "representation_or_disclosure_or_abuse", label: "False representation / failure to disclose / abuse of position" },
      { id: "gain_or_loss", label: "Gain or loss (or intent)" },
      { id: "identification", label: "Identification" },
    ],
  },
  false_accounting: {
    label: "False accounting (s.17 Theft Act 1968)",
    elements: [
      { id: "dishonesty", label: "Dishonesty" },
      { id: "false_document_or_record", label: "False document or record" },
      { id: "intent", label: "Intent to gain/cause loss" },
      { id: "identification", label: "Identification" },
    ],
  },
  money_laundering: {
    label: "Money laundering (POCA 2002)",
    elements: [
      { id: "criminal_property", label: "Criminal property" },
      { id: "concealing_or_use", label: "Concealing / disguising / use / possession" },
      { id: "knowledge_or_suspicion", label: "Knowledge or suspicion" },
      { id: "identification", label: "Identification" },
    ],
  },
  bribery: {
    label: "Bribery (Bribery Act 2010)",
    elements: [
      { id: "offering_or_accepting", label: "Offering/accepting/requesting advantage" },
      { id: "improper_performance", label: "Improper performance of function" },
      { id: "identification", label: "Identification" },
    ],
  },
  drug_possession: {
    label: "Possession of controlled drug (s.5(2) MDA 1971)",
    elements: [
      { id: "possession", label: "Possession" },
      { id: "controlled_drug", label: "Controlled drug" },
      { id: "identification", label: "Identification" },
    ],
  },
  drug_pwits: {
    label: "Possession with intent to supply (s.5(3) MDA 1971)",
    elements: [
      { id: "possession", label: "Possession" },
      { id: "controlled_drug", label: "Controlled drug" },
      { id: "intent_to_supply", label: "Intent to supply" },
      { id: "identification", label: "Identification" },
    ],
  },
  drug_supply: {
    label: "Supply / offering to supply (s.4(1) MDA 1971)",
    elements: [
      { id: "supply_or_offer", label: "Supply or offer to supply" },
      { id: "controlled_drug", label: "Controlled drug" },
      { id: "identification", label: "Identification" },
    ],
  },
  drug_production: {
    label: "Production / cultivation (s.4(2)/6 MDA 1971)",
    elements: [
      { id: "production_or_cultivation", label: "Production or cultivation" },
      { id: "controlled_drug", label: "Controlled drug" },
      { id: "identification", label: "Identification" },
    ],
  },
  poa_s5: {
    label: "Disorderly behaviour (s.5 Public Order Act 1986)",
    elements: [
      { id: "disorderly_conduct", label: "Disorderly / threatening / abusive conduct" },
      { id: "within_hearing_or_sight", label: "Within hearing or sight of person likely to be harassed/alarmed/distressed" },
      { id: "identification", label: "Identification" },
    ],
  },
  poa_s4: {
    label: "Fear or provocation of violence (s.4 POA 1986)",
    elements: [
      { id: "threatening_abusive_insulting", label: "Threatening / abusive / insulting words or behaviour" },
      { id: "intent_or_likely", label: "Intent or likelihood to cause fear or provoke violence" },
      { id: "identification", label: "Identification" },
    ],
  },
  obstruction: {
    label: "Obstruction of constable (s.89(2) Police Act 1996)",
    elements: [
      { id: "obstruction", label: "Obstruction of constable" },
      { id: "in_execution_of_duty", label: "Constable in execution of duty" },
      { id: "identification", label: "Identification" },
    ],
  },
  resisting_arrest: {
    label: "Resisting arrest (common law / Police Act 1996)",
    elements: [
      { id: "resistance", label: "Resistance to arrest" },
      { id: "lawful_arrest", label: "Arrest was lawful" },
      { id: "identification", label: "Identification" },
    ],
  },
  assault_emergency_worker: {
    label: "Assault on emergency worker (s.1 Assaults on Emergency Workers (Offences) Act 2018)",
    elements: [
      { id: "assault", label: "Assault" },
      { id: "emergency_worker", label: "Victim was emergency worker acting in exercise of functions" },
      { id: "identification", label: "Identification" },
    ],
  },
  perverting_justice: {
    label: "Perverting the course of justice (common law)",
    elements: [
      { id: "conduct", label: "Conduct tending to pervert" },
      { id: "course_of_justice", label: "Course of public justice" },
      { id: "intent", label: "Intent to pervert" },
      { id: "identification", label: "Identification" },
    ],
  },
  perjury: {
    label: "Perjury (s.1 Perjury Act 1911)",
    elements: [
      { id: "lawful_oath", label: "Lawful oath" },
      { id: "false_statement", label: "False statement" },
      { id: "knowledge_of_falsity", label: "Knowledge of falsity" },
      { id: "identification", label: "Identification" },
    ],
  },
  rape: {
    label: "Rape (s.1 Sexual Offences Act 2003)",
    elements: [
      { id: "penetration", label: "Penetration with penis" },
      { id: "no_consent", label: "Absence of consent" },
      { id: "no_reasonable_belief_in_consent", label: "No reasonable belief in consent" },
      { id: "identification", label: "Identification" },
    ],
  },
  assault_by_penetration: {
    label: "Assault by penetration (s.2 SOA 2003)",
    elements: [
      { id: "penetration", label: "Penetration" },
      { id: "no_consent", label: "Absence of consent" },
      { id: "no_reasonable_belief", label: "No reasonable belief in consent" },
      { id: "identification", label: "Identification" },
    ],
  },
  sexual_assault: {
    label: "Sexual assault (s.3 SOA 2003)",
    elements: [
      { id: "sexual_touching", label: "Sexual touching" },
      { id: "no_consent", label: "Absence of consent" },
      { id: "no_reasonable_belief", label: "No reasonable belief in consent" },
      { id: "identification", label: "Identification" },
    ],
  },
  indecent_images: {
    label: "Possession of indecent images (s.160 CJA 1988 / PCA 1978)",
    elements: [
      { id: "possession", label: "Possession" },
      { id: "indecent_image", label: "Indecent photograph/pseudo-photograph of child" },
      { id: "identification", label: "Identification" },
    ],
  },
  exposure: {
    label: "Exposure (s.66 SOA 2003)",
    elements: [
      { id: "intentional_exposure", label: "Intentional exposure" },
      { id: "intent_to_cause_alarm_distress", label: "Intent that someone would see and be caused alarm or distress" },
      { id: "identification", label: "Identification" },
    ],
  },
  voyeurism: {
    label: "Voyeurism (s.67 SOA 2003)",
    elements: [
      { id: "observation_or_record", label: "Observation or recording of private act" },
      { id: "no_consent", label: "Without consent" },
      { id: "identification", label: "Identification" },
    ],
  },
  dangerous_driving: {
    label: "Dangerous driving (s.2 RTA 1988)",
    elements: [
      { id: "driving", label: "Driving" },
      { id: "dangerous", label: "Dangerous to public or to property" },
      { id: "identification", label: "Identification" },
    ],
  },
  careless_driving: {
    label: "Careless / inconsiderate driving (s.3 RTA 1988)",
    elements: [
      { id: "driving", label: "Driving" },
      { id: "careless_or_inconsiderate", label: "Careless or inconsiderate" },
      { id: "identification", label: "Identification" },
    ],
  },
  drink_drive: {
    label: "Driving under influence of drink/drugs (ss.4–5A RTA 1988)",
    elements: [
      { id: "driving_or_in_charge", label: "Driving or in charge" },
      { id: "over_limit_or_impaired", label: "Over prescribed limit or unfit through drink/drugs" },
      { id: "identification", label: "Identification" },
    ],
  },
  fail_to_provide: {
    label: "Failing to provide specimen (s.7 RTA 1988)",
    elements: [
      { id: "requirement", label: "Lawful requirement to provide specimen" },
      { id: "failure", label: "Failure without reasonable excuse" },
      { id: "identification", label: "Identification" },
    ],
  },
  drive_disqualified: {
    label: "Driving while disqualified (s.103 RTA 1988)",
    elements: [
      { id: "driving", label: "Driving" },
      { id: "disqualified", label: "Disqualified from holding licence" },
      { id: "identification", label: "Identification" },
    ],
  },
  fail_to_stop: {
    label: "Failing to stop / report (s.170 RTA 1988)",
    elements: [
      { id: "accident", label: "Accident involving injury or damage" },
      { id: "failure_to_stop_or_report", label: "Failure to stop or report" },
      { id: "identification", label: "Identification" },
    ],
  },
  death_by_dangerous: {
    label: "Causing death by dangerous driving (s.1 RTA 1988)",
    elements: [
      { id: "dangerous_driving", label: "Dangerous driving" },
      { id: "death", label: "Death caused" },
      { id: "causation", label: "Causation" },
      { id: "identification", label: "Identification" },
    ],
  },
  death_by_careless: {
    label: "Causing death by careless driving (s.2B RTA 1988)",
    elements: [
      { id: "careless_driving", label: "Careless or inconsiderate driving" },
      { id: "death", label: "Death caused" },
      { id: "causation", label: "Causation" },
      { id: "identification", label: "Identification" },
    ],
  },
  offensive_weapon: {
    label: "Possession of offensive weapon (s.1 PCA 1953)",
    elements: [
      { id: "possession", label: "Possession in public place" },
      { id: "offensive_weapon", label: "Offensive weapon" },
      { id: "identification", label: "Identification" },
    ],
  },
  bladed_article: {
    label: "Possession of bladed article (s.139 CJA 1988)",
    elements: [
      { id: "possession", label: "Possession in public place" },
      { id: "bladed_article", label: "Article with blade or sharply pointed" },
      { id: "no_good_reason", label: "No good reason or lawful authority" },
      { id: "identification", label: "Identification" },
    ],
  },
  firearm: {
    label: "Possession of firearm without certificate (Firearms Act 1968)",
    elements: [
      { id: "possession", label: "Possession" },
      { id: "firearm", label: "Firearm" },
      { id: "no_certificate_or_authority", label: "Without certificate or authority" },
      { id: "identification", label: "Identification" },
    ],
  },
  breach_restraining_order: {
    label: "Breach of restraining order (s.5(5) PHA 1997)",
    elements: [
      { id: "order", label: "Restraining order in force" },
      { id: "breach", label: "Breach without reasonable excuse" },
      { id: "identification", label: "Identification" },
    ],
  },
  breach_bail: {
    label: "Breach of bail / failing to surrender (Bail Act 1976)",
    elements: [
      { id: "bail", label: "Granted bail" },
      { id: "failure_to_surrender", label: "Failure to surrender without reasonable cause" },
      { id: "identification", label: "Identification" },
    ],
  },
  benefit_fraud: {
    label: "Benefit fraud (SSAA 1992 / Fraud Act 2006)",
    elements: [
      { id: "dishonesty", label: "Dishonesty" },
      { id: "representation_or_failure", label: "False representation or failure to disclose" },
      { id: "benefit", label: "Benefit obtained or risked" },
      { id: "identification", label: "Identification" },
    ],
  },
};

function getDefByCode(code: Exclude<OffenceCode, "unknown">): OffenceDef {
  const def = OFFENCE_DEFS[code];
  return { code, label: def.label, elements: def.elements };
}

function getUnknownDef(chargeLabel?: string): OffenceDef {
  const label =
    typeof chargeLabel === "string" && chargeLabel.trim().length > 0 ? chargeLabel.trim() : "Unknown Offence";
  return {
    code: "unknown",
    label,
    elements: [
      { id: "identification", label: "Identification" },
      { id: "actus_reus", label: "Actus Reus" },
      { id: "mental_state", label: "Mental State" },
      { id: "causation", label: "Causation" },
    ],
  };
}

/**
 * Detect offence from charges and extracted data.
 * Order matters: more specific offences first.
 */
export function detectOffence(charges?: any, extracted?: any): OffenceDef {
  if (charges && Array.isArray(charges) && charges.length > 0) {
    const first = charges[0];
    const section = (first.section || "").toLowerCase();
    const offence = (first.offence || "").toLowerCase();

    // Violence / assault (most specific first)
    if (offence.includes("murder") && !offence.includes("attempted")) return getDefByCode("murder");
    if (offence.includes("attempted murder") || offence.includes("attempt murder")) return getDefByCode("attempted_murder");
    if (offence.includes("manslaughter")) return getDefByCode("manslaughter");
    if (offence.includes("threat to kill") || offence.includes("threaten to kill")) return getDefByCode("threat_to_kill");
    if (offence.includes("controlling") || offence.includes("coercive")) return getDefByCode("coercive_control");
    if (offence.includes("stalking")) return getDefByCode("stalking");
    if (offence.includes("harassment") && !offence.includes("sexual")) return getDefByCode("harassment");
    if (offence.includes("assault") && offence.includes("emergency worker")) return getDefByCode("assault_emergency_worker");
    if (offence.includes("assault") && offence.includes("resist") && offence.includes("arrest")) return getDefByCode("assault_resist_arrest");
    if (offence.includes("riot")) return getDefByCode("riot");
    if (offence.includes("violent disorder")) return getDefByCode("violent_disorder");
    if (offence.includes("affray")) return getDefByCode("affray");

    if (section.includes("s18") || section.includes("18") || offence.includes("wounding with intent") || offence.includes("gbh with intent"))
      return getDefByCode("s18_oapa");
    if (section.includes("s20") || section.includes("20") || offence.includes("unlawful wounding") || offence.includes("inflicting gbh"))
      return getDefByCode("s20_oapa");
    if (section.includes("s47") || offence.includes("actual bodily harm") || (offence.includes("abh") && !offence.includes("gbh")))
      return getDefByCode("s47_oapa");
    if (section.includes("s39") || offence.includes("common assault") || offence.includes("assault by beating"))
      return getDefByCode("common_assault");
    if (offence.includes("assault") && !offence.includes("actual") && !offence.includes("bodily") && !offence.includes("gbh") && !offence.includes("wound") && !offence.includes("sexual"))
      return getDefByCode("common_assault");

    // Theft / property
    if (offence.includes("robbery")) return getDefByCode("robbery");
    if (offence.includes("burglary")) return getDefByCode("burglary");
    if (offence.includes("handling stolen") || offence.includes("stolen goods")) return getDefByCode("handling_stolen_goods");
    if (offence.includes("going equipped") || offence.includes("equipped to steal")) return getDefByCode("going_equipped");
    if (offence.includes("aggravated vehicle") || offence.includes("agg vehicle")) return getDefByCode("agg_vehicle_taking");
    if (offence.includes("taking conveyance") || offence.includes("twoc") || offence.includes("without authority") && offence.includes("vehicle"))
      return getDefByCode("twoc");
    if (offence.includes("blackmail")) return getDefByCode("blackmail");
    if (offence.includes("making off") || offence.includes("without payment")) return getDefByCode("making_off_without_payment");
    if (offence.includes("theft")) return getDefByCode("theft");

    // Damage
    if (offence.includes("arson") || offence.includes("damage by fire")) return getDefByCode("criminal_damage_arson");
    if (offence.includes("criminal damage") || section.includes("cda") || section.includes("1(1)") || section.includes("1(3)"))
      return getDefByCode("criminal_damage_arson");
    if (offence.includes("aggravated") && offence.includes("criminal damage")) return getDefByCode("agg_criminal_damage");

    // Fraud / dishonesty
    if (offence.includes("money laundering")) return getDefByCode("money_laundering");
    if (offence.includes("bribery")) return getDefByCode("bribery");
    if (offence.includes("false accounting")) return getDefByCode("false_accounting");
    if (offence.includes("fraud") || section.includes("fraud") || offence.includes("fraudulent")) return getDefByCode("fraud");

    // Drugs
    if (offence.includes("intent to supply") || offence.includes("with intent to supply")) return getDefByCode("drug_pwits");
    if (offence.includes("supply") && offence.includes("controlled drug") || offence.includes("supply of")) return getDefByCode("drug_supply");
    if (offence.includes("production") || offence.includes("cultivation") || offence.includes("produce") || offence.includes("cultivate"))
      return getDefByCode("drug_production");
    if (offence.includes("possession") && (offence.includes("controlled drug") || offence.includes("cannabis") || offence.includes("cocaine") || offence.includes("class ")))
      return getDefByCode("drug_possession");

    // Public order
    if (offence.includes("perverting") || offence.includes("pervert the course of justice")) return getDefByCode("perverting_justice");
    if (offence.includes("perjury")) return getDefByCode("perjury");
    if (offence.includes("obstruction") && offence.includes("constable")) return getDefByCode("obstruction");
    if (offence.includes("resisting arrest") || offence.includes("resist arrest")) return getDefByCode("resisting_arrest");
    if (section.includes("s5") && (section.includes("poa") || offence.includes("disorderly"))) return getDefByCode("poa_s5");
    if (section.includes("s4") && (section.includes("poa") || offence.includes("fear") || offence.includes("provocation")))
      return getDefByCode("poa_s4");

    // Sexual
    if (offence.includes("rape")) return getDefByCode("rape");
    if (offence.includes("assault by penetration")) return getDefByCode("assault_by_penetration");
    if (offence.includes("sexual assault")) return getDefByCode("sexual_assault");
    if (offence.includes("indecent image") || offence.includes("indecent photograph") || offence.includes("child abuse image"))
      return getDefByCode("indecent_images");
    if (offence.includes("exposure") || offence.includes("indecent exposure")) return getDefByCode("exposure");
    if (offence.includes("voyeurism")) return getDefByCode("voyeurism");

    // Road traffic
    if (offence.includes("death by dangerous") || offence.includes("causing death by dangerous")) return getDefByCode("death_by_dangerous");
    if (offence.includes("death by careless") || offence.includes("causing death by careless")) return getDefByCode("death_by_careless");
    if (offence.includes("dangerous driving")) return getDefByCode("dangerous_driving");
    if (offence.includes("careless") || offence.includes("inconsiderate driving")) return getDefByCode("careless_driving");
    if (offence.includes("drink") && offence.includes("drive") || offence.includes("driving") && offence.includes("over") || offence.includes("in charge") && offence.includes("alcohol"))
      return getDefByCode("drink_drive");
    if (offence.includes("fail to provide") || offence.includes("failing to provide specimen")) return getDefByCode("fail_to_provide");
    if (offence.includes("drive while disqualified") || offence.includes("driving while disqualified")) return getDefByCode("drive_disqualified");
    if (offence.includes("fail to stop") || offence.includes("failing to stop") || offence.includes("fail to report"))
      return getDefByCode("fail_to_stop");

    // Weapons
    if (offence.includes("firearm") && (offence.includes("possess") || offence.includes("possession"))) return getDefByCode("firearm");
    if (offence.includes("bladed") || offence.includes("blade") || offence.includes("knife")) return getDefByCode("bladed_article");
    if (offence.includes("offensive weapon") || offence.includes("weapon")) return getDefByCode("offensive_weapon");

    // Other
    if (offence.includes("breach of restraining") || offence.includes("restraining order")) return getDefByCode("breach_restraining_order");
    if (offence.includes("breach of bail") || offence.includes("fail to surrender") || offence.includes("failing to surrender"))
      return getDefByCode("breach_bail");
    if (offence.includes("benefit fraud") || offence.includes("benefit") && offence.includes("fraud")) return getDefByCode("benefit_fraud");
  }

  if (extracted) {
    const s = JSON.stringify(extracted).toLowerCase();
    const checks: [RegExp | string, Exclude<OffenceCode, "unknown">][] = [
      [/murder(?!\s*attempt|attempted)/, "murder"],
      [/attempted?\s*murder/, "attempted_murder"],
      [/manslaughter/, "manslaughter"],
      [/robbery/, "robbery"],
      [/burglary/, "burglary"],
      [/theft/, "theft"],
      [/arson|criminal damage|cda|damage by fire/, "criminal_damage_arson"],
      [/actual bodily harm|abh(?!\s*gbh)/, "s47_oapa"],
      [/rape/, "rape"],
      [/fraud/, "fraud"],
      [/possession.*controlled drug|possession.*cannabis|drug possession/, "drug_possession"],
      [/dangerous driving/, "dangerous_driving"],
      [/drink.*drive|driving.*over.*limit/, "drink_drive"],
    ];
    for (const [pattern, code] of checks) {
      if (typeof pattern === "string" ? s.includes(pattern) : pattern.test(s)) return getDefByCode(code);
    }
  }

  return getUnknownDef(charges?.[0]?.offence);
}
