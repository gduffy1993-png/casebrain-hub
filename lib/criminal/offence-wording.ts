/**
 * Offence-specific wording for defence strategy pipeline.
 * One source of truth: worst-case cap, act denial, prosecution pressure, kill switches.
 * Used by worst-case-cap, route-playbooks, defence-strategy. Beast pack uses this + template.
 */

import type { OffenceCode } from "./offence-elements";

export type OffenceWording = {
  worstCase: {
    absent: string[];
    unproven: string[];
  };
  actDenial: {
    posture: string;
    objective: string;
    burden: string[];
    killSwitch: { if: string; then: string };
    nextActions: string[];
  };
  pressure: string[];
  killSwitches: Array<{ if: string; then: string; evidence_needed: string[] }>;
};

function w(
  absent: string[],
  unproven: string[],
  posture: string,
  objective: string,
  burden: string[],
  killIf: string,
  killThen: string,
  nextActions: string[],
  pressure: string[],
  killSwitches: Array<{ if: string; then: string; evidence_needed: string[] }>
): OffenceWording {
  return { worstCase: { absent, unproven }, actDenial: { posture, objective, burden, killSwitch: { if: killIf, then: killThen }, nextActions }, pressure, killSwitches };
}

const GENERIC_ACT_DENIAL = {
  posture: "Defence posture: deny the act occurred or challenge causation between defendant's act and the offence.",
  objective: "Require prosecution to prove act and causation beyond reasonable doubt; challenge sequence and evidence of defendant's conduct.",
  burden: [
    "Prosecution must prove the act occurred beyond reasonable doubt",
    "Prosecution must establish causation between defendant's act and the offence",
    "Prosecution must provide sequence or circumstantial evidence (timing, mechanism, conduct)",
  ],
  killSwitch: { if: "If key evidence arrives that clearly establishes defendant's act and causation", then: "Pivot to alternative route; act denial becomes blocked" },
  nextActions: ["Review evidence of defendant's act and causation", "Challenge act and causation if evidence is weak or circumstantial", "Prepare act denial submissions"],
};

const GENERIC_PRESSURE = ["Pressure point: prosecution must prove all elements of the offence beyond reasonable doubt"];
const GENERIC_KILL = [
  { if: "Key evidence arrives that clearly establishes defendant's act and causation", then: "Act denial or causation challenge becomes harder; review route viability", evidence_needed: ["CCTV or scene evidence", "Witness statements", "Forensic or documentary evidence"] },
];

export const OFFENCE_WORDING: Partial<Record<OffenceCode, OffenceWording>> = {
  s18_oapa: w(
    ["sustained or targeted intent", "complete sequence evidence", "forensic confirmation of weapon"],
    ["deliberation or repeated blows", "specific intent to cause serious harm", "weapon linked to defendant"],
    "Defence posture: deny act occurred or challenge causation between act and injury.",
    "Require prosecution to prove act and causation beyond reasonable doubt; challenge sequence and mechanism.",
    ["Prosecution must prove act occurred beyond reasonable doubt", "Prosecution must establish causation between act and injury", "Prosecution must provide sequence evidence (timing, mechanism)"],
    "If clear sequence evidence arrives showing act and causation",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review sequence evidence and timing", "Challenge act and causation if sequence unclear", "Prepare act denial submissions"],
    ["Pressure point: intent inference from injury severity and mechanism", "Pressure point: sequence evidence gap may be filled by prosecution", "Pressure point: weapon inference from medical mechanism"],
    [
      { if: "If CCTV/sequence or disclosure shows sustained or targeted attack", then: "Intent denial route becomes harder; pivot to charge reduction or outcome control", evidence_needed: ["CCTV showing sequence", "Witness statements", "Medical evidence"] },
      { if: "Medical mechanism evidence supports deliberate weapon use", then: "Weapon uncertainty leverage reduces", evidence_needed: ["Medical report", "Forensic analysis"] },
      { if: "Evidence arrives showing targeting, premeditation, or sustained violence", then: "Intent denial route becomes harder", evidence_needed: ["CCTV", "Witness statements"] },
    ]
  ),
  s20_oapa: w(
    ["sustained or targeted intent", "sequence evidence"],
    ["deliberation or repeated blows"],
    "Defence posture: deny act occurred or challenge causation between act and injury.",
    "Require prosecution to prove act and causation beyond reasonable doubt; challenge sequence and mechanism.",
    ["Prosecution must prove act occurred beyond reasonable doubt", "Prosecution must establish causation between act and injury", "Prosecution must provide sequence evidence (timing, mechanism)"],
    "If clear sequence evidence arrives showing act and causation",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review sequence evidence and timing", "Challenge act and causation if sequence unclear", "Prepare act denial submissions"],
    ["Pressure point: recklessness inference from circumstances and injury", "Pressure point: weapon use inference from injury mechanism"],
    [
      { if: "If sequence or disclosure shows sustained or targeted attack", then: "Pivot to charge reduction or outcome control", evidence_needed: ["CCTV", "Witness statements"] },
      { if: "Medical mechanism evidence supports weapon use", then: "Weapon uncertainty leverage reduces", evidence_needed: ["Medical report"] },
    ]
  ),
  s47_oapa: w(
    ["evidence of assault/battery and causation of actual bodily harm"],
    ["assault or battery and causation of ABH"],
    "Defence posture: deny assault or battery or causation of actual bodily harm; challenge identification or mechanism.",
    "Require prosecution to prove assault/battery and causation of ABH beyond reasonable doubt.",
    ["Prosecution must prove assault or battery", "Prosecution must prove causation of actual bodily harm", "Prosecution must provide evidence of assault and harm and causation"],
    "If evidence arrives showing assault/battery and causation of ABH (e.g. medical, CCTV)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of assault/battery and causation of ABH", "Challenge assault, causation or level of harm", "Prepare act denial submissions (ABH elements)"],
    ["Pressure point: inference of assault/battery and causation of ABH from medical and witness evidence", "Pressure point: level of harm (ABH) may be inferred from medical evidence"],
    [{ if: "Evidence arrives showing assault/battery and causation of ABH (e.g. medical, CCTV)", then: "Act denial (ABH elements) becomes harder", evidence_needed: ["Medical report", "CCTV", "Witness statements"] }]
  ),
  common_assault: w(
    ["evidence of assault or battery"],
    ["assault or battery"],
    "Defence posture: deny assault or battery; challenge identification or intent.",
    "Require prosecution to prove assault or battery beyond reasonable doubt.",
    ["Prosecution must prove assault or battery beyond reasonable doubt", "Prosecution must provide evidence of defendant's conduct and victim's apprehension or contact"],
    "If evidence arrives showing assault or battery (e.g. witness, CCTV)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of assault or battery", "Challenge identification or intent", "Prepare act denial submissions"],
    ["Pressure point: inference of assault or battery from victim and witness evidence"],
    [{ if: "Evidence arrives showing assault or battery (e.g. witness, CCTV)", then: "Act denial becomes harder", evidence_needed: ["CCTV", "Witness statements"] }]
  ),
  criminal_damage_arson: w(
    ["clear evidence defendant caused the damage or started the fire", "ignition source or mechanism evidence"],
    ["defendant caused damage or ignition", "intent or recklessness as to damage/danger to life"],
    "Defence posture: deny that defendant caused the damage or started the fire; challenge causation and presence at scene.",
    "Require prosecution to prove defendant caused damage or ignition beyond reasonable doubt; challenge evidence of who did the act.",
    ["Prosecution must prove defendant caused the damage or started the fire", "Prosecution must establish causation between defendant's act and damage/ignition", "Prosecution must provide evidence of defendant's presence and act (e.g. ignition, damage mechanism)"],
    "If evidence arrives showing defendant caused damage or started the fire (e.g. CCTV, ignition, witness)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of who caused damage or started fire (CCTV, ignition, presence)", "Challenge causation and defendant's role if evidence of act is weak", "Prepare act denial submissions (damage/ignition, not injury)"],
    ["Pressure point: inference that defendant caused damage or started the fire from scene/forensic evidence", "Pressure point: intent or recklessness as to damage / danger to life from circumstances"],
    [
      { if: "Fire report or forensic report served identifying ignition source or cause", then: "Act denial (damage/ignition) route becomes harder", evidence_needed: ["Fire report", "Forensic report", "Scene evidence"] },
      { if: "CCTV or witness evidence places defendant at scene and shows deliberate act (e.g. lighting fire)", then: "Act denial route becomes blocked", evidence_needed: ["CCTV", "Witness", "BWV"] },
      { if: "Valuation or schedule of damage served establishing value/life endangerment", then: "Review charge level and route", evidence_needed: ["Valuation", "Schedule of damage"] },
    ]
  ),
  theft: w(
    ["evidence of appropriation and dishonesty and intention to permanently deprive"],
    ["appropriation of property belonging to another with dishonesty and intention to permanently deprive"],
    "Defence posture: deny appropriation or dishonesty or intention to permanently deprive; challenge identification or ownership.",
    "Require prosecution to prove appropriation, dishonesty, and intention to permanently deprive beyond reasonable doubt.",
    ["Prosecution must prove appropriation of property belonging to another", "Prosecution must prove dishonesty (Ghosh/Ivey) and intention to permanently deprive", "Prosecution must provide evidence linking defendant to the property and conduct"],
    "If evidence arrives showing appropriation, dishonesty and intention to permanently deprive (e.g. CCTV, recovery, admissions)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of appropriation, dishonesty and intention to permanently deprive", "Challenge identification, ownership or consent where weak", "Prepare act denial submissions (theft elements)"],
    ["Pressure point: inference of dishonesty and intention to permanently deprive from conduct and circumstances", "Pressure point: appropriation and ownership may be inferred from possession or recovery"],
    [{ if: "Evidence arrives showing appropriation, dishonesty and intention to permanently deprive (e.g. CCTV, recovery, admissions)", then: "Act denial (theft elements) becomes harder", evidence_needed: ["CCTV", "Property recovery", "Witness statements"] }]
  ),
  burglary: w(
    ["evidence of entry as trespasser and intent or ulterior offence"],
    ["entry as trespasser and required intent"],
    "Defence posture: deny entry as trespasser or required intent; challenge identification or consent to enter.",
    "Require prosecution to prove entry as trespasser and intent (or ulterior offence) beyond reasonable doubt.",
    ["Prosecution must prove entry as trespasser into building or part of building", "Prosecution must prove intent to steal/damage/commit GBH or ulterior offence at time of entry", "Prosecution must provide evidence of entry and lack of consent/authority"],
    "If evidence arrives showing entry as trespasser and intent (e.g. CCTV, forensics, witness)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of entry as trespasser and intent", "Challenge consent to enter, identification or intent", "Prepare act denial submissions (burglary elements)"],
    ["Pressure point: inference of entry as trespasser and intent from forensics, CCTV or witness evidence", "Pressure point: intent at time of entry may be inferred from conduct inside"],
    [{ if: "Evidence arrives showing entry as trespasser and intent (e.g. forensics, CCTV, witness)", then: "Act denial (burglary elements) becomes harder", evidence_needed: ["CCTV", "Forensic evidence", "Witness statements"] }]
  ),
  robbery: w(
    ["evidence of theft and force or threat of force at the time"],
    ["theft and force/threat immediately before or at time of theft"],
    "Defence posture: deny theft or force/threat of force at the time; challenge identification or timing.",
    "Require prosecution to prove theft and force or threat of force immediately before or at the time of theft beyond reasonable doubt.",
    ["Prosecution must prove all elements of theft", "Prosecution must prove force or threat of force used immediately before or at the time of theft", "Prosecution must provide evidence of theft and force/threat and timing"],
    "If evidence arrives showing theft and force/threat at the time (e.g. witness, CCTV, injury)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of theft and force/threat at the time", "Challenge theft elements or timing of force", "Prepare act denial submissions (robbery elements)"],
    ["Pressure point: inference of theft and force/threat from victim and witness evidence", "Pressure point: timing of force (immediately before or at time of theft) may be inferred from sequence"],
    [{ if: "Evidence arrives showing theft and force/threat at the time (e.g. witness, CCTV, injury)", then: "Act denial (robbery elements) becomes harder", evidence_needed: ["CCTV", "Witness statements", "Medical evidence"] }]
  ),
  fraud: w(
    ["evidence of dishonesty and (false representation / failure to disclose / abuse of position) and gain or loss"],
    ["dishonesty and relevant conduct and gain/loss"],
    "Defence posture: deny dishonesty or false representation / failure to disclose / abuse of position; challenge intent to gain or cause loss.",
    "Require prosecution to prove dishonesty and relevant conduct and gain/loss beyond reasonable doubt.",
    ["Prosecution must prove dishonesty and (false representation / failure to disclose / abuse of position)", "Prosecution must prove intent to make gain or cause loss (or exposure to risk)", "Prosecution must provide evidence of representation/conduct and gain or loss"],
    "If evidence arrives showing dishonesty and representation/conduct and gain or loss",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of dishonesty and representation/conduct and gain or loss", "Challenge representation, intent or causation of loss", "Prepare act denial submissions (fraud elements)"],
    ["Pressure point: inference of dishonesty from representation or conduct and outcome", "Pressure point: gain or loss may be inferred from documents or accounts"],
    [{ if: "Evidence arrives showing dishonesty and representation/conduct and gain or loss", then: "Act denial (fraud elements) becomes harder", evidence_needed: ["Documents", "Financial records", "Witness statements"] }]
  ),
  harassment: w(
    ["evidence of course of conduct and that it amounted to harassment"],
    ["course of conduct and harassment / fear of violence"],
    "Defence posture: deny course of conduct or that conduct amounted to harassment; challenge intent or that victim was harassed.",
    "Require prosecution to prove course of conduct and that it amounted to harassment beyond reasonable doubt; challenge pattern and effect.",
    ["Prosecution must prove course of conduct (at least 2 occasions)", "Prosecution must prove conduct amounted to harassment (or fear of violence)", "Prosecution must provide evidence of pattern and victim impact"],
    "If evidence arrives showing clear course of conduct and harassment (e.g. communications, witness, pattern)",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review evidence of course of conduct and alleged harassment", "Challenge whether conduct amounts to harassment or intent", "Prepare act denial submissions (PHA 1997 elements)"],
    ["Pressure point: inference of course of conduct from communications and witness evidence", "Pressure point: harassment may be inferred from victim and pattern evidence"],
    [
      { if: "Further communications or witness evidence establishes clear course of conduct and harassment", then: "Act denial (harassment elements) becomes harder", evidence_needed: ["Communications", "Witness statements", "Pattern evidence"] },
      { if: "Restraining order or similar history served", then: "Review route; pattern defences may be relevant", evidence_needed: ["Court orders", "Previous findings"] },
    ]
  ),
  drug_possession: w(
    ["evidence of possession and that substance is a controlled drug"],
    ["possession of controlled drug"],
    "Defence posture: deny possession or that the substance was a controlled drug; challenge knowledge or control.",
    "Require prosecution to prove possession and that substance is a controlled drug beyond reasonable doubt; challenge chain of custody and forensic proof.",
    ["Prosecution must prove possession (knowledge and control)", "Prosecution must prove substance is a controlled drug (forensic analysis)", "Prosecution must provide evidence of recovery and chain of custody"],
    "If forensic evidence and chain establish possession of controlled drug",
    "Pivot to alternative route; act denial becomes blocked",
    ["Review forensic and chain of custody", "Challenge possession (knowledge/control) or identity of substance", "Prepare act denial submissions (possession and controlled drug)"],
    ["Pressure point: inference of possession from recovery and location", "Pressure point: controlled drug identity from forensic analysis"],
    [
      { if: "Forensic report confirms controlled drug and chain of custody is strong", then: "Act denial (possession/identity) becomes harder", evidence_needed: ["Forensic report", "Chain of custody", "Recovery evidence"] },
      { if: "Evidence of intent to supply emerges (quantity, packaging)", then: "Review charge; PWITS route may apply", evidence_needed: ["Quantity", "Packaging", "Circumstances"] },
    ]
  ),
  drink_drive: w(
    ["evidence of driving or in charge and over prescribed limit or unfit"],
    ["driving or in charge and over limit or unfit through drink or drugs"],
    "Defence posture: deny driving/in charge or challenge procedure (specimen, procedure, reasonable excuse); challenge reliability of reading.",
    "Require prosecution to prove driving or in charge and over limit or unfit beyond reasonable doubt; challenge procedure and reasonable excuse.",
    ["Prosecution must prove driving or in charge", "Prosecution must prove over prescribed limit or unfit through drink/drugs", "Prosecution must prove procedure was correct (specimen, device, timing)"],
    "If procedure is upheld and reading/assessment stands",
    "Pivot to alternative route; procedure challenge becomes blocked",
    ["Review procedure (specimen, device, timing) and reasonable excuse", "Challenge driving/in charge or reliability of reading", "Prepare act denial or procedure submissions"],
    ["Pressure point: inference from specimen and procedure", "Pressure point: procedure compliance may be presumed if not challenged"],
    [
      { if: "Procedure upheld and reading/assessment confirmed (e.g. expert, calibration)", then: "Procedure challenge or act denial becomes harder", evidence_needed: ["Calibration", "Expert evidence", "Procedure record"] },
      { if: "Evidence of driving and consumption strengthens", then: "In charge / consumption defences reduce", evidence_needed: ["Witness", "CCTV", "Consumption evidence"] },
    ]
  ),
};

// Add wording for all other offence codes using a generic-but-element-aware pattern
const OFFENCE_ELEMENT_SUMMARY: Partial<Record<OffenceCode, { absent: string[]; unproven: string[]; burden: string[]; pressure: string[] }>> = {
  assault_resist_arrest: {
    absent: ["evidence of assault and intent to resist arrest"],
    unproven: ["assault and intent to resist lawful arrest"],
    burden: ["Prosecution must prove assault", "Prosecution must prove intent to resist arrest", "Prosecution must prove arrest was lawful"],
    pressure: ["Pressure point: inference of intent to resist from conduct"],
  },
  affray: {
    absent: ["evidence of unlawful violence and conduct causing fear"],
    unproven: ["unlawful violence and that person of reasonable firmness would fear for safety"],
    burden: ["Prosecution must prove unlawful violence towards another", "Prosecution must prove conduct would cause person of reasonable firmness to fear for safety"],
    pressure: ["Pressure point: inference of unlawful violence and fear from witness/scene evidence"],
  },
  violent_disorder: {
    absent: ["evidence of 3+ persons and unlawful violence"],
    unproven: ["three or more persons and unlawful violence"],
    burden: ["Prosecution must prove 3+ persons present", "Prosecution must prove unlawful violence"],
    pressure: ["Pressure point: inference from witness and scene evidence"],
  },
  riot: {
    absent: ["evidence of 12+ persons and common purpose of violence"],
    unproven: ["twelve or more persons and common purpose of violence"],
    burden: ["Prosecution must prove 12+ persons", "Prosecution must prove common purpose of violence"],
    pressure: ["Pressure point: inference from witness and scene evidence"],
  },
  harassment: {
    absent: ["evidence of course of conduct and harassment"],
    unproven: ["course of conduct and harassment / fear of violence"],
    burden: ["Prosecution must prove course of conduct", "Prosecution must prove harassment or fear of violence"],
    pressure: ["Pressure point: inference of course of conduct and effect from communications and witness evidence"],
  },
  stalking: {
    absent: ["evidence of course of conduct and stalking"],
    unproven: ["course of conduct and stalking associated with harassment"],
    burden: ["Prosecution must prove course of conduct", "Prosecution must prove stalking (associated with harassment)"],
    pressure: ["Pressure point: inference from pattern of behaviour and victim evidence"],
  },
  coercive_control: {
    absent: ["evidence of repeated/continuous controlling or coercive behaviour and serious effect"],
    unproven: ["repeated or continuous behaviour that was controlling or coercive and had serious effect"],
    burden: ["Prosecution must prove repeated or continuous behaviour", "Prosecution must prove controlling or coercive and serious effect on victim"],
    pressure: ["Pressure point: inference from pattern of behaviour and victim evidence"],
  },
  threat_to_kill: {
    absent: ["evidence of threat and intent that fear would be caused"],
    unproven: ["threat to kill and intent that fear would be caused"],
    burden: ["Prosecution must prove threat to kill", "Prosecution must prove intent that fear would be caused"],
    pressure: ["Pressure point: inference of threat and intent from words and circumstances"],
  },
  attempted_murder: {
    absent: ["evidence of intent to kill and act more than merely preparatory"],
    unproven: ["intent to kill and act more than merely preparatory"],
    burden: ["Prosecution must prove intent to kill", "Prosecution must prove act more than merely preparatory"],
    pressure: ["Pressure point: inference of intent from conduct and circumstances"],
  },
  murder: {
    absent: ["evidence of unlawful killing and malice aforethought"],
    unproven: ["unlawful killing and malice aforethought (intent to kill or cause GBH)"],
    burden: ["Prosecution must prove unlawful killing", "Prosecution must prove malice aforethought"],
    pressure: ["Pressure point: inference of intent from conduct and circumstances"],
  },
  manslaughter: {
    absent: ["evidence of unlawful killing and mens rea (recklessness or unlawful act)"],
    unproven: ["unlawful killing and recklessness or unlawful act"],
    burden: ["Prosecution must prove unlawful killing", "Prosecution must prove recklessness or unlawful dangerous act"],
    pressure: ["Pressure point: inference from conduct and circumstances"],
  },
  handling_stolen_goods: {
    absent: ["evidence of receiving/undertaking and knowledge or belief that goods stolen"],
    unproven: ["receiving or undertaking retention/removal/disposal and knowledge or belief that goods stolen"],
    burden: ["Prosecution must prove receiving or undertaking", "Prosecution must prove goods were stolen", "Prosecution must prove dishonesty and knowledge or belief"],
    pressure: ["Pressure point: inference of knowledge/belief from circumstances"],
  },
  going_equipped: {
    absent: ["evidence of possession of article for use in theft/burglary"],
    unproven: ["possession of article for use in course of or in connection with theft/burglary"],
    burden: ["Prosecution must prove away from place of abode", "Prosecution must prove possession of article for use in theft/burglary"],
    pressure: ["Pressure point: inference of intended use from article and circumstances"],
  },
  twoc: {
    absent: ["evidence of taking conveyance without authority"],
    unproven: ["taking conveyance without consent of owner or lawful authority"],
    burden: ["Prosecution must prove taking of conveyance", "Prosecution must prove without consent or lawful authority"],
    pressure: ["Pressure point: inference from possession and circumstances"],
  },
  agg_vehicle_taking: {
    absent: ["evidence of TWOC and dangerous driving/damage/injury"],
    unproven: ["taking without authority and dangerous driving or damage or injury"],
    burden: ["Prosecution must prove TWOC", "Prosecution must prove dangerous driving or damage or injury"],
    pressure: ["Pressure point: inference from driving and outcome evidence"],
  },
  blackmail: {
    absent: ["evidence of unwarranted demand with menaces and view to gain or cause loss"],
    unproven: ["unwarranted demand with menaces and view to gain or cause loss"],
    burden: ["Prosecution must prove unwarranted demand with menaces", "Prosecution must prove view to gain or cause loss"],
    pressure: ["Pressure point: inference from communications and circumstances"],
  },
  making_off_without_payment: {
    absent: ["evidence of knowledge that payment required, dishonesty and intent to avoid payment"],
    unproven: ["knowledge that payment required on the spot, dishonesty and intent to avoid payment"],
    burden: ["Prosecution must prove knowledge that payment required on the spot", "Prosecution must prove dishonesty and intent to avoid payment"],
    pressure: ["Pressure point: inference of dishonesty and intent from conduct"],
  },
  agg_criminal_damage: {
    absent: ["evidence of damage and intent/recklessness and endangerment of life"],
    unproven: ["damage, intent or recklessness, and endangerment of life"],
    burden: ["Prosecution must prove damage/destruction of property", "Prosecution must prove intent or recklessness and endangerment of life"],
    pressure: ["Pressure point: inference from scene and circumstances"],
  },
  false_accounting: {
    absent: ["evidence of dishonesty and false document/record and intent"],
    unproven: ["dishonesty and false document or record and intent to gain/cause loss"],
    burden: ["Prosecution must prove dishonesty", "Prosecution must prove false document or record", "Prosecution must prove intent to gain/cause loss"],
    pressure: ["Pressure point: inference from documents and outcome"],
  },
  money_laundering: {
    absent: ["evidence of criminal property and concealing/use and knowledge or suspicion"],
    unproven: ["criminal property and concealing/use and knowledge or suspicion"],
    burden: ["Prosecution must prove criminal property", "Prosecution must prove concealing/disguising/use/possession", "Prosecution must prove knowledge or suspicion"],
    pressure: ["Pressure point: inference from transactions and circumstances"],
  },
  bribery: {
    absent: ["evidence of offering/accepting advantage and improper performance"],
    unproven: ["offering/accepting/requesting advantage and improper performance of function"],
    burden: ["Prosecution must prove offering/accepting/requesting advantage", "Prosecution must prove improper performance of function"],
    pressure: ["Pressure point: inference from communications and circumstances"],
  },
  drug_possession: {
    absent: ["evidence of possession and controlled drug"],
    unproven: ["possession of controlled drug"],
    burden: ["Prosecution must prove possession", "Prosecution must prove substance is controlled drug"],
    pressure: ["Pressure point: inference of possession from recovery and forensic evidence"],
  },
  drug_pwits: {
    absent: ["evidence of possession, controlled drug and intent to supply"],
    unproven: ["possession, controlled drug and intent to supply"],
    burden: ["Prosecution must prove possession", "Prosecution must prove controlled drug", "Prosecution must prove intent to supply"],
    pressure: ["Pressure point: inference of intent from quantity, packaging and circumstances"],
  },
  drug_supply: {
    absent: ["evidence of supply or offer to supply and controlled drug"],
    unproven: ["supply or offer to supply controlled drug"],
    burden: ["Prosecution must prove supply or offer to supply", "Prosecution must prove controlled drug"],
    pressure: ["Pressure point: inference from witness and forensic evidence"],
  },
  drug_production: {
    absent: ["evidence of production or cultivation and controlled drug"],
    unproven: ["production or cultivation of controlled drug"],
    burden: ["Prosecution must prove production or cultivation", "Prosecution must prove controlled drug"],
    pressure: ["Pressure point: inference from scene and forensic evidence"],
  },
  poa_s5: {
    absent: ["evidence of disorderly/threatening/abusive conduct within hearing or sight"],
    unproven: ["disorderly or threatening or abusive conduct within hearing or sight of person likely to be harassed/alarmed/distressed"],
    burden: ["Prosecution must prove disorderly/threatening/abusive conduct", "Prosecution must prove within hearing or sight of person likely to be harassed/alarmed/distressed"],
    pressure: ["Pressure point: inference from witness evidence"],
  },
  poa_s4: {
    absent: ["evidence of threatening/abusive/insulting words or behaviour and intent or likelihood"],
    unproven: ["threatening/abusive/insulting words or behaviour and intent or likelihood to cause fear or provoke violence"],
    burden: ["Prosecution must prove threatening/abusive/insulting words or behaviour", "Prosecution must prove intent or likelihood to cause fear or provoke violence"],
    pressure: ["Pressure point: inference from witness evidence"],
  },
  obstruction: {
    absent: ["evidence of obstruction of constable in execution of duty"],
    unproven: ["obstruction of constable in execution of duty"],
    burden: ["Prosecution must prove obstruction", "Prosecution must prove constable in execution of duty"],
    pressure: ["Pressure point: inference from witness evidence"],
  },
  resisting_arrest: {
    absent: ["evidence of resistance and lawful arrest"],
    unproven: ["resistance to lawful arrest"],
    burden: ["Prosecution must prove resistance", "Prosecution must prove arrest was lawful"],
    pressure: ["Pressure point: inference from witness evidence"],
  },
  assault_emergency_worker: {
    absent: ["evidence of assault and that victim was emergency worker acting in exercise of functions"],
    unproven: ["assault and victim was emergency worker acting in exercise of functions"],
    burden: ["Prosecution must prove assault", "Prosecution must prove victim was emergency worker acting in exercise of functions"],
    pressure: ["Pressure point: inference from witness and role evidence"],
  },
  perverting_justice: {
    absent: ["evidence of conduct tending to pervert and intent"],
    unproven: ["conduct tending to pervert course of public justice and intent"],
    burden: ["Prosecution must prove conduct tending to pervert", "Prosecution must prove course of public justice and intent"],
    pressure: ["Pressure point: inference from conduct and circumstances"],
  },
  perjury: {
    absent: ["evidence of lawful oath, false statement and knowledge of falsity"],
    unproven: ["lawful oath, false statement and knowledge of falsity"],
    burden: ["Prosecution must prove lawful oath", "Prosecution must prove false statement", "Prosecution must prove knowledge of falsity"],
    pressure: ["Pressure point: inference from statement and evidence"],
  },
  rape: {
    absent: ["evidence of penetration, absence of consent and no reasonable belief in consent"],
    unproven: ["penetration, absence of consent and no reasonable belief in consent"],
    burden: ["Prosecution must prove penetration with penis", "Prosecution must prove absence of consent", "Prosecution must prove no reasonable belief in consent"],
    pressure: ["Pressure point: inference from complainant and circumstances; consent and reasonable belief in issue"],
  },
  assault_by_penetration: {
    absent: ["evidence of penetration, absence of consent and no reasonable belief"],
    unproven: ["penetration, absence of consent and no reasonable belief in consent"],
    burden: ["Prosecution must prove penetration", "Prosecution must prove absence of consent", "Prosecution must prove no reasonable belief in consent"],
    pressure: ["Pressure point: consent and reasonable belief in issue"],
  },
  sexual_assault: {
    absent: ["evidence of sexual touching, absence of consent and no reasonable belief"],
    unproven: ["sexual touching, absence of consent and no reasonable belief in consent"],
    burden: ["Prosecution must prove sexual touching", "Prosecution must prove absence of consent", "Prosecution must prove no reasonable belief in consent"],
    pressure: ["Pressure point: consent and reasonable belief in issue"],
  },
  indecent_images: {
    absent: ["evidence of possession and indecent photograph of child"],
    unproven: ["possession of indecent photograph/pseudo-photograph of child"],
    burden: ["Prosecution must prove possession", "Prosecution must prove indecent photograph of child"],
    pressure: ["Pressure point: inference from device and forensic evidence"],
  },
  exposure: {
    absent: ["evidence of intentional exposure and intent to cause alarm or distress"],
    unproven: ["intentional exposure and intent that someone would see and be caused alarm or distress"],
    burden: ["Prosecution must prove intentional exposure", "Prosecution must prove intent to cause alarm or distress"],
    pressure: ["Pressure point: inference from witness evidence"],
  },
  voyeurism: {
    absent: ["evidence of observation or recording of private act without consent"],
    unproven: ["observation or recording of private act without consent"],
    burden: ["Prosecution must prove observation or recording of private act", "Prosecution must prove without consent"],
    pressure: ["Pressure point: inference from device and circumstances"],
  },
  dangerous_driving: {
    absent: ["evidence of driving and that it was dangerous to public or property"],
    unproven: ["driving and that it was dangerous to public or property"],
    burden: ["Prosecution must prove driving", "Prosecution must prove dangerous to public or property"],
    pressure: ["Pressure point: inference from witness and expert evidence"],
  },
  careless_driving: {
    absent: ["evidence of driving and that it was careless or inconsiderate"],
    unproven: ["driving and that it was careless or inconsiderate"],
    burden: ["Prosecution must prove driving", "Prosecution must prove careless or inconsiderate"],
    pressure: ["Pressure point: inference from witness and circumstances"],
  },
  drink_drive: {
    absent: ["evidence of driving/in charge and over limit or unfit"],
    unproven: ["driving or in charge and over prescribed limit or unfit through drink/drugs"],
    burden: ["Prosecution must prove driving or in charge", "Prosecution must prove over limit or unfit"],
    pressure: ["Pressure point: inference from specimen and medical evidence"],
  },
  fail_to_provide: {
    absent: ["evidence of lawful requirement and failure without reasonable excuse"],
    unproven: ["lawful requirement to provide specimen and failure without reasonable excuse"],
    burden: ["Prosecution must prove lawful requirement", "Prosecution must prove failure without reasonable excuse"],
    pressure: ["Pressure point: inference from procedure and refusal"],
  },
  drive_disqualified: {
    absent: ["evidence of driving and that defendant was disqualified"],
    unproven: ["driving and disqualified from holding licence"],
    burden: ["Prosecution must prove driving", "Prosecution must prove disqualified"],
    pressure: ["Pressure point: inference from DVLA and identification evidence"],
  },
  fail_to_stop: {
    absent: ["evidence of accident and failure to stop or report"],
    unproven: ["accident involving injury or damage and failure to stop or report"],
    burden: ["Prosecution must prove accident", "Prosecution must prove failure to stop or report"],
    pressure: ["Pressure point: inference from scene and identification evidence"],
  },
  death_by_dangerous: {
    absent: ["evidence of dangerous driving and causation of death"],
    unproven: ["dangerous driving and causation of death"],
    burden: ["Prosecution must prove dangerous driving", "Prosecution must prove death caused and causation"],
    pressure: ["Pressure point: inference from driving and medical evidence"],
  },
  death_by_careless: {
    absent: ["evidence of careless driving and causation of death"],
    unproven: ["careless or inconsiderate driving and causation of death"],
    burden: ["Prosecution must prove careless or inconsiderate driving", "Prosecution must prove death caused and causation"],
    pressure: ["Pressure point: inference from driving and medical evidence"],
  },
  offensive_weapon: {
    absent: ["evidence of possession in public place and offensive weapon"],
    unproven: ["possession in public place and offensive weapon"],
    burden: ["Prosecution must prove possession in public place", "Prosecution must prove offensive weapon"],
    pressure: ["Pressure point: inference from recovery and circumstances"],
  },
  bladed_article: {
    absent: ["evidence of possession, bladed article and no good reason"],
    unproven: ["possession in public place, bladed article and no good reason or lawful authority"],
    burden: ["Prosecution must prove possession in public place", "Prosecution must prove article with blade or sharply pointed", "Prosecution must prove no good reason or lawful authority"],
    pressure: ["Pressure point: inference from recovery and circumstances"],
  },
  firearm: {
    absent: ["evidence of possession of firearm without certificate or authority"],
    unproven: ["possession of firearm without certificate or authority"],
    burden: ["Prosecution must prove possession", "Prosecution must prove firearm", "Prosecution must prove without certificate or authority"],
    pressure: ["Pressure point: inference from recovery and forensic evidence"],
  },
  breach_restraining_order: {
    absent: ["evidence of order in force and breach without reasonable excuse"],
    unproven: ["restraining order in force and breach without reasonable excuse"],
    burden: ["Prosecution must prove order in force", "Prosecution must prove breach without reasonable excuse"],
    pressure: ["Pressure point: inference from order and conduct evidence"],
  },
  breach_bail: {
    absent: ["evidence of bail and failure to surrender without reasonable cause"],
    unproven: ["granted bail and failure to surrender without reasonable cause"],
    burden: ["Prosecution must prove bail granted", "Prosecution must prove failure to surrender without reasonable cause"],
    pressure: ["Pressure point: inference from court records and absence"],
  },
  benefit_fraud: {
    absent: ["evidence of dishonesty and false representation or failure to disclose and benefit"],
    unproven: ["dishonesty and false representation or failure to disclose and benefit obtained or risked"],
    burden: ["Prosecution must prove dishonesty", "Prosecution must prove false representation or failure to disclose", "Prosecution must prove benefit obtained or risked"],
    pressure: ["Pressure point: inference from claims and circumstances"],
  },
};

// Build full OFFENCE_WORDING for all codes that have element summary but not yet full wording
for (const [code, summary] of Object.entries(OFFENCE_ELEMENT_SUMMARY)) {
  if (OFFENCE_WORDING[code as OffenceCode]) continue;
  const s = summary!;
  OFFENCE_WORDING[code as OffenceCode] = w(
    s.absent,
    s.unproven,
    GENERIC_ACT_DENIAL.posture,
    GENERIC_ACT_DENIAL.objective,
    s.burden.length ? s.burden : GENERIC_ACT_DENIAL.burden,
    GENERIC_ACT_DENIAL.killSwitch.if,
    GENERIC_ACT_DENIAL.killSwitch.then,
    GENERIC_ACT_DENIAL.nextActions,
    s.pressure.length ? s.pressure : GENERIC_PRESSURE,
    [GENERIC_KILL[0]]
  );
}

export function getOffenceWording(code: OffenceCode): OffenceWording | null {
  return OFFENCE_WORDING[code] ?? null;
}

export function getGenericWording(): OffenceWording {
  return w(
    ["complete evidence of act and causation", "complete sequence or circumstantial evidence"],
    ["actus reus and mens rea to the required standard", "clear link between defendant and offence"],
    GENERIC_ACT_DENIAL.posture,
    GENERIC_ACT_DENIAL.objective,
    GENERIC_ACT_DENIAL.burden,
    GENERIC_ACT_DENIAL.killSwitch.if,
    GENERIC_ACT_DENIAL.killSwitch.then,
    GENERIC_ACT_DENIAL.nextActions,
    GENERIC_PRESSURE,
    GENERIC_KILL
  );
}
